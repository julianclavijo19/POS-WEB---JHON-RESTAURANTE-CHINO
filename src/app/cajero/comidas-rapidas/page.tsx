'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Play, Square, DollarSign, Clock, 
  TrendingUp, Wallet, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  email: string
  role: string
}

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
}

export default function ComidasRapidasPage() {
  const [user, setUser] = useState<User | null>(null)
  const [shift, setShift] = useState<Shift | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Modals
  const [showOpenShift, setShowOpenShift] = useState(false)
  const [showCloseShift, setShowCloseShift] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  // Get user from cookie
  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }

    const sessionCookie = getCookie('session')
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(sessionCookie))
        setUser(sessionData)
      } catch (e) {
        console.error('Error parsing session:', e)
      }
    }
  }, [])

  // Fetch shift data
  const fetchShift = useCallback(async () => {
    try {
      const res = await fetch('/api/cajero/turno-comidas-rapidas')
      if (res.ok) {
        const data = await res.json()
        setShift(data.shift)
      }
    } catch (error) {
      console.error('Error fetching shift:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShift()
    const interval = setInterval(fetchShift, 30000)
    return () => clearInterval(interval)
  }, [fetchShift])

  // Listen for refresh event from keyboard shortcuts
  useEffect(() => {
    const handleRefresh = () => fetchShift()
    window.addEventListener('cajero-refresh', handleRefresh)
    return () => window.removeEventListener('cajero-refresh', handleRefresh)
  }, [fetchShift])

  // Open shift
  const handleOpenShift = async () => {
    if (!user) {
      toast.error('Usuario no identificado')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/cajero/turno-comidas-rapidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opening_amount: parseFloat(openingAmount) || 0,
          user_id: user.id
        })
      })

      if (res.ok) {
        const data = await res.json()
        setShift(data.shift)
        setShowOpenShift(false)
        setOpeningAmount('')
        toast.success('Turno de comidas rápidas abierto')
        fetchShift()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al abrir turno')
      }
    } catch (error) {
      toast.error('Error al abrir turno')
    } finally {
      setProcessing(false)
    }
  }

  // Close shift
  const handleCloseShift = async () => {
    if (!shift) return

    setProcessing(true)
    try {
      const res = await fetch('/api/cajero/turno-comidas-rapidas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: shift.id,
          closing_amount: parseFloat(closingAmount) || 0,
          notes: closingNotes
        })
      })

      if (res.ok) {
        const data = await res.json()
        setShift(null)
        setShowCloseShift(false)
        setClosingAmount('')
        setClosingNotes('')
        toast.success(`Turno cerrado. Ventas: ${formatCurrency(data.summary.total_sales)}`)
        fetchShift()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al cerrar turno')
      }
    } catch (error) {
      toast.error('Error al cerrar turno')
    } finally {
      setProcessing(false)
    }
  }

  const calculateSales = () => {
    if (!shift) return 0
    const closing = parseFloat(closingAmount) || 0
    const opening = shift.opening_amount || 0
    return Math.max(0, closing - opening)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // No shift open - show open shift screen
  if (!shift) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card className="border-gray-200">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wallet className="h-8 w-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Comidas Rápidas</h2>
            <p className="text-gray-500 mb-6">No hay turno abierto. Abre uno para comenzar.</p>
            <button
              onClick={() => setShowOpenShift(true)}
              className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <Play className="h-5 w-5" />
              Abrir Turno
            </button>
          </CardContent>
        </Card>

        {/* Modal abrir turno */}
        {showOpenShift && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Abrir Turno - Comidas Rápidas</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Efectivo Inicial</label>
                  <input
                    type="number"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0"
                    autoFocus
                    className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Dinero que el empleado se lleva para dar cambio</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowOpenShift(false)}
                    className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleOpenShift}
                    disabled={processing}
                    className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {processing ? 'Abriendo...' : 'Abrir Turno'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h1 className="text-2xl font-semibold text-gray-900">Comidas Rápidas</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Turno abierto desde {new Date(shift.opened_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        <button
          onClick={() => setShowCloseShift(true)}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium flex items-center gap-2 hover:bg-red-100 transition-colors"
        >
          <Square className="h-4 w-4" />
          Cerrar Turno
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <DollarSign className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Efectivo Inicial</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(shift.opening_amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-xl">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Tiempo Activo</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((Date.now() - new Date(shift.opened_at).getTime()) / 1000 / 60)} min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Información</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• El empleado se lleva <strong>{formatCurrency(shift.opening_amount)}</strong> en efectivo inicial.</p>
            <p>• Cuando regrese, cierre el turno e ingrese el total del dinero que trajo.</p>
            <p>• Las ventas se calculan automáticamente restando el efectivo inicial.</p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-gray-300 text-sm">Efectivo Entregado</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(shift.opening_amount)}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-gray-400" />
          </div>
        </CardContent>
      </Card>

      {/* Close Shift Modal */}
      {showCloseShift && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cerrar Turno - Comidas Rápidas</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Efectivo inicial entregado</span>
                  <span className="font-medium">{formatCurrency(shift.opening_amount)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">¿Cuánto dinero trajo el empleado?</label>
                <input
                  type="number"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">Total de efectivo que regresó el empleado</p>
              </div>

              {closingAmount && (
                <div className={`p-4 rounded-lg ${
                  calculateSales() >= 0
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Ventas del día</p>
                      <p className={`text-2xl font-bold ${calculateSales() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(calculateSales())}
                      </p>
                    </div>
                    {calculateSales() >= 0 && (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatCurrency(parseFloat(closingAmount) || 0)} (total) - {formatCurrency(shift.opening_amount)} (inicial)
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones del día..."
                  className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCloseShift(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCloseShift}
                  disabled={processing || !closingAmount}
                  className="flex-1 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {processing ? 'Cerrando...' : 'Cerrar Turno'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
