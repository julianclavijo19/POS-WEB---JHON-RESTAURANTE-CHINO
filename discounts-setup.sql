-- ==================== TABLA DE DESCUENTOS ====================
-- Sistema de descuentos para el restaurante
-- Incluye descuentos predefinidos y registro de descuentos aplicados

-- Tabla de tipos de descuento (descuentos predefinidos/configurables)
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  value DECIMAL(10,2) NOT NULL CHECK (value > 0),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  max_discount_amount DECIMAL(10,2), -- Límite máximo de descuento para porcentajes
  is_active BOOLEAN DEFAULT true,
  requires_authorization BOOLEAN DEFAULT false, -- Si requiere autorización de supervisor
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  usage_limit INTEGER, -- Número máximo de usos (null = ilimitado)
  times_used INTEGER DEFAULT 0,
  applies_to VARCHAR(50) DEFAULT 'ALL', -- ALL, DINE_IN, TAKEOUT, DELIVERY
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Tabla de descuentos aplicados (historial)
CREATE TABLE IF NOT EXISTS applied_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_id UUID REFERENCES discounts(id), -- null si es descuento manual
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL, -- Monto real descontado
  original_total DECIMAL(10,2) NOT NULL,
  new_total DECIMAL(10,2) NOT NULL,
  reason TEXT,
  applied_by UUID REFERENCES users(id),
  authorized_by UUID REFERENCES users(id), -- Si requirió autorización
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_type ON discounts(discount_type);
CREATE INDEX IF NOT EXISTS idx_discounts_valid ON discounts(valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_applied_discounts_order ON applied_discounts(order_id);
CREATE INDEX IF NOT EXISTS idx_applied_discounts_date ON applied_discounts(created_at);
CREATE INDEX IF NOT EXISTS idx_applied_discounts_user ON applied_discounts(applied_by);

-- Insertar algunos descuentos predefinidos
INSERT INTO discounts (name, description, discount_type, value, is_active, requires_authorization) VALUES
  ('Descuento Empleado 10%', 'Descuento para empleados del restaurante', 'PERCENTAGE', 10, true, false),
  ('Descuento Empleado 20%', 'Descuento especial empleados', 'PERCENTAGE', 20, true, true),
  ('Promoción del Día', 'Descuento promocional diario', 'PERCENTAGE', 15, true, false),
  ('Cliente Frecuente', 'Descuento para clientes frecuentes', 'PERCENTAGE', 5, true, false),
  ('Compensación', 'Descuento por compensación de servicio', 'PERCENTAGE', 100, true, true),
  ('Descuento $5.000', 'Descuento fijo de $5.000', 'FIXED', 5000, true, false),
  ('Descuento $10.000', 'Descuento fijo de $10.000', 'FIXED', 10000, true, true),
  ('Cortesía', 'Cortesía de la casa', 'PERCENTAGE', 100, true, true)
ON CONFLICT DO NOTHING;

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_discount_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar timestamp
DROP TRIGGER IF EXISTS trigger_update_discount_timestamp ON discounts;
CREATE TRIGGER trigger_update_discount_timestamp
  BEFORE UPDATE ON discounts
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_timestamp();

-- Vista para reportes de descuentos
CREATE OR REPLACE VIEW discount_summary AS
SELECT 
  d.id,
  d.name,
  d.discount_type,
  d.value,
  d.is_active,
  d.times_used,
  COALESCE(SUM(ad.discount_amount), 0) as total_discounted,
  COUNT(ad.id) as times_applied
FROM discounts d
LEFT JOIN applied_discounts ad ON d.id = ad.discount_id
GROUP BY d.id, d.name, d.discount_type, d.value, d.is_active, d.times_used;

-- Verificar estructura
SELECT 'discounts' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'discounts' 
ORDER BY ordinal_position;

SELECT 'applied_discounts' as tabla, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'applied_discounts' 
ORDER BY ordinal_position;
