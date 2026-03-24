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

// Generar contenido del ticket de cuenta (para cliente) — versión texto plano (fallback)
export function generateInvoiceTicket(order: OrderData): string {
  const config = getConfig()
  const width = config.paperWidth === 58 ? 32 : 42
  const thinLine = '─'.repeat(width)
  const thickLine = '━'.repeat(width)
  const lines: string[] = []

  lines.push('')
  lines.push(centerText(config.restaurantName.toUpperCase(), width))
  if (config.nit) lines.push(centerText(`NIT: ${config.nit}`, width))
  if (config.address) lines.push(centerText(config.address, width))
  if (config.phone) lines.push(centerText(`Tel: ${config.phone}`, width))
  lines.push(thickLine)

  const dateStr = new Date(order.createdAt || Date.now()).toLocaleString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota'
  })
  lines.push(leftRightText(`Orden: #${order.orderNumber}`, dateStr, width))
  if (order.tableName) {
    const waiterStr = order.waiterName ? `  ${order.waiterName}` : ''
    lines.push(`Mesa: ${order.tableName}${waiterStr}`)
  } else if (order.waiterName) {
    lines.push(`Atendido: ${order.waiterName}`)
  }
  lines.push(thinLine)
  lines.push(leftRightText('CANT  PRODUCTO', 'PRECIO', width))
  lines.push(thinLine)

  order.items.forEach(item => {
    const qty = `${item.quantity}x`
    const price = formatPrice(item.quantity * item.unitPrice)
    const maxName = width - qty.length - price.length - 4
    const name = item.product.name.length > maxName
      ? item.product.name.substring(0, maxName)
      : item.product.name
    lines.push(leftRightText(`${qty}  ${name}`, price, width))
  })

  lines.push(thinLine)
  if (order.subtotal && order.subtotal !== order.total) {
    lines.push(leftRightText('  Subtotal', formatPrice(order.subtotal), width))
  }
  if (order.discount && order.discount > 0) {
    lines.push(leftRightText('  Descuento', `-${formatPrice(order.discount)}`, width))
  }
  if (order.tax && order.tax > 0) {
    lines.push(leftRightText('  IVA', formatPrice(order.tax), width))
  }
  if (order.tip && order.tip > 0) {
    lines.push(leftRightText('  Propina', formatPrice(order.tip), width))
  }
  lines.push(thickLine)
  lines.push(leftRightText('  TOTAL', formatPrice(order.total), width))
  lines.push(thickLine)

  if (order.paymentMethod) {
    const methodNames: Record<string, string> = {
      'cash': 'Efectivo', 'CASH': 'Efectivo',
      'card': 'Tarjeta', 'CARD': 'Tarjeta',
      'transfer': 'Transferencia', 'TRANSFER': 'Transferencia',
      'mixed': 'Mixto', 'SPLIT': 'Mixto'
    }
    const method = methodNames[order.paymentMethod] || order.paymentMethod
    lines.push('')
    if ((order.paymentMethod === 'cash' || order.paymentMethod === 'CASH') && order.receivedAmount) {
      lines.push(leftRightText(`Pago: ${method}`, formatPrice(order.receivedAmount), width))
      lines.push(leftRightText('Cambio', formatPrice(order.changeAmount || 0), width))
    } else {
      lines.push(`Pago: ${method}`)
    }
  }

  lines.push('')
  if (config.footer) lines.push(centerText(config.footer, width))
  lines.push('')
  lines.push('')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Datos extra opcionales para la factura HTML (número de factura, cliente)
// ---------------------------------------------------------------------------
export interface InvoiceExtras {
  invoiceNumber?: string
  customerName?: string
  customerNit?: string
  customerAddress?: string
}

// ---------------------------------------------------------------------------
// Genera el HTML visual del recibo para impresión térmica 80 mm
// ---------------------------------------------------------------------------
export function generateInvoiceHTML(
  order: OrderData,
  extras?: InvoiceExtras,
  overrideConfig?: Partial<TicketConfig>,
  overrideLogoUrl?: string | null
): string {
  const config = { ...getConfig(), ...overrideConfig }
  const logoUrl = overrideLogoUrl !== undefined ? overrideLogoUrl : getLogoUrl()

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)

  const now = new Date(order.createdAt || Date.now())
  const dateStr = now.toLocaleDateString('es-CO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Bogota',
  })
  const timeStr = now.toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota',
  })

  const methodNames: Record<string, string> = {
    cash: 'Efectivo', CASH: 'Efectivo',
    card: 'Tarjeta', CARD: 'Tarjeta',
    transfer: 'Transferencia', TRANSFER: 'Transferencia',
    mixed: 'Mixto', SPLIT: 'Mixto',
  }

  // ------ Logo ------
  const logoHtml = logoUrl
    ? `<div class="logo-wrap"><img src="${logoUrl}" alt="Logo" /></div>`
    : ''

  // ------ Header info (NIT, address, phone) ------
  const headerDetails = [
    config.nit ? `NIT: ${config.nit}` : '',
    config.address || '',
    config.phone ? `Tel: ${config.phone}` : '',
  ]
    .filter(Boolean)
    .map(l => `<div class="header-info">${l}</div>`)
    .join('')

  // ------ Invoice number / order / mesa ------
  const invNumber = extras?.invoiceNumber
    ? extras.invoiceNumber
    : `ORD-${String(order.orderNumber).padStart(4, '0')}`

  let mesaLine = ''
  if (order.tableName) {
    const waiterPart = order.waiterName ? `<span>${order.waiterName}</span>` : ''
    mesaLine = `<div class="info-row"><span>Mesa: <b>${order.tableName}</b></span>${waiterPart}</div>`
  } else if (order.waiterName) {
    mesaLine = `<div class="info-row"><span>Atendido por: <b>${order.waiterName}</b></span></div>`
  }

  // ------ Customer ------
  const customer = extras?.customerName || 'Consumidor Final'
  const customerNit = extras?.customerNit || 'CF'
  const customerAddress = extras?.customerAddress || ''
  const customerBlock = `
    <div class="section customer-block">
      <div class="customer-label">Factura para:</div>
      <div class="customer-name">${customer}</div>
      <div class="customer-sub">NIT / CC: ${customerNit}</div>
      ${customerAddress ? `<div class="customer-sub">${customerAddress}</div>` : ''}
    </div>`

  // ------ Items ------
  const itemRows = order.items
    .map(item => {
      const unit = fmt(item.unitPrice)
      const total = fmt(item.quantity * item.unitPrice)
      const notesHtml = item.notes
        ? `<div class="item-note">${item.notes}</div>`
        : ''
      return `
      <tr>
        <td class="td-product">${item.product.name}${notesHtml}</td>
        <td class="td-unit">${unit}</td>
        <td class="td-qty">${item.quantity}</td>
        <td class="td-total">${total}</td>
      </tr>`
    })
    .join('')

  // ------ Totals ------
  const showSubtotal = order.subtotal != null && order.subtotal !== order.total
  const subtotalRow = showSubtotal
    ? `<tr><td colspan="3" class="td-label">Subtotal</td><td class="td-amount">${fmt(order.subtotal!)}</td></tr>`
    : ''
  const discountRow =
    order.discount && order.discount > 0
      ? `<tr><td colspan="3" class="td-label">Descuento</td><td class="td-amount td-discount">- ${fmt(order.discount)}</td></tr>`
      : ''
  const taxRow =
    order.tax && order.tax > 0
      ? `<tr><td colspan="3" class="td-label">IVA</td><td class="td-amount">${fmt(order.tax)}</td></tr>`
      : ''
  const tipRow =
    order.tip && order.tip > 0
      ? `<tr><td colspan="3" class="td-label">Propina</td><td class="td-amount">${fmt(order.tip)}</td></tr>`
      : ''

  // ------ Payment ------
  let paymentHtml = ''
  if (order.paymentMethod) {
    const method = methodNames[order.paymentMethod] || order.paymentMethod
    paymentHtml = `<div class="divider-dashed"></div><table class="totals-table">`
    if (
      (order.paymentMethod === 'cash' || order.paymentMethod === 'CASH') &&
      order.receivedAmount
    ) {
      paymentHtml += `
        <tr><td colspan="3" class="td-label">Pago (${method})</td><td class="td-amount">${fmt(order.receivedAmount)}</td></tr>
        <tr><td colspan="3" class="td-label">Cambio</td><td class="td-amount">${fmt(order.changeAmount || 0)}</td></tr>`
    } else {
      paymentHtml += `<tr><td colspan="4" class="td-label">Forma de pago: <b>${method}</b></td></tr>`
    }
    paymentHtml += `</table>`
  }

  // ------ Footer ------
  const footerHtml = config.footer
    ? `<div class="footer-text">${config.footer}</div>`
    : ''

  return `
${logoHtml}
<div class="header-block">
  <div class="rest-name">${config.restaurantName.toUpperCase()}</div>
  ${headerDetails}
</div>
<div class="divider-thick"></div>
<div class="invoice-title">FACTURA DE VENTA</div>
<div class="info-row">
  <span>No: <b>${invNumber}</b></span>
  <span>${dateStr}</span>
</div>
<div class="info-row">
  <span>Hora: ${timeStr}</span>
  ${order.customerCount && order.customerCount > 1 ? `<span>Comensales: ${order.customerCount}</span>` : ''}
</div>
${mesaLine}
<div class="divider-thin"></div>
${customerBlock}
<div class="divider-dashed"></div>
<table class="items-table">
  <thead>
    <tr>
      <th class="th-product">Producto</th>
      <th class="th-unit">P.Unit</th>
      <th class="th-qty">Cant</th>
      <th class="th-total">Total</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
  </tbody>
</table>
<div class="divider-dashed"></div>
<table class="totals-table">
  <tbody>
    ${subtotalRow}
    ${discountRow}
    ${taxRow}
    ${tipRow}
  </tbody>
</table>
<div class="divider-thick"></div>
<table class="totals-table">
  <tbody>
    <tr class="total-final-row">
      <td colspan="3" class="td-total-label">TOTAL</td>
      <td class="td-total-amount">${fmt(order.total)}</td>
    </tr>
  </tbody>
</table>
<div class="divider-thick"></div>
${paymentHtml}
${footerHtml}
<div class="spacer"></div>
`
}

// ---------------------------------------------------------------------------
// CSS compartido para el recibo HTML (impresión térmica 80 mm)
// ---------------------------------------------------------------------------
export function getInvoiceReceiptStyles(paperWidth: string): string {
  return `
    <style>
      @page {
        size: ${paperWidth} auto;
        margin: 0;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Courier New', 'Lucida Console', monospace;
        font-size: 12px;
        width: ${paperWidth};
        padding: 4mm 3mm 2mm;
        background: #fff;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Logo */
      .logo-wrap {
        text-align: center;
        margin-bottom: 5px;
      }
      .logo-wrap img {
        max-width: 58%;
        max-height: 80px;
        object-fit: contain;
      }
      /* Header */
      .header-block { text-align: center; margin-bottom: 3px; }
      .rest-name {
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.5px;
        line-height: 1.2;
        margin-bottom: 2px;
      }
      .header-info { font-size: 10px; line-height: 1.4; }
      /* Dividers */
      .divider-thick {
        border: none;
        border-top: 3px double #000;
        margin: 4px 0;
      }
      .divider-thin {
        border: none;
        border-top: 1px solid #000;
        margin: 3px 0;
      }
      .divider-dashed {
        border: none;
        border-top: 1px dashed #000;
        margin: 4px 0;
      }
      /* Invoice title */
      .invoice-title {
        text-align: center;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: 1px;
        margin: 3px 0 4px;
      }
      /* Info rows (order #, date, mesa) */
      .info-row {
        display: flex;
        justify-content: space-between;
        font-size: 10px;
        margin: 1px 0;
      }
      /* Customer block */
      .customer-block { margin: 3px 0; }
      .customer-label { font-size: 9px; text-transform: uppercase; color: #444; }
      .customer-name { font-size: 12px; font-weight: 700; margin-top: 1px; }
      .customer-sub { font-size: 10px; color: #333; }
      /* Items table */
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
      }
      .items-table thead tr {
        border-bottom: 1px solid #000;
      }
      .items-table th {
        font-size: 9px;
        font-weight: 900;
        text-transform: uppercase;
        padding: 2px 1px;
      }
      .th-product { text-align: left; width: 44%; }
      .th-unit    { text-align: right; width: 22%; }
      .th-qty     { text-align: center; width: 10%; }
      .th-total   { text-align: right; width: 24%; }
      .items-table td { font-size: 11px; padding: 2px 1px; vertical-align: top; }
      .td-product { text-align: left; }
      .td-unit    { text-align: right; }
      .td-qty     { text-align: center; }
      .td-total   { text-align: right; font-weight: 700; }
      .item-note  { font-size: 9px; font-style: italic; color: #555; }
      /* Totals table */
      .totals-table { width: 100%; border-collapse: collapse; margin: 3px 0; }
      .td-label   { text-align: right; font-size: 11px; padding: 1px 1px; color: #333; }
      .td-amount  { text-align: right; font-size: 11px; padding: 1px 1px; font-weight: 700; width: 35%; }
      .td-discount { color: #000; }
      /* Grand total */
      .total-final-row td { padding: 3px 1px; }
      .td-total-label {
        text-align: right;
        font-size: 15px;
        font-weight: 900;
        letter-spacing: 0.5px;
      }
      .td-total-amount {
        text-align: right;
        font-size: 15px;
        font-weight: 900;
        width: 35%;
      }
      /* Footer */
      .footer-text {
        text-align: center;
        font-size: 10px;
        margin-top: 6px;
        border-top: 1px dashed #000;
        padding-top: 5px;
        line-height: 1.5;
      }
      .spacer { height: 12px; }
      /* Screen preview */
      @media screen {
        body {
          max-width: 320px;
          margin: 0 auto;
          border: 1px dashed #ccc;
          padding: 10px;
        }
      }
      @media print {
        body { padding: 2mm; }
        @page { size: ${paperWidth} auto; margin: 0; }
      }
    </style>
  `
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
            font-size: 14px;
            font-weight: 700;
            line-height: 1.4;
            margin: 0;
            padding: 3mm;
            width: ${paperWidth};
            background: white;
            color: #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            -webkit-text-stroke: 0.3px #000;
            letter-spacing: 0.3px;
          }
          pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-family: inherit;
            font-size: inherit;
            font-weight: 700;
            color: #000;
            -webkit-text-stroke: 0.3px #000;
          }
          @media print {
            body {
              width: ${paperWidth};
              padding: 2mm;
              background: white !important;
              color: #000 !important;
              font-weight: 700 !important;
              -webkit-text-stroke: 0.3px #000 !important;
            }
            pre { 
              color: #000 !important; 
              font-weight: 700 !important;
              -webkit-text-stroke: 0.3px #000 !important;
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

/** Abrir caja monedera (conectada a la impresora por LAN). Llamar después de cobrar. */
export async function openCashDrawer(): Promise<boolean> {
  try {
    const baseUrl = await getPrintServerUrl()
    if (!baseUrl) return false
    const response = await fetch(`${baseUrl}/open-drawer`, { method: 'POST' })
    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('Error abriendo caja:', error)
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

/** Encolar corrección para que la imprima el print-server por polling (recomendado con app en Vercel). */
export async function enqueueCorrection(data: CorrectionData): Promise<boolean> {
  try {
    const payload = {
      ...data,
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    }
    const res = await fetch('/api/print-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'correction', payload }),
    })
    if (!res.ok) return false
    const json = await res.json()
    return json?.ok === true
  } catch (error) {
    console.error('Error encolando corrección:', error)
    return false
  }
}

export async function printCorrectionTicket(data: CorrectionData): Promise<boolean> {
  // Por defecto encolar (polling); así funciona con la app en Vercel
  const useQueue = typeof window !== 'undefined' && localStorage.getItem('print_via_queue') !== 'false'
  if (useQueue) {
    return enqueueCorrection(data)
  }
  try {
    const baseUrl = await getPrintServerUrl()
    if (!baseUrl) return enqueueCorrection(data)
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
      return enqueueCorrection(data)
    }
  } catch (error) {
    console.error('❌ Error conectando con servidor de impresión para corrección:', error)
    return enqueueCorrection(data)
  }
}

// ---------------------------------------------------------------------------
// Imprime el HTML del recibo abriendo una ventana de impresión
// ---------------------------------------------------------------------------
export async function printHTMLTicket(
  htmlBody: string,
  title: string,
  paperWidth: string = '80mm'
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const printWindow = window.open('', '_blank', 'width=420,height=700')
      if (!printWindow) {
        console.error('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén permitidos.')
        resolve(false)
        return
      }

      const styles = getInvoiceReceiptStyles(paperWidth)

      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${styles}
</head>
<body>
${htmlBody}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 150);
  };
  window.onafterprint = function() { window.close(); };
<\/script>
</body>
</html>`)
      printWindow.document.close()

      setTimeout(() => {
        try { if (printWindow && !printWindow.closed) printWindow.close() } catch (_) {}
        resolve(true)
      }, 12000)
    } catch (error) {
      console.error('Error al imprimir:', error)
      resolve(false)
    }
  })
}

// Imprimir factura/ticket de pago — usa diseño HTML visual
export async function printInvoice(order: OrderData, extras?: InvoiceExtras): Promise<boolean> {
  const config = getConfig()
  const paperWidth = config.paperWidth === 58 ? '58mm' : '80mm'

  // Obtener logo: primero intenta localStorage, luego consulta la API para asegurar
  // que el logo subido por el admin en Configuración siempre aparezca
  let logoUrl = getLogoUrl()
  try {
    const res = await fetch('/api/settings')
    if (res.ok) {
      const s = await res.json()
      if (s.logo_url) {
        saveLogoUrl(s.logo_url)   // actualizar caché local
        logoUrl = s.logo_url
      } else {
        saveLogoUrl(null)
        logoUrl = null
      }
      // Actualizar también la config del restaurante con datos frescos del servidor
      if (s.restaurant_name) {
        const updated = {
          ...config,
          restaurantName: s.restaurant_name,
          address: s.address || '',
          phone: s.phone || '',
          nit: s.nit || '',
          footer: s.footer || config.footer,
        }
        saveTicketConfig(updated)
        Object.assign(config, updated)
      }
    }
  } catch (_) {
    // Si falla la red, usar lo que haya en localStorage
  }

  const htmlBody = generateInvoiceHTML(order, extras, config, logoUrl)
  return printHTMLTicket(htmlBody, `Factura #${order.orderNumber}`, paperWidth)
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
