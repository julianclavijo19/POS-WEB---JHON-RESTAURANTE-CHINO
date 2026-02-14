import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Ventas de hoy (órdenes pagadas con método de pago)
    const { data: paidOrders } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        created_at,
        table:tables(name),
        payments(method)
      `)
      .eq('status', 'PAID')
      .gte('created_at', todayISO)
      .order('created_at', { ascending: false })

    // Procesar datos
    const ventasDetalle = paidOrders?.map(order => ({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total),
      payment_method: order.payments?.[0]?.method || 'CASH',
      created_at: order.created_at,
      table: order.table,
    })) || []

    const totalVentas = ventasDetalle.reduce((sum, o) => sum + o.total, 0)
    const totalOrdenes = ventasDetalle.length

    // Separar por método de pago
    const ventasEfectivo = ventasDetalle
      .filter((o) => o.payment_method === 'CASH' || !o.payment_method)
      .reduce((sum, o) => sum + o.total, 0)
    const ventasElectronica = ventasDetalle
      .filter((o) => o.payment_method !== 'CASH' && o.payment_method)
      .reduce((sum, o) => sum + o.total, 0)

    return NextResponse.json({
      ventas: ventasDetalle,
      resumen: {
        totalVentas,
        totalOrdenes,
        ventasEfectivo,
        ventasElectronica
      }
    })
  } catch (error) {
    console.error('Error fetching ventas:', error)
    return NextResponse.json(
      { error: 'Error al obtener ventas' },
      { status: 500 }
    )
  }
}
