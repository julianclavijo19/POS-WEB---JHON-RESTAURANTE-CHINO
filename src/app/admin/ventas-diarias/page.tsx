'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Calendar, RefreshCw, Receipt, Banknote, CreditCard, 
  ArrowLeftRight, Clock, MapPin
} from 'lucide-react'

interface Payment {
  id: string
  amount: number
  method: string
  change_amount: number | null
  created_at: string
  order: {
    id: string
    order_number: string
    table?: { name: string } | null
  } | null
}

interface DailySummary {
  total: number
  cash: number
  card: number
  transfer: number
  count: number
}

export default function VentasDiariasPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState<DailySummary>({ total: 0, cash: 0, card: 0, transfer: 0, count: 0 })

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cajero/ventas-diarias?date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
        setSummary(data.summary || { total: 0, cash: 0, card: 0, transfer: 0, count: 0 })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const getMethodIcon = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'CASH': return <Banknote className="h-4 w-4" />
      case 'CARD': return <CreditCard className="h-4 w-4" />
      case 'TRANSFER': return <ArrowLeftRight className="h-4 w-4" />
      default: return <Receipt className="h-4 w-4" />
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'CASH': return 'Efectivo'
      case 'CARD': return 'Tarjeta'
      case 'TRANSFER': return 'Transferencia'
      default: return method
    }
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
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
          <h1 className="text-2xl font-semibold text-gray-900">Ventas Diarias</h1>
          <p className="text-gray-500 text-sm mt-1">
            {summary.count} transacciones del día
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <button 
            onClick={fetchPayments}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Receipt className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Ventas</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Banknote className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Efectivo</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.cash)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tarjeta</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.card)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ArrowLeftRight className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Transferencia</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.transfer)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de ventas */}
      {payments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium">No hay ventas</p>
            <p className="text-gray-500 text-sm mt-1">No se encontraron ventas para esta fecha</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getMethodIcon(payment.method)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {payment.order?.table?.name || 'Para llevar'}
                        </span>
                        <span className="text-sm text-gray-500">
                          #{payment.order?.order_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span>{getMethodLabel(payment.method)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(payment.created_at)}
                        </span>
                        {payment.change_amount && payment.change_amount > 0 && (
                          <span className="text-gray-400">
                            Cambio: {formatCurrency(payment.change_amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(payment.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
