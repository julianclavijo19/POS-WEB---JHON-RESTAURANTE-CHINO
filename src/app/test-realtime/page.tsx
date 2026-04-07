'use client'

import { useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export default function TestRealtimePage() {
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  const log = (msg: string) => {
    const ts = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${ts}] ${msg}`])
  }

  const runTest = async () => {
    setLogs([])
    setRunning(true)

    const supabase = getSupabaseBrowser()
    log('Using app Supabase singleton (same as hooks)...')
    log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)

    // Check accessTokenValue
    const rt = supabase.realtime as any
    log(`accessTokenValue present: ${!!rt.accessTokenValue}`)
    log(`accessToken callback present: ${!!rt.accessToken}`)
    log(`_manuallySetToken: ${rt._manuallySetToken}`)
    log(`channels count: ${rt.channels?.length || 0}`)

    const chName = `rt-test-${Date.now()}`
    log(`Creating channel "${chName}"...`)

    let eventReceived = false

    const ch = supabase.channel(chName)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'tables' }, (payload: any) => {
        log(`✅ EVENT (tables): ${payload.eventType} — ${JSON.stringify(payload.new).slice(0, 200)}`)
        eventReceived = true
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
        log(`✅ EVENT (orders): ${payload.eventType} — ${JSON.stringify(payload.new).slice(0, 200)}`)
        eventReceived = true
      })

    // Monkey-patch _trigger to see raw dispatch
    const origTrigger = (ch as any)._trigger.bind(ch)
    ;(ch as any)._trigger = (type: string, payload: any, ref: any) => {
      log(`_trigger(${type}) ids=${payload?.ids} data.type=${payload?.data?.type}`)
      return origTrigger(type, payload, ref)
    }

    ch.subscribe((status: string, err?: Error) => {
      log(`Channel status: ${status} ${err ? err.message : ''}`)
      if (status === 'SUBSCRIBED') {
        const bindings = (ch as any).bindings?.postgres_changes
        const hasIds = bindings?.some((b: any) => 'id' in b)
        log(`Bindings: ${bindings?.length || 0}, hasIds: ${hasIds}`)
        bindings?.forEach((b: any, i: number) => {
          log(`  binding[${i}]: id=${b.id}, table=${b.filter?.table}, event=${b.filter?.event}`)
        })

        log('✓ Subscribed. Triggering test UPDATE on "tables"...')
        setTimeout(async () => {
          const { data, error } = await supabase
            .from('tables')
            .select('id, status')
            .limit(1)
            .single()

          if (error) {
            log(`❌ SELECT error: ${error.message}`)
            return
          }
          log(`Found row: id=${data.id}, status=${data.status}`)
          const { error: updErr } = await supabase
            .from('tables')
            .update({ status: data.status })
            .eq('id', data.id)

          if (updErr) {
            log(`❌ UPDATE error: ${updErr.message}`)
          } else {
            log('Update sent. Waiting up to 15 s for realtime event...')
          }
        }, 2000)
      }
    })

    // Timeout
    setTimeout(() => {
      supabase.removeChannel(ch)
      if (!eventReceived) {
        log('❌ NO EVENTS received after 15 s.')
        log('Check the _trigger logs above — if _trigger was never called, the WebSocket is not receiving events.')
        log('If _trigger was called but no ✅ EVENT, the binding matching failed.')
      } else {
        log('✅ Test passed — events arrive in this browser.')
      }
      setRunning(false)
    }, 15000)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, maxWidth: 800 }}>
      <h1 style={{ fontSize: 18 }}>Realtime Diagnostic (Browser)</h1>
      <p style={{ color: '#888' }}>
        Tests postgres_changes using the same Supabase singleton as the app hooks.
      </p>
      <button
        onClick={runTest}
        disabled={running}
        style={{ padding: '8px 16px', marginBottom: 16, cursor: running ? 'wait' : 'pointer' }}
      >
        {running ? 'Running (15 s)...' : 'Run Test'}
      </button>
      <pre style={{ background: '#111', color: '#0f0', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', minHeight: 300 }}>
        {logs.length === 0 ? 'Click "Run Test" to start.' : logs.join('\n')}
      </pre>
    </div>
  )
}

