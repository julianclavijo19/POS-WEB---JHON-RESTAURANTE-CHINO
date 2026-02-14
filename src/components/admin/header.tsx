'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Menu,
  LogOut,
  User,
  Home,
  ChevronDown,
  X,
  LayoutDashboard,
  Users,
  FolderTree,
  Package,
  MapPin,
  Table,
  Settings,
  ClipboardList,
  History,
  BarChart3,
  FileText,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AdminHeaderProps {
  user: {
    name: string
    email: string
    role: string
  }
}

const mobileMenuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/orders', icon: ClipboardList, label: 'Pedidos Activos' },
  { href: '/admin/users', icon: Users, label: 'Usuarios' },
  { href: '/admin/categories', icon: FolderTree, label: 'Categorías' },
  { href: '/admin/products', icon: Package, label: 'Productos' },
  { href: '/admin/areas', icon: MapPin, label: 'Áreas' },
  { href: '/admin/tables', icon: Table, label: 'Mesas' },
  { href: '/admin/reports', icon: BarChart3, label: 'Estadísticas' },
  { href: '/admin/history', icon: History, label: 'Historial' },
  { href: '/admin/audit', icon: FileText, label: 'Auditoría' },
  { href: '/admin/permissions', icon: Shield, label: 'Permisos' },
  { href: '/admin/settings', icon: Settings, label: 'Configuración' },
]

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('user')
    toast.success('Sesión cerrada')
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          {/* Title - mobile */}
          <h1 className="text-base font-medium text-gray-900 lg:hidden">
            Administración
          </h1>

          {/* Spacer for desktop */}
          <div className="hidden lg:block" />

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Link to main app */}
            <Link
              href="/"
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Ir al Sistema</span>
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm text-gray-700">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <Link
                      href="/admin/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="h-4 w-4" />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Menú</h2>
              <button 
                onClick={() => setShowMobileMenu(false)}
                className="p-2 -mr-2 rounded-md hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
              {mobileMenuItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link 
                    key={item.href}
                    href={item.href} 
                    onClick={() => setShowMobileMenu(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </>
  )
}
