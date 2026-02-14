import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/tables/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { data, error } = await supabase
      .from('tables')
      .select('*, area:areas(*)')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Actualizar mesa completa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, number, capacity, area_id, status, is_active } = body

    const { data, error } = await supabase
      .from('tables')
      .update({
        name,
        number,
        capacity,
        area_id,
        status,
        is_active,
      })
      .eq('id', id)
      .select('*, area:areas(*)')
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Actualizar estado de mesa
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const { data: table, error } = await supabase
      .from('tables')
      .update({ status })
      .eq('id', id)
      .select(`
        *,
        area:areas(*)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(table)
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json(
      { error: 'Error al actualizar mesa' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar mesa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar si hay órdenes activas en esta mesa
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', id)
      .neq('status', 'PAID')
      .neq('status', 'CANCELLED')
      .limit(1)

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: hay órdenes activas en esta mesa' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
