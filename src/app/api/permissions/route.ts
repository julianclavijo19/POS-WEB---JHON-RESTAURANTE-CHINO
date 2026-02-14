import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET /api/permissions - Obtener permisos por rol
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .like('key', 'permissions_%')

    if (error && error.code !== 'PGRST116') throw error

    // Construir objeto de permisos
    const permissions: Record<string, string[]> = {}

    if (data && Array.isArray(data)) {
      data.forEach((setting: any) => {
        const role = setting.key.replace('permissions_', '')
        try {
          permissions[role] = JSON.parse(setting.value)
        } catch {
          permissions[role] = []
        }
      })
    }

    return NextResponse.json(permissions)
  } catch (error: any) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/permissions - Guardar permisos por rol
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { role, permissions } = body

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'Se requiere rol y permisos' },
        { status: 400 }
      )
    }

    // Guardar permisos del rol
    const { error } = await supabase
      .from('settings')
      .upsert(
        {
          key: `permissions_${role}`,
          value: JSON.stringify(permissions),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'key' }
      )

    if (error) throw error

    return NextResponse.json({ success: true, role, permissions })
  } catch (error: any) {
    console.error('Error saving permissions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/permissions - Guardar todos los permisos de una vez
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { permissions } = body

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json(
        { error: 'Se requieren permisos válidos' },
        { status: 400 }
      )
    }

    // Guardar todos los permisos
    for (const [role, perms] of Object.entries(permissions)) {
      const { error } = await supabase
        .from('settings')
        .upsert(
          {
            key: `permissions_${role}`,
            value: JSON.stringify(perms),
            updated_at: new Date().toISOString()
          },
          { onConflict: 'key' }
        )

      if (error) {
        console.error(`Error saving permissions for ${role}:`, error)
        throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error saving all permissions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
