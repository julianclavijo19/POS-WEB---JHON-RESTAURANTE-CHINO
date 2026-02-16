# Script de Caja Monedera

Script independiente para PC de caja (Windows). Hace polling a Supabase `print_queue`, detecta `type = "cash_drawer"` y envía el comando ESC/POS RAW a la impresora Windows por nombre (sin puerto COM).

**Arquitectura:** Supabase ◄── polling ──► Este script ──Impresora Windows (USB)──► Caja monedera (RJ11)

**Importante:** Usa impresora por nombre (no puerto COM). Ejecuta `node list-printers.js` para ver impresoras.

## Instalación

```bash
cd cash-drawer-script
npm install
```

## Configuración

1. Copiar `.env.example` a `.env`
2. Configurar credenciales de Supabase (mismas del proyecto principal)
3. Configurar puerto COM (ver abajo)

## Encontrar el nombre de la impresora (Windows)

```bash
node list-printers.js
```

Copia el nombre exacto (entre comillas) a `CASH_DRAWER_PRINTER_NAME` en `.env`.

## Iniciar con PM2

```bash
cd cash-drawer-script
pm2 start ecosystem.config.js
pm2 save
```

### Inicio automático con Windows

En Windows, `pm2 startup` no funciona. Usa una de estas opciones:

**Opción A – Carpeta de inicio**
1. Presiona `Win + R`, escribe `shell:startup`, Enter
2. Crea un acceso directo a `start-pm2-cash-drawer.bat`

**Opción B – Programador de tareas**
1. Abre **Programador de tareas**
2. Crear tarea básica → Iniciar cuando el usuario inicie sesión
3. Acción: Iniciar programa → `start-pm2-cash-drawer.bat`
4. Ejecutar con privilegios elevados si hace falta

## Test de cajón

```bash
npm run test        # Abre cajón directo (sin Supabase)
npm run test:pins   # Prueba varios comandos ESC/POS (pin 0, 1, alternativo)
npm run test:queue  # Inserta job en Supabase para probar flujo completo
```

## Puerto COM (más estable)

Si la impresora está en COM3 y falla por nombre, usa puerto serial directo:
```
CASH_DRAWER_COM_PORT=COM3
```
Esto evita el error "Opening COM3: File not found" del spooler de Windows.

## Si el cajón no abre

1. **Usar puerto COM:** Configura `CASH_DRAWER_COM_PORT=COM3` en `.env` (más estable)
2. **Probar otro pin:** En `.env` pon `CASH_DRAWER_PIN=1` o `CASH_DRAWER_PIN=both`
2. **Doble pulso:** Algunos cajones necesitan `CASH_DRAWER_DOUBLE_PULSE=1`
3. **Error "Opening COM3: File not found":** La impresora puede estar ocupada o el USB flaky. Aumenta `CASH_DRAWER_MAX_RETRIES=8` y `CASH_DRAWER_RETRY_DELAY_MS=1500`
4. **Verificar:** `pm2 logs cash-drawer-script` para ver errores

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `pm2 start ecosystem.config.js` | Iniciar el script |
| `pm2 restart cash-drawer-script` | Reiniciar |
| `pm2 stop cash-drawer-script` | Parar |
| `pm2 logs cash-drawer-script` | Ver logs |
| `pm2 save` | Guardar lista de procesos |
| `pm2 startup` | Configurar inicio con Windows |
