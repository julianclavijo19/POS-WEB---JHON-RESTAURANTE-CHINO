import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getColombiaDateString } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    // Default to today in Colombia timezone if no date provided
    const dateStr = date || getColombiaDateString()
    const startOfDay = `${dateStr}T00:00:00-05:00`
    const endOfDay = `${dateStr}T23:59:59.999-05:00`

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
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)

    if (error) throw error

    // Get payments for the same period (source of truth for totals, matching estadisticas)
    let allPayments: any[] = []
    let payFrom = 0
    const payPageSize = 1000
    let payHasMore = true
    while (payHasMore) {
      const { data: payBatch, error: payError } = await supabase
        .from('payments')
        .select('id, amount, method, created_at')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: true })
        .range(payFrom, payFrom + payPageSize - 1)
      if (payError) throw payError
      const batch = payBatch || []
      allPayments = allPayments.concat(batch)
      payHasMore = batch.length === payPageSize
      payFrom += payPageSize
    }

    const totalFromPayments = allPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const cashFromPayments = allPayments.filter((p: any) => p.method === 'CASH').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const cardFromPayments = allPayments.filter((p: any) => p.method === 'CARD').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const transferFromPayments = allPayments.filter((p: any) => p.method === 'TRANSFER').reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)

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
      hourly,
      totalFromPayments: Math.round(totalFromPayments),
      salesByMethod: {
        cash: Math.round(cashFromPayments),
        card: Math.round(cardFromPayments),
        transfer: Math.round(transferFromPayments),
      },
    })

  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Error al cargar los reportes' },
      { status: 500 }
    )
  }
}
