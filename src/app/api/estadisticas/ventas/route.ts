import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function toLocalISODate(dateStr: string): { start: string; end: string } {
  // Colombia is UTC-5
  return {
    start: dateStr + 'T00:00:00-05:00',
    end: dateStr + 'T23:59:59.999-05:00',
  }
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// GET - Sales statistics by period
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'day'
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // Build date range with explicit Colombia timezone (UTC-5)
    let startISO: string
    let endISO: string

    const parts = date.split('-').map(Number)
    const refYear = parts[0]
    const refMonth = parts[1] - 1 // 0-indexed
    const refDay = parts[2]

    switch (period) {
      case 'day': {
        startISO = `${date}T00:00:00-05:00`
        endISO = `${date}T23:59:59.999-05:00`
        break
      }
      case 'week': {
        // Calculate Monday of the week for the given date
        const ref = new Date(refYear, refMonth, refDay)
        const dow = ref.getDay() // 0=Sun
        const mondayOffset = dow === 0 ? -6 : 1 - dow
        const monday = new Date(refYear, refMonth, refDay + mondayOffset)
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
        startISO = `${formatDateStr(monday)}T00:00:00-05:00`
        endISO = `${formatDateStr(sunday)}T23:59:59.999-05:00`
        break
      }
      case 'month': {
        const firstDay = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-01`
        const lastDayNum = new Date(refYear, refMonth + 1, 0).getDate()
        const lastDay = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`
        startISO = `${firstDay}T00:00:00-05:00`
        endISO = `${lastDay}T23:59:59.999-05:00`
        break
      }
      case 'year': {
        startISO = `${refYear}-01-01T00:00:00-05:00`
        endISO = `${refYear}-12-31T23:59:59.999-05:00`
        break
      }
      default: {
        startISO = `${date}T00:00:00-05:00`
        endISO = `${date}T23:59:59.999-05:00`
      }
    }

    // Fetch ALL payments in range (handle Supabase 1000-row limit)
    let allPayments: any[] = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, amount, method, created_at')
        .gte('created_at', startISO)
        .lte('created_at', endISO)
        .order('created_at', { ascending: true })
        .range(from, from + pageSize - 1)

      if (error) throw error

      const batch = payments || []
      allPayments = allPayments.concat(batch)
      hasMore = batch.length === pageSize
      from += pageSize
    }

    // Group by bucket
    const bucketMap: Record<string, { total: number; count: number }> = {}

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    // Pre-populate buckets
    if (period === 'day') {
      for (let h = 0; h < 24; h++) {
        bucketMap[`${h.toString().padStart(2, '0')}:00`] = { total: 0, count: 0 }
      }
    } else if (period === 'week') {
      const ref = new Date(refYear, refMonth, refDay)
      const dow = ref.getDay()
      const mondayOffset = dow === 0 ? -6 : 1 - dow
      for (let i = 0; i < 7; i++) {
        const d = new Date(refYear, refMonth, refDay + mondayOffset + i)
        const key = `${dayNames[d.getDay()]} ${d.getDate()}`
        bucketMap[key] = { total: 0, count: 0 }
      }
    } else if (period === 'month') {
      const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate()
      for (let d = 1; d <= daysInMonth; d++) {
        bucketMap[String(d).padStart(2, '0')] = { total: 0, count: 0 }
      }
    } else if (period === 'year') {
      for (let m = 0; m < 12; m++) {
        bucketMap[monthNames[m]] = { total: 0, count: 0 }
      }
    }

    // Fill buckets — convert UTC timestamp to Colombia time (UTC-5)
    allPayments.forEach((p: any) => {
      const utcDate = new Date(p.created_at)
      // Shift to Colombia time (UTC-5)
      const colombiaDate = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000)
      const amount = Number(p.amount) || 0
      let key: string

      if (period === 'day') {
        key = `${colombiaDate.getUTCHours().toString().padStart(2, '0')}:00`
      } else if (period === 'week') {
        key = `${dayNames[colombiaDate.getUTCDay()]} ${colombiaDate.getUTCDate()}`
      } else if (period === 'month') {
        key = String(colombiaDate.getUTCDate()).padStart(2, '0')
      } else {
        key = monthNames[colombiaDate.getUTCMonth()]
      }

      if (!bucketMap[key]) bucketMap[key] = { total: 0, count: 0 }
      bucketMap[key].total += amount
      bucketMap[key].count += 1
    })

    const sales = Object.entries(bucketMap).map(([date, data]) => ({
      date,
      total: Math.round(data.total),
      count: data.count,
    }))

    // Summary
    const totalAmount = allPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
    const totalCount = allPayments.length
    const amounts = allPayments.map((p: any) => Number(p.amount) || 0)

    const summary = {
      total: Math.round(totalAmount),
      count: totalCount,
      avgTicket: totalCount > 0 ? Math.round(totalAmount / totalCount) : 0,
      maxSale: amounts.length > 0 ? Math.round(Math.max(...amounts)) : 0,
      minSale: amounts.length > 0 ? Math.round(Math.min(...amounts)) : 0,
      startDate: startISO,
      endDate: endISO,
    }

    return NextResponse.json({ sales, summary })
  } catch (error) {
    console.error('Error fetching sales statistics:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas de ventas' },
      { status: 500 }
    )
  }
}
