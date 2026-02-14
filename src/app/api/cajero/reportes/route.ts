import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    console.log('=== REPORTES API DEBUG ===')
    console.log('Date parameter:', date)
    
    // Default to today if no date provided
    const targetDate = date ? new Date(date + 'T00:00:00') : new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    console.log('Target date:', targetDate)
    console.log('Start of day:', startOfDay.toISOString())
    console.log('End of day:', endOfDay.toISOString())

    // Get all completed/paid orders for the day with related data
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        created_at,
        updated_at,
        waiter_id,
        table_id
      `)
      .in('status', ['PAID', 'DELIVERED'])
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())

    if (error) throw error

    // DEBUG: Log para ver los pedidos encontrados
    console.log('=== REPORTES DEBUG ===')
    console.log('Fecha buscada:', targetDate.toISOString().split('T')[0])
    console.log('Desde:', startOfDay.toISOString())
    console.log('Hasta:', endOfDay.toISOString())
    console.log('Pedidos encontrados:', orders?.length || 0)
    console.log('Pedidos:', JSON.stringify(orders, null, 2))

    // Get waiters
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
    const usersMap = new Map((users || []).map(u => [u.id, u]))

    // Get tables with areas
    const { data: tables } = await supabase
      .from('tables')
      .select('id, name, area_id')
    const tablesMap = new Map((tables || []).map(t => [t.id, t]))

    // Get areas
    const { data: areas } = await supabase
      .from('areas')
      .select('id, name')
    const areasMap = new Map((areas || []).map(a => [a.id, a]))

    // Get order items with products
    const orderIds = (orders || []).map(o => o.id)
    let orderItems: any[] = []
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from('order_items')
        .select('id, order_id, quantity, unit_price, subtotal, product_id')
        .in('order_id', orderIds)
      orderItems = items || []
    }

    // Get products with categories
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category_id')
    const productsMap = new Map((products || []).map(p => [p.id, p]))

    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
    const categoriesMap = new Map((categories || []).map(c => [c.id, c]))

    const orderList = orders || []

    // 1. Waiter Report
    const waiterMap = new Map<string, { id: string; name: string; orders: number; total: number }>()
    orderList.forEach((order: any) => {
      const waiter = usersMap.get(order.waiter_id)
      if (waiter) {
        const existing = waiterMap.get(waiter.id) || {
          id: waiter.id,
          name: waiter.name,
          orders: 0,
          total: 0
        }
        existing.orders += 1
        existing.total += Number(order.total) || 0
        waiterMap.set(waiter.id, existing)
      }
    })
    const waitersReport = Array.from(waiterMap.values()).sort((a, b) => b.total - a.total)

    // 2. Area Report
    const areaMap = new Map<string, { 
      id: string; 
      name: string; 
      tables: Map<string, { name: string; orders: number; total: number }>;
      totalOrders: number;
      totalAmount: number;
    }>()
    
    orderList.forEach((order: any) => {
      const table = tablesMap.get(order.table_id)
      const area = table ? areasMap.get(table.area_id) : null
      
      if (table && area) {
        const existing = areaMap.get(area.id) || {
          id: area.id,
          name: area.name,
          tables: new Map(),
          totalOrders: 0,
          totalAmount: 0
        }
        
        existing.totalOrders += 1
        existing.totalAmount += Number(order.total) || 0
        
        const tableData = existing.tables.get(table.id) || {
          name: table.name,
          orders: 0,
          total: 0
        }
        tableData.orders += 1
        tableData.total += Number(order.total) || 0
        existing.tables.set(table.id, tableData)
        
        areaMap.set(area.id, existing)
      }
    })
    
    const areasReport = Array.from(areaMap.values())
      .map(area => ({
        id: area.id,
        name: area.name,
        tables: Array.from(area.tables.values()).sort((a, b) => b.total - a.total),
        totalOrders: area.totalOrders,
        totalAmount: area.totalAmount
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    // 3. Product Report
    const productMap = new Map<string, { 
      id: string; 
      name: string; 
      category: string;
      quantity: number; 
      total: number 
    }>()
    
    orderItems.forEach((item: any) => {
      const product = productsMap.get(item.product_id)
      const category = product ? categoriesMap.get(product.category_id) : null
      
      if (product) {
        const existing = productMap.get(product.id) || {
          id: product.id,
          name: product.name,
          category: category?.name || 'Sin categoría',
          quantity: 0,
          total: 0
        }
        existing.quantity += item.quantity || 0
        existing.total += Number(item.subtotal) || (item.quantity * Number(item.unit_price)) || 0
        productMap.set(product.id, existing)
      }
    })
    
    const productsReport = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity)

    // 4. Hourly Report
    const hourlyMap = new Map<number, { hour: number; orders: number; total: number }>()
    
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { hour: h, orders: 0, total: 0 })
    }
    
    orderList.forEach((order: any) => {
      const d = new Date(order.updated_at || order.created_at)
      const hour = parseInt(d.toLocaleString('en-US', { timeZone: 'America/Bogota', hour: 'numeric', hour12: false }), 10)
      const existing = hourlyMap.get(hour)!
      existing.orders += 1
      existing.total += Number(order.total) || 0
    })
    
    const hourly = Array.from(hourlyMap.values())
      .filter(h => h.orders > 0 || (h.hour >= 8 && h.hour <= 22))
      .sort((a, b) => a.hour - b.hour)

    return NextResponse.json({
      waiters: waitersReport,
      areas: areasReport,
      products: productsReport,
      hourly
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Error al cargar los reportes' },
      { status: 500 }
    )
  }
}
