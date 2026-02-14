import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/areas/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { data, error } = await supabase
      .from('areas')
      .select('*, tables(*)')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Área no encontrada' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/areas/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, is_active } = body

    const { data, error } = await supabase
      .from('areas')
      .update({
        name,
        description,
        is_active,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/areas/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Obtener mesas del área
    const { data: tables } = await supabase
      .from('tables')
      .select('id')
      .eq('area_id', id)

    if (tables && tables.length > 0) {
      // Verificar si alguna mesa tiene órdenes activas
      const tableIds = tables.map(t => t.id)
      const { count: activeOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('table_id', tableIds)
        .in('status', ['PENDING', 'IN_KITCHEN', 'READY', 'DELIVERED'])

      if (activeOrders && activeOrders > 0) {
        return NextResponse.json(
          { error: 'No se puede eliminar el área porque tiene mesas con órdenes activas' },
          { status: 400 }
        )
      }

      // Eliminar mesas del área (solo si no tienen órdenes activas)
      await supabase
        .from('tables')
        .delete()
        .eq('area_id', id)
    }
    
    const { error } = await supabase
      .from('areas')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
