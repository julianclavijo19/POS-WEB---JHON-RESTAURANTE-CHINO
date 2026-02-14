'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, ShoppingCart, CreditCard, TrendingUp, Calendar, BarChart3, Download, RefreshCw, Utensils } from 'lucide-react'
import toast from 'react-hot-toast'

interface CajeroStats {
  ventasHoy: number
  ordenesHoy: number
  ordenesPendientes: number
  ticketPromedio: number
  totalPagado: number
  totalPendiente: number
  ventasEfectivo: number
  ventasElectronica: number
}

interface VentaDetalle {
  id: string
  order_number: number
  total: number
  payment_method: string
  created_at: string
  status: string
  table: { name: string } | null
}

export default function AdminCajaPage() {
  const [stats, setStats] = useState<CajeroStats>({
    ventasHoy: 0, ordenesHoy: 0, ordenesPendientes: 0, ticketPromedio: 0,
    totalPagado: 0, totalPendiente: 0, ventasEfectivo: 0, ventasElectronica: 0,
  })
  const [ventas, setVentas] = useState<VentaDetalle[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroMetodo, setFiltroMetodo] = useState<string>('TODO')
  const [exportando, setExportando] = useState(false)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 20000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/cajero/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
      const ventasRes = await fetch('/api/cajero/ventas')
      if (ventasRes.ok) {
        const ventasData = await ventasRes.json()
        setVentas(Array.isArray(ventasData) ? ventasData : ventasData.ventas || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExportando(true)
    try {
      const res = await fetch('/api/cajero/export')
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `reporte-caja-restaurante-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Reporte descargado')
      }
    } catch { toast.error('Error al descargar reporte') }
    finally { setExportando(false) }
  }

  const ventasFiltradas = filtroMetodo === 'TODO' ? ventas : ventas.filter(v => v.payment_method === filtroMetodo)
  const totalFiltrado = ventasFiltradas.reduce((sum, v) => sum + v.total, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Caja — Restaurante</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen de ventas y movimientos del día</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchStats}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Actualizar">
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
          <button onClick={handleExport} disabled={exportando}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors">
            <Download className="h-4 w-4" />
            {exportando ? 'Exportando...' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Ventas Totales</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(stats.ventasHoy)}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.ordenesHoy} órdenes</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pagado</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(stats.totalPagado)}</p>
              <p className="text-sm text-gray-500 mt-1">Órdenes completadas</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Por Cobrar</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(stats.totalPendiente)}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.ordenesPendientes} órdenes</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Ticket Promedio</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(stats.ticketPromedio)}</p>
              <p className="text-sm text-gray-500 mt-1">Por orden</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Ventas por Método</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Efectivo</span>
                <span className="font-semibold text-gray-900">{formatCurrency(stats.ventasEfectivo)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-gray-900 h-2 rounded-full transition-all"
                  style={{ width: stats.ventasHoy > 0 ? `${(stats.ventasEfectivo / stats.ventasHoy) * 100}%` : '0%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Tarjeta / Transferencia</span>
                <span className="font-semibold text-gray-900">{formatCurrency(stats.ventasElectronica)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-gray-400 h-2 rounded-full transition-all"
                  style={{ width: stats.ventasHoy > 0 ? `${(stats.ventasElectronica / stats.ventasHoy) * 100}%` : '0%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Resumen Rápido</h2>
          </div>
          <div className="p-6 space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total en Caja (Efectivo)</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{formatCurrency(stats.ventasEfectivo)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Ventas Electrónicas</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{formatCurrency(stats.ventasElectronica)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales detail */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Ventas del Día</h2>
          <div className="flex gap-2">
            {[
              { id: 'TODO', label: 'Todas' },
              { id: 'CASH', label: 'Efectivo' },
              { id: 'CARD', label: 'Tarjeta' },
            ].map(f => (
              <button key={f.id} onClick={() => setFiltroMetodo(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filtroMetodo === f.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {ventasFiltradas.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No hay ventas registradas</p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-96 overflow-y-auto space-y-2">
                {ventasFiltradas.map((venta) => (
                  <div key={venta.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Orden #{venta.order_number}</p>
                      <p className="text-sm text-gray-500">
                        Mesa: {venta.table?.name || 'N/A'} • {new Date(venta.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(venta.total)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        venta.payment_method === 'CASH' ? 'bg-gray-100 text-gray-700' : 'bg-gray-900 text-white'
                      }`}>
                        {venta.payment_method === 'CASH' ? 'Efectivo' : venta.payment_method === 'TRANSFER' ? 'Transferencia' : 'Tarjeta'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total:</span>
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(totalFiltrado)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
