import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Obtener historial de cierres de caja
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    // Use UTC boundaries for the date range
    const fromStr = from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const toStr = to || new Date().toISOString().split('T')[0]
    const startDate = `${fromStr}T00:00:00.000Z`
    const endDate = `${toStr}T23:59:59.999Z`

    // Obtener cierres de caja del período
    const { data: registers, error } = await supabase
      .from('cash_registers')
      .select(`
        id,
        user_id,
        opening_amount,
        closing_amount,
        expected_amount,
        difference,
        cash_sales,
        card_sales,
        transfer_sales,
        total_sales,
        total_orders,
        status,
        notes,
        opened_at,
        closed_at,
        register_type,
        user:users(name, email)
      `)
      .gte('opened_at', startDate)
      .lte('opened_at', endDate)
      .order('opened_at', { ascending: false })

    if (error) throw error

    console.log('=== HISTORIAL CAJA DEBUG ===')
    console.log('Registers found:', registers?.length || 0)
    
    // Calcular ventas reales para cada registro basado en pagos
    const registersWithSales = await Promise.all((registers || []).map(async (register) => {
      const closedAt = register.closed_at || new Date().toISOString()
      
      console.log(`\n--- Register ${register.id} ---`)
      console.log('Opened at:', register.opened_at)
      console.log('Closed at:', closedAt)
      
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, method, order_id')
        .gte('created_at', register.opened_at)
        .lte('created_at', closedAt)
      
      if (paymentsError) {
        console.log('Payments error:', paymentsError)
      }
      console.log('Payments found:', payments?.length || 0)
      if (payments && payments.length > 0) {
        console.log('First payment:', JSON.stringify(payments[0], null, 2))
      }

      const cash_sales = payments?.filter(p => p.method === 'CASH').reduce((s, p) => s + Number(p.amount), 0) || 0
      const card_sales = payments?.filter(p => p.method === 'CARD').reduce((s, p) => s + Number(p.amount), 0) || 0
      const transfer_sales = payments?.filter(p => p.method === 'TRANSFER').reduce((s, p) => s + Number(p.amount), 0) || 0
      const total_sales = cash_sales + card_sales + transfer_sales
      const total_orders = payments?.length || 0
      const tips = 0 // Tip column doesn't exist in payments table
      
      // Calcular expected_amount y difference
      const expected_amount = Number(register.opening_amount || 0) + cash_sales
      const difference = register.closing_amount !== null 
        ? Number(register.closing_amount) - expected_amount 
        : null

      return {
        ...register,
        cash_sales,
        card_sales,
        transfer_sales,
        total_sales,
        total_orders,
        tips,
        expected_amount,
        difference: register.status === 'CLOSED' ? difference : null
      }
    }))

    // Calcular estadísticas
    const closedRegisters = registersWithSales.filter(r => r.status === 'CLOSED')
    const stats = {
      totalTurnos: closedRegisters.length,
      totalVentas: registersWithSales.reduce((s, r) => s + r.total_sales, 0),
      diferenciaNeta: closedRegisters.reduce((s, r) => s + (r.difference || 0), 0),
      promedioVentasTurno: closedRegisters.length > 0 
        ? closedRegisters.reduce((s, r) => s + r.total_sales, 0) / closedRegisters.length 
        : 0
    }

    return NextResponse.json({
      registers: registersWithSales,
      stats
    })

  } catch (error) {
    console.error('Error fetching cash register history:', error)
    return NextResponse.json(
      { error: 'Error al cargar el historial de caja' },
      { status: 500 }
    )
  }
}
