'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { 
  Calendar,
  Download,
  RefreshCw,
  Clock,
  ChefHat,
  CheckCircle,
  Ban,
  DollarSign,
  TrendingUp,
  ArrowRight
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  product: {
    name: string
    price: number
  } | null
}

interface Order {
  id: string
  order_number: number
  status: string
  type: string
  customer_name: string | null
  total: number
  created_at: string
  table: {
    number: number
    area: { name: string } | null
  } | null
  waiter: {
    name: string
  } | null
  items: OrderItem[]
}

const statusLabels: { [key: string]: string } = {
  PENDING: 'Pendiente',
  IN_KITCHEN: 'En Cocina',
  READY: 'Listo',
  SERVED: 'Servido',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
}

export default function AdminHistoryPage() {
  // Crear cliente de Supabase para el navegador
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // Establecer fecha de hoy por defecto
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }, [])

  const loadOrders = useCallback(async () => {
    if (!startDate || !endDate || !supabase) return
    
    try {
      setLoading(true)
      
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)

      let query = supabase
        .from('orders')
        .select(`
          *,
          table:tables(number, area:areas(name)),
          waiter:users!orders_waiter_id_fkey(name),
          items:order_items(
            id,
            quantity,
            product:products(name, price)
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })

      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, statusFilter, supabase])

  useEffect(() => {
    if (startDate && endDate) {
      loadOrders()
    }
  }, [loadOrders, startDate, endDate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Calcular estadísticas
  const stats = {
    totalOrders: orders.length,
    paidOrders: orders.filter(o => o.status === 'PAID').length,
    cancelledOrders: orders.filter(o => o.status === 'CANCELLED').length,
    totalRevenue: orders
      .filter(o => o.status === 'PAID')
      .reduce((acc, o) => acc + (o.total || 0), 0),
    averageTicket: orders.filter(o => o.status === 'PAID').length > 0
      ? orders.filter(o => o.status === 'PAID').reduce((acc, o) => acc + (o.total || 0), 0) / 
        orders.filter(o => o.status === 'PAID').length
      : 0,
    dineIn: orders.filter(o => o.type === 'DINE_IN').length,
    takeout: orders.filter(o => o.type === 'TAKEOUT').length,
  }

  // Productos más vendidos
  const productSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {}
  orders.filter(o => o.status === 'PAID').forEach(order => {
    order.items.forEach(item => {
      if (item.product) {
        const key = item.product.name
        if (!productSales[key]) {
          productSales[key] = { name: item.product.name, quantity: 0, revenue: 0 }
        }
        productSales[key].quantity += item.quantity
        productSales[key].revenue += item.product.price * item.quantity
      }
    })
  })
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  // Ventas por mesero
  const waiterSales: { [key: string]: { name: string, orders: number, revenue: number } } = {}
  orders.filter(o => o.status === 'PAID').forEach(order => {
    const waiterName = order.waiter?.name || 'Sin asignar'
    if (!waiterSales[waiterName]) {
      waiterSales[waiterName] = { name: waiterName, orders: 0, revenue: 0 }
    }
    waiterSales[waiterName].orders += 1
    waiterSales[waiterName].revenue += order.total || 0
  })
  const waiterStats = Object.values(waiterSales).sort((a, b) => b.revenue - a.revenue)

  const exportToCSV = () => {
    const headers = ['# Pedido', 'Fecha', 'Estado', 'Tipo', 'Mesa', 'Mesero', 'Cliente', 'Total']
    const rows = orders.map(order => [
      order.order_number,
      formatDate(order.created_at),
      statusLabels[order.status],
      order.type === 'DINE_IN' ? 'En mesa' : 'Para llevar',
      order.table ? `Mesa ${order.table.number}` : '-',
      order.waiter?.name || '-',
      order.customer_name || '-',
      order.total
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historial-pedidos-${startDate}-${endDate}.csv`
    a.click()
  }

  // Quick date filters
  const setToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  const setYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const date = yesterday.toISOString().split('T')[0]
    setStartDate(date)
    setEndDate(date)
  }

  const setThisWeek = () => {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    setStartDate(startOfWeek.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  const setThisMonth = () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setStartDate(startOfMonth.toISOString().split('T')[0])
    setEndDate(today.toISOString().split('T')[0])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historial de Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">Consulta y analiza el historial de ventas</p>
        </div>
        <button
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={setToday} className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Hoy</button>
            <button onClick={setYesterday} className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Ayer</button>
            <button onClick={setThisWeek} className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Esta Semana</button>
            <button onClick={setThisMonth} className="px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Este Mes</button>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="ALL">Todos</option>
            <option value="PAID">Pagados</option>
            <option value="CANCELLED">Cancelados</option>
            <option value="SERVED">Servidos</option>
          </select>

          <button
            onClick={loadOrders}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadisticas Generales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-gray-900">{stats.totalOrders}</p>
          <p className="text-sm text-gray-500">Total Pedidos</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-gray-900">{stats.paidOrders}</p>
          <p className="text-sm text-gray-500">Pagados</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-gray-900">{stats.cancelledOrders}</p>
          <p className="text-sm text-gray-500">Cancelados</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-gray-900">{stats.dineIn}</p>
          <p className="text-sm text-gray-500">En Mesa</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-3xl font-semibold text-gray-900">{stats.takeout}</p>
          <p className="text-sm text-gray-500">Para Llevar</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <p className="text-xl font-semibold text-white">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-sm text-gray-300">Ingresos</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.averageTicket)}</p>
          <p className="text-sm text-gray-500">Ticket Promedio</p>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Productos */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-500" />
            Productos Mas Vendidos
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-900">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{product.quantity} uds</p>
                    <p className="text-sm text-gray-500">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ventas por Mesero */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-500" />
            Ventas por Mesero
          </h3>
          {waiterStats.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {waiterStats.map((waiter, index) => (
                <div key={waiter.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index === 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {waiter.name.charAt(0)}
                    </span>
                    <span className="font-medium text-gray-900">{waiter.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(waiter.revenue)}</p>
                    <p className="text-sm text-gray-500">{waiter.orders} pedidos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detalle de Pedidos</h3>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Cargando...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay pedidos en el rango seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Mesa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Mesero</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Items</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.order_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        order.status === 'CANCELLED' ? 'bg-gray-900 text-white' :
                        order.status === 'PAID' ? 'bg-gray-200 text-gray-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.type === 'DINE_IN' ? 'Mesa' : 'Llevar'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.table ? `${order.table.number} (${order.table.area?.name})` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.waiter?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-right font-semibold text-gray-900">
                    Total ({orders.filter(o => o.status === 'PAID').length} pagados):
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {formatCurrency(stats.totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
