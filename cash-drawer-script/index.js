/**
 * Script de caja monedera - Solución definitiva para producción
 * ============================================================
 * Supabase ◄── polling ──► Este script ──COM Serial──► Impresora ──RJ11──► Caja monedera
 *
 * Características:
 *  - Puerto serial PERSISTENTE (se abre una vez, se mantiene abierto, auto-reconección)
 *  - Mutex: nunca envía 2 comandos en paralelo
 *  - Deduplicación: ignora solicitudes duplicadas dentro de ventana configurable
 *  - Claim-first: marca los jobs como procesados ANTES de enviar el comando
 *  - Fallback: si COM no está disponible, intenta vía Windows spooler (PowerShell)
 *  - Health check: log periódico para confirmar que está vivo
 *
 * Configuración mínima en .env:
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   CASH_DRAWER_COM_PORT=COM3      (o el puerto de tu impresora POS-80C)
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const path = require('path');

// ─── Configuración ────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const COM_PORT = process.env.CASH_DRAWER_COM_PORT || '';
const PRINTER_NAME = process.env.CASH_DRAWER_PRINTER_NAME || process.env.PRINTER_NAME || '';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);
const MAX_RETRIES = parseInt(process.env.CASH_DRAWER_MAX_RETRIES || '5', 10);
const RETRY_DELAY_MS = parseInt(process.env.CASH_DRAWER_RETRY_DELAY_MS || '1500', 10);
const DEDUP_WINDOW_MS = parseInt(process.env.CASH_DRAWER_DEDUP_MS || '3000', 10);
const HEALTH_LOG_INTERVAL_MS = 5 * 60 * 1000; // cada 5 minutos
const RECONNECT_DELAY_MS = 3000;
const BAUD_RATE = parseInt(process.env.CASH_DRAWER_BAUD_RATE || '9600', 10);
const SCRIPT_DIR = __dirname;

// ESC/POS comandos para abrir cajón
const ESC_POS_PIN0 = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const ESC_POS_PIN1 = Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa]);

// ─── Utilidades ───────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function log(msg, data = null) {
  const ts = new Date().toISOString();
  console.log(data ? `${ts} [INFO] ${msg} ${JSON.stringify(data)}` : `${ts} [INFO] ${msg}`);
}

function logWarn(msg, data = null) {
  const ts = new Date().toISOString();
  console.warn(data ? `${ts} [WARN] ${msg} ${JSON.stringify(data)}` : `${ts} [WARN] ${msg}`);
}

function logError(msg, err) {
  console.error(new Date().toISOString(), '[ERROR]', msg, err?.message || err);
}

// ─── Validación de arranque ───────────────────────────────────────
if (!SUPABASE_URL || !SUPABASE_KEY) {
  logError('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}
if (!COM_PORT && !PRINTER_NAME) {
  logError('Configura CASH_DRAWER_COM_PORT (ej: COM3) o CASH_DRAWER_PRINTER_NAME en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Puerto Serial Persistente ───────────────────────────────────
let serialPort = null;
let portReady = false;
let portConnecting = false;
let serialAvailable = false;

// Intentar cargar serialport
let SerialPortClass = null;
try {
  SerialPortClass = require('serialport').SerialPort;
  serialAvailable = true;
} catch (e) {
  logWarn('Módulo serialport no disponible, se usará fallback vía Windows spooler');
}

/**
 * Abre el puerto serial y lo mantiene abierto.
 * Si se desconecta, se reconecta automáticamente.
 */
function connectSerialPort() {
  if (!COM_PORT || !serialAvailable || portConnecting) return;
  if (serialPort && portReady) return; // ya conectado

  portConnecting = true;
  log(`Conectando a puerto serial ${COM_PORT} (baud: ${BAUD_RATE})...`);

  try {
    // Cerrar puerto previo si existe
    if (serialPort) {
      try { serialPort.removeAllListeners(); serialPort.close(); } catch (_) {}
      serialPort = null;
      portReady = false;
    }

    serialPort = new SerialPortClass({
      path: COM_PORT,
      baudRate: BAUD_RATE,
      autoOpen: false,
    });

    serialPort.on('open', () => {
      portReady = true;
      portConnecting = false;
      log(`✓ Puerto ${COM_PORT} abierto y listo`);
    });

    serialPort.on('error', (err) => {
      logError(`Error en puerto ${COM_PORT}`, err);
      portReady = false;
      portConnecting = false;
      scheduleReconnect();
    });

    serialPort.on('close', () => {
      logWarn(`Puerto ${COM_PORT} cerrado inesperadamente`);
      portReady = false;
      portConnecting = false;
      scheduleReconnect();
    });

    serialPort.open((err) => {
      if (err) {
        logError(`No se pudo abrir ${COM_PORT}`, err);
        portReady = false;
        portConnecting = false;
        serialPort = null;
        scheduleReconnect();
      }
    });
  } catch (err) {
    logError('Error creando SerialPort', err);
    portReady = false;
    portConnecting = false;
    serialPort = null;
    scheduleReconnect();
  }
}

let reconnectTimer = null;
function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSerialPort();
  }, RECONNECT_DELAY_MS);
}

// ─── Mutex para escritura serial ──────────────────────────────────
let writeBusy = false;

/**
 * Envía bytes por el puerto serial persistente con mutex.
 */
async function writeSerial(bytes) {
  // Esperar si hay otra escritura en curso (máx 5s)
  const deadline = Date.now() + 5000;
  while (writeBusy && Date.now() < deadline) {
    await sleep(50);
  }
  if (writeBusy) {
    logWarn('Mutex timeout - forzando escritura');
  }

  writeBusy = true;
  try {
    if (!serialPort || !portReady) {
      throw new Error('Puerto serial no conectado');
    }

    return await new Promise((resolve, reject) => {
      serialPort.write(bytes, (err) => {
        if (err) return reject(err);
        serialPort.drain((drainErr) => {
          if (drainErr) return reject(drainErr);
          resolve(true);
        });
      });
    });
  } finally {
    writeBusy = false;
  }
}

/**
 * Fallback: envía bytes vía PowerShell al spooler de Windows.
 */
function writeViaSpooler(bytes) {
  const psScript = path.join(SCRIPT_DIR, 'send-raw-printer.ps1');
  const base64 = bytes.toString('base64');
  const escapedName = PRINTER_NAME.replace(/"/g, '`"');
  const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psScript}" -PrinterName "${escapedName}" -Base64Bytes "${base64}" -PreDelayMs 500`;
  execSync(cmd, { stdio: 'pipe', timeout: 15000, windowsHide: true });
}

/**
 * Envía el comando ESC/POS. Usa serial persistente si disponible, fallback a spooler.
 */
async function sendCommand(bytes) {
  // Intento 1: Puerto serial persistente
  if (COM_PORT && serialAvailable) {
    if (!portReady) {
      connectSerialPort();
      // Esperar a que se abra (máx 3s)
      const waitUntil = Date.now() + 3000;
      while (!portReady && Date.now() < waitUntil) {
        await sleep(100);
      }
    }
    if (portReady) {
      await writeSerial(bytes);
      return;
    }
    logWarn('Puerto serial no disponible, intentando fallback...');
  }

  // Intento 2: Fallback a Windows spooler (solo si hay nombre de impresora)
  if (PRINTER_NAME) {
    writeViaSpooler(bytes);
    return;
  }

  // Intento 3: Abrir COM temporalmente (último recurso)
  if (COM_PORT && serialAvailable) {
    log('Último recurso: abriendo COM temporal...');
    await new Promise((resolve, reject) => {
      const tempPort = new SerialPortClass({
        path: COM_PORT,
        baudRate: BAUD_RATE,
      }, (err) => {
        if (err) return reject(err);
        tempPort.write(bytes, (wErr) => {
          if (wErr) { tempPort.close(); return reject(wErr); }
          tempPort.drain(() => tempPort.close((cErr) => cErr ? reject(cErr) : resolve()));
        });
      });
    });
    return;
  }

  throw new Error('No hay método disponible para enviar comando (ni COM ni impresora)');
}

// ─── Deduplicación ────────────────────────────────────────────────
let lastSuccessfulOpen = 0;

// ─── Apertura de cajón con reintentos ─────────────────────────────
async function openDrawer() {
  const now = Date.now();
  if (now - lastSuccessfulOpen < DEDUP_WINDOW_MS) {
    log(`Dedup: ignorando (última apertura hace ${now - lastSuccessfulOpen}ms, ventana: ${DEDUP_WINDOW_MS}ms)`);
    return true;
  }

  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await sendCommand(ESC_POS_PIN0);
      lastSuccessfulOpen = Date.now();
      return true;
    } catch (err) {
      lastErr = err;
      logWarn(`Intento ${attempt}/${MAX_RETRIES} con PIN0 falló: ${err.message}`);

      // Probar PIN1 como alternativa
      try {
        await sendCommand(ESC_POS_PIN1);
        lastSuccessfulOpen = Date.now();
        log(`Apertura exitosa con PIN1 (intento ${attempt})`);
        return true;
      } catch (err2) {
        logWarn(`PIN1 también falló: ${err2.message}`);
      }

      if (attempt < MAX_RETRIES) {
        log(`Esperando ${RETRY_DELAY_MS}ms antes de reintentar...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  logError('FALLO TOTAL: No se pudo abrir el cajón tras todos los intentos', lastErr);
  return false;
}

// ─── Supabase: obtener y reclamar jobs ────────────────────────────

/**
 * Obtiene jobs pendientes y los marca como procesados INMEDIATAMENTE (claim-first).
 * Esto evita que otro consumer los tome por race condition.
 * Devuelve los IDs reclamados.
 */
async function claimPendingJobs() {
  const { data, error } = await supabase
    .from('print_queue')
    .select('id')
    .eq('type', 'cash_drawer')
    .is('printed_at', null)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const ids = data.map((j) => j.id);

  // Marcar como procesados ANTES de enviar el comando (claim-first)
  const { error: updateError } = await supabase
    .from('print_queue')
    .update({ printed_at: new Date().toISOString() })
    .in('id', ids);

  if (updateError) {
    logError('Error marcando jobs como procesados', updateError);
    // Continuar de todos modos - mejor abrir el cajón dos veces que ninguna
  }

  return ids;
}

// ─── Polling principal ────────────────────────────────────────────
let isPolling = false;
let jobsProcessed = 0;
let lastPollError = null;

async function pollOnce() {
  if (isPolling) return;
  isPolling = true;

  try {
    const ids = await claimPendingJobs();
    if (ids.length === 0) return;

    log(`Jobs reclamados: [${ids.join(', ')}]`);
    const ok = await openDrawer();

    if (ok) {
      jobsProcessed += ids.length;
      log(`✓ Cajón abierto (jobs: ${ids.length}, total sesión: ${jobsProcessed})`);
    } else {
      logError(`✗ No se pudo abrir el cajón para jobs [${ids.join(', ')}]`);
    }

    lastPollError = null;
  } catch (err) {
    // Solo loguear si es un error nuevo (evitar spam)
    if (lastPollError !== err.message) {
      logError('Error en polling', err);
      lastPollError = err.message;
    }
  } finally {
    isPolling = false;
  }
}

// ─── Health check periódico ───────────────────────────────────────
function healthLog() {
  const portStatus = COM_PORT
    ? (portReady ? `COM ${COM_PORT} ✓` : `COM ${COM_PORT} ✗ (reconectando)`)
    : `Spooler: ${PRINTER_NAME}`;
  log(`[HEALTH] Activo | ${portStatus} | Jobs procesados: ${jobsProcessed} | Polling: ${POLL_INTERVAL_MS}ms`);
}

// ─── Cierre graceful ──────────────────────────────────────────────
function gracefulShutdown(signal) {
  log(`Recibida señal ${signal}, cerrando...`);
  if (serialPort && portReady) {
    try { serialPort.close(); } catch (_) {}
  }
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ─── Inicio ───────────────────────────────────────────────────────
async function run() {
  const via = COM_PORT ? `COM: ${COM_PORT} (serial persistente)` : `Impresora: ${PRINTER_NAME} (spooler)`;
  log('═══════════════════════════════════════════════════════════');
  log('   SCRIPT CAJA MONEDERA - INICIADO');
  log(`   Método: ${via}`);
  log(`   Polling: cada ${POLL_INTERVAL_MS}ms`);
  log(`   Reintentos: ${MAX_RETRIES} (delay: ${RETRY_DELAY_MS}ms)`);
  log(`   Dedup: ${DEDUP_WINDOW_MS}ms`);
  log(`   Supabase: ${SUPABASE_URL ? '✓ configurado' : '✗ falta'}`);
  log('═══════════════════════════════════════════════════════════');

  // Conectar puerto serial persistente
  if (COM_PORT && serialAvailable) {
    connectSerialPort();
    // Esperar conexión inicial (máx 5s)
    const waitUntil = Date.now() + 5000;
    while (!portReady && Date.now() < waitUntil) {
      await sleep(200);
    }
    if (!portReady) {
      logWarn(`Puerto ${COM_PORT} no se abrió aún - se reintentará automáticamente`);
    }
  }

  // Health check periódico
  setInterval(healthLog, HEALTH_LOG_INTERVAL_MS);

  // Polling
  setInterval(pollOnce, POLL_INTERVAL_MS);
  await pollOnce(); // primera ejecución inmediata
}

run().catch((err) => {
  logError('Error fatal', err);
  process.exit(1);
});
