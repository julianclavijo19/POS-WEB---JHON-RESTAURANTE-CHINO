import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const COLOMBIA_OFFSET_HOURS = 5

function getColombiaDate(utcDate: Date): Date {
  return new Date(utcDate.getTime() - (COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000))
}

function getDateRange(period: string) {
  const nowUTC = new Date()
  const colombiaTime = getColombiaDate(nowUTC)
  const year = colombiaTime.getUTCFullYear()
  const month = colombiaTime.getUTCMonth()
  const day = colombiaTime.getUTCDate()

  const todayStart = new Date(Date.UTC(year, month, day, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
  const todayEnd = new Date(Date.UTC(year, month, day + 1, COLOMBIA_OFFSET_HOURS - 1, 59, 59, 999))

  switch (period) {
    case 'today':
      return { start: todayStart, end: todayEnd, label: `Hoy (${colombiaTime.toLocaleDateString('es-CO')})` }
    case 'week': {
      const weekStart = new Date(todayStart.getTime() - (7 * 24 * 60 * 60 * 1000))
      return { start: weekStart, end: todayEnd, label: 'Última Semana' }
    }
    case 'month': {
      const monthStart = new Date(Date.UTC(year, month, 1, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
      return { start: monthStart, end: todayEnd, label: `Mes ${colombiaTime.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}` }
    }
    case 'year': {
      const yearStart = new Date(Date.UTC(year, 0, 1, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
      return { start: yearStart, end: todayEnd, label: `Año ${year}` }
    }
    default:
      return { start: todayStart, end: todayEnd, label: 'Hoy' }
  }
}

function fmtCol(d: Date): string {
  return getColombiaDate(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(d: Date): string {
  return getColombiaDate(d).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
function fmtCurrency(n: number): number {
  return Math.round(n)
}
function methodLabel(m: string): string {
  const map: Record<string, string> = { CASH: 'Efectivo', CARD: 'Tarjeta', TRANSFER: 'Transferencia', NEQUI: 'Nequi', DAVIPLATA: 'Daviplata' }
  return map[m] || m || 'Efectivo'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'
    const { start, end, label } = getDateRange(period)

    // Fetch all data
    const [ordersRes, paymentsRes, itemsRes, productsRes] = await Promise.all([
      supabase.from('orders').select('id, order_number, subtotal, tax, total, discount, status, created_at, paid_at, table_id, table:tables(name), user_id, user:users(name)').order('created_at', { ascending: true }),
      supabase.from('payments').select('id, order_id, amount, method, created_at'),
      supabase.from('order_items').select('id, order_id, product_id, quantity, unit_price, total_price, notes, product:products(name, category_id, category:categories(name))'),
      supabase.from('products').select('id, name, price, category:categories(name)')
    ])

    // Filter by date range
    const orders = (ordersRes.data || []).filter(o => {
      const d = new Date(o.created_at)
      return d >= start && d <= end
    })
    const payments = (paymentsRes.data || []).filter(p => {
      const d = new Date(p.created_at)
      return d >= start && d <= end
    })
    const orderIds = new Set(orders.map(o => o.id))
    const items = (itemsRes.data || []).filter((i: any) => orderIds.has(i.order_id))

    // ==========================================
    // SHEET 1: RESUMEN GENERAL
    // ==========================================
    const paidOrders = orders.filter(o => o.status === 'PAID')
    const totalSales = payments.reduce((s, p) => s + Number(p.amount || 0), 0)
    const totalSubtotal = paidOrders.reduce((s, o) => s + Number(o.subtotal || 0), 0)
    const totalTax = paidOrders.reduce((s, o) => s + Number(o.tax || 0), 0)
    const totalDiscount = paidOrders.reduce((s, o) => s + Number(o.discount || 0), 0)
    const avgTicket = paidOrders.length > 0 ? totalSales / paidOrders.length : 0
    const cashTotal = payments.filter(p => p.method === 'CASH').reduce((s, p) => s + Number(p.amount || 0), 0)
    const cardTotal = payments.filter(p => p.method === 'CARD').reduce((s, p) => s + Number(p.amount || 0), 0)
    const transferTotal = payments.filter(p => p.method === 'TRANSFER').reduce((s, p) => s + Number(p.amount || 0), 0)
    const otherTotal = totalSales - cashTotal - cardTotal - transferTotal

    const summaryData = [
      ['REPORTE DE PRODUCCIÓN', '', ''],
      ['Período:', label, ''],
      ['Generado:', new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }), ''],
      ['', '', ''],
      ['INDICADOR', 'VALOR', ''],
      ['Total Ventas (con impuestos)', fmtCurrency(totalSales), ''],
      ['Subtotal (sin impuestos)', fmtCurrency(totalSubtotal), ''],
      ['Total Impuestos', fmtCurrency(totalTax), ''],
      ['Total Descuentos', fmtCurrency(totalDiscount), ''],
      ['', '', ''],
      ['Órdenes Totales', orders.length, ''],
      ['Órdenes Pagadas', paidOrders.length, ''],
      ['Órdenes Pendientes/Canceladas', orders.length - paidOrders.length, ''],
      ['Ticket Promedio', fmtCurrency(avgTicket), ''],
      ['', '', ''],
      ['VENTAS POR MÉTODO DE PAGO', 'MONTO', 'PORCENTAJE'],
      ['Efectivo', fmtCurrency(cashTotal), totalSales > 0 ? `${((cashTotal / totalSales) * 100).toFixed(1)}%` : '0%'],
      ['Tarjeta', fmtCurrency(cardTotal), totalSales > 0 ? `${((cardTotal / totalSales) * 100).toFixed(1)}%` : '0%'],
      ['Transferencia', fmtCurrency(transferTotal), totalSales > 0 ? `${((transferTotal / totalSales) * 100).toFixed(1)}%` : '0%'],
      ...(otherTotal > 0 ? [['Otros', fmtCurrency(otherTotal), `${((otherTotal / totalSales) * 100).toFixed(1)}%`]] : []),
    ]

    // ==========================================
    // SHEET 2: DETALLE DE ÓRDENES
    // ==========================================
    const ordersHeader = ['Nº Orden', 'Fecha', 'Hora', 'Mesa', 'Mesero', 'Estado', 'Subtotal', 'Impuesto', 'Descuento', 'Total', 'Método Pago']
    const ordersRows = orders.map(o => {
      const d = new Date(o.created_at)
      const tableData = o.table as any
      const mesa = Array.isArray(tableData) ? tableData[0]?.name : tableData?.name || 'N/A'
      const userData = o.user as any
      const mesero = Array.isArray(userData) ? userData[0]?.name : userData?.name || 'N/A'
      const payment = payments.find(p => p.order_id === o.id)
      const statusMap: Record<string, string> = { PAID: 'Pagada', PENDING: 'Pendiente', IN_PROGRESS: 'En Proceso', COMPLETED: 'Completada', CANCELLED: 'Cancelada' }
      return [
        o.order_number,
        fmtCol(d),
        fmtTime(d),
        mesa,
        mesero,
        statusMap[o.status] || o.status,
        fmtCurrency(Number(o.subtotal || 0)),
        fmtCurrency(Number(o.tax || 0)),
        fmtCurrency(Number(o.discount || 0)),
        fmtCurrency(Number(o.total || 0)),
        payment ? methodLabel(payment.method) : 'N/A'
      ]
    })

    // ==========================================
    // SHEET 3: DETALLE DE PRODUCTOS VENDIDOS
    // ==========================================
    const itemsHeader = ['Nº Orden', 'Producto', 'Categoría', 'Cantidad', 'Precio Unit.', 'Total', 'Notas']
    const itemsRows = items.map((item: any) => {
      const order = orders.find(o => o.id === item.order_id)
      const productData = item.product as any
      const productName = Array.isArray(productData) ? productData[0]?.name : productData?.name || 'Producto'
      const catData = Array.isArray(productData) ? productData[0]?.category : productData?.category
      const categoryName = Array.isArray(catData) ? catData[0]?.name : catData?.name || 'Sin categoría'
      return [
        order?.order_number || 'N/A',
        productName,
        categoryName,
        item.quantity,
        fmtCurrency(Number(item.unit_price || 0)),
        fmtCurrency(Number(item.total_price || item.quantity * Number(item.unit_price || 0))),
        item.notes || ''
      ]
    })

    // ==========================================
    // SHEET 4: PRODUCTOS MÁS VENDIDOS (RANKING)
    // ==========================================
    const productAgg: Record<string, { name: string; category: string; qty: number; revenue: number }> = {}
    items.forEach((item: any) => {
      const pid = item.product_id
      const productData = item.product as any
      const productName = Array.isArray(productData) ? productData[0]?.name : productData?.name || 'Producto'
      const catData = Array.isArray(productData) ? productData[0]?.category : productData?.category
      const categoryName = Array.isArray(catData) ? catData[0]?.name : catData?.name || 'Sin categoría'
      if (!productAgg[pid]) productAgg[pid] = { name: productName, category: categoryName, qty: 0, revenue: 0 }
      productAgg[pid].qty += item.quantity
      productAgg[pid].revenue += Number(item.total_price || item.quantity * Number(item.unit_price || 0))
    })
    const topProductsHeader = ['#', 'Producto', 'Categoría', 'Cantidad Vendida', 'Ingresos', '% del Total']
    const sortedProducts = Object.values(productAgg).sort((a, b) => b.revenue - a.revenue)
    const totalProductRevenue = sortedProducts.reduce((s, p) => s + p.revenue, 0)
    const topProductsRows = sortedProducts.map((p, i) => [
      i + 1,
      p.name,
      p.category,
      p.qty,
      fmtCurrency(p.revenue),
      totalProductRevenue > 0 ? `${((p.revenue / totalProductRevenue) * 100).toFixed(1)}%` : '0%'
    ])

    // ==========================================
    // SHEET 5: VENTAS POR DÍA
    // ==========================================
    const dailyAgg: Record<string, { date: string; orders: number; sales: number; cash: number; card: number; transfer: number }> = {}
    payments.forEach(p => {
      const dateKey = fmtCol(new Date(p.created_at))
      if (!dailyAgg[dateKey]) dailyAgg[dateKey] = { date: dateKey, orders: 0, sales: 0, cash: 0, card: 0, transfer: 0 }
      dailyAgg[dateKey].sales += Number(p.amount || 0)
      dailyAgg[dateKey].orders++
      if (p.method === 'CASH') dailyAgg[dateKey].cash += Number(p.amount || 0)
      else if (p.method === 'CARD') dailyAgg[dateKey].card += Number(p.amount || 0)
      else if (p.method === 'TRANSFER') dailyAgg[dateKey].transfer += Number(p.amount || 0)
    })
    const dailyHeader = ['Fecha', 'Nº Transacciones', 'Efectivo', 'Tarjeta', 'Transferencia', 'Total Ventas']
    const dailyRows = Object.values(dailyAgg).map(d => [
      d.date, d.orders, fmtCurrency(d.cash), fmtCurrency(d.card), fmtCurrency(d.transfer), fmtCurrency(d.sales)
    ])

    // ==========================================
    // SHEET 6: VENTAS POR CATEGORÍA
    // ==========================================
    const catAgg: Record<string, { name: string; qty: number; revenue: number }> = {}
    items.forEach((item: any) => {
      const productData = item.product as any
      const catData = Array.isArray(productData) ? productData[0]?.category : productData?.category
      const categoryName = Array.isArray(catData) ? catData[0]?.name : catData?.name || 'Sin categoría'
      if (!catAgg[categoryName]) catAgg[categoryName] = { name: categoryName, qty: 0, revenue: 0 }
      catAgg[categoryName].qty += item.quantity
      catAgg[categoryName].revenue += Number(item.total_price || item.quantity * Number(item.unit_price || 0))
    })
    const catHeader = ['Categoría', 'Productos Vendidos', 'Ingresos', '% del Total']
    const sortedCats = Object.values(catAgg).sort((a, b) => b.revenue - a.revenue)
    const totalCatRevenue = sortedCats.reduce((s, c) => s + c.revenue, 0)
    const catRows = sortedCats.map(c => [
      c.name,
      c.qty,
      fmtCurrency(c.revenue),
      totalCatRevenue > 0 ? `${((c.revenue / totalCatRevenue) * 100).toFixed(1)}%` : '0%'
    ])

    // ==========================================
    // SHEET 7: VENTAS POR HORA
    // ==========================================
    const hourAgg: Record<number, { orders: number; sales: number }> = {}
    for (let h = 0; h < 24; h++) hourAgg[h] = { orders: 0, sales: 0 }
    payments.forEach(p => {
      const colTime = getColombiaDate(new Date(p.created_at))
      const hour = colTime.getUTCHours()
      hourAgg[hour].orders++
      hourAgg[hour].sales += Number(p.amount || 0)
    })
    const hourHeader = ['Hora', 'Nº Transacciones', 'Total Ventas']
    const hourRows = Object.entries(hourAgg)
      .filter(([, v]) => v.orders > 0)
      .map(([h, v]) => [`${h.padStart(2, '0')}:00 - ${h.padStart(2, '0')}:59`, v.orders, fmtCurrency(v.sales)])

    // ==========================================
    // BUILD WORKBOOK
    // ==========================================
    const wb = XLSX.utils.book_new()

    // Sheet 1 - Resumen
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    ws1['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

    // Sheet 2 - Órdenes
    const ws2 = XLSX.utils.aoa_to_sheet([ordersHeader, ...ordersRows])
    ws2['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Órdenes')

    // Sheet 3 - Items
    const ws3 = XLSX.utils.aoa_to_sheet([itemsHeader, ...itemsRows])
    ws3['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 24 }]
    XLSX.utils.book_append_sheet(wb, ws3, 'Productos Vendidos')

    // Sheet 4 - Top Products
    const ws4 = XLSX.utils.aoa_to_sheet([topProductsHeader, ...topProductsRows])
    ws4['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws4, 'Ranking Productos')

    // Sheet 5 - Ventas Diarias
    const ws5 = XLSX.utils.aoa_to_sheet([dailyHeader, ...dailyRows])
    ws5['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws5, 'Ventas por Día')

    // Sheet 6 - Categorías
    const ws6 = XLSX.utils.aoa_to_sheet([catHeader, ...catRows])
    ws6['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws6, 'Ventas por Categoría')

    // Sheet 7 - Por Hora
    const ws7 = XLSX.utils.aoa_to_sheet([hourHeader, ...hourRows])
    ws7['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws7, 'Ventas por Hora')

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const fileName = `reporte-produccion-${period}-${new Date().toISOString().split('T')[0]}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error) {
    console.error('Error exporting dashboard:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
