'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Clock, DollarSign, LogIn, LogOut, RefreshCw, Users, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Shift {
  id: string
  cashierName: string
  startTime: string
  endTime?: string
  initialFund: number
  finalAmount?: number
  status: 'active' | 'closed'
  totalSales?: number
  ordersCount?: number
}

export default function TurnosPage() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null)
  const [recentShifts, setRecentShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [showCloseShift, setShowCloseShift] = useState(false)
  const [showHandover, setShowHandover] = useState(false)
  const [initialFund, setInitialFund] = useState('')
  const [handoverTo, setHandoverTo] = useState('')
  const [cashiers, setCashiers] = useState<any[]>([])
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchShiftData()
    fetchCashiers()
  }, [])

  const fetchShiftData = async () => {
    try {
      // Fetch current shift
      const currentRes = await fetch('/api/cajero/turno')
      if (currentRes.ok) {
        const data = await currentRes.json()
        if (data.shift) {
          setCurrentShift({
            id: data.shift.id,
            cashierName: data.shift.user?.name || 'Cajero',
            startTime: data.shift.opened_at,
            initialFund: data.shift.opening_amount || 0,
            status: 'active',
            totalSales: data.shift.total_sales || 0,
            ordersCount: data.shift.total_orders || 0
          })
        } else {
          setCurrentShift(null)
        }
      }

      // Fetch recent closed shifts
      const historyRes = await fetch('/api/cajero/historial-caja?from=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      if (historyRes.ok) {
        const historyData = await historyRes.json()
        const closedShifts = (historyData.registers || [])
          .filter((r: any) => r.status === 'CLOSED')
          .slice(0, 5)
          .map((r: any) => ({
            id: r.id,
            cashierName: r.user?.name || r.user?.email || 'Cajero',
            startTime: r.opened_at,
            endTime: r.closed_at,
            initialFund: r.opening_amount || 0,
            finalAmount: r.closing_amount || 0,
            status: 'closed' as const,
            totalSales: r.total_sales || 0,
            ordersCount: r.total_orders || 0
          }))
        setRecentShifts(closedShifts)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCashiers = async () => {
    try {
      const res = await fetch('/api/users?role=cajero')
      if (res.ok) setCashiers(await res.json())
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleOpenShift = async () => {
    if (!initialFund || Number(initialFund) < 0) {
      toast.error('Ingrese el fondo inicial')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/cajero/turno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open',
          initialFund: Number(initialFund)
        })
      })

      if (res.ok) {
        toast.success('Turno iniciado')
        setShowOpenShift(false)
        setInitialFund('')
        fetchShiftData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al abrir turno')
      }
    } catch (error) {
      toast.error('Error al abrir turno')
    } finally {
      setProcessing(false)
    }
  }

  const handleCloseShift = async () => {
    setProcessing(true)
    try {
      const res = await fetch('/api/cajero/turno', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: currentShift?.id,
          closing_amount: currentShift?.finalAmount || 0
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Turno cerrado correctamente')
        setShowCloseShift(false)
        fetchShiftData()
      } else if (data.pendingTables) {
        toast.error(`No se puede cerrar. Hay ${data.pendingTables.length} mesa(s) sin cobrar.`)
      } else {
        toast.error(data.error || 'Error al cerrar turno')
      }
    } catch (error) {
      toast.error('Error al cerrar turno')
    } finally {
      setProcessing(false)
    }
  }

  const handleHandover = async () => {
    if (!handoverTo) {
      toast.error('Seleccione el cajero')
      return
    }

    try {
      toast.success('Turno entregado correctamente')
      setShowHandover(false)
      setHandoverTo('')
      fetchShiftData()
    } catch (error) {
      toast.error('Error al entregar turno')
    }
  }

  const formatDuration = (start: string, end?: string) => {
    const startDate = new Date(start)
    const endDate = end ? new Date(end) : new Date()
    const hours = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60))
    const minutes = Math.floor(((endDate.getTime() - startDate.getTime()) % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
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
          <h1 className="text-2xl font-semibold text-gray-900">Control de Turnos</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de apertura y cierre de caja</p>
        </div>
      </div>

      {/* Current shift status */}
      {currentShift ? (
        <Card className="border-l-4 border-l-gray-900">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="flex items-center gap-1 text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">
                    <span className="w-2 h-2 bg-gray-900 rounded-full animate-pulse"></span>
                    Turno Activo
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{currentShift.cashierName}</h2>
                <p className="text-gray-500">
                  Inicio: {new Date(currentShift.startTime).toLocaleString('es-CO')}
                </p>
                <p className="text-gray-500">
                  Duración: {formatDuration(currentShift.startTime)}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 mb-1">Fondo inicial</div>
                <div className="text-lg font-medium">{formatCurrency(currentShift.initialFund)}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(currentShift.totalSales || 0)}
                </div>
                <div className="text-sm text-gray-500">Ventas del turno</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {currentShift.ordersCount || 0}
                </div>
                <div className="text-sm text-gray-500">Órdenes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {formatCurrency((currentShift.totalSales || 0) / (currentShift.ordersCount || 1))}
                </div>
                <div className="text-sm text-gray-500">Ticket promedio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-gray-900">
                  {formatCurrency((currentShift.initialFund || 0) + (currentShift.totalSales || 0))}
                </div>
                <div className="text-sm text-gray-500">Esperado en caja</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowHandover(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Entregar Turno
              </Button>
              <Button 
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                onClick={() => setShowCloseShift(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Turno
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">Sin turno activo</h2>
            <p className="text-gray-500 mb-6">Inicia un turno para comenzar a operar la caja</p>
            <Button 
              onClick={() => setShowOpenShift(true)}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Abrir Turno
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turnos Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {recentShifts.map(shift => (
            <div key={shift.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{shift.cashierName}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(shift.startTime).toLocaleDateString('es-CO')} • {formatDuration(shift.startTime, shift.endTime)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(shift.totalSales || 0)}</div>
                <div className="text-sm text-gray-500">{shift.ordersCount} órdenes</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Open shift modal */}
      {showOpenShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5" />
                  Abrir Turno
                </CardTitle>
                <button onClick={() => setShowOpenShift(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Fondo inicial de caja</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={initialFund}
                    onChange={(e) => setInitialFund(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="100000"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Ingrese el monto con el que inicia el turno</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowOpenShift(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleOpenShift}
                >
                  Abrir Turno
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Close shift modal */}
      {showCloseShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <LogOut className="h-5 w-5" />
                  Cerrar Turno
                </CardTitle>
                <button onClick={() => setShowCloseShift(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Monto esperado en caja</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {formatCurrency((currentShift?.initialFund || 0) + (currentShift?.totalSales || 0))}
                </div>
              </div>

              <p className="text-sm text-gray-600">
                ¿Está seguro de cerrar el turno? Deberá realizar el arqueo de caja.
              </p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCloseShift(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleCloseShift}
                >
                  Ir a Arqueo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Handover modal */}
      {showHandover && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Entregar Turno
                </CardTitle>
                <button onClick={() => setShowHandover(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Entregar a</label>
                <select
                  value={handoverTo}
                  onChange={(e) => setHandoverTo(e.target.value)}
                  className="w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Seleccionar cajero...</option>
                  {cashiers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg text-sm">
                <p className="text-gray-600">
                  Al entregar el turno, el nuevo cajero continuará con el mismo fondo y ventas acumuladas.
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowHandover(false)}>
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleHandover}
                >
                  Entregar Turno
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
