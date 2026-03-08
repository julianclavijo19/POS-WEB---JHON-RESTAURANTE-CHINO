/**
 * Long polling a Supabase print_queue
 * Procesa trabajos: kitchen, correction, cash_drawer
 */

const net = require('net');

// Comando ESC/POS para abrir caja monedera (pin 2)
const CASH_DRAWER_CMD = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

/**
 * Abre la caja monedera enviando comando ESC/POS por TCP
 */
function openCashDrawer(host, port = 9100) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout conectando a impresora'));
    });
    socket.on('error', (err) => reject(err));
    socket.on('close', () => resolve());

    socket.connect(port, host, () => {
      socket.write(CASH_DRAWER_CMD, (err) => {
        if (err) reject(err);
        else socket.end();
      });
    });
  });
}

/**
 * Procesa un registro de print_queue
 */
async function processQueueItem(supabase, item, handlers, logInfo, logError, logSuccess) {
  const { id, type, payload } = item;

  try {
    if (type === 'cash_drawer') {
      const printerConfig = handlers.printerConfig || {};
      const host = printerConfig.ip || process.env.PRINTER_IP || '192.168.1.110';
      const port = printerConfig.port || parseInt(process.env.PRINTER_PORT || '9100', 10);
      await openCashDrawer(host, port);
      logSuccess(`Caja monedera abierta (job ${id})`);
    } else if (type === 'kitchen' && handlers.printKitchen) {
      await handlers.printKitchen(payload || item);
      logSuccess(`Comanda impresa (job ${id})`);
    } else if (type === 'correction' && handlers.printCorrection) {
      await handlers.printCorrection(payload || item);
      logSuccess(`Corrección impresa (job ${id})`);
    } else {
      logInfo(`Tipo no manejado: ${type}`);
      // Marcar como procesado para no reintentar
    }

    await supabase
      .from('print_queue')
      .update({ printed_at: new Date().toISOString() })
      .eq('id', id);
  } catch (err) {
    logError(`Error procesando job ${id} (${type}):`, { error: err.message });
    // No actualizar printed_at para que se reintente en el próximo ciclo
  }
}

/**
 * Ejecuta un ciclo de polling
 */
async function pollCycle(supabase, handlers, logInfo, logError, logSuccess) {
  try {
    const { data: items, error } = await supabase
      .from('print_queue')
      .select('id, uuid, type, payload, created_at')
      .is('printed_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      logError('Error consultando print_queue:', { error: error.message });
      return;
    }

    if (items && items.length > 0) {
      for (const item of items) {
        await processQueueItem(supabase, item, handlers, logInfo, logError, logSuccess);
      }
    }
  } catch (err) {
    logError('Error en ciclo de polling:', { error: err.message });
  }
}

/**
 * Inicia el long polling
 */
function startPoller(supabase, handlers, logInfo, logError, logSuccess, intervalMs = 3000) {
  const run = () => pollCycle(supabase, handlers, logInfo, logError, logSuccess);

  // Primer ciclo después de 2 segundos
  setTimeout(run, 2000);

  // Ciclos periódicos
  setInterval(run, intervalMs);

  logInfo(`Long polling iniciado (intervalo: ${intervalMs}ms)`);
}

module.exports = { startPoller, openCashDrawer };
