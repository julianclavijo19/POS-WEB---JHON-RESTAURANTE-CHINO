import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')

  if (!sessionCookie) {
    redirect('/login')
  }

  try {
    const session = JSON.parse(sessionCookie.value)
    const role = session.role

    // Redirigir según el rol
    if (role === 'ADMIN') {
      redirect('/admin')
    } else if (role === 'CASHIER') {
      redirect('/pos')
    } else if (role === 'WAITER') {
      redirect('/waiter')
    } else if (role === 'KITCHEN') {
      redirect('/kitchen')
    }
  } catch (error) {
    redirect('/login')
  }

  redirect('/login')
}
