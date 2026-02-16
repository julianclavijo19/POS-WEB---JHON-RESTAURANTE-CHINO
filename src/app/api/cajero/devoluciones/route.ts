import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener órdenes pagadas y historial de devoluciones
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    // Use Colombia timezone (UTC-5) for date range calculation
    // When date param is '2026-02-16', we want Colombia's full day:
    //   Start: 2026-02-16 00:00 COT = 2026-02-16 05:00 UTC
    //   End:   2026-02-16 23:59 COT = 2026-02-17 04:59 UTC
    const dateStr = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
    const startOfDay = new Date(`${dateStr}T00:00:00-05:00`)
    const endOfDay = new Date(`${dateStr}T23:59:59.999-05:00`)

    // Get paid/completed orders eligible for returns
    // También incluir órdenes que tengan registros de pago en la tabla payments
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
        waiter_id,
        paid_at
      `)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
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
    let usersMap = new Map()
    if (waiterIds.length > 0) {
      const { data: waiters } = await supabase
        .from('users')
        .select('id, name')
        .in('id', waiterIds)
      usersMap = new Map((waiters || []).map(w => [w.id, w]))
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
          product: productsMap.get(item.product_id) || { id: item.product_id, name: 'Producto eliminado' }
        })
        itemsMap.set(item.order_id, orderItems)
      })
    }

    // Get payments for orders
    let paymentsMap = new Map<string, any>()
    if (orderIds.length > 0) {
      const { data: payments } = await supabase
        .from('payments')
        .select('order_id, method, amount')
        .in('order_id', orderIds)

      ;(payments || []).forEach(p => {
        if (!paymentsMap.has(p.order_id)) {
          paymentsMap.set(p.order_id, p)
        }
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
      waiter: usersMap.get(order.waiter_id) || null,
      items: itemsMap.get(order.id) || [],
      payment: paymentsMap.get(order.id) || null
    }))
    // Filter to only show paid orders (orders with payment record or PAID status or paid_at set)
    .filter(order => 
      order.payment !== null || 
      order.status === 'PAID' || 
      (orders || []).find(o => o.id === order.id)?.paid_at !== null
    )

    // Get IDs of orders that already have an approved refund
    // so we can exclude them from the "new refund" list
    const refundedOrderIds = new Set<string>()

    // Get refunds for the day (table may not exist)
    let refunds: any[] = []
    try {
      const { data: refundsData, error: refundsError } = await supabase
        .from('refunds')
        .select(`
          id,
          order_id,
          amount,
          reason,
          status,
          notes,
          created_at,
          processed_at,
          created_by,
          approved_by
        `)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false })
      
      if (!refundsError) {
        refunds = refundsData || []
        // Track which orders already have approved refunds
        refunds.forEach(r => {
          if (r.status === 'APPROVED' && r.order_id) {
            refundedOrderIds.add(r.order_id)
          }
        })
      }
    } catch (e) {
      // Table may not exist, ignore
      console.log('refunds table may not exist')
    }

    // Filter out orders that already have an approved refund
    const availableOrders = formattedOrders.filter(o => !refundedOrderIds.has(o.id))

    // Get all user IDs from refunds
    const refundUserIds = [...new Set([
      ...(refunds || []).map(r => r.created_by).filter(Boolean),
      ...(refunds || []).map(r => r.approved_by).filter(Boolean)
    ])]

    // Get users for refunds
    if (refundUserIds.length > 0) {
      const { data: refundUsers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', refundUserIds)
      
      ;(refundUsers || []).forEach(u => usersMap.set(u.id, u))
    }

    // Format refunds
    const formattedRefunds = (refunds || []).map(refund => {
      const order = formattedOrders.find(o => o.id === refund.order_id)
      return {
        ...refund,
        amount: Number(refund.amount) || 0,
        order: order ? {
          order_number: order.order_number,
          table: order.table
        } : null,
        created_by_user: usersMap.get(refund.created_by) || null,
        approved_by_user: usersMap.get(refund.approved_by) || null
      }
    })

    return NextResponse.json({
      orders: availableOrders,
      refunds: formattedRefunds
    })

  } catch (error) {
    console.error('Error fetching refund data:', error)
    return NextResponse.json(
      { error: 'Error al cargar los datos' },
      { status: 500 }
    )
  }
}

// POST - Crear una nueva devolución
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, amount, reason, notes, payment_method } = body

    if (!order_id || !amount || !reason) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

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

    // IMPORTANT: Verify there is an active shift before allowing refunds
    const { data: activeShift, error: shiftError } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('status', 'OPEN')
      .limit(1)
      .single()

    if (shiftError || !activeShift) {
      return NextResponse.json(
        { error: 'No hay turno activo. Debe abrir un turno para procesar devoluciones.' },
        { status: 400 }
      )
    }

    // Validate refund amount doesn't exceed order total
    const { data: orderData } = await supabase
      .from('orders')
      .select('total, order_number')
      .eq('id', order_id)
      .single()

    if (orderData && amount > Number(orderData.total)) {
      return NextResponse.json(
        { error: 'El monto de devolución no puede superar el total de la orden' },
        { status: 400 }
      )
    }

    // Create refund record - associate with active cash register
    const { data, error } = await supabase
      .from('refunds')
      .insert({
        order_id,
        amount,
        reason,
        notes,
        status: 'APPROVED',
        payment_method: payment_method || 'CASH',
        cash_register_id: activeShift.id, // Associate refund with current shift
        created_by: userId,
        approved_by: userId,
        processed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Register the refund as a negative payment to reflect in cash register
    // This ensures the refund amount is deducted from the shift totals
    const refundMethod = payment_method || 'CASH'
    
    // Build payment row - only include columns that exist
    const refundPaymentRow: Record<string, unknown> = {
      order_id,
      method: refundMethod,
      amount: -Math.abs(amount), // Negative amount for refund
      received_amount: 0,
      change_amount: 0,
    }

    // Try inserting with optional columns first, fallback without them
    let paymentInserted = false
    try {
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          ...refundPaymentRow,
          status: 'REFUND',
          cash_register_id: activeShift.id
        })
      if (paymentError) throw paymentError
      paymentInserted = true
    } catch (e1: any) {
      console.warn('Refund payment with extra columns failed, trying without:', e1?.message)
      // Retry without status and cash_register_id (columns might not exist)
      try {
        const { error: paymentError2 } = await supabase
          .from('payments')
          .insert(refundPaymentRow)
        if (paymentError2) throw paymentError2
        paymentInserted = true
      } catch (e2: any) {
        console.error('Error registering refund payment (fallback):', e2?.message)
      }
    }

    if (!paymentInserted) {
      console.error('WARNING: Refund payment could not be created. Cash register totals may not reflect this refund.')
    }

    return NextResponse.json({ 
      success: true, 
      refund: data,
      message: 'Devolución procesada correctamente'
    })

  } catch (error) {
    console.error('Error creating refund:', error)
    return NextResponse.json(
      { error: 'Error al procesar la devolución' },
      { status: 500 }
    )
  }
}
