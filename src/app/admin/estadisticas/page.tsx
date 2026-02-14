'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
	Calendar, RefreshCw, BarChart3, TrendingUp, Receipt, Hash,
	ArrowUpRight, ArrowDownRight, Download
} from 'lucide-react'

type Period = 'day' | 'week' | 'month' | 'year'

interface SalesPoint {
	date: string
	total: number
	count: number
}

interface SalesSummary {
	total: number
	count: number
	avgTicket: number
	maxSale: number
	minSale: number
}

// SVG Bar Chart component
function SalesBarChart({ data, loading }: { data: SalesPoint[]; loading: boolean }) {
	const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
	const [animateIn, setAnimateIn] = useState(false)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!loading && data.length > 0) {
			setAnimateIn(false)
			const timer = setTimeout(() => setAnimateIn(true), 50)
			return () => clearTimeout(timer)
		}
	}, [data, loading])

	if (loading) {
		return (
			<div className="flex items-center justify-center h-80">
				<div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
			</div>
		)
	}

	if (data.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-80 text-gray-400">
				<BarChart3 className="h-12 w-12 mb-3" />
				<p className="text-sm font-medium">Sin datos para este periodo</p>
			</div>
		)
	}

	const maxVal = Math.max(...data.map(d => d.total), 1)
	const chartHeight = 280
	const chartPadding = { top: 20, bottom: 50, left: 0, right: 0 }
	const barAreaHeight = chartHeight - chartPadding.top - chartPadding.bottom
	const barGap = data.length > 15 ? 2 : 4

	// show only some labels when too many
	const showEveryNth = data.length > 20 ? Math.ceil(data.length / 12) : data.length > 12 ? 2 : 1

	return (
		<div ref={containerRef} className="relative w-full" style={{ height: chartHeight }}>
			{/* Y-axis guides */}
			<svg className="absolute inset-0 w-full h-full" viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none">
				{[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
					const y = chartPadding.top + barAreaHeight * (1 - frac)
					return (
						<line
							key={i}
							x1="0" y1={y} x2="100" y2={y}
							stroke="#f3f4f6"
							strokeWidth="0.3"
							vectorEffect="non-scaling-stroke"
						/>
					)
				})}
			</svg>

			{/* Y-axis labels */}
			<div className="absolute left-0 top-0 h-full flex flex-col justify-between pointer-events-none" style={{ paddingTop: chartPadding.top, paddingBottom: chartPadding.bottom }}>
				{[1, 0.75, 0.5, 0.25, 0].map((frac, i) => (
					<span key={i} className="text-[10px] text-gray-400 leading-none -mt-1">
						{formatCurrency(maxVal * frac)}
					</span>
				))}
			</div>

			{/* Bars */}
			<div
				className="absolute bottom-0 left-16 right-0 flex items-end"
				style={{ height: chartHeight - chartPadding.bottom, paddingTop: chartPadding.top, gap: barGap }}
			>
				{data.map((point, index) => {
					const heightPercent = maxVal > 0 ? (point.total / maxVal) * 100 : 0
					const isHovered = hoveredIndex === index
					return (
						<div
							key={index}
							className="relative flex-1 flex flex-col items-center justify-end group"
							style={{ height: '100%' }}
							onMouseEnter={() => setHoveredIndex(index)}
							onMouseLeave={() => setHoveredIndex(null)}
						>
							{/* Tooltip */}
							{isHovered && point.total > 0 && (
								<div className="absolute -top-14 left-1/2 -translate-x-1/2 z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
									<p className="font-semibold">{formatCurrency(point.total)}</p>
									<p className="text-gray-300">{point.count} venta{point.count !== 1 ? 's' : ''}</p>
									<div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
								</div>
							)}

							{/* Bar */}
							<div
								className="w-full rounded-t-sm transition-all duration-500 ease-out cursor-pointer"
								style={{
									height: animateIn ? `${heightPercent}%` : '0%',
									backgroundColor: isHovered ? '#111827' : (point.total > 0 ? '#374151' : '#f3f4f6'),
									transitionDelay: `${index * 20}ms`,
									minHeight: point.total > 0 ? 2 : 0,
								}}
							/>

							{/* X label */}
							{(index % showEveryNth === 0) && (
								<span className="absolute -bottom-7 text-[10px] text-gray-500 whitespace-nowrap transform -rotate-0 origin-center">
									{point.date}
								</span>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}

// KPI card
function KPICard({
	label, value, icon: Icon, subtext
}: {
	label: string
	value: string
	icon: React.ElementType
	subtext?: string
}) {
	return (
		<div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4 transition-shadow hover:shadow-sm">
			<div className="p-2.5 bg-gray-100 rounded-lg">
				<Icon className="h-5 w-5 text-gray-700" />
			</div>
			<div className="min-w-0">
				<p className="text-sm text-gray-500 font-medium">{label}</p>
				<p className="text-2xl font-semibold text-gray-900 mt-1 truncate">{value}</p>
				{subtext && (
					<p className="text-xs text-gray-400 mt-1">{subtext}</p>
				)}
			</div>
		</div>
	)
}

export default function EstadisticasPage() {
	const [period, setPeriod] = useState<Period>('day')
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
	const [sales, setSales] = useState<SalesPoint[]>([])
	const [summary, setSummary] = useState<SalesSummary>({ total: 0, count: 0, avgTicket: 0, maxSale: 0, minSale: 0 })
	const [loading, setLoading] = useState(true)
	const [exporting, setExporting] = useState(false)

	const fetchSales = useCallback(async () => {
		setLoading(true)
		try {
			const res = await fetch(`/api/estadisticas/ventas?period=${period}&date=${selectedDate}`)
			if (res.ok) {
				const data = await res.json()
				setSales(data.sales || [])
				setSummary(data.summary || { total: 0, count: 0, avgTicket: 0, maxSale: 0, minSale: 0 })
			}
		} catch (error) {
			console.error('Error:', error)
		} finally {
			setLoading(false)
		}
	}, [period, selectedDate])

	useEffect(() => {
		fetchSales()
	}, [fetchSales])

	const handleExport = async () => {
		setExporting(true)
		try {
			const res = await fetch(`/api/estadisticas/export?period=${period}&date=${selectedDate}`)
			if (!res.ok) throw new Error('Error al exportar')
			const blob = await res.blob()
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `estadisticas-${period}-${selectedDate}.xlsx`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (e) {
			console.error('Export error:', e)
			alert('Error al exportar el reporte')
		} finally {
			setExporting(false)
		}
	}

	const periodLabels: Record<Period, string> = {
		day: 'del día',
		week: 'de la semana',
		month: 'del mes',
		year: 'del año',
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">Estadísticas</h1>
					<p className="text-sm text-gray-500 mt-1">
						Análisis de ventas {periodLabels[period]}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4 text-gray-400" />
					<input
						type="date"
						value={selectedDate}
						onChange={(e) => setSelectedDate(e.target.value)}
						className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
					/>
					<button
						onClick={fetchSales}
						className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
						title="Actualizar"
					>
						<RefreshCw className="h-4 w-4 text-gray-600" />
					</button>
					<button
						onClick={handleExport}
						disabled={exporting}
						className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
						title="Exportar a Excel"
					>
						<Download className="h-4 w-4" />
						{exporting ? 'Exportando...' : 'Excel'}
					</button>
				</div>
			</div>

			{/* Period selector */}
			<div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
				{([
					{ id: 'day', label: 'Día' },
					{ id: 'week', label: 'Semana' },
					{ id: 'month', label: 'Mes' },
					{ id: 'year', label: 'Año' },
				] as const).map((p) => (
					<button
						key={p.id}
						onClick={() => setPeriod(p.id)}
						className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${period === p.id
							? 'bg-gray-900 text-white shadow-sm'
							: 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
							}`}
					>
						{p.label}
					</button>
				))}
			</div>

			{/* KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<KPICard
					label="Total Ventas"
					value={formatCurrency(summary.total)}
					icon={TrendingUp}
					subtext={`${summary.count} transaccion${summary.count !== 1 ? 'es' : ''}`}
				/>
				<KPICard
					label="Transacciones"
					value={String(summary.count)}
					icon={Receipt}
					subtext={`Periodo: ${periodLabels[period]}`}
				/>
				<KPICard
					label="Ticket Promedio"
					value={formatCurrency(summary.avgTicket)}
					icon={Hash}
					subtext={summary.count > 0 ? 'Por transacción' : 'Sin datos'}
				/>
			</div>

			{/* Chart */}
			<div className="bg-white border border-gray-200 rounded-xl p-6">
				<div className="flex items-center justify-between mb-6">
					<div>
						<h2 className="font-semibold text-gray-900">Ventas {periodLabels[period]}</h2>
						<p className="text-xs text-gray-500 mt-0.5">Distribución de ingresos por ventas</p>
					</div>
					{!loading && summary.total > 0 && (
						<span className="text-sm font-medium text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
							{formatCurrency(summary.total)}
						</span>
					)}
				</div>
				<SalesBarChart data={sales} loading={loading} />
			</div>

			{/* Summary footer */}
			{!loading && summary.count > 0 && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
						<div className="p-2 bg-green-50 rounded-lg">
							<ArrowUpRight className="h-5 w-5 text-green-600" />
						</div>
						<div>
							<p className="text-sm text-gray-500 font-medium">Venta Máxima</p>
							<p className="text-xl font-semibold text-gray-900">{formatCurrency(summary.maxSale)}</p>
						</div>
					</div>
					<div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
						<div className="p-2 bg-orange-50 rounded-lg">
							<ArrowDownRight className="h-5 w-5 text-orange-500" />
						</div>
						<div>
							<p className="text-sm text-gray-500 font-medium">Venta Mínima</p>
							<p className="text-xl font-semibold text-gray-900">{formatCurrency(summary.minSale)}</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}