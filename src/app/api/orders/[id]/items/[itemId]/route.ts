import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTaxRate } from '@/lib/tax'

export const dynamic = 'force-dynamic'

// Obtener datos de la orden para imprimir
async function getOrderPrintData(orderId: string) {
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      table:tables(*,area:areas(*)),
      waiter:users!orders_waiter_id_fkey(id, name)
    `)
    .eq('id', orderId)
    .single()

  return order
}

// PATCH - Actualizar estado, cantidad o notas de un item
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: orderId, itemId } = await params
    const body = await request.json()
    const { status, quantity, notes } = body

    // Obtener el item actual ANTES de actualizar (para la corrección)
    const { data: currentItem } = await supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('id', itemId)
      .single()

    const previousQuantity = currentItem?.quantity

    // Construir objeto de actualización dinámicamente
    const updateData: any = {}
    if (status) updateData.status = status
    if (quantity !== undefined) {
      if (quantity < 1) {
        return NextResponse.json(
          { error: 'La cantidad debe ser al menos 1' },
          { status: 400 }
        )
      }
      updateData.quantity = quantity
    }
    if (notes !== undefined) updateData.notes = notes

    const { data: item, error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', itemId)
      .select(`*, product:products(*)`)
      .single()

    if (error) throw error

    // Si se cambió cantidad, recalcular totales de la orden e imprimir corrección
    if (quantity !== undefined && previousQuantity !== quantity) {
      // Actualizar el subtotal del item
      const newItemSubtotal = Number(item.unit_price) * quantity
      await supabase
        .from('order_items')
        .update({ subtotal: newItemSubtotal })
        .eq('id', itemId)

      const { data: allItems } = await supabase
        .from('order_items')
        .select('unit_price,quantity,subtotal')
        .eq('order_id', orderId)

      const { data: orderData } = await supabase
        .from('orders')
        .select('discount')
        .eq('id', orderId)
        .single()

      const newSubtotal = allItems?.reduce((sum, i) => sum + Number(i.subtotal), 0) || 0
      const taxRate = await getTaxRate()
      const newTax = newSubtotal * taxRate
      const discount = Number(orderData?.discount || 0)
      const newTotal = Math.max(0, newSubtotal + newTax - discount)

      await supabase
        .from('orders')
        .update({ subtotal: newSubtotal, tax: newTax, total: newTotal, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      // Imprimir corrección de cantidad se maneja desde el cliente (browser)
    }

    // Si se cambió estado, verificar si todos los items están listos
    if (status) {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('status')
        .eq('order_id', orderId)

      const { data: order } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()

      if (order && orderItems) {
        const allReady = orderItems.every(
          (i: any) => i.status === 'READY' || i.status === 'DELIVERED' || i.status === 'CANCELLED'
        )
        const anyPreparing = orderItems.some((i: any) => i.status === 'PREPARING')

        if (allReady && order.status === 'IN_KITCHEN') {
          await supabase
            .from('orders')
            .update({ status: 'READY', updated_at: new Date().toISOString() })
            .eq('id', orderId)
        } else if (anyPreparing && order.status !== 'IN_KITCHEN') {
          await supabase
            .from('orders')
            .update({ status: 'IN_KITCHEN', updated_at: new Date().toISOString() })
            .eq('id', orderId)
        }
      }
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Error al actualizar item' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar item de la orden
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: orderId, itemId } = await params

    // Obtener el item ANTES de eliminarlo (para la corrección)
    const { data: item } = await supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('id', itemId)
      .single()

    if (!item) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Obtener datos de la orden para imprimir
    const orderInfo = await getOrderPrintData(orderId)

    // Eliminar el item
    await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)

    // Recalcular totales
    const { data: remainingItems } = await supabase
      .from('order_items')
      .select('subtotal')
      .eq('order_id', orderId)

    const { data: order } = await supabase
      .from('orders')
      .select('discount')
      .eq('id', orderId)
      .single()

    if (order) {
      const newSubtotal = remainingItems?.reduce(
        (sum: number, i: any) => sum + Number(i.subtotal),
        0
      ) || 0
      const taxRate = await getTaxRate()
      const newTax = newSubtotal * taxRate
      const newTotal = newSubtotal + newTax - Number(order.discount || 0)

      await supabase
        .from('orders')
        .update({
          subtotal: newSubtotal,
          tax: newTax,
          total: Math.max(0, newTotal),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
    }

    // La impresión de corrección de eliminación se maneja desde el cliente (browser)

    return NextResponse.json({ message: 'Item eliminado' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Error al eliminar item' },
      { status: 500 }
    )
  }
}
