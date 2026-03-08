import { randomUUID } from 'crypto'
import { supabase } from '@/lib/supabase'

/**
 * Inserta un registro en print_queue para abrir la caja monedera.
 * El servidor local de impresión (long polling) detectará el registro
 * y enviará el comando ESC/POS a la impresora conectada.
 */
export async function abrirCajaMonedra(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('print_queue').insert({
      uuid: randomUUID(),
      type: 'cash_drawer',
      payload: {},
      printed_at: null,
    })

    if (error) {
      console.error('Error insertando en print_queue (cash_drawer):', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('Error en abrirCajaMonedra:', err)
    return { success: false, error: message }
  }
}
