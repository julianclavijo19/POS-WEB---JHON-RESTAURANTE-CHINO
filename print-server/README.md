# 🖨️ Servidor de Impresión de Cocina

Servidor Node.js para imprimir comandas en impresora térmica Jalltech C260 (ESC/POS).

## 📋 Requisitos

- **Node.js** 18.x o superior
- **Impresora térmica** Jalltech C260 configurada en la red
  - IP: `192.168.1.110`
  - Puerto: `9100`
- **Windows 10/11** (para ejecutar como servicio)

## 🚀 Instalación Rápida

### 1. Instalar dependencias

```powershell
cd c:\Users\PC_MASTER\Desktop\Sistema\print-server
npm install
```

### 2. Probar el servidor manualmente

```powershell
# Iniciar el servidor
npm start

# En otra terminal, ejecutar las pruebas
node test-print.js all
```

### 3. Verificar que funciona

Abre un navegador y ve a: http://localhost:3001/health

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2024-xx-xx...",
  "printer": {
    "ip": "192.168.1.110",
    "port": 9100
  }
}
```

---

## ⚙️ Configuración de PM2 (Auto-inicio en Windows)

PM2 permite que el servidor se inicie automáticamente cuando Windows arranca.

### Paso 1: Instalar PM2 globalmente

```powershell
npm install -g pm2
```

### Paso 2: Instalar el módulo de Windows para PM2

```powershell
npm install -g pm2-windows-startup
pm2-startup install
```

### Paso 3: Iniciar el servidor con PM2

```powershell
cd c:\Users\PC_MASTER\Desktop\Sistema\print-server
pm2 start server.js --name "print-server"
```

### Paso 4: Guardar la configuración

```powershell
pm2 save
```

### Paso 5: Verificar que está corriendo

```powershell
pm2 status
```

Deberías ver algo como:
```
┌─────┬─────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┐
│ id  │ name            │ namespace   │ version │ mode    │ pid      │ uptime │
├─────┼─────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┤
│ 0   │ print-server    │ default     │ 1.0.0   │ fork    │ 12345    │ 5s     │
└─────┴─────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┘
```

### Comandos útiles de PM2

```powershell
# Ver logs en tiempo real
pm2 logs print-server

# Reiniciar el servidor
pm2 restart print-server

# Detener el servidor
pm2 stop print-server

# Ver información detallada
pm2 show print-server

# Monitorear recursos
pm2 monit
```

---

## 🔌 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/health` | Estado del servidor |
| GET | `/printer-status` | Estado de conexión de la impresora |
| POST | `/print-kitchen` | Imprimir una comanda |
| POST | `/print-test` | Imprimir ticket de prueba |
| POST | `/print-kitchen-batch` | Imprimir múltiples comandas |

---

## 📝 Formato de Datos

### POST `/print-kitchen`

```json
{
  "mesa": "5",
  "mesero": "Juan Pérez",
  "items": [
    {"nombre": "Hamburguesa", "cantidad": 2, "notas": "Sin cebolla"},
    {"nombre": "Coca Cola", "cantidad": 1, "notas": ""}
  ],
  "total": 25000,
  "hora": "14:30"
}
```

### Respuesta exitosa

```json
{
  "success": true,
  "message": "Comanda impresa correctamente",
  "attempts": 1,
  "duration": "245ms"
}
```

### Respuesta de error

```json
{
  "success": false,
  "error": "Error al imprimir",
  "message": "No se puede conectar con la impresora",
  "duration": "5023ms",
  "suggestion": "Verifique que la impresora esté encendida y conectada a la red"
}
```

---

## 🧪 Pruebas

### Usando el script de prueba

```powershell
# Modo interactivo (con menú)
node test-print.js

# Comandos directos
node test-print.js health   # Verificar servidor
node test-print.js printer  # Verificar impresora
node test-print.js test     # Imprimir ticket de prueba
node test-print.js order    # Imprimir comanda de ejemplo
node test-print.js all      # Ejecutar todas las pruebas
```

### Usando curl (PowerShell)

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3001/health"

# Estado de la impresora
Invoke-RestMethod -Uri "http://localhost:3001/printer-status"

# Imprimir ticket de prueba
Invoke-RestMethod -Uri "http://localhost:3001/print-test" -Method Post

# Imprimir comanda
$body = @{
  mesa = "5"
  mesero = "Juan"
  items = @(
    @{nombre = "Hamburguesa"; cantidad = 2; notas = "Sin cebolla"}
  )
  total = 25000
  hora = "14:30"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3001/print-kitchen" -Method Post -Body $body -ContentType "application/json"
```

---

## 🔧 Configuración

Para cambiar la IP de la impresora o el puerto del servidor, edita las constantes en `server.js`:

```javascript
const CONFIG = {
  server: {
    port: 3001,           // Puerto del servidor HTTP
    host: '0.0.0.0'       // Escuchar en todas las interfaces
  },
  printer: {
    ip: '192.168.1.110',  // IP de la impresora
    port: 9100,           // Puerto de la impresora (raw TCP)
    timeout: 5000,        // Timeout de conexión (ms)
    retries: 3,           // Intentos de reconexión
    retryDelay: 1000      // Espera entre reintentos (ms)
  }
};
```

---

## ❗ Solución de Problemas

### La impresora no responde

1. Verifica que la impresora esté encendida
2. Comprueba la conexión de red (ping a la IP)
3. Asegúrate de que el puerto 9100 esté abierto
4. Reinicia la impresora

```powershell
# Probar conectividad
ping 192.168.1.110

# Probar puerto TCP
Test-NetConnection -ComputerName 192.168.1.110 -Port 9100
```

### El servidor no inicia

1. Verifica que el puerto 3001 no esté en uso
2. Revisa los logs de PM2: `pm2 logs print-server`
3. Asegúrate de que las dependencias estén instaladas: `npm install`

### Los caracteres especiales no se imprimen bien

La impresora está configurada para usar el charset PC850 (español). Si hay problemas:
1. Verifica que la impresora soporte ESC/POS
2. Prueba cambiando `characterSet` en el código

---

## 📁 Estructura del Proyecto

```
print-server/
├── package.json      # Dependencias
├── server.js         # Servidor principal
├── test-print.js     # Script de pruebas
└── README.md         # Esta documentación
```

---

## 🌐 Uso con la app desplegada en Vercel

Cuando el sistema de comandas está en **Vercel** (internet), el navegador no puede usar `localhost:3001`. Hay que indicar la **URL del servidor de impresión** que corre en tu red local:

1. **Ejecuta el print-server** en un PC de la red del restaurante (el mismo que tenga acceso a la impresora por Ethernet), con PM2 o `npm start`.
2. **Anota la IP** de ese PC en la red (ej: `192.168.1.50`). La URL será `http://192.168.1.50:3001`.
3. En la **app en Vercel**: entra como **Admin** → **Configuración** → pestaña **Impresoras** → en **URL del servidor de impresión** escribe `http://192.168.1.50:3001` → Guardar.
4. Los dispositivos que usen la app (meseros, cajero) deben estar en la **misma red local** que el PC donde corre el print-server, para que el navegador pueda conectar a esa IP.

Variables de entorno del print-server (opcional, en el PC donde corre):

- `PRINTER_IP`: IP de la impresora (ej: 192.168.1.110)
- `PRINTER_PORT`: Puerto de la impresora (ej: 9100)
- `PORT`: Puerto del servidor (por defecto 3001)

---

## 🔒 Seguridad

En producción, considera:

1. **Restringir CORS** - Cambiar `origin: '*'` por los dominios específicos
2. **Firewall** - Permitir solo conexiones desde la red local al puerto 3001
3. **No exponer a Internet** - Este servidor debe ser solo para red local

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `pm2 logs print-server`
2. Ejecuta las pruebas: `node test-print.js all`
3. Verifica la configuración de red de la impresora
