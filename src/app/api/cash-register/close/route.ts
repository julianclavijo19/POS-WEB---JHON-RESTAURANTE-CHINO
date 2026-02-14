import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST - Cerrar caja
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { closingAmount, notes } = body

    const { data: register, error: findError } = await supabase
      .from('cash_registers')
      .select('*')
      .eq('status', 'OPEN')
      .single()

    if (findError || !register) {
      return NextResponse.json(
        { error: 'No hay caja abierta' },
        { status: 400 }
      )
    }

    // Calcular ventas en efectivo del período
    const { data: cashPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('cash_register_id', register.id)
      .eq('method', 'CASH')

    const cashSales = cashPayments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
    const expectedAmount = Number(register.opening_amount) + cashSales
    const difference = closingAmount - expectedAmount

    const { data: closedRegister, error } = await supabase
      .from('cash_registers')
      .update({
        status: 'CLOSED',
        closing_amount: closingAmount,
        expected_amount: expectedAmount,
        difference,
        notes,
        closed_at: new Date().toISOString(),
      })
      .eq('id', register.id)
      .select(`
        *,
        user:users(id, name)
      `)
      .single()

    if (error) throw error

    return NextResponse.json(closedRegister)
  } catch (error) {
    console.error('Error closing cash register:', error)
    return NextResponse.json(
      { error: 'Error al cerrar caja' },
      { status: 500 }
    )
  }
}
