import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener todas las facturas
export async function GET() {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        *,
        order:orders (
          order_number,
          table:tables (name)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(invoices || [])
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { error: 'Error al obtener facturas' },
      { status: 500 }
    )
  }
}

// POST - Crear factura
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, customer_name, customer_nit, subtotal, tax, total } = body

    // Generar número de factura con retry para evitar colisiones
    let invoiceNumber = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const { count } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })

      const candidate = `FAC-${String((count || 0) + 1 + attempt).padStart(6, '0')}`
      
      // Verificar que no exista
      const { data: existing } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_number', candidate)
        .single()
      
      if (!existing) {
        invoiceNumber = candidate
        break
      }
    }

    if (!invoiceNumber) {
      invoiceNumber = `FAC-${Date.now().toString().slice(-8)}`
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        order_id,
        customer_name: customer_name || 'Consumidor Final',
        customer_nit: customer_nit || 'CF',
        subtotal,
        tax,
        total,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { error: 'Error al crear factura' },
      { status: 500 }
    )
  }
}
