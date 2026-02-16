/**
 * Test: enviar comando abrir caja a la impresora configurada.
 * Ejecutar: node test-open-drawer.js
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const PRINTER_NAME = process.env.CASH_DRAWER_PRINTER_NAME || 'POS-80C';
const buf = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const base64 = buf.toString('base64');
const script = path.join(__dirname, 'send-raw-printer.ps1');

try {
  execSync(
    `powershell -ExecutionPolicy Bypass -File "${script}" -PrinterName "${PRINTER_NAME}" -Base64Bytes "${base64}"`,
    { stdio: 'pipe', timeout: 10000 }
  );
  console.log('OK - Comando enviado. La caja debería abrirse.');
} catch (e) {
  console.error('Error:', e.message);
  if (e.stderr) console.error(e.stderr.toString());
  process.exit(1);
}
