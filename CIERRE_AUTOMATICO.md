# Sistema de Cierre Automático Diario

## Descripción
El sistema incluye un endpoint para realizar el cierre diario del restaurante a las 12:00 PM (mediodía).

## ¿Qué hace el cierre diario?
1. **Resetea todas las mesas** - Pone todas las mesas en estado "AVAILABLE" (Disponible)
2. **Cancela pedidos pendientes** - Los pedidos que no fueron completados se marcan como "CANCELLED"
3. **Genera un reporte** - Muestra estadísticas del día (pedidos, ingresos, mesas)

## Endpoint API
```
POST /api/system/daily-close
```

## Opciones de Configuración

### Opción 1: Cierre Manual (Recomendado para comenzar)
El administrador puede ejecutar el cierre manualmente desde:
- **Admin > Configuración > Cierre del Día**

### Opción 2: Cron Job Externo (Para automatizar)

#### Usando cron-job.org (Gratis)
1. Ir a https://cron-job.org
2. Crear una cuenta gratuita
3. Agregar un nuevo cron job:
   - URL: `https://tu-dominio.com/api/system/daily-close`
   - Método: POST
   - Horario: `0 12 * * *` (12:00 PM todos los días)
   - Headers: `Authorization: Bearer TU_CRON_SECRET`

#### Variables de Entorno
Agregar en `.env.local`:
```
CRON_SECRET=tu-secreto-seguro-aqui
```

### Opción 3: Vercel Cron Jobs (Si usas Vercel)

Crear archivo `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/system/daily-close",
    "schedule": "0 12 * * *"
  }]
}
```

### Opción 4: Script del Sistema (Linux/Windows)

#### Linux (crontab)
```bash
# Editar crontab
crontab -e

# Agregar línea
0 12 * * * curl -X POST https://tu-dominio.com/api/system/daily-close -H "Authorization: Bearer TU_SECRET"
```

#### Windows (Task Scheduler)
1. Abrir Programador de tareas
2. Crear tarea básica
3. Programar para las 12:00 PM diariamente
4. Acción: Iniciar programa
5. Programa: `curl`
6. Argumentos: `-X POST http://localhost:3000/api/system/daily-close`

## Seguridad
El endpoint verifica:
1. Token de autorización (CRON_SECRET) si está configurado
2. O que sea un usuario administrador autenticado

## Respuesta del API
```json
{
  "success": true,
  "message": "Cierre del día completado exitosamente",
  "report": {
    "timestamp": "2024-01-15T17:00:00.000Z",
    "tablesReset": 10,
    "ordersClosed": 45,
    "totalRevenue": 1500000
  }
}
```

## Verificar Estado
```
GET /api/system/daily-close
```
Devuelve la hora actual y si ya se ejecutó el cierre.
