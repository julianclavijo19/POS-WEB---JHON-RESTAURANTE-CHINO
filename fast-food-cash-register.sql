-- SQL para agregar soporte de Caja de Comidas Rápidas
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna de tipo de caja a cash_registers
ALTER TABLE cash_registers 
ADD COLUMN IF NOT EXISTS register_type VARCHAR(50) DEFAULT 'RESTAURANT';

-- Actualizar registros existentes
UPDATE cash_registers 
SET register_type = 'RESTAURANT' 
WHERE register_type IS NULL;

-- 2. Agregar índice para búsqueda rápida por tipo
CREATE INDEX IF NOT EXISTS idx_cash_registers_type ON cash_registers(register_type);

-- 3. Agregar restricción de check para tipos válidos
ALTER TABLE cash_registers
DROP CONSTRAINT IF EXISTS cash_registers_type_check;

ALTER TABLE cash_registers
ADD CONSTRAINT cash_registers_type_check 
CHECK (register_type IN ('RESTAURANT', 'FAST_FOOD'));

-- 4. Comentario descriptivo
COMMENT ON COLUMN cash_registers.register_type IS 'Tipo de caja: RESTAURANT (Restaurante Chino con mesas y menú) o FAST_FOOD (Comidas Rápidas sin mesas)';

-- 5. Crear vista para estadísticas por tipo de caja
CREATE OR REPLACE VIEW cash_register_stats AS
SELECT 
    register_type,
    COUNT(*) as total_shifts,
    SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_shifts,
    SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_shifts,
    SUM(total_sales) as total_revenue,
    SUM(cash_sales) as total_cash,
    SUM(card_sales) as total_card,
    SUM(transfer_sales) as total_transfer,
    AVG(difference) as avg_difference
FROM cash_registers
WHERE status = 'CLOSED'
GROUP BY register_type;

-- 6. Función para verificar si hay caja abierta por tipo
CREATE OR REPLACE FUNCTION get_open_register_by_type(p_type VARCHAR)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    opening_amount DECIMAL,
    cash_sales DECIMAL,
    card_sales DECIMAL,
    transfer_sales DECIMAL,
    total_sales DECIMAL,
    opened_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.user_id,
        cr.opening_amount,
        cr.cash_sales,
        cr.card_sales,
        cr.transfer_sales,
        cr.total_sales,
        cr.opened_at,
        cr.status
    FROM cash_registers cr
    WHERE cr.register_type = p_type
    AND cr.status = 'OPEN'
    ORDER BY cr.opened_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7. Política RLS para acceso por tipo (si se necesita)
-- DROP POLICY IF EXISTS cash_register_type_policy ON cash_registers;
-- CREATE POLICY cash_register_type_policy ON cash_registers
--     USING (true)
--     WITH CHECK (true);

SELECT 'SQL de Caja Comidas Rápidas ejecutado correctamente' as resultado;
