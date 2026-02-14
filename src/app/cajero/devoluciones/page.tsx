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
  type?: string
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
  const [hasActiveShift, setHasActiveShift] = useState<boolean | null>(null)

  // New refund flow
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

  // Check if there's an active shift
  const checkShift = useCallback(async () => {
    try {
      const res = await fetch('/api/cajero/turno')
      if (res.ok) {
        const data = await res.json()
        setHasActiveShift(data.shift?.status === 'OPEN')
      } else {
        setHasActiveShift(false)
      }
    } catch (error) {
      setHasActiveShift(false)
    }
  }, [])

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
    checkShift()
    fetchData()
  }, [fetchData, checkShift])

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
          notes: refundNotes,
          payment_method: selectedOrder.payment?.method || 'CASH'
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

  // Show warning banner if no active shift
  const NoShiftBanner = () => (
    hasActiveShift === false ? (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-medium text-red-800">No hay turno de caja abierto</p>
          <p className="text-sm text-red-600">Debe abrir un turno para procesar devoluciones. Las devoluciones afectan el saldo de caja.</p>
        </div>
      </div>
    ) : null
  )

  return (
    <div className="space-y-6">
      {/* No shift warning */}
      <NoShiftBanner />

      {/* Header */}
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

      {/* Tabs */}
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

      {/* Filters */}
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
        /* New Refund - Select Order */
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
                {filteredOrders.map((order) => {
                  const paymentMethodLabel: Record<string, string> = {
                    'CASH': 'Efectivo',
                    'CARD': 'Tarjeta',
                    'NEQUI': 'Nequi',
                    'DAVIPLATA': 'Daviplata',
                    'MIXED': 'Mixto'
                  }
                  const paymentMethod = order.payment?.method || 'CASH'
                  return (
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
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              Pagado
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {paymentMethodLabel[paymentMethod] || paymentMethod}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                            <span>{order.table?.name || 'Para llevar'}</span>
                            <span>•</span>
                            <span>
                              {new Date(order.created_at).toLocaleTimeString('es-CO', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {order.waiter?.name && (
                              <>
                                <span>•</span>
                                <span>Mesero: {order.waiter.name}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{order.items.length} items</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(order.total)}
                        </span>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Devolver
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        /* Refund History */
        refunds.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">Sin historial</p>
              <p className="text-gray-500 text-sm mt-1">No hay devoluciones registradas</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
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
                            Orden #{refund.order?.order_number || '---'}
                          </span>
                          {getStatusBadge(refund.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>{refund.reason}</span>
                          <span>•</span>
                          <span>
                            {new Date(refund.created_at).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">-{formatCurrency(refund.amount)}</p>
                      <p className="text-xs text-gray-500">{refund.created_by_user?.name || 'Sistema'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Refund Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Procesar Devolución - Orden #{selectedOrder.order_number}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedOrder.table?.name || 'Para llevar'} • Total: {formatCurrency(selectedOrder.total)}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {/* Order Items */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Items de la orden</label>
                <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <span className="text-sm text-gray-900">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refund Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de devolución</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRefundType('full')}
                    className={`p-3 rounded-lg border text-center transition-all ${refundType === 'full'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <Banknote className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm">Total</span>
                  </button>
                  <button
                    onClick={() => setRefundType('partial')}
                    className={`p-3 rounded-lg border text-center transition-all ${refundType === 'partial'
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <DollarSign className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm">Parcial</span>
                  </button>
                </div>
              </div>

              {/* Partial Amount */}
              {refundType === 'partial' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Monto a devolver</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatMiles(refundAmount)}
                    onChange={(e) => { const v = parseMiles(e.target.value); if (/^[0-9]*$/.test(v)) setRefundAmount(v) }}
                    placeholder={`Máximo: ${formatCurrency(selectedOrder.total)}`}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              {/* Refund Reason */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Razón de la devolución</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Seleccione una razón...</option>
                  {refundReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Notas adicionales</label>
                <textarea
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles adicionales..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Summary */}
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">Monto a devolver:</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(refundType === 'full' ? selectedOrder.total : (parseFloat(refundAmount) || 0))}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                disabled={processing}
                className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRefund}
                disabled={processing || !refundReason || (refundType === 'partial' && (!refundAmount || parseFloat(refundAmount) <= 0))}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <RotateCcw className="h-5 w-5" />
                    Procesar Devolución
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
