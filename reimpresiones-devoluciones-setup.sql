-- =====================================================
-- SQL para configurar reimpresiones y devoluciones
-- Ejecutar en Supabase SQL Editor
-- IMPORTANTE: Las devoluciones REQUIEREN turno de caja abierto
-- =====================================================

-- 1. Crear tabla refunds (devoluciones) si no existe
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    payment_id UUID REFERENCES payments(id),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    notes TEXT,
    payment_method VARCHAR(20) DEFAULT 'CASH',
    cash_register_id UUID REFERENCES cash_registers(id), -- Turno asociado
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Agregar columna cash_register_id si la tabla ya existe
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id);

-- 2. Crear tabla print_logs (reimpresiones) si no existe
CREATE TABLE IF NOT EXISTS print_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    print_type VARCHAR(30) NOT NULL,
    printed_by UUID REFERENCES users(id),
    printer_name VARCHAR(100),
    copies INT DEFAULT 1,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS en las tablas
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acceso para refunds
DROP POLICY IF EXISTS "Allow all operations on refunds" ON refunds;
CREATE POLICY "Allow all operations on refunds" ON refunds
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Políticas de acceso para print_logs  
DROP POLICY IF EXISTS "Allow all operations on print_logs" ON print_logs;
CREATE POLICY "Allow all operations on print_logs" ON print_logs
    FOR ALL USING (true) WITH CHECK (true);

-- 6. Agregar columna status a payments para identificar devoluciones
ALTER TABLE payments ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PAID';

-- 7. Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_refunds_cash_register ON refunds(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_order_id ON print_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_created_at ON print_logs(created_at);

-- 8. Actualizar los pagos existentes sin status
UPDATE payments SET status = 'PAID' WHERE status IS NULL;

-- =====================================================
-- FUNCIÓN: Calcular total de devoluciones por turno
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_shift_refunds(shift_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO total
  FROM refunds
  WHERE cash_register_id = shift_id
    AND status = 'APPROVED';
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA: Resumen de devoluciones por día
-- =====================================================
CREATE OR REPLACE VIEW refunds_daily_summary AS
SELECT 
  DATE(created_at) as fecha,
  payment_method,
  COUNT(*) as total_devoluciones,
  SUM(amount) as monto_total
FROM refunds
WHERE status = 'APPROVED'
GROUP BY DATE(created_at), payment_method
ORDER BY fecha DESC;

-- =====================================================
-- VISTA: Resumen de reimpresiones por día
-- =====================================================
CREATE OR REPLACE VIEW print_logs_summary AS
SELECT 
  DATE(created_at) as fecha,
  print_type,
  COUNT(*) as total_impresiones,
  COUNT(*) FILTER (WHERE success = true) as exitosas,
  COUNT(*) FILTER (WHERE success = false) as fallidas
FROM print_logs
GROUP BY DATE(created_at), print_type
ORDER BY fecha DESC;

-- =====================================================
-- Verificar la estructura actualizada
-- =====================================================
SELECT 'refunds' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'refunds' 
ORDER BY ordinal_position;

SELECT 'print_logs' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'print_logs' 
ORDER BY ordinal_position;

SELECT 'payments' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN:
-- =====================================================
-- 1. Las devoluciones REQUIEREN turno de caja abierto (validación en API)
-- 2. El monto se registra como pago negativo en payments (amount = -valor)
-- 3. El campo cash_register_id vincula la devolución al turno activo
-- 4. Los reportes de cierre incluyen total de devoluciones
-- 5. Las reimpresiones quedan registradas para auditoría
-- =====================================================
