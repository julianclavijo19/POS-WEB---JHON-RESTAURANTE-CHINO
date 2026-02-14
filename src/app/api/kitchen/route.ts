import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener órdenes para cocina
export async function GET() {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(*,area:areas(*)),
        waiter:users!orders_waiter_id_fkey(id, name),
        items:order_items(*,product:products(*))
      `)
      .in('status', ['IN_KITCHEN', 'READY'])
      .order('created_at', { ascending: true })

    if (error) throw error

    // Filtrar items para mostrar solo los que están en preparación o listos
    const filteredOrders = orders?.map(order => ({
      ...order,
      items: order.items?.filter((item: any) => 
        item.status === 'PREPARING' || item.status === 'READY'
      )
    }))

    return NextResponse.json(filteredOrders)
  } catch (error) {
    console.error('Error fetching kitchen orders:', error)
    return NextResponse.json(
      { error: 'Error al obtener órdenes de cocina' },
      { status: 500 }
    )
  }
}
