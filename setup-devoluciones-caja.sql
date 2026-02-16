-- Devoluciones reflejadas en caja: añadir cash_register_id a payments si no existe
-- Ejecutar en Supabase SQL Editor si las devoluciones no se reflejan en el turno

ALTER TABLE payments ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id);
CREATE INDEX IF NOT EXISTS idx_payments_cash_register ON payments(cash_register_id);
