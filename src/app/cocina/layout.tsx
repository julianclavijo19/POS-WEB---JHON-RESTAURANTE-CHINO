'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  ChefHat, ClipboardList, History, Clock, LogOut, Menu, X
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'

const menuItems = [
  { href: '/cocina', label: 'Comandas', icon: ClipboardList },
  { href: '/cocina/historial', label: 'Historial', icon: History },
]

export default function CocinaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <Toaster position="top-right" />
      
      {/* Mobile header */}
      <header className="md:hidden bg-gray-900 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-6 w-6" />
          <span className="font-bold">Cocina</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-lg">
            {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Sidebar - mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 text-white flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header - desktop */}
        <div className="hidden md:block p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Cocina</h1>
              <p className="text-xs text-gray-400">Sistema de Comandas</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 mt-4 md:mt-0">
          {menuItems.map(item => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-white text-gray-900' 
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="hidden md:flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-2xl font-mono">
              {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Cerrar sesión</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  )
}
