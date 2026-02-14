import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Colombia timezone UTC-5
    const now = new Date()
    const colombiaOffset = now.getTime() + (now.getTimezoneOffset() * 60000) - (5 * 3600000)
    const colombiaDate = new Date(colombiaOffset)
    const todayStr = colombiaDate.toISOString().split('T')[0]
    const todayISO = todayStr + 'T05:00:00.000Z' // Midnight Colombia = 5AM UTC

    // Obtener todas las órdenes pagadas de hoy
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        subtotal,
        tax,
        status,
        created_at,
        table:tables(name),
        payments(method),
        items:order_items(quantity, unit_price, product:products(name))
      `)
      .eq('status', 'PAID')
      .gte('created_at', todayISO)
      .order('created_at', { ascending: true })

    // Generar CSV
    let csv = 'Reporte de Ventas Diario\n'
    csv += `Generado: ${new Date().toLocaleString('es-ES')}\n\n`
    csv += 'Orden,Mesa,Subtotal,Impuesto,Total,Metodo Pago,Hora,Items\n'

    let totalVentas = 0
    let totalImpuesto = 0

    orders?.forEach((order) => {
      const tableData = order.table as { name: string }[] | { name: string } | null
      const mesa = Array.isArray(tableData) ? tableData[0]?.name : tableData?.name || 'N/A'
      const fecha = new Date(order.created_at)
      const hora = fecha.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const metodo = order.payments?.[0]?.method === 'CASH' ? 'Efectivo' : 'Tarjeta'
      const itemsData = order.items as Array<{ quantity: number; unit_price: number; product: { name: string }[] | { name: string } | null }> | null
      const items = itemsData?.map(i => {
        const productData = i.product as { name: string }[] | { name: string } | null
        const productName = Array.isArray(productData) ? productData[0]?.name : productData?.name
        return `${i.quantity}x ${productName}`
      }).join('; ') || ''

      csv += `${order.order_number},${mesa},${order.subtotal},${order.tax},${order.total},${metodo},${hora},"${items}"\n`

      totalVentas += Number(order.total)
      totalImpuesto += Number(order.tax)
    })

    // Agregar resumen
    csv += '\n\nRESUMEN\n'
    csv += `Total Órdenes,${orders?.length || 0}\n`
    csv += `Subtotal,${(totalVentas - totalImpuesto).toFixed(2)}\n`
    csv += `Impuesto,${totalImpuesto.toFixed(2)}\n`
    csv += `Total Ventas,${totalVentas.toFixed(2)}\n`

    // Por método de pago
    const ventasEfectivo = orders?.filter(o => o.payments?.[0]?.method === 'CASH' || !o.payments?.[0]?.method)
      .reduce((sum, o) => sum + Number(o.total), 0) || 0
    const ventasElectronica = orders?.filter(o => o.payments?.[0]?.method && o.payments?.[0]?.method !== 'CASH')
      .reduce((sum, o) => sum + Number(o.total), 0) || 0

    csv += `\nEfectivo,${ventasEfectivo.toFixed(2)}\n`
    csv += `Tarjeta/Transferencia,${ventasElectronica.toFixed(2)}\n`

    // Crear blob y enviar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="reporte-ventas-${new Date().toISOString().split('T')[0]}.csv"`,
        'Content-Type': 'text/csv;charset=utf-8;',
      },
    })
  } catch (error) {
    console.error('Error exporting sales:', error)
    return NextResponse.json(
      { error: 'Error al exportar reporte' },
      { status: 500 }
    )
  }
}
