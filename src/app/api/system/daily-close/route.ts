import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// API para cerrar el día - Resetea todas las mesas a AVAILABLE
// Puede ser llamado manualmente o programado con un cron job externo

export async function POST(request: Request) {
  try {
    // Verificar autorización (opcional: agregar token secreto)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    // Si hay CRON_SECRET configurado, verificar
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Verificar si es un admin haciendo la solicitud
      const cookieHeader = request.headers.get('cookie')
      let isAdmin = false
      
      if (cookieHeader) {
        const sessionMatch = cookieHeader.match(/session=([^;]+)/)
        if (sessionMatch) {
          try {
            const session = JSON.parse(decodeURIComponent(sessionMatch[1]))
            isAdmin = session.role === 'ADMIN'
          } catch (e) {
            // Invalid session
          }
        }
      }
      
      if (!isAdmin) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
      }
    }

    const now = new Date()
    const closeReport: {
      timestamp: string
      tablesReset: number
      ordersClosed: number
      totalRevenue: number
    } = {
      timestamp: now.toISOString(),
      tablesReset: 0,
      ordersClosed: 0,
      totalRevenue: 0
    }

    // 1. Obtener resumen de ventas del día antes del cierre
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const { data: todayOrders } = await supabase
      .from('orders')
      .select('id, total, status')
      .gte('created_at', startOfDay.toISOString())
      .eq('status', 'PAID')

    if (todayOrders) {
      closeReport.ordersClosed = todayOrders.length
      closeReport.totalRevenue = todayOrders.reduce((acc, o) => acc + (o.total || 0), 0)
    }

    // 2. Marcar pedidos pendientes como CANCELLED (opcional)
    const { data: pendingOrders } = await supabase
      .from('orders')
      .select('id')
      .gte('created_at', startOfDay.toISOString())
      .in('status', ['PENDING', 'IN_KITCHEN', 'READY', 'SERVED'])

    if (pendingOrders && pendingOrders.length > 0) {
      await supabase
        .from('orders')
        .update({ status: 'CANCELLED', notes: 'Cerrado automáticamente al cierre del día' })
        .in('id', pendingOrders.map(o => o.id))
    }

    // 3. Resetear todas las mesas a AVAILABLE
    const { data: tablesUpdated } = await supabase
      .from('tables')
      .update({ status: 'AVAILABLE' })
      .neq('status', 'AVAILABLE')
      .select('id')

    if (tablesUpdated) {
      closeReport.tablesReset = tablesUpdated.length
    }

    // 4. Registrar el cierre en un log (opcional - crear tabla si necesitas persistencia)
    console.log('=== CIERRE DEL DÍA ===')
    console.log(`Fecha: ${now.toLocaleString('es-CO')}`)
    console.log(`Pedidos cerrados: ${closeReport.ordersClosed}`)
    console.log(`Ingresos del día: ${closeReport.totalRevenue}`)
    console.log(`Mesas reseteadas: ${closeReport.tablesReset}`)
    console.log('======================')

    return NextResponse.json({
      success: true,
      message: 'Cierre del día completado exitosamente',
      report: closeReport
    })

  } catch (error) {
    console.error('Error en cierre del día:', error)
    return NextResponse.json(
      { error: 'Error al procesar el cierre del día' },
      { status: 500 }
    )
  }
}

// GET para verificar el estado
export async function GET() {
  const now = new Date()
  const hour = now.getHours()
  
  return NextResponse.json({
    currentTime: now.toISOString(),
    currentHour: hour,
    scheduledCloseHour: 12,
    message: hour >= 12 ? 'El cierre diario ya debería haberse ejecutado' : `Faltan ${12 - hour} horas para el cierre automático`
  })
}
