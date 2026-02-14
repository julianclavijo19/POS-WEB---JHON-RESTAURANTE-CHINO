'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Download
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalSales: number
  totalOrders: number
  totalPaidOrders: number
  activeTables: number
  totalTables: number
  dailySales: { date: string; total: number }[]
  salesByMethod: { cash: number; card: number; transfer: number }
  topProducts: { productId: string; product: { name: string }; _sum: { quantity: number } }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [period, setPeriod] = useState('today')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard?period=${period}`)
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/dashboard/export?period=${period}`)
      if (!res.ok) throw new Error('Error')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-produccion-${period}-${new Date().toISOString().split('T')[0]}.xlsx`
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    )
  }

  const ticketPromedio = stats?.totalPaidOrders ? stats.totalSales / stats.totalPaidOrders : 0
  const maxDailySale = Math.max(...(stats?.dailySales?.map(d => d.total) || [0]), 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen general del negocio</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="today">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
            <option value="year">Este año</option>
          </select>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors"
            title="Exportar a Excel"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exportando...' : 'Excel'}
          </button>

          <button
            onClick={fetchStats}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500 font-medium">Ventas Totales</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {formatCurrency(stats?.totalSales || 0)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>{stats?.totalPaidOrders || 0} órdenes pagadas</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500 font-medium">Total Ordenes</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {stats?.totalOrders || 0}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
            <span>Todas las órdenes del periodo</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500 font-medium">Mesas Ocupadas</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {stats?.activeTables || 0}
            <span className="text-lg font-normal text-gray-400">/{stats?.totalTables || 0}</span>
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
            <span>Capacidad actual</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <p className="text-sm text-gray-500 font-medium">Ticket Promedio</p>
          <p className="text-3xl font-semibold text-gray-900 mt-2">
            {formatCurrency(ticketPromedio)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
            <span>Por orden</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas Diarias */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Ventas Diarias</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats?.dailySales && stats.dailySales.length > 1 ? (
                stats.dailySales.slice(-7).map((day, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14">{day.date}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-gray-900 rounded-full h-2 transition-all"
                        style={{ width: `${(day.total / maxDailySale) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-24 text-right">
                      {formatCurrency(day.total)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(stats?.totalSales || 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Ventas del día</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Acciones Rápidas</h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              <Link
                href="/admin/products"
                className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <span className="text-sm text-gray-700">Gestionar productos</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/admin/estadisticas"
                className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <span className="text-sm text-gray-700">Ver estadísticas</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <span className="text-sm text-gray-700">Administrar usuarios</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              <Link
                href="/admin/reportes"
                className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 transition-colors border border-gray-100"
              >
                <span className="text-sm text-gray-700">Ver reportes</span>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Productos Más Vendidos</h2>
            <Link href="/admin/reportes" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
              Ver más <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats?.topProducts?.slice(0, 5).map((item, index) => (
                <div key={item.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center text-xs font-medium bg-gray-100 rounded">
                      {index + 1}
                    </span>
                    <span className="text-sm text-gray-900">{item.product?.name || 'Producto'}</span>
                  </div>
                  <span className="text-sm text-gray-500">{item._sum?.quantity || 0} uds</span>
                </div>
              ))}
              {(!stats?.topProducts || stats.topProducts.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos de ventas disponibles</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
