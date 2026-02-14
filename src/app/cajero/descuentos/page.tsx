'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency, formatMiles, parseMiles } from '@/lib/utils'
import {
  Percent, DollarSign, Plus, RefreshCw, Edit2, Trash2,
  CheckCircle, XCircle, Tag
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Discount {
  id: string
  name: string
  description: string | null
  discount_type: 'PERCENTAGE' | 'FIXED'
  value: number
  is_active: boolean
  requires_authorization: boolean
  times_used: number
  created_at: string
}

export default function DescuentosPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null)
  const [processing, setProcessing] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    value: '',
    requires_authorization: false
  })

  const fetchDiscounts = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/cajero/descuentos/configurar')
      if (!res.ok) throw new Error('Error al cargar datos')
      const data = await res.json()
      setDiscounts(data.discounts || [])
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar los descuentos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDiscounts()
  }, [fetchDiscounts])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      discount_type: 'PERCENTAGE',
      value: '',
      requires_authorization: false
    })
    setEditingDiscount(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (discount: Discount) => {
    setEditingDiscount(discount)
    setFormData({
      name: discount.name,
      description: discount.description || '',
      discount_type: discount.discount_type,
      value: discount.value.toString(),
      requires_authorization: discount.requires_authorization
    })
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.value) {
      toast.error('Complete los campos requeridos')
      return
    }

    const value = parseFloat(formData.value)
    if (isNaN(value) || value <= 0) {
      toast.error('Valor de descuento inválido')
      return
    }

    if (formData.discount_type === 'PERCENTAGE' && value > 100) {
      toast.error('El porcentaje no puede ser mayor a 100%')
      return
    }

    try {
      setProcessing(true)

      const url = editingDiscount
        ? `/api/cajero/descuentos/configurar/${editingDiscount.id}`
        : '/api/cajero/descuentos/configurar'

      const res = await fetch(url, {
        method: editingDiscount ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          discount_type: formData.discount_type,
          value: value,
          requires_authorization: formData.requires_authorization
        })
      })

      if (!res.ok) throw new Error('Error')

      toast.success(editingDiscount ? 'Descuento actualizado' : 'Descuento creado')
      setShowModal(false)
      resetForm()
      fetchDiscounts()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al guardar el descuento')
    } finally {
      setProcessing(false)
    }
  }

  const toggleDiscountStatus = async (discount: Discount) => {
    try {
      const res = await fetch(`/api/cajero/descuentos/configurar/${discount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !discount.is_active })
      })

      if (!res.ok) throw new Error('Error')
      toast.success(discount.is_active ? 'Descuento desactivado' : 'Descuento activado')
      fetchDiscounts()
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const deleteDiscount = async (discount: Discount) => {
    if (!confirm(`¿Eliminar el descuento "${discount.name}"?`)) return

    try {
      const res = await fetch(`/api/cajero/descuentos/configurar/${discount.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Error')
      toast.success('Descuento eliminado')
      fetchDiscounts()
    } catch (error) {
      toast.error('Error al eliminar')
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Descuentos</h1>
          <p className="text-gray-500 text-sm mt-1">Configuración de descuentos disponibles</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDiscounts}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Descuento
          </button>
        </div>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Los descuentos configurados aquí estarán disponibles al momento de cobrar una orden.
          </p>
        </CardContent>
      </Card>

      {/* Discounts List */}
      <Card>
        <CardContent className="p-0">
          {discounts.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium">No hay descuentos configurados</p>
              <p className="text-gray-500 text-sm mt-1">Crea descuentos para usar al cobrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Tipo</th>
                    <th className="px-4 py-3 font-medium text-right">Valor</th>
                    <th className="px-4 py-3 font-medium text-center">Veces Usado</th>
                    <th className="px-4 py-3 font-medium text-center">Estado</th>
                    <th className="px-4 py-3 font-medium text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {discounts.map(discount => (
                    <tr key={discount.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium text-gray-900">{discount.name}</span>
                          {discount.description && (
                            <p className="text-sm text-gray-500">{discount.description}</p>
                          )}
                          {discount.requires_authorization && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 mt-1 inline-block">
                              Requiere autorización
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${discount.discount_type === 'PERCENTAGE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          {discount.discount_type === 'PERCENTAGE' ? 'Porcentaje' : 'Monto Fijo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {discount.discount_type === 'PERCENTAGE'
                          ? `${discount.value}%`
                          : formatCurrency(discount.value)
                        }
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {discount.times_used}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleDiscountStatus(discount)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${discount.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                          {discount.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Inactivo
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(discount)}
                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => deleteDiscount(discount)}
                            className="p-2 rounded-lg border border-red-200 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingDiscount ? 'Editar Descuento' : 'Nuevo Descuento'}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Descuento Empleado"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'PERCENTAGE' })}
                    className={`p-3 rounded-lg border-2 transition-colors text-center ${formData.discount_type === 'PERCENTAGE'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <Percent className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Porcentaje</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, discount_type: 'FIXED' })}
                    className={`p-3 rounded-lg border-2 transition-colors text-center ${formData.discount_type === 'FIXED'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                  >
                    <DollarSign className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-sm font-medium">Monto Fijo</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor * {formData.discount_type === 'PERCENTAGE' ? '(%)' : '($)'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMiles(formData.value)}
                  onChange={(e) => { const v = parseMiles(e.target.value); if (/^[0-9]*$/.test(v)) setFormData({ ...formData, value: v }) }}
                  placeholder={formData.discount_type === 'PERCENTAGE' ? 'Ej: 10' : 'Ej: 5000'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requires_authorization}
                  onChange={(e) => setFormData({ ...formData, requires_authorization: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Requiere autorización de supervisor</span>
              </label>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                disabled={processing || !formData.name || !formData.value}
              >
                {processing ? 'Guardando...' : (editingDiscount ? 'Guardar Cambios' : 'Crear Descuento')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
