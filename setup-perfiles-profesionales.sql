-- =====================================================
-- PERFILES PROFESIONALES - Restaurante El Dragón del Tarra
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar TODOS los usuarios existentes
-- (primero limpiar TODAS las referencias en otras tablas)
UPDATE orders SET waiter_id = NULL WHERE waiter_id IS NOT NULL;
UPDATE cash_registers SET user_id = NULL WHERE user_id IS NOT NULL;
UPDATE refunds SET created_by = NULL WHERE created_by IS NOT NULL;
UPDATE refunds SET approved_by = NULL WHERE approved_by IS NOT NULL;
UPDATE print_logs SET printed_by = NULL WHERE printed_by IS NOT NULL;

DELETE FROM users;

-- 2. Crear perfiles profesionales
-- Todas las contraseñas son texto plano (el sistema las migrará a bcrypt al primer login)

-- ADMIN - Jhon
INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Jhon Administrador',
  'jhon.dragon.admin@gmail.com',
  'dragon2026',
  'ADMIN',
  true,
  NOW(),
  NOW()
);

-- CAJERO - Laura Martínez
INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Laura Martínez',
  'laura.dragon.cajera@gmail.com',
  'cajera2026',
  'CASHIER',
  true,
  NOW(),
  NOW()
);

-- MESERO - Santiago Ríos
INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Santiago Ríos',
  'santiago.dragon.mesero@gmail.com',
  'mesero2026',
  'WAITER',
  true,
  NOW(),
  NOW()
);

-- COCINA - Camila Torres
INSERT INTO users (id, name, email, password, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Camila Torres',
  'camila.dragon.cocina@gmail.com',
  'cocina2026',
  'KITCHEN',
  true,
  NOW(),
  NOW()
);

-- 3. Verificar usuarios creados
SELECT name, email, role, is_active FROM users ORDER BY role;

-- =====================================================
-- CREDENCIALES DE ACCESO:
-- =====================================================
-- ADMIN:   jhon.dragon.admin@gmail.com   / dragon2026
-- CAJERO:  laura.dragon.cajera@gmail.com / cajera2026
-- MESERO:  santiago.dragon.mesero@gmail.com / mesero2026
-- COCINA:  camila.dragon.cocina@gmail.com / cocina2026
-- =====================================================
