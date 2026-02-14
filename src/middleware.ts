import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas públicas
  const publicRoutes = ['/login', '/api/auth', '/api/']

  // Si está en una ruta pública o API, permitir acceso
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Obtener sesión de la cookie
  const sessionCookie = request.cookies.get('session')
  
  if (!sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const role = session.role

    // Redirigir raíz según rol
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      switch (role) {
        case 'ADMIN':
          url.pathname = '/admin'
          break
        case 'CASHIER':
          url.pathname = '/cajero'
          break
        case 'WAITER':
          url.pathname = '/mesero'
          break
        case 'KITCHEN':
          url.pathname = '/cocina'
          break
        default:
          url.pathname = '/login'
      }
      return NextResponse.redirect(url)
    }

    // Verificar roles para rutas específicas
    // Rutas de admin solo para ADMIN
    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = getDefaultRoute(role)
      return NextResponse.redirect(url)
    }

    // Cajero solo para CASHIER o ADMIN
    if (pathname.startsWith('/cajero') && !['CASHIER', 'ADMIN'].includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = getDefaultRoute(role)
      return NextResponse.redirect(url)
    }

    // Cocina solo para KITCHEN o ADMIN
    if (pathname.startsWith('/cocina') && !['KITCHEN', 'ADMIN'].includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = getDefaultRoute(role)
      return NextResponse.redirect(url)
    }

    // Mesero solo para WAITER, ADMIN o CASHIER (cajero puede tomar pedidos)
    if (pathname.startsWith('/mesero') && !['WAITER', 'ADMIN', 'CASHIER'].includes(role)) {
      const url = request.nextUrl.clone()
      url.pathname = getDefaultRoute(role)
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  } catch (error) {
    // Si hay error al parsear la sesión, redirigir a login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
}

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'CASHIER':
      return '/cajero'
    case 'WAITER':
      return '/mesero'
    case 'KITCHEN':
      return '/cocina'
    default:
      return '/login'
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
