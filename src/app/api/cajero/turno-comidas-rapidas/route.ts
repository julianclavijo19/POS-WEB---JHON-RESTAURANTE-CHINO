import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener turno actual de comidas rápidas
export async function GET() {
  try {
    // Obtener usuario de la sesión
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let userId = null
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionCookie.value))
        userId = session.id
      } catch (e) {
        console.error('Error parsing session:', e)
      }
    }

    // Buscar turno abierto de comidas rápidas
    const { data: currentShift, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'OPEN')
      .eq('register_type', 'FAST_FOOD')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (currentShift) {
      return NextResponse.json({
        shift: {
          ...currentShift,
          cash_sales: Number(currentShift.cash_sales) || 0,
          total_sales: Number(currentShift.total_sales) || 0
        },
        isOpen: true
      })
    }

    return NextResponse.json({
      shift: null,
      isOpen: false
    })
  } catch (error) {
    console.error('Error fetching fast food shift:', error)
    return NextResponse.json(
      { error: 'Error al obtener turno de comidas rápidas' },
      { status: 500 }
    )
  }
}

// POST - Abrir nuevo turno de comidas rápidas
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { opening_amount, user_id } = body

    // Verificar que no haya turno abierto de comidas rápidas
    const { data: existingShift } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('status', 'OPEN')
      .eq('register_type', 'FAST_FOOD')
      .single()

    if (existingShift) {
      return NextResponse.json(
        { error: 'Ya existe un turno de comidas rápidas abierto. Ciérrelo primero.' },
        { status: 400 }
      )
    }

    // Crear nuevo turno
    const { data: newShift, error } = await supabase
      .from('cash_registers')
      .insert({
        user_id: user_id,
        opening_amount: opening_amount || 0,
        status: 'OPEN',
        register_type: 'FAST_FOOD',
        opened_at: new Date().toISOString(),
        cash_sales: 0,
        card_sales: 0,
        transfer_sales: 0,
        total_sales: 0,
        total_orders: 0
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      shift: newShift,
      message: 'Turno de comidas rápidas abierto exitosamente'
    })
  } catch (error) {
    console.error('Error opening fast food shift:', error)
    return NextResponse.json(
      { error: 'Error al abrir turno de comidas rápidas' },
      { status: 500 }
    )
  }
}

// PUT - Cerrar turno de comidas rápidas
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { shift_id, closing_amount, notes } = body

    // Obtener el turno
    const { data: shift, error: shiftError } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('id', shift_id)
      .eq('register_type', 'FAST_FOOD')
      .single()

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: 'Turno de comidas rápidas no encontrado' },
        { status: 404 }
      )
    }

    // Para comidas rápidas: el monto esperado es lo que el empleado trajo
    // La diferencia es closing_amount - opening_amount (eso son las ventas)
    const openingAmount = Number(shift.opening_amount) || 0
    const closingAmt = Number(closing_amount) || 0
    
    // Las ventas son la diferencia entre lo que trajo y lo inicial
    const totalSales = Math.max(0, closingAmt - openingAmount)
    
    // No hay diferencia porque solo se cuenta efectivo
    const difference = 0

    // Cerrar el turno
    const { data: closedShift, error } = await supabase
      .from('cash_registers')
      .update({
        status: 'CLOSED',
        closing_amount: closingAmt,
        expected_amount: closingAmt, // Lo esperado es lo mismo que lo contado
        difference: difference,
        cash_sales: totalSales,
        card_sales: 0,
        transfer_sales: 0,
        total_sales: totalSales,
        total_orders: 0,
        notes: notes,
        closed_at: new Date().toISOString()
      })
      .eq('id', shift_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      shift: closedShift,
      summary: {
        opening_amount: openingAmount,
        closing_amount: closingAmt,
        total_sales: totalSales,
        difference: difference
      },
      message: 'Turno de comidas rápidas cerrado exitosamente'
    })
  } catch (error) {
    console.error('Error closing fast food shift:', error)
    return NextResponse.json(
      { error: 'Error al cerrar turno de comidas rápidas' },
      { status: 500 }
    )
  }
}
