import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener notificaciones del mesero
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const waiterId = searchParams.get('waiterId')

    if (!waiterId) {
      return NextResponse.json(
        { error: 'waiterId es requerido' },
        { status: 400 }
      )
    }

    // Buscar órdenes del mesero que tengan items listos
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        table:tables(name),
        items:order_items(status)
      `)
      .eq('waiter_id', waiterId)
      .neq('status', 'PAID')
      .neq('status', 'CANCELLED')

    if (error) throw error

    // Crear notificaciones para órdenes con items listos
    const notifications = (orders || [])
      .filter(order => order.items?.some((item: any) => item.status === 'READY'))
      .map(order => {
        // table viene como array de Supabase, tomamos el primer elemento
        const tableName = Array.isArray(order.table) 
          ? order.table[0]?.name 
          : (order.table as any)?.name
        return {
          id: `notif-${order.id}`,
          order_id: order.id,
          order_number: order.order_number,
          table_name: tableName || 'Sin mesa',
          message: `Hay platillos listos para servir`,
          created_at: new Date().toISOString(),
          read: false,
        }
      })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    )
  }
}
