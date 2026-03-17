import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getColombiaDateString } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type ReportPeriod = 'day' | 'week' | 'month' | 'year'

function formatDateStr(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateRange(period: ReportPeriod, date: string): { startISO: string; endISO: string } {
  const [refYear, refMonthRaw, refDay] = date.split('-').map(Number)
  const refMonth = refMonthRaw - 1
  const referenceDate = new Date(refYear, refMonth, refDay)

  switch (period) {
    case 'week': {
      const start = new Date(referenceDate)
      start.setDate(start.getDate() - 6)

      return {
        startISO: `${formatDateStr(start)}T00:00:00-05:00`,
        endISO: `${date}T23:59:59.999-05:00`
      }
    }
    case 'month': {
      const firstDay = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-01`

      return {
        startISO: `${firstDay}T00:00:00-05:00`,
        endISO: `${date}T23:59:59.999-05:00`
      }
    }
    case 'year':
      return {
        startISO: `${refYear}-01-01T00:00:00-05:00`,
        endISO: `${date}T23:59:59.999-05:00`
      }
    case 'day':
    default:
      return {
        startISO: `${date}T00:00:00-05:00`,
        endISO: `${date}T23:59:59.999-05:00`
      }
  }
}

async function fetchAllOrders(startISO: string, endISO: string) {
  const pageSize = 1000
  let from = 0
  let hasMore = true
  let allOrders: any[] = []

  while (hasMore) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, total, created_at, updated_at, waiter_id, table_id')
      .in('status', ['PAID', 'DELIVERED'])
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error

    const batch = data || []
    allOrders = allOrders.concat(batch)
    hasMore = batch.length === pageSize
    from += pageSize
  }

  return allOrders
}

async function fetchAllPayments(startISO: string, endISO: string) {
  const pageSize = 1000
  let from = 0
  let hasMore = true
  let allPayments: any[] = []

  while (hasMore) {
    const { data, error } = await supabase
      .from('payments')
      .select('id, amount, method, created_at')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error

    const batch = data || []
    allPayments = allPayments.concat(batch)
    hasMore = batch.length === pageSize
    from += pageSize
  }

  return allPayments
}

async function fetchOrderItems(orderIds: string[]) {
  const chunkSize = 25
  let allItems: any[] = []

  for (let index = 0; index < orderIds.length; index += chunkSize) {
    const chunk = orderIds.slice(index, index + chunkSize)
    const { data, error } = await supabase
      .from('order_items')
      .select('id, order_id, quantity, unit_price, subtotal, product_id')
      .in('order_id', chunk)

    if (error) throw error

    allItems = allItems.concat(data || [])
  }

  return allItems
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || 'day') as ReportPeriod
    const date = searchParams.get('date') || getColombiaDateString()
    const { startISO, endISO } = getDateRange(period, date)

    const [orders, allPayments, usersResponse, tablesResponse, areasResponse, productsResponse, categoriesResponse] = await Promise.all([
      fetchAllOrders(startISO, endISO),
      fetchAllPayments(startISO, endISO),
      supabase
        .from('users')
        .select('id, name, role, is_active')
        .in('role', ['WAITER', 'CASHIER'])
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('tables')
        .select('id, name, area_id, is_active')
        .order('name'),
      supabase
        .from('areas')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('products')
        .select('id, name, category_id')
        .order('name'),
      supabase
        .from('categories')
        .select('id, name')
    ])

    if (usersResponse.error) throw usersResponse.error
    if (tablesResponse.error) throw tablesResponse.error
    if (areasResponse.error) throw areasResponse.error
    if (productsResponse.error) throw productsResponse.error
    if (categoriesResponse.error) throw categoriesResponse.error

    const users = usersResponse.data || []
    const tables = (tablesResponse.data || []).filter((table: any) => table.is_active !== false)
    const areas = areasResponse.data || []
    const products = productsResponse.data || []
    const categories = categoriesResponse.data || []
    const orderIds = orders.map((order: any) => order.id)
    const orderItems = orderIds.length > 0 ? await fetchOrderItems(orderIds) : []

    const totalFromPayments = allPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    const cashFromPayments = allPayments.filter((payment: any) => payment.method === 'CASH').reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    const cardFromPayments = allPayments.filter((payment: any) => payment.method === 'CARD').reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    const transferFromPayments = allPayments.filter((payment: any) => payment.method === 'TRANSFER').reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)

    const usersMap = new Map(users.map((user: any) => [user.id, user]))
    const tablesMap = new Map(tables.map((table: any) => [table.id, table]))
    const categoriesMap = new Map(categories.map((category: any) => [category.id, category]))
    const productsMap = new Map(products.map((product: any) => [product.id, product]))

    const waiterMap = new Map<string, { id: string; name: string; orders: number; total: number }>()
    users.forEach((user: any) => {
      waiterMap.set(user.id, {
        id: user.id,
        name: user.name,
        orders: 0,
        total: 0
      })
    })

    orders.forEach((order: any) => {
      if (!order.waiter_id) {
        return
      }

      const waiter = usersMap.get(order.waiter_id)
      const waiterId = waiter?.id || order.waiter_id
      const currentWaiter = waiterMap.get(waiterId) || {
        id: waiterId,
        name: waiter?.name || 'Sin asignar',
        orders: 0,
        total: 0
      }

      currentWaiter.orders += 1
      currentWaiter.total += Number(order.total) || 0
      waiterMap.set(waiterId, currentWaiter)
    })

    const waitersReport = Array.from(waiterMap.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total
      return a.name.localeCompare(b.name)
    })

    const areaMap = new Map<string, {
      id: string
      name: string
      tables: Map<string, { name: string; orders: number; total: number }>
      totalOrders: number
      totalAmount: number
    }>()

    areas.forEach((area: any) => {
      const areaTables = tables.filter((table: any) => table.area_id === area.id)
      areaMap.set(area.id, {
        id: area.id,
        name: area.name,
        tables: new Map(
          areaTables.map((table: any) => [
            table.id,
            {
              name: table.name,
              orders: 0,
              total: 0
            }
          ])
        ),
        totalOrders: 0,
        totalAmount: 0
      })
    })

    orders.forEach((order: any) => {
      const table = tablesMap.get(order.table_id)
      if (!table) {
        return
      }

      const areaEntry = areaMap.get(table.area_id)
      if (!areaEntry) {
        return
      }

      areaEntry.totalOrders += 1
      areaEntry.totalAmount += Number(order.total) || 0

      const tableEntry = areaEntry.tables.get(table.id) || {
        name: table.name,
        orders: 0,
        total: 0
      }

      tableEntry.orders += 1
      tableEntry.total += Number(order.total) || 0
      areaEntry.tables.set(table.id, tableEntry)
    })

    const areasReport = Array.from(areaMap.values())
      .map((area) => ({
        id: area.id,
        name: area.name,
        tables: Array.from(area.tables.values()).sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total
          return a.name.localeCompare(b.name)
        }),
        totalOrders: area.totalOrders,
        totalAmount: area.totalAmount
      }))
      .sort((a, b) => {
        if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount
        return a.name.localeCompare(b.name)
      })

    const productMap = new Map<string, {
      id: string
      name: string
      category: string
      quantity: number
      total: number
    }>()

    products.forEach((product: any) => {
      const category = categoriesMap.get(product.category_id)
      productMap.set(product.id, {
        id: product.id,
        name: product.name,
        category: category?.name || 'Sin categoría',
        quantity: 0,
        total: 0
      })
    })

    orderItems.forEach((item: any) => {
      const product = productsMap.get(item.product_id)
      if (!product) {
        return
      }

      const currentProduct = productMap.get(product.id) || {
        id: product.id,
        name: product.name,
        category: categoriesMap.get(product.category_id)?.name || 'Sin categoría',
        quantity: 0,
        total: 0
      }

      currentProduct.quantity += item.quantity || 0
      currentProduct.total += Number(item.subtotal) || (item.quantity * Number(item.unit_price)) || 0
      productMap.set(product.id, currentProduct)
    })

    const productsReport = Array.from(productMap.values()).sort((a, b) => {
      if (b.quantity !== a.quantity) return b.quantity - a.quantity
      return a.name.localeCompare(b.name)
    })

    const hourlyMap = new Map<number, { hour: number; orders: number; total: number }>()
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, { hour, orders: 0, total: 0 })
    }

    orders.forEach((order: any) => {
      const baseDate = new Date(order.updated_at || order.created_at)
      const bogotaHour = parseInt(
        baseDate.toLocaleString('en-US', {
          timeZone: 'America/Bogota',
          hour: 'numeric',
          hour12: false
        }),
        10
      )
      const hourEntry = hourlyMap.get(bogotaHour)

      if (!hourEntry) {
        return
      }

      hourEntry.orders += 1
      hourEntry.total += Number(order.total) || 0
    })

    const hourly = Array.from(hourlyMap.values()).sort((a, b) => a.hour - b.hour)

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
      period,
      date,
      startISO,
      endISO,
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Error al cargar los reportes' },
      { status: 500 }
    )
  }
}
