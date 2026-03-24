import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Contraseña actual y nueva son requeridas' },
        { status: 400 }
      )
    }

    // Obtener el usuario actual
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar contraseña actual
    const isBcryptHash = user.password && /^\$2[aby]\$/.test(user.password)
    let isPasswordValid = false

    if (isBcryptHash) {
      isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    } else {
      isPasswordValid = user.password === currentPassword
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 400 }
      )
    }

    // Encriptar la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Actualizar la contraseña
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ message: 'Contraseña actualizada exitosamente' })
  } catch (error: any) {
    console.error('Error cambiando contraseña:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar la contraseña' },
      { status: 500 }
    )
  }
}
