-- Script para verificar y añadir columnas faltantes a cash_registers
-- Ejecutar este script en Supabase SQL Editor

-- Primero verificamos si la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cash_registers') THEN
        -- Crear la tabla si no existe
        CREATE TABLE cash_registers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id),
            opening_amount DECIMAL(10,2) DEFAULT 0,
            closing_amount DECIMAL(10,2),
            expected_amount DECIMAL(10,2),
            difference DECIMAL(10,2),
            cash_sales DECIMAL(10,2) DEFAULT 0,
            card_sales DECIMAL(10,2) DEFAULT 0,
            transfer_sales DECIMAL(10,2) DEFAULT 0,
            total_sales DECIMAL(10,2) DEFAULT 0,
            total_orders INTEGER DEFAULT 0,
            status VARCHAR(20) DEFAULT 'OPEN',
            notes TEXT,
            opened_at TIMESTAMPTZ DEFAULT NOW(),
            closed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabla cash_registers creada';
    END IF;
END $$;

-- Añadir columnas faltantes si no existen
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

-- Configurar RLS (Row Level Security) si está habilitado
ALTER TABLE cash_registers ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajustar según necesidad)
DROP POLICY IF EXISTS "Allow all operations on cash_registers" ON cash_registers;
CREATE POLICY "Allow all operations on cash_registers" ON cash_registers
    FOR ALL USING (true) WITH CHECK (true);

-- También verificar tabla payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS received_amount DECIMAL(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2);

-- Verificar estructura final
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cash_registers' 
ORDER BY ordinal_position;
