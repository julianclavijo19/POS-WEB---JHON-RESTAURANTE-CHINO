'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { 
  Download, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Users,
  ShoppingBag,
  Ban,
  RefreshCw,
  BarChart3,
} from 'lucide-react'

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

interface WaiterPerformance {
  id: string
  name: string
  orders: number
  revenue: number
  averageTicket: number
  cancelledOrders: number
}

interface HourlyData {
  hour: number
  orders: number
  revenue: number
}

interface CancelledOrder {
  id: string
  order_number: number
  total: number
  reason: string
  cancelled_at: string
  waiter_name: string
}

export default function ReportsPage() {
  // Crear cliente de Supabase para el navegador
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'waiters' | 'peak' | 'cancelled'>('overview')
  
  // Statistics
  const [totalSales, setTotalSales] = useState(0)
  const [totalOrders, setTotalOrders] = useState(0)
  const [averageTicket, setAverageTicket] = useState(0)
  const [dailySales, setDailySales] = useState<{ date: string; total: number; orders: number }[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [waiterPerformance, setWaiterPerformance] = useState<WaiterPerformance[]>([])
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [cancelledOrders, setCancelledOrders] = useState<CancelledOrder[]>([])
  
  // Growth comparison
  const [salesGrowth, setSalesGrowth] = useState(0)

  const getDateRange = useCallback(() => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    if (dateRange === 'custom' && startDate && endDate) {
      start = new Date(startDate)
      end = new Date(endDate)
    } else {
      switch (dateRange) {
        case 'today':
          start = today
          end = today
          break
        case 'yesterday':
          start = new Date(today.setDate(today.getDate() - 1))
          end = start
          break
        case 'week':
          start = new Date(today.setDate(today.getDate() - 7))
          end = new Date()
          break
        case 'month':
          start = new Date(today.getFullYear(), today.getMonth(), 1)
          end = new Date()
          break
        case 'year':
          start = new Date(today.getFullYear(), 0, 1)
          end = new Date()
          break
      }
    }

    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  }, [dateRange, startDate, endDate])

  const loadReports = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const { start, end } = getDateRange()

      // Load orders in date range
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          waiter:users!orders_waiter_id_fkey(id, name),
          items:order_items(
            quantity,
            unit_price,
            product:products(name, price)
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError

      const paidOrders = (orders || []).filter(o => o.status === 'PAID')
      const cancelled = (orders || []).filter(o => o.status === 'CANCELLED')

      // Calculate total sales
      const sales = paidOrders.reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)
      setTotalSales(sales)
      setTotalOrders(paidOrders.length)
      setAverageTicket(paidOrders.length > 0 ? sales / paidOrders.length : 0)

      // Calculate daily sales
      const dailyMap: { [key: string]: { total: number; orders: number } } = {}
      paidOrders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        if (!dailyMap[date]) {
          dailyMap[date] = { total: 0, orders: 0 }
        }
        dailyMap[date].total += parseFloat(order.total) || 0
        dailyMap[date].orders += 1
      })
      setDailySales(Object.entries(dailyMap).map(([date, data]) => ({
        date,
        total: data.total,
        orders: data.orders
      })))

      // Calculate top products
      const productMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {}
      paidOrders.forEach(order => {
        (order.items || []).forEach((item: any) => {
          const name = item.product?.name || 'Desconocido'
          if (!productMap[name]) {
            productMap[name] = { name, quantity: 0, revenue: 0 }
          }
          productMap[name].quantity += item.quantity
          productMap[name].revenue += item.quantity * (parseFloat(item.unit_price) || 0)
        })
      })
      setTopProducts(
        Object.values(productMap)
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 15)
      )

      // Calculate waiter performance
      const waiterMap: { [key: string]: WaiterPerformance } = {}
      paidOrders.forEach(order => {
        const waiterId = order.waiter?.id || 'unknown'
        const waiterName = order.waiter?.name || 'Sin asignar'
        if (!waiterMap[waiterId]) {
          waiterMap[waiterId] = {
            id: waiterId,
            name: waiterName,
            orders: 0,
            revenue: 0,
            averageTicket: 0,
            cancelledOrders: 0
          }
        }
        waiterMap[waiterId].orders += 1
        waiterMap[waiterId].revenue += parseFloat(order.total) || 0
      })
      
      // Add cancelled orders to waiter stats
      cancelled.forEach(order => {
        const waiterId = order.waiter?.id || 'unknown'
        const waiterName = order.waiter?.name || 'Sin asignar'
        if (!waiterMap[waiterId]) {
          waiterMap[waiterId] = {
            id: waiterId,
            name: waiterName,
            orders: 0,
            revenue: 0,
            averageTicket: 0,
            cancelledOrders: 0
          }
        }
        waiterMap[waiterId].cancelledOrders += 1
      })

      Object.values(waiterMap).forEach(w => {
        w.averageTicket = w.orders > 0 ? w.revenue / w.orders : 0
      })
      setWaiterPerformance(Object.values(waiterMap).sort((a, b) => b.revenue - a.revenue))

      // Calculate hourly data
      const hourlyMap: { [key: number]: { orders: number; revenue: number } } = {}
      for (let i = 0; i < 24; i++) {
        hourlyMap[i] = { orders: 0, revenue: 0 }
      }
      paidOrders.forEach(order => {
        const hour = new Date(order.created_at).getHours()
        hourlyMap[hour].orders += 1
        hourlyMap[hour].revenue += parseFloat(order.total) || 0
      })
      setHourlyData(Object.entries(hourlyMap).map(([hour, data]) => ({
        hour: parseInt(hour),
        orders: data.orders,
        revenue: data.revenue
      })))

      // Cancelled orders
      setCancelledOrders(cancelled.map(o => ({
        id: o.id,
        order_number: o.order_number,
        total: parseFloat(o.total) || 0,
        reason: o.notes || 'Sin especificar',
        cancelled_at: o.updated_at,
        waiter_name: o.waiter?.name || 'Sin asignar'
      })))

      // Calculate previous period for comparison
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const prevStart = new Date(start)
      prevStart.setDate(prevStart.getDate() - periodDays)
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)

      const { data: prevOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('status', 'PAID')
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString())

      const prevSales = (prevOrders || []).reduce((acc, o) => acc + (parseFloat(o.total) || 0), 0)
      setSalesGrowth(prevSales > 0 ? ((sales - prevSales) / prevSales) * 100 : 0)

    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }, [getDateRange, supabase])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const handleExport = () => {
    const { start, end } = getDateRange()
    const headers = ['Fecha', 'Total Ventas', 'Órdenes']
    const rows = dailySales.map(d => [d.date, d.total, d.orders])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-ventas-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.csv`
    a.click()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMaxHourlyOrders = () => Math.max(...hourlyData.map(h => h.orders), 1)
  const peakHour = hourlyData.reduce((max, h) => h.orders > max.orders ? h : max, { hour: 0, orders: 0, revenue: 0 })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reportes y Estadísticas</h1>
          <p className="text-sm text-gray-500 mt-1">Análisis detallado del negocio</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadReports}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Periodo</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Última Semana</option>
              <option value="month">Este Mes</option>
              <option value="year">Este Año</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {dateRange === 'custom' && (
            <>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">Ventas Totales</p>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {formatCurrency(totalSales)}
          </p>
          <div className={`flex items-center gap-1 mt-2 text-sm ${salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {salesGrowth >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}% vs periodo anterior</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">Total Órdenes</p>
            <ShoppingBag className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {totalOrders}
          </p>
          <p className="text-sm text-gray-500 mt-2">Órdenes completadas</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">Ticket Promedio</p>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {formatCurrency(averageTicket)}
          </p>
          <p className="text-sm text-gray-500 mt-2">Por orden</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">Hora Pico</p>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {peakHour.hour}:00
          </p>
          <p className="text-sm text-gray-500 mt-2">{peakHour.orders} órdenes en promedio</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Resumen', icon: BarChart3 },
            { id: 'products', label: 'Productos', icon: ShoppingBag },
            { id: 'waiters', label: 'Meseros', icon: Users },
            { id: 'peak', label: 'Horas Pico', icon: Clock },
            { id: 'cancelled', label: `Cancelados (${cancelledOrders.length})`, icon: Ban },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Daily Sales Chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Ventas por Día</h2>
            {dailySales.length > 0 ? (
              <div className="space-y-2">
                {dailySales.slice(-14).map(day => (
                  <div key={day.date} className="flex items-center gap-4">
                    <span className="text-sm text-gray-600 w-24">
                      {new Date(day.date + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-gray-900 rounded"
                        style={{ width: `${Math.min(100, (day.total / Math.max(...dailySales.map(d => d.total))) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-32 text-right">
                      {formatCurrency(day.total)}
                    </span>
                    <span className="text-sm text-gray-500 w-16 text-right">
                      {day.orders} órd.
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No hay datos para mostrar</p>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Top 5 Products */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Top 5 Productos</h3>
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded ${
                        index === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-sm text-gray-900">{product.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{product.quantity} uds</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Waiters */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Top 5 Meseros</h3>
              <div className="space-y-3">
                {waiterPerformance.slice(0, 5).map((waiter, index) => (
                  <div key={waiter.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded ${
                        index === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {waiter.name.charAt(0)}
                      </span>
                      <span className="text-sm text-gray-900">{waiter.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(waiter.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Platillos Más Vendidos</h2>
            <p className="text-sm text-gray-500">Ranking de productos por cantidad vendida</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ingresos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% del Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topProducts.map((product, index) => (
                <tr key={product.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded ${
                      index < 3 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-right text-gray-900">{product.quantity} uds</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(product.revenue)}</td>
                  <td className="px-6 py-4 text-right text-gray-600">
                    {totalSales > 0 ? ((product.revenue / totalSales) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {topProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay datos de productos
            </div>
          )}
        </div>
      )}

      {/* Waiters Tab */}
      {activeTab === 'waiters' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Desempeño por Mesero</h2>
            <p className="text-sm text-gray-500">Métricas de rendimiento individual</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesero</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Órdenes</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ventas</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Prom.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cancelados</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% Cancelación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {waiterPerformance.map((waiter, index) => {
                const totalWaiterOrders = waiter.orders + waiter.cancelledOrders
                const cancellationRate = totalWaiterOrders > 0 
                  ? (waiter.cancelledOrders / totalWaiterOrders) * 100 
                  : 0
                return (
                  <tr key={waiter.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded-full ${
                          index === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {waiter.name.charAt(0)}
                        </span>
                        <span className="font-medium text-gray-900">{waiter.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">{waiter.orders}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">{formatCurrency(waiter.revenue)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(waiter.averageTicket)}</td>
                    <td className="px-6 py-4 text-right text-gray-600">{waiter.cancelledOrders}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`${cancellationRate > 10 ? 'text-red-600' : 'text-gray-600'}`}>
                        {cancellationRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {waiterPerformance.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay datos de meseros
            </div>
          )}
        </div>
      )}

      {/* Peak Hours Tab */}
      {activeTab === 'peak' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Horas Pico de Servicio</h2>
            <p className="text-sm text-gray-500 mb-6">Distribución de órdenes por hora del día</p>
            
            <div className="space-y-2">
              {hourlyData.map(hour => (
                <div key={hour.hour} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-16">
                    {hour.hour.toString().padStart(2, '0')}:00
                  </span>
                  <div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden relative">
                    <div
                      className={`h-full rounded transition-all ${
                        hour.hour === peakHour.hour ? 'bg-gray-900' : 'bg-gray-400'
                      }`}
                      style={{ width: `${(hour.orders / getMaxHourlyOrders()) * 100}%` }}
                    />
                    {hour.orders > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700">
                        {hour.orders} órdenes
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-24 text-right">
                    {formatCurrency(hour.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Analysis */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Hora de Mayor Tráfico</h3>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{peakHour.hour}:00 - {peakHour.hour + 1}:00</p>
              <p className="text-sm text-gray-500 mt-1">{peakHour.orders} órdenes</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Ingresos en Hora Pico</h3>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(peakHour.revenue)}</p>
              <p className="text-sm text-gray-500 mt-1">{totalSales > 0 ? ((peakHour.revenue / totalSales) * 100).toFixed(1) : 0}% del total</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-500">Promedio por Hora</h3>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {(totalOrders / 24).toFixed(1)} órdenes
              </p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(totalSales / 24)} en ventas</p>
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Tab */}
      {activeTab === 'cancelled' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Comandas Canceladas</h2>
            <p className="text-sm text-gray-500">Registro de órdenes canceladas en el periodo</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"># Orden</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mesero</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cancelledOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">#{order.order_number}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(order.cancelled_at)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.waiter_name}</td>
                  <td className="px-6 py-4 text-right font-medium text-red-600">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.reason}</td>
                </tr>
              ))}
            </tbody>
            {cancelledOrders.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-900">
                    Total perdido:
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-red-600">
                    {formatCurrency(cancelledOrders.reduce((acc, o) => acc + o.total, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
          {cancelledOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay órdenes canceladas en este periodo
            </div>
          )}
        </div>
      )}
    </div>
  )
}
