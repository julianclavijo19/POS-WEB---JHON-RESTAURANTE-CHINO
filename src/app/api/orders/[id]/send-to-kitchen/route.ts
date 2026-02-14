import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Enviar orden a cocina
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('📥 Recibida petición send-to-kitchen')

  try {
    const { id } = await params
    console.log('📋 Order ID:', id)

    // Verificar estado actual de la orden
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single()

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    if (['PAID', 'CANCELLED'].includes(currentOrder.status)) {
      return NextResponse.json(
        { error: `No se puede enviar a cocina una orden ${currentOrder.status === 'PAID' ? 'pagada' : 'cancelada'}` },
        { status: 400 }
      )
    }

    if (currentOrder.status === 'IN_KITCHEN') {
      return NextResponse.json(
        { error: 'Esta orden ya está en cocina' },
        { status: 400 }
      )
    }

    // Actualizar orden
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'IN_KITCHEN',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('❌ Error actualizando orden:', updateError)
      throw updateError
    }
    console.log('✓ Orden actualizada a IN_KITCHEN')

    // Actualizar items a PREPARING
    const { error: itemsError } = await supabase
      .from('order_items')
      .update({ status: 'PREPARING' })
      .eq('order_id', id)
      .eq('status', 'PENDING')

    if (itemsError) {
      console.error('❌ Error actualizando items:', itemsError)
    }
    console.log('✓ Items actualizados a PREPARING')

    // Obtener orden actualizada
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(*,area:areas(*)),
        waiter:users!orders_waiter_id_fkey(id, name),
        items:order_items(*,product:products(*))
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('❌ Error obteniendo orden:', error)
      throw error
    }
    console.log('✓ Orden obtenida:', order?.id)

    // La impresión se maneja desde el cliente (browser) que está en la red local
    console.log('✅ Enviando respuesta exitosa')
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error sending order to kitchen:', error)
    return NextResponse.json(
      { error: 'Error al enviar a cocina' },
      { status: 500 }
    )
  }
}
