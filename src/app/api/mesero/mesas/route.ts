import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Obtener áreas con sus mesas
    const { data: areas, error } = await supabase
      .from('areas')
      .select(`
        id,
        name,
        tables (
          id,
          name,
          capacity,
          status,
          is_active
        )
      `)
      .eq('is_active', true)
      .order('name')
      .order('name', { referencedTable: 'tables' })

    if (error) throw error

    // Para cada mesa, verificar si tiene órdenes activas y sincronizar el estado
    const areasWithOrders = await Promise.all(
      (areas || []).map(async (area) => {
        const tablesWithOrders = await Promise.all(
          (area.tables || [])
            .filter((t: any) => t.is_active)
            .map(async (table: any) => {
              // Buscar órdenes activas para la mesa (no pagadas ni canceladas)
              const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select(`
                  id, 
                  order_number, 
                  status, 
                  total,
                  created_at,
                  waiter_id,
                  waiter:users!waiter_id(id, name),
                  items:order_items(id, status)
                `)
                .eq('table_id', table.id)
                .neq('status', 'PAID')
                .neq('status', 'CANCELLED')
                .order('created_at', { ascending: false })
                .limit(1)

              if (ordersError) {
                console.error('Error fetching orders for table:', table.id, ordersError)
              }

              const activeOrder = orders && orders.length > 0 ? orders[0] : null

              // Sincronizar el estado de la mesa basado en las órdenes activas
              let realStatus = table.status
              if (activeOrder) {
                // Hay una orden activa: la mesa debe estar OCCUPIED
                if (table.status !== 'OCCUPIED') {
                  realStatus = 'OCCUPIED'
                  await supabase
                    .from('tables')
                    .update({ status: 'OCCUPIED', updated_at: new Date().toISOString() })
                    .eq('id', table.id)
                }
              } else {
                // No hay órdenes activas: si estaba OCCUPIED, debe ser FREE
                if (table.status === 'OCCUPIED') {
                  realStatus = 'FREE'
                  await supabase
                    .from('tables')
                    .update({ status: 'FREE', updated_at: new Date().toISOString() })
                    .eq('id', table.id)
                }
              }

              if (activeOrder) {
                const itemsCount = activeOrder.items?.length || 0
                const readyItems = activeOrder.items?.filter((i: any) => i.status === 'READY' || i.status === 'ready').length || 0
                
                return { 
                  ...table,
                  status: realStatus,
                  current_order: {
                    ...activeOrder,
                    items_count: itemsCount,
                    ready_items: readyItems,
                  },
                  waiter: activeOrder.waiter
                }
              }
              
              return { ...table, status: realStatus, current_order: null, waiter: null }
            })
        )

        return { 
          ...area, 
          tables: tablesWithOrders.sort((a: any, b: any) => {
            // Sort by name (numeric-aware)
            const aNum = parseInt(a.name.replace(/\D/g, '')) || 0
            const bNum = parseInt(b.name.replace(/\D/g, '')) || 0
            if (aNum !== bNum) return aNum - bNum
            return a.name.localeCompare(b.name)
          })
        }
      })
    )

    return NextResponse.json(areasWithOrders)
  } catch (error) {
    console.error('Error fetching mesas:', error)
    return NextResponse.json(
      { error: 'Error al obtener mesas' },
      { status: 500 }
    )
  }
}
