-- =============================================================================
-- SQL QUERIES PARA REPORTES DE DOMICILIO Y PARA LLEVAR
-- Sistema de Comandas - Restaurante
-- Nota: Prisma convierte camelCase a snake_case en PostgreSQL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. VISTA: Resumen de pedidos para llevar y domicilio del día
-- -----------------------------------------------------------------------------
SELECT 
    o.id,
    o.order_number AS numero_orden,
    CASE 
        WHEN o.order_type = 'TAKEOUT' THEN 'Para Llevar'
        WHEN o.order_type = 'DELIVERY' THEN 'Domicilio'
        ELSE o.order_type::text
    END AS tipo_pedido,
    o.status AS estado,
    o.subtotal,
    o.tax AS impuesto,
    o.discount AS descuento,
    o.total,
    o.created_at AS fecha_creacion,
    u.name AS mesero_cajero,
    COALESCE(
        (SELECT string_agg(p.name || ' x' || oi.quantity, ', ')
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = o.id),
        'Sin productos'
    ) AS productos
FROM orders o
LEFT JOIN users u ON u.id = o.waiter_id
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND DATE(o.created_at) = CURRENT_DATE
ORDER BY o.created_at DESC;

-- -----------------------------------------------------------------------------
-- 2. RESUMEN DIARIO: Total de ventas por tipo (Domicilio/Para Llevar)
-- -----------------------------------------------------------------------------
SELECT 
    DATE(o.created_at) AS fecha,
    CASE 
        WHEN o.order_type = 'TAKEOUT' THEN 'Para Llevar'
        WHEN o.order_type = 'DELIVERY' THEN 'Domicilio'
    END AS tipo,
    COUNT(*) AS cantidad_pedidos,
    SUM(o.subtotal) AS subtotal_total,
    SUM(o.tax) AS impuestos_total,
    SUM(o.discount) AS descuentos_total,
    SUM(o.total) AS ventas_total
FROM orders o
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND o.status = 'PAID'
    AND DATE(o.created_at) = CURRENT_DATE
GROUP BY DATE(o.created_at), o.order_type
ORDER BY tipo;

-- -----------------------------------------------------------------------------
-- 3. REPORTE SEMANAL: Ventas de domicilio y para llevar por día
-- -----------------------------------------------------------------------------
SELECT 
    DATE(o.created_at) AS fecha,
    TO_CHAR(o.created_at, 'Day') AS dia_semana,
    COUNT(CASE WHEN o.order_type = 'TAKEOUT' THEN 1 END) AS pedidos_para_llevar,
    COUNT(CASE WHEN o.order_type = 'DELIVERY' THEN 1 END) AS pedidos_domicilio,
    SUM(CASE WHEN o.order_type = 'TAKEOUT' THEN o.total ELSE 0 END) AS ventas_para_llevar,
    SUM(CASE WHEN o.order_type = 'DELIVERY' THEN o.total ELSE 0 END) AS ventas_domicilio,
    SUM(o.total) AS ventas_totales
FROM orders o
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND o.status = 'PAID'
    AND o.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(o.created_at), TO_CHAR(o.created_at, 'Day')
ORDER BY fecha DESC;

-- -----------------------------------------------------------------------------
-- 4. PRODUCTOS MÁS VENDIDOS EN DOMICILIO/PARA LLEVAR
-- -----------------------------------------------------------------------------
SELECT 
    p.name AS producto,
    c.name AS categoria,
    SUM(oi.quantity) AS cantidad_vendida,
    SUM(oi.subtotal) AS ventas_total,
    COUNT(DISTINCT o.id) AS pedidos_con_producto
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN products p ON p.id = oi.product_id
LEFT JOIN categories c ON c.id = p.category_id
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND o.status = 'PAID'
    AND DATE(o.created_at) = CURRENT_DATE
GROUP BY p.id, p.name, c.name
ORDER BY cantidad_vendida DESC
LIMIT 20;

-- -----------------------------------------------------------------------------
-- 5. PEDIDOS PENDIENTES DE COBRO (Para mostrar en caja)
-- -----------------------------------------------------------------------------
SELECT 
    o.id,
    o.order_number AS numero_orden,
    CASE 
        WHEN o.order_type = 'TAKEOUT' THEN 'Para Llevar'
        WHEN o.order_type = 'DELIVERY' THEN 'Domicilio'
    END AS tipo_pedido,
    o.total,
    o.created_at AS fecha_creacion,
    u.name AS tomado_por,
    EXTRACT(EPOCH FROM (NOW() - o.created_at))/60 AS minutos_esperando
FROM orders o
LEFT JOIN users u ON u.id = o.waiter_id
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND o.status NOT IN ('PAID', 'CANCELLED')
    AND o.table_id IS NULL
ORDER BY o.created_at ASC;

-- -----------------------------------------------------------------------------
-- 6. REPORTE MENSUAL: Comparativa de ventas por tipo de pedido
-- -----------------------------------------------------------------------------
SELECT 
    TO_CHAR(o.created_at, 'YYYY-MM') AS mes,
    COUNT(CASE WHEN o.order_type = 'DINE_IN' THEN 1 END) AS pedidos_restaurante,
    COUNT(CASE WHEN o.order_type = 'TAKEOUT' THEN 1 END) AS pedidos_para_llevar,
    COUNT(CASE WHEN o.order_type = 'DELIVERY' THEN 1 END) AS pedidos_domicilio,
    SUM(CASE WHEN o.order_type = 'DINE_IN' THEN o.total ELSE 0 END) AS ventas_restaurante,
    SUM(CASE WHEN o.order_type = 'TAKEOUT' THEN o.total ELSE 0 END) AS ventas_para_llevar,
    SUM(CASE WHEN o.order_type = 'DELIVERY' THEN o.total ELSE 0 END) AS ventas_domicilio,
    SUM(o.total) AS ventas_totales
FROM orders o
WHERE o.status = 'PAID'
    AND o.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY TO_CHAR(o.created_at, 'YYYY-MM')
ORDER BY mes DESC;

-- -----------------------------------------------------------------------------
-- 7. MÉTRICAS POR HORA: Horarios con más pedidos de domicilio/para llevar
-- -----------------------------------------------------------------------------
SELECT 
    EXTRACT(HOUR FROM o.created_at) AS hora,
    COUNT(*) AS total_pedidos,
    COUNT(CASE WHEN o.order_type = 'TAKEOUT' THEN 1 END) AS para_llevar,
    COUNT(CASE WHEN o.order_type = 'DELIVERY' THEN 1 END) AS domicilio,
    ROUND(AVG(o.total), 2) AS ticket_promedio
FROM orders o
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND o.status = 'PAID'
    AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY EXTRACT(HOUR FROM o.created_at)
ORDER BY hora;

-- -----------------------------------------------------------------------------
-- 8. RESUMEN DE MÉTODOS DE PAGO PARA DOMICILIO/PARA LLEVAR
-- -----------------------------------------------------------------------------
SELECT 
    CASE 
        WHEN pay.method = 'CASH' THEN 'Efectivo'
        WHEN pay.method = 'CARD' THEN 'Tarjeta'
        WHEN pay.method = 'TRANSFER' THEN 'Transferencia'
        ELSE pay.method::text
    END AS metodo_pago,
    COUNT(*) AS cantidad_transacciones,
    SUM(pay.amount) AS monto_total
FROM payments pay
JOIN orders o ON o.id = pay.order_id
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND DATE(pay.created_at) = CURRENT_DATE
GROUP BY pay.method
ORDER BY monto_total DESC;

-- -----------------------------------------------------------------------------
-- 9. EMPLEADOS CON MÁS PEDIDOS DOMICILIO/PARA LLEVAR DEL DÍA
-- -----------------------------------------------------------------------------
SELECT 
    u.name AS empleado,
    u.role AS rol,
    COUNT(*) AS total_pedidos,
    SUM(o.total) AS ventas_generadas,
    ROUND(AVG(o.total), 2) AS ticket_promedio
FROM orders o
JOIN users u ON u.id = o.waiter_id
WHERE o.order_type IN ('TAKEOUT', 'DELIVERY')
    AND o.status = 'PAID'
    AND DATE(o.created_at) = CURRENT_DATE
GROUP BY u.id, u.name, u.role
ORDER BY total_pedidos DESC;

-- -----------------------------------------------------------------------------
-- 10. VISTA RÁPIDA PARA DASHBOARD DE CAJA
-- Esta consulta se puede usar para mostrar estadísticas en tiempo real
-- -----------------------------------------------------------------------------
SELECT 
    -- Pedidos pendientes
    (SELECT COUNT(*) FROM orders 
     WHERE order_type IN ('TAKEOUT', 'DELIVERY') 
     AND status NOT IN ('PAID', 'CANCELLED')
     AND DATE(created_at) = CURRENT_DATE) AS pedidos_pendientes,
    
    -- Total por cobrar
    (SELECT COALESCE(SUM(total), 0) FROM orders 
     WHERE order_type IN ('TAKEOUT', 'DELIVERY') 
     AND status NOT IN ('PAID', 'CANCELLED')
     AND DATE(created_at) = CURRENT_DATE) AS total_por_cobrar,
    
    -- Pedidos cobrados hoy
    (SELECT COUNT(*) FROM orders 
     WHERE order_type IN ('TAKEOUT', 'DELIVERY') 
     AND status = 'PAID'
     AND DATE(created_at) = CURRENT_DATE) AS pedidos_cobrados,
    
    -- Total vendido hoy domicilio/para llevar
    (SELECT COALESCE(SUM(total), 0) FROM orders 
     WHERE order_type IN ('TAKEOUT', 'DELIVERY') 
     AND status = 'PAID'
     AND DATE(created_at) = CURRENT_DATE) AS total_vendido;

-- =============================================================================
-- NOTA: Prisma convierte camelCase a snake_case en PostgreSQL
-- Columnas: order_number, order_type, waiter_id, table_id, created_at, etc.
-- Valores del enum OrderType: DINE_IN, TAKEOUT, DELIVERY
-- =============================================================================
