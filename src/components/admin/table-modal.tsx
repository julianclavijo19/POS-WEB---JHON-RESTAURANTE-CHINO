'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Area {
  id: string
  name: string
}

interface Table {
  id: string
  name: string
  number: number
  capacity: number
  area_id: string
  status: 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING'
  is_active: boolean
}

interface TableModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  table: Table | null
  areas: Area[]
}

export function TableModal({ isOpen, onClose, onSave, table, areas }: TableModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    number: 1,
    capacity: 4,
    area_id: '',
    status: 'FREE' as 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (table) {
      setFormData({
        name: table.name,
        number: table.number,
        capacity: table.capacity,
        area_id: table.area_id,
        status: table.status,
        is_active: table.is_active,
      })
    } else {
      setFormData({
        name: '',
        number: 1,
        capacity: 4,
        area_id: areas[0]?.id || '',
        status: 'FREE',
        is_active: true,
      })
    }
  }, [table, areas])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = table ? `/api/tables/${table.id}` : '/api/tables'
      const method = table ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          number: parseInt(formData.number.toString()),
          capacity: parseInt(formData.capacity.toString()),
        }),
      })

      if (res.ok) {
        toast.success(table ? 'Mesa actualizada' : 'Mesa creada')
        onSave()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al guardar')
      }
    } catch (error) {
      toast.error('Error al guardar mesa')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {table ? 'Editar Mesa' : 'Nueva Mesa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la mesa
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Mesa Ventana, Mesa VIP..."
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Numero
              </label>
              <input
                type="number"
                min="1"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 1 })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacidad
              </label>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area
            </label>
            <select
              value={formData.area_id}
              onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
            >
              <option value="">Seleccionar area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value="FREE">Libre</option>
              <option value="OCCUPIED">Ocupada</option>
              <option value="RESERVED">Reservada</option>
              <option value="CLEANING">En limpieza</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Mesa activa
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando...' : (table ? 'Guardar Cambios' : 'Crear Mesa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
