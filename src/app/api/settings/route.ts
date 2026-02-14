import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/settings
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')

    if (error && error.code !== 'PGRST116') throw error

    // Convertir array de key-value a objeto
    const settingsObj: Record<string, any> = {
      restaurant_name: 'Mi Restaurante',
      address: '',
      phone: '',
      email: '',
      nit: '',
      logo_url: '',
      tax_rate: 8,
      tax_enabled: true,
      tip_rate: 10,
      tip_enabled: true,
      currency: 'COP',
      payment_methods: null,
      printers: null,
      operating_hours: null,
    }

    if (data && Array.isArray(data)) {
      data.forEach((setting: any) => {
        try {
          // Intentar parsear como JSON para valores complejos
          settingsObj[setting.key] = JSON.parse(setting.value)
        } catch {
          settingsObj[setting.key] = setting.value
        }
      })
    }

    return NextResponse.json(settingsObj)
  } catch (error: any) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const settingsToSave = [
      { key: 'restaurant_name', value: body.restaurant_name || 'Mi Restaurante' },
      { key: 'address', value: body.address || '' },
      { key: 'phone', value: body.phone || '' },
      { key: 'email', value: body.email || '' },
      { key: 'nit', value: body.nit || '' },
      { key: 'logo_url', value: body.logo_url || '' },
      { key: 'tax_rate', value: String(body.tax_rate ?? 8) },
      { key: 'tax_enabled', value: String(body.tax_enabled ?? true) },
      { key: 'tip_rate', value: String(body.tip_rate ?? 10) },
      { key: 'tip_enabled', value: String(body.tip_enabled ?? true) },
      { key: 'currency', value: body.currency || 'COP' },
      { key: 'payment_methods', value: JSON.stringify(body.payment_methods || []) },
      { key: 'printers', value: JSON.stringify(body.printers || []) },
      { key: 'operating_hours', value: JSON.stringify(body.operating_hours || []) },
    ]

    // Guardar cada configuración usando upsert
    for (const setting of settingsToSave) {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { 
            key: setting.key, 
            value: setting.value,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        )

      if (error) {
        console.error(`Error saving setting ${setting.key}:`, error)
        throw error
      }
    }

    return NextResponse.json({ success: true, ...body })
  } catch (error: any) {
    console.error('Error saving settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
