'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  FileText, Search, Mail, Printer, Plus, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: string
  invoiceNumber: string
  orderNumber: number
  total: number
  subtotal: number
  tax: number
  customerName?: string
  customerNit?: string
  customerEmail?: string
  createdAt: string
  status: 'emitida' | 'anulada'
}

export default function FacturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewInvoice, setShowNewInvoice] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState('')
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  
  const [customerData, setCustomerData] = useState({
    name: '',
    nit: '',
    email: '',
    address: ''
  })

  useEffect(() => {
    fetchInvoices()
    fetchPendingOrders()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices')
      if (res.ok) setInvoices(await res.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch('/api/orders?status=paid&noInvoice=true')
      if (res.ok) setPendingOrders(await res.json())
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleCreateInvoice = async () => {
    if (!selectedOrder) {
      toast.error('Seleccione una orden')
      return
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder,
          customer_name: customerData.name,
          customer_nit: customerData.nit,
          customer_email: customerData.email,
          customer_address: customerData.address
        })
      })

      if (res.ok) {
        toast.success('Factura generada')
        setShowNewInvoice(false)
        setSelectedOrder('')
        setCustomerData({ name: '', nit: '', email: '', address: '' })
        fetchInvoices()
        fetchPendingOrders()
      } else {
        toast.error('Error al generar factura')
      }
    } catch (error) {
      toast.error('Error al generar factura')
    }
  }

  const handleSendEmail = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send`, { method: 'POST' })
      if (res.ok) {
        toast.success('Factura enviada por correo')
      } else {
        toast.error('Error al enviar')
      }
    } catch (error) {
      toast.error('Error al enviar')
    }
  }

  const handlePrint = async (invoiceId: string) => {
    window.open(`/api/invoices/${invoiceId}/print`, '_blank')
  }

  const filteredInvoices = invoices.filter(inv =>
    inv.invoiceNumber.includes(searchQuery) ||
    inv.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.customerNit?.includes(searchQuery)
  )

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
          <h1 className="text-2xl font-semibold text-gray-900">Facturación</h1>
          <p className="text-gray-500 text-sm mt-1">{invoices.length} facturas emitidas</p>
        </div>
        <Button 
          onClick={() => setShowNewInvoice(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por número, cliente o NIT..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay facturas</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredInvoices.map(invoice => (
                <div key={invoice.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{invoice.invoiceNumber}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          invoice.status === 'emitida' ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {invoice.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.customerName || 'Consumidor Final'} 
                        {invoice.customerNit && ` • NIT: ${invoice.customerNit}`}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(invoice.createdAt).toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold">{formatCurrency(invoice.total)}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePrint(invoice.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Imprimir"
                      >
                        <Printer className="h-4 w-4 text-gray-600" />
                      </button>
                      {invoice.customerEmail && (
                        <button
                          onClick={() => handleSendEmail(invoice.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Enviar por correo"
                        >
                          <Mail className="h-4 w-4 text-gray-600" />
                        </button>
                      )}
                      <button
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showNewInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Nueva Factura</CardTitle>
                <button onClick={() => setShowNewInvoice(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Orden a facturar</label>
                <select
                  value={selectedOrder}
                  onChange={(e) => setSelectedOrder(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Seleccionar orden...</option>
                  {pendingOrders.map(order => (
                    <option key={order.id} value={order.id}>
                      #{order.orderNumber} - {order.table?.name} - {formatCurrency(order.total)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Datos Fiscales (opcional)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Razón Social</label>
                    <input
                      type="text"
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Nombre o razón social"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">NIT/Cédula</label>
                    <input
                      type="text"
                      value={customerData.nit}
                      onChange={(e) => setCustomerData({ ...customerData, nit: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="NIT o cédula"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Correo electrónico</label>
                    <input
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Dirección</label>
                    <input
                      type="text"
                      value={customerData.address}
                      onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Dirección fiscal"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowNewInvoice(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleCreateInvoice}
                  disabled={!selectedOrder}
                >
                  Generar Factura
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
