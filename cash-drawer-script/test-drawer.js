/**
 * Test de caja monedera - Diagnóstico paso a paso
 * Uso:
 *   node test-drawer.js direct     → Abre cajón directo (sin Supabase)
 *   node test-drawer.js queue      → Inserta job en Supabase y prueba flujo
 *   node test-drawer.js pins       → Prueba varios comandos ESC/POS (pin 0, 1, DLE)
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PRINTER_NAME = process.env.CASH_DRAWER_PRINTER_NAME || process.env.PRINTER_NAME || '';
const COM_PORT = process.env.CASH_DRAWER_COM_PORT || '';

const SCRIPT_DIR = __dirname;
const PS_SCRIPT = path.join(SCRIPT_DIR, 'send-raw-printer.ps1');

async function sendBytes(bytes) {
  if (COM_PORT) {
    const { SerialPort } = require('serialport');
    return new Promise((resolve, reject) => {
      const port = new SerialPort({ path: COM_PORT, baudRate: 9600 }, (err) => {
        if (err) return reject(err);
        port.write(bytes, (writeErr) => {
          if (writeErr) return port.close(() => reject(writeErr));
          port.drain(() => port.close((e) => e ? reject(e) : resolve()));
        });
      });
    });
  }
  const base64 = bytes.toString('base64');
  const escapedName = PRINTER_NAME.replace(/"/g, '`"');
  const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${PS_SCRIPT}" -PrinterName "${escapedName}" -Base64Bytes "${base64}"`;
  execSync(cmd, { stdio: 'inherit', timeout: 15000, windowsHide: false });
}

// Diferentes comandos ESC/POS para distintos modelos de cajón
const COMMANDS = {
  pin0: Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]),   // Pin 2 - más común
  pin1: Buffer.from([0x1b, 0x70, 0x01, 0x19, 0xfa]),   // Pin 5
  pin0_alt: Buffer.from([0x1b, 0x70, 0x00, 0x32, 0xc8]),
  dle: Buffer.from([0x10, 0x14, 0x01, 0x00, 0x05]),    // DLE DC1 - algunos Epson antiguos
};

async function testDirect() {
  console.log('\n=== TEST DIRECTO (sin Supabase) ===');
  console.log(COM_PORT ? `Puerto COM: ${COM_PORT}` : `Impresora: ${PRINTER_NAME || '(no configurada)'}`);
  if (!COM_PORT && !PRINTER_NAME) {
    console.error('Configura CASH_DRAWER_COM_PORT o CASH_DRAWER_PRINTER_NAME en .env');
    process.exit(1);
  }
  console.log('\nEnviando comando ESC p 0 (pin 2)...');
  try {
    await sendBytes(COMMANDS.pin0);
    console.log('OK - Comando enviado. ¿Se abrió el cajón?');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

async function testAllPins() {
  console.log('\n=== TEST VARIOS PINES ===');
  if (!COM_PORT && !PRINTER_NAME) {
    console.error('Configura CASH_DRAWER_PRINTER_NAME en .env');
    process.exit(1);
  }
  for (const [name, bytes] of Object.entries(COMMANDS)) {
    console.log(`\nProbando ${name}...`);
    try {
      await sendBytes(bytes);
      console.log(`  OK - ¿Se abrió con ${name}?`);
    } catch (err) {
      console.log(`  Falló: ${err.message}`);
    }
  }
}

async function testQueue() {
  console.log('\n=== TEST COLA SUPABASE ===');
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('1. Insertando job cash_drawer en print_queue...');
  const { data, error } = await supabase
    .from('print_queue')
    .insert({ type: 'cash_drawer', payload: {} })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('Error insertando:', error.message);
    console.error('¿Existe la tabla print_queue? ¿Tiene type cash_drawer permitido?');
    process.exit(1);
  }
  console.log('   OK - Job creado:', data.id);

  console.log('\n2. Si el script PM2 está corriendo, debería procesarlo en ~3 segundos.');
  console.log('   Comprueba: pm2 logs cash-drawer-script');
  console.log('\n3. O ejecuta un ciclo manual:');
  console.log('   cd cash-drawer-script && node -e "require(\"./index.js\")"');
  console.log('   (Ctrl+C tras unos segundos)');
}

async function main() {
  const mode = (process.argv[2] || 'direct').toLowerCase();
  console.log('Test caja monedera - modo:', mode);

  if (mode === 'direct') await testDirect();
  else if (mode === 'pins') await testAllPins();
  else if (mode === 'queue') await testQueue();
  else {
    console.log('Uso: node test-drawer.js [direct|pins|queue]');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
