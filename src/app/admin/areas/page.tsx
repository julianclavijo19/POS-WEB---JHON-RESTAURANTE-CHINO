'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { AreaModal } from '@/components/admin/area-modal'

interface Area {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  tables?: { id: string }[]
}

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)

  useEffect(() => {
    fetchAreas()
  }, [])

  const fetchAreas = async () => {
    try {
      const res = await fetch('/api/areas')
      const data = await res.json()
      setAreas(data)
    } catch (error) {
      toast.error('Error al cargar areas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Esta seguro de eliminar esta area? Las mesas asociadas tambien seran eliminadas.')) return

    try {
      const res = await fetch(`/api/areas/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Area eliminada')
        fetchAreas()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al eliminar')
      }
    } catch (error) {
      toast.error('Error al eliminar area')
    }
  }

  const handleToggleStatus = async (area: Area) => {
    try {
      const res = await fetch(`/api/areas/${area.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...area, is_active: !area.is_active }),
      })
      if (res.ok) {
        toast.success(area.is_active ? 'Area desactivada' : 'Area activada')
        fetchAreas()
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleEdit = (area: Area) => {
    setSelectedArea(area)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setSelectedArea(null)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedArea(null)
  }

  const handleSave = () => {
    fetchAreas()
    handleModalClose()
  }

  const filteredAreas = areas.filter((area) =>
    area.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalTables = areas.reduce((acc, area) => acc + (area.tables?.length || 0), 0)

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
          <h1 className="text-2xl font-semibold text-gray-900">Areas</h1>
          <p className="text-sm text-gray-500 mt-1">Distribucion del restaurante</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Area
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Areas</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{areas.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Mesas</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totalTables}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Areas Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Area
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripcion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mesas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAreas.map((area) => (
                <tr key={area.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{area.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {area.description || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{area.tables?.length || 0} mesas</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(area)}
                      className={`px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors ${
                        area.is_active 
                          ? 'bg-gray-900 text-white hover:bg-gray-700' 
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      }`}
                    >
                      {area.is_active ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(area)}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(area.id)}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredAreas.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No se encontraron areas</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AreaModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleSave}
        area={selectedArea}
      />
    </div>
  )
}
