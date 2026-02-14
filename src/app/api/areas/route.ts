import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener todas las áreas con sus mesas
export async function GET() {
  try {
    const { data: areas, error } = await supabase
      .from('areas')
      .select(`
        *,
        tables (*)
      `)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    // Ordenar tablas por número
    const areasWithSortedTables = areas?.map(area => ({
      ...area,
      tables: area.tables?.sort((a: any, b: any) => a.number - b.number)
    }))

    return NextResponse.json(areasWithSortedTables)
  } catch (error) {
    console.error('Error fetching areas:', error)
    return NextResponse.json(
      { error: 'Error al obtener áreas' },
      { status: 500 }
    )
  }
}

// POST - Crear área
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description } = body

    const { data: area, error } = await supabase
      .from('areas')
      .insert({ name, description })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(area, { status: 201 })
  } catch (error) {
    console.error('Error creating area:', error)
    return NextResponse.json(
      { error: 'Error al crear área' },
      { status: 500 }
    )
  }
}
