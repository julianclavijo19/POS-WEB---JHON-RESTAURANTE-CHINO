'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Search, Clock } from 'lucide-react'

interface Product {
  id: string
  name: string
  price: number
  description?: string
  prepTime?: number
  category: { name: string }
}

export default function BuscarPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  useEffect(() => {
    fetchProducts()
    const saved = localStorage.getItem('recentProductSearches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (res.ok) setProducts(await res.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length > 2 && !recentSearches.includes(query)) {
      const updated = [query, ...recentSearches.slice(0, 4)]
      setRecentSearches(updated)
      localStorage.setItem('recentProductSearches', JSON.stringify(updated))
    }
  }

  const filteredProducts = searchQuery.length > 0
    ? products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const groupedByCategory = filteredProducts.reduce((acc, product) => {
    const cat = product.category.name
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(product)
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
        <h1 className="text-2xl font-semibold text-gray-900">Buscar Producto</h1>
        <p className="text-gray-500 text-sm mt-1">Encuentra productos rápidamente</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o categoría..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
          className="w-full pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Recent searches */}
      {searchQuery.length === 0 && recentSearches.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-2">Búsquedas recientes</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, i) => (
              <button
                key={i}
                onClick={() => setSearchQuery(search)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {searchQuery.length > 0 && (
        <>
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No se encontraron productos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">
                {filteredProducts.length} resultados
              </p>

              {Object.entries(groupedByCategory).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {items.map(product => (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <h4 className="font-medium text-gray-900">{product.name}</h4>
                          {product.description && (
                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                          )}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-lg font-semibold text-gray-900">
                              {formatCurrency(product.price)}
                            </span>
                            {product.prepTime && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                {product.prepTime} min
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Quick categories when no search */}
      {searchQuery.length === 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-3">Categorías populares</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from(new Set(products.map(p => p.category.name))).map(cat => (
              <button
                key={cat}
                onClick={() => setSearchQuery(cat)}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <p className="font-medium text-gray-900">{cat}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {products.filter(p => p.category.name === cat).length} productos
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
