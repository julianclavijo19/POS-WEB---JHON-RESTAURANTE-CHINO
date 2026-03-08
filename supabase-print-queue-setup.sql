-- Tabla print_queue para cola de impresión (cocina, correcciones, caja monedera)
-- Ejecutar en Supabase SQL Editor si la tabla no existe

CREATE TABLE IF NOT EXISTS print_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid TEXT,
  type TEXT NOT NULL,  -- 'kitchen' | 'correction' | 'cash_drawer'
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  printed_at TIMESTAMPTZ  -- NULL = pendiente
);

CREATE INDEX IF NOT EXISTS idx_print_queue_printed_at ON print_queue(printed_at) WHERE printed_at IS NULL;
