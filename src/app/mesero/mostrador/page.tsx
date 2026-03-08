'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, Minus, Trash2, ShoppingCart, Send,
  Search, Coffee, Package, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

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
  product: Product
  quantity: number
}

export default function MeseroMostradorPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
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
    fetchProducts()
  }, [fetchProducts])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId))
  }

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Mostrador</h1>
        <p className="text-sm text-gray-500 mt-1">Ventas rápidas de bebidas y fritos</p>
      </div>

      {lastOrder && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Venta: {lastOrder.orderNumber}</p>
              <p className="text-sm text-green-600">{formatCurrency(lastOrder.total)}</p>
            </div>
          </div>
          <button onClick={() => setLastOrder(null)} className="text-green-500 hover:text-green-700 text-xs">Cerrar</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
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

          {!searchQuery && (
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category.name === 'Bebidas' ? <Coffee className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                  {category.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              const cartItem = cart.find(item => item.product.id === product.id)
              const qty = cartItem ? cartItem.quantity : 0
              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`relative bg-white border rounded-lg p-4 text-left hover:shadow-md transition-all active:scale-[0.98] ${
                    qty > 0 ? 'ring-2 ring-gray-900 bg-gray-50' : 'border-gray-200'
                  }`}
                >
                  {qty > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-10">
                      {qty}
                    </span>
                  )}
                  <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-gray-900 font-semibold mt-2 text-sm">{formatCurrency(product.price)}</p>
                </button>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? 'No se encontraron productos' : 'No hay productos'}
            </p>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-lg sticky top-4">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gray-700" />
                <h2 className="font-semibold text-gray-900">Carrito</h2>
              </div>
              <span className="text-sm text-gray-500">{totalItems} items</span>
            </div>
            <div className="p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">Selecciona productos</p>
              ) : (
                <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.product.price)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded-md hover:bg-gray-100 text-gray-500">
                          <Plus className="h-3 w-3" />
                        </button>
                        <button onClick={() => removeFromCart(item.product.id)} className="p-1 rounded-md hover:bg-red-50 text-red-400 ml-1">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <div className="pt-3 border-t border-gray-200 space-y-3">
                  <div className="flex justify-between items-center font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-lg text-gray-900">{formatCurrency(total)}</span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Registrando...' : 'Registrar Venta'}
                  </button>
                  <button onClick={() => setCart([])} className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                    Vaciar carrito
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
