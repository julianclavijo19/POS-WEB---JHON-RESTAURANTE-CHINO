import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateInvoiceHTML, getInvoiceReceiptStyles, type OrderData, type InvoiceExtras, type TicketConfig } from '@/lib/printer'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Fetch invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', params.id)
      .single()

    if (invErr || !invoice) {
      return new NextResponse('Factura no encontrada', { status: 404 })
    }

    // 2. Fetch order with items and relations
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(name),
        waiter:users(name),
        items:order_items(
          quantity,
          unit_price,
          notes,
          product:products(name)
        )
      `)
      .eq('id', invoice.order_id)
      .single()

    if (ordErr || !order) {
      return new NextResponse('Orden no encontrada', { status: 404 })
    }

    // 3. Fetch restaurant settings
    const { data: settingsRows } = await supabase.from('settings').select('*')
    const settings: Record<string, string> = {}
    if (settingsRows) {
      for (const row of settingsRows) {
        settings[row.key] = row.value
      }
    }

    const config: Partial<TicketConfig> = {
      restaurantName: settings.restaurant_name || 'RESTAURANTE',
      address: settings.address || '',
      phone: settings.phone || '',
      nit: settings.nit || '',
      footer: settings.footer || '¡Gracias por su visita!',
      paperWidth: 80,
    }
    const logoUrl: string | null = settings.logo_url || null

    // 4. Build OrderData
    const orderData: OrderData = {
      orderNumber: order.order_number,
      tableName: order.table?.name,
      waiterName: order.waiter?.name,
      items: (order.items || []).map((item: any) => ({
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        notes: item.notes || undefined,
        product: { name: item.product?.name || '(producto)' },
      })),
      subtotal: Number(order.subtotal) || 0,
      tax: Number(order.tax) || 0,
      total: Number(order.total) || 0,
      discount: Number(order.discount) || 0,
      tip: Number(order.tip) || 0,
      paymentMethod: order.payment_method,
      receivedAmount: order.received_amount ? Number(order.received_amount) : undefined,
      changeAmount: order.change_amount ? Number(order.change_amount) : undefined,
      customerCount: order.customer_count,
      createdAt: order.created_at,
    }

    const extras: InvoiceExtras = {
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name || 'Consumidor Final',
      customerNit: invoice.customer_nit || 'CF',
      customerAddress: invoice.customer_address || '',
    }

    // 5. Render HTML
    const paperWidth = '80mm'
    const bodyHtml = generateInvoiceHTML(orderData, extras, config, logoUrl)
    const styles = getInvoiceReceiptStyles(paperWidth)

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Factura ${invoice.invoice_number}</title>
  ${styles}
</head>
<body>
${bodyHtml}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 200);
  };
  window.onafterprint = function() { window.close(); };
<\/script>
</body>
</html>`

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('Error generando recibo:', err)
    return new NextResponse('Error interno', { status: 500 })
  }
}
