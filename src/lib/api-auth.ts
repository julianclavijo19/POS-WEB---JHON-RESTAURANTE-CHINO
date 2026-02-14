import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export interface SessionUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'CASHIER' | 'WAITER' | 'KITCHEN'
}

/**
 * Obtiene la sesión del usuario desde las cookies.
 * Retorna null si no hay sesión válida.
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return null
    }

    const session = JSON.parse(decodeURIComponent(sessionCookie.value))

    if (!session?.id || !session?.role) {
      return null
    }

    return {
      id: session.id,
      name: session.name || '',
      email: session.email || '',
      role: session.role,
    }
  } catch {
    return null
  }
}

/**
 * Verifica que el usuario tenga sesión activa.
 * Retorna la sesión o un NextResponse de error 401.
 */
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json(
      { error: 'No autorizado. Inicie sesión.' },
      { status: 401 }
    )
  }
  return session
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos.
 * Retorna la sesión o un NextResponse de error 401/403.
 */
export async function requireRole(
  ...allowedRoles: SessionUser['role'][]
): Promise<SessionUser | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result

  if (!allowedRoles.includes(result.role)) {
    return NextResponse.json(
      { error: 'No tiene permisos para esta acción.' },
      { status: 403 }
    )
  }
  return result
}

/**
 * Helper para verificar si el resultado de requireAuth/requireRole es un error.
 */
export function isAuthError(result: SessionUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
