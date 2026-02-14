import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

function formatDateStr(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

const periodLabels: Record<string, string> = {
    day: 'Día',
    week: 'Semana',
    month: 'Mes',
    year: 'Año',
}

const methodLabels: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const period = searchParams.get('period') || 'day'
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

        const parts = date.split('-').map(Number)
        const refYear = parts[0]
        const refMonth = parts[1] - 1
        const refDay = parts[2]

        // Build date range (Colombia UTC-5)
        let startISO: string
        let endISO: string
        let reportTitle: string

        switch (period) {
            case 'day': {
                startISO = `${date}T00:00:00-05:00`
                endISO = `${date}T23:59:59.999-05:00`
                reportTitle = `Ventas del ${date}`
                break
            }
            case 'week': {
                const ref = new Date(refYear, refMonth, refDay)
                const dow = ref.getDay()
                const mondayOffset = dow === 0 ? -6 : 1 - dow
                const monday = new Date(refYear, refMonth, refDay + mondayOffset)
                const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
                startISO = `${formatDateStr(monday)}T00:00:00-05:00`
                endISO = `${formatDateStr(sunday)}T23:59:59.999-05:00`
                reportTitle = `Ventas semana ${formatDateStr(monday)} al ${formatDateStr(sunday)}`
                break
            }
            case 'month': {
                const monthName = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][refMonth]
                const firstDay = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-01`
                const lastDayNum = new Date(refYear, refMonth + 1, 0).getDate()
                const lastDay = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`
                startISO = `${firstDay}T00:00:00-05:00`
                endISO = `${lastDay}T23:59:59.999-05:00`
                reportTitle = `Ventas de ${monthName} ${refYear}`
                break
            }
            case 'year': {
                startISO = `${refYear}-01-01T00:00:00-05:00`
                endISO = `${refYear}-12-31T23:59:59.999-05:00`
                reportTitle = `Ventas del año ${refYear}`
                break
            }
            default: {
                startISO = `${date}T00:00:00-05:00`
                endISO = `${date}T23:59:59.999-05:00`
                reportTitle = `Ventas del ${date}`
            }
        }

        // Fetch ALL payments with order and table info
        let allPayments: any[] = []
        let from = 0
        const pageSize = 1000
        let hasMore = true

        while (hasMore) {
            const { data: payments, error } = await supabase
                .from('payments')
                .select(`
          id,
          amount,
          method,
          change_amount,
          created_at,
          order:orders(
            id,
            order_number,
            table:tables(name)
          )
        `)
                .gte('created_at', startISO)
                .lte('created_at', endISO)
                .order('created_at', { ascending: true })
                .range(from, from + pageSize - 1)

            if (error) throw error

            const batch = payments || []
            allPayments = allPayments.concat(batch)
            hasMore = batch.length === pageSize
            from += pageSize
        }

        // Create workbook
        const wb = XLSX.utils.book_new()

        // ── Sheet 1: Resumen ──
        const totalAmount = allPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
        const totalCount = allPayments.length

        const cashTotal = allPayments.filter((p: any) => p.method?.toUpperCase() === 'CASH').reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0)
        const cardTotal = allPayments.filter((p: any) => p.method?.toUpperCase() === 'CARD').reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0)
        const transferTotal = allPayments.filter((p: any) => p.method?.toUpperCase() === 'TRANSFER').reduce((a: number, p: any) => a + (Number(p.amount) || 0), 0)

        const cashCount = allPayments.filter((p: any) => p.method?.toUpperCase() === 'CASH').length
        const cardCount = allPayments.filter((p: any) => p.method?.toUpperCase() === 'CARD').length
        const transferCount = allPayments.filter((p: any) => p.method?.toUpperCase() === 'TRANSFER').length

        const amounts = allPayments.map((p: any) => Number(p.amount) || 0)
        const avgTicket = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0
        const maxSale = amounts.length > 0 ? Math.max(...amounts) : 0
        const minSale = amounts.length > 0 ? Math.min(...amounts) : 0

        const resumenData = [
            [reportTitle],
            [`Periodo: ${periodLabels[period]}`],
            [`Generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`],
            [],
            ['RESUMEN GENERAL'],
            ['Concepto', 'Valor'],
            ['Total Ventas', totalAmount],
            ['Cantidad de Transacciones', totalCount],
            ['Ticket Promedio', avgTicket],
            ['Venta Máxima', maxSale],
            ['Venta Mínima', minSale],
            [],
            ['DESGLOSE POR MÉTODO DE PAGO'],
            ['Método', 'Total', 'Cantidad', '% del Total'],
            ['Efectivo', cashTotal, cashCount, totalAmount > 0 ? `${Math.round((cashTotal / totalAmount) * 100)}%` : '0%'],
            ['Tarjeta', cardTotal, cardCount, totalAmount > 0 ? `${Math.round((cardTotal / totalAmount) * 100)}%` : '0%'],
            ['Transferencia', transferTotal, transferCount, totalAmount > 0 ? `${Math.round((transferTotal / totalAmount) * 100)}%` : '0%'],
        ]

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)

        // Set column widths
        wsResumen['!cols'] = [
            { wch: 30 },
            { wch: 18 },
            { wch: 12 },
            { wch: 12 },
        ]

        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

        // ── Sheet 2: Detalle de Ventas ──
        const detalleHeaders = ['#', 'Fecha', 'Hora', 'Orden', 'Mesa', 'Método de Pago', 'Monto', 'Cambio']

        const detalleRows = allPayments.map((p: any, idx: number) => {
            const utcDate = new Date(p.created_at)
            const colombiaDate = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000)

            const dateStr = `${colombiaDate.getUTCFullYear()}-${String(colombiaDate.getUTCMonth() + 1).padStart(2, '0')}-${String(colombiaDate.getUTCDate()).padStart(2, '0')}`
            const timeStr = `${String(colombiaDate.getUTCHours()).padStart(2, '0')}:${String(colombiaDate.getUTCMinutes()).padStart(2, '0')}`

            return [
                idx + 1,
                dateStr,
                timeStr,
                p.order?.order_number || '-',
                p.order?.table?.name || 'Para llevar',
                methodLabels[p.method?.toUpperCase()] || p.method || '-',
                Number(p.amount) || 0,
                Number(p.change_amount) || 0,
            ]
        })

        const detalleData = [detalleHeaders, ...detalleRows]
        const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData)

        wsDetalle['!cols'] = [
            { wch: 6 },
            { wch: 12 },
            { wch: 8 },
            { wch: 28 },
            { wch: 16 },
            { wch: 16 },
            { wch: 14 },
            { wch: 10 },
        ]

        XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Ventas')

        // ── Sheet 3: Ventas por Periodo ──
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

        const bucketMap: Record<string, { total: number; count: number }> = {}

        if (period === 'day') {
            for (let h = 0; h < 24; h++) {
                bucketMap[`${h.toString().padStart(2, '0')}:00`] = { total: 0, count: 0 }
            }
        } else if (period === 'week') {
            const ref = new Date(refYear, refMonth, refDay)
            const dow = ref.getDay()
            const mondayOffset = dow === 0 ? -6 : 1 - dow
            for (let i = 0; i < 7; i++) {
                const d = new Date(refYear, refMonth, refDay + mondayOffset + i)
                bucketMap[`${dayNames[d.getDay()]} ${d.getDate()}`] = { total: 0, count: 0 }
            }
        } else if (period === 'month') {
            const daysInMonth = new Date(refYear, refMonth + 1, 0).getDate()
            for (let d = 1; d <= daysInMonth; d++) {
                bucketMap[String(d).padStart(2, '0')] = { total: 0, count: 0 }
            }
        } else {
            for (let m = 0; m < 12; m++) {
                bucketMap[monthNames[m]] = { total: 0, count: 0 }
            }
        }

        allPayments.forEach((p: any) => {
            const utcDate = new Date(p.created_at)
            const colombiaDate = new Date(utcDate.getTime() - 5 * 60 * 60 * 1000)
            const amount = Number(p.amount) || 0
            let key: string

            if (period === 'day') {
                key = `${colombiaDate.getUTCHours().toString().padStart(2, '0')}:00`
            } else if (period === 'week') {
                key = `${dayNames[colombiaDate.getUTCDay()]} ${colombiaDate.getUTCDate()}`
            } else if (period === 'month') {
                key = String(colombiaDate.getUTCDate()).padStart(2, '0')
            } else {
                key = monthNames[colombiaDate.getUTCMonth()]
            }

            if (!bucketMap[key]) bucketMap[key] = { total: 0, count: 0 }
            bucketMap[key].total += amount
            bucketMap[key].count += 1
        })

        const periodoHeaders = ['Periodo', 'Total Ventas', '# Transacciones']
        const periodoRows = Object.entries(bucketMap).map(([label, data]) => [
            label,
            Math.round(data.total),
            data.count,
        ])

        const wsPeriodo = XLSX.utils.aoa_to_sheet([periodoHeaders, ...periodoRows])
        wsPeriodo['!cols'] = [
            { wch: 16 },
            { wch: 16 },
            { wch: 16 },
        ]

        XLSX.utils.book_append_sheet(wb, wsPeriodo, `Ventas por ${periodLabels[period]}`)

        // Generate buffer
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

        const fileName = `estadisticas-${period}-${date}.xlsx`

        return new NextResponse(buf, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        })
    } catch (error) {
        console.error('Error exporting statistics:', error)
        return NextResponse.json(
            { error: 'Error al exportar estadísticas' },
            { status: 500 }
        )
    }
}
