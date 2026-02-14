/**
 * Script de prueba para el servidor de impresión
 * Ejecutar con: node test-print.js
 * 
 * Asegúrate de que el servidor esté corriendo primero:
 * node server.js
 */

const http = require('http');

const SERVER_URL = 'http://localhost:3001';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Realiza una petición HTTP
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Verifica el estado del servidor
 */
async function checkServerHealth() {
  log(colors.cyan, '\n📡 Verificando estado del servidor...');
  
  try {
    const response = await makeRequest('GET', '/health');
    if (response.data.status === 'ok') {
      log(colors.green, '✅ Servidor funcionando correctamente');
      console.log('   Timestamp:', response.data.timestamp);
      console.log('   Impresora:', `${response.data.printer.ip}:${response.data.printer.port}`);
      return true;
    }
  } catch (error) {
    log(colors.red, '❌ No se puede conectar con el servidor');
    log(colors.yellow, '   Asegúrate de que el servidor esté corriendo: node server.js');
    return false;
  }
}

/**
 * Verifica el estado de la impresora
 */
async function checkPrinterStatus() {
  log(colors.cyan, '\n🖨️  Verificando estado de la impresora...');
  
  try {
    const response = await makeRequest('GET', '/printer-status');
    
    if (response.data.connected) {
      log(colors.green, '✅ Impresora conectada y lista');
    } else {
      log(colors.red, '❌ Impresora no disponible');
      log(colors.yellow, '   Verifica que la impresora esté encendida y conectada a la red');
    }
    
    return response.data.connected;
  } catch (error) {
    log(colors.red, '❌ Error verificando impresora:', error.message);
    return false;
  }
}

/**
 * Imprime un ticket de prueba
 */
async function printTestTicket() {
  log(colors.cyan, '\n📄 Imprimiendo ticket de prueba...');
  
  try {
    const response = await makeRequest('POST', '/print-test');
    
    if (response.data.success) {
      log(colors.green, '✅ Ticket de prueba impreso correctamente');
    } else {
      log(colors.red, '❌ Error imprimiendo:', response.data.message);
    }
    
    return response.data.success;
  } catch (error) {
    log(colors.red, '❌ Error:', error.message);
    return false;
  }
}

/**
 * Imprime una comanda de ejemplo
 */
async function printSampleOrder() {
  log(colors.cyan, '\n🍔 Imprimiendo comanda de ejemplo...');
  
  const sampleOrder = {
    mesa: "5",
    mesero: "Juan Pérez",
    items: [
      { nombre: "Hamburguesa Clásica", cantidad: 2, notas: "Sin cebolla" },
      { nombre: "Papas Fritas", cantidad: 2, notas: "Extra sal" },
      { nombre: "Coca Cola", cantidad: 2, notas: "" },
      { nombre: "Arroz con Pollo", cantidad: 1, notas: "Sin picante" },
      { nombre: "Sopa del día", cantidad: 1, notas: "Bien caliente" }
    ],
    total: 45000,
    hora: new Date().toLocaleTimeString('es-CO')
  };
  
  console.log('\n   Datos de la comanda:');
  console.log('   Mesa:', sampleOrder.mesa);
  console.log('   Mesero:', sampleOrder.mesero);
  console.log('   Items:', sampleOrder.items.length);
  console.log('   Total: $' + sampleOrder.total.toLocaleString('es-CO'));
  
  try {
    const response = await makeRequest('POST', '/print-kitchen', sampleOrder);
    
    if (response.data.success) {
      log(colors.green, '\n✅ Comanda impresa correctamente');
      console.log('   Intentos:', response.data.attempts);
      console.log('   Duración:', response.data.duration);
    } else {
      log(colors.red, '\n❌ Error imprimiendo comanda:', response.data.message);
    }
    
    return response.data.success;
  } catch (error) {
    log(colors.red, '❌ Error:', error.message);
    return false;
  }
}

/**
 * Menú interactivo
 */
async function showMenu() {
  console.log('\n' + '='.repeat(50));
  log(colors.blue, '   SCRIPT DE PRUEBA - SERVIDOR DE IMPRESIÓN');
  console.log('='.repeat(50));
  console.log('\nOpciones:');
  console.log('  1. Verificar estado del servidor');
  console.log('  2. Verificar estado de la impresora');
  console.log('  3. Imprimir ticket de prueba');
  console.log('  4. Imprimir comanda de ejemplo');
  console.log('  5. Ejecutar todas las pruebas');
  console.log('  0. Salir');
  console.log('');
}

/**
 * Lee input del usuario
 */
function readInput(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

/**
 * Ejecuta todas las pruebas
 */
async function runAllTests() {
  log(colors.blue, '\n🧪 EJECUTANDO TODAS LAS PRUEBAS\n');
  console.log('='.repeat(50));
  
  const results = {
    server: false,
    printer: false,
    testTicket: false,
    sampleOrder: false
  };
  
  // 1. Verificar servidor
  results.server = await checkServerHealth();
  if (!results.server) {
    log(colors.red, '\n⛔ No se puede continuar sin el servidor');
    return;
  }
  
  // 2. Verificar impresora
  results.printer = await checkPrinterStatus();
  if (!results.printer) {
    log(colors.yellow, '\n⚠️  Continuando sin impresora (las pruebas de impresión fallarán)');
  }
  
  // 3. Imprimir ticket de prueba
  results.testTicket = await printTestTicket();
  
  // Esperar un poco entre impresiones
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 4. Imprimir comanda de ejemplo
  results.sampleOrder = await printSampleOrder();
  
  // Resumen
  console.log('\n' + '='.repeat(50));
  log(colors.blue, '   RESUMEN DE PRUEBAS');
  console.log('='.repeat(50));
  console.log(`  Servidor:        ${results.server ? '✅ OK' : '❌ FALLO'}`);
  console.log(`  Impresora:       ${results.printer ? '✅ OK' : '❌ FALLO'}`);
  console.log(`  Ticket prueba:   ${results.testTicket ? '✅ OK' : '❌ FALLO'}`);
  console.log(`  Comanda ejemplo: ${results.sampleOrder ? '✅ OK' : '❌ FALLO'}`);
  console.log('='.repeat(50));
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    log(colors.green, '\n🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE');
  } else {
    log(colors.yellow, '\n⚠️  ALGUNAS PRUEBAS FALLARON - Revisa la configuración');
  }
}

/**
 * Función principal
 */
async function main() {
  // Si se pasa un argumento, ejecutar esa prueba directamente
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    switch (args[0]) {
      case 'health':
        await checkServerHealth();
        break;
      case 'printer':
        await checkPrinterStatus();
        break;
      case 'test':
        await printTestTicket();
        break;
      case 'order':
        await printSampleOrder();
        break;
      case 'all':
        await runAllTests();
        break;
      default:
        console.log('Uso: node test-print.js [health|printer|test|order|all]');
    }
    process.exit(0);
  }
  
  // Modo interactivo
  process.stdin.setEncoding('utf8');
  
  let running = true;
  
  while (running) {
    await showMenu();
    const choice = await readInput('Selecciona una opción: ');
    
    switch (choice) {
      case '1':
        await checkServerHealth();
        break;
      case '2':
        await checkPrinterStatus();
        break;
      case '3':
        await printTestTicket();
        break;
      case '4':
        await printSampleOrder();
        break;
      case '5':
        await runAllTests();
        break;
      case '0':
        running = false;
        log(colors.blue, '\n👋 ¡Hasta luego!\n');
        break;
      default:
        log(colors.yellow, '\nOpción no válida');
    }
    
    if (running && choice !== '0') {
      await readInput('\nPresiona Enter para continuar...');
    }
  }
  
  process.exit(0);
}

// Ejecutar
main().catch(error => {
  log(colors.red, 'Error fatal:', error.message);
  process.exit(1);
});
