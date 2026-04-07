'use client'

import type { ConnectionStatus } from '@/hooks/useRealtimeQuery'
import { RefreshCw } from 'lucide-react'

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus
  onRefresh?: () => void
  className?: string
}

const config: Record<ConnectionStatus, { dot: string; label: string; bg: string }> = {
  realtime: { dot: 'bg-green-500', label: 'En vivo', bg: 'bg-green-50 text-green-700' },
  polling: { dot: 'bg-yellow-500', label: 'Polling', bg: 'bg-yellow-50 text-yellow-700' },
  offline: { dot: 'bg-red-500', label: 'Sin conexión', bg: 'bg-red-50 text-red-700' },
}

export function ConnectionStatusBadge({ status, onRefresh, className = '' }: ConnectionStatusBadgeProps) {
  const c = config[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${className}`}>
      <span className={`h-2 w-2 rounded-full ${c.dot} ${status === 'realtime' ? 'animate-pulse' : ''}`} />
      {c.label}
      {status !== 'realtime' && onRefresh && (
        <button onClick={onRefresh} className="ml-1 hover:opacity-70" title="Actualizar">
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
