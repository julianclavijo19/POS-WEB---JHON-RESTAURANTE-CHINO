import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario en la base de datos
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    // Verificar contraseña - soportar tanto hash bcrypt como texto plano
    let isPasswordValid = false
    
    // Detectar si el password está hasheado con bcrypt (comienza con $2a$, $2b$ o $2y$)
    const isBcryptHash = user.password && /^\$2[aby]\$/.test(user.password)
    
    if (isBcryptHash) {
      // Password hasheado - usar bcrypt.compare
      isPasswordValid = await bcrypt.compare(password, user.password)
    } else {
      // Password en texto plano - comparar directamente
      if (user.password === password) {
        isPasswordValid = true
        // Migrar password a hash bcrypt para mayor seguridad
        try {
          const hashedPassword = await bcrypt.hash(password, 10)
          await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', user.id)
          console.log('Password migrado a bcrypt para usuario:', user.email)
        } catch (hashError) {
          console.error('Error migrando password:', hashError)
        }
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Credenciales incorrectas' },
        { status: 401 }
      )
    }

    // Crear respuesta con cookie de sesión
    const cookieStore = await cookies()
    
    // Guardar sesión en cookie
    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
    
    cookieStore.set('session', JSON.stringify(sessionData), {
      httpOnly: false, // El frontend necesita leer la sesión del cookie
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    })

    // No devolver la contraseña
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      message: 'Login exitoso',
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    )
  }
}
