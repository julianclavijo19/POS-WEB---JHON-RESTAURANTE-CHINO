'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Clock, User, MapPin, ChefHat, Check, Play, RefreshCw, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface OrderItem {
  id: string
  quantity: number
  notes?: string
  status: string
  product: {
    name: string
  } | null
}

interface Order {
  id: string
  orderNumber: number
  status: string
  notes?: string
  createdAt: string
  tableName: string
  waiterName: string
  items: OrderItem[]
}

export default function CocinaPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing'>('all')

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/cocina/pedidos')
      if (res.ok) {
        const data = await res.json()
        // Transformar datos
        const transformed: Order[] = data.map((order: any) => ({
          id: order.id,
          orderNumber: order.order_number,
          status: order.status,
          notes: order.notes,
          createdAt: order.created_at,
          tableName: order.table?.name || 'Para llevar',
          waiterName: order.waiter?.name || 'Sin asignar',
          items: (order.items || []).map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
            notes: item.notes,
            status: item.status || 'PENDING',
            product: item.product
          }))
        }))
        setOrders(transformed)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  const getElapsedTime = (createdAt: string) => {
    const elapsed = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
    return elapsed
  }

  const handleStartItem = async (orderId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PREPARING' })
      })
      if (res.ok) {
        toast.success('Preparando...')
        fetchOrders()
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleCompleteItem = async (orderId: string, itemId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY' })
      })
      if (res.ok) {
        toast.success('¡Listo!')
        fetchOrders()
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleCompleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY' })
      })
      if (res.ok) {
        toast.success('Pedido listo para servir')
        fetchOrders()
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
    if (filter === 'pending') return order.status === 'PENDING'
    if (filter === 'preparing') return order.status === 'IN_KITCHEN'
    return true
  })

  // Ordenar por tiempo (más antiguo primero)
  const sortedOrders = [...filteredOrders].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Estadísticas
  const pendingCount = orders.filter(o => o.status === 'PENDING').length
  const preparingCount = orders.filter(o => o.status === 'IN_KITCHEN').length
  const totalItems = orders.reduce((sum, o) => sum + o.items.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cocina</h1>
          <p className="text-gray-500 text-sm">
            {pendingCount} nuevos • {preparingCount} en preparación • {totalItems} items total
          </p>
        </div>
        <button 
          onClick={fetchOrders}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'
          }`}
        >
          Todos ({orders.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            filter === 'pending' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'
          }`}
        >
          Nuevos ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('preparing')}
          className={`px-4 py-2 rounded-lg whitespace-nowrap ${
            filter === 'preparing' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200'
          }`}
        >
          En preparación ({preparingCount})
        </button>
      </div>

      {/* Lista de pedidos */}
      {sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Sin pedidos pendientes</h2>
          <p className="text-gray-500">Los nuevos pedidos aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedOrders.map(order => {
            const elapsed = getElapsedTime(order.createdAt)
            const isDelayed = elapsed > 15
            const allReady = order.items.every(i => i.status === 'READY')
            
            return (
              <div 
                key={order.id} 
                className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
                  isDelayed ? 'border-red-400' : 
                  order.status === 'PENDING' ? 'border-yellow-400' : 'border-gray-200'
                }`}
              >
                {/* Encabezado */}
                <div className={`px-4 py-3 ${
                  isDelayed ? 'bg-red-500 text-white' :
                  order.status === 'PENDING' ? 'bg-yellow-400' : 'bg-gray-100'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">#{order.orderNumber}</span>
                    <div className={`flex items-center gap-1 font-mono ${isDelayed ? 'animate-pulse' : ''}`}>
                      <Clock className="h-4 w-4" />
                      {elapsed} min
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm opacity-80">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {order.tableName}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {order.waiterName}
                    </span>
                  </div>
                </div>

                {/* Notas del pedido */}
                {order.notes && (
                  <div className="px-4 py-2 bg-blue-50 text-blue-800 text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{order.notes}</span>
                  </div>
                )}

                {/* Items */}
                <div className="p-4 space-y-3">
                  {order.items.map(item => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-lg border ${
                        item.status === 'READY' ? 'bg-green-50 border-green-200' :
                        item.status === 'PREPARING' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{item.quantity}x</span>
                            <span className="font-medium">{item.product?.name || 'Producto'}</span>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-orange-600 font-medium mt-1">
                              ⚠️ {item.notes}
                            </p>
                          )}
                        </div>
                        
                        {/* Acciones del item */}
                        <div className="flex gap-1">
                          {item.status === 'PENDING' && (
                            <button
                              onClick={() => handleStartItem(order.id, item.id)}
                              className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                              title="Comenzar"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          {item.status === 'PREPARING' && (
                            <button
                              onClick={() => handleCompleteItem(order.id, item.id)}
                              className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                              title="Listo"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          {item.status === 'READY' && (
                            <span className="p-2 bg-green-100 text-green-600 rounded-lg">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer - Marcar todo listo */}
                {allReady && order.status !== 'READY' && (
                  <div className="px-4 py-3 bg-green-50 border-t">
                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      ✓ Pedido completo - Notificar mesero
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
