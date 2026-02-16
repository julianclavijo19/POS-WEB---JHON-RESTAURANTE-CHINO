-- ============================================================
-- SCRIPT AVANZADO DE GENERACIÓN DE HISTORIAL (SEEDING COMPLETO)
-- Ejecutar en Supabase SQL Editor
-- Genera: +10 Empleados, Turnos de Caja diarios, +5000 Órdenes (6 meses)
-- ============================================================

DO $$
DECLARE
  -- Variables de Configuración
  v_num_days INT := 180; -- 6 meses
  v_start_date DATE := CURRENT_DATE - (v_num_days || ' days')::INTERVAL;
  v_current_date DATE;
  v_day_of_week INT; -- 0=Dom, 6=Sab
  
  -- IDs de Usuarios
  v_admin_id UUID;
  v_waiter_ids UUID[];
  v_cashier_ids UUID[];
  v_kitchen_ids UUID[];
  v_current_cashier_id UUID;
  v_current_waiter_id UUID;
  
  -- IDs de Estructura
  v_area_main_id UUID;
  v_area_terrace_id UUID;
  v_table_id UUID;
  v_cash_register_id UUID;
  
  -- Variables de Orden
  v_order_id UUID;
  v_payment_id UUID;
  v_invoice_id UUID;
  v_order_number TEXT;
  v_status ORDER_STATUS;
  v_type ORDER_TYPE;
  v_total DECIMAL(10,2);
  v_subtotal DECIMAL(10,2);
  v_tax DECIMAL(10,2);
  v_tip DECIMAL(10,2);
  v_discount DECIMAL(10,2);
  
  -- Contadores y Aleatorios
  v_daily_orders INT;
  v_hour_offset INT; -- Hora del día (11-22)
  v_items_count INT;
  v_product_record RECORD;
  i INT;
  j INT;
  k INT;
  v_counter INT := 0;
  
BEGIN
  RAISE NOTICE 'Iniciando generación MASIVA de datos históricos...';

  -- ==================================================================================
  -- 1. GENERACIÓN DE PERSONAL (USUARIOS)
  -- ==================================================================================
  
  -- Admin General
  INSERT INTO users (name, email, password, role) 
  VALUES ('Jhon Gerente', 'admin@restaurante.com', '$2b$10$EpIx.c.q/q.q.q.q.q.q.q.q.q.q.q.q', 'ADMIN')
  ON CONFLICT (email) DO UPDATE SET role = 'ADMIN'
  RETURNING id INTO v_admin_id;

  -- Cajeros (3 turnos rotativos)
  v_cashier_ids := ARRAY[]::UUID[];
  FOR i IN 1..3 LOOP
    INSERT INTO users (name, email, password, role) 
    VALUES ('Cajero ' || i, 'cajero' || i || '@restaurante.com', '$2b$10$EpIx.c.q/q.q.q.q.q.q.q.q.q.q.q.q', 'CASHIER')
    ON CONFLICT (email) DO UPDATE SET role = 'CASHIER'
    RETURNING id INTO v_current_cashier_id;
    v_cashier_ids := array_append(v_cashier_ids, v_current_cashier_id);
  END LOOP;

  -- Meseros (5 para cubrir salón y terraza)
  v_waiter_ids := ARRAY[]::UUID[];
  FOR i IN 1..5 LOOP
    INSERT INTO users (name, email, password, role) 
    VALUES ('Mesero ' || i, 'mesero' || i || '@restaurante.com', '$2b$10$EpIx.c.q/q.q.q.q.q.q.q.q.q.q.q.q', 'WAITER')
    ON CONFLICT (email) DO UPDATE SET role = 'WAITER'
    RETURNING id INTO v_current_waiter_id;
    v_waiter_ids := array_append(v_waiter_ids, v_current_waiter_id);
  END LOOP;
  
  -- Cocina (3 chefs)
  v_kitchen_ids := ARRAY[]::UUID[];
  FOR i IN 1..3 LOOP
    INSERT INTO users (name, email, password, role) 
    VALUES ('Chef ' || i, 'chef' || i || '@restaurante.com', '$2b$10$EpIx.c.q/q.q.q.q.q.q.q.q.q.q.q.q', 'KITCHEN')
    ON CONFLICT (email) DO UPDATE SET role = 'KITCHEN'
    RETURNING id INTO v_current_cashier_id; -- Reusing variable temporarily
    v_kitchen_ids := array_append(v_kitchen_ids, v_current_cashier_id);
  END LOOP;

  -- ==================================================================================
  -- 2. INFRAESTRUCTURA (ÁREAS Y MESAS)
  -- ==================================================================================
  
  -- Salón Principal (10 mesas)
  INSERT INTO areas (name, description) VALUES ('Salón Principal', 'Zona interior con A/C') 
  ON CONFLICT DO NOTHING RETURNING id INTO v_area_main_id;
  IF v_area_main_id IS NULL THEN SELECT id INTO v_area_main_id FROM areas WHERE name = 'Salón Principal'; END IF;

  FOR k IN 1..10 LOOP
    INSERT INTO tables (number, name, capacity, "areaId", status)
    VALUES (k, 'Mesa ' || k, 4, v_area_main_id, 'AVAILABLE')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Terraza (5 mesas grandes)
  INSERT INTO areas (name, description) VALUES ('Terraza', 'Zona al aire libre') 
  ON CONFLICT DO NOTHING RETURNING id INTO v_area_terrace_id;
  IF v_area_terrace_id IS NULL THEN SELECT id INTO v_area_terrace_id FROM areas WHERE name = 'Terraza'; END IF;

  FOR k IN 11..15 LOOP
    INSERT INTO tables (number, name, capacity, "areaId", status)
    VALUES (k, 'Terraza ' || (k-10), 6, v_area_terrace_id, 'AVAILABLE')
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- ==================================================================================
  -- 3. SIMULACIÓN DÍA A DÍA
  -- ==================================================================================
  
  FOR i IN 0..v_num_days LOOP
    v_current_date := v_start_date + (i || ' days')::INTERVAL;
    v_day_of_week := EXTRACT(DOW FROM v_current_date); -- 0=Domingo
    
    -- Seleccionar Cajero del día (rotativo)
    v_current_cashier_id := v_cashier_ids[(i % 3) + 1];
    
    -- APERTURA DE CAJA (09:00 AM)
    INSERT INTO cash_registers (
      "userId", "openingAmount", status, "openedAt", "totalOrders", "totalSales"
    ) VALUES (
      v_current_cashier_id, 
      200000.00, -- Base de 200k
      'OPEN', 
      v_current_date + TIME '09:00:00',
      0, 0
    ) RETURNING id INTO v_cash_register_id;
    
    -- Definir volumen de ventas según día (Viernes/Sabado/Domingo más ventas)
    IF v_day_of_week IN (5, 6, 0) THEN
      v_daily_orders := floor(random() * 30 + 40)::INT; -- 40-70 órdenes fin de semana
    ELSE
      v_daily_orders := floor(random() * 20 + 20)::INT; -- 20-40 órdenes entre semana
    END IF;

    -- Generar Órdenes del día
    FOR j IN 1..v_daily_orders LOOP
      v_counter := v_counter + 1;
      
      -- Hora aleatoria ponderada (más probabilidad almuerzo 12-14 y cena 19-21)
      IF random() < 0.4 THEN
        v_hour_offset := floor(random() * 2 + 12)::INT; -- Almuerzo
      ELSIF random() < 0.4 THEN
        v_hour_offset := floor(random() * 3 + 19)::INT; -- Cena
      ELSE
        v_hour_offset := floor(random() * 10 + 11)::INT; -- Resto del día
      END IF;
      
      -- Seleccionar mesero y mesa aleatoria
      v_current_waiter_id := v_waiter_ids[floor(random() * 5 + 1)::INT];
      SELECT id INTO v_table_id FROM tables ORDER BY random() LIMIT 1;
      
      -- Determinar tipo de orden (80% Mesa, 15% Domicilio, 5% Llevar)
      IF random() < 0.80 THEN v_type := 'DINE_IN';
      ELSIF random() < 0.75 THEN v_type := 'DELIVERY'; v_table_id := NULL; -- Domicilio no tiene mesa
      ELSE v_type := 'TAKEOUT'; v_table_id := NULL; -- Para llevar no tiene mesa
      END IF;

      -- Crear Orden
      v_order_number := 'ORD-' || to_char(v_current_date, 'YYMMDD') || '-' || lpad(j::text, 4, '0');
      
      -- Probabilidad de estado (95% Pagada, 3% Cancelada, 2% En cocina si es hoy)
      IF v_current_date = CURRENT_DATE AND random() > 0.9 THEN
        v_status := 'IN_KITCHEN';
      ELSIF random() < 0.97 THEN
        v_status := 'PAID';
      ELSE
        v_status := 'CANCELLED';
      END IF;

      INSERT INTO orders (
        "orderNumber", status, "tableId", "waiterId", "orderType", 
        subtotal, tax, total, "createdAt", "updatedAt"
      ) VALUES (
        v_order_number, v_status, v_table_id, v_current_waiter_id, v_type,
        0, 0, 0, -- Se calcula abajo
        v_current_date + (v_hour_offset || ' hours')::INTERVAL + (random() * 59 || ' minutes')::INTERVAL,
        v_current_date + (v_hour_offset || ' hours')::INTERVAL + (random() * 59 || ' minutes')::INTERVAL
      ) RETURNING id INTO v_order_id;

      -- Generar Items (1-6 platos)
      v_items_count := floor(random() * 6 + 1)::INT;
      v_subtotal := 0;
      
      FOR k IN 1..v_items_count LOOP
        SELECT * INTO v_product_record FROM products ORDER BY random() LIMIT 1;
        
        -- Insertar Item
        INSERT INTO "order_items" (
          "orderId", "productId", quantity, "unitPrice", subtotal, status, "createdAt", "updatedAt"
        ) VALUES (
          v_order_id, v_product_record.id, 1, v_product_record.price, v_product_record.price, 
          'DELIVERED', -- Asumimos entregado para históricos
          v_current_date + (v_hour_offset || ' hours')::INTERVAL,
          v_current_date + (v_hour_offset || ' hours')::INTERVAL
        );
        v_subtotal := v_subtotal + v_product_record.price;
      END LOOP;

      -- Calcular Impuestos y Total
      v_tax := v_subtotal * 0.08; -- 8% impoconsumo
      v_tip := 0;
      v_discount := 0;
      
      -- Agregar Propina (60% probabilidad)
      IF random() < 0.6 THEN v_tip := v_subtotal * 0.10; END IF;
      
      -- Descuento ocasional (5%)
      IF random() < 0.05 THEN v_discount := v_subtotal * 0.10; END IF;
      
      v_total := v_subtotal + v_tax + v_tip - v_discount;

      -- Actualizar Orden
      UPDATE orders 
      SET subtotal = v_subtotal, tax = v_tax, tip = v_tip, discount = v_discount, total = v_total
      WHERE id = v_order_id;

      -- REGISTRAR PAGO (Si está pagada)
      IF v_status = 'PAID' THEN
        -- 60% Efectivo, 40% Tarjeta/Transferencia
        IF random() < 0.6 THEN 
            INSERT INTO payments ("orderId", amount, method, "createdAt")
            VALUES (v_order_id, v_total, 'CASH', v_current_date + (v_hour_offset + 1 || ' hours')::INTERVAL);
            
            -- Actualizar Caja (Ventas en efectivo)
            UPDATE cash_registers SET "cashSales" = "cashSales" + v_total, "totalSales" = "totalSales" + v_total, "totalOrders" = "totalOrders" + 1
            WHERE id = v_cash_register_id;
        ELSE 
            INSERT INTO payments ("orderId", amount, method, "createdAt")
            VALUES (v_order_id, v_total, 'CARD', v_current_date + (v_hour_offset + 1 || ' hours')::INTERVAL);
            
            -- Actualizar Caja (Ventas tarjeta)
            UPDATE cash_registers SET "cardSales" = "cardSales" + v_total, "totalSales" = "totalSales" + v_total, "totalOrders" = "totalOrders" + 1
            WHERE id = v_cash_register_id;
        END IF;

        -- Generar Factura (Invoice)
        INSERT INTO invoices (
          invoice_number, order_id, table_id, subtotal, discount, tax, total, tip, payment_method, created_at, created_by
        ) VALUES (
          'FAC-' || to_char(v_current_date, 'YYMMDD') || '-' || j,
          v_order_id, v_table_id, v_subtotal, v_discount, v_tax, v_total, v_tip, 
          'COMBINED', -- Simplificado
          v_current_date + (v_hour_offset + 1 || ' hours')::INTERVAL,
          v_current_cashier_id
        );
      END IF;
      
    END LOOP; -- Fin Órdenes del día

    -- CIERRE DE CAJA (23:00 PM)
    -- Calcular cierre (con pequeña diferencia aleatoria de +/- 5000)
    DECLARE
        v_final_sales decimal;
        v_diff decimal;
    BEGIN
        SELECT "totalSales" INTO v_final_sales FROM cash_registers WHERE id = v_cash_register_id;
        v_diff := (random() * 10000 - 5000)::decimal(10,2); -- Diferencia aleatoria
        
        UPDATE cash_registers 
        SET status = 'CLOSED', 
            "closedAt" = v_current_date + TIME '23:00:00',
            "closingAmount" = "openingAmount" + "cashSales" + v_diff, -- Solo efectivo cuenta pal cierre físico
            "expectedAmount" = "openingAmount" + "cashSales",
            "difference" = v_diff
        WHERE id = v_cash_register_id;
    END;
    
  END LOOP; -- Fin Días

  RAISE NOTICE 'Proceso completado. Total órdenes generadas: %', v_counter;
END $$;
