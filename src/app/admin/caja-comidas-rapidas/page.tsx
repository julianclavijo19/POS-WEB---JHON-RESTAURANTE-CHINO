'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import { 
  DollarSign, TrendingUp, Calendar, RefreshCw, 
  Clock, Wallet, CheckCircle, AlertCircle
} from 'lucide-react'

interface Shift {
  id: string
  user_id: string
  opening_amount: number
  closing_amount?: number
  total_sales: number
  status: string
  opened_at: string
  closed_at?: string
  notes?: string
  user?: { name: string; email: string }
}

interface HistoricalShift {
  id: string
  opening_amount: number
  closing_amount: number
  total_sales: number
  opened_at: string
  closed_at: string
  notes?: string
  user?: { name: string; email: string }
}

export default function AdminComidasRapidasPage() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [historicalShifts, setHistoricalShifts] = useState<HistoricalShift[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week')

  const fetchData = useCallback(async () => {
    try {
      const currentRes = await fetch('/api/cajero/turno-comidas-rapidas')
      if (currentRes.ok) {
        const data = await currentRes.json()
        setCurrentShift(data.shift)
      }

      const endDate = new Date()
      const startDate = new Date()
      if (period === 'week') startDate.setDate(startDate.getDate() - 7)
      else if (period === 'month') startDate.setMonth(startDate.getMonth() - 1)
      else startDate.setFullYear(startDate.getFullYear() - 1)

      const historyRes = await fetch(
        `/api/cajero/historial-caja?from=${startDate.toISOString().split('T')[0]}&to=${endDate.toISOString().split('T')[0]}`
      )
      if (historyRes.ok) {
        const data = await historyRes.json()
        const fastFoodRegisters = (data.registers || []).filter(
          (r: any) => r.register_type === 'FAST_FOOD' && r.status === 'CLOSED'
        )
        setHistoricalShifts(fastFoodRegisters)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const totalSales = historicalShifts.reduce((sum, s) => sum + Number(s.total_sales || 0), 0)
  const avgSales = historicalShifts.length > 0 ? totalSales / historicalShifts.length : 0
  const totalShifts = historicalShifts.length

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
          <h1 className="text-2xl font-semibold text-gray-900">Caja — Comidas Rápidas</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoreo y estadísticas del punto de venta</p>
        </div>
        <button onClick={fetchData}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors self-start"
          title="Actualizar">
          <RefreshCw className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Current shift status */}
      <div className={`bg-white border rounded-lg p-6 ${currentShift ? 'border-gray-300' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${currentShift ? 'bg-green-100' : 'bg-gray-100'}`}>
              {currentShift ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {currentShift ? 'Turno Activo' : 'Sin Turno Abierto'}
              </h3>
              {currentShift ? (
                <p className="text-sm text-gray-600">
                  Desde {new Date(currentShift.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} • Efectivo inicial: {formatCurrency(currentShift.opening_amount)}
                </p>
              ) : (
                <p className="text-sm text-gray-500">El empleado no ha iniciado turno</p>
              )}
            </div>
          </div>
          {currentShift && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Tiempo activo</p>
              <p className="text-xl font-semibold text-gray-900">
                {Math.round((Date.now() - new Date(currentShift.opened_at).getTime()) / 1000 / 60)} min
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Period filters */}
      <div className="flex gap-2">
        {[
          { id: 'week', label: 'Última semana' },
          { id: 'month', label: 'Último mes' },
          { id: 'all', label: 'Todo' }
        ].map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{p.label}</button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Ventas Totales</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(totalSales)}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Promedio por Turno</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{formatCurrency(avgSales)}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Turnos</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{totalShifts}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Historical shifts table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Historial de Turnos</h2>
        </div>
        <div className="p-6">
          {historicalShifts.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay turnos cerrados en este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Responsable</th>
                    <th className="px-4 py-3 font-medium text-right">Efectivo Inicial</th>
                    <th className="px-4 py-3 font-medium text-right">Efectivo Final</th>
                    <th className="px-4 py-3 font-medium text-right">Ventas</th>
                    <th className="px-4 py-3 font-medium">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historicalShifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{new Date(shift.opened_at).toLocaleDateString('es-CO')}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(shift.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(shift.closed_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{shift.user?.name || 'Desconocido'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(shift.opening_amount)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-right">{formatCurrency(shift.closing_amount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{formatCurrency(shift.total_sales)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{shift.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
