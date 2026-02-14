'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { 
  Search, 
  XCircle, 
  Eye, 
  Clock,
  Calendar,
  RefreshCw,
  ChefHat,
  CheckCircle,
  Ban,
  DollarSign,
  X
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  notes: string | null
  product: {
    id: string
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
  notes: string | null
  created_at: string
  table_id: string | null
  waiter_id: string | null
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

const statusIcons: { [key: string]: React.ReactNode } = {
  PENDING: <Clock className="h-4 w-4" />,
  IN_KITCHEN: <ChefHat className="h-4 w-4" />,
  READY: <CheckCircle className="h-4 w-4" />,
  SERVED: <CheckCircle className="h-4 w-4" />,
  PAID: <DollarSign className="h-4 w-4" />,
  CANCELLED: <Ban className="h-4 w-4" />,
}

export default function AdminOrdersPage() {
  // Crear cliente de Supabase para el navegador
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const loadOrders = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          table:tables(number, area:areas(name)),
          waiter:users!orders_waiter_id_fkey(name),
          items:order_items(
            id,
            quantity,
            notes,
            product:products(id, name, price)
          )
        `)
        .order('created_at', { ascending: false })
      
      // Filtro por fecha
      if (dateFilter) {
        const startDate = new Date(dateFilter)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(dateFilter)
        endDate.setHours(23, 59, 59, 999)
        
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setOrders(data || [])
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter, supabase])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    let filtered = orders

    // Filtro por estado
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(order => 
        order.order_number.toString().includes(search) ||
        order.customer_name?.toLowerCase().includes(search) ||
        order.waiter?.name.toLowerCase().includes(search) ||
        order.table?.number.toString().includes(search)
      )
    }

    setFilteredOrders(filtered)
  }, [orders, statusFilter, searchTerm])

  const cancelOrder = async (orderId: string, tableId: string | null) => {
    if (!supabase) return
    if (!confirm('¿Estás seguro de cancelar este pedido?')) return

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED' })
        .eq('id', orderId)

      if (error) throw error

      // Liberar mesa si existe
      if (tableId) {
        await supabase
          .from('tables')
          .update({ status: 'AVAILABLE' })
          .eq('id', tableId)
      }

      loadOrders()
      setSelectedOrder(null)
      alert('Pedido cancelado exitosamente')
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert('Error al cancelar el pedido')
    }
  }

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

  // Estadisticas rapidas
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    inKitchen: orders.filter(o => o.status === 'IN_KITCHEN').length,
    ready: orders.filter(o => o.status === 'READY').length,
    served: orders.filter(o => o.status === 'SERVED').length,
    paid: orders.filter(o => o.status === 'PAID').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    totalRevenue: orders
      .filter(o => o.status === 'PAID')
      .reduce((acc, o) => acc + (o.total || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestion de Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">Administra y supervisa todos los pedidos</p>
        </div>
        <button
          onClick={loadOrders}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {/* Estadisticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
          <p className="text-xs text-gray-500">Pendientes</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.inKitchen}</p>
          <p className="text-xs text-gray-500">En Cocina</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.ready}</p>
          <p className="text-xs text-gray-500">Listos</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.served}</p>
          <p className="text-xs text-gray-500">Servidos</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.paid}</p>
          <p className="text-xs text-gray-500">Pagados</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-2xl font-semibold text-gray-900">{stats.cancelled}</p>
          <p className="text-xs text-gray-500">Cancelados</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 text-center">
          <p className="text-lg font-semibold text-white">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-xs text-gray-300">Ingresos</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por # pedido, cliente, mesero..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="ALL">Todos los estados</option>
            <option value="PENDING">Pendientes</option>
            <option value="IN_KITCHEN">En Cocina</option>
            <option value="READY">Listos</option>
            <option value="SERVED">Servidos</option>
            <option value="PAID">Pagados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="mt-2 text-gray-500">Cargando pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No se encontraron pedidos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Mesa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Mesero</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                        order.status === 'CANCELLED' ? 'bg-gray-900 text-white' :
                        order.status === 'PAID' ? 'bg-gray-200 text-gray-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {statusIcons[order.status]}
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.type === 'DINE_IN' ? 'Mesa' : 'Para llevar'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.table ? `${order.table.number} (${order.table.area?.name})` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.waiter?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {['PENDING', 'IN_KITCHEN'].includes(order.status) && (
                          <button 
                            onClick={() => cancelOrder(order.id, order.table_id)}
                            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Pedido #{selectedOrder.order_number}
                </h2>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Info general */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded mt-1 ${
                      selectedOrder.status === 'CANCELLED' ? 'bg-gray-900 text-white' :
                      selectedOrder.status === 'PAID' ? 'bg-gray-200 text-gray-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {statusLabels[selectedOrder.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tipo</p>
                    <p className="font-medium text-gray-900">
                      {selectedOrder.type === 'DINE_IN' ? 'En mesa' : 'Para llevar'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedOrder.created_at)}</p>
                  </div>
                  {selectedOrder.table && (
                    <div>
                      <p className="text-sm text-gray-500">Mesa</p>
                      <p className="font-medium text-gray-900">
                        Mesa {selectedOrder.table.number} - {selectedOrder.table.area?.name}
                      </p>
                    </div>
                  )}
                  {selectedOrder.waiter && (
                    <div>
                      <p className="text-sm text-gray-500">Mesero</p>
                      <p className="font-medium text-gray-900">{selectedOrder.waiter.name}</p>
                    </div>
                  )}
                  {selectedOrder.customer_name && (
                    <div>
                      <p className="text-sm text-gray-500">Cliente</p>
                      <p className="font-medium text-gray-900">{selectedOrder.customer_name}</p>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Items del pedido</h3>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="p-3 flex justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.quantity}x {item.product?.name || 'Producto eliminado'}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-500">{item.notes}</p>
                          )}
                        </div>
                        <p className="font-medium text-gray-900">
                          {formatCurrency((item.product?.price || 0) * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-4 bg-gray-900 rounded-lg">
                  <span className="text-lg font-medium text-white">Total</span>
                  <span className="text-2xl font-semibold text-white">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>

                {/* Notas */}
                {selectedOrder.notes && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-500">Notas</p>
                    <p className="text-gray-900">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {['PENDING', 'IN_KITCHEN'].includes(selectedOrder.status) && (
                    <button 
                      onClick={() => cancelOrder(selectedOrder.id, selectedOrder.table_id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar Pedido
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
