import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener transacciones de un turno específico
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const registerId = searchParams.get('registerId')
    const openedAt = searchParams.get('openedAt')
    const closedAt = searchParams.get('closedAt')

    if (!openedAt) {
      return NextResponse.json(
        { error: 'Fecha de apertura requerida' },
        { status: 400 }
      )
    }

    // Usar fecha de cierre o ahora si sigue abierto
    const endDate = closedAt || new Date().toISOString()

    // Obtener transacciones del período del turno
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
      .gte('created_at', openedAt)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Formatear transacciones
    const transactions = (payments || []).map((p: any) => {
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
      transactions,
      count: transactions.length
    })

  } catch (error) {
    console.error('Error fetching shift transactions:', error)
    return NextResponse.json(
      { error: 'Error al cargar las transacciones del turno' },
      { status: 500 }
    )
  }
}
