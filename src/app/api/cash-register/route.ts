import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener caja registradora abierta
export async function GET() {
  try {
    const { data: register, error } = await supabase
      .from('cash_registers')
      .select(`
        *,
        user:users(id, name)
      `)
      .eq('status', 'OPEN')
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows found

    return NextResponse.json(register)
  } catch (error) {
    console.error('Error fetching cash register:', error)
    return NextResponse.json(
      { error: 'Error al obtener caja' },
      { status: 500 }
    )
  }
}

// POST - Abrir caja
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, openingAmount } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'Se requiere el ID del usuario' },
        { status: 400 }
      )
    }

    // Verificar si ya hay una caja abierta (doble verificación)
    const { data: existingOpen } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('status', 'OPEN')
      .single()

    if (existingOpen) {
      return NextResponse.json(
        { error: 'Ya hay una caja abierta' },
        { status: 400 }
      )
    }

    const { data: register, error } = await supabase
      .from('cash_registers')
      .insert({
        user_id: userId,
        opening_amount: openingAmount || 0,
      })
      .select(`
        *,
        user:users(id, name)
      `)
      .single()

    if (error) {
      // Si hay error de constraint (otra inserción concurrente), verificar
      const { data: alreadyOpen } = await supabase
        .from('cash_registers')
        .select('id')
        .eq('status', 'OPEN')
      
      if (alreadyOpen && alreadyOpen.length > 1) {
        return NextResponse.json(
          { error: 'Ya hay una caja abierta (concurrencia detectada)' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json(register, { status: 201 })
  } catch (error) {
    console.error('Error opening cash register:', error)
    return NextResponse.json(
      { error: 'Error al abrir caja' },
      { status: 500 }
    )
  }
}
