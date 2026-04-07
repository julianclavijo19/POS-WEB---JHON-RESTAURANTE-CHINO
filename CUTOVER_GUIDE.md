# Guía de Cutover: Migración a Nuevo Supabase

## Estado: Listo para Cutover

### Proyecto Nuevo
- **Project ID**: `mjgrmgkadxgcpbhyegns`
- **URL**: `https://mjgrmgkadxgcpbhyegns.supabase.co`
- **Región**: us-east-2
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ3JtZ2thZHhnY3BiaHllZ25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzk5MjcsImV4cCI6MjA5MTA1NTkyN30.eIyEbVz13nLriOL1Cd2UpU-QxN9UKIUlABUnrIfrNHI`
- **Service Role Key**: Obtener del dashboard de Supabase → Settings → API
- **Database Password**: Obtener del dashboard → Settings → Database

---

## Paso 1: Obtener credenciales del nuevo proyecto

Ir a https://supabase.com/dashboard/project/mjgrmgkadxgcpbhyegns/settings/api

Copiar:
1. **service_role key** (secret)
2. **anon key** (ya lo tenemos arriba)

Ir a https://supabase.com/dashboard/project/mjgrmgkadxgcpbhyegns/settings/database

Copiar:
3. **Database URL** (Connection string → URI → Session mode)
4. **Direct URL** (Connection string → URI → Transaction mode)

---

## Paso 2: Actualizar Railway (Frontend)

En Railway → tu servicio → Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://mjgrmgkadxgcpbhyegns.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ3JtZ2thZHhnY3BiaHllZ25zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Nzk5MjcsImV4cCI6MjA5MTA1NTkyN30.eIyEbVz13nLriOL1Cd2UpU-QxN9UKIUlABUnrIfrNHI
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_del_paso_1>
DATABASE_URL=<database_url_del_paso_1>
DIRECT_URL=<direct_url_del_paso_1>
```

Variables que NO cambian:
- `NEXTAUTH_URL` (igual)
- `NEXTAUTH_SECRET` (igual)
- `PRINT_POLLING_SECRET` (igual)
- `NEXT_PUBLIC_PRINT_SERVER_URL` (igual)
- `CRON_SECRET` (igual)

---

## Paso 3: Actualizar Print Server (.env local)

Editar `print-server/.env`:

```
NEXT_PUBLIC_SUPABASE_URL=https://mjgrmgkadxgcpbhyegns.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_del_paso_1>
```

Reiniciar: `pm2 restart print-server`

---

## Paso 4: Actualizar Cash Drawer Script (.env local)

Editar `cash-drawer-script/.env`:

```
NEXT_PUBLIC_SUPABASE_URL=https://mjgrmgkadxgcpbhyegns.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_del_paso_1>
```

Reiniciar: `pm2 restart cash-drawer`

---

## Paso 5: Verificación Post-Cutover

1. ✅ Abrir la app en el navegador → debe cargar datos
2. ✅ Crear un pedido de prueba → debe aparecer en cocina
3. ✅ Verificar que la impresora imprime la comanda
4. ✅ Verificar que la caja monedera se abre al cobrar
5. ✅ Abrir DevTools → Network → verificar que conecta a `mjgrmgkadxgcpbhyegns.supabase.co`
6. ✅ Verificar indicador de conexión Realtime (debe mostrar verde/conectado)

---

## Paso 6: Re-subir Logo

El logo del restaurante necesita re-subirse:
1. Ir a Admin → Configuración
2. Subir la imagen del logo nuevamente

---

## Notas
- La base de datos antigua (`hiuermzhgvtrygcuuxix`) queda como backup
- NO borrar el proyecto viejo por ahora
- El nuevo proyecto tiene Realtime habilitado en 11 tablas
- Todas las páginas ya usan WebSocket con fallback a polling
- El print-server y cash-drawer ya usan Realtime con fallback
