import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener productos (opcionalmente filtrados por categoría)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('is_active', true)

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: products, error } = await query.order('name')

    if (error) throw error

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}

// POST - Crear producto
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, price, category_id, categoryId, prep_time, prepTime, image_url, image, is_available, is_active } = body

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        name,
        description,
        price,
        category_id: category_id || categoryId,
        prep_time: prep_time || prepTime || 10,
        image_url: image_url || image,
        is_available: is_available !== undefined ? is_available : true,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}
