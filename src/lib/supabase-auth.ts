import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase para el navegador (autenticación)
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Cliente para el servidor con service role (operaciones admin)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Función para obtener el usuario actual desde el servidor
export async function getCurrentUser(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Función para obtener los datos completos del usuario
export async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

// Función para login
export async function signIn(supabase: ReturnType<typeof createSupabaseBrowserClient>, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

// Función para logout
export async function signOut(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
