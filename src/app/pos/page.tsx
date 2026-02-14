'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button, Card, CardContent, Badge, Modal, Input } from '@/components/ui'
import { formatCurrency, formatTime } from '@/lib/utils'
import {
  CreditCard,
  Banknote,
  Smartphone,
  Percent,
  Receipt,
  Check,
  X,
  DollarSign,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  subtotal: number
  tax: number
  discount: number
  table: { name: string; number: number } | null
  items: { id: string; quantity: number; product: { name: string; price: number } }[]
  createdAt: string
}

interface CashRegister {
  id: string
  openingAmount: number
  cashSales: number
  cardSales: number
  transferSales: number
  totalSales: number
  totalOrders: number
  status: string
}

export default function POSPage() {
  const { data: session } = useSession()
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [loading, setLoading] = useState(true)

  // Modales
  const [showPayModal, setShowPayModal] = useState(false)
  const [showOpenRegister, setShowOpenRegister] = useState(false)
  const [showCloseRegister, setShowCloseRegister] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  // Estados de pago
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH')
  const [receivedAmount, setReceivedAmount] = useState('')
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [discountAmount, setDiscountAmount] = useState('')
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed')

  useEffect(() => {
    fetchCashRegister()
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000) // Actualizar cada 10 segundos
    return () => clearInterval(interval)
  }, [])

  const fetchCashRegister = async () => {
    try {
      const res = await fetch('/api/cash-register')
      const data = await res.json()
      setCashRegister(data)
      if (!data) {
        setShowOpenRegister(true)
      }
    } catch (error) {
      console.error('Error fetching cash register:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=SERVED,READY,IN_KITCHEN')
      const data = await res.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenRegister = async () => {
    try {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id,
          openingAmount: parseFloat(openingAmount) || 0,
        }),
      })

      if (res.ok) {
        toast.success('Caja abierta exitosamente')
        setShowOpenRegister(false)
        fetchCashRegister()
      }
    } catch (error) {
      toast.error('Error al abrir caja')
    }
  }

  const handleCloseRegister = async () => {
    try {
      const res = await fetch('/api/cash-register/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closingAmount: parseFloat(closingAmount) || 0,
        }),
      })

      if (res.ok) {
        toast.success('Caja cerrada exitosamente')
        setShowCloseRegister(false)
        setCashRegister(null)
        setShowOpenRegister(true)
      }
    } catch (error) {
      toast.error('Error al cerrar caja')
    }
  }

  const handlePayment = async () => {
    if (!selectedOrder) return

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: paymentMethod,
          receivedAmount: paymentMethod === 'CASH' ? parseFloat(receivedAmount) : undefined,
        }),
      })

      if (res.ok) {
        toast.success('Pago procesado exitosamente')
        setShowPayModal(false)
        setSelectedOrder(null)
        setReceivedAmount('')
        fetchOrders()
        fetchCashRegister()
      }
    } catch (error) {
      toast.error('Error al procesar pago')
    }
  }

  const handleApplyDiscount = async () => {
    if (!selectedOrder) return

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discount: parseFloat(discountAmount) || 0,
          discountType,
        }),
      })

      if (res.ok) {
        toast.success('Descuento aplicado')
        setShowDiscountModal(false)
        setDiscountAmount('')
        const updated = await res.json()
        setSelectedOrder(updated)
        fetchOrders()
      }
    } catch (error) {
      toast.error('Error al aplicar descuento')
    }
  }

  const changeAmount = paymentMethod === 'CASH' && receivedAmount
    ? parseFloat(receivedAmount) - (selectedOrder?.total || 0)
    : 0

  const statusLabels: Record<string, string> = {
    IN_KITCHEN: 'En Cocina',
    READY: 'Lista',
    SERVED: 'Servida',
  }

  const statusColors: Record<string, 'warning' | 'success' | 'info'> = {
    IN_KITCHEN: 'warning',
    READY: 'success',
    SERVED: 'info',
  }

  if (!cashRegister && !showOpenRegister) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Lista de órdenes */}
      <div className="w-1/2 bg-gray-100 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Órdenes por Cobrar</h2>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowCloseRegister(true)}
          >
            Cerrar Caja
          </Button>
        </div>

        {/* Resumen de caja */}
        {cashRegister && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Efectivo</p>
                  <p className="font-bold text-green-600">
                    {formatCurrency(cashRegister.cashSales)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Tarjeta</p>
                  <p className="font-bold text-blue-600">
                    {formatCurrency(cashRegister.cardSales)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold">
                    {formatCurrency(cashRegister.totalSales)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <Card
              key={order.id}
              className={`cursor-pointer transition-all ${
                selectedOrder?.id === order.id
                  ? 'ring-2 ring-blue-500'
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{order.orderNumber}</span>
                  <Badge variant={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{order.table?.name || 'Para llevar'}</span>
                  <span>{formatTime(order.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">{order.items.length} productos</span>
                  <span className="font-bold text-lg">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay órdenes pendientes de cobro</p>
            </div>
          )}
        </div>
      </div>

      {/* Detalle de orden */}
      <div className="w-1/2 bg-white p-4 flex flex-col">
        {selectedOrder ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedOrder.orderNumber}</h2>
                  <p className="text-gray-500">{selectedOrder.table?.name || 'Para llevar'}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-6">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <div>
                      <span className="font-medium">{item.quantity}x </span>
                      <span>{item.product.name}</span>
                    </div>
                    <span>{formatCurrency(Number(item.product.price) * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>IVA (16%)</span>
                  <span>{formatCurrency(selectedOrder.tax)}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>-{formatCurrency(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="border-t pt-4 space-y-3">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowDiscountModal(true)}
              >
                <Percent className="h-4 w-4 mr-2" />
                Aplicar Descuento
              </Button>
              <Button
                variant="success"
                size="lg"
                className="w-full"
                onClick={() => setShowPayModal(true)}
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Cobrar {formatCurrency(selectedOrder.total)}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Selecciona una orden para cobrar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Abrir Caja */}
      <Modal
        isOpen={showOpenRegister}
        onClose={() => {}}
        title="Abrir Caja"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">Ingresa el monto inicial de caja:</p>
          <Input
            type="text"
            inputMode="decimal"
            label="Monto Inicial"
            placeholder="0.00"
            value={openingAmount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d.]/g, '')
              setOpeningAmount(val)
            }}
          />
          <Button className="w-full" onClick={handleOpenRegister}>
            Abrir Caja
          </Button>
        </div>
      </Modal>

      {/* Modal Cerrar Caja */}
      <Modal
        isOpen={showCloseRegister}
        onClose={() => setShowCloseRegister(false)}
        title="Cerrar Caja"
        size="sm"
      >
        <div className="space-y-4">
          {cashRegister && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Fondo inicial:</span>
                <span>{formatCurrency(cashRegister.openingAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas efectivo:</span>
                <span>{formatCurrency(cashRegister.cashSales)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas tarjeta:</span>
                <span>{formatCurrency(cashRegister.cardSales)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Efectivo esperado:</span>
                <span>
                  {formatCurrency(
                    Number(cashRegister.openingAmount) + Number(cashRegister.cashSales)
                  )}
                </span>
              </div>
            </div>
          )}
          <Input
            type="text"
            inputMode="decimal"
            label="Efectivo en caja"
            placeholder="0.00"
            value={closingAmount}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d.]/g, '')
              setClosingAmount(val)
            }}
          />
          <Button variant="danger" className="w-full" onClick={handleCloseRegister}>
            Cerrar Caja
          </Button>
        </div>
      </Modal>

      {/* Modal Cobrar */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="Procesar Pago"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Total a cobrar</p>
            <p className="text-3xl font-bold">
              {formatCurrency(selectedOrder?.total || 0)}
            </p>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-sm font-medium mb-2">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'CASH' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('CASH')}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Efectivo
              </Button>
              <Button
                variant={paymentMethod === 'CARD' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Tarjeta
              </Button>
              <Button
                variant={paymentMethod === 'TRANSFER' ? 'primary' : 'secondary'}
                onClick={() => setPaymentMethod('TRANSFER')}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Transfer
              </Button>
            </div>
          </div>

          {/* Monto recibido (solo efectivo) */}
          {paymentMethod === 'CASH' && (
            <>
              <Input
                type="text"
                inputMode="decimal"
                label="Monto recibido"
                placeholder="0.00"
                value={receivedAmount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^\d.]/g, '')
                  setReceivedAmount(val)
                }}
              />
              {changeAmount > 0 && (
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">Cambio</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(changeAmount)}
                  </p>
                </div>
              )}
            </>
          )}

          <Button
            variant="success"
            size="lg"
            className="w-full"
            onClick={handlePayment}
            disabled={
              paymentMethod === 'CASH' &&
              parseFloat(receivedAmount) < (selectedOrder?.total || 0)
            }
          >
            <Check className="h-5 w-5 mr-2" />
            Confirmar Pago
          </Button>
        </div>
      </Modal>

      {/* Modal Descuento */}
      <Modal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        title="Aplicar Descuento"
        size="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={discountType === 'fixed' ? 'primary' : 'secondary'}
              onClick={() => setDiscountType('fixed')}
            >
              Monto fijo
            </Button>
            <Button
              variant={discountType === 'percentage' ? 'primary' : 'secondary'}
              onClick={() => setDiscountType('percentage')}
            >
              Porcentaje
            </Button>
          </div>
          <Input
            type="number"
            label={discountType === 'fixed' ? 'Monto ($)' : 'Porcentaje (%)'}
            placeholder="0"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
          />
          <Button className="w-full" onClick={handleApplyDiscount}>
            Aplicar Descuento
          </Button>
        </div>
      </Modal>
    </div>
  )
}
