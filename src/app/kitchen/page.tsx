'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, Badge, Button } from '@/components/ui'
import { formatTime, getTimeDifference, cn } from '@/lib/utils'
import { Check, Clock, RefreshCw, ChefHat, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery'
import { ConnectionStatusBadge } from '@/components/ui/ConnectionStatus'

interface OrderItem {
  id: string
  quantity: number
  notes: string | null
  status: string
  product: {
    id: string
    name: string
    prepTime: number
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  table: { name: string; number: number } | null
  waiter: { name: string } | null
  items: OrderItem[]
}

export default function KitchenPage() {
  const fetchOrdersFn = useCallback(async (): Promise<Order[]> => {
    try {
      const res = await fetch('/api/kitchen')
      const data = await res.json()
      return data
    } catch (error) {
      console.error('Error fetching orders:', error)
      return []
    }
  }, [])

  const { data, loading, status, refetch } = useRealtimeQuery<Order[]>({
    channel: 'kitchen-alt',
    tables: ['orders', 'order_items'],
    fetchFn: fetchOrdersFn,
    fallbackInterval: 0,
  })

  const orders = data ?? []

  const handleMarkItemReady = async (orderId: string, itemId: string) => {
    try {
      await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'READY' }),
      })
      toast.success('Item marcado como listo')
      refetch()
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleMarkOrderReady = async (orderId: string) => {
    try {
      // Marcar todos los items como listos
      const order = orders.find((o) => o.id === orderId)
      if (order) {
        for (const item of order.items) {
          if (item.status === 'PREPARING') {
            await fetch(`/api/orders/${orderId}/items/${item.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'READY' }),
            })
          }
        }
      }
      toast.success('¡Orden lista para servir!')
      refetch()
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const getTimeColor = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000)

    if (diffMins < 10) return 'text-green-400'
    if (diffMins < 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="p-4 min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-white" />
          <div>
            <h1 className="text-2xl font-bold text-white">Cocina</h1>
            <p className="text-gray-400">{orders.length} órdenes activas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatusBadge status={status} onRefresh={refetch} />
          <Button variant="ghost" onClick={() => refetch()} className="text-white">
            <RefreshCw className="h-5 w-5 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Grid de órdenes */}
      {orders.length === 0 ? (
        <div className="text-center py-20">
          <ChefHat className="h-20 w-20 mx-auto mb-4 text-gray-600" />
          <p className="text-xl text-gray-400">No hay órdenes pendientes</p>
          <p className="text-gray-500 mt-2">Las nuevas órdenes aparecerán aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {orders.map((order) => {
            const allReady = order.items.every((item) => item.status === 'READY')
            const timeColor = getTimeColor(order.createdAt)

            return (
              <Card
                key={order.id}
                className={cn(
                  'bg-gray-800 border-gray-700',
                  allReady && 'border-green-500 border-2 animate-pulse-border'
                )}
              >
                <CardContent className="p-0">
                  {/* Header de la orden */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white text-lg">
                        {order.orderNumber}
                      </span>
                      <Badge
                        variant={order.status === 'READY' ? 'success' : 'warning'}
                      >
                        {order.status === 'READY' ? 'Lista' : 'Preparando'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {order.table?.name || 'Para llevar'}
                      </span>
                      <div className={cn('flex items-center gap-1', timeColor)}>
                        <Clock className="h-4 w-4" />
                        <span>{getTimeDifference(order.createdAt)}</span>
                      </div>
                    </div>
                    {order.waiter && (
                      <p className="text-xs text-gray-500 mt-1">
                        Mesero: {order.waiter.name}
                      </p>
                    )}
                  </div>

                  {/* Items */}
                  <div className="p-4 space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-start justify-between p-2 rounded-lg',
                          item.status === 'READY'
                            ? 'bg-green-900/30'
                            : 'bg-gray-700/50'
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'font-bold text-lg',
                                item.status === 'READY'
                                  ? 'text-green-400'
                                  : 'text-white'
                              )}
                            >
                              {item.quantity}x
                            </span>
                            <span
                              className={cn(
                                'font-medium',
                                item.status === 'READY'
                                  ? 'text-green-400 line-through'
                                  : 'text-white'
                              )}
                            >
                              {item.product.name}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-yellow-400 text-sm mt-1 pl-8">
                              📝 {item.notes}
                            </p>
                          )}
                        </div>
                        {item.status !== 'READY' && (
                          <button
                            onClick={() => handleMarkItemReady(order.id, item.id)}
                            className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          >
                            <Check className="h-5 w-5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Footer - Botón de orden lista */}
                  <div className="p-4 border-t border-gray-700">
                    <Button
                      variant={allReady ? 'success' : 'primary'}
                      className="w-full"
                      onClick={() => handleMarkOrderReady(order.id)}
                    >
                      {allReady ? (
                        <>
                          <Bell className="h-5 w-5 mr-2" />
                          ¡Llamar Mesero!
                        </>
                      ) : (
                        <>
                          <Check className="h-5 w-5 mr-2" />
                          Marcar Todo Listo
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
