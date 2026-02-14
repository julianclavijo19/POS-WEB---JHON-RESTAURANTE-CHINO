import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'
    
    let startDate = new Date()
    startDate.setHours(0, 0, 0, 0)
    
    if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1)
    }
    
    const startDateISO = startDate.toISOString()

    // Obtener pedidos completados
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        updated_at,
        table:tables(name),
        waiter:users!orders_waiter_id_fkey(name),
        items:order_items(
          id,
          quantity,
          notes,
          status,
          product:products(name, prep_time, category:categories(name))
        )
      `)
      .in('status', ['READY', 'SERVED', 'PAID', 'CANCELLED'])
      .gte('created_at', startDateISO)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json(orders || [])
  } catch (error) {
    console.error('Error fetching historial cocina:', error)
    return NextResponse.json(
      { error: 'Error al obtener historial' },
      { status: 500 }
    )
  }
}
