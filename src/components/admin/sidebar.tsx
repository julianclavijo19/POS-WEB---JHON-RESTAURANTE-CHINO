'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Package,
  MapPin,
  Table,
  Settings,
  History,
  BarChart3,
  FileText,
  Shield,
  Warehouse,
  TrendingUp,
} from 'lucide-react'

interface AdminSidebarProps {
  user: {
    name: string
    email: string
    role: string
  }
}

const menuItems = [
  { 
    section: 'Principal',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  { 
    section: 'Gestión',
    items: [
      { href: '/admin/orders', icon: History, label: 'Gestión de Pedidos' },
      { href: '/admin/users', icon: Users, label: 'Usuarios' },
      { href: '/admin/categories', icon: FolderTree, label: 'Categorías' },
      { href: '/admin/products', icon: Package, label: 'Productos' },
      { href: '/admin/areas', icon: MapPin, label: 'Áreas' },
      { href: '/admin/tables', icon: Table, label: 'Mesas' },
      { href: '/admin/inventory', icon: Warehouse, label: 'Inventario' },
    ]
  },
  { 
    section: 'Reportes',
    items: [
      { href: '/admin/reports', icon: TrendingUp, label: 'Reportes' },
      { href: '/admin/audit', icon: FileText, label: 'Auditoría' },
    ]
  },
  { 
    section: 'Sistema',
    items: [
      { href: '/admin/permissions', icon: Shield, label: 'Permisos' },
      { href: '/admin/settings', icon: Settings, label: 'Configuración' },
    ]
  },
]

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 hidden lg:flex lg:flex-col">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900 tracking-tight">
          Administración
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((section) => (
          <div key={section.section} className="mb-6">
            <h3 className="px-6 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
              {section.section}
            </h3>
            <div className="space-y-0.5 px-3">
              {section.items.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-medium">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
