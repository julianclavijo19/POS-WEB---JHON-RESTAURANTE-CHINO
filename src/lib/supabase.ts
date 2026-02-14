import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Cliente para uso en el servidor (con service role key para acceso completo)
// Se crea de forma lazy para evitar errores durante el build
let _supabaseServer: SupabaseClient | null = null

export const getSupabase = () => {
  if (!_supabaseServer) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and Service Role Key are required')
    }
    _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabaseServer
}

// Cliente singleton para el navegador
let _browserClient: SupabaseClient | null = null

// Función para obtener o crear el cliente de Supabase para el navegador
export const createBrowserClient = (): SupabaseClient | null => {
  if (typeof window === 'undefined') {
    // En el servidor, retornar null - las páginas del servidor deben usar getSupabase()
    return null
  }
  
  if (!_browserClient && supabaseUrl && supabaseAnonKey) {
    _browserClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  }
  return _browserClient
}

// Para compatibilidad con código existente 
// Este cliente se usará en componentes del servidor o APIs
export const supabase: SupabaseClient = (() => {
  // Solo crear en el servidor durante runtime (no durante build)
  if (typeof window === 'undefined' && supabaseUrl && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  // Retornar un cliente dummy que fallará si se usa sin configuración
  // Esto evita errores de tipo null durante el build
  return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder-key', {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
})()

// Alias para componentes del cliente
export const getSupabaseClient = createBrowserClient

// Tipos de la base de datos
export type Role = 'ADMIN' | 'CASHIER' | 'WAITER' | 'KITCHEN'
export type TableStatus = 'FREE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING'
export type OrderStatus = 'PENDING' | 'IN_KITCHEN' | 'READY' | 'DELIVERED' | 'PAID' | 'CANCELLED'
export type OrderType = 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'
export type OrderItemStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER'
export type CashRegisterStatus = 'OPEN' | 'CLOSED'

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  color: string
  icon: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string
  image_url: string | null
  prep_time: number
  is_available: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Area {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  tables?: Table[]
}

export interface Table {
  id: string
  name: string
  number: number
  capacity: number
  area_id: string
  status: TableStatus
  is_active: boolean
  created_at: string
  area?: Area
}

export interface Order {
  id: string
  order_number: string
  type: OrderType
  status: OrderStatus
  table_id: string | null
  waiter_id: string | null
  subtotal: number
  tax: number
  discount: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  table?: Table
  waiter?: User
  items?: OrderItem[]
  payment?: Payment
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  notes: string | null
  status: OrderItemStatus
  created_at: string
  product?: Product
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: PaymentMethod
  reference: string | null
  cash_register_id: string | null
  created_at: string
}

export interface CashRegister {
  id: string
  user_id: string
  opening_amount: number
  closing_amount: number | null
  expected_amount: number | null
  difference: number | null
  status: CashRegisterStatus
  notes: string | null
  opened_at: string
  closed_at: string | null
  user?: User
}
