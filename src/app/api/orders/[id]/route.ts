import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Función para transformar orden a camelCase
function transformOrder(order: any) {
  if (!order) return null
  
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    type: order.type,
    notes: order.notes,
    customerCount: order.customer_count,
    subtotal: Number(order.subtotal) || 0,
    tax: Number(order.tax) || 0,
    total: Number(order.total) || 0,
    discount: Number(order.discount) || 0,
    tip: Number(order.tip) || 0,
    paymentMethod: order.payment_method,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    paidAt: order.paid_at,
    table: order.table ? {
      id: order.table.id,
      name: order.table.name || `Mesa ${order.table.number}`,
      number: order.table.number,
      capacity: order.table.capacity,
      status: order.table.status,
      area: order.table.area
    } : null,
    waiter: order.waiter ? {
      id: order.waiter.id,
      name: order.waiter.name
    } : null,
    items: (order.items || []).map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price) || 0,
      subtotal: Number(item.subtotal) || 0,
      notes: item.notes,
      status: item.status || 'pending',
      priority: item.priority,
      comensal: item.comensal,
      product: item.product ? {
        id: item.product.id,
        name: item.product.name,
        price: Number(item.product.price) || 0,
        description: item.product.description,
        prepTime: item.product.prep_time
      } : null
    })),
    payment: order.payment
  }
}

// GET - Obtener una orden específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(*,area:areas(*)),
        waiter:users!orders_waiter_id_fkey(id, name),
        items:order_items(*,product:products(*)),
        payment:payments(*)
      `)
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(transformOrder(order))
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Error al obtener orden' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar orden
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, discount, notes, expectedUpdatedAt } = body

    // Verificar concurrencia: si se envía expectedUpdatedAt, comparar con el valor actual
    // Esto previene que dos meseras modifiquen el mismo pedido simultáneamente
    if (expectedUpdatedAt) {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('updated_at, status')
        .eq('id', id)
        .single()

      if (currentOrder && currentOrder.updated_at !== expectedUpdatedAt) {
        return NextResponse.json(
          { 
            error: 'Este pedido fue modificado por otro usuario. Por favor, recargue y vuelva a intentar.',
            code: 'CONCURRENT_MODIFICATION',
            currentUpdatedAt: currentOrder.updated_at
          },
          { status: 409 }
        )
      }
    }

    // Validar transiciones de estado permitidas
    if (status) {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status')
        .eq('id', id)
        .single()

      if (currentOrder) {
        const invalidTransitions: Record<string, string[]> = {
          'PAID': ['PENDING', 'IN_KITCHEN'], // No se puede volver atrás desde PAID
          'CANCELLED': ['PENDING', 'IN_KITCHEN', 'READY'], // No se puede volver atrás desde CANCELLED
        }
        const blocked = invalidTransitions[currentOrder.status]
        if (blocked?.includes(status)) {
          return NextResponse.json(
            { error: `No se puede cambiar de ${currentOrder.status} a ${status}` },
            { status: 400 }
          )
        }
      }
    }

    const updateData: any = { updated_at: new Date().toISOString() }

    if (status) {
      updateData.status = status
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (discount !== undefined) {
      updateData.discount = discount

      // Obtener orden para recalcular
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('subtotal, tax')
        .eq('id', id)
        .single()

      if (existingOrder) {
        const newTotal = Number(existingOrder.subtotal) + Number(existingOrder.tax) - discount
        updateData.total = Math.max(0, newTotal)
      }
    }

    const { data: order, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        table:tables(*,area:areas(*)),
        waiter:users!orders_waiter_id_fkey(id, name),
        items:order_items(*,product:products(*)),
        payment:payments(*)
      `)
      .single()

    if (error) throw error

    // Si la orden se paga o cancela, liberar la mesa
    if ((status === 'PAID' || status === 'CANCELLED') && order.table_id) {
      // Verificar si hay otras órdenes activas en la mesa
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', order.table_id)
        .neq('id', id)
        .in('status', ['PENDING', 'IN_KITCHEN', 'READY', 'DELIVERED'])

      if (count === 0) {
        await supabase
          .from('tables')
          .update({ status: 'FREE' })
          .eq('id', order.table_id)
      }
    }

    return NextResponse.json(transformOrder(order))
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Error al actualizar orden' },
      { status: 500 }
    )
  }
}
