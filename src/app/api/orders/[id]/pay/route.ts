import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Función para generar número de factura único (con retry para evitar colisiones)
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  for (let attempt = 0; attempt < 5; attempt++) {
    // Contar facturas de hoy
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString().slice(0, 10))
      .lt('created_at', new Date(today.getTime() + 86400000).toISOString().slice(0, 10))
    
    const sequence = ((count || 0) + 1 + attempt).toString().padStart(4, '0')
    const invoiceNumber = `INV-${dateStr}-${sequence}`
    
    // Verificar que no exista
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('invoice_number', invoiceNumber)
      .single()
    
    if (!existing) {
      return invoiceNumber
    }
  }
  
  // Fallback con timestamp si todos los intentos fallan
  return `INV-${dateStr}-${Date.now().toString().slice(-6)}`
}

// POST - Procesar pago de una orden
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params
    const body = await request.json()
    const { 
      method,
      payment_method, // Support both formats
      amount, 
      reference, 
      cashRegisterId,
      received_amount,
      change_amount,
      tip = 0,
      discount = 0,
      discount_type,
      split_payments // Array of {method, amount} for split payments
    } = body

    // Obtener la orden
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que no esté ya pagada
    if (order.status === 'PAID') {
      return NextResponse.json(
        { error: 'Esta orden ya fue pagada' },
        { status: 400 }
      )
    }

    // Calcular monto final con descuento y propina
    let finalAmount = amount || Number(order.total)
    
    if (discount > 0) {
      finalAmount = Number(order.subtotal) + Number(order.tax) - discount + tip
    } else if (tip > 0) {
      finalAmount = Number(order.total) + tip
    }

    // Handle split payments
    if (split_payments && Array.isArray(split_payments) && split_payments.length > 0) {
      const totalSplit = split_payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      
      if (totalSplit < finalAmount) {
        return NextResponse.json(
          { error: `Monto insuficiente. Total: ${finalAmount}, Pagado: ${totalSplit}` },
          { status: 400 }
        )
      }

      // Create multiple payments
      const payments = []
      for (const sp of split_payments) {
        const insertRow: Record<string, unknown> = {
          order_id: orderId,
          amount: sp.amount,
          method: (sp.method || 'CASH').toString().toUpperCase(),
          received_amount: sp.amount,
          change_amount: 0,
        }
        if (cashRegisterId != null && cashRegisterId !== '') {
          insertRow.cash_register_id = cashRegisterId
        }
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert(insertRow)
          .select()
          .single()

        if (paymentError) {
          console.error('Error creating split payment:', paymentError)
          throw paymentError
        }
        payments.push(payment)
      }

      // Create invoice with combined payment methods
      try {
        const invoiceNumber = await generateInvoiceNumber()
        const methodSummary = split_payments.map((p: any) => p.method.toUpperCase()).join('+')
        
        await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            order_id: orderId,
            payment_id: payments[0].id, // Reference first payment
            table_id: order.table_id,
            subtotal: Number(order.subtotal),
            discount: discount,
            tax: Number(order.tax),
            total: finalAmount,
            tip: tip,
            payment_method: methodSummary
          })
      } catch (invoiceError) {
        console.warn('Could not create invoice:', invoiceError)
      }

      // Update order
      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ 
          status: 'PAID', 
          discount: discount,
          discount_type: discount_type,
          total: finalAmount,
          paid_at: new Date().toISOString(),
          payment_method: 'SPLIT', // Mark as split payment
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId)

      if (updateOrderError) {
        console.error('Error updating order:', updateOrderError)
      }

      // Encolar apertura de caja monedera (print-server lo procesa por polling)
      await supabase.from('print_queue').insert({ type: 'cash_drawer', payload: {} })

      // Release table if applicable
      if (order.table_id) {
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('table_id', order.table_id)
          .neq('id', orderId)
          .in('status', ['PENDING', 'IN_KITCHEN', 'READY', 'DELIVERED', 'SERVED'])

        if (count === 0) {
          await supabase
            .from('tables')
            .update({ status: 'FREE', updated_at: new Date().toISOString() })
            .eq('id', order.table_id)
        }
      }

      // Get updated order
      const { data: updatedOrder } = await supabase
        .from('orders')
        .select(`
          *,
          table:tables(*,area:areas(*)),
          items:order_items(*,product:products(*)),
          payment:payments(*)
        `)
        .eq('id', orderId)
        .single()

      return NextResponse.json({ 
        success: true,
        payments, 
        order: updatedOrder,
        message: 'Pago dividido procesado exitosamente'
      })
    }

    // Normal single payment
    const paymentMethod = method || payment_method || 'CASH'

    // Validar monto recibido para efectivo
    if (paymentMethod.toUpperCase() === 'CASH') {
      const receivedNum = Number(received_amount) || 0
      if (receivedNum < finalAmount) {
        return NextResponse.json(
          { error: `Monto insuficiente. Total: ${finalAmount}, Recibido: ${receivedNum}` },
          { status: 400 }
        )
      }
    }

    // Crear el pago
    const singlePaymentRow: Record<string, unknown> = {
      order_id: orderId,
      amount: finalAmount,
      method: paymentMethod.toUpperCase(),
      reference: reference || null,
      received_amount: received_amount ?? finalAmount,
      change_amount: change_amount ?? 0,
    }
    if (cashRegisterId != null && cashRegisterId !== '') {
      singlePaymentRow.cash_register_id = cashRegisterId
    }
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(singlePaymentRow)
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment:', paymentError)
      throw paymentError
    }

    // Crear factura automáticamente
    try {
      const invoiceNumber = await generateInvoiceNumber()
      
      await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          order_id: orderId,
          payment_id: payment.id,
          table_id: order.table_id,
          subtotal: Number(order.subtotal),
          discount: discount,
          tax: Number(order.tax),
          total: finalAmount,
          tip: tip,
          payment_method: paymentMethod.toUpperCase()
        })
    } catch (invoiceError) {
      // No fallar si la factura no se puede crear (tabla puede no existir)
      console.warn('Could not create invoice:', invoiceError)
    }

    // Actualizar la orden
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ 
        status: 'PAID', 
        discount: discount,
        discount_type: discount_type,
        total: finalAmount,
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod.toUpperCase(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', orderId)

    if (updateOrderError) {
      console.error('Error updating order:', updateOrderError)
    }

    // Encolar apertura de caja monedera (print-server lo procesa por polling)
    await supabase.from('print_queue').insert({ type: 'cash_drawer', payload: {} })

    // Liberar la mesa
    if (order.table_id) {
      // Verificar si hay otras órdenes activas en la mesa
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('table_id', order.table_id)
        .neq('id', orderId)
        .in('status', ['PENDING', 'IN_KITCHEN', 'READY', 'DELIVERED', 'SERVED'])

      // Solo liberar si no hay otras órdenes activas
      if (count === 0) {
        await supabase
          .from('tables')
          .update({ status: 'FREE', updated_at: new Date().toISOString() })
          .eq('id', order.table_id)
      }
    }

    // Obtener la orden actualizada con relaciones
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(*,area:areas(*)),
        items:order_items(*,product:products(*)),
        payment:payments(*)
      `)
      .eq('id', orderId)
      .single()

    return NextResponse.json({ 
      success: true,
      payment, 
      order: updatedOrder,
      change: change_amount || 0,
      message: paymentMethod.toUpperCase() === 'CASH' && change_amount > 0 
        ? `Cambio: $${change_amount.toLocaleString()}` 
        : 'Pago procesado exitosamente'
    })
  } catch (error) {
    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Error al procesar pago' },
      { status: 500 }
    )
  }
}
