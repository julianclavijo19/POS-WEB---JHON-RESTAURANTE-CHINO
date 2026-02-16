-- =====================================================
-- MESAS: Salón Principal con 8 mesas
-- Elimina todas las mesas y áreas, crea Salón Principal + 8 mesas
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Desvincular órdenes de mesas (para poder borrar mesas)
UPDATE orders SET table_id = NULL WHERE table_id IS NOT NULL;

-- 2. Eliminar mesas
DELETE FROM tables;

-- 3. Eliminar áreas
DELETE FROM areas;

-- 4. Insertar área Salón Principal
INSERT INTO areas (id, name, description) VALUES
  (gen_random_uuid(), 'Salón Principal', 'Área principal del restaurante');

-- 5. Insertar 8 mesas en Salón Principal
DO $$
DECLARE
  v_area_id UUID;
BEGIN
  SELECT id INTO v_area_id FROM areas WHERE name = 'Salón Principal' LIMIT 1;

  INSERT INTO tables (id, number, name, capacity, "areaId", status) VALUES
    (gen_random_uuid(), 1, 'Mesa 1', 4, v_area_id, 'FREE'),
    (gen_random_uuid(), 2, 'Mesa 2', 4, v_area_id, 'FREE'),
    (gen_random_uuid(), 3, 'Mesa 3', 4, v_area_id, 'FREE'),
    (gen_random_uuid(), 4, 'Mesa 4', 4, v_area_id, 'FREE'),
    (gen_random_uuid(), 5, 'Mesa 5', 4, v_area_id, 'FREE'),
    (gen_random_uuid(), 6, 'Mesa 6', 4, v_area_id, 'FREE'),
    (gen_random_uuid(), 7, 'Mesa 7', 4, v_area_id, 'FREE'),
    (gen_random_uuid(), 8, 'Mesa 8', 4, v_area_id, 'FREE');
END $$;

SELECT 'Salón Principal con 8 mesas creado' AS mensaje;
SELECT a.name AS area, COUNT(t.id) AS mesas FROM areas a LEFT JOIN tables t ON t."areaId" = a.id GROUP BY a.name;
