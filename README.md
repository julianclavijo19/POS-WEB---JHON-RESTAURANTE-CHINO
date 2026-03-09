# Sistema de Comandas Digitales para Restaurante

> **🔒 PROTECCIÓN ACTIVA**: Este repositorio está protegido contra código mezclado.  
> Ejecuta `npm run validate` antes de cada push. Ver [PROTECCION_RAILWAY.md](PROTECCION_RAILWAY.md)

Sistema completo de gestión de pedidos para restaurantes, desarrollado con Next.js 14, listo para desplegar en Vercel.

## 🚀 Características

### 👨‍💼 Panel Administrador
- Dashboard con estadísticas en tiempo real
- Ventas del día, semana y mes
- Top productos más vendidos
- Gestión de usuarios, productos y áreas

### 💰 Módulo POS (Cajero)
- Apertura y cierre de caja
- Cobro de órdenes con múltiples métodos de pago
- Aplicación de descuentos
- Historial de pagos del turno

### 🍽️ Módulo Mesero
- Vista de mesas por área (Salón, Terraza, Barra)
- Estados visuales de mesas (libre, ocupada, reservada)
- Creación de órdenes con carrito de compras
- Agregar notas especiales por producto
- Seguimiento del estado de los pedidos

### 👨‍🍳 Módulo Cocina
- Vista en tiempo real de órdenes pendientes
- Temporizador por orden
- Marcar items individuales como listos
- Marcar orden completa
- Notificación visual cuando orden está lista

## 🛠️ Tecnologías

- **Framework:** Next.js 14 (App Router)
- **Base de Datos:** PostgreSQL con Prisma ORM
- **Autenticación:** NextAuth.js
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Notificaciones:** React Hot Toast
- **Data Fetching:** SWR

## 📦 Instalación Local

### Prerrequisitos
- Node.js 18+
- PostgreSQL (local o servicio como Neon, Supabase)

### Pasos

1. **Clonar o descargar el proyecto**
   ```bash
   cd comandas-nextjs
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   ```
   
   Editar `.env` con tus credenciales:
   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/comandas"
   NEXTAUTH_SECRET="tu-secreto-seguro-generado"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Ejecutar migraciones y seed**
   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

6. **Abrir en navegador**
   - http://localhost:3000

## 🚀 Despliegue en Vercel

### Opción 1: Desde GitHub

1. Sube el proyecto a un repositorio de GitHub
2. Ve a [vercel.com](https://vercel.com) e inicia sesión
3. Click en "New Project" → Importa tu repositorio
4. Configura las variables de entorno (ver abajo)
5. Click en "Deploy"

### Opción 2: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

### Variables de Entorno en Vercel

Configura estas variables en Vercel Dashboard → Settings → Environment Variables:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL (puedes usar Vercel Postgres) |
| `NEXTAUTH_SECRET` | Secreto para JWT (genera uno con `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL de tu aplicación (ej: https://tu-app.vercel.app) |

### Usar Vercel Postgres (Recomendado)

1. En Vercel Dashboard, ve a "Storage"
2. Click en "Create Database" → "Postgres"
3. La variable `DATABASE_URL` se agregará automáticamente
4. Ejecuta el seed: `vercel env pull .env.local && npx prisma db seed`

## 👤 Usuarios de Prueba

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@restaurante.com | password |
| Cajero | cajero@restaurante.com | password |
| Mesero | mesero1@restaurante.com | password |
| Cocina | cocina@restaurante.com | password |

## 📱 URLs por Rol

| Rol | URL |
|-----|-----|
| Admin | /admin |
| Cajero | /pos |
| Mesero | /waiter |
| Cocina | /kitchen |

## 🗂️ Estructura del Proyecto

```
comandas-nextjs/
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   └── seed.ts            # Datos de prueba
├── src/
│   ├── app/
│   │   ├── api/           # API Routes
│   │   ├── admin/         # Panel administrador
│   │   ├── pos/           # Módulo cajero
│   │   ├── waiter/        # Módulo mesero
│   │   ├── kitchen/       # Módulo cocina
│   │   └── login/         # Autenticación
│   ├── components/
│   │   └── ui/            # Componentes reutilizables
│   └── lib/
│       ├── auth.ts        # Configuración NextAuth
│       ├── prisma.ts      # Cliente Prisma
│       └── utils.ts       # Funciones útiles
└── ...
```

## 🔐 Roles y Permisos

- **ADMIN:** Acceso total al sistema
- **CASHIER:** POS, cobros y caja
- **WAITER:** Mesas, pedidos, seguimiento
- **KITCHEN:** Vista de cocina, marcar listos

## 📝 Licencia

MIT License

---

Desarrollado con ❤️ para restaurantes mexicanos
