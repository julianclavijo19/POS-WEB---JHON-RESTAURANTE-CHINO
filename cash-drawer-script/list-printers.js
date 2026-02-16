/**
 * Listar impresoras Windows disponibles.
 * Ejecutar: node list-printers.js
 * Copia el nombre exacto de la impresora de caja a CASH_DRAWER_PRINTER_NAME en .env
 */
const { execSync } = require('child_process');
const path = require('path');

try {
  const scriptPath = path.join(__dirname, 'list-printers.ps1');
  const out = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, {
    encoding: 'utf8'
  });
  const lines = out.trim().split(/\r?\n/).filter(Boolean);
  const defaultIdx = lines.findIndex((l) => l.startsWith('---DEFAULT---'));
  const defaultName = defaultIdx >= 0 ? lines[defaultIdx].replace('---DEFAULT---', '') : null;
  const printers = defaultIdx >= 0 ? lines.slice(0, defaultIdx) : lines;

  if (printers.length === 0) {
    console.log('No se encontraron impresoras.');
    process.exit(1);
  }

  console.log('Impresoras disponibles:\n');
  printers.forEach((name) => {
    const mark = name === defaultName ? ' (predeterminada)' : '';
    console.log(`  "${name}"${mark}`);
  });
  console.log('\nCopia el nombre exacto (entre comillas) a CASH_DRAWER_PRINTER_NAME en .env');
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
