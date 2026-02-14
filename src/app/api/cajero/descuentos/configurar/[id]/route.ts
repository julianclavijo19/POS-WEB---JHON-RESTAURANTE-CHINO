import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener un descuento específico
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { data: discount, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !discount) {
      return NextResponse.json(
        { error: 'Descuento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      discount: {
        ...discount,
        value: Number(discount.value) || 0,
        times_used: discount.times_used || 0
      }
    })
  } catch (error) {
    console.error('Error fetching discount:', error)
    return NextResponse.json(
      { error: 'Error al cargar el descuento' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar un descuento (activar/desactivar, editar)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, discount_type, value, requires_authorization, is_active } = body

    // Build update object with only provided fields
    const updateData: Record<string, any> = {}
    
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (discount_type !== undefined) {
      if (!['PERCENTAGE', 'FIXED'].includes(discount_type)) {
        return NextResponse.json(
          { error: 'Tipo de descuento inválido' },
          { status: 400 }
        )
      }
      updateData.discount_type = discount_type
    }
    if (value !== undefined) {
      const numValue = Number(value)
      if (isNaN(numValue) || numValue <= 0) {
        return NextResponse.json(
          { error: 'Valor de descuento inválido' },
          { status: 400 }
        )
      }
      updateData.value = numValue
    }
    if (requires_authorization !== undefined) updateData.requires_authorization = requires_authorization
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No hay datos para actualizar' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('discounts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      discount: data,
      message: 'Descuento actualizado correctamente'
    })

  } catch (error) {
    console.error('Error updating discount:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el descuento' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un descuento
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { error } = await supabase
      .from('discounts')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      message: 'Descuento eliminado correctamente'
    })

  } catch (error) {
    console.error('Error deleting discount:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el descuento' },
      { status: 500 }
    )
  }
}
