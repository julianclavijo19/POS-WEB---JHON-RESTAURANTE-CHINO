'use client'

import { useEffect, useState } from 'react'
import { Shield, Check, X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface Permission {
  id: string
  name: string
  description: string
  module: string
}

interface RolePermissions {
  [key: string]: string[]
}

const modules = [
  { id: 'dashboard', name: 'Dashboard', permissions: ['view'] },
  { id: 'orders', name: 'Pedidos', permissions: ['view', 'create', 'edit', 'delete', 'cancel'] },
  { id: 'products', name: 'Productos', permissions: ['view', 'create', 'edit', 'delete'] },
  { id: 'categories', name: 'Categorias', permissions: ['view', 'create', 'edit', 'delete'] },
  { id: 'tables', name: 'Mesas', permissions: ['view', 'create', 'edit', 'delete', 'change_status'] },
  { id: 'areas', name: 'Areas', permissions: ['view', 'create', 'edit', 'delete'] },
  { id: 'users', name: 'Usuarios', permissions: ['view', 'create', 'edit', 'delete'] },
  { id: 'reports', name: 'Reportes', permissions: ['view', 'export'] },
  { id: 'settings', name: 'Configuracion', permissions: ['view', 'edit'] },
  { id: 'audit', name: 'Auditoria', permissions: ['view'] },
]

const permissionLabels: Record<string, string> = {
  view: 'Ver',
  create: 'Crear',
  edit: 'Editar',
  delete: 'Eliminar',
  cancel: 'Cancelar',
  change_status: 'Cambiar Estado',
  export: 'Exportar',
}

const roles = ['ADMIN', 'CASHIER', 'WAITER', 'KITCHEN']

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  CASHIER: 'Cajero',
  WAITER: 'Mesero',
  KITCHEN: 'Cocina',
}

// Default permissions by role
const defaultPermissions: RolePermissions = {
  ADMIN: modules.flatMap(m => m.permissions.map(p => `${m.id}:${p}`)),
  CASHIER: [
    'dashboard:view',
    'orders:view', 'orders:edit',
    'tables:view', 'tables:change_status',
    'reports:view',
  ],
  WAITER: [
    'dashboard:view',
    'orders:view', 'orders:create', 'orders:edit',
    'tables:view', 'tables:change_status',
    'products:view',
    'categories:view',
  ],
  KITCHEN: [
    'dashboard:view',
    'orders:view', 'orders:edit',
    'products:view',
    'categories:view',
  ],
}

export default function PermissionsPage() {
  const [selectedRole, setSelectedRole] = useState('ADMIN')
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions)
  const [originalPermissions, setOriginalPermissions] = useState<RolePermissions>(defaultPermissions)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)

  // Cargar permisos al montar el componente
  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      setLoadingData(true)
      const res = await fetch('/api/permissions')
      if (res.ok) {
        const data = await res.json()
        // Combinar con defaults para roles que no tienen permisos guardados
        const mergedPermissions: RolePermissions = { ...defaultPermissions }
        for (const role of roles) {
          if (data[role] && Array.isArray(data[role]) && data[role].length > 0) {
            mergedPermissions[role] = data[role]
          }
        }
        setPermissions(mergedPermissions)
        setOriginalPermissions(mergedPermissions)
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Error al cargar permisos')
    } finally {
      setLoadingData(false)
    }
  }

  const handlePermissionToggle = (module: string, permission: string) => {
    const permKey = `${module}:${permission}`
    const currentPerms = permissions[selectedRole] || []
    
    let newPerms: string[]
    if (currentPerms.includes(permKey)) {
      newPerms = currentPerms.filter(p => p !== permKey)
    } else {
      newPerms = [...currentPerms, permKey]
    }
    
    setPermissions({
      ...permissions,
      [selectedRole]: newPerms
    })
    setHasChanges(true)
  }

  const hasPermission = (module: string, permission: string) => {
    const permKey = `${module}:${permission}`
    return (permissions[selectedRole] || []).includes(permKey)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      })

      if (res.ok) {
        toast.success('Permisos guardados correctamente')
        setOriginalPermissions(permissions)
        setHasChanges(false)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al guardar permisos')
      }
    } catch (error) {
      toast.error('Error al guardar permisos')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPermissions(originalPermissions)
    setHasChanges(false)
    toast.success('Cambios descartados')
  }

  const handleRestoreDefaults = () => {
    if (confirm('¿Estás seguro de restaurar los permisos por defecto? Esto afectará a todos los roles.')) {
      setPermissions(defaultPermissions)
      setHasChanges(true)
      toast.success('Permisos restablecidos a valores por defecto')
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Permisos</h1>
          <p className="text-sm text-gray-500 mt-1">Configura los permisos por rol</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPermissions}
            disabled={loading}
            className="p-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            title="Recargar"
          >
            <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleRestoreDefaults}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Por Defecto
          </button>
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Descartar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Role Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-3">Seleccionar Rol</label>
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedRole === role
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Shield className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">
            Permisos para {roleLabels[selectedRole]}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Modulo
                </th>
                {['view', 'create', 'edit', 'delete', 'cancel', 'change_status', 'export'].map((perm) => (
                  <th key={perm} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                    {permissionLabels[perm] || perm}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {modules.map((module) => (
                <tr key={module.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {module.name}
                  </td>
                  {['view', 'create', 'edit', 'delete', 'cancel', 'change_status', 'export'].map((perm) => (
                    <td key={perm} className="px-4 py-4 text-center">
                      {module.permissions.includes(perm) ? (
                        <button
                          onClick={() => handlePermissionToggle(module.id, perm)}
                          disabled={selectedRole === 'ADMIN'}
                          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                            hasPermission(module.id, perm)
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          } ${selectedRole === 'ADMIN' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {hasPermission(module.id, perm) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRole === 'ADMIN' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            El rol de Administrador tiene todos los permisos por defecto y no puede ser modificado.
          </p>
        </div>
      )}
    </div>
  )
}
