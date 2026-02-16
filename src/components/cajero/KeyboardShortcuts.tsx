'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Keyboard, X } from 'lucide-react'

// Definición de atajos de teclado para el cajero
interface ShortcutGroup {
  title: string
  shortcuts: {
    keys: string[]
    label: string
    description?: string
  }[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navegación - Cajas',
    shortcuts: [
      { keys: ['F2'], label: 'Caja Restaurante Chino', description: 'Página principal de caja' },
      { keys: ['F3'], label: 'Caja Comidas Rápidas', description: 'Caja de comidas rápidas' },
    ]
  },
  {
    title: 'Navegación - Pedidos',
    shortcuts: [
      { keys: ['F4'], label: 'Tomar Pedido Mesa', description: 'Crear pedido para mesa' },
      { keys: ['F6'], label: 'Pedidos Para Llevar', description: 'Pedidos para llevar/domicilio' },
    ]
  },
  {
    title: 'Navegación - Operaciones',
    shortcuts: [
      { keys: ['F7'], label: 'Reimpresiones', description: 'Reimprimir tickets/facturas' },
      { keys: ['F8'], label: 'Devoluciones', description: 'Gestionar devoluciones' },
      { keys: ['F9'], label: 'Descuentos', description: 'Ver y aplicar descuentos' },
    ]
  },
  {
    title: 'Navegación - Consultas',
    shortcuts: [
      { keys: ['Alt', 'H'], label: 'Historial Transacciones', description: 'Transacciones del día' },
      { keys: ['Alt', 'E'], label: 'Estadísticas', description: 'Ver estadísticas' },
      { keys: ['Alt', 'R'], label: 'Reportes', description: 'Consultar reportes' },
      { keys: ['Alt', 'P'], label: 'Consulta Precios', description: 'Buscar precios de productos' },
      { keys: ['Alt', 'C'], label: 'Cierres de Caja', description: 'Historial de cierres' },
    ]
  },
  {
    title: 'Acciones',
    shortcuts: [
      { keys: ['Alt', 'A'], label: 'Actualizar Datos', description: 'Recargar datos de la página' },
      { keys: ['Esc'], label: 'Cerrar Modal/Sidebar', description: 'Cerrar ventana emergente' },
      { keys: ['Alt', 'K'], label: 'Mostrar Atajos', description: 'Abrir/cerrar esta ayuda' },
    ]
  },
  {
    title: 'En Modal de Cobro',
    shortcuts: [
      { keys: ['1'], label: 'Efectivo', description: 'Seleccionar pago en efectivo' },
      { keys: ['2'], label: 'Tarjeta', description: 'Seleccionar pago con tarjeta' },
      { keys: ['3'], label: 'Transferencia', description: 'Seleccionar pago por transferencia' },
      { keys: ['Enter'], label: 'Confirmar Cobro', description: 'Procesar el pago' },
    ]
  },
]

// Mapa de atajos F-key → ruta
const F_KEY_ROUTES: Record<string, string> = {
  'F2': '/cajero',
  'F3': '/cajero/comidas-rapidas',
  'F4': '/cajero/tomar-pedido',
  'F6': '/cajero/para-llevar',
  'F7': '/cajero/reimpresiones',
  'F8': '/cajero/devoluciones',
  'F9': '/cajero/descuentos',
}

// Mapa de atajos Alt+key → ruta
const ALT_KEY_ROUTES: Record<string, string> = {
  'h': '/cajero/historial',
  'e': '/cajero/estadisticas',
  'r': '/cajero/reportes',
  'p': '/cajero/precios',
  'c': '/cajero/historial-caja',
}

export default function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // No interceptar si estamos en un input, textarea o select
    const target = e.target as HTMLElement
    const isInputFocused = target.tagName === 'INPUT' || 
                           target.tagName === 'TEXTAREA' || 
                           target.tagName === 'SELECT' ||
                           target.isContentEditable

    // Alt+K siempre funciona (toggle ayuda)
    if (e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      setShowHelp(prev => !prev)
      return
    }

    // Escape: cerrar ayuda
    if (e.key === 'Escape' && showHelp) {
      setShowHelp(false)
      return
    }

    // Si estamos en un input, no procesar atajos de navegación
    // excepto F-keys y Alt+combinaciones
    if (isInputFocused && !e.key.startsWith('F') && !e.altKey) {
      return
    }

    // F-keys → Navegación directa
    if (e.key in F_KEY_ROUTES) {
      e.preventDefault()
      const targetRoute = F_KEY_ROUTES[e.key]
      if (pathname !== targetRoute) {
        router.push(targetRoute)
      }
      return
    }

    // Alt + key → Navegación
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      const key = e.key.toLowerCase()
      
      if (key in ALT_KEY_ROUTES) {
        e.preventDefault()
        const targetRoute = ALT_KEY_ROUTES[key]
        if (pathname !== targetRoute) {
          router.push(targetRoute)
        }
        return
      }

      // Alt+A → Actualizar/Refresh
      if (key === 'a') {
        e.preventDefault()
        // Disparar evento custom para que la página actual se refresque
        window.dispatchEvent(new CustomEvent('cajero-refresh'))
        return
      }
    }
  }, [router, pathname, showHelp])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <>
      {/* Botón flotante de ayuda */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-40 p-3 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-800 transition-all hover:scale-105 group"
        title="Atajos de teclado (Alt+K)"
      >
        <Keyboard className="h-5 w-5" />
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Alt+K
        </span>
      </button>

      {/* Modal de ayuda de atajos */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={() => setShowHelp(false)}>
          <div 
            className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-900 text-white rounded-lg">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Atajos de Teclado</h2>
                  <p className="text-sm text-gray-500">Navega rápidamente por el sistema</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {group.title}
                    </h3>
                    <div className="space-y-1">
                      {group.shortcuts.map((shortcut, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-700">{shortcut.label}</span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, kidx) => (
                              <span key={kidx}>
                                {kidx > 0 && (
                                  <span className="text-gray-400 text-xs mx-0.5">+</span>
                                )}
                                <kbd className="inline-flex items-center justify-center min-w-[28px] px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded shadow-sm">
                                  {key}
                                </kbd>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-700">
                  <strong>Nota:</strong> Los atajos de números (1, 2, 3) y Enter solo funcionan cuando el modal de cobro está abierto. 
                  Los atajos de navegación no funcionan cuando el cursor está en un campo de texto.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
