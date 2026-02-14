import { supabase } from './supabase'

// Tasa de impuesto por defecto (16%)
const DEFAULT_TAX_RATE = 0.16

let cachedTaxRate: number | null = null
let cachedTaxEnabled: boolean | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Verifica si los impuestos están habilitados.
 */
export async function isTaxEnabled(): Promise<boolean> {
  const now = Date.now()

  // Usar caché si es válida
  if (cachedTaxEnabled !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedTaxEnabled
  }

  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'tax_enabled')
      .single()

    if (data?.value !== undefined) {
      cachedTaxEnabled = data.value === 'true' || data.value === true
      cacheTimestamp = now
      return cachedTaxEnabled
    }
  } catch {
    // Si falla, impuestos habilitados por defecto
  }

  cachedTaxEnabled = true
  cacheTimestamp = now
  return true
}

/**
 * Obtiene la tasa de impuesto desde la configuración.
 * Usa caché para evitar consultas repetidas.
 * Retorna 0 si los impuestos están deshabilitados.
 */
export async function getTaxRate(): Promise<number> {
  const now = Date.now()

  // Verificar si los impuestos están habilitados
  const enabled = await isTaxEnabled()
  if (!enabled) {
    return 0
  }

  // Usar caché si es válida
  if (cachedTaxRate !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedTaxRate
  }

  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'tax_rate')
      .single()

    if (data?.value) {
      let rate = parseFloat(data.value)
      if (!isNaN(rate) && rate >= 0) {
        // Si el valor es > 1, se asume que está en porcentaje (ej: 8 = 8%)
        if (rate > 1) rate = rate / 100
        cachedTaxRate = rate
        cacheTimestamp = now
        return rate
      }
    }
  } catch {
    // Si falla, usar default
  }

  cachedTaxRate = DEFAULT_TAX_RATE
  cacheTimestamp = now
  return DEFAULT_TAX_RATE
}

/**
 * Calcula el impuesto para un monto dado.
 */
export async function calculateTax(subtotal: number): Promise<{ tax: number; rate: number }> {
  const rate = await getTaxRate()
  return {
    tax: subtotal * rate,
    rate,
  }
}
