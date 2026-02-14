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

    // Encolar comanda para el print-server (polling)
    const tableName = order?.table?.name || (order?.table as any)?.number != null ? `Mesa ${(order?.table as any)?.number}` : 'N/A'
    const areaName = (order?.table as any)?.area?.name || 'N/A'
    const waiterName = order?.waiter?.name || 'N/A'
    const kitchenPayload = {
      mesa: tableName,
      mesero: waiterName,
      area: areaName,
      items: (order?.items || []).map((item: any) => ({
        nombre: item?.product?.name || 'Producto',
        cantidad: item?.quantity || 1,
        notas: item?.notes || '',
      })),
      total: Number(order?.total) || 0,
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    }
    await supabase
      .from('print_queue')
      .insert({ type: 'kitchen', payload: kitchenPayload })
      .then(({ error: eqErr }) => {
        if (eqErr) console.error('Error encolando impresión:', eqErr)
      })

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
