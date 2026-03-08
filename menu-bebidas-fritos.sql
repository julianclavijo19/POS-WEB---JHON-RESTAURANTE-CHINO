-- =====================================================
-- MENÚ: BEBIDAS Y FRITOS
-- Agrega categorías de Bebidas y Fritos con sus productos
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- ==================== INSERTAR CATEGORÍAS ====================
-- Insertar solo si no existen

INSERT INTO categories (id, name, description, color)
SELECT gen_random_uuid(), 'Bebidas', 'Aguas, gaseosas, jugos y maltas', '#06b6d4'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Bebidas');

INSERT INTO categories (id, name, description, color)
SELECT gen_random_uuid(), 'Fritos', 'Empanadas, papas y snacks fritos', '#f97316'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fritos');

-- ==================== INSERTAR PRODUCTOS ====================
DO $$
DECLARE
  v_bebidas UUID;
  v_fritos UUID;
BEGIN
  SELECT id INTO v_bebidas FROM categories WHERE name = 'Bebidas' LIMIT 1;
  SELECT id INTO v_fritos FROM categories WHERE name = 'Fritos' LIMIT 1;

  -- ==================== BEBIDAS ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Botella de Agua',         'Agua embotellada personal',              2000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Hit Personal',            'Jugo Hit tamaño personal',               3000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Coca Cola Personal',      'Coca-Cola tamaño personal',              3000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Poni Malta Personal',     'Pony Malta tamaño personal',             3000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Poni Malta Mini',         'Pony Malta tamaño mini',                 2000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Maxi Personal',           'Gaseosa Maxi tamaño personal',           2000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Maxi 1 Litro',            'Gaseosa Maxi de 1 litro',                3000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Poni Malta 1 Litro',      'Pony Malta de 1 litro',                  5000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Coca Cola 1.5L',          'Coca-Cola de 1.5 litros',                7000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Pepsi 1.5L',              'Pepsi de 1.5 litros',                    6000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Poni Malta 1.5L',         'Pony Malta de 1.5 litros',               6000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Vaso de Avena',           'Vaso de avena fría preparada',           2000, v_bebidas, 3, true),
    (gen_random_uuid(), 'Vaso de Limonada',        'Vaso de limonada natural',               1000, v_bebidas, 3, true);

  -- ==================== FRITOS ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Empanadas',               'Empanada frita tradicional',             2500, v_fritos, 5, true),
    (gen_random_uuid(), 'Papas',                   'Papas fritas en porción',                2500, v_fritos, 5, true);

END $$;

-- ==================== VERIFICACIÓN ====================
SELECT 'Bebidas y Fritos agregados exitosamente' AS mensaje;
SELECT c.name AS categoria, COUNT(p.id) AS total_productos
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
WHERE c.name IN ('Bebidas', 'Fritos')
GROUP BY c.name;
