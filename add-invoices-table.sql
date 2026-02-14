-- Agregar tabla de facturas si no existe
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID REFERENCES orders(id),
  customer_name VARCHAR(255) DEFAULT 'Consumidor Final',
  customer_nit VARCHAR(50) DEFAULT 'CF',
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agregar campo payment_method a orders si no existe
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CASH';

-- Habilitar RLS en invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Política para permitir todo en invoices
CREATE POLICY IF NOT EXISTS "Allow all for invoices" ON invoices FOR ALL USING (true);
