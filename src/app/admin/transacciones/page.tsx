'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Search, Calendar, CreditCard, Banknote, 
  DollarSign, RefreshCw, Receipt, FileText
} from 'lucide-react'

interface Payment {
  id: string
  amount: number
  method: string
  received_amount: number | null
  change_amount: number | null
  created_at: string
  order: {
    id: string
    order_number: string
    table?: { name: string } | null
  } | null
}

export default function TransaccionesPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [methodFilter, setMethodFilter] = useState('all')

  const [stats, setStats] = useState({
    total: 0,
    cash: 0,
    card: 0,
    transfer: 0,
    count: 0
  })

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cajero/historial?date=${dateFilter}`)
      if (res.ok) {
        const data = await res.json()
        setPayments(data.payments || [])
        setStats(data.stats || { total: 0, cash: 0, card: 0, transfer: 0, count: 0 })
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const getMethodIcon = (method: string) => {
    switch (method?.toUpperCase()) {
      case 'CASH': return Banknote
      case 'CARD': return CreditCard
      case 'TRANSFER': return DollarSign
      default: return Receipt
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

  const filteredPayments = payments.filter(p => {
    const matchesSearch = 
      p.order?.order_number?.toString().includes(searchQuery) ||
      p.order?.table?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMethod = methodFilter === 'all' || p.method?.toUpperCase() === methodFilter.toUpperCase()
    return matchesSearch && matchesMethod
  })

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
          <h1 className="text-2xl font-semibold text-gray-900">Historial de Transacciones</h1>
          <p className="text-gray-500 text-sm mt-1">
            {stats.count} transacciones • Total: {formatCurrency(stats.total)}
          </p>
        </div>
        <button 
          onClick={fetchPayments}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          <RefreshCw className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total del Día</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.total)}</p>
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
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.cash)}</p>
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
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.card)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Transferencia</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats.transfer)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por orden o mesa..."
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
        
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">Todos los métodos</option>
          <option value="CASH">Efectivo</option>
          <option value="CARD">Tarjeta</option>
          <option value="TRANSFER">Transferencia</option>
        </select>
      </div>

      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium">No hay transacciones</p>
            <p className="text-gray-500 text-sm mt-1">No se encontraron cobros para esta fecha</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => {
                const Icon = getMethodIcon(payment.method)
                return (
                  <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {payment.order?.table?.name || 'Para llevar'}
                          </span>
                          <span className="text-sm text-gray-500">
                            #{payment.order?.order_number || '---'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                          <span>{getMethodLabel(payment.method)}</span>
                          <span>•</span>
                          <span>
                            {new Date(payment.created_at).toLocaleTimeString('es-CO', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {payment.method?.toUpperCase() === 'CASH' && payment.change_amount && payment.change_amount > 0 && (
                            <>
                              <span>•</span>
                              <span>Cambio: {formatCurrency(payment.change_amount)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
