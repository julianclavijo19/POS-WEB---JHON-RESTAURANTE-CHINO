'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { FileText, Search, Download, Clock, User, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AuditLog {
  id: string
  action: string
  module: string
  description: string
  userId: string
  userName: string
  userRole: string
  timestamp: Date
  details?: Record<string, unknown>
}

const actionLabels: Record<string, string> = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  PAYMENT: 'Pago',
  CANCEL: 'Cancelar',
  STATUS_CHANGE: 'Cambio Estado',
}

const moduleLabels: Record<string, string> = {
  orders: 'Pedidos',
  products: 'Productos',
  categories: 'Categorías',
  tables: 'Mesas',
  areas: 'Áreas',
  users: 'Usuarios',
  payments: 'Pagos',
  inventory: 'Inventario',
  cash_register: 'Caja',
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Admin',
  CASHIER: 'Cajero',
  WAITER: 'Mesero',
  KITCHEN: 'Cocina',
}

export default function AuditPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterModule, setFilterModule] = useState('all')
  const [dateRange, setDateRange] = useState('today')

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (minutes < 60) {
      return `hace ${minutes} min`
    } else if (hours < 24) {
      return `hace ${hours} horas`
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getDateFilter = useCallback(() => {
    const now = new Date()
    let startDate = new Date()
    
    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0)
        break
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'all':
        startDate = new Date(2020, 0, 1)
        break
    }
    
    return startDate.toISOString()
  }, [dateRange])

  const loadAuditLogs = useCallback(async () => {
    if (!supabase) return
    
    setLoading(true)
    const auditLogs: AuditLog[] = []
    const dateFilter = getDateFilter()

    try {
      // 1. Cargar movimientos de pedidos (orders)
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total,
          created_at,
          updated_at,
          waiter:users!orders_waiter_id_fkey(id, name, role)
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(100)

      if (orders) {
        orders.forEach((order: any) => {
          const waiter = order.waiter
          auditLogs.push({
            id: `order-create-${order.id}`,
            action: 'CREATE',
            module: 'orders',
            description: `Creó orden #${order.order_number} - ${formatCurrency(parseFloat(order.total) || 0)}`,
            userId: waiter?.id || 'system',
            userName: waiter?.name || 'Sistema',
            userRole: waiter?.role || 'SYSTEM',
            timestamp: new Date(order.created_at),
          })

          if (order.status === 'PAID') {
            auditLogs.push({
              id: `order-paid-${order.id}`,
              action: 'PAYMENT',
              module: 'payments',
              description: `Cobró orden #${order.order_number} - ${formatCurrency(parseFloat(order.total) || 0)}`,
              userId: waiter?.id || 'system',
              userName: waiter?.name || 'Sistema',
              userRole: waiter?.role || 'SYSTEM',
              timestamp: new Date(order.updated_at || order.created_at),
            })
          }

          if (order.status === 'CANCELLED') {
            auditLogs.push({
              id: `order-cancel-${order.id}`,
              action: 'CANCEL',
              module: 'orders',
              description: `Canceló orden #${order.order_number}`,
              userId: waiter?.id || 'system',
              userName: waiter?.name || 'Sistema',
              userRole: waiter?.role || 'SYSTEM',
              timestamp: new Date(order.updated_at || order.created_at),
            })
          }
        })
      }

      // 2. Cargar pagos (payments)
      const { data: payments } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          created_at,
          order:orders(order_number),
          cashier:users!payments_cashier_id_fkey(id, name, role)
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(50)

      if (payments) {
        payments.forEach((payment: any) => {
          const cashier = payment.cashier
          const order = payment.order
          auditLogs.push({
            id: `payment-${payment.id}`,
            action: 'PAYMENT',
            module: 'payments',
            description: `Registró pago de ${formatCurrency(parseFloat(payment.amount) || 0)} (${payment.payment_method}) - Orden #${order?.order_number || 'N/A'}`,
            userId: cashier?.id || 'system',
            userName: cashier?.name || 'Sistema',
            userRole: cashier?.role || 'CASHIER',
            timestamp: new Date(payment.created_at),
          })
        })
      }

      // 3. Cargar movimientos de inventario (stock_movements)
      const { data: stockMovements } = await supabase
        .from('stock_movements')
        .select(`
          id,
          movement_type,
          quantity,
          notes,
          created_at,
          ingredient:ingredients(name),
          user:users(id, name, role)
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(50)

      if (stockMovements) {
        stockMovements.forEach((movement: any) => {
          const ingredient = movement.ingredient
          const user = movement.user
          const actionMap: Record<string, string> = {
            'IN': 'Entrada',
            'OUT': 'Salida',
            'ADJUSTMENT': 'Ajuste',
            'WASTE': 'Desperdicio'
          }
          auditLogs.push({
            id: `stock-${movement.id}`,
            action: 'UPDATE',
            module: 'inventory',
            description: `${actionMap[movement.movement_type] || movement.movement_type} de ${movement.quantity} - ${ingredient?.name || 'Ingrediente'} ${movement.notes ? `(${movement.notes})` : ''}`,
            userId: user?.id || 'system',
            userName: user?.name || 'Sistema',
            userRole: user?.role || 'ADMIN',
            timestamp: new Date(movement.created_at),
          })
        })
      }

      // 4. Cargar aperturas/cierres de caja (cash_registers)
      const { data: cashRegisters } = await supabase
        .from('cash_registers')
        .select(`
          id,
          status,
          opening_amount,
          closing_amount,
          opened_at,
          closed_at,
          user:users(id, name, role)
        `)
        .gte('opened_at', dateFilter)
        .order('opened_at', { ascending: false })
        .limit(20)

      if (cashRegisters) {
        cashRegisters.forEach((register: any) => {
          const user = register.user
          auditLogs.push({
            id: `cash-open-${register.id}`,
            action: 'CREATE',
            module: 'cash_register',
            description: `Abrió caja con ${formatCurrency(parseFloat(register.opening_amount) || 0)}`,
            userId: user?.id || 'system',
            userName: user?.name || 'Sistema',
            userRole: user?.role || 'CASHIER',
            timestamp: new Date(register.opened_at),
          })

          if (register.closed_at) {
            auditLogs.push({
              id: `cash-close-${register.id}`,
              action: 'UPDATE',
              module: 'cash_register',
              description: `Cerró caja con ${formatCurrency(parseFloat(register.closing_amount) || 0)}`,
              userId: user?.id || 'system',
              userName: user?.name || 'Sistema',
              userRole: user?.role || 'CASHIER',
              timestamp: new Date(register.closed_at),
            })
          }
        })
      }

      // 5. Cargar productos creados/actualizados
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          created_at,
          updated_at
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(30)

      if (products) {
        products.forEach((product: any) => {
          auditLogs.push({
            id: `product-${product.id}`,
            action: 'CREATE',
            module: 'products',
            description: `Creó producto "${product.name}" - ${formatCurrency(parseFloat(product.price) || 0)}`,
            userId: 'admin',
            userName: 'Administrador',
            userRole: 'ADMIN',
            timestamp: new Date(product.created_at),
          })
        })
      }

      // 6. Cargar usuarios creados
      const { data: users } = await supabase
        .from('users')
        .select(`
          id,
          name,
          role,
          created_at
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(20)

      if (users) {
        users.forEach((user: any) => {
          auditLogs.push({
            id: `user-${user.id}`,
            action: 'CREATE',
            module: 'users',
            description: `Creó usuario "${user.name}" con rol ${roleLabels[user.role] || user.role}`,
            userId: 'admin',
            userName: 'Administrador',
            userRole: 'ADMIN',
            timestamp: new Date(user.created_at),
          })
        })
      }

      // 7. Cargar facturas/invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total,
          created_at,
          order:orders(order_number),
          cashier:users(id, name, role)
        `)
        .gte('created_at', dateFilter)
        .order('created_at', { ascending: false })
        .limit(30)

      if (invoices) {
        invoices.forEach((invoice: any) => {
          const cashier = invoice.cashier
          auditLogs.push({
            id: `invoice-${invoice.id}`,
            action: 'CREATE',
            module: 'payments',
            description: `Generó factura #${invoice.invoice_number} - ${formatCurrency(parseFloat(invoice.total) || 0)}`,
            userId: cashier?.id || 'system',
            userName: cashier?.name || 'Sistema',
            userRole: cashier?.role || 'CASHIER',
            timestamp: new Date(invoice.created_at),
          })
        })
      }

      // Ordenar por fecha descendente
      auditLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      
      setLogs(auditLogs)
    } catch (error) {
      console.error('Error loading audit logs:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase, getDateFilter])

  useEffect(() => {
    loadAuditLogs()
  }, [loadAuditLogs])

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.userName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesAction = filterAction === 'all' || log.action === filterAction
    const matchesModule = filterModule === 'all' || log.module === filterModule
    return matchesSearch && matchesAction && matchesModule
  })

  const handleExport = () => {
    const csvContent = [
      ['Fecha', 'Usuario', 'Rol', 'Acción', 'Módulo', 'Descripción'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp.toLocaleString('es-ES'),
        log.userName,
        roleLabels[log.userRole] || log.userRole,
        actionLabels[log.action] || log.action,
        moduleLabels[log.module] || log.module,
        `"${log.description}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Auditoría</h1>
          <p className="text-sm text-gray-500 mt-1">Registro de actividades del sistema en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Total Registros</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{filteredLogs.length}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Creaciones</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {filteredLogs.filter(l => l.action === 'CREATE').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Actualizaciones</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {filteredLogs.filter(l => l.action === 'UPDATE').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Pagos</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {filteredLogs.filter(l => l.action === 'PAYMENT').length}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-500">Cancelaciones</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">
            {filteredLogs.filter(l => l.action === 'CANCEL').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="today">Hoy</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
            <option value="all">Todo</option>
          </select>

          {/* Action Filter */}
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">Todas las Acciones</option>
            <option value="CREATE">Crear</option>
            <option value="UPDATE">Actualizar</option>
            <option value="PAYMENT">Pagos</option>
            <option value="CANCEL">Cancelaciones</option>
          </select>

          {/* Module Filter */}
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">Todos los Módulos</option>
            <option value="orders">Pedidos</option>
            <option value="payments">Pagos</option>
            <option value="products">Productos</option>
            <option value="inventory">Inventario</option>
            <option value="cash_register">Caja</option>
            <option value="users">Usuarios</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Tiempo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Acción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Módulo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No se encontraron registros para el período seleccionado
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {formatTime(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                            <div className="text-xs text-gray-500">{roleLabels[log.userRole] || log.userRole}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                          log.action === 'PAYMENT' ? 'bg-emerald-100 text-emerald-800' :
                          log.action === 'CANCEL' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {moduleLabels[log.module] || log.module}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination info */}
      {filteredLogs.length > 0 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
          <div className="text-sm text-gray-500">
            Mostrando {filteredLogs.length} registros
          </div>
        </div>
      )}
    </div>
  )
}
