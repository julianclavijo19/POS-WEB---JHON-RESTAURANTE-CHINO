'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Search, Calendar, Printer, RefreshCw, Receipt,
  FileText, CheckCircle, XCircle, Clock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { printInvoice, type OrderData } from '@/lib/printer'

interface Order {
  id: string
  order_number: string
  total: number
  status: string
  type?: string
  created_at: string
  table?: { name: string } | null
  waiter?: { name: string } | null
  items: {
    id: string
    quantity: number
    unit_price: number
    product: { name: string }
  }[]
  payments?: {
    method: string
    amount: number
    received_amount?: number
    change_amount?: number
  }[]
}

interface PrintLog {
  id: string
  order_id: string
  print_type: string
  printed_by: string
  copies: number
  success: boolean
  created_at: string
  order?: { order_number: string; table?: { name: string } }
  user?: { name: string }
}

export default function ReimpresionesPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [printLogs, setPrintLogs] = useState<PrintLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [printing, setPrinting] = useState(false)
  const [activeTab, setActiveTab] = useState<'orders' | 'history'>('orders')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cajero/reimpresiones?date=${dateFilter}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setPrintLogs(data.printLogs || [])
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

  const handlePrint = async (order: Order, printType: 'TICKET' | 'INVOICE') => {
    setPrinting(true)
    const payment = order.payments?.[0]
    const orderData: OrderData = {
      orderNumber: parseInt(order.order_number) || 0,
      tableName: order.table?.name || 'Para llevar',
      waiterName: order.waiter?.name || '',
      createdAt: order.created_at,
      items: order.items.map(item => ({
        quantity: item.quantity,
        product: { name: item.product.name },
        unitPrice: item.unit_price
      })),
      subtotal: order.total / 1.08,
      tax: order.total - (order.total / 1.08),
      total: order.total,
      discount: 0,
      paymentMethod: payment?.method || 'CASH',
      receivedAmount: payment?.received_amount || order.total,
      changeAmount: payment?.change_amount || 0
    }
    setSelectedOrder(null)
    setPrinting(false)
    toast.success(`Abriendo ${printType === 'TICKET' ? 'ticket' : 'factura'}...`)
    try {
      await printInvoice(orderData)
      await fetch('/api/cajero/reimpresiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, print_type: printType })
      })
      toast.success(`${printType === 'TICKET' ? 'Ticket' : 'Factura'} reimpreso`)
    } catch (error) {
      console.error('Error al reimprimir:', error)
      toast.error('Error al reimprimir')
    }
    fetchData()
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
      'PAID': 'bg-green-100 text-green-700',
      'SERVED': 'bg-blue-100 text-blue-700',
      'READY': 'bg-yellow-100 text-yellow-700',
      'IN_KITCHEN': 'bg-orange-100 text-orange-700',
      'PENDING': 'bg-gray-100 text-gray-700',
      'CANCELLED': 'bg-red-100 text-red-700'
    }
    const labels: Record<string, string> = {
      'PAID': 'Pagado',
      'SERVED': 'Servido',
      'READY': 'Listo',
      'IN_KITCHEN': 'En cocina',
      'PENDING': 'Pendiente',
      'CANCELLED': 'Cancelado'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reimpresiones</h1>
          <p className="text-gray-500 text-sm mt-1">Reimprimir tickets y facturas de órdenes</p>
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
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'orders' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Órdenes
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'history' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Historial de Impresiones
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

      {activeTab === 'orders' ? (
        /* Orders List */
        filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">No hay órdenes</p>
              <p className="text-gray-500 text-sm mt-1">No se encontraron órdenes para esta fecha</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {filteredOrders.map((order) => {
                  const payment = order.payments?.[0]
                  const paymentMethodLabel: Record<string, string> = {
                    'CASH': 'Efectivo',
                    'CARD': 'Tarjeta',
                    'NEQUI': 'Nequi',
                    'DAVIPLATA': 'Daviplata',
                    'MIXED': 'Mixto'
                  }
                  return (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Orden #{order.order_number}
                          </span>
                          {getStatusBadge(order.status)}
                          {payment && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              {paymentMethodLabel[payment.method] || payment.method}
                            </span>
                          )}
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
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
                      >
                        <Printer className="h-4 w-4" />
                        Reimprimir
                      </button>
                    </div>
                  </div>
                )})}
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        /* Print History */
        printLogs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">Sin historial</p>
              <p className="text-gray-500 text-sm mt-1">No hay reimpresiones registradas</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {printLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${log.success ? 'bg-green-100' : 'bg-red-100'}`}>
                        {log.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {log.print_type === 'TICKET' ? 'Ticket' : 
                           log.print_type === 'INVOICE' ? 'Factura' : 
                           log.print_type === 'KITCHEN' ? 'Comanda Cocina' : log.print_type}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>Orden #{log.order?.order_number || '---'}</span>
                          <span>•</span>
                          <span>{log.order?.table?.name || 'Para llevar'}</span>
                          <span>•</span>
                          <span>
                            {new Date(log.created_at).toLocaleTimeString('es-CO', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {log.user?.name || 'Sistema'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Print Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Reimprimir Orden #{selectedOrder.order_number}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedOrder.table?.name || 'Para llevar'} • {formatCurrency(selectedOrder.total)}
              </p>
            </div>
            
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 mb-4">Seleccione el tipo de documento a reimprimir:</p>
              
              <button
                onClick={() => handlePrint(selectedOrder, 'TICKET')}
                disabled={printing}
                className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-4 disabled:opacity-50"
              >
                <div className="p-3 bg-gray-100 rounded-lg">
                  <Receipt className="h-6 w-6 text-gray-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Ticket de Venta</p>
                  <p className="text-sm text-gray-500">Ticket resumido para el cliente</p>
                </div>
              </button>
              
              <button
                onClick={() => handlePrint(selectedOrder, 'INVOICE')}
                disabled={printing}
                className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-4 disabled:opacity-50"
              >
                <div className="p-3 bg-gray-100 rounded-lg">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Factura Completa</p>
                  <p className="text-sm text-gray-500">Factura con detalles completos</p>
                </div>
              </button>
            </div>

            <div className="p-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setSelectedOrder(null)}
                disabled={printing}
                className="w-full py-2 text-gray-600 hover:text-gray-900"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
