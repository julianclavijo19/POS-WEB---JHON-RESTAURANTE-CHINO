'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Calendar, Clock, DollarSign, Receipt, Search, Filter, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  orderNumber: number
  status: string
  total: number
  subtotal: number
  tip?: number
  paymentMethod?: string
  createdAt: string
  paidAt?: string
  table: { id: string; name: string } | null
  items: { id: string; quantity: number; product: { name: string } | null }[]
}

export default function HistorialPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, count: 0, tips: 0 })

  useEffect(() => {
    fetchOrders()
  }, [dateFilter, statusFilter])

  const fetchOrders = async () => {
    setLoading(true)
    setError(null)
    try {
      let url = `/api/orders?myOrders=true&period=${dateFilter}`
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`
      }
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
        
        const paidOrders = data.filter((o: Order) => o.status === 'PAID' || o.status === 'paid')
        const total = paidOrders.reduce((sum: number, o: Order) => sum + o.total, 0)
        const tips = paidOrders.reduce((sum: number, o: Order) => sum + (o.tip || 0), 0)
        setStats({ total, count: paidOrders.length, tips })
      } else {
        setError('Error al cargar órdenes')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || ''
    const labels: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
      in_kitchen: { label: 'En cocina', color: 'bg-blue-100 text-blue-800' },
      ready: { label: 'Listo', color: 'bg-green-100 text-green-800' },
      served: { label: 'Servido', color: 'bg-gray-100 text-gray-800' },
      paid: { label: 'Pagada', color: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
    }
    return labels[normalizedStatus] || { label: status, color: 'bg-gray-100 text-gray-800' }
  }

  const filteredOrders = orders.filter(order => {
    if (!searchQuery) return true
    const orderNum = order.orderNumber?.toString() || ''
    const tableName = order.table?.name?.toLowerCase() || ''
    return orderNum.includes(searchQuery) ||
           tableName.includes(searchQuery.toLowerCase())
  })

  const formatPaymentMethod = (method?: string) => {
    const map: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia'
    }
    return map[method || ''] || method
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
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Historial</h1>
        <p className="text-gray-500 text-sm mt-1">Comandas completadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Receipt className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Comandas</p>
                <p className="text-xl font-semibold text-gray-900">{stats.count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ventas</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Propinas</p>
                <p className="text-xl font-semibold text-gray-900">{formatCurrency(stats.tips)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número o mesa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">Todos los estados</option>
          <option value="paid">Pagadas</option>
          <option value="pending">Pendientes</option>
          <option value="in_kitchen">En cocina</option>
          <option value="cancelled">Canceladas</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="all">Todo</option>
        </select>
      </div>

      {/* Error message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
              <button onClick={fetchOrders} className="ml-auto text-sm underline">Reintentar</button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders list */}
      {!error && filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No hay comandas en este período</p>
          </CardContent>
        </Card>
      ) : !error && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredOrders.map(order => {
                const statusInfo = getStatusLabel(order.status)
                return (
                <Link 
                  key={order.id} 
                  href={`/mesero/comanda/${order.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[80px]">
                      <p className="text-lg font-semibold text-gray-900">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">{order.table?.name || 'Para llevar'}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {(order.items || []).slice(0, 3).map(i => `${i.quantity}x ${i.product?.name || 'Producto'}`).join(', ')}
                        {(order.items || []).length > 3 && ` +${order.items.length - 3} más`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.paidAt || order.createdAt).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {order.paymentMethod && (
                          <>
                            <span>•</span>
                            <span>{formatPaymentMethod(order.paymentMethod)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(order.total)}</p>
                    {order.tip && order.tip > 0 && (
                      <p className="text-xs text-gray-500">+{formatCurrency(order.tip)} propina</p>
                    )}
                  </div>
                </Link>
              )})}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
