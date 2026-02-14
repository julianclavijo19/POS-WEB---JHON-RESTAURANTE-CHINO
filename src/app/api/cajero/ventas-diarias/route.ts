import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener ventas de un día específico
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const startOfDay = date + 'T00:00:00'
    const endOfDay = date + 'T23:59:59.999'

    // Obtener pagos del día
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        method,
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

    // Calcular resumen
    const summary = {
      total: 0,
      cash: 0,
      card: 0,
      transfer: 0,
      count: payments?.length || 0
    }

    payments?.forEach((payment: any) => {
      const amount = Number(payment.amount) || 0
      summary.total += amount
      
      switch (payment.method?.toUpperCase()) {
        case 'CASH':
          summary.cash += amount
          break
        case 'CARD':
          summary.card += amount
          break
        case 'TRANSFER':
          summary.transfer += amount
          break
      }
    })

    return NextResponse.json({
      payments: payments || [],
      summary
    })

  } catch (error) {
    console.error('Error fetching daily sales:', error)
    return NextResponse.json(
      { error: 'Error al obtener ventas diarias' },
      { status: 500 }
    )
  }
}
