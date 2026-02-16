import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const SECRET = process.env.PRINT_POLLING_SECRET || ''

function authPoller(request: NextRequest): boolean {
  const header = request.headers.get('x-print-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return !!SECRET && SECRET === header
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Máximo tiempo que la API espera con long polling (Vercel ~10s límite). */
const LONG_POLL_WAIT_MS = 8000
const LONG_POLL_CHECK_MS = 500

async function fetchPendingJobs() {
  const { data, error } = await supabase
    .from('print_queue')
    .select('id, type, payload, created_at')
    .is('printed_at', null)
    .order('created_at', { ascending: true })
    .limit(20)
  if (error) throw error
  return data || []
}

/**
 * GET - Long polling: mantiene la conexión abierta hasta que haya trabajos o timeout.
 * ?longPoll=1 → espera hasta LONG_POLL_WAIT_MS revisando cada LONG_POLL_CHECK_MS (menos invocaciones en Vercel).
 * Sin longPoll → respuesta inmediata (comportamiento anterior).
 * Requiere header: x-print-secret: <PRINT_POLLING_SECRET>
 */
export async function GET(request: NextRequest) {
  if (!authPoller(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const longPoll = searchParams.get('longPoll') === '1' || searchParams.get('longPoll') === 'true'

    let jobs = await fetchPendingJobs()
    if (jobs.length > 0) {
      return NextResponse.json({ jobs })
    }
    if (!longPoll) {
      return NextResponse.json({ jobs: [] })
    }

    // Long poll: esperar hasta LONG_POLL_WAIT_MS revisando cada LONG_POLL_CHECK_MS
    const deadline = Date.now() + LONG_POLL_WAIT_MS
    while (Date.now() < deadline) {
      await sleep(LONG_POLL_CHECK_MS)
      jobs = await fetchPendingJobs()
      if (jobs.length > 0) {
        return NextResponse.json({ jobs })
      }
    }
    return NextResponse.json({ jobs: [] })
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
 * Body: { type: 'kitchen' | 'correction' | 'cash_drawer', payload?: object }
 * Para cash_drawer el payload puede ser {} (vacío).
 * Lo llaman: POST /api/orders (al crear orden), el cliente al enviar correcciones y al confirmar pago.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const type = body?.type
    let payload = body?.payload

    if (!type || !['kitchen', 'correction', 'cash_drawer'].includes(type)) {
      return NextResponse.json(
        { error: 'Se requiere type (kitchen|correction|cash_drawer) y payload (salvo cash_drawer)' },
        { status: 400 }
      )
    }

    if (type === 'cash_drawer') {
      payload = payload ?? {}
    } else if (!payload) {
      return NextResponse.json(
        { error: 'Se requiere payload para kitchen y correction' },
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
