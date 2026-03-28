'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, Minus, Trash2, Search,
  Send, RefreshCw, ArrowLeft, Coffee, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  price: number
  description?: string
}

interface Category {
  id: string
  name: string
  color?: string
  products: Product[]
}

interface CartItem {
  id: string
  product: Product
  quantity: number
}

interface Shift {
  id: string
  status: string
}

export default function MeseroMostradorPage() {
  const [shift, setShift] = useState<Shift | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftLoading, setShiftLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [lastOrder, setLastOrder] = useState<{ orderNumber: string; total: number } | null>(null)

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop()?.split(';').shift()
      return null
    }
    const sessionCookie = getCookie('session')
    if (sessionCookie) {
      try {
        const sessionData = JSON.parse(decodeURIComponent(sessionCookie))
        setUserId(sessionData.id)
      } catch (e) {
        console.error('Error:', e)
      }
    }
  }, [])

  const fetchShift = useCallback(async () => {
    try {
      const res = await fetch('/api/cajero/turno?summary=true')
      if (res.ok) {
        const data = await res.json()
        setShift(data.isOpen ? data.shift : null)
      } else {
        setShift(prev => prev !== undefined ? prev : null)
      }
    } catch (error) {
      console.error('Error:', error)
      setShift(prev => prev !== undefined ? prev : null)
    } finally {
      setShiftLoading(false)
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/orders/mostrador')
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
        if (data.length > 0) setSelectedCategory(data[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShift()
    fetchProducts()
  }, [fetchShift, fetchProducts])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { id: `${product.id}-${Date.now()}`, product, quantity: 1 }]
    })
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId))
  }

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Agrega productos al carrito')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/orders/mostrador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashier_id: userId,
          items: cart.map(item => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        }),
      })

      if (res.ok) {
        const order = await res.json()
        setLastOrder({ orderNumber: order.orderNumber, total: order.total })
        setCart([])
        toast.success(`Venta registrada: ${order.orderNumber}`)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al registrar venta')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al registrar venta')
    } finally {
      setSending(false)
    }
  }

  const filteredProducts = searchQuery
    ? categories.flatMap(c => c.products).filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : categories.find(c => c.id === selectedCategory)?.products || []

  if (loading || shiftLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/mesero" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Mostrador</h1>
            <p className="text-gray-500 text-sm mt-1">Ventas rápidas de bebidas y fritos</p>
          </div>
        </div>
        <button onClick={fetchProducts} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Aviso sin turno abierto */}
      {!shift && !shiftLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <Coffee className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">No hay turno abierto en caja. Puedes registrar la venta y el cajero la cobrará cuando abra turno.</p>
        </div>
      )}

      {/* Última venta */}
      {lastOrder && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Venta registrada: #{lastOrder.orderNumber}</p>
              <p className="text-sm text-green-600">{formatCurrency(lastOrder.total)} - Pendiente cobro en caja</p>
            </div>
          </div>
          <button onClick={() => setLastOrder(null)} className="text-green-500 hover:text-green-700 text-xs">Cerrar</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Categories */}
          {!searchQuery && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Products grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pt-3 px-1 pb-1">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product.id === product.id)
              const qty = cartItem ? cartItem.quantity : 0
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:shadow-md transition-all active:scale-98 relative ${qty > 0 ? 'ring-2 ring-gray-900 bg-gray-50' : ''}`}
                  onClick={() => addToCart(product)}
                >
                  {qty > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-10">
                      {qty}
                    </span>
                  )}
                  <CardContent className="p-4">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                    <p className="text-gray-900 font-semibold mt-2">{formatCurrency(product.price)}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? 'No se encontraron productos' : 'No hay productos en esta categoría'}
            </p>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-amber-500" />
                  Mostrador
                </CardTitle>
                <span className="text-sm text-gray-500">{cart.length} items</span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">
                  Selecciona productos para agregar
                </p>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{item.product.name}</p>
                          <p className="text-gray-600 text-sm">
                            {formatCurrency(item.product.price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-gray-100 rounded">
                            <Minus className="h-4 w-4 text-gray-600" />
                          </button>
                          <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-gray-100 rounded">
                            <Plus className="h-4 w-4 text-gray-600" />
                          </button>
                          <button onClick={() => removeFromCart(item.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-gray-900">{formatCurrency(total)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  El cobro se realizará en la caja principal
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  onClick={handleSubmit}
                  disabled={cart.length === 0 || sending}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Registrar Venta
                </Button>

                {cart.length > 0 && (
                  <Button onClick={() => setCart([])} variant="outline" className="w-full">
                    Limpiar Carrito
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
