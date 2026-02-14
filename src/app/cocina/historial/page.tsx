'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  History, Search, Calendar, Clock, Check, X, User, MapPin,
  Filter, ChefHat, AlertTriangle, Package, RefreshCw
} from 'lucide-react'

interface CompletedItem {
  id: string
  orderNumber: number
  tableName: string
  waiterName: string
  itemName: string
  quantity: number
  modifications: string[]
  station: string
  prepTime: number
  completedAt: string
  completedBy: string
  status: 'completed' | 'cancelled'
}

export default function HistorialPage() {
  const [items, setItems] = useState<CompletedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stationFilter, setStationFilter] = useState('all')

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/cocina/historial')
      if (res.ok) {
        const orders = await res.json()
        
        // Transformar los datos de órdenes a items individuales
        const transformedItems: CompletedItem[] = []
        
        orders.forEach((order: any) => {
          (order.items || []).forEach((item: any) => {
            transformedItems.push({
              id: `${order.id}-${item.product?.name || 'item'}`,
              orderNumber: order.order_number,
              tableName: order.table?.name || 'Para llevar',
              waiterName: order.waiter?.name || 'Sin asignar',
              itemName: item.product?.name || 'Producto',
              quantity: item.quantity,
              modifications: item.notes ? [item.notes] : [],
              station: item.product?.category?.name || 'General',
              prepTime: item.product?.prep_time || 0,
              completedAt: order.updated_at || order.created_at,
              completedBy: 'Cocina',
              status: order.status === 'CANCELLED' ? 'cancelled' : 'completed'
            })
          })
        })
        
        setItems(transformedItems)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }

  const getTimeAgo = (dateStr: string) => {
    const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (minutes < 60) return `hace ${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `hace ${hours}h ${minutes % 60}m`
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.orderNumber.toString().includes(searchQuery) ||
                         item.tableName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDate = !dateFilter || item.completedAt.startsWith(dateFilter)
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesStation = stationFilter === 'all' || item.station === stationFilter
    return matchesSearch && matchesDate && matchesStatus && matchesStation
  })

  const completedCount = items.filter(i => i.status === 'completed').length
  const cancelledCount = items.filter(i => i.status === 'cancelled').length
  const avgPrepTime = Math.round(
    items.filter(i => i.status === 'completed').reduce((sum, i) => sum + i.prepTime, 0) / completedCount || 0
  )

  const stations = [...new Set(items.map(i => i.station))]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial de Cocina</h1>
        <p className="text-gray-500 text-sm mt-1">Platillos preparados durante el turno</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{completedCount}</div>
          <div className="text-sm text-gray-500">Completados</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-red-500">{cancelledCount}</div>
          <div className="text-sm text-gray-500">Cancelados</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{avgPrepTime} min</div>
          <div className="text-sm text-gray-500">Tiempo promedio</div>
        </div>
      </div>

      {/* Filters */}
      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar platillo, orden, mesa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">Todos los estados</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>
          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="all">Todas las estaciones</option>
            {stations.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* History list */}
      <div className="bg-white rounded-xl overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No hay platillos en el historial</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredItems.map(item => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      item.status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {item.status === 'completed' ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{item.quantity}x</span>
                        <span className="font-semibold text-gray-900">{item.itemName}</span>
                        <span className="text-sm text-gray-500">#{item.orderNumber}</span>
                      </div>
                      
                      {item.modifications.length > 0 && (
                        <div className="mt-1 text-sm text-orange-600">
                          Mods: {item.modifications.join(', ')}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.tableName}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.waiterName}
                        </span>
                        <span className="flex items-center gap-1">
                          <ChefHat className="h-3 w-3" />
                          {item.completedBy}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {item.station}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-mono">{formatTime(item.completedAt)}</div>
                    <div className="text-sm text-gray-500">{getTimeAgo(item.completedAt)}</div>
                    {item.status === 'completed' && (
                      <div className="text-sm text-gray-500 flex items-center justify-end gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {item.prepTime} min
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
