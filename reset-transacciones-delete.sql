-- =====================================================
-- SCRIPT PARA RESETEAR DATOS TRANSACCIONALES (Versión DELETE)
-- Compatible con Supabase - Usa DELETE en lugar de TRUNCATE
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

-- Ejecutar todas las eliminaciones verificando si existen las tablas
DO $$
BEGIN
  -- 1. ELIMINAR DATOS DE IMPRESIONES Y LOGS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_logs' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM print_logs';
  END IF;

  -- 2. ELIMINAR DEVOLUCIONES
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM refunds';
  END IF;

  -- 3. ELIMINAR DESCUENTOS APLICADOS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applied_discounts' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM applied_discounts';
  END IF;

  -- 4. ELIMINAR FACTURAS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM invoices';
  END IF;

  -- 5. ELIMINAR PAGOS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM payments';
  END IF;

  -- 6. ELIMINAR ITEMS DE ÓRDENES
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM order_items';
  END IF;

  -- 7. ELIMINAR ÓRDENES
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM orders';
  END IF;

  -- 8. ELIMINAR TURNOS DE CAJA
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_registers' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM cash_registers';
  END IF;

  -- 9. ELIMINAR MERMAS/DESPERDICIOS
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ingredient_waste' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM ingredient_waste';
  END IF;

  -- 10. ELIMINAR MOVIMIENTOS DE STOCK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stock_movements' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM stock_movements';
  END IF;

  -- 11. ELIMINAR COLA DE IMPRESIÓN PENDIENTE
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'print_queue' AND table_schema = 'public') THEN
    EXECUTE 'DELETE FROM print_queue';
  END IF;

  -- 12. RESETEAR MESAS A DISPONIBLE
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tables' AND table_schema = 'public') THEN
    EXECUTE 'UPDATE tables SET status = ''FREE''';
  END IF;

END $$;

-- =====================================================
-- VERIFICACIÓN: Mostrar conteo de registros después del reset
-- =====================================================
DO $$
DECLARE
  v_count INT;
  v_result TEXT := '';
BEGIN
  -- Orders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM orders;
    v_result := v_result || 'orders: ' || v_count || ' | ';
  END IF;
  
  -- Order Items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_items' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM order_items;
    v_result := v_result || 'order_items: ' || v_count || ' | ';
  END IF;
  
  -- Payments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM payments;
    v_result := v_result || 'payments: ' || v_count || ' | ';
  END IF;
  
  -- Invoices
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM invoices;
    v_result := v_result || 'invoices: ' || v_count || ' | ';
  END IF;
  
  -- Cash Registers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cash_registers' AND table_schema = 'public') THEN
    SELECT COUNT(*) INTO v_count FROM cash_registers;
    v_result := v_result || 'cash_registers: ' || v_count || ' | ';
  END IF;

  RAISE NOTICE 'Registros restantes: %', v_result;
END $$;

-- =====================================================
-- Mensaje final
-- =====================================================
SELECT 'RESET COMPLETADO - El sistema está como nuevo' as resultado, NOW() as fecha_reset;
