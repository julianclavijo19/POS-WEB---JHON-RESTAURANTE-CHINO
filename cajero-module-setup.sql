-- =====================================================
-- Script completo para el módulo de caja
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Verificar/crear tabla refunds (devoluciones)
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    payment_id UUID REFERENCES payments(id),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    approved_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 2. Verificar/crear tabla discounts (descuentos aplicados)
CREATE TABLE IF NOT EXISTS applied_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    discount_type VARCHAR(20) NOT NULL, -- PERCENTAGE, FIXED, COUPON
    discount_value DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL, -- Monto real descontado
    reason TEXT,
    authorized_by UUID REFERENCES users(id),
    applied_by UUID REFERENCES users(id),
    coupon_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Verificar/crear tabla print_logs (reimpresiones)
CREATE TABLE IF NOT EXISTS print_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    print_type VARCHAR(30) NOT NULL, -- TICKET, INVOICE, KITCHEN, RECEIPT
    printed_by UUID REFERENCES users(id),
    printer_name VARCHAR(100),
    copies INT DEFAULT 1,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Añadir columnas faltantes a payments si no existen
ALTER TABLE payments ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2);

-- 5. Añadir columnas faltantes a cash_registers si no existen
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closing_amount DECIMAL(10,2);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS expected_amount DECIMAL(10,2);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS difference DECIMAL(10,2);
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS cash_sales DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS card_sales DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS transfer_sales DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS total_sales DECIMAL(10,2) DEFAULT 0;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 6. Habilitar RLS en las nuevas tablas
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE applied_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de acceso para refunds
DROP POLICY IF EXISTS "Allow all operations on refunds" ON refunds;
CREATE POLICY "Allow all operations on refunds" ON refunds
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Políticas de acceso para applied_discounts
DROP POLICY IF EXISTS "Allow all operations on applied_discounts" ON applied_discounts;
CREATE POLICY "Allow all operations on applied_discounts" ON applied_discounts
    FOR ALL USING (true) WITH CHECK (true);

-- 9. Políticas de acceso para print_logs  
DROP POLICY IF EXISTS "Allow all operations on print_logs" ON print_logs;
CREATE POLICY "Allow all operations on print_logs" ON print_logs
    FOR ALL USING (true) WITH CHECK (true);

-- 10. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);
CREATE INDEX IF NOT EXISTS idx_applied_discounts_order_id ON applied_discounts(order_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_order_id ON print_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_print_logs_created_at ON print_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at ON cash_registers(opened_at);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);

-- 11. Verificar estructura de tablas
SELECT 'cash_registers' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cash_registers' 
ORDER BY ordinal_position;

SELECT 'payments' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

SELECT 'refunds' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'refunds' 
ORDER BY ordinal_position;
