-- =====================================================
-- FIX: Asegurar que devoluciones se reflejen en caja
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Asegurar que la tabla refunds tiene cash_register_id
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CASH';

-- 2. Asegurar que la tabla payments tiene las columnas necesarias
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PAID';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

-- 3. Índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_refunds_cash_register ON refunds(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_cash_register ON payments(cash_register_id);

-- 4. Verificar estructura
SELECT 'refunds' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'refunds' 
ORDER BY ordinal_position;

SELECT 'payments' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- 5. Verificar datos de devoluciones existentes
SELECT 
  r.id,
  r.order_id,
  r.amount,
  r.payment_method,
  r.status,
  r.cash_register_id,
  r.created_at
FROM refunds r
ORDER BY r.created_at DESC
LIMIT 10;
