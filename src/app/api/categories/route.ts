import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener todas las categorías con sus productos
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeProducts = searchParams.get('includeProducts') === 'true'

    let query = supabase
      .from('categories')
      .select(includeProducts ? `
        *,
        products (
          id,
          name,
          price,
          is_active
        )
      ` : '*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    const { data: categories, error } = await query

    if (error) throw error

    // Filtrar solo productos activos si se incluyeron
    const filteredCategories = includeProducts && categories
      ? categories.map((cat: any) => ({
          ...cat,
          products: cat.products?.filter((p: any) => p.is_active) || []
        }))
      : categories

    return NextResponse.json(filteredCategories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    )
  }
}

// POST - Crear categoría
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, color, icon, display_order, is_active } = body

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name,
        description,
        color: color || '#3b82f6',
        icon,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Error al crear categoría' },
      { status: 500 }
    )
  }
}
