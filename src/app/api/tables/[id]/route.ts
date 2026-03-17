import { NextRequest, NextResponse } from 'next/server'
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

async function tableHasActiveOrder(tableId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .select('id')
    .eq('table_id', tableId)
    .in('status', ACTIVE_ORDER_STATUSES)
    .limit(1)

  if (error) {
    console.error('Error checking active orders for table:', tableId, error)
    return false
  }

  return Boolean(data && data.length > 0)
}

function isTableStatusEnumError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('table_status') && message.includes('invalid input value for enum')
}

function getStatusCandidates(inputStatus: string | undefined): string[] {
  if (!inputStatus) return []

  switch (inputStatus) {
    case 'FREE':
      return ['FREE', 'AVAILABLE']
    case 'AVAILABLE':
      return ['AVAILABLE', 'FREE']
    case 'CLEANING':
      return ['CLEANING', 'MAINTENANCE']
    case 'MAINTENANCE':
      return ['MAINTENANCE', 'CLEANING']
    default:
      return [inputStatus]
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

// GET /api/tables/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const { data, error } = await supabase
      .from('tables')
      .select('*, area:areas(*)')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 })
    }

    const hasActiveOrder = await tableHasActiveOrder(id)

    return NextResponse.json({
      ...data,
      status: getEffectiveTableStatus(data, hasActiveOrder),
      has_active_order: hasActiveOrder,
    })
  } catch (error: any) {
    return buildErrorResponse(error, 'Error al obtener mesa')
  }
}

// PUT - Actualizar mesa completa
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const hasActiveOrder = await tableHasActiveOrder(id)

    if (hasActiveOrder) {
      return NextResponse.json(
        { error: 'No se puede modificar o reservar una mesa ocupada. Desocupela primero.' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { name, number, capacity, area_id, areaId, status, is_active } = body
    const resolvedAreaId = area_id ?? areaId

    const baseUpdate: Record<string, any> = {}
    if (name !== undefined) baseUpdate.name = name
    if (number !== undefined) baseUpdate.number = number
    if (capacity !== undefined) baseUpdate.capacity = capacity
    if (resolvedAreaId !== undefined) baseUpdate.area_id = resolvedAreaId
    if (is_active !== undefined) baseUpdate.is_active = is_active

    const statusCandidates = getStatusCandidates(status)
    const candidatesToTry = statusCandidates.length > 0 ? statusCandidates : [undefined]

    let updatedTable: any = null
    let lastError: any = null

    for (const statusValue of candidatesToTry) {
      const payload =
        statusValue === undefined
          ? { ...baseUpdate }
          : { ...baseUpdate, status: statusValue }

      const { data, error } = await supabase
        .from('tables')
        .update(payload)
        .eq('id', id)
        .select('*, area:areas(*)')
        .single()

      if (!error) {
        updatedTable = data
        lastError = null
        break
      }

      lastError = error
      if (!isTableStatusEnumError(error)) {
        break
      }
    }

    if (lastError) throw lastError

    return NextResponse.json(normalizeTableForUi(updatedTable))
  } catch (error: any) {
    return buildErrorResponse(error, 'Error al actualizar mesa')
  }
}

// PATCH - Actualizar estado de mesa
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const hasActiveOrder = await tableHasActiveOrder(id)

    if (hasActiveOrder) {
      return NextResponse.json(
        { error: 'No se puede modificar o reservar una mesa ocupada. Desocupela primero.' },
        { status: 409 }
      )
    }

    const body = await request.json()
    const { status } = body

    const statusCandidates = getStatusCandidates(status)
    let table: any = null
    let lastError: any = null

    for (const statusValue of statusCandidates) {
      const { data, error } = await supabase
        .from('tables')
        .update({ status: statusValue })
        .eq('id', id)
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

    return NextResponse.json(normalizeTableForUi(table))
  } catch (error) {
    console.error('Error updating table:', error)
    return buildErrorResponse(error, 'Error al actualizar mesa')
  }
}

// DELETE - Eliminar mesa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verificar si hay órdenes activas en esta mesa
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', id)
      .neq('status', 'PAID')
      .neq('status', 'CANCELLED')
      .limit(1)

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar: hay órdenes activas en esta mesa' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return buildErrorResponse(error, 'Error al eliminar mesa')
  }
}
