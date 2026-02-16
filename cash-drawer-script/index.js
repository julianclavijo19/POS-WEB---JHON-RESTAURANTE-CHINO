/**
 * Script de caja monedera - PC de caja (Windows)
 * Supabase ◄── polling ──► Este script ──Impresora/COM──► Caja monedera (RJ11)
 *
 * Si CASH_DRAWER_COM_PORT está configurado (ej: COM3): envía directo por serial (más estable).
 * Si no: usa impresora Windows por nombre (PowerShell Win32).
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PRINTER_NAME = process.env.CASH_DRAWER_PRINTER_NAME || process.env.PRINTER_NAME || '';
const COM_PORT = process.env.CASH_DRAWER_COM_PORT || ''; // ej: COM3 - prioridad sobre impresora
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '2000', 10);

// POS-80C: pin 0 (más común) y alternativo pin 1.
const ESC_POS_PIN0 = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const ESC_POS_PIN1 = Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa]);
const ESC_POS_ALT = Buffer.from([0x1b, 0x70, 0x00, 0x1e, 0xff]);
const SCRIPT_DIR = __dirname;
const MAX_RETRIES = parseInt(process.env.CASH_DRAWER_MAX_RETRIES || '10', 10);
const RETRY_DELAY_MS = parseInt(process.env.CASH_DRAWER_RETRY_DELAY_MS || '2000', 10);
const PIN_MODE = process.env.CASH_DRAWER_PIN || '0';
const DOUBLE_PULSE = process.env.CASH_DRAWER_DOUBLE_PULSE === '1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(msg, data = null) {
  const ts = new Date().toISOString();
  const str = data ? `${ts} ${msg} ${JSON.stringify(data)}` : `${ts} ${msg}`;
  console.log(str);
}

function logError(msg, err) {
  console.error(new Date().toISOString(), 'ERROR', msg, err?.message || err);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  logError('Faltan variables de entorno. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

if (!COM_PORT && !PRINTER_NAME) {
  logError('Configura CASH_DRAWER_COM_PORT (ej: COM3) o CASH_DRAWER_PRINTER_NAME en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getEscPosCommands() {
  if (PIN_MODE === '1') return [ESC_POS_PIN1];
  if (PIN_MODE === 'both') return [ESC_POS_PIN0, ESC_POS_PIN1, ESC_POS_ALT];
  return [ESC_POS_PIN0];
}

function sendRawViaSerial(bytes) {
  const { SerialPort } = require('serialport');
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: COM_PORT,
      baudRate: 9600
    }, (err) => {
      if (err) return reject(err);
      port.write(bytes, (writeErr) => {
        if (writeErr) return port.close(() => reject(writeErr));
        port.drain(() => {
          port.close((closeErr) => closeErr ? reject(closeErr) : resolve());
        });
      });
    });
  });
}

function sendRawToPrinter(bytes) {
  const psScript = path.join(SCRIPT_DIR, 'send-raw-printer.ps1');
  const base64 = bytes.toString('base64');
  const escapedName = PRINTER_NAME.replace(/"/g, '`"');
  const cmd = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${psScript}" -PrinterName "${escapedName}" -Base64Bytes "${base64}" -PreDelayMs 800`;
  execSync(cmd, { stdio: 'pipe', timeout: 15000, windowsHide: true });
}

async function sendRaw(bytes) {
  if (COM_PORT) {
    await sendRawViaSerial(bytes);
  } else {
    sendRawToPrinter(bytes);
  }
}

/**
 * Envía comando ESC/POS de apertura de cajón. Usa COM si está configurado (más estable).
 * Reintentos + pin 0, 1 y alternativo si falla.
 */
async function openDrawerViaPrinter() {
  const commands = getEscPosCommands();
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    for (let i = 0; i < commands.length; i++) {
      try {
        await sendRaw(commands[i]);
        if (DOUBLE_PULSE) {
          await sleep(150);
          await sendRaw(commands[i]);
        }
        if (commands.length > 1 && i > 0) {
          log(`Apertura exitosa con comando alternativo (intento ${attempt})`);
        }
        return;
      } catch (err) {
        lastErr = err;
        if (i < commands.length - 1) {
          log(`Comando ${i + 1}/${commands.length} falló, probando siguiente...`);
          await sleep(200);
        }
      }
    }
    if (attempt < MAX_RETRIES) {
      log(`Intento ${attempt}/${MAX_RETRIES} falló, reintentando en ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr;
}

/**
 * Obtiene registros cash_drawer pendientes de Supabase.
 */
async function fetchPendingCashDrawerJobs() {
  const { data, error } = await supabase
    .from('print_queue')
    .select('id')
    .eq('type', 'cash_drawer')
    .is('printed_at', null)
    .order('created_at', { ascending: true })
    .limit(10);

  if (error) throw error;
  return data || [];
}

/**
 * Marca los jobs como impresos.
 */
async function markAsPrinted(ids) {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from('print_queue')
    .update({ printed_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
}

let isPolling = false;
async function pollOnce() {
  if (isPolling) return;
  isPolling = true;
  try {
    const jobs = await fetchPendingCashDrawerJobs();
    if (jobs.length === 0) return;

    const ids = jobs.map((j) => j.id);
    log('Jobs cash_drawer pendientes:', ids);

    try {
      await openDrawerViaPrinter();
      log('Caja abierta correctamente');
      await markAsPrinted(ids);
      log('Marcados como impresos:', ids);
    } catch (err) {
      logError('Error abriendo caja o marcando', err);
    }
  } catch (err) {
    logError('Error en polling', err);
  } finally {
    isPolling = false;
  }
}

async function run() {
  const via = COM_PORT ? `COM: ${COM_PORT}` : `Impresora: ${PRINTER_NAME}`;
  log(`Iniciando script caja monedera | ${via} | Poll: ${POLL_INTERVAL_MS}ms`);
  log(`Supabase URL: ${SUPABASE_URL ? SUPABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : '(no config)'}`);

  setInterval(pollOnce, POLL_INTERVAL_MS);
  await pollOnce();
}

run().catch((err) => {
  logError('Error fatal', err);
  process.exit(1);
});
