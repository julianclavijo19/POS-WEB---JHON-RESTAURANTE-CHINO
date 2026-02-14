import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener descuentos, órdenes y descuentos aplicados
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Get configured discounts (predefined)
    const { data: discounts } = await supabase
      .from('discounts')
      .select('*')
      .order('created_at', { ascending: false })

    // Get pending orders that can receive discounts
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        status,
        created_at,
        table_id,
        waiter_id
      `)
      .in('status', ['PENDING', 'IN_PROGRESS', 'READY', 'DELIVERED'])
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError

    // Get tables
    const tableIds = [...new Set((orders || []).map(o => o.table_id).filter(Boolean))]
    let tablesMap = new Map()
    if (tableIds.length > 0) {
      const { data: tables } = await supabase
        .from('tables')
        .select('id, name')
        .in('id', tableIds)
      tablesMap = new Map((tables || []).map(t => [t.id, t]))
    }

    // Get waiters
    const waiterIds = [...new Set((orders || []).map(o => o.waiter_id).filter(Boolean))]
    let usersMap = new Map()
    if (waiterIds.length > 0) {
      const { data: waiters } = await supabase
        .from('users')
        .select('id, name')
        .in('id', waiterIds)
      usersMap = new Map((waiters || []).map(w => [w.id, w]))
    }

    // Format orders
    const formattedOrders = (orders || []).map(order => ({
      id: order.id,
      order_number: order.order_number,
      total: Number(order.total) || 0,
      status: order.status,
      created_at: order.created_at,
      table: tablesMap.get(order.table_id) || null,
      waiter: usersMap.get(order.waiter_id) || null
    }))

    // Get applied discounts for the day
    const { data: appliedDiscounts } = await supabase
      .from('applied_discounts')
      .select(`
        id,
        order_id,
        discount_type,
        discount_value,
        discount_amount,
        reason,
        created_at,
        applied_by
      `)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false })

    // Get userIds from applied discounts
    const appliedUserIds = [...new Set((appliedDiscounts || []).map(d => d.applied_by).filter(Boolean))]
    if (appliedUserIds.length > 0) {
      const { data: discountUsers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', appliedUserIds)
      
      ;(discountUsers || []).forEach(u => usersMap.set(u.id, u))
    }

    // Format applied discounts
    const formattedAppliedDiscounts = (appliedDiscounts || []).map(discount => {
      const order = formattedOrders.find(o => o.id === discount.order_id)
      return {
        ...discount,
        discount_value: Number(discount.discount_value) || 0,
        discount_amount: Number(discount.discount_amount) || 0,
        order: order ? {
          order_number: order.order_number,
          table: order.table,
          total: order.total
        } : null,
        applied_by_user: usersMap.get(discount.applied_by) || null
      }
    })

    // Calculate totals
    const totalDiscounted = formattedAppliedDiscounts.reduce((sum, d) => sum + d.discount_amount, 0)
    const discountCount = formattedAppliedDiscounts.length

    return NextResponse.json({
      orders: formattedOrders,
      applied_discounts: formattedAppliedDiscounts,
      discounts: (discounts || []).map(d => ({
        ...d,
        value: Number(d.value) || 0,
        times_used: d.times_used || 0
      })),
      stats: {
        total_discounted: totalDiscounted,
        discount_count: discountCount
      }
    })

  } catch (error) {
    console.error('Error fetching discount data:', error)
    return NextResponse.json(
      { error: 'Error al cargar los datos' },
      { status: 500 }
    )
  }
}

// POST - Aplicar un descuento a una orden
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, discount_type, discount_value, reason } = body

    if (!order_id || !discount_type || !discount_value) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Get order to calculate discount amount
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Calculate discount amount
    const orderTotal = Number(order.total) || 0
    let discountAmount = 0
    
    if (discount_type === 'percentage') {
      discountAmount = orderTotal * (discount_value / 100)
    } else if (discount_type === 'fixed') {
      discountAmount = Math.min(discount_value, orderTotal)
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

    // Create applied discount record
    const { data, error } = await supabase
      .from('applied_discounts')
      .insert({
        order_id,
        discount_type,
        discount_value,
        discount_amount: discountAmount,
        reason,
        applied_by: userId
      })
      .select()
      .single()

    if (error) throw error

    // Update order total
    const newTotal = orderTotal - discountAmount
    await supabase
      .from('orders')
      .update({ total: newTotal })
      .eq('id', order_id)

    return NextResponse.json({ 
      success: true, 
      applied_discount: data,
      new_total: newTotal,
      message: 'Descuento aplicado correctamente'
    })

  } catch (error) {
    console.error('Error applying discount:', error)
    return NextResponse.json(
      { error: 'Error al aplicar el descuento' },
      { status: 500 }
    )
  }
}
