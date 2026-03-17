import { supabase } from '@/lib/supabase'
import { getColombiaDateString } from '@/lib/utils'

export async function generateDailyOrderNumber(): Promise<string> {
  const dateStr = getColombiaDateString()
  const startOfDay = `${dateStr}T00:00:00-05:00`
  const endOfDay = `${dateStr}T23:59:59.999-05:00`

  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)

  if (error) {
    throw error
  }

  const nextSequence = (count || 0) + 1
  return String(nextSequence).padStart(4, '0')
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false
  }

  return 'code' in error && error.code === '23505'
}