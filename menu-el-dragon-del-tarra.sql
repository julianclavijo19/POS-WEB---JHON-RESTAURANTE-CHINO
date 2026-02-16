-- =====================================================
-- MENÚ EL DRAGÓN DEL TARRA
-- Elimina el menú actual e inserta el nuevo
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Eliminar productos primero (FK a categories)
DELETE FROM order_items;
DELETE FROM products;

-- Eliminar categorías
DELETE FROM categories;

-- ==================== INSERTAR CATEGORÍAS ====================
INSERT INTO categories (id, name, description, color) VALUES
  (gen_random_uuid(), 'Comidas Rápidas', NULL, '#f97316'),
  (gen_random_uuid(), 'Platos Especiales', NULL, '#ef4444'),
  (gen_random_uuid(), 'Arroz Especial', NULL, '#eab308'),
  (gen_random_uuid(), 'Combos', NULL, '#22c55e');

-- ==================== INSERTAR PRODUCTOS ====================
DO $$
DECLARE
  v_comidas_rapidas UUID;
  v_platos_especiales UUID;
  v_arroz_especial UUID;
  v_combos UUID;
BEGIN
  SELECT id INTO v_comidas_rapidas FROM categories WHERE name = 'Comidas Rápidas' LIMIT 1;
  SELECT id INTO v_platos_especiales FROM categories WHERE name = 'Platos Especiales' LIMIT 1;
  SELECT id INTO v_arroz_especial FROM categories WHERE name = 'Arroz Especial' LIMIT 1;
  SELECT id INTO v_combos FROM categories WHERE name = 'Combos' LIMIT 1;

  -- COMIDAS RÁPIDAS
  INSERT INTO products (id, name, description, price, category_id, prep_time) VALUES
    (gen_random_uuid(), 'Hamburguesa Mixta', '120 gramos de carne, 100 gramos de lomo, huevo a la plancha, tocineta, jamón, queso tajado, vegetales, papa francesa', 18000, v_comidas_rapidas, 15),
    (gen_random_uuid(), 'Hamburguesa Especial', '120 gramos de carne, huevo a la plancha, tocineta, jamón, queso tajado, vegetales, papa francesa', 15000, v_comidas_rapidas, 12),
    (gen_random_uuid(), 'Hamburguesa Normal', '120 gramos de carne, jamón y queso', 12000, v_comidas_rapidas, 10),
    (gen_random_uuid(), 'Perro Tipo Americano', 'Salchicha grande de pollo, vegetales, papa rápida, queso y salsas', 8000, v_comidas_rapidas, 8),
    (gen_random_uuid(), 'Perro Normal', 'Salchicha de pollo, vegetales, papa rápida, queso y salsa', 6000, v_comidas_rapidas, 6),
    (gen_random_uuid(), 'Picada Para 2 Personas', 'Papa francesa, lomo de cerdo al barril, salchicha, chorizo ahumado, chorizo coctelero, vegetales, salsa, queso rayado', 30000, v_comidas_rapidas, 20),
    (gen_random_uuid(), 'Picada Familiar', 'Papa francesa, lomo cerdo al barril, salchicha, chorizo ahumado, chorizo coctelero, vegetales, salsa y queso rayado', 50000, v_comidas_rapidas, 25),
    (gen_random_uuid(), 'Salchipapa', 'Papas francesas, salchicha, vegetales, salsa y queso', 15000, v_comidas_rapidas, 12);

  -- PLATOS ESPECIALES
  INSERT INTO products (id, name, description, price, category_id, prep_time) VALUES
    (gen_random_uuid(), 'Pollo Rebosado', '150 gramos de papa francesa, 15 trozos de pollo rebosado', 20000, v_platos_especiales, 18),
    (gen_random_uuid(), 'Pollo Agridulce', '150 gramos de papas francesa, 15 trozos de pollo en salsa agridulce', 20000, v_platos_especiales, 18),
    (gen_random_uuid(), 'Lomito Ajo', '150 gramos de papa a la francesa, 250 g de lomito en salsa de ajo', 20000, v_platos_especiales, 18),
    (gen_random_uuid(), 'Espagueti', 'Pasta larga con pollo, cerdo, camarón, vegetales a la Juliana', 20000, v_platos_especiales, 15),
    (gen_random_uuid(), 'Ensalada de Camarón', '250 g de camarón con vegetales', 30000, v_platos_especiales, 12),
    (gen_random_uuid(), 'Ensalada de Pollo', '250 gramos de pollo con vegetales', 20000, v_platos_especiales, 12);

  -- ARROZ ESPECIAL
  INSERT INTO products (id, name, description, price, category_id, prep_time) VALUES
    (gen_random_uuid(), 'Arroz Personal', 'Arroz frito especial, cerdo, camarones, jamón y pollo esmechado', 15000, v_arroz_especial, 15),
    (gen_random_uuid(), 'Arroz Grande', 'Arroz frito especial, cerdo, camarones, jamón y pollo esmechado', 30000, v_arroz_especial, 18),
    (gen_random_uuid(), 'Familiar', 'Arroz frito especial, cerdo, camarones, jamón y pollo esmechado + 3 piezas de pollo frito', 45000, v_arroz_especial, 22),
    (gen_random_uuid(), 'Arroz Solo Camarón 200 g', NULL, 20000, v_arroz_especial, 12),
    (gen_random_uuid(), 'Arroz Solo Pollo 250 g', NULL, 16000, v_arroz_especial, 12),
    (gen_random_uuid(), 'Arroz Solo Cerdo 200 g', NULL, 16000, v_arroz_especial, 12),
    (gen_random_uuid(), 'Arroz Solo Jamón 250 g', NULL, 12000, v_arroz_especial, 10);

  -- COMBOS
  INSERT INTO products (id, name, description, price, category_id, prep_time) VALUES
    (gen_random_uuid(), 'Combo Pollo Agridulce', 'Arroz jamón + tajadas, ensalada y 6 trozos de pollo', 16000, v_combos, 15),
    (gen_random_uuid(), 'Combo Pollo a la Plancha', 'Arroz jamón + ensalada + tajadas y 200 gramos de pechuga', 16000, v_combos, 15),
    (gen_random_uuid(), 'Combo Pollo Frito', 'Arroz jamón, tajada, ensalada, 3 piezas de pollo frito', 16000, v_combos, 15),
    (gen_random_uuid(), 'Combo Chuleta Natural', 'Arroz, jamón, tajada, ensalada, chuleta 200 gramos', 16000, v_combos, 15),
    (gen_random_uuid(), 'Combo Chuleta Ahumada', 'Arroz jamón, tajada, ensalada, chuleta 200 gramos', 16000, v_combos, 15),
    (gen_random_uuid(), 'Combo Lomito Ajo', 'Arroz jamón, papas a la francesa, 150 gramos de lomito en salsa de ajo', 16000, v_combos, 15);

END $$;

SELECT 'Menú El Dragón del Tarra creado exitosamente' AS mensaje;
SELECT COUNT(*) AS total_productos FROM products;
SELECT COUNT(*) AS total_categorias FROM categories;
