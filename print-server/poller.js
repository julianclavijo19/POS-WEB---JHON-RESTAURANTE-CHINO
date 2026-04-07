/**
 * Realtime listener + fallback polling para Supabase print_queue
 * Procesa trabajos: kitchen, correction, cash_drawer
 *
 * Prioridad: Realtime INSERT → fallback polling 15s (si WS cae)
 */

const net = require('net');
const { createClient } = require('@supabase/supabase-js');

// Comando ESC/POS para abrir caja monedera (pin 2)
const CASH_DRAWER_CMD = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);

// ─── Estado de conexión ───────────────────────────────────────────
let connectionStatus = 'offline'; // 'realtime' | 'polling' | 'offline'
let realtimeChannel = null;
let fallbackTimer = null;
const FALLBACK_INTERVAL_MS = 15000; // 15s fallback (antes era 3s)
const HEARTBEAT_INTERVAL_MS = 30000; // heartbeat cada 30s

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
    }

    await supabase
      .from('print_queue')
      .update({ printed_at: new Date().toISOString() })
      .eq('id', id);
  } catch (err) {
    logError(`Error procesando job ${id} (${type}):`, { error: err.message });
  }
}

/**
 * Ejecuta un ciclo de polling (fallback)
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
 * Inicia el fallback polling (solo cuando Realtime no está disponible)
 */
function startFallbackPolling(supabase, handlers, logInfo, logError, logSuccess) {
  stopFallbackPolling();
  connectionStatus = 'polling';
  logInfo(`[FALLBACK] Polling activado (intervalo: ${FALLBACK_INTERVAL_MS}ms)`);
  fallbackTimer = setInterval(
    () => pollCycle(supabase, handlers, logInfo, logError, logSuccess),
    FALLBACK_INTERVAL_MS
  );
  // Ejecutar inmediatamente al activar fallback
  pollCycle(supabase, handlers, logInfo, logError, logSuccess);
}

function stopFallbackPolling() {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
}

/**
 * Maneja un evento INSERT de Realtime
 */
function handleRealtimeInsert(newRecord, supabase, handlers, logInfo, logError, logSuccess) {
  if (newRecord.printed_at) return; // ya procesado
  logInfo(`[REALTIME] Nuevo job detectado: ${newRecord.id} (${newRecord.type})`);
  processQueueItem(supabase, newRecord, handlers, logInfo, logError, logSuccess);
}

/**
 * Inicia la suscripción Realtime + fallback polling
 */
function startPoller(supabase, handlers, logInfo, logError, logSuccess, intervalMs = 3000) {
  // Procesar jobs pendientes al inicio (puede haber jobs de antes)
  setTimeout(() => pollCycle(supabase, handlers, logInfo, logError, logSuccess), 2000);

  // Intentar suscripción Realtime
  try {
    realtimeChannel = supabase
      .channel('print-queue-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'print_queue' },
        (payload) => {
          handleRealtimeInsert(payload.new, supabase, handlers, logInfo, logError, logSuccess);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          connectionStatus = 'realtime';
          stopFallbackPolling();
          logSuccess('[REALTIME] Suscripción activa — print_queue INSERT');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logError(`[REALTIME] Error de canal: ${status}`);
          if (connectionStatus !== 'polling') {
            startFallbackPolling(supabase, handlers, logInfo, logError, logSuccess);
          }
        } else if (status === 'CLOSED') {
          logInfo('[REALTIME] Canal cerrado');
          if (connectionStatus !== 'polling') {
            startFallbackPolling(supabase, handlers, logInfo, logError, logSuccess);
          }
        }
      });

    // Heartbeat: verificar periódicamente que Realtime sigue activo
    setInterval(() => {
      if (realtimeChannel) {
        const state = realtimeChannel.state;
        if (state !== 'joined') {
          logInfo(`[HEARTBEAT] Canal en estado: ${state} — activando fallback`);
          if (connectionStatus !== 'polling') {
            startFallbackPolling(supabase, handlers, logInfo, logError, logSuccess);
          }
        } else if (connectionStatus !== 'realtime') {
          // Reconectó - desactivar fallback
          connectionStatus = 'realtime';
          stopFallbackPolling();
          logSuccess('[HEARTBEAT] Realtime reconectado — fallback desactivado');
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

  } catch (err) {
    logError('[REALTIME] No se pudo suscribir, usando polling como fallback:', { error: err.message });
    startFallbackPolling(supabase, handlers, logInfo, logError, logSuccess);
  }

  logInfo(`Poller iniciado (Realtime + fallback ${FALLBACK_INTERVAL_MS}ms)`);
}

/**
 * Retorna el estado actual de la conexión
 */
function getConnectionStatus() {
  return connectionStatus;
}

module.exports = { startPoller, openCashDrawer, getConnectionStatus };
