import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener la sesión actual del usuario
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      )
    }

    const session = JSON.parse(decodeURIComponent(sessionCookie.value))

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
    })
  } catch {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 401 }
    )
  }
}
