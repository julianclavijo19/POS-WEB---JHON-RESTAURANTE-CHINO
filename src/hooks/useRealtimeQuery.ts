'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type ConnectionStatus = 'realtime' | 'polling' | 'offline'

// Unique channel counter to prevent collisions during rapid mount/unmount
let _chId = 0

interface UseRealtimeQueryOptions<T> {
  channel: string
  tables: string[]
  fetchFn: () => Promise<T>
  /** Safety-net refetch interval in ms (default 60000). Set 0 to disable. */
  fallbackInterval?: number
  enabled?: boolean
  filter?: string
}

interface UseRealtimeQueryResult<T> {
  data: T | null
  loading: boolean
  status: ConnectionStatus
  refetch: () => Promise<void>
}

export function useRealtimeQuery<T>({
  channel,
  tables,
  fetchFn,
  fallbackInterval = 60000,
  enabled = true,
  filter,
}: UseRealtimeQueryOptions<T>): UseRealtimeQueryResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<ConnectionStatus>('offline')

  const channelRef = useRef<RealtimeChannel | null>(null)
  const visibleRef = useRef(true)
  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)
  const pendingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Always reference the latest fetchFn without re-subscribing
  const fetchFnRef = useRef(fetchFn)
  fetchFnRef.current = fetchFn

  const doFetch = useCallback(async () => {
    if (!mountedRef.current) return
    if (fetchingRef.current) {
      pendingRef.current = true
      return
    }
    fetchingRef.current = true
    pendingRef.current = false
    try {
      const result = await fetchFnRef.current()
      if (mountedRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err) {
      console.error(`[RT:${channel}] fetch error`, err)
      if (mountedRef.current) setLoading(false)
    } finally {
      fetchingRef.current = false
      if (pendingRef.current && mountedRef.current) {
        pendingRef.current = false
        doFetch()
      }
    }
  }, [channel])

  // Debounced fetch: batches rapid-fire realtime events (e.g. orders INSERT + tables UPDATE)
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      if (mountedRef.current && visibleRef.current) doFetch()
    }, 80)
  }, [doFetch])

  // Subscribe to Realtime
  useEffect(() => {
    mountedRef.current = true
    if (!enabled) return

    doFetch()

    const supabase = getSupabaseBrowser()
    const chName = `${channel}-${++_chId}`
    let sub = supabase.channel(chName)

    for (const table of tables) {
      const opts: { event: string; schema: string; table: string; filter?: string } = {
        event: '*',
        schema: 'public',
        table,
      }
      if (filter) opts.filter = filter

      sub = sub.on('postgres_changes' as any, opts, (payload: any) => {
        console.log(`[RT:${channel}] ← ${payload.eventType} on ${payload.table}`)
        debouncedFetch()
      })
    }

    sub.subscribe((s: string, err?: Error) => {
      if (!mountedRef.current) return
      if (s === 'SUBSCRIBED') {
        console.log(`[RT:${channel}] ✓ connected (tables: ${tables.join(', ')})`)
        setStatus('realtime')
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT' || s === 'CLOSED') {
        console.warn(`[RT:${channel}] ✗ ${s}`, err || '')
        setStatus('offline')
      }
    })

    channelRef.current = sub

    return () => {
      mountedRef.current = false
      if (debounceRef.current) clearTimeout(debounceRef.current)
      supabase.removeChannel(sub)
      channelRef.current = null
    }
  }, [channel, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Safety-net: refetch periodically if visible (catches silent WebSocket failures)
  useEffect(() => {
    if (!enabled || !fallbackInterval) return
    const id = setInterval(() => {
      if (mountedRef.current && visibleRef.current) {
        doFetch()
      }
    }, fallbackInterval)
    return () => clearInterval(id)
  }, [enabled, fallbackInterval, doFetch])

  // Visibility API: refetch when tab becomes visible
  useEffect(() => {
    if (!enabled) return
    const onVisChange = () => {
      visibleRef.current = document.visibilityState === 'visible'
      if (visibleRef.current) doFetch()
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => document.removeEventListener('visibilitychange', onVisChange)
  }, [enabled, doFetch])

  const refetch = useCallback(async () => { await doFetch() }, [doFetch])

  return { data, loading, status, refetch }
}
