import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Obtener pedidos pendientes y en cocina
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        notes,
        created_at,
        table:tables(name),
        waiter:users!orders_waiter_id_fkey(name),
        items:order_items(
          id,
          quantity,
          notes,
          status,
          product:products(name)
        )
      `)
      .in('status', ['PENDING', 'IN_KITCHEN'])
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json(orders || [])
  } catch (error) {
    console.error('Error fetching pedidos cocina:', error)
    return NextResponse.json(
      { error: 'Error al obtener pedidos' },
      { status: 500 }
    )
  }
}
