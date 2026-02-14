'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Trash2,
  Edit,
  Save,
  X,
  TrendingDown,
  History,
  RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Ingredient {
  id: string
  name: string
  unit: string
  current_stock: number
  min_stock: number
  cost_per_unit: number
  supplier: string | null
  category: string | null
  is_active: boolean
  last_updated: string
}

interface Waste {
  id: string
  ingredient_id: string
  quantity: number
  reason: string
  recorded_by: string
  created_at: string
  ingredient?: Ingredient
}

interface StockMovement {
  id: string
  ingredient_id: string
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTE'
  quantity: number
  notes: string | null
  created_at: string
  ingredient?: Ingredient
}

export default function InventoryPage() {
  // Crear cliente de Supabase para el navegador
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [wastes, setWastes] = useState<Waste[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'stock' | 'alerts' | 'waste' | 'movements'>('stock')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showWasteModal, setShowWasteModal] = useState(false)
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    unit: 'kg',
    current_stock: 0,
    min_stock: 0,
    cost_per_unit: 0,
    supplier: '',
    category: ''
  })
  const [wasteForm, setWasteForm] = useState({
    ingredient_id: '',
    quantity: 0,
    reason: ''
  })
  const [movementForm, setMovementForm] = useState({
    ingredient_id: '',
    type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT',
    quantity: 0,
    notes: ''
  })

  const units = ['kg', 'g', 'lb', 'oz', 'l', 'ml', 'unidad', 'docena', 'caja']
  const categories = ['Carnes', 'Verduras', 'Frutas', 'Lácteos', 'Granos', 'Condimentos', 'Bebidas', 'Otros']
  const wasteReasons = ['Vencido', 'Dañado', 'Derrame', 'Error de inventario', 'Otro']

  const loadData = useCallback(async () => {
    if (!supabase) {
      toast.error('Error de conexión con la base de datos')
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      
      // Cargar ingredientes
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (ingredientsError) throw ingredientsError
      setIngredients(ingredientsData || [])

      // Cargar mermas recientes
      const { data: wastesData, error: wastesError } = await supabase
        .from('ingredient_waste')
        .select('*, ingredient:ingredients(*)')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!wastesError) setWastes(wastesData || [])

      // Cargar movimientos
      const { data: movementsData, error: movementsError } = await supabase
        .from('stock_movements')
        .select('*, ingredient:ingredients(*)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (!movementsError) setMovements(movementsData || [])

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveIngredient = async () => {
    if (!supabase) return
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('ingredients')
          .update({
            ...formData,
            last_updated: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
        toast.success('Ingrediente actualizado')
      } else {
        const { error } = await supabase
          .from('ingredients')
          .insert({
            ...formData,
            is_active: true,
            last_updated: new Date().toISOString()
          })

        if (error) throw error
        toast.success('Ingrediente agregado')
      }
      
      setShowModal(false)
      setEditingId(null)
      setFormData({
        name: '',
        unit: 'kg',
        current_stock: 0,
        min_stock: 0,
        cost_per_unit: 0,
        supplier: '',
        category: ''
      })
      loadData()
    } catch (error) {
      console.error('Error saving ingredient:', error)
      toast.error('Error al guardar')
    }
  }

  const handleDeleteIngredient = async (id: string) => {
    if (!supabase) return
    if (!confirm('¿Eliminar este ingrediente?')) return
    
    try {
      const { error } = await supabase
        .from('ingredients')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
      toast.success('Ingrediente eliminado')
      loadData()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error al eliminar')
    }
  }

  const handleSaveWaste = async () => {
    if (!supabase) return
    
    try {
      // Registrar merma
      const { error: wasteError } = await supabase
        .from('ingredient_waste')
        .insert({
          ingredient_id: wasteForm.ingredient_id,
          quantity: wasteForm.quantity,
          reason: wasteForm.reason,
          recorded_by: 'Admin', // TODO: usar usuario actual
          created_at: new Date().toISOString()
        })

      if (wasteError) throw wasteError

      // Actualizar stock
      const ingredient = ingredients.find(i => i.id === wasteForm.ingredient_id)
      if (ingredient) {
        const { error: updateError } = await supabase
          .from('ingredients')
          .update({ 
            current_stock: Math.max(0, ingredient.current_stock - wasteForm.quantity),
            last_updated: new Date().toISOString()
          })
          .eq('id', wasteForm.ingredient_id)

        if (updateError) throw updateError
      }

      // Registrar movimiento
      await supabase.from('stock_movements').insert({
        ingredient_id: wasteForm.ingredient_id,
        type: 'WASTE',
        quantity: -wasteForm.quantity,
        notes: `Merma: ${wasteForm.reason}`,
        created_at: new Date().toISOString()
      })

      toast.success('Merma registrada')
      setShowWasteModal(false)
      setWasteForm({ ingredient_id: '', quantity: 0, reason: '' })
      loadData()
    } catch (error) {
      console.error('Error saving waste:', error)
      toast.error('Error al registrar merma')
    }
  }

  const handleSaveMovement = async () => {
    if (!supabase) return
    
    try {
      const ingredient = ingredients.find(i => i.id === movementForm.ingredient_id)
      if (!ingredient) return

      const quantity = movementForm.type === 'OUT' ? -movementForm.quantity : movementForm.quantity
      
      // Registrar movimiento
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          ingredient_id: movementForm.ingredient_id,
          type: movementForm.type,
          quantity: quantity,
          notes: movementForm.notes,
          created_at: new Date().toISOString()
        })

      if (movementError) throw movementError

      // Actualizar stock
      let newStock = ingredient.current_stock
      if (movementForm.type === 'IN') {
        newStock += movementForm.quantity
      } else if (movementForm.type === 'OUT') {
        newStock = Math.max(0, newStock - movementForm.quantity)
      } else {
        newStock = movementForm.quantity // ADJUSTMENT
      }

      const { error: updateError } = await supabase
        .from('ingredients')
        .update({ 
          current_stock: newStock,
          last_updated: new Date().toISOString()
        })
        .eq('id', movementForm.ingredient_id)

      if (updateError) throw updateError

      toast.success('Movimiento registrado')
      setShowMovementModal(false)
      setMovementForm({ ingredient_id: '', type: 'IN', quantity: 0, notes: '' })
      loadData()
    } catch (error) {
      console.error('Error saving movement:', error)
      toast.error('Error al registrar movimiento')
    }
  }

  const lowStockIngredients = ingredients.filter(i => i.current_stock <= i.min_stock)

  const filteredIngredients = ingredients.filter(i =>
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Control de stock, alertas y mermas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMovementModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <TrendingDown className="h-4 w-4" />
            Movimiento
          </button>
          <button
            onClick={() => setShowWasteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Registrar Merma
          </button>
          <button
            onClick={() => {
              setEditingId(null)
              setFormData({
                name: '',
                unit: 'kg',
                current_stock: 0,
                min_stock: 0,
                cost_per_unit: 0,
                supplier: '',
                category: ''
              })
              setShowModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Agregar Ingrediente
          </button>
        </div>
      </div>

      {/* Alert for low stock */}
      {lowStockIngredients.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">
              {lowStockIngredients.length} producto(s) con stock bajo
            </span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            {lowStockIngredients.map(i => i.name).join(', ')}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'stock', label: 'Stock', icon: Package },
            { id: 'alerts', label: `Alertas (${lowStockIngredients.length})`, icon: AlertTriangle },
            { id: 'waste', label: 'Mermas', icon: Trash2 },
            { id: 'movements', label: 'Movimientos', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <>
          {/* Search */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar ingredientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
          </div>

          {/* Ingredients Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingrediente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costo/U</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredIngredients.map(ingredient => (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{ingredient.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ingredient.category || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-medium ${
                        ingredient.current_stock <= ingredient.min_stock ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {ingredient.current_stock} {ingredient.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {ingredient.min_stock} {ingredient.unit}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-900">
                      {formatCurrency(ingredient.cost_per_unit)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ingredient.supplier || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(ingredient.id)
                            setFormData({
                              name: ingredient.name,
                              unit: ingredient.unit,
                              current_stock: ingredient.current_stock,
                              min_stock: ingredient.min_stock,
                              cost_per_unit: ingredient.cost_per_unit,
                              supplier: ingredient.supplier || '',
                              category: ingredient.category || ''
                            })
                            setShowModal(true)
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIngredient(ingredient.id)}
                          className="p-2 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredIngredients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No hay ingredientes registrados
              </div>
            )}
          </div>
        </>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {lowStockIngredients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay alertas de stock bajo
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingrediente</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock Mínimo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lowStockIngredients.map(ingredient => (
                  <tr key={ingredient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{ingredient.name}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-red-600">
                      {ingredient.current_stock} {ingredient.unit}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {ingredient.min_stock} {ingredient.unit}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600">
                      -{ingredient.min_stock - ingredient.current_stock} {ingredient.unit}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        ingredient.current_stock === 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ingredient.current_stock === 0 ? 'Agotado' : 'Stock Bajo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Waste Tab */}
      {activeTab === 'waste' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingrediente</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Razón</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {wastes.map(waste => (
                <tr key={waste.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(waste.created_at)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {(waste.ingredient as any)?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right text-red-600 font-medium">
                    -{waste.quantity} {(waste.ingredient as any)?.unit || ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{waste.reason}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{waste.recorded_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {wastes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay mermas registradas
            </div>
          )}
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingrediente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movements.map(movement => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{formatDate(movement.created_at)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {(movement.ingredient as any)?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      movement.type === 'IN' ? 'bg-green-100 text-green-800' :
                      movement.type === 'OUT' ? 'bg-red-100 text-red-800' :
                      movement.type === 'WASTE' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {movement.type === 'IN' ? 'Entrada' :
                       movement.type === 'OUT' ? 'Salida' :
                       movement.type === 'WASTE' ? 'Merma' : 'Ajuste'}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${
                    movement.quantity > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity} {(movement.ingredient as any)?.unit || ''}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{movement.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {movements.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay movimientos registrados
            </div>
          )}
        </div>
      )}

      {/* Ingredient Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editingId ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Ej: Pollo"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {units.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                  <input
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Costo por Unidad</label>
                <input
                  type="number"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="Nombre del proveedor"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveIngredient}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800"
              >
                <Save className="h-4 w-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Registrar Merma</h2>
              <button onClick={() => setShowWasteModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingrediente</label>
                <select
                  value={wasteForm.ingredient_id}
                  onChange={(e) => setWasteForm({ ...wasteForm, ingredient_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Seleccionar ingrediente</option>
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  value={wasteForm.quantity}
                  onChange={(e) => setWasteForm({ ...wasteForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Razón</label>
                <select
                  value={wasteForm.reason}
                  onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Seleccionar razón</option>
                  {wasteReasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowWasteModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWaste}
                disabled={!wasteForm.ingredient_id || !wasteForm.quantity || !wasteForm.reason}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {showMovementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Registrar Movimiento</h2>
              <button onClick={() => setShowMovementModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingrediente</label>
                <select
                  value={movementForm.ingredient_id}
                  onChange={(e) => setMovementForm({ ...movementForm, ingredient_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Seleccionar ingrediente</option>
                  {ingredients.map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.current_stock} {i.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimiento</label>
                <select
                  value={movementForm.type}
                  onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="IN">Entrada (Compra/Recepción)</option>
                  <option value="OUT">Salida (Uso/Venta)</option>
                  <option value="ADJUSTMENT">Ajuste de Inventario</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowMovementModal(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMovement}
                disabled={!movementForm.ingredient_id || !movementForm.quantity}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
