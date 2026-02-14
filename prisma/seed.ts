import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpiar datos existentes
  await prisma.payment.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cashRegister.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.table.deleteMany()
  await prisma.area.deleteMany()
  await prisma.user.deleteMany()
  await prisma.setting.deleteMany()

  console.log('✅ Datos anteriores eliminados')

  // Crear usuarios
  const hashedPassword = await bcrypt.hash('password', 10)

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@restaurante.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  })

  const cajero = await prisma.user.create({
    data: {
      name: 'María Cajera',
      email: 'cajero@restaurante.com',
      password: hashedPassword,
      role: Role.CASHIER,
    },
  })

  const mesero1 = await prisma.user.create({
    data: {
      name: 'Juan Mesero',
      email: 'mesero1@restaurante.com',
      password: hashedPassword,
      role: Role.WAITER,
    },
  })

  const mesero2 = await prisma.user.create({
    data: {
      name: 'Ana Mesera',
      email: 'mesero2@restaurante.com',
      password: hashedPassword,
      role: Role.WAITER,
    },
  })

  const cocina = await prisma.user.create({
    data: {
      name: 'Chef Carlos',
      email: 'cocina@restaurante.com',
      password: hashedPassword,
      role: Role.KITCHEN,
    },
  })

  console.log('✅ Usuarios creados')

  // Crear áreas
  const areaInterior = await prisma.area.create({
    data: { name: 'Salón Principal', description: 'Área interior climatizada' },
  })

  const areaTerraza = await prisma.area.create({
    data: { name: 'Terraza', description: 'Área exterior con vista' },
  })

  const areaBarra = await prisma.area.create({
    data: { name: 'Barra', description: 'Asientos en la barra' },
  })

  console.log('✅ Áreas creadas')

  // Crear mesas
  const mesasInterior = []
  for (let i = 1; i <= 10; i++) {
    mesasInterior.push(
      prisma.table.create({
        data: {
          number: i,
          name: `Mesa ${i}`,
          capacity: i <= 4 ? 4 : 6,
          areaId: areaInterior.id,
        },
      })
    )
  }

  const mesasTerraza = []
  for (let i = 11; i <= 16; i++) {
    mesasTerraza.push(
      prisma.table.create({
        data: {
          number: i,
          name: `Mesa ${i}`,
          capacity: 4,
          areaId: areaTerraza.id,
        },
      })
    )
  }

  const mesasBarra = []
  for (let i = 17; i <= 20; i++) {
    mesasBarra.push(
      prisma.table.create({
        data: {
          number: i,
          name: `Barra ${i - 16}`,
          capacity: 2,
          areaId: areaBarra.id,
        },
      })
    )
  }

  await Promise.all([...mesasInterior, ...mesasTerraza, ...mesasBarra])
  console.log('✅ Mesas creadas')

  // Crear categorías
  const categorias = await Promise.all([
    prisma.category.create({
      data: { name: 'Entradas', color: '#f59e0b', icon: '🥗', sortOrder: 1 },
    }),
    prisma.category.create({
      data: { name: 'Sopas', color: '#ef4444', icon: '🍲', sortOrder: 2 },
    }),
    prisma.category.create({
      data: { name: 'Ensaladas', color: '#22c55e', icon: '🥬', sortOrder: 3 },
    }),
    prisma.category.create({
      data: { name: 'Platos Fuertes', color: '#3b82f6', icon: '🍖', sortOrder: 4 },
    }),
    prisma.category.create({
      data: { name: 'Pastas', color: '#eab308', icon: '🍝', sortOrder: 5 },
    }),
    prisma.category.create({
      data: { name: 'Mariscos', color: '#06b6d4', icon: '🦐', sortOrder: 6 },
    }),
    prisma.category.create({
      data: { name: 'Postres', color: '#ec4899', icon: '🍰', sortOrder: 7 },
    }),
    prisma.category.create({
      data: { name: 'Bebidas', color: '#8b5cf6', icon: '🥤', sortOrder: 8 },
    }),
    prisma.category.create({
      data: { name: 'Bebidas Alcohólicas', color: '#f97316', icon: '🍺', sortOrder: 9 },
    }),
  ])

  console.log('✅ Categorías creadas')

  // Crear productos
  const productos = [
    // Entradas
    { name: 'Nachos con Queso', price: 89, categoryId: categorias[0].id, prepTime: 8 },
    { name: 'Alitas BBQ (10 pzas)', price: 139, categoryId: categorias[0].id, prepTime: 15 },
    { name: 'Guacamole con Totopos', price: 79, categoryId: categorias[0].id, prepTime: 5 },
    { name: 'Quesadillas (3 pzas)', price: 69, categoryId: categorias[0].id, prepTime: 10 },
    { name: 'Dedos de Queso', price: 89, categoryId: categorias[0].id, prepTime: 8 },

    // Sopas
    { name: 'Sopa Azteca', price: 75, categoryId: categorias[1].id, prepTime: 10 },
    { name: 'Crema de Elote', price: 65, categoryId: categorias[1].id, prepTime: 8 },
    { name: 'Caldo de Pollo', price: 85, categoryId: categorias[1].id, prepTime: 12 },
    { name: 'Consomé de Res', price: 95, categoryId: categorias[1].id, prepTime: 15 },

    // Ensaladas
    { name: 'Ensalada César', price: 95, categoryId: categorias[2].id, prepTime: 8 },
    { name: 'Ensalada de la Casa', price: 75, categoryId: categorias[2].id, prepTime: 6 },
    { name: 'Ensalada Mediterránea', price: 105, categoryId: categorias[2].id, prepTime: 8 },

    // Platos Fuertes
    { name: 'Arrachera 300g', price: 249, categoryId: categorias[3].id, prepTime: 20 },
    { name: 'Rib Eye 350g', price: 349, categoryId: categorias[3].id, prepTime: 25 },
    { name: 'Pollo a la Plancha', price: 159, categoryId: categorias[3].id, prepTime: 18 },
    { name: 'Costillas BBQ', price: 219, categoryId: categorias[3].id, prepTime: 25 },
    { name: 'Hamburguesa Clásica', price: 139, categoryId: categorias[3].id, prepTime: 15 },
    { name: 'Milanesa de Res', price: 169, categoryId: categorias[3].id, prepTime: 18 },
    { name: 'Tacos de Pastor (4 pzas)', price: 99, categoryId: categorias[3].id, prepTime: 12 },

    // Pastas
    { name: 'Espagueti Bolognesa', price: 129, categoryId: categorias[4].id, prepTime: 15 },
    { name: 'Fettuccine Alfredo', price: 139, categoryId: categorias[4].id, prepTime: 15 },
    { name: 'Lasaña', price: 159, categoryId: categorias[4].id, prepTime: 20 },
    { name: 'Ravioles de Espinaca', price: 149, categoryId: categorias[4].id, prepTime: 15 },

    // Mariscos
    { name: 'Camarones al Mojo de Ajo', price: 229, categoryId: categorias[5].id, prepTime: 18 },
    { name: 'Filete de Pescado', price: 189, categoryId: categorias[5].id, prepTime: 20 },
    { name: 'Cóctel de Camarón', price: 159, categoryId: categorias[5].id, prepTime: 10 },
    { name: 'Pulpo a las Brasas', price: 269, categoryId: categorias[5].id, prepTime: 22 },

    // Postres
    { name: 'Pastel de Chocolate', price: 75, categoryId: categorias[6].id, prepTime: 3 },
    { name: 'Flan Napolitano', price: 55, categoryId: categorias[6].id, prepTime: 3 },
    { name: 'Helado (3 bolas)', price: 65, categoryId: categorias[6].id, prepTime: 2 },
    { name: 'Churros con Chocolate', price: 69, categoryId: categorias[6].id, prepTime: 8 },
    { name: 'Cheesecake', price: 85, categoryId: categorias[6].id, prepTime: 3 },

    // Bebidas
    { name: 'Agua Natural', price: 25, categoryId: categorias[7].id, prepTime: 1 },
    { name: 'Refresco', price: 35, categoryId: categorias[7].id, prepTime: 1 },
    { name: 'Limonada', price: 39, categoryId: categorias[7].id, prepTime: 3 },
    { name: 'Agua de Horchata', price: 39, categoryId: categorias[7].id, prepTime: 2 },
    { name: 'Café Americano', price: 35, categoryId: categorias[7].id, prepTime: 3 },
    { name: 'Capuchino', price: 49, categoryId: categorias[7].id, prepTime: 4 },
    { name: 'Jugo de Naranja', price: 45, categoryId: categorias[7].id, prepTime: 3 },

    // Bebidas Alcohólicas
    { name: 'Cerveza Nacional', price: 45, categoryId: categorias[8].id, prepTime: 1 },
    { name: 'Cerveza Importada', price: 65, categoryId: categorias[8].id, prepTime: 1 },
    { name: 'Margarita', price: 89, categoryId: categorias[8].id, prepTime: 5 },
    { name: 'Copa de Vino Tinto', price: 79, categoryId: categorias[8].id, prepTime: 2 },
    { name: 'Copa de Vino Blanco', price: 79, categoryId: categorias[8].id, prepTime: 2 },
    { name: 'Piña Colada', price: 99, categoryId: categorias[8].id, prepTime: 5 },
  ]

  for (const producto of productos) {
    await prisma.product.create({
      data: {
        name: producto.name,
        price: producto.price,
        categoryId: producto.categoryId,
        prepTime: producto.prepTime,
      },
    })
  }

  console.log('✅ Productos creados')

  // Crear configuraciones
  await prisma.setting.createMany({
    data: [
      { key: 'restaurant_name', value: 'Mi Restaurante' },
      { key: 'restaurant_address', value: 'Calle Principal #123, Ciudad' },
      { key: 'restaurant_phone', value: '555-123-4567' },
      { key: 'restaurant_rfc', value: 'XAXX010101000' },
      { key: 'tax_rate', value: '16' },
      { key: 'currency', value: 'MXN' },
      { key: 'printer_ip', value: '192.168.1.100' },
      { key: 'printer_port', value: '9100' },
    ],
  })

  console.log('✅ Configuraciones creadas')

  console.log('')
  console.log('🎉 Seed completado exitosamente!')
  console.log('')
  console.log('📧 Usuarios de prueba:')
  console.log('   Admin:  admin@restaurante.com / password')
  console.log('   Cajero: cajero@restaurante.com / password')
  console.log('   Mesero: mesero1@restaurante.com / password')
  console.log('   Cocina: cocina@restaurante.com / password')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
