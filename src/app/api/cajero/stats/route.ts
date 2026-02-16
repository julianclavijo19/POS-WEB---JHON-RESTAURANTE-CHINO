import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Colombia timezone offset: UTC-5
    const now = new Date()
    const colombiaOffset = -5 * 60 // minutes
    const colombiaNow = new Date(now.getTime() + (colombiaOffset + now.getTimezoneOffset()) * 60000)
    const y = colombiaNow.getFullYear()
    const m = String(colombiaNow.getMonth() + 1).padStart(2, '0')
    const d = String(colombiaNow.getDate()).padStart(2, '0')
    const todayStart = `${y}-${m}-${d}T00:00:00-05:00`
    const todayEnd = `${y}-${m}-${d}T23:59:59.999-05:00`

    // Pagos de hoy (incluye pagos normales y devoluciones con monto negativo)
    const { data: todayPayments } = await supabase
      .from('payments')
      .select('id, amount, method, order_id')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

    // Separar pagos normales de devoluciones (monto negativo)
    const normalPayments = (todayPayments || []).filter(p => Number(p.amount) > 0)
    const refundPayments = (todayPayments || []).filter(p => Number(p.amount) < 0)

    const ventasBruto = normalPayments.reduce((sum, p) => sum + Number(p.amount), 0)
    const totalDevoluciones = Math.abs(refundPayments.reduce((sum, p) => sum + Number(p.amount), 0))
    const ventasHoy = ventasBruto - totalDevoluciones
    const ordenesHoy = normalPayments.length

    // Ventas por método de pago (solo pagos positivos)
    const efectivo = normalPayments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + Number(p.amount), 0)
    const tarjeta = normalPayments.filter(p => p.method === 'CARD').reduce((sum, p) => sum + Number(p.amount), 0)
    const transferencia = normalPayments.filter(p => p.method === 'TRANSFER').reduce((sum, p) => sum + Number(p.amount), 0)

    // Devoluciones por método
    const devEfectivo = Math.abs(refundPayments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + Number(p.amount), 0))
    const devTarjeta = Math.abs(refundPayments.filter(p => p.method === 'CARD').reduce((sum, p) => sum + Number(p.amount), 0))
    const devTransferencia = Math.abs(refundPayments.filter(p => p.method === 'TRANSFER').reduce((sum, p) => sum + Number(p.amount), 0))

    // Órdenes pendientes de cobro (READY, SERVED o DELIVERED que no tengan pago)
    const { data: pendingOrders, count: ordenesPendientes } = await supabase
      .from('orders')
      .select('total', { count: 'exact' })
      .in('status', ['READY', 'SERVED', 'DELIVERED'])
      .is('paid_at', null)
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)

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
      efectivo: efectivo - devEfectivo,
      tarjeta: tarjeta - devTarjeta,
      transferencia: transferencia - devTransferencia,
      devoluciones: totalDevoluciones,
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
      devoluciones: 0,
      cajaAbierta: false,
      fondoInicial: 0
    })
  }
}
