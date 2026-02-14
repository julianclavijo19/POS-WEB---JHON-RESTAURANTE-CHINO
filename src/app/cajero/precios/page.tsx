'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Search, Package, Barcode, X } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: number
  category: Category | string
  description?: string
  sku?: string
  is_active: boolean
  in_stock: boolean
}

export default function PreciosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // Helper para obtener nombre de categoría
  const getCategoryName = (category: Category | string): string => {
    if (typeof category === 'string') return category
    if (category && typeof category === 'object' && 'name' in category) return category.name
    return 'Sin categoría'
  }

  // Helper para obtener id de categoría
  const getCategoryId = (category: Category | string): string => {
    if (typeof category === 'string') return category
    if (category && typeof category === 'object' && 'id' in category) return category.id
    return ''
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || getCategoryId(product.category) === categoryFilter
    return matchesSearch && matchesCategory && product.is_active
  })

  // Agrupar productos por categoría
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const catName = getCategoryName(product.category)
    if (!acc[catName]) acc[catName] = []
    acc[catName].push(product)
    return acc
  }, {} as Record<string, Product[]>)

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
        <h1 className="text-2xl font-semibold text-gray-900">Consulta de Precios</h1>
        <p className="text-gray-500 text-sm mt-1">{filteredProducts.length} productos encontrados</p>
      </div>

      {/* Search and filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            autoFocus
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Products by category */}
      {Object.entries(groupedProducts).map(([categoryName, categoryProducts]) => (
        <Card key={categoryName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              {categoryName}
              <span className="text-sm font-normal text-gray-500">({categoryProducts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {categoryProducts.map(product => (
              <div 
                key={product.id} 
                className={`p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${
                  !product.in_stock ? 'opacity-50' : ''
                }`}
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{product.name}</span>
                      {!product.in_stock && (
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600">Agotado</span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{product.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    {formatCurrency(Number(product.price))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No se encontraron productos</p>
          </CardContent>
        </Card>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{selectedProduct.name}</CardTitle>
                <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {selectedProduct.description && (
                <p className="text-gray-600">{selectedProduct.description}</p>
              )}

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-500 mb-1">Precio</div>
                <div className="text-3xl font-semibold text-gray-900">
                  {formatCurrency(Number(selectedProduct.price))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-500">Categoría</div>
                  <div className="font-medium">{getCategoryName(selectedProduct.category)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-gray-500">Disponibilidad</div>
                  <div className={`font-medium ${selectedProduct.in_stock ? 'text-gray-900' : 'text-gray-500'}`}>
                    {selectedProduct.in_stock ? 'En stock' : 'Agotado'}
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setSelectedProduct(null)}
              >
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
