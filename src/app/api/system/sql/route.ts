import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// POST /api/system/sql - Execute SQL queries
export async function POST(request: NextRequest) {
  try {
    // Verify admin session
    const cookieHeader = request.headers.get('cookie')
    let isAdmin = false
    
    if (cookieHeader) {
      const sessionMatch = cookieHeader.match(/session=([^;]+)/)
      if (sessionMatch) {
        try {
          const session = JSON.parse(decodeURIComponent(sessionMatch[1]))
          isAdmin = session.role === 'ADMIN'
        } catch {}
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'No autorizado. Solo administradores pueden ejecutar SQL.' }, { status: 401 })
    }

    const { query } = await request.json()

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Consulta SQL requerida' }, { status: 400 })
    }

    const trimmedQuery = query.trim()

    // Block dangerous operations
    const dangerous = /\b(DROP\s+DATABASE|DROP\s+SCHEMA|TRUNCATE\s+ALL|ALTER\s+SYSTEM)\b/i
    if (dangerous.test(trimmedQuery)) {
      return NextResponse.json({ error: 'Operación no permitida por seguridad.' }, { status: 403 })
    }

    // Use Supabase's rpc to run raw SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: trimmedQuery })

    if (error) {
      // If exec_sql function doesn't exist, try direct approach
      if (error.message?.includes('function') || error.code === '42883') {
        // Direct table query for SELECT statements
        const isSelect = /^\s*SELECT\b/i.test(trimmedQuery)
        
        if (isSelect) {
          // Parse table name from simple SELECT queries
          const fromMatch = trimmedQuery.match(/FROM\s+["']?(\w+)["']?/i)
          if (fromMatch) {
            const tableName = fromMatch[1]
            
            // Try using Supabase's from() for simple queries
            let q = supabase.from(tableName).select('*')
            
            // Apply LIMIT
            const limitMatch = trimmedQuery.match(/LIMIT\s+(\d+)/i)
            const limit = limitMatch ? parseInt(limitMatch[1]) : 100
            q = q.limit(limit)

            // Apply ORDER BY
            const orderMatch = trimmedQuery.match(/ORDER\s+BY\s+(\w+)\s*(ASC|DESC)?/i)
            if (orderMatch) {
              q = q.order(orderMatch[1], { ascending: orderMatch[2]?.toUpperCase() !== 'DESC' })
            }

            const { data: tableData, error: tableError } = await q

            if (tableError) {
              return NextResponse.json({ error: tableError.message }, { status: 400 })
            }

            return NextResponse.json({
              data: tableData,
              message: `${tableData?.length || 0} registros encontrados`,
            })
          }
        }

        // For non-SELECT or complex queries, attempt via PostgREST
        return NextResponse.json({ 
          error: `Para consultas complejas, crea la función exec_sql en Supabase:\n\nCREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)\nRETURNS JSON AS $$\nDECLARE result JSON;\nBEGIN\n  EXECUTE sql_query INTO result;\n  RETURN result;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;\n\nAlternativamente, usa el SQL Editor de Supabase directamente.\n\nError original: ${error.message}` 
        }, { status: 400 })
      }

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      data: Array.isArray(data) ? data : data ? [data] : [],
      message: `Consulta ejecutada exitosamente`,
    })

  } catch (error: any) {
    console.error('SQL Error:', error)
    return NextResponse.json({ error: error.message || 'Error ejecutando consulta' }, { status: 500 })
  }
}
