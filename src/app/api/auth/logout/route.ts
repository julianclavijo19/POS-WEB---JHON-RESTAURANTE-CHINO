import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Eliminar cookie de sesión
    cookieStore.delete('session')

    return NextResponse.json({ message: 'Sesión cerrada' })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
