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
        total,
        payments(method)
      `)
      .eq('status', 'PAID')
      .gte('created_at', todayISO)

    const ventasHoy = paidOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0
    const ordenesHoy = paidOrders?.length || 0

    // Ventas por método de pago
    const efectivo = paidOrders?.filter(o => 
      o.payments?.[0]?.method === 'CASH' || o.payments?.[0]?.method === 'cash' || !o.payments?.[0]?.method
    ).reduce((sum, o) => sum + Number(o.total), 0) || 0
    
    const tarjeta = paidOrders?.filter(o => 
      o.payments?.[0]?.method === 'CARD' || o.payments?.[0]?.method === 'card'
    ).reduce((sum, o) => sum + Number(o.total), 0) || 0

    const transferencia = paidOrders?.filter(o => 
      o.payments?.[0]?.method === 'TRANSFER' || o.payments?.[0]?.method === 'transfer'
    ).reduce((sum, o) => sum + Number(o.total), 0) || 0

    // Órdenes pendientes de cobro (READY, SERVED o DELIVERED que no tengan pago)
    const { data: pendingOrders, count: ordenesPendientes } = await supabase
      .from('orders')
      .select('total', { count: 'exact' })
      .in('status', ['READY', 'SERVED', 'DELIVERED'])
      .is('paid_at', null)
      .gte('created_at', todayISO)

    const totalPendiente = pendingOrders?.reduce((sum, o) => sum + Number(o.total), 0) || 0

    const ticketPromedio = ordenesHoy > 0 ? ventasHoy / ordenesHoy : 0

    // Verificar si la caja está abierta
    const { data: turnoActual } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      ventasHoy,
      ordenesHoy,
      ordenesPendientes: ordenesPendientes || 0,
      ticketPromedio,
      efectivo,
      tarjeta,
      transferencia,
      cajaAbierta: !!turnoActual,
      fondoInicial: turnoActual?.opening_amount || 0,
      turnoActual: turnoActual ? {
        id: turnoActual.id,
        openedAt: turnoActual.opened_at,
        openedBy: turnoActual.opened_by
      } : undefined
    })
  } catch (error) {
    console.error('Error fetching cajero stats:', error)
    return NextResponse.json({
      ventasHoy: 0,
      ordenesHoy: 0,
      ordenesPendientes: 0,
      ticketPromedio: 0,
      efectivo: 0,
      tarjeta: 0,
      transferencia: 0,
      cajaAbierta: false,
      fondoInicial: 0
    })
  }
}
