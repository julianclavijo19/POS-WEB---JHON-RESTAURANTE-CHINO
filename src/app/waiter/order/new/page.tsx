'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, Card, CardContent, Input, Badge, Modal } from '@/components/ui'
import { formatCurrency, cn } from '@/lib/utils'
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Send,
  Search,
  ShoppingCart,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Category {
  id: string
  name: string
  icon: string | null
  color: string
  products: Product[]
}

interface Product {
  id: string
  name: string
  price: number
  description: string | null
}

interface CartItem {
  product: Product
  quantity: number
  notes: string
}

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const tableId = searchParams.get('tableId')

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [tableName, setTableName] = useState('')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<number | null>(null)
  const [itemNotes, setItemNotes] = useState('')

  useEffect(() => {
    fetchCategories()
    if (tableId) {
      fetchTableInfo()
    }
  }, [tableId])

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      setCategories(data)
      if (data.length > 0) {
        setSelectedCategory(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTableInfo = async () => {
    try {
      const res = await fetch(`/api/tables`)
      const data = await res.json()
      const table = data.find((t: any) => t.id === tableId)
      if (table) {
        setTableName(table.name || `Mesa ${table.number}`)
      }
    } catch (error) {
      console.error('Error fetching table:', error)
    }
  }

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1, notes: '' }]
    })
    toast.success(`${product.name} agregado`)
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const openNotesModal = (index: number) => {
    setSelectedItemForNotes(index)
    setItemNotes(cart[index].notes)
    setShowNotesModal(true)
  }

  const saveNotes = () => {
    if (selectedItemForNotes !== null) {
      setCart((prev) =>
        prev.map((item, i) =>
          i === selectedItemForNotes ? { ...item, notes: itemNotes } : item
        )
      )
    }
    setShowNotesModal(false)
    setItemNotes('')
    setSelectedItemForNotes(null)
  }

  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      toast.error('Agrega productos al pedido')
      return
    }

    setSending(true)
    try {
      // Crear la orden
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          waiterId: session?.user?.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            notes: item.notes,
          })),
        }),
      })

      if (!orderRes.ok) throw new Error('Error creating order')
      const order = await orderRes.json()

      // Enviar a cocina
      const kitchenRes = await fetch(`/api/orders/${order.id}/send-to-kitchen`, {
        method: 'POST',
      })

      if (!kitchenRes.ok) throw new Error('Error sending to kitchen')
      // La comanda se encola en send-to-kitchen; el print-server la imprime por polling
      toast.success('¡Pedido enviado a cocina!')
      router.push('/waiter')
    } catch (error) {
      toast.error('Error al enviar pedido')
      console.error(error)
    } finally {
      setSending(false)
    }
  }

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  )

  const currentCategory = categories.find((c) => c.id === selectedCategory)

  const filteredProducts = search
    ? categories
      .flatMap((c) => c.products)
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : currentCategory?.products || []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Panel izquierdo - Productos */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white border-b">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" onClick={() => router.push('/waiter')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Nuevo Pedido</h1>
              <p className="text-sm text-gray-500">{tableName || 'Para llevar'}</p>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categorías */}
        {!search && (
          <div className="flex overflow-x-auto gap-2 p-4 bg-gray-50 border-b">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors',
                  selectedCategory === category.id
                    ? 'text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                )}
                style={{
                  backgroundColor:
                    selectedCategory === category.id ? category.color : undefined,
                }}
              >
                {category.icon && <span>{category.icon}</span>}
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Productos */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const inCart = cart.find((item) => item.product.id === product.id)
              return (
                <Card
                  key={product.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    inCart && 'ring-2 ring-blue-500'
                  )}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="font-medium text-sm mb-1 line-clamp-2">
                      {product.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600">
                        {formatCurrency(product.price)}
                      </span>
                      {inCart && (
                        <Badge variant="info">{inCart.quantity}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No se encontraron productos</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel derecho - Carrito */}
      <div className="w-full md:w-96 bg-white border-l flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="font-bold">Pedido</h2>
            <Badge>{cart.length} productos</Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Agrega productos al pedido</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={item.product.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.product.name}</div>
                    <div className="text-sm text-gray-500">
                      {formatCurrency(item.product.price)}
                    </div>
                    {item.notes && (
                      <div className="text-xs text-blue-600 mt-1">
                        Nota: {item.notes}
                      </div>
                    )}
                    <button
                      onClick={() => openNotesModal(index)}
                      className="text-xs text-blue-600 hover:underline mt-1"
                    >
                      {item.notes ? 'Editar nota' : 'Agregar nota'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-medium">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="p-1 rounded-full bg-gray-200 hover:bg-gray-300"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 rounded-full text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer con total y botón */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-xl font-bold">{formatCurrency(subtotal)}</span>
          </div>
          <Button
            variant="success"
            size="lg"
            className="w-full"
            onClick={handleSendToKitchen}
            disabled={cart.length === 0 || sending}
            isLoading={sending}
          >
            <Send className="h-5 w-5 mr-2" />
            Enviar a Cocina
          </Button>
        </div>
      </div>

      {/* Modal de notas */}
      <Modal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        title="Nota del producto"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            placeholder="Ej: Sin cebolla, término medio..."
            value={itemNotes}
            onChange={(e) => setItemNotes(e.target.value)}
          />
          <Button className="w-full" onClick={saveNotes}>
            Guardar Nota
          </Button>
        </div>
      </Modal>
    </div>
  )
}
