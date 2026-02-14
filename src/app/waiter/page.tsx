'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, Badge } from '@/components/ui'
import { cn, formatCurrency } from '@/lib/utils'
import { Users, Clock, UtensilsCrossed } from 'lucide-react'

interface Area {
  id: string
  name: string
  tables: Table[]
}

interface Table {
  id: string
  number: number
  name: string
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE'
  orders: { id: string; total: number; status: string }[]
}

export default function WaiterTablesPage() {
  const router = useRouter()
  const [areas, setAreas] = useState<Area[]>([])
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 15000) // Actualizar cada 15s
    return () => clearInterval(interval)
  }, [])

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/areas')
      const data = await res.json()
      setAreas(data)
    } catch (error) {
      console.error('Error fetching tables:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableClick = (table: Table) => {
    if (table.status === 'MAINTENANCE') return

    if (table.status === 'AVAILABLE') {
      // Crear nueva orden
      router.push(`/waiter/order/new?tableId=${table.id}`)
    } else if (table.orders.length > 0) {
      // Ver orden existente
      const activeOrder = table.orders.find(
        (o) => !['PAID', 'CANCELLED'].includes(o.status)
      )
      if (activeOrder) {
        router.push(`/waiter/order/${activeOrder.id}`)
      } else {
        router.push(`/waiter/order/new?tableId=${table.id}`)
      }
    }
  }

  const statusConfig = {
    AVAILABLE: {
      label: 'Disponible',
      color: 'bg-green-100 border-green-500 text-green-800',
      icon: '✓',
    },
    OCCUPIED: {
      label: 'Ocupada',
      color: 'bg-red-100 border-red-500 text-red-800',
      icon: '●',
    },
    RESERVED: {
      label: 'Reservada',
      color: 'bg-yellow-100 border-yellow-500 text-yellow-800',
      icon: '◐',
    },
    MAINTENANCE: {
      label: 'Mantenimiento',
      color: 'bg-gray-100 border-gray-400 text-gray-600',
      icon: '⚠',
    },
  }

  const allTables = areas.flatMap((area) =>
    area.tables.map((t) => ({ ...t, areaName: area.name }))
  )

  const filteredTables =
    selectedArea === 'all'
      ? allTables
      : allTables.filter(
          (t) => areas.find((a) => a.name === t.areaName)?.id === selectedArea
        )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
          <p className="text-gray-500">Selecciona una mesa para tomar el pedido</p>
        </div>

        {/* Filtro de áreas */}
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedArea('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              selectedArea === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            Todas
          </button>
          {areas.map((area) => (
            <button
              key={area.id}
              onClick={() => setSelectedArea(area.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedArea === area.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              )}
            >
              {area.name}
            </button>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2 text-sm">
            <div
              className={cn(
                'w-4 h-4 rounded border-2',
                config.color.split(' ').slice(0, 2).join(' ')
              )}
            />
            <span className="text-gray-600">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Grid de mesas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredTables.map((table) => {
          const config = statusConfig[table.status]
          const activeOrder = table.orders.find(
            (o) => !['PAID', 'CANCELLED'].includes(o.status)
          )

          return (
            <Card
              key={table.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg border-2',
                config.color,
                table.status === 'MAINTENANCE' && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => handleTableClick(table)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold mb-1">{table.number}</div>
                <div className="text-xs mb-2 opacity-75">{table.name}</div>

                <div className="flex items-center justify-center gap-1 text-xs mb-2">
                  <Users className="h-3 w-3" />
                  <span>{table.capacity}</span>
                </div>

                {activeOrder && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <div className="text-xs font-medium">
                      {formatCurrency(activeOrder.total)}
                    </div>
                  </div>
                )}

                <Badge
                  variant={
                    table.status === 'AVAILABLE'
                      ? 'success'
                      : table.status === 'OCCUPIED'
                      ? 'danger'
                      : table.status === 'RESERVED'
                      ? 'warning'
                      : 'default'
                  }
                  className="mt-2"
                >
                  {config.label}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No hay mesas en esta área</p>
        </div>
      )}
    </div>
  )
}
