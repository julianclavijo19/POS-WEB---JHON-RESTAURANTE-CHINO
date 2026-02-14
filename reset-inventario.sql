-- Reset completo del inventario (ingredientes, movimientos, mermas).
-- Ejecutar en Supabase SQL Editor cuando quieras entregar el proyecto desde cero.
-- Tiene apartado de ingredientes; puedes agregar categorías como "Gaseosa", "Bebidas", etc. después.

-- 1. Borrar movimientos de stock (dependen de ingredientes)
DELETE FROM stock_movements;

-- 2. Borrar mermas / desperdicios
DELETE FROM ingredient_waste;

-- 3. Borrar ingredientes
DELETE FROM ingredients;

-- Opcional: reiniciar secuencias si usas ID serial
-- SELECT setval(pg_get_serial_sequence('ingredients', 'id'), 1);

-- Para agregar categorías de ingredientes (ej. Gaseosa, Bebidas), insertar después:
-- INSERT INTO ingredients (name, unit, current_stock, min_stock, category, cost_per_unit) VALUES
--   ('Gaseosa 400ml', 'unidad', 0, 5, 'Gaseosa', 0),
--   ('Agua 500ml', 'unidad', 0, 10, 'Bebidas', 0);
