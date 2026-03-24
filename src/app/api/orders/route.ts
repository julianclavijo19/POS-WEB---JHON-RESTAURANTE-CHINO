import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateDailyOrderNumber, isUniqueConstraintError } from '@/lib/order-number'
import { cookies } from 'next/headers'
import { getTaxRate } from '@/lib/tax'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return UUID_REGEX.test(trimmed) ? trimmed : null
}

function toErrorMessage(error: any): string {
  if (!error) return 'Error desconocido'
  if (typeof error === 'string') return error
  if (error.message && typeof error.message === 'string') return error.message
  if (error.details && typeof error.details === 'string') return error.details
  if (error.hint && typeof error.hint === 'string') return error.hint
  try {
    return JSON.stringify(error)
  } catch {
    return 'Error desconocido'
  }
}

// GET - Obtener órdenes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const tableId = searchParams.get('tableId') || searchParams.get('table_id')
    const waiterId = searchParams.get('waiterId') || searchParams.get('waiter_id')
    const myOrders = searchParams.get('myOrders') === 'true'
    const unpaid = searchParams.get('unpaid') === 'true'
    const period = searchParams.get('period') || 'today'
    const specificDate = searchParams.get('date')

    let query = supabase
      .from('orders')
      .select(`
        *,
        table:tables(*,area:areas(*)),
        waiter:users!orders_waiter_id_fkey(id, name),
        items:order_items(*,product:products(*)),
        payment:payments(*)
      `)

    // Filtrar por fecha específica o periodo
    if (specificDate) {
      const startOfDay = specificDate + 'T00:00:00'
      const endOfDay = specificDate + 'T23:59:59.999'
      query = query.gte('created_at', startOfDay).lte('created_at', endOfDay)
    } else if (period) {
      let startDate = new Date()
      startDate.setHours(0, 0, 0, 0)

      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7)
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1)
      } else if (period !== 'all') {
        // today - ya está configurado
      }

      if (period !== 'all') {
        query = query.gte('created_at', startDate.toISOString())
      }
    }

    // Si es myOrders, obtener el ID del usuario de la cookie
    if (myOrders) {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get('session')
      if (sessionCookie) {
        try {
          const sessionData = JSON.parse(decodeURIComponent(sessionCookie.value))
          query = query.eq('waiter_id', sessionData.id)
        } catch (e) {
          console.error('Error parsing session:', e)
        }
      }
    }

    // Filtrar por estado - para unpaid, buscar órdenes listas para cobrar
    if (unpaid) {
      // Órdenes listas para cobrar que no estén pagadas
      // Incluir PENDING también para órdenes para llevar que pueden cobrarse directamente
      query = query.in('status', ['DELIVERED', 'SERVED', 'READY', 'PENDING', 'IN_KITCHEN'])
      query = query.is('paid_at', null)
      query = query.neq('status', 'PAID')
      query = query.neq('status', 'CANCELLED')
    } else if (status) {
      if (status.includes(',')) {
        query = query.in('status', status.split(',').map(s => s.toUpperCase()))
      } else {
        query = query.eq('status', status.toUpperCase())
      }
    }

    if (tableId) {
      query = query.eq('table_id', tableId)
    }

    if (waiterId) {
      query = query.eq('waiter_id', waiterId)
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Filtrar órdenes que realmente no tengan pago si es unpaid
    let filteredOrders = orders || []
    if (unpaid) {
      filteredOrders = filteredOrders.filter((order: any) => {
        // Si tiene pagos registrados, no incluir
        if (order.payment && order.payment.length > 0) return false
        // Si el status es PAID, no incluir
        if (order.status === 'PAID') return false
        return true
      })
    }

    // Transformar los datos a camelCase para el frontend
    const transformedOrders = (filteredOrders).map((order: any) => ({
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      type: order.type,
      notes: order.notes,
      subtotal: Number(order.subtotal) || 0,
      tax: Number(order.tax) || 0,
      total: Number(order.total) || 0,
      discount: Number(order.discount) || 0,
      tip: Number(order.tip) || 0,
      paymentMethod: order.payment_method || order.payment?.[0]?.method,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      paidAt: order.paid_at || order.payment?.[0]?.created_at,
      table: order.table ? {
        id: order.table.id,
        name: order.table.name || `Mesa ${order.table.number}`,
        number: order.table.number,
        capacity: order.table.capacity,
        area: order.table.area
      } : null,
      waiter: order.waiter,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price) || 0,
        subtotal: Number(item.subtotal) || 0,
        notes: item.notes,
        status: item.status || 'pending',
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          price: Number(item.product.price) || 0,
          description: item.product.description
        } : null
      })),
      payment: order.payment
    }))

    return NextResponse.json(transformedOrders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Error al obtener órdenes' },
      { status: 500 }
    )
  }
}

// POST - Crear orden
export async function POST(request: Request) {
  console.log('📥 POST /api/orders - Inicio')
  try {
    const body = await request.json()
    console.log('📋 Body recibido:', JSON.stringify(body, null, 2))

    const { tableId, table_id, waiterId, waiter_id, orderType, notes, items } = body

    const finalTableId = sanitizeUuid(tableId || table_id)
    const finalWaiterId = sanitizeUuid(waiterId || waiter_id)

    const rawItems = Array.isArray(items) ? items : []
    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: 'La orden debe incluir al menos un item válido' },
        { status: 400 }
      )
    }

    // Normalizar y consolidar líneas repetidas para evitar x2 por doble click/tap.
    const normalizedItemsMap = new Map<string, {
      productId: string
      quantity: number
      notes: string | null
      priority?: string
      tiempo?: string
      comensal?: number
    }>()

    for (const rawItem of rawItems) {
      const productId = rawItem.productId || rawItem.product_id
      const parsedQuantity = Number(rawItem.quantity)
      const quantity = Number.isFinite(parsedQuantity) ? Math.max(0, Math.floor(parsedQuantity)) : 0

      if (!productId || quantity <= 0) {
        continue
      }

      const notesValue = typeof rawItem.notes === 'string' ? rawItem.notes.trim() : ''
      const priorityValue = typeof rawItem.priority === 'string' ? rawItem.priority : ''
      const tiempoValue = typeof rawItem.tiempo === 'string' ? rawItem.tiempo : ''
      const comensalValue = rawItem.comensal ?? ''
      const mergeKey = `${productId}::${notesValue}::${priorityValue}::${tiempoValue}::${comensalValue}`

      const existing = normalizedItemsMap.get(mergeKey)
      if (existing) {
        existing.quantity += quantity
      } else {
        normalizedItemsMap.set(mergeKey, {
          productId,
          quantity,
          notes: notesValue || null,
          priority: priorityValue || undefined,
          tiempo: tiempoValue || undefined,
          comensal: Number.isFinite(Number(comensalValue)) ? Number(comensalValue) : undefined,
        })
      }
    }

    const normalizedItems = Array.from(normalizedItemsMap.values())
    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: 'No hay items válidos para crear la orden' },
        { status: 400 }
      )
    }

    console.log('📌 IDs:', { finalTableId, finalWaiterId, itemsCount: normalizedItems.length, rawItemsCount: rawItems.length })

    let resolvedWaiterId: string | null = finalWaiterId
    if (finalWaiterId) {
      const { data: waiterExists, error: waiterExistsError } = await supabase
        .from('users')
        .select('id')
        .eq('id', finalWaiterId)
        .maybeSingle()

      if (waiterExistsError) {
        console.error('❌ Error validando waiter_id:', waiterExistsError)
      }

      if (!waiterExists) {
        console.warn('⚠️ waiter_id inválido para FK, se omitirá en la orden:', finalWaiterId)
        resolvedWaiterId = null
      }
    }

    // Obtener precios de productos - soportar ambos nombres de propiedades
    const productIds = normalizedItems.map((i: any) => i.productId)
    console.log('🔍 Buscando productos:', productIds)

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)

    if (productsError) {
      console.error('❌ Error obteniendo productos:', productsError)
    }
    console.log('✓ Productos encontrados:', products?.length)

    if (!products || products.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos válidos para la orden' },
        { status: 400 }
      )
    }

    // Calcular totales
    let subtotal = 0
    const orderItems = []

    for (const item of normalizedItems) {
      const productId = item.productId
      const product = products?.find((p: any) => p.id === productId)
      if (product) {
        const itemSubtotal = Number(product.price) * item.quantity
        subtotal += itemSubtotal
        orderItems.push({
          product_id: productId,
          quantity: item.quantity,
          unit_price: product.price,
          subtotal: itemSubtotal,
          notes: item.notes,
        })
      }
    }

    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: 'No se pudieron procesar los items de la orden' },
        { status: 400 }
      )
    }

    console.log('💰 Subtotal calculado:', subtotal, 'Items:', orderItems.length)

    const taxRate = await getTaxRate()
    const tax = subtotal * taxRate
    const total = subtotal + tax

    // Crear la orden - va directo a DELIVERED para que caja pueda cobrar
    // (La cocina trabaja sin sistema, solo gritan cuando está listo)
    let order: any = null
    let orderError: any = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNumber = await generateDailyOrderNumber()
      const insertResult = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          table_id: finalTableId || null,
          waiter_id: resolvedWaiterId,
          type: orderType || 'DINE_IN',
          status: 'DELIVERED',
          notes,
          subtotal,
          tax,
          total,
        })
        .select()
        .single()

      order = insertResult.data
      orderError = insertResult.error

      if (!orderError) {
        break
      }

      if (!isUniqueConstraintError(orderError)) {
        break
      }
    }

    if (orderError || !order) {
      console.error('❌ Error creando orden:', orderError)
      throw new Error(toErrorMessage(orderError))
    }
    console.log('✓ Orden creada:', order.id)

    // Crear items de la orden
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsWithOrderId)

    if (itemsError) {
      console.error('❌ Error creando items:', itemsError)
      throw new Error(toErrorMessage(itemsError))
    }
    console.log('✓ Items creados:', itemsWithOrderId.length)

    // Actualizar estado de la mesa
    if (finalTableId) {
      await supabase
        .from('tables')
        .update({ status: 'OCCUPIED' })
        .eq('id', finalTableId)
    }

    // Obtener datos de la mesa para imprimir (incluyendo área)
    let tableName = 'N/A'
    let areaName = ''
    if (finalTableId) {
      const { data: tableData } = await supabase
        .from('tables')
        .select('name, number, area:areas(name)')
        .eq('id', finalTableId)
        .single()
      if (tableData) {
        tableName = tableData.name || `Mesa ${tableData.number}`
        areaName = (tableData.area as any)?.name || ''
      }
    }

    // Obtener nombre del mesero
    let waiterName = 'N/A'
    if (resolvedWaiterId) {
      const { data: waiterData } = await supabase
        .from('users')
        .select('name')
        .eq('id', resolvedWaiterId)
        .single()
      if (waiterData) {
        waiterName = waiterData.name || 'N/A'
      }
    }
    console.log('🪑 Mesa:', tableName, 'Área:', areaName, 'Mesero:', waiterName)

    // Para pedidos sin mesa, identificar como Para llevar o Domicilio
    const tipoOrden = orderType || 'DINE_IN'
    let mesaComanda = tableName
    if (!finalTableId) {
      mesaComanda = tipoOrden === 'DELIVERY' ? 'Domicilio' : tipoOrden === 'TAKEOUT' || tipoOrden === 'TAKEAWAY' ? 'Para llevar' : 'N/A'
    }

    // Encolar comanda para el servidor de impresión (polling)
    const kitchenPrintPayload = {
      orderNumber: order.order_number,
      mesa: mesaComanda,
      mesero: waiterName,
      area: areaName || 'N/A',
      orderType: tipoOrden,
      type: tipoOrden,
      items: orderItems.map((item: any) => ({
        nombre: products?.find((p: any) => p.id === item.product_id)?.name || 'Producto',
        cantidad: item.quantity,
        notas: item.notes || '',
      })),
      total: Number(total) || 0,
      hora: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
      }),
    }
    const duplicateWindowIso = new Date(Date.now() - 20000).toISOString()
    const { data: recentKitchenJobs, error: recentJobsError } = await supabase
      .from('print_queue')
      .select('id')
      .eq('type', 'kitchen')
      .contains('payload', { orderNumber: String(order.order_number) })
      .gte('created_at', duplicateWindowIso)
      .limit(1)

    if (recentJobsError) {
      console.error('Error validando duplicados de impresión:', recentJobsError)
    }

    if (!recentKitchenJobs || recentKitchenJobs.length === 0) {
      await supabase
        .from('print_queue')
        .insert({ type: 'kitchen', payload: kitchenPrintPayload })
        .then(({ error }) => {
          if (error) console.error('Error encolando impresión:', error)
        })
    } else {
      console.log('⚠️ Impresión kitchen omitida por posible duplicado reciente')
    }

    // Obtener la orden completa para devolver al cliente
    const { data: fullOrder } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(*,area:areas(*)),
        waiter:users!orders_waiter_id_fkey(id, name),
        items:order_items(*,product:products(*))
      `)
      .eq('id', order.id)
      .single()

    // Devolver orden; la impresión la hace el print-server por polling
    return NextResponse.json({
      ...(fullOrder || order),
      printResult: { fromClient: true }
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    const detailedMessage = toErrorMessage(error)
    return NextResponse.json(
      { error: `Error al crear orden: ${detailedMessage}` },
      { status: 500 }
    )
  }
}
