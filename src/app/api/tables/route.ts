import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const ACTIVE_ORDER_STATUSES = ['PENDING', 'IN_KITCHEN', 'READY', 'DELIVERED']

function toUiStatus(status: string | null | undefined): string {
  if (!status) return 'FREE'
  if (status === 'AVAILABLE') return 'FREE'
  if (status === 'MAINTENANCE') return 'CLEANING'
  return status
}

function normalizeTableForUi(table: any) {
  if (!table) return table
  return {
    ...table,
    status: toUiStatus(table.status),
  }
}

function getEffectiveTableStatus(table: any, hasActiveOrder: boolean): string {
  if (hasActiveOrder) {
    return 'OCCUPIED'
  }

  return toUiStatus(table?.status)
}

async function getActiveTableIds(tableIds: string[]): Promise<Set<string>> {
  if (tableIds.length === 0) {
    return new Set()
  }

  const { data: activeOrders, error } = await supabase
    .from('orders')
    .select('table_id')
    .in('table_id', tableIds)
    .in('status', ACTIVE_ORDER_STATUSES)

  if (error) {
    console.error('Error fetching active orders for tables:', error)
    return new Set()
  }

  return new Set(
    (activeOrders || [])
      .map((order: any) => order.table_id)
      .filter((tableId: any) => Boolean(tableId))
  )
}

async function normalizeTablesWithRuntimeStatus(tables: any[]) {
  const activeTableIds = await getActiveTableIds(
    tables.map((table: any) => table.id).filter(Boolean)
  )

  return tables.map((table: any) => {
    const hasActiveOrder = activeTableIds.has(table.id)

    return {
      ...table,
      status: getEffectiveTableStatus(table, hasActiveOrder),
      has_active_order: hasActiveOrder,
    }
  })
}

function isTableStatusEnumError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('table_status') && message.includes('invalid input value for enum')
}

function getStatusCandidates(inputStatus: string | undefined): string[] {
  const status = inputStatus || 'FREE'

  switch (status) {
    case 'FREE':
      return ['FREE', 'AVAILABLE']
    case 'AVAILABLE':
      return ['AVAILABLE', 'FREE']
    case 'CLEANING':
      return ['CLEANING', 'MAINTENANCE']
    case 'MAINTENANCE':
      return ['MAINTENANCE', 'CLEANING']
    default:
      return [status]
  }
}

function buildErrorResponse(error: any, fallbackMessage: string) {
  if (error?.code === '23505') {
    return NextResponse.json(
      { error: 'Ya existe una mesa con ese numero en esta area' },
      { status: 409 }
    )
  }

  if (error?.code === '23503') {
    return NextResponse.json(
      { error: 'El area seleccionada no existe' },
      { status: 400 }
    )
  }

  if (isTableStatusEnumError(error)) {
    return NextResponse.json(
      { error: 'Estado de mesa invalido' },
      { status: 400 }
    )
  }

  if (error?.code === '22P02') {
    return NextResponse.json(
      { error: 'Datos invalidos para la mesa' },
      { status: 400 }
    )
  }

  const details = process.env.NODE_ENV !== 'production' && error?.message
    ? { details: error.message }
    : {}

  return NextResponse.json(
    { error: fallbackMessage, ...details },
    { status: 500 }
  )
}

// GET - Obtener todas las mesas
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('areaId')
    const status = searchParams.get('status')

    let query = supabase
      .from('tables')
      .select(`
        *,
        area:areas(*)
      `)

    if (areaId) {
      query = query.eq('area_id', areaId)
    }

    const { data: tables, error } = await query.order('number')

    if (error) throw error

    const normalizedTables = await normalizeTablesWithRuntimeStatus(
      (tables || []).map(normalizeTableForUi)
    )

    const requestedStatus = status ? toUiStatus(status) : null
    const filteredTables = requestedStatus
      ? normalizedTables.filter((table: any) => table.status === requestedStatus)
      : normalizedTables

    return NextResponse.json(filteredTables)
  } catch (error) {
    console.error('Error fetching tables:', error)
    return buildErrorResponse(error, 'Error al obtener mesas')
  }
}

// POST - Crear mesa
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { number, name, capacity, area_id, areaId, status, is_active } = body
    const resolvedAreaId = area_id || areaId

    if (!resolvedAreaId) {
      return NextResponse.json(
        { error: 'Debe seleccionar un area' },
        { status: 400 }
      )
    }

    const statusCandidates = getStatusCandidates(status)
    let table: any = null
    let lastError: any = null

    for (const statusValue of statusCandidates) {
      const { data, error } = await supabase
        .from('tables')
        .insert({
          number,
          name,
          capacity: capacity || 4,
          area_id: resolvedAreaId,
          status: statusValue,
          is_active: is_active !== undefined ? is_active : true,
        })
        .select(`
          *,
          area:areas(*)
        `)
        .single()

      if (!error) {
        table = data
        lastError = null
        break
      }

      lastError = error
      if (!isTableStatusEnumError(error)) {
        break
      }
    }

    if (lastError) throw lastError

    return NextResponse.json(normalizeTableForUi(table), { status: 201 })
  } catch (error) {
    console.error('Error creating table:', error)
    return buildErrorResponse(error, 'Error al crear mesa')
  }
}
