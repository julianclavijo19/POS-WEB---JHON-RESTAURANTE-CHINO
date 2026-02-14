'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Clock, CheckCircle, Eye, DollarSign, ArrowRight, Coins
} from 'lucide-react'
import Link from 'next/link'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  notes?: string
  status: string
  product: { id: string; name: string }
}

interface Order {
  id: string
  orderNumber: number
  status: string
  total: number
  tip: number
  type: string
  createdAt: string
  table: { id: string; name: string } | null
  items: OrderItem[]
}

export default function MisComandasPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [totalTips, setTotalTips] = useState(0)

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrders = async () => {
    try {
      // Obtener todas las comandas del mesero del día
      const res = await fetch('/api/orders?myOrders=true&period=today')
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
        // Calcular total de propinas
        const tips = data.reduce((sum: number, order: Order) => sum + (order.tip || 0), 0)
        setTotalTips(tips)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      IN_KITCHEN: 'En cocina',
      READY: 'Listo',
      DELIVERED: 'Entregado',
      PAID: 'Pagado',
      CANCELLED: 'Cancelado'
    }
    return map[status?.toUpperCase()] || status
  }

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      IN_KITCHEN: 'bg-blue-100 text-blue-700',
      READY: 'bg-green-100 text-green-700',
      DELIVERED: 'bg-purple-100 text-purple-700',
      PAID: 'bg-gray-100 text-gray-700',
      CANCELLED: 'bg-red-100 text-red-700'
    }
    return map[status?.toUpperCase()] || 'bg-gray-100 text-gray-700'
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
          <h1 className="text-2xl font-semibold text-gray-900">Mis Comandas</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} comandas hoy</p>
        </div>
        
        {totalTips > 0 && (
          <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
            <Coins className="h-5 w-5 text-green-600" />
            <div>
              <span className="text-xs text-green-600">Propinas</span>
              <span className="block font-bold text-green-700">{formatCurrency(totalTips)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Orders */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No tienes comandas hoy</p>
            <Link href="/mesero">
              <Button variant="outline" className="mt-4">Ver Mesas</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Order number and table */}
                    <div>
                      <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">
                        {order.table?.name || (order.type === 'DELIVERY' ? 'Domicilio' : 'Para Llevar')}
                      </p>
                    </div>
                    
                    {/* Status */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    
                    {/* Time */}
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Tip */}
                    {order.tip > 0 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <Coins className="h-4 w-4" />
                        <span className="font-medium">{formatCurrency(order.tip)}</span>
                      </div>
                    )}
                    
                    {/* Total */}
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-gray-400">{order.items.length} items</p>
                    </div>
                    
                    {/* View button */}
                    <Link href={`/mesero/comanda/${order.id}`}>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Summary */}
      {orders.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total del día</span>
              <span className="font-bold text-xl text-gray-900">
                {formatCurrency(orders.reduce((sum, o) => sum + o.total, 0))}
              </span>
            </div>
            {totalTips > 0 && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                <span className="text-green-600 flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  Total propinas
                </span>
                <span className="font-bold text-green-600">{formatCurrency(totalTips)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
