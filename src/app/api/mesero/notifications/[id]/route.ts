import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Marcar notificación como leída
// Las notificaciones son generadas dinámicamente, por lo que el estado de lectura
// se maneja del lado del cliente (localStorage/sessionStorage)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { read } = body

    // Las notificaciones son generadas dinámicamente,
    // retornamos éxito - el cliente debe manejar el estado de lectura localmente
    return NextResponse.json({ 
      success: true, 
      id,
      read,
      message: 'Estado de notificación actualizado' 
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Error al actualizar notificación' },
      { status: 500 }
    )
  }
}
