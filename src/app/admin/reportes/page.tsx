'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { 
  Users, MapPin, ShoppingBag, Clock,
  RefreshCw, Calendar, TrendingUp, Award
} from 'lucide-react'

type ReportTab = 'meseros' | 'areas' | 'productos' | 'horas'

interface WaiterReport {
  id: string
  name: string
  orders: number
  total: number
}

interface AreaReport {
  id: string
  name: string
  tables: { name: string; orders: number; total: number }[]
  totalOrders: number
  totalAmount: number
}

interface ProductReport {
  id: string
  name: string
  category: string
  quantity: number
  total: number
}

interface HourlyReport {
  hour: number
  orders: number
  total: number
}

export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('meseros')
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  
  const [waitersReport, setWaitersReport] = useState<WaiterReport[]>([])
  const [areasReport, setAreasReport] = useState<AreaReport[]>([])
  const [productsReport, setProductsReport] = useState<ProductReport[]>([])
  const [hourlyReport, setHourlyReport] = useState<HourlyReport[]>([])

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cajero/reportes?date=${dateFilter}`)
      if (res.ok) {
        const data = await res.json()
        setWaitersReport(data.waiters || [])
        setAreasReport(data.areas || [])
        setProductsReport(data.products || [])
        setHourlyReport(data.hourly || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const tabs = [
    { id: 'meseros' as ReportTab, label: 'Meseros', icon: Users },
    { id: 'areas' as ReportTab, label: 'Áreas y Mesas', icon: MapPin },
    { id: 'productos' as ReportTab, label: 'Productos', icon: ShoppingBag },
    { id: 'horas' as ReportTab, label: 'Ventas por Hora', icon: Clock },
  ]

  const formatHour = (hour: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:00 ${ampm}`
  }

  const maxHourlyTotal = Math.max(...hourlyReport.map(h => h.total), 1)

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
          <h1 className="text-2xl font-semibold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Análisis de ventas y rendimiento</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <button 
            onClick={fetchReports}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'meseros' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Rendimiento de Meseros</h2>
          {waitersReport.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos de meseros para esta fecha</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {waitersReport.map((waiter, index) => (
                    <div key={waiter.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index === 0 ? <Award className="h-4 w-4" /> : index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{waiter.name}</p>
                          <p className="text-sm text-gray-500">{waiter.orders} órdenes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(waiter.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'areas' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Rendimiento por Áreas y Mesas</h2>
          {areasReport.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos de áreas para esta fecha</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {areasReport.map((area) => (
                <Card key={area.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{area.name}</h3>
                          <p className="text-sm text-gray-500">{area.totalOrders} órdenes</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">{formatCurrency(area.totalAmount)}</p>
                    </div>
                    {area.tables.length > 0 && (
                      <div className="border-t border-gray-100 pt-4 space-y-2">
                        {area.tables.map((table) => (
                          <div key={table.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              <span className="text-gray-600">{table.name}</span>
                              <span className="text-gray-400">({table.orders} órdenes)</span>
                            </div>
                            <span className="text-gray-900">{formatCurrency(table.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'productos' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Productos Más Vendidos</h2>
          {productsReport.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos de productos para esta fecha</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {productsReport.slice(0, 20).map((product, index) => (
                    <div key={product.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index < 3 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(product.total)}</p>
                        <p className="text-sm text-gray-500">{product.quantity} unidades</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'horas' && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Ventas por Hora</h2>
          {hourlyReport.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay datos de ventas para esta fecha</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {hourlyReport.map((hour) => (
                    <div key={hour.hour} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-gray-600 text-right shrink-0">
                        {formatHour(hour.hour)}
                      </div>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden flex items-center gap-2">
                        <div 
                          className="h-full bg-gray-900 rounded-lg transition-all shrink-0"
                          style={{ width: `${(hour.total / maxHourlyTotal) * 100}%`, minWidth: hour.total > 0 ? '4px' : 0 }}
                        />
                        {hour.total > 0 && (
                          <span className="text-sm font-medium text-gray-900 shrink-0">
                            {formatCurrency(hour.total)}
                          </span>
                        )}
                      </div>
                      <div className="w-16 text-sm text-gray-500 text-right shrink-0">
                        {hour.orders} ord.
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Vendido</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(waitersReport.reduce((sum, w) => sum + w.total, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Meseros Activos</p>
                <p className="text-lg font-semibold text-gray-900">{waitersReport.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Productos Vendidos</p>
                <p className="text-lg font-semibold text-gray-900">
                  {productsReport.reduce((sum, p) => sum + p.quantity, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <MapPin className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Áreas Activas</p>
                <p className="text-lg font-semibold text-gray-900">{areasReport.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
