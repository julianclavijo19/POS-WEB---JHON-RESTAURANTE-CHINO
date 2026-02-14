import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener órdenes para reimprimir y historial de impresiones
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get orders for the day (any order that can be reprinted)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        status,
        type,
        created_at,
        table_id,
        waiter_id
      `)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .neq('status', 'CANCELLED')
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    // Get related data
    const orderIds = (orders || []).map(o => o.id)
    const tableIds = [...new Set((orders || []).map(o => o.table_id).filter(Boolean))]
    const waiterIds = [...new Set((orders || []).map(o => o.waiter_id).filter(Boolean))]

    // Get tables
    let tablesMap = new Map()
    if (tableIds.length > 0) {
      const { data: tables } = await supabase
        .from('tables')
        .select('id, name')
        .in('id', tableIds)
      tablesMap = new Map((tables || []).map(t => [t.id, t]))
    }

    // Get waiters
    let waitersMap = new Map()
    if (waiterIds.length > 0) {
      const { data: waiters } = await supabase
        .from('users')
        .select('id, name')
        .in('id', waiterIds)
      waitersMap = new Map((waiters || []).map(w => [w.id, w]))
    }

    // Get order items with products
    let itemsMap = new Map<string, any[]>()
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('id, order_id, quantity, unit_price, product_id')
        .in('order_id', orderIds)

      // Get products
      const productIds = [...new Set((items || []).map(i => i.product_id))]
      let productsMap = new Map()
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds)
        productsMap = new Map((products || []).map(p => [p.id, p]))
      }

      // Group items by order
      ;(items || []).forEach(item => {
        const orderItems = itemsMap.get(item.order_id) || []
        orderItems.push({
          ...item,
          product: productsMap.get(item.product_id) || { name: 'Producto eliminado' }
        })
        itemsMap.set(item.order_id, orderItems)
      })
    }

    // Get payments for orders
    let paymentsMap = new Map<string, any[]>()
    if (orderIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('order_id, method, amount, received_amount, change_amount')
        .in('order_id', orderIds)

      ;(payments || []).forEach(p => {
        const orderPayments = paymentsMap.get(p.order_id) || []
        orderPayments.push(p)
        paymentsMap.set(p.order_id, orderPayments)
      })
    }

    // Format orders
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total) || 0,
      status: order.status,
      type: order.type,
      created_at: order.created_at,
      table: tablesMap.get(order.table_id) || null,
      waiter: waitersMap.get(order.waiter_id) || null,
      items: itemsMap.get(order.id) || [],
      payments: paymentsMap.get(order.id) || []
    }))

    // Get print logs for the day (table may not exist)
    let printLogs: any[] = []
    try {
      const { data: logs, error: logsError } = await supabase
        .from('print_logs')
        .select(`
          id,
          order_id,
          print_type,
          printed_by,
          copies,
          success,
          created_at
        `)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
      
      if (!logsError) {
        printLogs = logs || []
      }
    } catch (e) {
      // Table may not exist, ignore
      console.log('print_logs table may not exist')
    }

    // Format print logs with order and user info
    const formattedLogs = (printLogs || []).map(log => {
      const order = formattedOrders.find(o => o.id === log.order_id)
      return {
        ...log,
        order: order ? {
          order_number: order.order_number,
          table: order.table
        } : null,
        user: waitersMap.get(log.printed_by) || null
      }
    })

    return NextResponse.json({
      orders: formattedOrders,
      printLogs: formattedLogs
    })

  } catch (error) {
    console.error('Error fetching reprint data:', error)
    return NextResponse.json(
      { error: 'Error al cargar los datos' },
      { status: 500 }
    )
  }
}

// POST - Registrar una reimpresión
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, print_type } = body

    // Get user from session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    let userId = null
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionCookie.value))
        userId = session.id
      } catch (e) {
        console.error('Error parsing session:', e)
      }
    }

    // Insert print log
    const { data, error } = await supabase
      .from('print_logs')
      .insert({
        order_id,
        print_type,
        printed_by: userId,
        copies: 1,
        success: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, log: data })

  } catch (error) {
    console.error('Error logging print:', error)
    return NextResponse.json(
      { error: 'Error al registrar la impresión' },
      { status: 500 }
    )
  }
}
