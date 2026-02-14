-- =====================================================
-- SCRIPT PARA RESETEAR DATOS TRANSACCIONALES
-- Este script elimina todas las transacciones del negocio
-- dejando el sistema como nuevo.
-- 
-- PRESERVA: Usuarios, Menús, Productos, Categorías, Áreas, 
--           Mesas (estructura), Ingredientes, Configuración
-- 
-- ELIMINA: Órdenes, Pagos, Facturas, Turnos de Caja, 
--          Devoluciones, Descuentos Aplicados, Logs de Impresión,
--          Mermas, Movimientos de Stock
--
-- ADVERTENCIA: Esta acción es IRREVERSIBLE
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- Ejecutar todo en una transacción
BEGIN;

-- =====================================================
-- 1. ELIMINAR DATOS DE IMPRESIONES Y LOGS
-- =====================================================
DELETE FROM print_logs;

-- =====================================================
-- 2. ELIMINAR DEVOLUCIONES
-- =====================================================
DELETE FROM refunds;

-- =====================================================
-- 3. ELIMINAR DESCUENTOS APLICADOS
-- =====================================================
DELETE FROM applied_discounts;

-- =====================================================
-- 4. ELIMINAR FACTURAS
-- =====================================================
DELETE FROM invoices;

-- =====================================================
-- 5. ELIMINAR PAGOS
-- =====================================================
DELETE FROM payments;

-- =====================================================
-- 6. ELIMINAR ITEMS DE ÓRDENES
-- =====================================================
DELETE FROM order_items;

-- =====================================================
-- 7. ELIMINAR ÓRDENES
-- =====================================================
DELETE FROM orders;

-- =====================================================
-- 8. ELIMINAR TURNOS DE CAJA
-- =====================================================
DELETE FROM cash_registers;

-- =====================================================
-- 9. ELIMINAR MERMAS/DESPERDICIOS (si existe la tabla)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ingredient_waste') THEN
    EXECUTE 'DELETE FROM ingredient_waste';
  END IF;
END $$;

-- =====================================================
-- 10. ELIMINAR MOVIMIENTOS DE STOCK (si existe la tabla)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements') THEN
    EXECUTE 'DELETE FROM stock_movements';
  END IF;
END $$;

-- =====================================================
-- 11. RESETEAR ESTADO DE TODAS LAS MESAS A DISPONIBLE
-- =====================================================
UPDATE tables 
SET status = 'AVAILABLE', 
    updated_at = NOW();

COMMIT;

-- =====================================================
-- VERIFICACIÓN: Mostrar conteo de registros después del reset
-- =====================================================
SELECT 'orders' as tabla, COUNT(*) as registros FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'cash_registers', COUNT(*) FROM cash_registers
UNION ALL
SELECT 'refunds', COUNT(*) FROM refunds
UNION ALL
SELECT 'applied_discounts', COUNT(*) FROM applied_discounts
UNION ALL
SELECT 'print_logs', COUNT(*) FROM print_logs;

-- =====================================================
-- Verificar mesas disponibles
-- =====================================================
SELECT 'Mesas Disponibles' as descripcion, COUNT(*) as cantidad 
FROM tables WHERE status = 'AVAILABLE';

-- =====================================================
-- DATOS PRESERVADOS (NO ELIMINADOS)
-- =====================================================
-- - users: Todos los usuarios del sistema
-- - categories: Categorías de productos
-- - products: Productos del menú
-- - areas: Áreas del restaurante
-- - tables: Estructura de mesas (solo se resetea estado)
-- - ingredients: Lista de ingredientes
-- - settings: Configuración del sistema
-- =====================================================

SELECT 'RESET COMPLETADO - El sistema está como nuevo' as mensaje;
