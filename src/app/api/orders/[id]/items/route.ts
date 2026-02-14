import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTaxRate } from '@/lib/tax'

export const dynamic = 'force-dynamic'

// POST - Agregar items a una orden existente
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json()

    // Soportar tanto un array de items como un item individual
    const items = body.items || [body]

    // Obtener la orden actual
    const { data: currentOrder, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !currentOrder) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // No permitir agregar items a órdenes pagadas o canceladas
    if (currentOrder.status === 'PAID' || currentOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `No se pueden agregar items a una orden ${currentOrder.status === 'PAID' ? 'pagada' : 'cancelada'}` },
        { status: 400 }
      )
    }

    // Obtener productos
    const productIds = items.map((i: any) => i.productId || i.product_id)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)

    // Calcular nuevos items
    let additionalSubtotal = 0
    const newItems = []

    for (const item of items) {
      const productId = item.productId || item.product_id
      const product = products?.find((p: any) => p.id === productId)
      if (product) {
        const itemSubtotal = Number(item.unit_price || product.price) * item.quantity
        additionalSubtotal += itemSubtotal
        newItems.push({
          order_id: orderId,
          product_id: productId,
          quantity: item.quantity,
          unit_price: item.unit_price || product.price,
          subtotal: itemSubtotal,
          notes: item.notes,
          status: 'PENDING',
        })
      }
    }

    // Crear los nuevos items
    const { data: createdItems } = await supabase
      .from('order_items')
      .insert(newItems)
      .select('*, product:products(*)')

    // Actualizar totales de la orden
    const taxRate = await getTaxRate()
    const newSubtotal = Number(currentOrder.subtotal) + additionalSubtotal
    const newTax = newSubtotal * taxRate
    const newTotal = newSubtotal + newTax - Number(currentOrder.discount || 0)

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        subtotal: newSubtotal,
        tax: newTax,
        total: newTotal,
        status: 'PENDING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select(`
        *,
        table:tables(*,area:areas(*)),
        waiter:users!orders_waiter_id_fkey(id, name),
        items:order_items(*,product:products(*))
      `)
      .single()

    if (error) throw error

    // La impresión de correcciones se maneja desde el cliente (browser)
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error adding items to order:', error)
    return NextResponse.json(
      { error: 'Error al agregar items' },
      { status: 500 }
    )
  }
}
