'use client'

import { useState, useEffect } from 'react'
import { 
  Flame, Salad, Utensils, IceCream, Pause, Play, AlertTriangle,
  Clock, CheckCircle, Settings, Users, ChefHat
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Station {
  id: string
  name: string
  icon: any
  status: 'active' | 'paused' | 'closed'
  chef?: string
  pendingItems: number
  preparingItems: number
  avgTime: number
  todayCompleted: number
}

export default function EstacionesPage() {
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)

  useEffect(() => {
    fetchStations()
  }, [])

  const fetchStations = async () => {
    try {
      setStations([
        {
          id: 'parrilla',
          name: 'Parrilla',
          icon: Flame,
          status: 'active',
          chef: 'Roberto M.',
          pendingItems: 5,
          preparingItems: 3,
          avgTime: 12,
          todayCompleted: 45
        },
        {
          id: 'cocina_fria',
          name: 'Cocina Fría',
          icon: Salad,
          status: 'active',
          chef: 'Laura G.',
          pendingItems: 2,
          preparingItems: 1,
          avgTime: 5,
          todayCompleted: 32
        },
        {
          id: 'fritos',
          name: 'Fritos',
          icon: Utensils,
          status: 'active',
          chef: 'Miguel A.',
          pendingItems: 4,
          preparingItems: 2,
          avgTime: 8,
          todayCompleted: 58
        },
        {
          id: 'postres',
          name: 'Postres',
          icon: IceCream,
          status: 'paused',
          chef: 'Carmen S.',
          pendingItems: 1,
          preparingItems: 0,
          avgTime: 4,
          todayCompleted: 18
        }
      ])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStationStatus = (stationId: string) => {
    setStations(stations.map(s => {
      if (s.id === stationId) {
        const newStatus = s.status === 'active' ? 'paused' : 'active'
        toast.success(`Estación ${newStatus === 'active' ? 'activada' : 'pausada'}`)
        return { ...s, status: newStatus }
      }
      return s
    }))
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estaciones de Cocina</h1>
        <p className="text-gray-500 text-sm mt-1">Gestión y estado de las áreas de trabajo</p>
      </div>

      {/* Stations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stations.map(station => (
          <div 
            key={station.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden border-2 ${
              station.status === 'paused' ? 'border-yellow-400' :
              station.status === 'closed' ? 'border-gray-400' : 'border-transparent'
            }`}
          >
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              station.status === 'paused' ? 'bg-yellow-50' :
              station.status === 'closed' ? 'bg-gray-100' : 'bg-gray-50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  station.status === 'active' ? 'bg-gray-900 text-white' :
                  station.status === 'paused' ? 'bg-yellow-400 text-white' : 'bg-gray-400 text-white'
                }`}>
                  <station.icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{station.name}</h2>
                  {station.chef && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <ChefHat className="h-3 w-3" />
                      {station.chef}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggleStationStatus(station.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                  station.status === 'active' 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                {station.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Reanudar
                  </>
                )}
              </button>
            </div>

            {station.status === 'paused' && (
              <div className="px-6 py-2 bg-yellow-100 text-yellow-800 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Estación en pausa - No recibe nuevas comandas
              </div>
            )}

            {/* Stats */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-gray-900">{station.pendingItems}</div>
                  <div className="text-sm text-gray-500">Pendientes</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600">{station.preparingItems}</div>
                  <div className="text-sm text-gray-500">En preparación</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <Clock className="h-4 w-4" />
                    Tiempo promedio
                  </span>
                  <span className="font-medium">{station.avgTime} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="h-4 w-4" />
                    Completados hoy
                  </span>
                  <span className="font-medium">{station.todayCompleted}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
              <button className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-white">
                Ver comandas
              </button>
              <button className="p-2 border rounded-lg text-gray-700 hover:bg-white">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add station */}
      <button className="w-full p-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
        + Agregar nueva estación
      </button>
    </div>
  )
}
