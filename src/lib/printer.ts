// Utilidad para impresión de tickets y facturas
// Funciona con impresoras térmicas vía USB/Red configuradas en Windows

export interface OrderItem {
  quantity: number
  product: { name: string }
  unitPrice: number
  notes?: string
}

export interface OrderData {
  orderNumber: string | number
  tableName?: string
  waiterName?: string
  area?: string
  items: OrderItem[]
  subtotal?: number
  tax?: number
  total: number
  discount?: number
  tip?: number
  paymentMethod?: string
  receivedAmount?: number
  changeAmount?: number
  customerCount?: number
  createdAt?: string
}

export interface TicketConfig {
  restaurantName: string
  address?: string
  phone?: string
  nit?: string
  footer?: string
  printLogo?: boolean
  paperWidth?: 58 | 80 // mm
}

const DEFAULT_CONFIG: TicketConfig = {
  restaurantName: 'RESTAURANTE',
  address: '',
  phone: '',
  nit: '',
  footer: '¡Gracias por su visita!',
  paperWidth: 80,
}

// Función para obtener configuración desde localStorage o usar defaults
function getConfig(): TicketConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG

  try {
    const saved = localStorage.getItem('printer_config')
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) }
    }
  } catch (e) {
    console.error('Error loading printer config:', e)
  }
  return DEFAULT_CONFIG
}

// Guardar configuración
export function saveTicketConfig(config: Partial<TicketConfig>): void {
  if (typeof window === 'undefined') return

  const current = getConfig()
  const updated = { ...current, ...config }
  localStorage.setItem('printer_config', JSON.stringify(updated))
}

// Función para formatear línea centrada
function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(padding) + text
}

// Función para formatear línea derecha-izquierda
function leftRightText(left: string, right: string, width: number): string {
  const spaces = Math.max(1, width - left.length - right.length)
  return left + ' '.repeat(spaces) + right
}

// Generar contenido del ticket de comanda (para cocina)
export function generateKitchenTicket(order: OrderData): string {
  const config = getConfig()
  const width = config.paperWidth === 58 ? 32 : 48
  const separator = '='.repeat(width)
  const lines: string[] = []

  lines.push(centerText('*** COMANDA ***', width))
  lines.push(separator)
  lines.push('')
  lines.push(`Orden: #${order.orderNumber}`)
  if (order.tableName) lines.push(`Mesa: ${order.tableName}`)
  if (order.waiterName) lines.push(`Mesero: ${order.waiterName}`)
  if (order.customerCount && order.customerCount > 1) {
    lines.push(`Comensales: ${order.customerCount}`)
  }
  lines.push(`Hora: ${new Date(order.createdAt || Date.now()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`)
  lines.push(separator)
  lines.push('')

  // Items
  order.items.forEach(item => {
    lines.push(`${item.quantity}x ${item.product.name}`)
    if (item.notes) {
      lines.push(`   --> ${item.notes}`)
    }
  })

  lines.push('')
  lines.push(separator)
  lines.push(centerText(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, width))
  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

// Función para obtener logo desde settings del servidor
function getLogoUrl(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const logo = localStorage.getItem('restaurant_logo_url')
    return logo || null
  } catch {
    return null
  }
}

// Guardar logo URL localmente para acceso rápido en impresión
export function saveLogoUrl(url: string | null): void {
  if (typeof window === 'undefined') return
  if (url) {
    localStorage.setItem('restaurant_logo_url', url)
  } else {
    localStorage.removeItem('restaurant_logo_url')
  }
}

// Generar contenido del ticket de cuenta (para cliente)
export function generateInvoiceTicket(order: OrderData): string {
  const config = getConfig()
  const width = config.paperWidth === 58 ? 32 : 48
  const separator = '-'.repeat(width)
  const doubleSeparator = '='.repeat(width)
  const lines: string[] = []

  // Encabezado
  lines.push(centerText(config.restaurantName, width))
  if (config.nit) lines.push(centerText(`NIT: ${config.nit}`, width))
  if (config.address) lines.push(centerText(config.address, width))
  if (config.phone) lines.push(centerText(`Tel: ${config.phone}`, width))
  lines.push(doubleSeparator)

  // Info de orden
  lines.push(`Factura: #${order.orderNumber}`)
  if (order.tableName) lines.push(`Mesa: ${order.tableName}`)
  if (order.waiterName) lines.push(`Atendido por: ${order.waiterName}`)
  lines.push(`Fecha: ${new Date(order.createdAt || Date.now()).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`)
  lines.push(separator)

  // Items
  lines.push(leftRightText('CANT. DESCRIPCIÓN', 'PRECIO', width))
  lines.push(separator)

  order.items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice
    const itemName = item.product.name.substring(0, width - 15)
    lines.push(`${item.quantity}x   ${itemName}`)
    lines.push(leftRightText('', formatPrice(itemTotal), width))
  })

  lines.push(separator)

  // Totales
  lines.push(leftRightText('Subtotal:', formatPrice(order.subtotal || 0), width))

  if (order.discount && order.discount > 0) {
    lines.push(leftRightText('Descuento:', `-${formatPrice(order.discount)}`, width))
  }

  lines.push(leftRightText('IVA:', formatPrice(order.tax || 0), width))

  if (order.tip && order.tip > 0) {
    lines.push(leftRightText('Propina:', formatPrice(order.tip), width))
  }

  lines.push(doubleSeparator)
  lines.push(leftRightText('TOTAL:', formatPrice(order.total), width))
  lines.push(doubleSeparator)

  // Método de pago
  if (order.paymentMethod) {
    const methodNames: Record<string, string> = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'mixed': 'Mixto'
    }
    lines.push(`Método: ${methodNames[order.paymentMethod] || order.paymentMethod}`)
  }

  if (order.paymentMethod === 'cash' && order.receivedAmount) {
    lines.push(leftRightText('Recibido:', formatPrice(order.receivedAmount), width))
    lines.push(leftRightText('Cambio:', formatPrice(order.changeAmount || 0), width))
  }

  lines.push('')
  lines.push(separator)
  if (config.footer) {
    lines.push(centerText(config.footer, width))
  }
  lines.push('')
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

// Formatear precio
function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Imprimir usando la API de impresión del navegador
// Para impresoras USB, asegúrate de que la impresora esté configurada como predeterminada en Windows
export async function printTicket(content: string, title: string = 'Ticket', includeLogo: boolean = false): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Crear ventana de impresión
      const printWindow = window.open('', '_blank', 'width=400,height=600')

      if (!printWindow) {
        console.error('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén permitidos.')
        resolve(false)
        return
      }

      const config = getConfig()
      const paperWidth = config.paperWidth === 58 ? '58mm' : '80mm'
      const logoUrl = includeLogo ? getLogoUrl() : null

      const logoHtml = logoUrl ? `
        <div style="text-align: center; margin-bottom: 4px;">
          <img src="${logoUrl}" alt="Logo" style="max-width: 60%; max-height: 80px; object-fit: contain;" />
        </div>
      ` : ''

      const styles = `
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', 'Lucida Console', monospace;
            font-size: 12px;
            line-height: 1.3;
            margin: 0;
            padding: 3mm;
            width: ${paperWidth};
            background: white;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
            font-size: inherit;
          }
          @media print {
            body {
              width: ${paperWidth};
              padding: 2mm;
            }
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
          }
          @media screen {
            body {
              max-width: 300px;
              margin: 0 auto;
              padding: 10px;
              border: 1px dashed #ccc;
            }
          }
        </style>
      `

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <meta charset="UTF-8">
          ${styles}
        </head>
        <body>
          ${logoHtml}
          <pre>${content}</pre>
          <script>
            // Imprimir automáticamente cuando cargue
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 100);
            };
            // Cerrar ventana después de imprimir o cancelar
            window.onafterprint = function() {
              window.close();
            };
            // También cerrar si el usuario cierra el diálogo
            window.onfocus = function() {
              setTimeout(function() {
                if (!document.hidden) {
                  // Pequeño delay para asegurar que la impresión terminó
                }
              }, 500);
            };
          </script>
        </body>
        </html>
      `)

      printWindow.document.close()

      // Timeout de seguridad para cerrar la ventana
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.close()
          }
        } catch (e) {
          // Ignorar errores al cerrar
        }
        resolve(true)
      }, 10000) // 10 segundos máximo

    } catch (error) {
      console.error('Error al imprimir:', error)
      resolve(false)
    }
  })
}

/** Obtiene la URL del servidor de impresión (configurable desde Admin o variable de entorno). */
async function getPrintServerUrl(): Promise<string> {
  if (typeof window === 'undefined') {
    return (process.env.NEXT_PUBLIC_PRINT_SERVER_URL || '').trim() || 'http://localhost:3001'
  }
  let url = localStorage.getItem('print_server_url') || ''
  if (url) return url.replace(/\/$/, '')
  try {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const data = await res.json()
      url = (data.print_server_url || process.env.NEXT_PUBLIC_PRINT_SERVER_URL || '').trim()
      if (url) {
        url = url.replace(/\/$/, '')
        localStorage.setItem('print_server_url', url)
      }
    }
  } catch {
    // ignore
  }
  return url || (process.env.NEXT_PUBLIC_PRINT_SERVER_URL || '').trim() || 'http://localhost:3001'
}

// Imprimir ticket de comanda para cocina (usa impresora térmica en red)
export async function printKitchenTicket(order: OrderData): Promise<boolean> {
  try {
    const baseUrl = await getPrintServerUrl()
    if (!baseUrl) {
      console.warn('No hay URL de servidor de impresión configurada. Configure en Admin → Impresoras.')
      const content = generateKitchenTicket(order)
      return printTicket(content, `Comanda #${order.orderNumber}`)
    }
    // Preparar datos para el servidor de impresión
    const printData = {
      mesa: order.tableName || 'N/A',
      mesero: order.waiterName || 'N/A',
      area: order.area || 'N/A',
      items: order.items.map(item => ({
        nombre: item.product.name,
        cantidad: item.quantity,
        notas: item.notes || ''
      })),
      total: order.total || 0,
      hora: new Date(order.createdAt || Date.now()).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Enviar al servidor de impresión (local o en red)
    const response = await fetch(`${baseUrl}/print-kitchen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(printData)
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Comanda impresa en cocina:', order.orderNumber)
      return true
    } else {
      console.error('⚠️ Error imprimiendo comanda:', result.message)
      return false
    }
  } catch (error) {
    console.error('❌ Error conectando con servidor de impresión:', error)
    // Fallback: intentar imprimir via navegador
    console.log('📄 Intentando impresión via navegador...')
    const content = generateKitchenTicket(order)
    return printTicket(content, `Comanda #${order.orderNumber}`)
  }
}

// Enviar datos directamente al servidor de impresión
export async function sendToPrintServer(endpoint: string, data: any): Promise<boolean> {
  try {
    const baseUrl = await getPrintServerUrl()
    if (!baseUrl) return false
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('❌ Error conectando con servidor de impresión:', error)
    return false
  }
}

// Imprimir corrección de comanda (agregar, eliminar, cambio de cantidad)
export interface CorrectionData {
  tipo: 'AGREGAR' | 'ELIMINAR' | 'CANTIDAD' | 'MODIFICACION'
  mesa: string
  area?: string
  mesero: string
  items: {
    nombre: string
    cantidad: number
    cantidadAnterior?: number
    notas?: string
  }[]
}

export async function printCorrectionTicket(data: CorrectionData): Promise<boolean> {
  try {
    const baseUrl = await getPrintServerUrl()
    if (!baseUrl) return false
    const printData = {
      ...data,
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    }

    const response = await fetch(`${baseUrl}/print-correction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(printData)
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ Corrección impresa:', data.tipo)
      return true
    } else {
      console.error('⚠️ Error imprimiendo corrección:', result.message)
      return false
    }
  } catch (error) {
    console.error('❌ Error conectando con servidor de impresión para corrección:', error)
    return false
  }
}

// Imprimir factura/ticket de pago
export async function printInvoice(order: OrderData): Promise<boolean> {
  const content = generateInvoiceTicket(order)
  return printTicket(content, `Factura #${order.orderNumber}`, true)
}

// Verificar si la impresión está habilitada
export function isPrintingEnabled(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const setting = localStorage.getItem('auto_print_enabled')
    return setting === 'true'
  } catch {
    return false
  }
}

// Habilitar/deshabilitar impresión automática
export function setAutoPrintEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('auto_print_enabled', enabled ? 'true' : 'false')
}

// Obtener estado de impresión automática
export function getAutoPrintSettings(): { kitchen: boolean; invoice: boolean } {
  if (typeof window === 'undefined') return { kitchen: false, invoice: false }

  try {
    return {
      kitchen: localStorage.getItem('auto_print_kitchen') === 'true',
      invoice: localStorage.getItem('auto_print_invoice') === 'true'
    }
  } catch {
    return { kitchen: false, invoice: false }
  }
}

// Configurar impresión automática
export function setAutoPrintSettings(settings: { kitchen?: boolean; invoice?: boolean }): void {
  if (typeof window === 'undefined') return

  if (settings.kitchen !== undefined) {
    localStorage.setItem('auto_print_kitchen', settings.kitchen ? 'true' : 'false')
  }
  if (settings.invoice !== undefined) {
    localStorage.setItem('auto_print_invoice', settings.invoice ? 'true' : 'false')
  }
}
