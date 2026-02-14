-- Cola de impresión para polling desde el servidor de impresión (Vercel → print-server)
-- Ejecutar en Supabase SQL Editor o en tu PostgreSQL.

CREATE TABLE IF NOT EXISTS print_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('kitchen', 'correction')),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_print_queue_printed_at ON print_queue (printed_at);
CREATE INDEX IF NOT EXISTS idx_print_queue_created_at ON print_queue (created_at);

COMMENT ON TABLE print_queue IS 'Cola de trabajos de impresión; el print-server hace polling y marca printed_at';
