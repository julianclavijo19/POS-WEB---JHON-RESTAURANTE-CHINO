-- ============================================================
-- SCRIPT COMPLETO DE BASE DE DATOS PARA SISTEMA DE COMANDAS
-- Ejecutar en Supabase SQL Editor si hay tablas faltantes
-- ============================================================

-- ==================== TABLA PAYMENTS ====================
-- Ya definida en Prisma, pero aquí está la versión SQL por si acaso
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(20) NOT NULL DEFAULT 'CASH', -- CASH, CARD, TRANSFER, OTHER
  reference VARCHAR(255),
  received_amount DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  cash_register_id UUID REFERENCES cash_registers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- ==================== TABLA INVOICES ====================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  table_id UUID REFERENCES tables(id),
  customer_name VARCHAR(255) DEFAULT 'Consumidor Final',
  customer_nit VARCHAR(50) DEFAULT 'CF',
  customer_address TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  tip DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50),
  status VARCHAR(20) DEFAULT 'paid', -- paid, cancelled, refunded
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT
);

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- ==================== TABLA CASH_REGISTERS (Turnos de Caja) ====================
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  difference DECIMAL(10,2),
  cash_sales DECIMAL(10,2) DEFAULT 0,
  card_sales DECIMAL(10,2) DEFAULT 0,
  transfer_sales DECIMAL(10,2) DEFAULT 0,
  total_sales DECIMAL(10,2) DEFAULT 0,
  total_orders INT DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLOSED
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para cash_registers
CREATE INDEX IF NOT EXISTS idx_cash_registers_user_id ON cash_registers(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);
CREATE INDEX IF NOT EXISTS idx_cash_registers_opened_at ON cash_registers(opened_at);

-- ==================== VERIFICAR CAMPOS EN ORDERS ====================
-- Agregar campos si no existen
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tip DECIMAL(10,2) DEFAULT 0;

-- ==================== ROW LEVEL SECURITY ====================
-- Habilitar RLS en todas las tablas
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (ajustar según necesidades de seguridad)
DO $$
BEGIN
  -- Payments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'allow_all_payments') THEN
    CREATE POLICY allow_all_payments ON payments FOR ALL USING (true);
  END IF;
  
  -- Invoices
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'allow_all_invoices') THEN
    CREATE POLICY allow_all_invoices ON invoices FOR ALL USING (true);
  END IF;
  
  -- Cash Registers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cash_registers' AND policyname = 'allow_all_cash_registers') THEN
    CREATE POLICY allow_all_cash_registers ON cash_registers FOR ALL USING (true);
  END IF;
END $$;

-- ==================== FUNCIÓN PARA GENERAR NÚMERO DE FACTURA ====================
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS VARCHAR(50) AS $$
DECLARE
  today_date VARCHAR(8);
  count_today INT;
  new_number VARCHAR(50);
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO count_today
  FROM invoices
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := 'INV-' || today_date || '-' || LPAD(count_today::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- ==================== FUNCIÓN PARA PROCESAR PAGO COMPLETO ====================
-- Esta función asegura que todas las operaciones se ejecuten atómicamente
CREATE OR REPLACE FUNCTION process_order_payment(
  p_order_id UUID,
  p_payment_method VARCHAR(20),
  p_received_amount DECIMAL(10,2),
  p_change_amount DECIMAL(10,2),
  p_tip DECIMAL(10,2) DEFAULT 0,
  p_discount DECIMAL(10,2) DEFAULT 0,
  p_discount_type VARCHAR(20) DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_payment_id UUID;
  v_invoice_id UUID;
  v_invoice_number VARCHAR(50);
  v_final_total DECIMAL(10,2);
BEGIN
  -- Obtener la orden
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Orden no encontrada');
  END IF;
  
  IF v_order.status = 'PAID' THEN
    RETURN json_build_object('success', false, 'error', 'La orden ya está pagada');
  END IF;
  
  -- Calcular total final
  v_final_total := v_order.subtotal + v_order.tax - p_discount + p_tip;
  
  -- Crear el pago
  INSERT INTO payments (order_id, amount, method, received_amount, change_amount)
  VALUES (p_order_id, v_final_total, p_payment_method, p_received_amount, p_change_amount)
  RETURNING id INTO v_payment_id;
  
  -- Generar número de factura
  v_invoice_number := generate_invoice_number();
  
  -- Crear la factura
  INSERT INTO invoices (
    invoice_number, order_id, payment_id, table_id,
    subtotal, discount, tax, total, tip, payment_method, created_by
  )
  VALUES (
    v_invoice_number, p_order_id, v_payment_id, v_order.table_id,
    v_order.subtotal, p_discount, v_order.tax, v_final_total, p_tip, p_payment_method, p_user_id
  )
  RETURNING id INTO v_invoice_id;
  
  -- Actualizar la orden
  UPDATE orders
  SET 
    status = 'PAID',
    discount = p_discount,
    discount_type = p_discount_type,
    tip = p_tip,
    total = v_final_total,
    paid_at = NOW(),
    paid_by = p_user_id,
    payment_method = p_payment_method,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Liberar la mesa (si no hay otras órdenes activas)
  IF v_order.table_id IS NOT NULL THEN
    UPDATE tables
    SET status = 'AVAILABLE', updated_at = NOW()
    WHERE id = v_order.table_id
    AND NOT EXISTS (
      SELECT 1 FROM orders 
      WHERE table_id = v_order.table_id 
      AND id != p_order_id
      AND status NOT IN ('PAID', 'CANCELLED')
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number,
    'total', v_final_total,
    'change', p_change_amount
  );
END;
$$ LANGUAGE plpgsql;

-- ==================== VISTA PARA REPORTES DE VENTAS ====================
-- Primero agregar columnas faltantes si no existen
ALTER TABLE payments ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2);

CREATE OR REPLACE VIEW sales_summary AS
SELECT 
  DATE(p.created_at) as sale_date,
  p.method as payment_method,
  COUNT(*) as transaction_count,
  SUM(p.amount) as total_amount,
  COALESCE(SUM(p.change_amount), 0) as total_change_given
FROM payments p
GROUP BY DATE(p.created_at), p.method
ORDER BY sale_date DESC, payment_method;

-- ==================== COMENTARIOS DE DOCUMENTACIÓN ====================
COMMENT ON TABLE payments IS 'Registro de todos los pagos realizados';
COMMENT ON TABLE invoices IS 'Facturas generadas para cada venta';
COMMENT ON TABLE cash_registers IS 'Turnos de caja para control de efectivo';
COMMENT ON FUNCTION process_order_payment IS 'Proceso atómico para procesar un pago completo';
COMMENT ON FUNCTION generate_invoice_number IS 'Genera número de factura único por día';
