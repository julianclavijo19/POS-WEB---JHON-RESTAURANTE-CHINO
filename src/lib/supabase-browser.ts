import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Singleton Supabase client for the browser with Realtime support.
 * App uses cookie-based auth (NOT Supabase Auth), so we disable
 * session persistence. The Realtime client uses the anon key
 * automatically via the apikey parameter.
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 20,
      },
    },
  })

  return _client
}
