'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency, formatOrderNumber, getTimeDifference, formatMiles, parseMiles } from '@/lib/utils'
import {
  ArrowLeft, Clock, CheckCircle, Plus, AlertCircle, CreditCard,
  Receipt, Printer, DollarSign, Users, Send, ChefHat, Minus, Trash2, Edit2
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { printCorrectionTicket } from '@/lib/printer'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  notes?: string
  status: string
  priority?: string
  comensal?: number
  product: { id: string; name: string; price: number }
}

interface CartItem {
  id: string
  product: { id: string; name: string; price: number }
  quantity: number
  notes: string
  comensal?: number
  priority: 'normal' | 'urgent'
  sentToKitchen: boolean
  tiempo?: 'entrada' | 'plato_fuerte' | 'postre'
}

interface ProductOption {
  id: string
  name: string
  price: number
}

interface ProductCategory {
  id: string
  name: string
  color?: string
  products: ProductOption[]
}

interface Order {
  id: string
  orderNumber: string | number
  status: string
  type?: string
  notes?: string
  subtotal: number
  tax: number
  total: number
  customerCount?: number
  createdAt: string
  table?: { id: string; name: string } | null
  waiter: { id: string; name: string }
  items: OrderItem[]
}

export default function ComandaDetailCajeroPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [products, setProducts] = useState<ProductOption[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [addProductSearch, setAddProductSearch] = useState('')
  const [paymentData, setPaymentData] = useState({
    method: 'cash',
    tip: 0,
    discount: 0,
    discountType: 'percent' as 'percent' | 'fixed',
    receivedAmount: 0
  })
  const [addCart, setAddCart] = useState<CartItem[]>([])
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editQty, setEditQty] = useState(1)
  const [editNotes, setEditNotes] = useState('')

  useEffect(() => {
    // Si el ID es "nueva", redirigir a la página correcta
    if (orderId === 'nueva') {
      router.push('/cajero/tomar-pedido')
      return
    }
    fetchOrder()
    fetchProductCatalog()
    const interval = setInterval(fetchOrder, 10000)
    return () => clearInterval(interval)
  }, [orderId, router])

  useEffect(() => {
    if (showAddItem) {
      setAddProductSearch('')
      if (!selectedCategory && categories.length > 0) {
        setSelectedCategory(categories[0].id)
      }
    }
  }, [showAddItem, categories, selectedCategory])

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductCatalog = async () => {
    try {
      const res = await fetch('/api/categories?includeProducts=true')
      if (!res.ok) return

      const data = await res.json()
      const normalizedCategories: ProductCategory[] = (Array.isArray(data) ? data : []).map((category: any) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        products: (category.products || []).map((product: any) => ({
          id: product.id,
          name: product.name,
          price: Number(product.price) || 0,
        })),
      }))

      setCategories(normalizedCategories)
      setProducts(normalizedCategories.flatMap((category) => category.products))
      if (normalizedCategories.length > 0) {
        setSelectedCategory(normalizedCategories[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const markDelivered = async (itemId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' })
      })
      if (res.ok) {
        toast.success('Entregado')
        fetchOrder()
      }
    } catch (error) {
      toast.error('Error')
    }
  }

  const updateItemQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      deleteItem(itemId)
      return
    }
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      })
      if (res.ok) {
        toast.success('Cantidad actualizada')

        const item = order?.items.find(i => i.id === itemId)
        if (item && order) {
          printCorrectionTicket({
            tipo: 'CANTIDAD',
            mesa: order.table?.name || 'Caja',
            mesero: order.waiter?.name || 'Caja',
            items: [{
              nombre: item.product.name,
              cantidad: newQuantity,
              cantidadAnterior: item.quantity
            }]
          })
        }

        fetchOrder()
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const updateItemNotes = async (itemId: string, notes: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })
      if (res.ok) {
        toast.success('Notas actualizadas')

        const item = order?.items.find(i => i.id === itemId)
        if (item && order) {
          printCorrectionTicket({
            tipo: 'MODIFICACION',
            mesa: order.table?.name || 'Caja',
            mesero: order.waiter?.name || 'Caja',
            items: [{
              nombre: item.product.name,
              cantidad: item.quantity,
              notas: notes
            }]
          })
        }

        setEditingItem(null)
        fetchOrder()
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const deleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este item de la comanda?')) return
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        toast.success('Item eliminado')

        const item = order?.items.find(i => i.id === itemId)
        if (item && order) {
          printCorrectionTicket({
            tipo: 'ELIMINAR',
            mesa: order.table?.name || 'Caja',
            mesero: order.waiter?.name || 'Caja',
            items: [{
              nombre: item.product.name,
              cantidad: item.quantity
            }]
          })
        }

        fetchOrder()
      }
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  const startEditItem = (item: OrderItem) => {
    setEditingItem(item.id)
    setEditQty(item.quantity)
    setEditNotes(item.notes || '')
  }

  const saveItemEdit = async (itemId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: editQty, notes: editNotes })
      })
      if (res.ok) {
        toast.success('Item actualizado')

        const item = order?.items.find(i => i.id === itemId)
        if (item && order) {
          printCorrectionTicket({
            tipo: 'MODIFICACION',
            mesa: order.table?.name || 'Caja',
            mesero: order.waiter?.name || 'Caja',
            items: [{
              nombre: item.product.name,
              cantidad: editQty,
              notas: editNotes
            }]
          })
        }

        setEditingItem(null)
        fetchOrder()
      }
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const addToCart = (product: { id: string; name: string; price: number }) => {
    const itemId = `${product.id}-${Date.now()}`
    setAddCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && !item.notes)
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, {
        id: itemId,
        product,
        quantity: 1,
        notes: '',
        priority: 'normal',
        sentToKitchen: false
      }]
    })
  }

  const updateQuantity = (itemId: string, delta: number) => {
    setAddCart((prev) =>
      prev
        .map((item) =>
          item.id === itemId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const updateNewItemNotes = (itemId: string, notes: string) => {
    setAddCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, notes } : item
      )
    )
  }

  const updateItemPriority = (itemId: string, priority: 'normal' | 'urgent') => {
    setAddCart((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, priority } : item
      )
    )
  }

  const removeFromCart = (itemId: string) => {
    setAddCart((prev) => prev.filter((item) => item.id !== itemId))
  }

  const addItem = async (printCorrection = false) => {
    if (addCart.length === 0) return

    try {
      const formattedItems = addCart.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        notes: item.notes,
        priority: item.priority
      }))

      const payload: Record<string, any> = {
        items: formattedItems
      }

      if (printCorrection && order) {
        payload.printCorrection = true
        payload.correctionPayload = {
          tipo: 'AGREGAR',
          orderNumber: order.orderNumber,
          mesa: order.table?.name || 'Caja',
          mesero: order.waiter?.name || 'Caja',
          items: addCart.map((item) => ({
            nombre: item.product.name,
            cantidad: item.quantity,
            notas: item.notes
          }))
        }
      }

      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        toast.success(printCorrection ? 'Agregado e impresión en cola' : 'Agregado')

        setShowAddItem(false)
        setAddCart([])
        fetchOrder()
      }
    } catch (error) {
      toast.error('Error')
    }
  }

  const calculateFinalTotal = () => {
    if (!order) return 0
    let subtotal = order.subtotal
    if (paymentData.discount > 0) {
      subtotal = paymentData.discountType === 'percent'
        ? subtotal * (1 - paymentData.discount / 100)
        : subtotal - paymentData.discount
    }
    return Math.max(0, subtotal + (subtotal * 0.08) + paymentData.tip)
  }

  const handlePayment = async () => {
    const finalTotal = calculateFinalTotal()
    if (paymentData.method === 'cash' && paymentData.receivedAmount < finalTotal) {
      toast.error('Monto insuficiente')
      return
    }

    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentData.method,
          tip: paymentData.tip,
          discount: paymentData.discountType === 'percent'
            ? (order?.subtotal || 0) * (paymentData.discount / 100)
            : paymentData.discount,
          received_amount: paymentData.receivedAmount,
          change_amount: paymentData.method === 'cash' ? paymentData.receivedAmount - finalTotal : 0
        })
      })

      if (res.ok) {
        toast.success('Pago procesado')
        router.push('/cajero')
      } else {
        toast.error('Error al procesar')
      }
    } catch (error) {
      toast.error('Error')
    }
  }

  const getStatusInfo = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'pending'
    const map: Record<string, { label: string; icon: any; color: string }> = {
      pending: { label: 'Pendiente', icon: Clock, color: 'text-gray-500' },
      preparing: { label: 'Preparando', icon: ChefHat, color: 'text-gray-700' },
      in_kitchen: { label: 'En cocina', icon: ChefHat, color: 'text-gray-700' },
      ready: { label: 'Listo', icon: AlertCircle, color: 'text-gray-900' },
      delivered: { label: 'Entregado', icon: CheckCircle, color: 'text-gray-400' },
      served: { label: 'Servido', icon: CheckCircle, color: 'text-gray-400' }
    }
    return map[normalizedStatus] || map.pending
  }

  // Helper to get back URL
  const getBackUrl = () => {
    if (!order?.table) return '/cajero'
    return '/cajero/tomar-pedido'
  }

  // Helper to get order location name
  const getOrderLocationName = () => {
    if (order?.table?.name) return order.table.name
    if (order?.type === 'DELIVERY') return 'Domicilio'
    if (order?.type === 'TAKEOUT' || order?.type === 'TAKEAWAY') return 'Para Llevar'
    return 'Sin mesa'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Comanda no encontrada</p>
        <Link href="/cajero" className="text-gray-900 hover:underline mt-2 inline-block">Volver</Link>
      </div>
    )
  }

  const finalTotal = calculateFinalTotal()
  const changeAmount = paymentData.method === 'cash' && paymentData.receivedAmount > finalTotal
    ? paymentData.receivedAmount - finalTotal : 0

  const selectedCategoryProducts = selectedCategory
    ? categories.find((category) => category.id === selectedCategory)?.products || []
    : products

  const addModalProducts = addProductSearch.trim()
    ? products.filter((product) =>
      product.name.toLowerCase().includes(addProductSearch.toLowerCase())
    )
    : selectedCategoryProducts

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(getBackUrl())} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Comanda #{formatOrderNumber(order.orderNumber)} - {getOrderLocationName()}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-700">Atendido por: {order.waiter?.name || 'Sin asignar'}</span>
              <span>•</span>
              <Clock className="h-3 w-3" />
              <span>{getTimeDifference(order.createdAt)}</span>
              {order.customerCount && (
                <>
                  <span>•</span>
                  <Users className="h-3 w-3" />
                  <span>{order.customerCount}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status !== 'PAID' && order.status !== 'paid' && (
            <Button variant="outline" size="sm" onClick={() => setShowAddItem(true)}>
              <Plus className="h-4 w-4 mr-1" />Agregar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Mensaje cuando no hay items */}
          {order.items.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 mb-4">No hay items en esta comanda</p>
                <Button onClick={() => setShowAddItem(true)} className="bg-gray-900 hover:bg-gray-800 text-white">
                  <Plus className="h-4 w-4 mr-1" />Agregar primer item
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Mostrar todos los items de la orden */}
          {order.items.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-sm font-medium text-gray-500">Items del pedido ({order.items.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {order.items.map((item: OrderItem) => {
                  const isEditing = editingItem === item.id
                  const canEdit = order.status !== 'PAID' && order.status !== 'paid'
                  return (
                    <div key={item.id} className="p-3 border rounded-lg">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{item.product?.name || 'Producto'}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setEditQty(Math.max(1, editQty - 1))} className="p-1 hover:bg-gray-100 rounded">
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-8 text-center font-medium">{editQty}</span>
                              <button onClick={() => setEditQty(editQty + 1)} className="p-1 hover:bg-gray-100 rounded">
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Notas..."
                            className="w-full text-sm px-2 py-1 border rounded"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="flex-1">Cancelar</Button>
                            <Button size="sm" onClick={() => saveItemEdit(item.id)} className="flex-1 bg-gray-900 hover:bg-gray-800 text-white">Guardar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{item.quantity}x {item.product?.name || 'Producto'}</p>
                            {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatCurrency(item.unitPrice * item.quantity)}</span>
                            {canEdit && (
                              <>
                                <button onClick={() => startEditItem(item)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => deleteItem(item.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="sticky top-4 h-fit">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">IVA (8%)</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-lg font-semibold">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
            <div className="pt-3 border-t space-y-2">
              <Button variant="outline" className="w-full" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />Imprimir
              </Button>
              {order.table?.id && (
                <Link href={`/cajero/tomar-pedido/nueva?table=${order.table.id}`}>
                  <Button variant="outline" className="w-full">
                    <Send className="h-4 w-4 mr-2" />Nueva Comanda
                  </Button>
                </Link>
              )}
              <Button variant="outline" className="w-full" onClick={() => router.push(getBackUrl())}>
                <ArrowLeft className="h-4 w-4 mr-2" />Volver a Caja
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            <CardHeader className="border-b shrink-0 py-3">
              <div className="flex items-center justify-between">
                <CardTitle>Agregar Items</CardTitle>
                <button onClick={() => { setShowAddItem(false); setAddCart([]) }} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Productos */}
              <div className="w-full lg:w-2/3 p-4 flex flex-col h-1/2 lg:h-full border-b lg:border-b-0 lg:border-r border-gray-100">
                <div className="mb-4 shrink-0">
                  <input
                    type="text"
                    value={addProductSearch}
                    onChange={(e) => setAddProductSearch(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                {!addProductSearch && categories.length > 0 && (
                  <div className="flex overflow-x-auto gap-2 pb-2 mb-2 shrink-0">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategory(category.id)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors shrink-0 ${
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

                <div className="flex-1 overflow-y-auto pr-2 pb-16 lg:pb-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 pt-4">
                    {addModalProducts.map((product) => {
                      const cartItem = addCart.find(item => item.product.id === product.id)
                      const qty = cartItem ? cartItem.quantity : 0
                      return (
                        <div
                          key={product.id}
                          className={`cursor-pointer border rounded-lg p-3 hover:shadow-md transition-all active:scale-95 relative ${qty > 0 ? 'ring-2 ring-gray-900 bg-gray-50' : 'bg-white'}`}
                          onClick={() => addToCart(product)}
                        >
                          {qty > 0 && (
                            <span className="absolute -top-2 -right-2 bg-gray-900 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-10">
                              {qty}
                            </span>
                          )}
                          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">{product.name}</h3>
                          <p className="text-gray-900 font-semibold mt-1">
                            {formatCurrency(product.price)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  {addModalProducts.length === 0 && (
                    <div className="py-6 text-center text-sm text-gray-500">
                      No hay productos para mostrar
                    </div>
                  )}
                </div>
              </div>

              {/* Nuevos Items Cart */}
              <div className="w-full lg:w-1/3 flex flex-col h-1/2 lg:h-full bg-gray-50">
                <div className="p-3 border-b bg-white shrink-0 flex justify-between items-center">
                  <h3 className="font-medium">Nuevos Items</h3>
                  <span className="text-sm text-gray-500">{addCart.length} items</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {addCart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">
                      Selecciona productos para agregar
                    </p>
                  ) : (
                    addCart.map((item) => (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{item.product.name}</p>
                            <p className="text-gray-600 text-sm">{formatCurrency(item.product.price * item.quantity)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
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
                        <div className="mt-2 space-y-2">
                          <input
                            type="text"
                            placeholder="Notas especiales..."
                            value={item.notes}
                            onChange={(e) => updateNewItemNotes(item.id, e.target.value)}
                            className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-900"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 bg-white border-t shrink-0">
                  <div className="flex justify-between items-center text-lg font-semibold mb-4">
                    <span>Total a agregar</span>
                    <span>{formatCurrency(addCart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0))}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => { setShowAddItem(false); setAddCart([]) }}>
                        Cancelar
                      </Button>
                      <Button onClick={() => addItem(false)} disabled={addCart.length === 0} className="bg-gray-900 hover:bg-gray-800 text-white flex-1">
                        Sin imprimir
                      </Button>
                    </div>
                    <Button onClick={() => addItem(true)} disabled={addCart.length === 0} className="bg-gray-900 hover:bg-gray-800 text-white w-full">
                      Agregar e imprimir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Procesar Pago</CardTitle>
                <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash', label: 'Efectivo', icon: DollarSign },
                    { id: 'card', label: 'Tarjeta', icon: CreditCard },
                    { id: 'transfer', label: 'Transfer.', icon: Receipt }
                  ].map(m => (
                    <button key={m.id} onClick={() => setPaymentData({ ...paymentData, method: m.id })} className={`p-3 rounded-lg border text-center ${paymentData.method === m.id ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      <m.icon className="h-5 w-5 mx-auto mb-1" />
                      <span className="text-xs">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Descuento</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={paymentData.discount ? formatMiles(paymentData.discount) : ''}
                    onChange={(e) => {
                      const val = parseMiles(e.target.value)
                      if (/^[0-9]*$/.test(val)) setPaymentData({ ...paymentData, discount: parseFloat(val) || 0 })
                    }}
                    placeholder="0"
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <select value={paymentData.discountType} onChange={(e) => setPaymentData({ ...paymentData, discountType: e.target.value as any })} className="px-3 py-2 border rounded-lg">
                    <option value="percent">%</option>
                    <option value="fixed">$</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-2">Propina</label>
                <div className="flex gap-2">
                  {[0, 5000, 10000, 20000].map(tip => (
                    <button key={tip} onClick={() => setPaymentData({ ...paymentData, tip })} className={`flex-1 py-2 rounded-lg text-sm border ${paymentData.tip === tip ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      {tip === 0 ? 'Sin' : formatCurrency(tip)}
                    </button>
                  ))}
                </div>
              </div>

              {paymentData.method === 'cash' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Monto Recibido</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={paymentData.receivedAmount ? formatMiles(paymentData.receivedAmount) : ''}
                    onChange={(e) => {
                      const val = parseMiles(e.target.value)
                      if (/^[0-9]*$/.test(val)) setPaymentData({ ...paymentData, receivedAmount: parseFloat(val) || 0 })
                    }}
                    placeholder="0"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                {paymentData.discount > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Descuento</span>
                    <span>-{paymentData.discountType === 'percent' ? `${paymentData.discount}%` : formatCurrency(paymentData.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA (8%)</span>
                  <span>{formatCurrency(order.tax)}</span>
                </div>
                {paymentData.tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Propina</span>
                    <span>{formatCurrency(paymentData.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
                {changeAmount > 0 && (
                  <div className="flex justify-between text-lg font-semibold bg-gray-100 p-3 rounded-lg">
                    <span>Cambio</span>
                    <span>{formatCurrency(changeAmount)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPayment(false)}>Cancelar</Button>
                <Button className="flex-1 bg-gray-900 hover:bg-gray-800 text-white" onClick={handlePayment}>Confirmar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
