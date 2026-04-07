import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch areas + tables and active orders in parallel (avoid N+1)
    const [areasRes, ordersRes] = await Promise.all([
      supabase
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
        .order('name', { referencedTable: 'tables' }),

      supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          created_at,
          table_id,
          waiter_id,
          waiter:users!waiter_id(id, name),
          items:order_items(id, status)
        `)
        .neq('status', 'PAID')
        .neq('status', 'CANCELLED')
        .not('table_id', 'is', null)
        .order('created_at', { ascending: false })
    ])

    if (areasRes.error) throw areasRes.error
    if (ordersRes.error) throw ordersRes.error

    // Build a map: table_id → most recent active order
    const ordersByTable = new Map<string, any>()
    for (const order of ordersRes.data || []) {
      if (order.table_id && !ordersByTable.has(order.table_id)) {
        ordersByTable.set(order.table_id, order)
      }
    }

    // Collect table status corrections (fire-and-forget, no cascade)
    const tableSyncUpdates: Array<{ id: string; status: string }> = []

    const areasWithOrders = (areasRes.data || []).map((area) => {
      const tablesWithOrders = (area.tables || [])
        .filter((t: any) => t.is_active)
        .map((table: any) => {
          const activeOrder = ordersByTable.get(table.id) || null

          let realStatus = table.status
          if (activeOrder && table.status !== 'OCCUPIED') {
            realStatus = 'OCCUPIED'
            tableSyncUpdates.push({ id: table.id, status: 'OCCUPIED' })
          } else if (!activeOrder && table.status === 'OCCUPIED') {
            realStatus = 'FREE'
            tableSyncUpdates.push({ id: table.id, status: 'FREE' })
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
        .sort((a: any, b: any) => {
          const aNum = parseInt(a.name.replace(/\D/g, '')) || 0
          const bNum = parseInt(b.name.replace(/\D/g, '')) || 0
          if (aNum !== bNum) return aNum - bNum
          return a.name.localeCompare(b.name)
        })

      return { ...area, tables: tablesWithOrders }
    })

    // Fire-and-forget sync — don't await, don't block response, don't cascade
    if (tableSyncUpdates.length > 0) {
      for (const upd of tableSyncUpdates) {
        supabase
          .from('tables')
          .update({ status: upd.status, updated_at: new Date().toISOString() })
          .eq('id', upd.id)
          .then(() => {})
      }
    }

    return NextResponse.json(areasWithOrders)
  } catch (error) {
    console.error('Error fetching mesas:', error)
    return NextResponse.json(
      { error: 'Error al obtener mesas' },
      { status: 500 }
    )
  }
}
