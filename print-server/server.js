/**
 * Servidor de Impresión para Cocina
 * Impresora: Jalltech C260 (ESC/POS)
 * 
 * Este servidor recibe comandas desde el sistema Next.js
 * y las imprime en la impresora térmica de cocina.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const net = require('net');
const ThermalPrinter = require('node-thermal-printer').printer;
const PrinterTypes = require('node-thermal-printer').types;

// ==========================================
// CONFIGURACIÓN (IP/puerto de impresora por env: PRINTER_IP, PRINTER_PORT)
// ==========================================
const CONFIG = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: '0.0.0.0' // Escuchar en todas las interfaces
  },
  printer: {
    ip: process.env.PRINTER_IP || '192.168.1.110',
    port: parseInt(process.env.PRINTER_PORT || '9100', 10),
    timeout: 5000, // 5 segundos de timeout
    retries: 3,    // Intentos de reconexión
    retryDelay: 1000 // 1 segundo entre reintentos
  }
};

// ==========================================
// UTILIDADES DE LOGGING
// ==========================================
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  if (data) {
    console.log(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.log(logMessage);
  }
}

function logInfo(message, data = null) {
  log('INFO', message, data);
}

function logError(message, data = null) {
  log('ERROR', message, data);
}

function logSuccess(message, data = null) {
  log('SUCCESS', message, data);
}

// ==========================================
// FUNCIONES DE IMPRESIÓN
// ==========================================

/**
 * Crea una nueva instancia de la impresora
 */
function createPrinter() {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON, // Compatible con ESC/POS
    interface: `tcp://${CONFIG.printer.ip}:${CONFIG.printer.port}`,
    options: {
      timeout: CONFIG.printer.timeout
    },
    width: 48, // Caracteres por línea (típico para 80mm)
    characterSet: 'PC850_MULTILINGUAL', // Soporte para caracteres españoles
    removeSpecialCharacters: false,
    lineCharacter: '-'
  });
}

/**
 * Espera un tiempo determinado
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Envía comando ESC/POS para abrir caja monedera por TCP (RJ11 a impresora).
 */
function openCashDrawerTcp() {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    const socket = net.connect(CONFIG.printer.port, CONFIG.printer.ip, () => {
      socket.write(buf, () => {
        socket.end();
        resolve();
      });
    });
    socket.on('error', reject);
    socket.setTimeout(CONFIG.printer.timeout, () => {
      socket.destroy();
      reject(new Error('Timeout abriendo caja'));
    });
  });
}

/**
 * Intenta imprimir con reintentos
 */
async function printWithRetry(printFunction, maxRetries = CONFIG.printer.retries) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logInfo(`Intento de impresión ${attempt}/${maxRetries}`);
      await printFunction();
      return { success: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      logError(`Intento ${attempt} fallido: ${error.message}`);
      
      if (attempt < maxRetries) {
        logInfo(`Esperando ${CONFIG.printer.retryDelay}ms antes de reintentar...`);
        await delay(CONFIG.printer.retryDelay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Formatea e imprime una comanda de cocina (formato compacto tipo ticket)
 */
async function printKitchenOrder(orderData) {
  const printer = createPrinter();
  
  // Verificar conexión
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error('No se puede conectar con la impresora');
  }
  
  // Limpiar buffer
  printer.clear();
  
  // Texto pequeño para todo el ticket
  printer.setTextSize(0, 0);
  
  // ========== ENCABEZADO ==========
  printer.alignCenter();
  printer.bold(true);
  printer.println('--- COMANDA ---');
  printer.bold(false);
  printer.println('--------------------------------');
  
  // ========== INFORMACIÓN ==========
  printer.alignLeft();
  printer.println(`Mesero: ${orderData.mesero || 'N/A'}`);
  printer.println(`Mesa: ${orderData.mesa || 'N/A'}`);
  printer.println(`Area: ${orderData.area || 'N/A'}`);
  printer.println(`Hora: ${orderData.hora || new Date().toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}`);
  printer.println('--------------------------------');
  
  // ========== ITEMS ==========
  if (orderData.items && orderData.items.length > 0) {
    orderData.items.forEach((item) => {
      printer.bold(true);
      printer.println(`${item.cantidad}x ${item.nombre}`);
      printer.bold(false);
      if (item.notas && item.notas.trim() !== '') {
        printer.println(`  > ${item.notas}`);
      }
    });
  }
  
  // ========== PIE ==========
  printer.println('--------------------------------');
  printer.alignCenter();
  printer.println(`${orderData.items ? orderData.items.length : 0} items`);
  
  // Corte de papel
  printer.cut();
  
  // Enviar a imprimir
  await printer.execute();
  
  logSuccess('Comanda impresa correctamente');
}

/**
 * Imprime un ticket de prueba
 */
async function printTestTicket() {
  const printer = createPrinter();
  
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error('No se puede conectar con la impresora');
  }
  
  printer.clear();
  printer.alignCenter();
  printer.bold(true);
  printer.println('=== TICKET DE PRUEBA ===');
  printer.bold(false);
  printer.newLine();
  printer.println('La impresora esta funcionando');
  printer.println('correctamente.');
  printer.newLine();
  printer.println(`Fecha: ${new Date().toLocaleString('es-CO')}`);
  printer.println(`IP: ${CONFIG.printer.ip}:${CONFIG.printer.port}`);
  printer.newLine();
  printer.println('Caracteres especiales:');
  printer.println('aeiou - AEIOU');
  printer.println('n - N');
  printer.newLine();
  printer.cut();
  
  await printer.execute();
  logSuccess('Ticket de prueba impreso');
}

/**
 * Imprime una CORRECCIÓN DE COMANDA con letra grande y destacada
 */
async function printCorrectionOrder(orderData) {
  const printer = createPrinter();
  
  // Verificar conexión
  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error('No se puede conectar con la impresora');
  }
  
  // Limpiar buffer
  printer.clear();
  
  // ========== ENCABEZADO GRANDE Y DESTACADO ==========
  printer.alignCenter();
  printer.setTextSize(1, 1); // Texto más grande
  printer.bold(true);
  printer.invert(true); // Invertir colores (fondo negro, texto blanco)
  printer.println('');
  printer.println('  CORRECCION  ');
  printer.println('  DE COMANDA  ');
  printer.println('');
  printer.invert(false);
  printer.bold(false);
  printer.setTextSize(0, 0); // Volver a tamaño normal
  
  printer.println('================================');
  
  // ========== TIPO DE CORRECCIÓN ==========
  printer.alignCenter();
  printer.bold(true);
  const tipoCorreccion = orderData.tipo || 'MODIFICACION';
  if (tipoCorreccion === 'AGREGAR') {
    printer.println('*** ITEMS AGREGADOS ***');
  } else if (tipoCorreccion === 'ELIMINAR') {
    printer.println('*** ITEMS ELIMINADOS ***');
  } else if (tipoCorreccion === 'CANTIDAD') {
    printer.println('*** CAMBIO DE CANTIDAD ***');
  } else {
    printer.println('*** MODIFICACION ***');
  }
  printer.bold(false);
  printer.println('--------------------------------');
  
  // ========== INFORMACIÓN ==========
  printer.alignLeft();
  printer.println(`Mesero: ${orderData.mesero || 'N/A'}`);
  printer.println(`Mesa: ${orderData.mesa || 'N/A'}`);
  printer.println(`Area: ${orderData.area || 'N/A'}`);
  printer.println(`Hora: ${orderData.hora || new Date().toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit'})}`);
  printer.println('--------------------------------');
  
  // ========== ITEMS MODIFICADOS/AGREGADOS ==========
  if (orderData.items && orderData.items.length > 0) {
    orderData.items.forEach((item) => {
      printer.setTextSize(0, 0); // Asegurar tamaño normal
      printer.bold(true);
      
      // Mostrar símbolo según el tipo
      let prefix = '';
      if (tipoCorreccion === 'AGREGAR') prefix = '+ ';
      if (tipoCorreccion === 'ELIMINAR') prefix = '- ';
      if (tipoCorreccion === 'CANTIDAD') prefix = '~ ';
      
      printer.println(`${prefix}${item.cantidad}x ${item.nombre}`);
      printer.bold(false);
      
      if (item.notas && item.notas.trim() !== '') {
        printer.println(`  > ${item.notas}`);
      }
      
      // Si hay cantidad anterior y nueva, mostrar el cambio
      if (item.cantidadAnterior !== undefined) {
        printer.println(`  (Antes: ${item.cantidadAnterior} -> Ahora: ${item.cantidad})`);
      }
    });
  }
  
  // ========== PIE ==========
  printer.println('--------------------------------');
  printer.alignCenter();
  printer.setTextSize(0, 0);
  printer.bold(true);
  printer.println('VERIFICAR CON MESERO');
  printer.bold(false);
  
  // Corte de papel
  printer.cut();
  
  // Enviar a imprimir
  await printer.execute();
  
  logSuccess('Correccion de comanda impresa correctamente');
}

// ==========================================
// SERVIDOR EXPRESS
// ==========================================
const app = express();

// Middleware
app.use(cors({
  origin: '*', // En producción, especificar los dominios permitidos
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '1mb' }));

// Middleware de logging de requests
app.use((req, res, next) => {
  logInfo(`${req.method} ${req.path}`, { 
    ip: req.ip,
    body: req.method === 'POST' ? req.body : undefined 
  });
  next();
});

// ========== ENDPOINTS ==========

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    printer: {
      ip: CONFIG.printer.ip,
      port: CONFIG.printer.port
    }
  });
});

/**
 * Abrir caja monedera (conectada a la impresora por LAN)
 * Lo llama el sistema al procesar un cobro.
 */
app.post('/open-drawer', async (req, res) => {
  try {
    const printer = createPrinter();
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Impresora no conectada'
      });
    }
    if (typeof printer.openCashDrawer === 'function') {
      printer.openCashDrawer();
      await printer.execute();
    } else {
      printer.raw(Buffer.from([0x1b, 0x70, 0x00, 0x19, 0x19]));
      await printer.execute();
    }
    res.json({ success: true, message: 'Caja abierta' });
  } catch (error) {
    logError('Error abriendo caja', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Verificar estado de la impresora
 */
app.get('/printer-status', async (req, res) => {
  try {
    const printer = createPrinter();
    const isConnected = await printer.isPrinterConnected();
    
    res.json({
      success: true,
      connected: isConnected,
      printer: {
        ip: CONFIG.printer.ip,
        port: CONFIG.printer.port
      }
    });
  } catch (error) {
    logError('Error verificando estado de impresora', { error: error.message });
    res.json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

/**
 * Imprimir comanda de cocina
 */
app.post('/print-kitchen', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const orderData = req.body;
    
    // Validación básica
    if (!orderData || typeof orderData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Datos de orden inválidos',
        message: 'Se esperaba un objeto JSON con los datos de la comanda'
      });
    }
    
    // Imprimir con reintentos
    const result = await printWithRetry(() => printKitchenOrder(orderData));
    
    const duration = Date.now() - startTime;
    logSuccess(`Impresión completada en ${duration}ms`);
    
    res.json({
      success: true,
      message: 'Comanda impresa correctamente',
      attempts: result.attempts,
      duration: `${duration}ms`
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error imprimiendo comanda', { 
      error: error.message,
      duration: `${duration}ms`
    });
    
    // Responder rápido aunque haya fallado
    res.status(500).json({
      success: false,
      error: 'Error al imprimir',
      message: error.message,
      duration: `${duration}ms`,
      suggestion: 'Verifique que la impresora esté encendida y conectada a la red'
    });
  }
});

/**
 * Imprimir ticket de prueba
 */
app.post('/print-test', async (req, res) => {
  try {
    await printWithRetry(() => printTestTicket());
    
    res.json({
      success: true,
      message: 'Ticket de prueba impreso correctamente'
    });
  } catch (error) {
    logError('Error imprimiendo ticket de prueba', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Error al imprimir ticket de prueba',
      message: error.message
    });
  }
});

/**
 * Imprimir CORRECCIÓN DE COMANDA
 */
app.post('/print-correction', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const orderData = req.body;
    
    // Validación básica
    if (!orderData || typeof orderData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Datos de corrección inválidos',
        message: 'Se esperaba un objeto JSON con los datos de la corrección'
      });
    }
    
    // Imprimir con reintentos
    const result = await printWithRetry(() => printCorrectionOrder(orderData));
    
    const duration = Date.now() - startTime;
    logSuccess(`Corrección impresa en ${duration}ms`);
    
    res.json({
      success: true,
      message: 'Corrección de comanda impresa correctamente',
      attempts: result.attempts,
      duration: `${duration}ms`
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logError('Error imprimiendo corrección', { 
      error: error.message,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      success: false,
      error: 'Error al imprimir corrección',
      message: error.message,
      duration: `${duration}ms`,
      suggestion: 'Verifique que la impresora esté encendida y conectada a la red'
    });
  }
});

/**
 * Endpoint para imprimir múltiples comandas
 */
app.post('/print-kitchen-batch', async (req, res) => {
  const { orders } = req.body;
  
  if (!Array.isArray(orders)) {
    return res.status(400).json({
      success: false,
      error: 'Se esperaba un array de órdenes'
    });
  }
  
  const results = [];
  
  for (const order of orders) {
    try {
      await printWithRetry(() => printKitchenOrder(order));
      results.push({ success: true, mesa: order.mesa });
    } catch (error) {
      results.push({ success: false, mesa: order.mesa, error: error.message });
    }
    
    // Pequeña pausa entre impresiones
    await delay(500);
  }
  
  const successCount = results.filter(r => r.success).length;
  
  res.json({
    success: successCount === orders.length,
    message: `${successCount}/${orders.length} comandas impresas`,
    results
  });
});

// ========== MANEJO DE ERRORES ==========
app.use((err, req, res, next) => {
  logError('Error no manejado', { error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: err.message
  });
});

// ========== INICIAR SERVIDOR ==========
app.listen(CONFIG.server.port, CONFIG.server.host, () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       SERVIDOR DE IMPRESIÓN DE COCINA                ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Servidor:   http://localhost:${CONFIG.server.port}                  ║`);
  console.log(`║  Impresora:  ${CONFIG.printer.ip}:${CONFIG.printer.port}                   ║`);
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Endpoints disponibles:                              ║');
  console.log('║    GET  /health         - Estado del servidor        ║');
  console.log('║    GET  /printer-status - Estado de la impresora     ║');
  console.log('║    POST /print-kitchen  - Imprimir comanda           ║');
  console.log('║    POST /print-correction - Imprimir correccion      ║');
  console.log('║    POST /print-test     - Imprimir ticket de prueba  ║');
  console.log('║    POST /print-kitchen-batch - Imprimir multiples    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('\n');
  logInfo('Servidor iniciado correctamente');

  // Comprobación periódica de conectividad con la impresora (cada 60 s)
  const CHECK_INTERVAL_MS = 60000;
  setInterval(async () => {
    try {
      const printer = createPrinter();
      const connected = await printer.isPrinterConnected();
      if (connected) {
        logInfo('Impresora en red: OK');
      } else {
        logError('Impresora en red: sin conexión (se reintentará en el próximo envío)');
      }
    } catch (err) {
      logError('Comprobación de impresora', { error: err.message });
    }
  }, CHECK_INTERVAL_MS);

  // Long polling a Vercel: una sola petición en bucle (menos invocaciones = ahorro plan Vercel)
  const POLL_BASE_URL = (process.env.VERCEL_APP_URL || process.env.PRINT_POLLING_URL || '').replace(/\/$/, '');
  const POLL_SECRET = process.env.PRINT_POLLING_SECRET || '';

  if (POLL_BASE_URL && POLL_SECRET) {
    const pollUrl = POLL_BASE_URL + '/api/print-queue?longPoll=1';
    logInfo('Long polling a Vercel activado', { url: pollUrl });

    async function longPollLoop() {
      while (true) {
        try {
          const res = await fetch(pollUrl, {
            method: 'GET',
            headers: { 'x-print-secret': POLL_SECRET },
          });
          if (!res.ok) {
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          const data = await res.json();
          const jobs = data.jobs || [];

          const printedIds = [];
          for (const job of jobs) {
            try {
              if (job.type === 'kitchen') {
                await printWithRetry(() => printKitchenOrder(job.payload));
                printedIds.push(job.id);
              } else if (job.type === 'correction') {
                await printWithRetry(() => printCorrectionOrder(job.payload));
                printedIds.push(job.id);
              } else if (job.type === 'cash_drawer') {
                await printWithRetry(() => openCashDrawerTcp());
                printedIds.push(job.id);
              }
            } catch (err) {
              logError('Error imprimiendo trabajo ' + job.id, { error: err.message });
            }
          }

          if (printedIds.length > 0) {
            await fetch(POLL_BASE_URL + '/api/print-queue', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'x-print-secret': POLL_SECRET },
              body: JSON.stringify({ printedIds }),
            });
          }
        } catch (err) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    longPollLoop();
  } else {
    logInfo('Long polling a Vercel desactivado (configure VERCEL_APP_URL y PRINT_POLLING_SECRET para activar)');
  }
});

// Manejo de cierre graceful
process.on('SIGINT', () => {
  logInfo('Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logInfo('Cerrando servidor...');
  process.exit(0);
});
