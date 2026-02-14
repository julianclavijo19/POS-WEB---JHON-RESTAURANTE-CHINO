import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    // Use UTC boundaries for the date range
    // When user asks for 2026-02-13, search from 2026-02-13 00:00:00Z to 2026-02-14 00:00:00Z
    const dateStr = date || new Date().toISOString().split('T')[0]
    const startOfDay = `${dateStr}T00:00:00.000Z`
    const endOfDay = `${dateStr}T23:59:59.999Z`
    
    console.log('=== HISTORIAL DEBUG ===')
    console.log('Date:', dateStr)
    console.log('Start:', startOfDay)
    console.log('End:', endOfDay)

    // Get all payments for the day using Supabase
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        method,
        received_amount,
        change_amount,
        created_at,
        order:orders(
          id,
          order_number,
          table:tables(name)
        )
      `)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate stats
    const stats = {
      total: 0,
      cash: 0,
      card: 0,
      transfer: 0,
      count: (payments || []).length
    }

    ;(payments || []).forEach((p: any) => {
      const amount = Number(p.amount) || 0
      stats.total += amount
      
      switch (p.method?.toUpperCase()) {
        case 'CASH':
          stats.cash += amount
          break
        case 'CARD':
          stats.card += amount
          break
        case 'TRANSFER':
          stats.transfer += amount
          break
      }
    })

    // Map payments to response format
    const formattedPayments = (payments || []).map((p: any) => {
      const orderData = Array.isArray(p.order) ? p.order[0] : p.order
      const tableData = orderData?.table ? (Array.isArray(orderData.table) ? orderData.table[0] : orderData.table) : null
      
      return {
        id: p.id,
        amount: Number(p.amount) || 0,
        method: p.method,
        received_amount: p.received_amount ? Number(p.received_amount) : null,
        change_amount: p.change_amount ? Number(p.change_amount) : null,
        created_at: p.created_at,
        order: orderData ? {
          id: orderData.id,
          order_number: orderData.order_number?.toString() || orderData.id?.slice(-6),
          table: tableData ? { name: tableData.name } : null
        } : null
      }
    })

    return NextResponse.json({
      payments: formattedPayments,
      stats
    })

  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Error al cargar el historial' },
      { status: 500 }
    )
  }
}
