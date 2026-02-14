import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener todas las mesas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('areaId')
    const status = searchParams.get('status')

    let query = supabase
      .from('tables')
      .select(`
        *,
        area:areas(*)
      `)

    if (areaId) {
      query = query.eq('area_id', areaId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: tables, error } = await query.order('number')

    if (error) throw error

    return NextResponse.json(tables)
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json(
      { error: 'Error al obtener mesas' },
      { status: 500 }
    )
  }
}

// POST - Crear mesa
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { number, name, capacity, area_id, areaId, status, is_active } = body

    const { data: table, error } = await supabase
      .from('tables')
      .insert({
        number,
        name,
        capacity: capacity || 4,
        area_id: area_id || areaId,
        status: status || 'FREE',
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        area:areas(*)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json(
      { error: 'Error al crear mesa' },
      { status: 500 }
    )
  }
}
