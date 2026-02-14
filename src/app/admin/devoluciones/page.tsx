'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency, formatMiles, parseMiles } from '@/lib/utils'
import {
  Search, Calendar, RefreshCw, RotateCcw, Clock,
  CheckCircle, XCircle, AlertTriangle, DollarSign, Banknote
} from 'lucide-react'
import toast from 'react-hot-toast'

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  product: { id: string; name: string }
}

interface Order {
  id: string
  order_number: string
  total: number
  status: string
  created_at: string
  table?: { name: string } | null
  waiter?: { name: string } | null
  items: OrderItem[]
  payment?: { method: string; amount: number } | null
}

interface Refund {
  id: string
  order_id: string
  amount: number
  reason: string
  status: string
  notes: string | null
  created_at: string
  processed_at: string | null
  order?: { order_number: string; table?: { name: string } }
  created_by_user?: { name: string }
  approved_by_user?: { name: string }
}

export default function DevolucionesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [refundNotes, setRefundNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const refundReasons = [
    'Producto en mal estado',
    'Error en el pedido',
    'Cliente insatisfecho',
    'Tiempo de espera excesivo',
    'Producto incorrecto',
    'Cancelación por el cliente',
    'Otro'
  ]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cajero/devoluciones?date=${dateFilter}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setRefunds(data.refunds || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateRefund = async () => {
    if (!selectedOrder) return

    const amount = refundType === 'full'
      ? selectedOrder.total
      : parseFloat(refundAmount) || 0

    if (amount <= 0 || amount > selectedOrder.total) {
      toast.error('Monto de devolución inválido')
      return
    }

    if (!refundReason) {
      toast.error('Seleccione una razón para la devolución')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/cajero/devoluciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          amount,
          reason: refundReason,
          notes: refundNotes
        })
      })

      if (res.ok) {
        toast.success('Devolución procesada correctamente')
        setSelectedOrder(null)
        setRefundType('full')
        setRefundAmount('')
        setRefundReason('')
        setRefundNotes('')
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al procesar la devolución')
      }
    } catch (error) {
      toast.error('Error al procesar la devolución')
    } finally {
      setProcessing(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    const searchLower = searchQuery.toLowerCase()
    return (
      o.order_number?.includes(searchQuery) ||
      o.table?.name?.toLowerCase().includes(searchLower)
    )
  })

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'APPROVED': 'bg-green-100 text-green-700',
      'REJECTED': 'bg-red-100 text-red-700'
    }
    const labels: Record<string, string> = {
      'PENDING': 'Pendiente',
      'APPROVED': 'Aprobado',
      'REJECTED': 'Rechazado'
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status] || status}
      </span>
    )
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
          <h1 className="text-2xl font-semibold text-gray-900">Devoluciones</h1>
          <p className="text-gray-500 text-sm mt-1">Procesar devoluciones y reembolsos</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('new')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          <RotateCcw className="h-4 w-4" />
          Nueva Devolución
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          <Clock className="h-4 w-4" />
          Historial
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número de orden o mesa..."
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
      </div>

      {activeTab === 'new' ? (
        filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RotateCcw className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">No hay órdenes pagadas</p>
              <p className="text-gray-500 text-sm mt-1">No se encontraron órdenes pagadas para esta fecha</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <DollarSign className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Orden #{order.order_number}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            Pagado
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {order.table?.name || 'Para llevar'} • {formatCurrency(order.total)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(order.created_at).toLocaleString('es-CO')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Devolver
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="p-0">
            {refunds.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-900 font-medium">Sin historial</p>
                <p className="text-gray-500 text-sm mt-1">No hay devoluciones registradas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {refunds.map((refund) => (
                  <div key={refund.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${refund.status === 'APPROVED' ? 'bg-green-100' :
                        refund.status === 'REJECTED' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                        {refund.status === 'APPROVED' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : refund.status === 'REJECTED' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Orden #{refund.order?.order_number}
                          </span>
                          {getStatusBadge(refund.status)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {refund.reason} • {formatCurrency(refund.amount)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(refund.created_at).toLocaleString('es-CO')}
                          {refund.created_by_user && ` • Por: ${refund.created_by_user.name}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de devolución */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Procesar Devolución</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Orden #{selectedOrder.order_number} • {selectedOrder.table?.name || 'Para llevar'}
              </p>
            </div>

            <CardContent className="p-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total de la orden</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(selectedOrder.total)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de devolución</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRefundType('full')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${refundType === 'full' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    Total
                  </button>
                  <button
                    onClick={() => setRefundType('partial')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${refundType === 'partial' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    Parcial
                  </button>
                </div>
              </div>

              {refundType === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto a devolver</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMiles(refundAmount)}
                    onChange={(e) => { const v = parseMiles(e.target.value); if (/^[0-9]*$/.test(v)) setRefundAmount(v) }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Seleccionar motivo...</option>
                  {refundReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRefund}
                  disabled={processing || !refundReason}
                  className="flex-1 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {processing ? 'Procesando...' : 'Procesar Devolución'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
