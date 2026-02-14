-- ================================================
-- TABLAS PARA GESTIÓN DE INVENTARIO
-- Ejecutar en Supabase SQL Editor
-- ================================================

-- Tabla de ingredientes
CREATE TABLE IF NOT EXISTS ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'kg',
  current_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10, 2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0,
  supplier VARCHAR(255),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mermas/desperdicios
CREATE TABLE IF NOT EXISTS ingredient_waste (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10, 2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  recorded_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT', 'WASTE')),
  quantity DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_ingredients_active ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredient_waste_ingredient ON ingredient_waste(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_waste_date ON ingredient_waste(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);

-- Habilitar Row Level Security
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso (permitir todo para usuarios autenticados)
CREATE POLICY "Allow all for authenticated users" ON ingredients
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON ingredient_waste
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON stock_movements
  FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ================================================

-- Insertar ingredientes de ejemplo
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, supplier, category) VALUES
  ('Pollo', 'kg', 25, 10, 12000, 'Proveedor A', 'Carnes'),
  ('Arroz', 'kg', 50, 20, 3500, 'Proveedor B', 'Granos'),
  ('Cebolla', 'kg', 15, 5, 2500, 'Proveedor C', 'Verduras'),
  ('Tomate', 'kg', 10, 5, 3000, 'Proveedor C', 'Verduras'),
  ('Aceite de Cocina', 'l', 20, 10, 8000, 'Proveedor D', 'Condimentos'),
  ('Sal', 'kg', 5, 2, 1500, 'Proveedor D', 'Condimentos'),
  ('Ajo', 'kg', 3, 1, 15000, 'Proveedor C', 'Condimentos'),
  ('Leche', 'l', 30, 15, 3800, 'Proveedor E', 'Lácteos'),
  ('Huevos', 'unidad', 120, 60, 500, 'Proveedor E', 'Lácteos'),
  ('Carne de Res', 'kg', 15, 8, 25000, 'Proveedor A', 'Carnes'),
  ('Cerdo', 'kg', 12, 6, 18000, 'Proveedor A', 'Carnes'),
  ('Papa', 'kg', 30, 15, 2000, 'Proveedor C', 'Verduras'),
  ('Zanahoria', 'kg', 8, 4, 2200, 'Proveedor C', 'Verduras'),
  ('Pimentón', 'kg', 5, 2, 4500, 'Proveedor C', 'Verduras'),
  ('Pasta', 'kg', 20, 10, 4000, 'Proveedor B', 'Granos')
ON CONFLICT DO NOTHING;

-- ================================================
-- VISTA PARA ALERTAS DE STOCK BAJO
-- ================================================

CREATE OR REPLACE VIEW low_stock_alerts AS
SELECT 
  id,
  name,
  current_stock,
  min_stock,
  unit,
  supplier,
  category,
  CASE 
    WHEN current_stock = 0 THEN 'AGOTADO'
    WHEN current_stock <= min_stock THEN 'STOCK_BAJO'
    ELSE 'OK'
  END as status
FROM ingredients
WHERE is_active = true AND current_stock <= min_stock
ORDER BY 
  CASE WHEN current_stock = 0 THEN 0 ELSE 1 END,
  (min_stock - current_stock) DESC;

-- ================================================
-- FUNCIÓN PARA ACTUALIZAR last_updated AUTOMÁTICAMENTE
-- ================================================

CREATE OR REPLACE FUNCTION update_ingredient_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingredients_update_timestamp
  BEFORE UPDATE ON ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_ingredient_timestamp();

-- ================================================
-- FUNCIÓN PARA OBTENER RESUMEN DE INVENTARIO
-- ================================================

CREATE OR REPLACE FUNCTION get_inventory_summary()
RETURNS TABLE (
  total_ingredients BIGINT,
  low_stock_count BIGINT,
  out_of_stock_count BIGINT,
  total_value DECIMAL,
  waste_this_month DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM ingredients WHERE is_active = true)::BIGINT as total_ingredients,
    (SELECT COUNT(*) FROM ingredients WHERE is_active = true AND current_stock <= min_stock AND current_stock > 0)::BIGINT as low_stock_count,
    (SELECT COUNT(*) FROM ingredients WHERE is_active = true AND current_stock = 0)::BIGINT as out_of_stock_count,
    (SELECT COALESCE(SUM(current_stock * cost_per_unit), 0) FROM ingredients WHERE is_active = true)::DECIMAL as total_value,
    (SELECT COALESCE(SUM(w.quantity * i.cost_per_unit), 0) 
     FROM ingredient_waste w 
     JOIN ingredients i ON w.ingredient_id = i.id 
     WHERE w.created_at >= date_trunc('month', CURRENT_DATE))::DECIMAL as waste_this_month;
END;
$$ LANGUAGE plpgsql;
