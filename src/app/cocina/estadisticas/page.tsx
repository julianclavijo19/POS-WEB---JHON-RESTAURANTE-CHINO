'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, TrendingUp, Clock, Award, Flame, Calendar,
  ChefHat, ArrowUp, ArrowDown, Minus
} from 'lucide-react'

interface DailyStats {
  date: string
  completed: number
  cancelled: number
  avgTime: number
}

interface ProductStats {
  name: string
  count: number
  avgTime: number
  trend: 'up' | 'down' | 'stable'
}

interface StationStats {
  name: string
  completed: number
  avgTime: number
  efficiency: number
}

export default function EstadisticasPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today')
  
  const [overallStats, setOverallStats] = useState({
    totalCompleted: 156,
    totalCancelled: 8,
    avgPrepTime: 9.5,
    peakHour: '13:00',
    fastestItem: 'Ensalada César',
    slowestItem: 'Bandeja Paisa'
  })

  const [hourlyData, setHourlyData] = useState([
    { hour: '10:00', count: 8 },
    { hour: '11:00', count: 15 },
    { hour: '12:00', count: 28 },
    { hour: '13:00', count: 42 },
    { hour: '14:00', count: 35 },
    { hour: '15:00', count: 18 },
    { hour: '16:00', count: 12 },
    { hour: '17:00', count: 10 },
    { hour: '18:00', count: 22 },
    { hour: '19:00', count: 30 },
    { hour: '20:00', count: 25 }
  ])

  const [topProducts, setTopProducts] = useState<ProductStats[]>([
    { name: 'Arroz Chino Especial', count: 28, avgTime: 10, trend: 'up' },
    { name: 'Bandeja Paisa', count: 24, avgTime: 16, trend: 'stable' },
    { name: 'Pollo Agridulce', count: 22, avgTime: 12, trend: 'up' },
    { name: 'Lomo a la Parrilla', count: 18, avgTime: 14, trend: 'down' },
    { name: 'Ensalada César', count: 15, avgTime: 4, trend: 'stable' }
  ])

  const [stationStats, setStationStats] = useState<StationStats[]>([
    { name: 'Parrilla', completed: 48, avgTime: 14, efficiency: 92 },
    { name: 'Fritos', completed: 52, avgTime: 9, efficiency: 88 },
    { name: 'Cocina Fría', completed: 32, avgTime: 4, efficiency: 95 },
    { name: 'Postres', completed: 24, avgTime: 5, efficiency: 90 }
  ])

  useEffect(() => {
    setLoading(false)
  }, [])

  const maxHourlyCount = Math.max(...hourlyData.map(h => h.count))

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
          <h1 className="text-2xl font-bold text-gray-900">Estadísticas de Cocina</h1>
          <p className="text-gray-500 text-sm mt-1">Rendimiento y métricas de producción</p>
        </div>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                period === p 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
            >
              {p === 'today' ? 'Hoy' : p === 'week' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-green-600 text-sm font-medium">+12%</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-gray-900">{overallStats.totalCompleted}</div>
            <div className="text-sm text-gray-500">Platillos completados</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-red-600 text-sm font-medium">-5%</span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-gray-900">{overallStats.totalCancelled}</div>
            <div className="text-sm text-gray-500">Cancelaciones</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-gray-900">{overallStats.avgPrepTime} min</div>
            <div className="text-sm text-gray-500">Tiempo promedio</div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Flame className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-gray-900">{overallStats.peakHour}</div>
            <div className="text-sm text-gray-500">Hora pico</div>
          </div>
        </div>
      </div>

      {/* Hourly chart */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Producción por Hora</h2>
        <div className="flex items-end justify-between gap-2 h-48">
          {hourlyData.map((data, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="text-xs text-gray-500 mb-1">{data.count}</div>
              <div 
                className="w-full bg-gray-900 rounded-t transition-all hover:bg-gray-700"
                style={{ 
                  height: `${(data.count / maxHourlyCount * 100)}%`,
                  minHeight: '8px'
                }}
              ></div>
              <span className="text-xs text-gray-500 mt-2">{data.hour.split(':')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Platillos Más Preparados</h2>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.avgTime} min promedio</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{product.count}</span>
                  {product.trend === 'up' && <ArrowUp className="h-4 w-4 text-green-500" />}
                  {product.trend === 'down' && <ArrowDown className="h-4 w-4 text-red-500" />}
                  {product.trend === 'stable' && <Minus className="h-4 w-4 text-gray-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Station performance */}
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Rendimiento por Estación</h2>
          <div className="space-y-4">
            {stationStats.map((station, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{station.name}</span>
                  <span className="text-sm text-gray-500">
                    {station.completed} platillos • {station.avgTime} min avg
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        station.efficiency >= 90 ? 'bg-green-500' :
                        station.efficiency >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${station.efficiency}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${
                    station.efficiency >= 90 ? 'text-green-600' :
                    station.efficiency >= 75 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {station.efficiency}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-xl p-5 border border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <Award className="h-5 w-5" />
            <span className="font-medium">Más rápido</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{overallStats.fastestItem}</div>
          <div className="text-sm text-gray-500">4 min promedio de preparación</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center gap-2 text-orange-700 mb-2">
            <Clock className="h-5 w-5" />
            <span className="font-medium">Más elaborado</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{overallStats.slowestItem}</div>
          <div className="text-sm text-gray-500">16 min promedio de preparación</div>
        </div>
      </div>
    </div>
  )
}
