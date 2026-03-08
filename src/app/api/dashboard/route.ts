import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener estadísticas del dashboard
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'
    const specificDate = searchParams.get('date')

    // Calcular fechas en UTC teniendo en cuenta que Colombia es UTC-5
    // Medianoche en Colombia = 05:00 UTC del mismo día
    const COLOMBIA_OFFSET_HOURS = 5
    
    let startDate: Date
    let endDate: Date

    if (specificDate) {
      // Fecha específica: YYYY-MM-DD en Colombia
      const [year, month, day] = specificDate.split('-').map(Number)
      // Medianoche Colombia = 5 AM UTC
      startDate = new Date(Date.UTC(year, month - 1, day, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
      // 23:59:59 Colombia = 04:59:59 UTC del día siguiente
      endDate = new Date(Date.UTC(year, month - 1, day + 1, COLOMBIA_OFFSET_HOURS - 1, 59, 59, 999))
    } else {
      // Obtener la fecha actual en Colombia
      const nowUTC = new Date()
      // Restar 5 horas para obtener hora Colombia
      const colombiaTime = new Date(nowUTC.getTime() - (COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000))
      // Extraer fecha Colombia
      const year = colombiaTime.getUTCFullYear()
      const month = colombiaTime.getUTCMonth()
      const day = colombiaTime.getUTCDate()
      
      // Hoy en Colombia: desde 00:00 hasta 23:59:59
      const todayStartUTC = new Date(Date.UTC(year, month, day, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
      const todayEndUTC = new Date(Date.UTC(year, month, day + 1, COLOMBIA_OFFSET_HOURS - 1, 59, 59, 999))

      if (period === 'today') {
        startDate = todayStartUTC
        endDate = todayEndUTC
      } else if (period === 'week') {
        startDate = new Date(todayStartUTC.getTime() - (7 * 24 * 60 * 60 * 1000))
        endDate = todayEndUTC
      } else if (period === 'month') {
        startDate = new Date(todayStartUTC.getTime() - (30 * 24 * 60 * 60 * 1000))
        endDate = todayEndUTC
      } else if (period === 'year') {
        // Desde el 1 de enero del año actual en Colombia
        startDate = new Date(Date.UTC(year, 0, 1, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
        endDate = todayEndUTC
      } else {
        startDate = todayStartUTC
        endDate = todayEndUTC
      }
    }

    const startDateISO = startDate.toISOString()
    const endDateISO = endDate.toISOString()

    // Obtener pagos del periodo con paginación (evitar límite de 1000)
    let paymentsList: any[] = []
    let payFrom = 0
    const payPageSize = 1000
    let payHasMore = true

    while (payHasMore) {
      const { data: payBatch, error: payError } = await supabase
        .from('payments')
        .select('id, amount, method, created_at, order_id')
        .gte('created_at', startDateISO)
        .lte('created_at', endDateISO)
        .order('created_at', { ascending: true })
        .range(payFrom, payFrom + payPageSize - 1)

      if (payError) {
        console.error('Payments Error:', payError)
        break
      }

      const batch = payBatch || []
      paymentsList = paymentsList.concat(batch)
      payHasMore = batch.length === payPageSize
      payFrom += payPageSize
    }

    // Calcular ventas desde pagos (incluye refunds negativos)
    const totalSalesFromPayments = paymentsList.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const cashSales = paymentsList.filter(p => p.method === 'CASH').reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const cardSales = paymentsList.filter(p => p.method === 'CARD').reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const transferSales = paymentsList.filter(p => p.method === 'TRANSFER').reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const totalPaidOrders = paymentsList.filter(p => Number(p.amount || 0) > 0).length

    // Obtener órdenes del periodo (filtro en servidor)
    const { data: allOrdersRaw } = await supabase
      .from('orders')
      .select('id, status, total, paid_at, created_at')
      .gte('created_at', startDateISO)
      .lte('created_at', endDateISO)
    
    const allOrders = allOrdersRaw || []

    // Usar ventas de pagos como fuente de verdad
    const totalSales = totalSalesFromPayments
    const totalOrders = allOrders.length

    // Ventas del periodo (diarias o mensuales según el filtro)
    const dailySales: { date: string; total: number }[] = []
    
    const nowUTC = new Date()
    const colombiaTime = new Date(nowUTC.getTime() - (COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000))
    const todayYear = colombiaTime.getUTCFullYear()
    const todayMonth = colombiaTime.getUTCMonth()
    const todayDay = colombiaTime.getUTCDate()

    if (period === 'year') {
      // Para el año: agrupar pagos por mes
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      for (let m = 0; m <= todayMonth; m++) {
        const monthStartUTC = new Date(Date.UTC(todayYear, m, 1, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
        const monthEndUTC = new Date(Date.UTC(todayYear, m + 1, 1, COLOMBIA_OFFSET_HOURS - 1, 59, 59, 999))
        
        const monthPayments = paymentsList.filter(p => {
          const pDate = new Date(p.created_at)
          return pDate >= monthStartUTC && pDate <= monthEndUTC
        })
        
        const monthTotal = monthPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        dailySales.push({
          date: monthNames[m],
          total: monthTotal
        })
      }
    } else if (period === 'today') {
      // Para hoy: agrupar por hora (0-23) en timezone Colombia
      for (let h = 0; h < 24; h++) {
        const hourStartUTC = new Date(Date.UTC(todayYear, todayMonth, todayDay, COLOMBIA_OFFSET_HOURS + h, 0, 0, 0))
        const hourEndUTC = new Date(Date.UTC(todayYear, todayMonth, todayDay, COLOMBIA_OFFSET_HOURS + h, 59, 59, 999))

        const hourPayments = paymentsList.filter(p => {
          const pDate = new Date(p.created_at)
          return pDate >= hourStartUTC && pDate <= hourEndUTC
        })

        const hourTotal = hourPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
        dailySales.push({
          date: `${String(h).padStart(2, '0')}:00`,
          total: hourTotal
        })
      }
    } else {
      const daysToShow = period === 'month' ? 30 : 7

      for (let i = daysToShow - 1; i >= 0; i--) {
        const targetDate = new Date(Date.UTC(todayYear, todayMonth, todayDay - i))
        const targetYear = targetDate.getUTCFullYear()
        const targetMonth = targetDate.getUTCMonth()
        const targetDay = targetDate.getUTCDate()

        const dayStartUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, COLOMBIA_OFFSET_HOURS, 0, 0, 0))
        const dayEndUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay + 1, COLOMBIA_OFFSET_HOURS - 1, 59, 59, 999))

        const dayPayments = paymentsList.filter(p => {
          const pDate = new Date(p.created_at)
          return pDate >= dayStartUTC && pDate <= dayEndUTC
        })

        const dayTotal = dayPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

        const displayDate = new Date(Date.UTC(targetYear, targetMonth, targetDay, 12, 0, 0))
        dailySales.push({
          date: displayDate.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', timeZone: 'America/Bogota' }),
          total: dayTotal
        })
      }
    }

    // Productos más vendidos
    const orderIdsWithPayments = [...new Set(paymentsList.map(p => p.order_id).filter(Boolean))]
    
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        quantity,
        product_id,
        product:products(name),
        order_id
      `)
      .in('order_id', orderIdsWithPayments.length > 0 ? orderIdsWithPayments : ['none'])

    const productSales: any = {}
    orderItems?.forEach((item: any) => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = {
          productId: item.product_id,
          name: item.product?.name,
          quantity: 0,
        }
      }
      productSales[item.product_id].quantity += item.quantity
    })

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10)
      .map((p: any) => ({
        productId: p.productId,
        product: { name: p.name },
        _sum: { quantity: p.quantity }
      }))

    // Mesas activas - contar solo las que realmente tienen órdenes activas
    // (no depender del campo status que puede estar desactualizado)
    const { data: allActiveTables } = await supabase
      .from('tables')
      .select('id, status')
      .eq('is_active', true)

    let activeTablesCount = 0
    if (allActiveTables && allActiveTables.length > 0) {
      // Verificar cuáles realmente tienen órdenes activas
      const { data: tablesWithActiveOrders } = await supabase
        .from('orders')
        .select('table_id')
        .not('table_id', 'is', null)
        .neq('status', 'PAID')
        .neq('status', 'CANCELLED')

      const occupiedTableIds = new Set(
        (tablesWithActiveOrders || []).map(o => o.table_id)
      )
      
      // Sincronizar mesas con estado incorrecto
      for (const table of allActiveTables) {
        const hasActiveOrder = occupiedTableIds.has(table.id)
        if (hasActiveOrder) {
          activeTablesCount++
          if (table.status !== 'OCCUPIED') {
            await supabase
              .from('tables')
              .update({ status: 'OCCUPIED', updated_at: new Date().toISOString() })
              .eq('id', table.id)
          }
        } else if (table.status === 'OCCUPIED') {
          // Mesa marcada como ocupada pero sin órdenes activas -> liberar
          await supabase
            .from('tables')
            .update({ status: 'FREE', updated_at: new Date().toISOString() })
            .eq('id', table.id)
        }
      }
    }

    const totalTablesCount = allActiveTables?.length || 0

    return NextResponse.json({
      totalSales,
      totalOrders,
      totalPaidOrders,
      dailySales,
      salesByMethod: {
        cash: cashSales,
        card: cardSales,
        transfer: transferSales
      },
      topProducts,
      activeTables: activeTablesCount,
      totalTables: totalTablesCount,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
