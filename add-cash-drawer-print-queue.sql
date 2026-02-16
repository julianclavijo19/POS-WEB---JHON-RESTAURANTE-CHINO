-- Agregar type "cash_drawer" a la tabla print_queue.
-- Ejecutar en Supabase SQL Editor.
-- La caja monedera (conectada por RJ11 a la impresora) se abre al confirmar un pago;
-- el print-server envía el comando ESC/POS por TCP al detectar este tipo.

-- Eliminar el constraint actual del type
ALTER TABLE print_queue DROP CONSTRAINT IF EXISTS print_queue_type_check;

-- Añadir constraint con el nuevo tipo cash_drawer
ALTER TABLE print_queue ADD CONSTRAINT print_queue_type_check
  CHECK (type IN ('kitchen', 'correction', 'cash_drawer'));
