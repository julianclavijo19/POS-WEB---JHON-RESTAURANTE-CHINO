import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener todos los descuentos configurados
export async function GET() {
  try {
    const { data: discounts, error } = await supabase
      .from('discounts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      discounts: (discounts || []).map(d => ({
        ...d,
        value: Number(d.value) || 0,
        times_used: d.times_used || 0
      }))
    })
  } catch (error) {
    console.error('Error fetching discounts:', error)
    return NextResponse.json(
      { error: 'Error al cargar los descuentos' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo descuento predefinido
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, discount_type, value, requires_authorization } = body

    if (!name || !discount_type || value === undefined) {
      return NextResponse.json(
        { error: 'Nombre, tipo y valor son requeridos' },
        { status: 400 }
      )
    }

    // Validate discount type
    if (!['PERCENTAGE', 'FIXED'].includes(discount_type)) {
      return NextResponse.json(
        { error: 'Tipo de descuento inválido' },
        { status: 400 }
      )
    }

    // Validate value
    const numValue = Number(value)
    if (isNaN(numValue) || numValue <= 0) {
      return NextResponse.json(
        { error: 'Valor de descuento inválido' },
        { status: 400 }
      )
    }

    if (discount_type === 'PERCENTAGE' && numValue > 100) {
      return NextResponse.json(
        { error: 'El porcentaje no puede ser mayor a 100' },
        { status: 400 }
      )
    }

    // Get user from session
    const cookieStore = cookies()
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

    const { data, error } = await supabase
      .from('discounts')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        discount_type,
        value: numValue,
        requires_authorization: requires_authorization || false,
        is_active: true,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      discount: data,
      message: 'Descuento creado correctamente'
    })

  } catch (error) {
    console.error('Error creating discount:', error)
    return NextResponse.json(
      { error: 'Error al crear el descuento' },
      { status: 500 }
    )
  }
}
