'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Search, Calendar, RefreshCw, ClipboardList, 
  Clock, User, MapPin, Eye, ChefHat, CheckCircle2
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  status: string
  product: { id: string; name: string } | null
}

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  createdAt: string
  table?: { id: string; name: string } | null
  waiter?: { id: string; name: string } | null
  items: OrderItem[]
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders?date=${dateFilter}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  // Estados del flujo: Mesero crea orden -> Va a cocina -> Listo -> Servido -> Pagado
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-gray-200 text-gray-700',
      'IN_KITCHEN': 'bg-gray-700 text-white',
      'READY': 'bg-gray-900 text-white',
      'SERVED': 'bg-gray-600 text-white',
      'DELIVERED': 'bg-gray-500 text-white',
      'PAID': 'bg-gray-100 text-gray-600 border border-gray-300',
      'CANCELLED': 'bg-gray-300 text-gray-500 line-through'
    }
    const labels: Record<string, string> = {
      'PENDING': 'Pendiente',
      'IN_KITCHEN': 'En cocina',
      'READY': 'Listo para servir',
      'SERVED': 'Servido',
      'DELIVERED': 'Entregado',
      'PAID': 'Pagado',
      'CANCELLED': 'Cancelado'
    }
    return (
      <span className={`px-2.5 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IN_KITCHEN': return <ChefHat className="h-4 w-4" />
      case 'READY': return <CheckCircle2 className="h-4 w-4" />
      default: return <ClipboardList className="h-4 w-4" />
    }
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.orderNumber?.toString().includes(searchQuery) ||
      o.table?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.waiter?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    inKitchen: orders.filter(o => o.status === 'IN_KITCHEN').length,
    ready: orders.filter(o => o.status === 'READY').length,
    served: orders.filter(o => o.status === 'SERVED' || o.status === 'DELIVERED').length,
    paid: orders.filter(o => o.status === 'PAID').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pedidos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {stats.total} pedidos del día
          </p>
        </div>
        <button 
          onClick={fetchOrders}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Stats con colores profesionales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Pendientes</p>
            <p className="text-xl font-semibold text-gray-700">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">En cocina</p>
            <p className="text-xl font-semibold text-gray-900">{stats.inKitchen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Listos</p>
            <p className="text-xl font-semibold text-gray-900">{stats.ready}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Servidos</p>
            <p className="text-xl font-semibold text-gray-700">{stats.served}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500">Pagados</p>
            <p className="text-xl font-semibold text-gray-500">{stats.paid}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por orden, mesa o mesero..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="IN_KITCHEN">En cocina</option>
          <option value="READY">Listo</option>
          <option value="SERVED">Servido</option>
          <option value="PAID">Pagado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium">No hay pedidos</p>
            <p className="text-gray-500 text-sm mt-1">No se encontraron pedidos para esta fecha</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      order.status === 'IN_KITCHEN' ? 'bg-gray-900 text-white' :
                      order.status === 'READY' ? 'bg-gray-700 text-white' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          Orden #{order.orderNumber}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        {order.table && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {order.table.name}
                          </span>
                        )}
                        {order.waiter && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {order.waiter.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleTimeString('es-CO', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {order.items?.length || 0} productos
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </span>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Ver detalle"
                    >
                      <Eye className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de detalle */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-auto">
            <div className="p-4 border-b sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Orden #{selectedOrder.orderNumber}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedOrder.status)}
                    <span className="text-sm text-gray-500">
                      {selectedOrder.table?.name || 'Para llevar'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-4 text-sm">
                {selectedOrder.waiter && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{selectedOrder.waiter.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{new Date(selectedOrder.createdAt).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Productos</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <span className="font-medium">{item.quantity}x</span>
                        <span className="ml-2">{item.product?.name || 'Producto'}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
