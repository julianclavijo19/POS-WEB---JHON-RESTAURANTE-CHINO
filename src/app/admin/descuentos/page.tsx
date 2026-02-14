'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency, formatMiles, parseMiles } from '@/lib/utils'
import {
  Percent, Tag, DollarSign, Clock, CheckCircle, XCircle, Search, Plus, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Order {
  id: string
  order_number: number
  total: number
  status: string
  created_at: string
  table: { id: string; name: string } | null
  waiter: { id: string; name: string } | null
}

interface AppliedDiscount {
  id: string
  order_id: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_amount: number
  reason: string
  created_at: string
  order: { order_number: number; table: { name: string } | null; total: number } | null
  applied_by_user: { id: string; name: string } | null
}

interface Stats {
  total_discounted: number
  discount_count: number
}

export default function DescuentosPage() {
  const [activeTab, setActiveTab] = useState<'apply' | 'history'>('apply')
  const [orders, setOrders] = useState<Order[]>([])
  const [appliedDiscounts, setAppliedDiscounts] = useState<AppliedDiscount[]>([])
  const [stats, setStats] = useState<Stats>({ total_discounted: 0, discount_count: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [reason, setReason] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/cajero/descuentos')
      if (!res.ok) throw new Error('Error al cargar datos')
      const data = await res.json()
      setOrders(data.orders || [])
      setAppliedDiscounts(data.applied_discounts || [])
      setStats(data.stats || { total_discounted: 0, discount_count: 0 })
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const openDiscountModal = (order: Order) => {
    setSelectedOrder(order)
    setDiscountType('percentage')
    setDiscountValue('')
    setReason('')
    setShowModal(true)
  }

  const calculateDiscountAmount = () => {
    if (!selectedOrder || !discountValue) return 0
    const value = parseFloat(discountValue)
    if (isNaN(value)) return 0

    if (discountType === 'percentage') {
      return selectedOrder.total * (value / 100)
    } else {
      return Math.min(value, selectedOrder.total)
    }
  }

  const handleApplyDiscount = async () => {
    if (!selectedOrder || !discountValue) {
      toast.error('Complete todos los campos')
      return
    }

    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      toast.error('Valor de descuento inválido')
      return
    }

    if (discountType === 'percentage' && value > 100) {
      toast.error('El porcentaje no puede ser mayor a 100%')
      return
    }

    if (!reason.trim()) {
      toast.error('Debe indicar un motivo')
      return
    }

    try {
      setProcessing(true)
      const res = await fetch('/api/cajero/descuentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          discount_type: discountType,
          discount_value: value,
          reason: reason.trim()
        })
      })

      if (!res.ok) throw new Error('Error al aplicar descuento')

      const data = await res.json()
      toast.success(data.message || 'Descuento aplicado correctamente')
      setShowModal(false)
      setSelectedOrder(null)
      fetchData()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al aplicar el descuento')
    } finally {
      setProcessing(false)
    }
  }

  const filteredOrders = orders.filter(o =>
    o.order_number.toString().includes(searchQuery) ||
    o.table?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const predefinedReasons = [
    'Descuento empleado',
    'Promoción del día',
    'Cliente frecuente',
    'Compensación por demora',
    'Error en pedido',
    'Cupón promocional',
    'Otro'
  ]

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
          <h1 className="text-2xl font-semibold text-gray-900">Descuentos</h1>
          <p className="text-gray-500 text-sm mt-1">Aplicar descuentos a órdenes activas</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-full">
                <Tag className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Órdenes Activas</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-3 rounded-full">
                <Percent className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Descuentos Hoy</p>
                <p className="text-2xl font-bold">{stats.discount_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Descontado</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.total_discounted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('apply')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === 'apply' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          <Percent className="h-4 w-4" />
          Aplicar Descuento
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por número de orden o mesa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {activeTab === 'apply' ? (
        filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">No hay órdenes activas</p>
              <p className="text-gray-500 text-sm mt-1">No se encontraron órdenes para aplicar descuentos</p>
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
                        <Tag className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Orden #{order.order_number}
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
                      onClick={() => openDiscountModal(order)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                    >
                      <Percent className="h-4 w-4" />
                      Aplicar
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
            {appliedDiscounts.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-900 font-medium">Sin historial</p>
                <p className="text-gray-500 text-sm mt-1">No hay descuentos aplicados</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {appliedDiscounts.map((discount) => (
                  <div key={discount.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Orden #{discount.order?.order_number}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {discount.discount_type === 'percentage'
                              ? `${discount.discount_value}%`
                              : formatCurrency(discount.discount_value)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {discount.reason} • Descuento: {formatCurrency(discount.discount_amount)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(discount.created_at).toLocaleString('es-CO')}
                          {discount.applied_by_user && ` • Por: ${discount.applied_by_user.name}`}
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

      {/* Modal para aplicar descuento */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Aplicar Descuento</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de descuento</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${discountType === 'percentage' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    Porcentaje %
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`flex-1 py-2 rounded-lg transition-colors ${discountType === 'fixed' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                  >
                    Monto fijo $
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {discountType === 'percentage' ? 'Porcentaje' : 'Monto'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMiles(discountValue)}
                  onChange={(e) => { const v = parseMiles(e.target.value); if (/^[0-9]*$/.test(v)) setDiscountValue(v) }}
                  placeholder={discountType === 'percentage' ? '10' : '5000'}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {discountValue && (
                  <p className="text-sm text-gray-500 mt-1">
                    Descuento: {formatCurrency(calculateDiscountAmount())}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Seleccionar motivo...</option>
                  {predefinedReasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApplyDiscount}
                  disabled={processing || !discountValue || !reason}
                  className="flex-1 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                >
                  {processing ? 'Aplicando...' : 'Aplicar Descuento'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
