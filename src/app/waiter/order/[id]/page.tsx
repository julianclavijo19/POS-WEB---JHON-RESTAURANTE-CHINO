'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button, Card, CardContent, Badge, Modal } from '@/components/ui'
import { formatCurrency, formatTime, getTimeDifference } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Send,
  Receipt,
  Clock,
  ChefHat,
  Check,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface OrderItem {
  id: string
  quantity: number
  notes: string | null
  status: string
  product: {
    id: string
    name: string
    price: number
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  tax: number
  discount: number
  total: number
  notes: string | null
  createdAt: string
  table: { name: string; number: number } | null
  waiter: { name: string } | null
  items: OrderItem[]
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrder()
    const interval = setInterval(fetchOrder, 10000)
    return () => clearInterval(interval)
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      const data = await res.json()
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestBill = async () => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SERVED' }),
      })
      toast.success('Cuenta solicitada')
      fetchOrder()
    } catch (error) {
      toast.error('Error al solicitar cuenta')
    }
  }

  const statusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'success' | 'default' }> = {
    PENDING: { label: 'Pendiente', color: 'warning' },
    IN_KITCHEN: { label: 'En Cocina', color: 'info' },
    READY: { label: 'Lista', color: 'success' },
    SERVED: { label: 'Servida', color: 'default' },
    PAID: { label: 'Pagada', color: 'success' },
  }

  const itemStatusConfig: Record<string, { label: string; color: 'warning' | 'info' | 'success' }> = {
    PENDING: { label: 'Pendiente', color: 'warning' },
    PREPARING: { label: 'Preparando', color: 'info' },
    READY: { label: 'Listo', color: 'success' },
    DELIVERED: { label: 'Entregado', color: 'success' },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-4 text-center">
        <p>Orden no encontrada</p>
        <Button onClick={() => router.push('/waiter')} className="mt-4">
          Volver
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.push('/waiter')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            {order.table?.name || 'Para llevar'} • {formatTime(order.createdAt)}
          </p>
        </div>
        <Badge variant={statusConfig[order.status]?.color}>
          {statusConfig[order.status]?.label}
        </Badge>
      </div>

      {/* Info */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span>{getTimeDifference(order.createdAt)}</span>
            </div>
            {order.waiter && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Mesero:</span>
                <span>{order.waiter.name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h2 className="font-bold mb-4">Productos</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between py-2 border-b last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {item.quantity}x {item.product.name}
                    </span>
                    <Badge variant={itemStatusConfig[item.status]?.color} size="sm">
                      {itemStatusConfig[item.status]?.label}
                    </Badge>
                  </div>
                  {item.notes && (
                    <p className="text-sm text-gray-500 mt-1">📝 {item.notes}</p>
                  )}
                </div>
                <span className="font-medium">
                  {formatCurrency(Number(item.product.price) * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totales */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IVA (16%)</span>
            <span>{formatCurrency(order.tax)}</span>
          </div>
          {Number(order.discount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="space-y-3">
        {order.status !== 'PAID' && (
          <>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push(`/waiter/order/new?tableId=${order.table?.name || ''}&addTo=${order.id}`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar más productos
            </Button>

            {(order.status === 'SERVED' || order.status === 'READY') && (
              <Button variant="primary" className="w-full" onClick={handleRequestBill}>
                <Receipt className="h-4 w-4 mr-2" />
                Solicitar Cuenta
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
