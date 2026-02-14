import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// GET - Obtener turno actual del cajero
export async function GET() {
  try {
    // Obtener usuario de la sesión
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')
    
    let userId = null
    if (sessionCookie?.value) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionCookie.value))
        userId = session.id
      } catch (e) {
        console.error('Error parsing session:', e)
      }
    }

    // Buscar turno abierto del usuario
    const { data: currentShift, error } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw error
    }

    // Si hay turno abierto, obtener transacciones del turno
    if (currentShift) {
      const { data: transactions } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          method,
          received_amount,
          change_amount,
          created_at,
          order:orders(
            id,
            order_number,
            table:tables(name)
          )
        `)
        .gte('created_at', currentShift.opened_at)
        .order('created_at', { ascending: false })

      // Calcular totales por método
      const cashTotal = transactions?.filter(t => t.method === 'CASH').reduce((s, t) => s + Number(t.amount), 0) || 0
      const cardTotal = transactions?.filter(t => t.method === 'CARD').reduce((s, t) => s + Number(t.amount), 0) || 0
      const transferTotal = transactions?.filter(t => t.method === 'TRANSFER').reduce((s, t) => s + Number(t.amount), 0) || 0

      return NextResponse.json({
        shift: {
          ...currentShift,
          cash_sales: cashTotal,
          card_sales: cardTotal,
          transfer_sales: transferTotal,
          total_sales: cashTotal + cardTotal + transferTotal,
          total_orders: transactions?.length || 0
        },
        transactions: transactions || [],
        isOpen: true
      })
    }

    return NextResponse.json({
      shift: null,
      transactions: [],
      isOpen: false
    })
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json(
      { error: 'Error al obtener turno' },
      { status: 500 }
    )
  }
}

// POST - Abrir nuevo turno
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { opening_amount, user_id } = body

    // Verificar que no haya turno abierto
    const { data: existingShift } = await supabase
      .from('cash_registers')
      .select('id')
      .eq('status', 'OPEN')
      .single()

    if (existingShift) {
      return NextResponse.json(
        { error: 'Ya existe un turno abierto. Ciérrelo primero.' },
        { status: 400 }
      )
    }

    // Crear nuevo turno
    const { data: newShift, error } = await supabase
      .from('cash_registers')
      .insert({
        user_id: user_id,
        opening_amount: opening_amount || 0,
        status: 'OPEN',
        opened_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      shift: newShift,
      message: 'Turno abierto exitosamente'
    })
  } catch (error) {
    console.error('Error opening shift:', error)
    return NextResponse.json(
      { error: 'Error al abrir turno' },
      { status: 500 }
    )
  }
}

// PUT - Cerrar turno actual
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { shift_id, closing_amount, notes, force_close } = body

    // Obtener el turno
    const { data: shift, error: shiftError } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('id', shift_id)
      .single()

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: 'Turno no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si hay pedidos sin cobrar (mesas y para llevar)
    console.log('=== CIERRE DE TURNO DEBUG ===')
    console.log('Shift opened_at:', shift.opened_at)
    
    const { data: unpaidOrders, error: unpaidError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total,
        status,
        type,
        table:tables(name)
      `)
      .gte('created_at', shift.opened_at)
      .neq('status', 'PAID')
      .neq('status', 'CANCELLED')
    
    console.log('Unpaid orders found:', unpaidOrders?.length || 0)
    console.log('Unpaid orders:', JSON.stringify(unpaidOrders, null, 2))

    // Filtrar órdenes que realmente no tienen pago
    let pendingOrders: any[] = []
    if (unpaidOrders && unpaidOrders.length > 0) {
      // Verificar cada orden para ver si tiene pagos
      for (const order of unpaidOrders) {
        const { data: payments } = await supabase
          .from('payments')
          .select('id')
          .eq('order_id', order.id)
          .limit(1)
        
        if (!payments || payments.length === 0) {
          const isTakeaway = !order.table || order.type === 'TAKEOUT' || order.type === 'TAKEAWAY' || order.type === 'DELIVERY'
          pendingOrders.push({
            orderNumber: order.order_number,
            tableName: isTakeaway 
              ? (order.type === 'DELIVERY' ? 'Domicilio' : 'Para Llevar')
              : ((order.table as any)?.name || 'Sin mesa'),
            total: order.total,
            type: isTakeaway ? 'takeaway' : 'table'
          })
        }
      }
    }

    // Si hay pedidos sin cobrar, NO PERMITIR el cierre (sin opción de forzar)
    if (pendingOrders.length > 0) {
      const tablePending = pendingOrders.filter(o => o.type === 'table')
      const takeawayPending = pendingOrders.filter(o => o.type === 'takeaway')
      
      return NextResponse.json(
        { 
          error: 'Hay pedidos sin cobrar',
          code: 'PENDING_ORDERS',
          pendingOrders: pendingOrders,
          tablePending: tablePending.length,
          takeawayPending: takeawayPending.length,
          message: `No se puede cerrar el turno. Hay ${tablePending.length} mesa(s) y ${takeawayPending.length} pedido(s) para llevar sin cobrar.`
        },
        { status: 400 }
      )
    }

    // Calcular ventas del turno
    const { data: transactions } = await supabase
      .from('payments')
      .select('amount, method')
      .gte('created_at', shift.opened_at)

    const cashSales = transactions?.filter(t => t.method === 'CASH').reduce((s, t) => s + Number(t.amount), 0) || 0
    const cardSales = transactions?.filter(t => t.method === 'CARD').reduce((s, t) => s + Number(t.amount), 0) || 0
    const transferSales = transactions?.filter(t => t.method === 'TRANSFER').reduce((s, t) => s + Number(t.amount), 0) || 0
    const totalSales = cashSales + cardSales + transferSales

    // Calcular monto esperado (apertura + ventas en efectivo)
    const expectedAmount = Number(shift.opening_amount) + cashSales
    const difference = (closing_amount || 0) - expectedAmount

    // Cerrar el turno
    const { data: closedShift, error } = await supabase
      .from('cash_registers')
      .update({
        status: 'CLOSED',
        closing_amount: closing_amount || 0,
        expected_amount: expectedAmount,
        difference: difference,
        cash_sales: cashSales,
        card_sales: cardSales,
        transfer_sales: transferSales,
        total_sales: totalSales,
        total_orders: transactions?.length || 0,
        notes: notes,
        closed_at: new Date().toISOString()
      })
      .eq('id', shift_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      shift: closedShift,
      summary: {
        opening_amount: Number(shift.opening_amount),
        cash_sales: cashSales,
        card_sales: cardSales,
        transfer_sales: transferSales,
        total_sales: totalSales,
        expected_amount: expectedAmount,
        closing_amount: closing_amount || 0,
        difference: difference,
        total_orders: transactions?.length || 0
      },
      message: 'Turno cerrado exitosamente'
    })
  } catch (error) {
    console.error('Error closing shift:', error)
    return NextResponse.json(
      { error: 'Error al cerrar turno' },
      { status: 500 }
    )
  }
}
