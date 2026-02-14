import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SECRET = process.env.PRINT_POLLING_SECRET || ''

function authPoller(request: NextRequest): boolean {
  const header = request.headers.get('x-print-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return !!SECRET && SECRET === header
}

/**
 * GET - El print-server hace polling cada segundo.
 * Devuelve trabajos pendientes (printed_at IS NULL).
 * Requiere header: x-print-secret: <PRINT_POLLING_SECRET>
 */
export async function GET(request: NextRequest) {
  if (!authPoller(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { data, error } = await supabase
      .from('print_queue')
      .select('id, type, payload, created_at')
      .is('printed_at', null)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ jobs: data || [] })
  } catch (e: any) {
    console.error('Error GET print-queue:', e)
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}

/**
 * PATCH - Marcar trabajos como impresos (lo llama el print-server tras imprimir).
 * Body: { printedIds: string[] }
 */
export async function PATCH(request: NextRequest) {
  if (!authPoller(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const printedIds = body?.printedIds
    if (!Array.isArray(printedIds) || printedIds.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 })
    }
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('print_queue')
      .update({ printed_at: now })
      .in('id', printedIds)

    if (error) throw error
    return NextResponse.json({ ok: true, updated: printedIds.length })
  } catch (e: any) {
    console.error('Error PATCH print-queue:', e)
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}

/**
 * POST - Encolar un trabajo de impresión.
 * Body: { type: 'kitchen' | 'correction', payload: object }
 * Lo llaman: POST /api/orders (al crear orden) y el cliente al enviar correcciones.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const type = body?.type
    const payload = body?.payload

    if (!type || !payload || !['kitchen', 'correction'].includes(type)) {
      return NextResponse.json(
        { error: 'Se requiere type (kitchen|correction) y payload' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('print_queue')
      .insert({ type, payload })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data?.id, ok: true }, { status: 201 })
  } catch (e: any) {
    console.error('Error POST print-queue:', e)
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
