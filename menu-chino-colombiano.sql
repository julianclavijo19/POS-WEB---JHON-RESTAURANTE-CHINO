-- =====================================================
-- CONFIGURACIÓN INICIAL - RESTAURANTE CHINO COLOMBIANO
-- "El Dragón del Tarra"
-- =====================================================
-- IMPORTANTE: Primero borra los datos existentes antes de ejecutar

-- Limpiar datos existentes (descomenta si necesitas borrar todo)
DELETE FROM products;
DELETE FROM categories;

-- ==================== INSERTAR CATEGORÍAS ====================
-- Solo columnas básicas que existen en tu tabla

INSERT INTO categories (id, name, description, color) VALUES
  (gen_random_uuid(), 'Entradas', 'Aperitivos y entradas para comenzar', '#3b82f6'),
  (gen_random_uuid(), 'Sopas', 'Sopas tradicionales chinas y criollas', '#10b981'),
  (gen_random_uuid(), 'Arroces', 'Variedades de arroz frito y especial', '#f59e0b'),
  (gen_random_uuid(), 'Chow Mein', 'Tallarines salteados al wok', '#ef4444'),
  (gen_random_uuid(), 'Chop Suey', 'Vegetales salteados con proteina', '#8b5cf6'),
  (gen_random_uuid(), 'Especialidades de la Casa', 'Platos exclusivos del chef', '#ec4899'),
  (gen_random_uuid(), 'Carnes', 'Platos con res y cerdo', '#dc2626'),
  (gen_random_uuid(), 'Pollo', 'Preparaciones con pollo', '#f97316'),
  (gen_random_uuid(), 'Mariscos', 'Camarones, pescado y frutos del mar', '#0ea5e9'),
  (gen_random_uuid(), 'Colombianos', 'Platos tipicos colombianos', '#84cc16'),
  (gen_random_uuid(), 'Bebidas', 'Refrescos, jugos y bebidas calientes', '#06b6d4'),
  (gen_random_uuid(), 'Postres', 'Dulces y postres para finalizar', '#d946ef');

-- ==================== INSERTAR PRODUCTOS ====================

DO $$
DECLARE
  v_entradas UUID;
  v_sopas UUID;
  v_arroces UUID;
  v_chowmein UUID;
  v_chopsuey UUID;
  v_especialidades UUID;
  v_carnes UUID;
  v_pollo UUID;
  v_mariscos UUID;
  v_colombianos UUID;
  v_bebidas UUID;
  v_postres UUID;
BEGIN
  SELECT id INTO v_entradas FROM categories WHERE name = 'Entradas' LIMIT 1;
  SELECT id INTO v_sopas FROM categories WHERE name = 'Sopas' LIMIT 1;
  SELECT id INTO v_arroces FROM categories WHERE name = 'Arroces' LIMIT 1;
  SELECT id INTO v_chowmein FROM categories WHERE name = 'Chow Mein' LIMIT 1;
  SELECT id INTO v_chopsuey FROM categories WHERE name = 'Chop Suey' LIMIT 1;
  SELECT id INTO v_especialidades FROM categories WHERE name = 'Especialidades de la Casa' LIMIT 1;
  SELECT id INTO v_carnes FROM categories WHERE name = 'Carnes' LIMIT 1;
  SELECT id INTO v_pollo FROM categories WHERE name = 'Pollo' LIMIT 1;
  SELECT id INTO v_mariscos FROM categories WHERE name = 'Mariscos' LIMIT 1;
  SELECT id INTO v_colombianos FROM categories WHERE name = 'Colombianos' LIMIT 1;
  SELECT id INTO v_bebidas FROM categories WHERE name = 'Bebidas' LIMIT 1;
  SELECT id INTO v_postres FROM categories WHERE name = 'Postres' LIMIT 1;

  -- ==================== ENTRADAS ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Rollitos Primavera (4 und)', 'Crujientes rollitos rellenos de vegetales', 12000, v_entradas, 8, true),
    (gen_random_uuid(), 'Wonton Frito (6 und)', 'Masa crujiente rellena de cerdo y camaron', 14000, v_entradas, 10, true),
    (gen_random_uuid(), 'Empanadas Chinas (4 und)', 'Gyozas al vapor o fritas', 13000, v_entradas, 12, true),
    (gen_random_uuid(), 'Costillitas BBQ', 'Costillas de cerdo en salsa barbecue china', 22000, v_entradas, 15, true),
    (gen_random_uuid(), 'Camarones Apanados (8 und)', 'Camarones empanizados con salsa agridulce', 24000, v_entradas, 12, true),
    (gen_random_uuid(), 'Picada China para 2', 'Surtido de entradas: rollitos, wontons, costillitas', 38000, v_entradas, 15, true);

  -- ==================== SOPAS ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Sopa Wonton', 'Caldo con wontons de cerdo y verduras', 15000, v_sopas, 10, true),
    (gen_random_uuid(), 'Sopa de Maiz con Pollo', 'Cremosa sopa de maiz estilo cantones', 14000, v_sopas, 10, true),
    (gen_random_uuid(), 'Sopa Agripicante', 'Tradicional sopa hot and sour', 16000, v_sopas, 12, true),
    (gen_random_uuid(), 'Sopa de Mariscos', 'Sopa especial con camarones y pescado', 22000, v_sopas, 15, true),
    (gen_random_uuid(), 'Consome de Pollo', 'Caldo tradicional colombiano', 10000, v_sopas, 8, true),
    (gen_random_uuid(), 'Sancocho de Gallina', 'Tradicional sancocho colombiano', 25000, v_sopas, 20, true);

  -- ==================== ARROCES ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Arroz Frito con Pollo', 'Arroz salteado con pollo y vegetales', 18000, v_arroces, 12, true),
    (gen_random_uuid(), 'Arroz Frito con Cerdo', 'Arroz salteado con cerdo asado', 18000, v_arroces, 12, true),
    (gen_random_uuid(), 'Arroz Frito con Camaron', 'Arroz salteado con camarones frescos', 24000, v_arroces, 12, true),
    (gen_random_uuid(), 'Arroz Frito Especial', 'Arroz con pollo, cerdo, camaron y vegetales', 26000, v_arroces, 15, true),
    (gen_random_uuid(), 'Arroz Frito Tres Delicias', 'Arroz con jamon, pollo y huevo', 20000, v_arroces, 12, true),
    (gen_random_uuid(), 'Arroz con Pina y Mariscos', 'Servido en pina natural con camarones', 32000, v_arroces, 18, true),
    (gen_random_uuid(), 'Arroz Blanco', 'Porcion de arroz blanco', 5000, v_arroces, 5, true),
    (gen_random_uuid(), 'Arroz con Coco', 'Arroz tradicional costeno', 7000, v_arroces, 8, true);

  -- ==================== CHOW MEIN ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Chow Mein de Pollo', 'Tallarines salteados con pollo', 19000, v_chowmein, 12, true),
    (gen_random_uuid(), 'Chow Mein de Cerdo', 'Tallarines salteados con cerdo', 19000, v_chowmein, 12, true),
    (gen_random_uuid(), 'Chow Mein de Camaron', 'Tallarines salteados con camarones', 25000, v_chowmein, 12, true),
    (gen_random_uuid(), 'Chow Mein Especial', 'Tallarines con pollo, cerdo y camaron', 27000, v_chowmein, 15, true),
    (gen_random_uuid(), 'Chow Mein Vegetariano', 'Tallarines con tofu y vegetales', 17000, v_chowmein, 12, true),
    (gen_random_uuid(), 'Lo Mein de Res', 'Tallarines suaves con carne de res', 22000, v_chowmein, 15, true);

  -- ==================== CHOP SUEY ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Chop Suey de Pollo', 'Vegetales salteados con pollo', 18000, v_chopsuey, 12, true),
    (gen_random_uuid(), 'Chop Suey de Cerdo', 'Vegetales salteados con cerdo', 18000, v_chopsuey, 12, true),
    (gen_random_uuid(), 'Chop Suey de Camaron', 'Vegetales salteados con camarones', 24000, v_chopsuey, 12, true),
    (gen_random_uuid(), 'Chop Suey Especial', 'Vegetales con pollo, cerdo y camaron', 26000, v_chopsuey, 15, true),
    (gen_random_uuid(), 'Chop Suey Vegetariano', 'Solo vegetales frescos', 15000, v_chopsuey, 10, true);

  -- ==================== ESPECIALIDADES DE LA CASA ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Pollo General Tso', 'Pollo crujiente en salsa dulce picante', 26000, v_especialidades, 15, true),
    (gen_random_uuid(), 'Pollo Kung Pao', 'Pollo con mani en salsa especiada', 25000, v_especialidades, 15, true),
    (gen_random_uuid(), 'Res con Brocoli', 'Carne de res salteada con brocoli fresco', 28000, v_especialidades, 15, true),
    (gen_random_uuid(), 'Camarones con Salsa de Ajo', 'Camarones en deliciosa salsa de ajo', 32000, v_especialidades, 12, true),
    (gen_random_uuid(), 'Pato Pekin (media porcion)', 'Tradicional pato laqueado', 55000, v_especialidades, 25, true),
    (gen_random_uuid(), 'Cerdo Agridulce', 'Cerdo en salsa agridulce con pina', 24000, v_especialidades, 15, true),
    (gen_random_uuid(), 'Pollo con Almendras', 'Pollo salteado con almendras tostadas', 26000, v_especialidades, 15, true),
    (gen_random_uuid(), 'Combinado Dragon Dorado', 'Para 2: arroz, chow mein, res y pollo', 52000, v_especialidades, 20, true),
    (gen_random_uuid(), 'Bandeja Familiar (4 pers)', 'Arroz, chow mein, pollo, cerdo, camaron', 95000, v_especialidades, 25, true);

  -- ==================== CARNES ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Res con Pimenton', 'Carne de res con pimentones de colores', 26000, v_carnes, 15, true),
    (gen_random_uuid(), 'Res Mongoliana', 'Carne de res en salsa mongoliana', 28000, v_carnes, 15, true),
    (gen_random_uuid(), 'Res con Champinones', 'Res salteada con champinones frescos', 27000, v_carnes, 15, true),
    (gen_random_uuid(), 'Cerdo con Vegetales', 'Cerdo salteado con vegetales mixtos', 22000, v_carnes, 12, true),
    (gen_random_uuid(), 'Cerdo Szechuan', 'Cerdo en salsa picante estilo Szechuan', 24000, v_carnes, 15, true),
    (gen_random_uuid(), 'Costilla de Cerdo Frita', 'Costillas crujientes con salsa especial', 28000, v_carnes, 18, true);

  -- ==================== POLLO ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Pollo Agridulce', 'Pollo crujiente en salsa agridulce', 22000, v_pollo, 15, true),
    (gen_random_uuid(), 'Pollo con Pina', 'Pollo salteado con pina natural', 23000, v_pollo, 12, true),
    (gen_random_uuid(), 'Pollo con Vegetales', 'Pollo con vegetales frescos salteados', 20000, v_pollo, 12, true),
    (gen_random_uuid(), 'Pollo con Champinones', 'Pollo salteado con champinones', 22000, v_pollo, 12, true),
    (gen_random_uuid(), 'Pollo Teriyaki', 'Pollo en salsa teriyaki japonesa', 24000, v_pollo, 15, true),
    (gen_random_uuid(), 'Pollo con Curry', 'Pollo en cremosa salsa de curry', 23000, v_pollo, 15, true),
    (gen_random_uuid(), 'Alitas BBQ Chinas (12 und)', 'Alitas en salsa BBQ estilo chino', 22000, v_pollo, 18, true);

  -- ==================== MARISCOS ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Camarones con Vegetales', 'Camarones salteados con vegetales', 28000, v_mariscos, 12, true),
    (gen_random_uuid(), 'Camarones Agridulce', 'Camarones en salsa agridulce', 30000, v_mariscos, 15, true),
    (gen_random_uuid(), 'Camarones al Curry', 'Camarones en salsa de curry', 30000, v_mariscos, 15, true),
    (gen_random_uuid(), 'Pescado Frito Entero', 'Mojarra frita con salsa especial', 35000, v_mariscos, 20, true),
    (gen_random_uuid(), 'Pescado al Vapor', 'Filete de pescado al vapor estilo cantones', 32000, v_mariscos, 18, true),
    (gen_random_uuid(), 'Camarones al Ajillo', 'Camarones salteados con ajo', 32000, v_mariscos, 12, true),
    (gen_random_uuid(), 'Cazuela de Mariscos', 'Surtido de mariscos en salsa especial', 45000, v_mariscos, 20, true);

  -- ==================== COLOMBIANOS ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Bandeja Paisa', 'Frijoles, arroz, carne, chicharron, huevo, arepa', 32000, v_colombianos, 20, true),
    (gen_random_uuid(), 'Churrasco con Papas', 'Churrasco de res con papas fritas', 35000, v_colombianos, 20, true),
    (gen_random_uuid(), 'Pechuga a la Plancha', 'Pechuga de pollo con ensalada y arroz', 25000, v_colombianos, 15, true),
    (gen_random_uuid(), 'Mojarra Frita', 'Mojarra entera frita con patacones', 30000, v_colombianos, 20, true),
    (gen_random_uuid(), 'Cazuela de Frijoles', 'Con chicharron, carne y arroz', 22000, v_colombianos, 15, true),
    (gen_random_uuid(), 'Sobrebarriga en Salsa', 'Sobrebarriga criolla con papas', 28000, v_colombianos, 20, true),
    (gen_random_uuid(), 'Chicharron con Arepa', 'Chicharron crujiente con arepa boyacense', 18000, v_colombianos, 15, true),
    (gen_random_uuid(), 'Caldo de Costilla', 'Tradicional caldo de costilla con papa', 14000, v_colombianos, 12, true);

  -- ==================== BEBIDAS ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Gaseosa Personal', 'Coca-Cola, Sprite, Fanta 350ml', 4000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Gaseosa Litro', 'Coca-Cola, Sprite, Fanta 1.5L', 8000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Jugo Natural', 'Limonada, naranja, maracuya', 6000, v_bebidas, 5, true),
    (gen_random_uuid(), 'Limonada de Coco', 'Limonada cremosa con coco', 8000, v_bebidas, 5, true),
    (gen_random_uuid(), 'Te Helado', 'Te frio de limon o durazno', 5000, v_bebidas, 2, true),
    (gen_random_uuid(), 'Te Chino Caliente', 'Te verde o jazmin', 4000, v_bebidas, 3, true),
    (gen_random_uuid(), 'Agua Botella', 'Agua natural o con gas 600ml', 3000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Cerveza Nacional', 'Poker, Aguila, Club Colombia', 6000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Cerveza Importada', 'Corona, Heineken, Budweiser', 10000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Soju', 'Licor coreano tradicional', 25000, v_bebidas, 1, true),
    (gen_random_uuid(), 'Sake', 'Vino de arroz japones', 30000, v_bebidas, 1, true);

  -- ==================== POSTRES ====================
  INSERT INTO products (id, name, description, price, category_id, prep_time, is_available) VALUES
    (gen_random_uuid(), 'Helado Frito', 'Helado de vainilla empanizado crujiente', 12000, v_postres, 8, true),
    (gen_random_uuid(), 'Banana Split', 'Banano con helado, crema y salsas', 14000, v_postres, 5, true),
    (gen_random_uuid(), 'Flan de Caramelo', 'Suave flan casero con caramelo', 8000, v_postres, 2, true),
    (gen_random_uuid(), 'Arroz con Leche', 'Cremoso arroz con leche y canela', 7000, v_postres, 2, true),
    (gen_random_uuid(), 'Tres Leches', 'Porcion de pastel tres leches', 10000, v_postres, 2, true),
    (gen_random_uuid(), 'Galletas de la Fortuna (4)', 'Con mensaje de la suerte', 4000, v_postres, 1, true),
    (gen_random_uuid(), 'Brownie con Helado', 'Brownie caliente con helado de vainilla', 14000, v_postres, 5, true);

END $$;

-- ==================== MENSAJE FINAL ====================
SELECT 'Menu del restaurante chino-colombiano El Dragon del Tarra creado exitosamente!' AS mensaje;
SELECT COUNT(*) as total_productos FROM products;
SELECT COUNT(*) as total_categorias FROM categories;
