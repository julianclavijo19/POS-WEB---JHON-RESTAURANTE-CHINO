import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateOrderNumber } from '@/lib/utils'
import { getTaxRate } from '@/lib/tax'

export const dynamic = 'force-dynamic'

// Categorías permitidas en mostrador (Bebidas y Fritos)
const MOSTRADOR_CATEGORY_NAMES = ['Bebidas', 'Fritos']

// GET - Obtener productos de mostrador (solo Bebidas y Fritos)
export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        color,
        products:products(id, name, price, description, is_available)
      `)
      .in('name', MOSTRADOR_CATEGORY_NAMES)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    // Filtrar solo productos disponibles
    const filtered = (categories || []).map(cat => ({
      ...cat,
      products: (cat.products || []).filter((p: any) => p.is_available !== false)
    }))

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Error fetching mostrador products:', error)
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 })
  }
}

// POST - Crear orden de mostrador (sin mesa, sin impresión de cocina)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, cashier_id, notes } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'No hay productos en la orden' }, { status: 400 })
    }

    const orderNumber = generateOrderNumber()

    // Obtener precios de productos
    const productIds = items.map((i: any) => i.product_id)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, price')
      .in('id', productIds)

    if (productsError) throw productsError

    // Calcular totales
    let subtotal = 0
    const orderItems = []

    for (const item of items) {
      const product = products?.find((p: any) => p.id === item.product_id)
      if (product) {
        const itemSubtotal = Number(product.price) * item.quantity
        subtotal += itemSubtotal
        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal: itemSubtotal,
          notes: item.notes || null,
        })
      }
    }

    const taxRate = await getTaxRate()
    const tax = subtotal * taxRate
    const total = subtotal + tax

    // Crear orden de mostrador - DELIVERED directamente, sin mesa
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        table_id: null,
        waiter_id: cashier_id || null,
        type: 'COUNTER',
        status: 'DELIVERED',
        notes: notes || 'Venta mostrador',
        subtotal,
        tax,
        total,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Crear items
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId)

    if (itemsError) throw itemsError

    // Sin impresión de cocina - ventas por mostrador no necesitan comanda
    // El pago se registra cuando el cajero cobra, no al crear la orden

    return NextResponse.json({
      id: order.id,
      orderNumber: order.order_number,
      total: Number(order.total),
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      items: orderItems.map(item => ({
        ...item,
        productName: products?.find(p => p.id === item.product_id)?.name
      }))
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating counter order:', error)
    return NextResponse.json({ error: 'Error al crear venta de mostrador' }, { status: 500 })
  }
}
