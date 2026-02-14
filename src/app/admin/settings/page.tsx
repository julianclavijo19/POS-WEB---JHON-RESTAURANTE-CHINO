'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Save, Building2, DollarSign, CreditCard, Printer, Clock,
  Plus, Trash2, X, Upload, Image as ImageIcon, Database,
  Play, AlertTriangle, CheckCircle, Terminal
} from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  saveTicketConfig, getAutoPrintSettings, setAutoPrintSettings,
  saveLogoUrl,
  type TicketConfig 
} from '@/lib/printer'

interface Settings {
  restaurant_name: string
  address: string
  phone: string
  email: string
  nit: string
  logo_url: string
  tax_rate: number
  tax_enabled: boolean
  tip_rate: number
  tip_enabled: boolean
  currency: string
  payment_methods: PaymentMethod[]
  printers: PrinterConfig[]
  operating_hours: OperatingHours[]
}

interface PaymentMethod {
  id: string
  name: string
  enabled: boolean
  requires_reference: boolean
}

interface PrinterConfig {
  id: string
  name: string
  type: 'kitchen' | 'bar' | 'cashier'
  ip_address: string
  port: number
  enabled: boolean
}

interface OperatingHours {
  day: number
  day_name: string
  open: string
  close: string
  is_open: boolean
}

const defaultPaymentMethods: PaymentMethod[] = [
  { id: '1', name: 'Efectivo', enabled: true, requires_reference: false },
  { id: '2', name: 'Tarjeta Débito', enabled: true, requires_reference: true },
  { id: '3', name: 'Tarjeta Crédito', enabled: true, requires_reference: true },
  { id: '4', name: 'Transferencia', enabled: true, requires_reference: true },
  { id: '5', name: 'Nequi', enabled: false, requires_reference: true },
  { id: '6', name: 'Daviplata', enabled: false, requires_reference: true },
]

const defaultOperatingHours: OperatingHours[] = [
  { day: 0, day_name: 'Domingo', open: '11:00', close: '22:00', is_open: true },
  { day: 1, day_name: 'Lunes', open: '11:00', close: '22:00', is_open: true },
  { day: 2, day_name: 'Martes', open: '11:00', close: '22:00', is_open: true },
  { day: 3, day_name: 'Miércoles', open: '11:00', close: '22:00', is_open: true },
  { day: 4, day_name: 'Jueves', open: '11:00', close: '22:00', is_open: true },
  { day: 5, day_name: 'Viernes', open: '11:00', close: '23:00', is_open: true },
  { day: 6, day_name: 'Sábado', open: '11:00', close: '23:00', is_open: true },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    restaurant_name: 'Mi Restaurante',
    address: '', phone: '', email: '', nit: '', logo_url: '',
    tax_rate: 8, tax_enabled: true, tip_rate: 10, tip_enabled: true,
    currency: 'COP',
    payment_methods: defaultPaymentMethods, printers: [],
    operating_hours: defaultOperatingHours,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'payments' | 'printers' | 'hours' | 'sql'>('general')
  const [showPrinterModal, setShowPrinterModal] = useState(false)
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null)
  const [printerForm, setPrinterForm] = useState<PrinterConfig>({
    id: '', name: '', type: 'kitchen', ip_address: '', port: 9100, enabled: true
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [sqlQuery, setSqlQuery] = useState('')
  const [sqlResult, setSqlResult] = useState<any>(null)
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [runningSql, setRunningSql] = useState(false)
  const [sqlHistory, setSqlHistory] = useState<string[]>([])

  useEffect(() => { fetchSettings() }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setSettings(prev => ({
            ...prev, ...data,
            payment_methods: data.payment_methods || defaultPaymentMethods,
            printers: data.printers || [],
            operating_hours: data.operating_hours || defaultOperatingHours,
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally { setLoading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        toast.success('Configuración guardada exitosamente')
        saveLogoUrl(settings.logo_url || null)
      }
      else toast.error('Error al guardar')
    } catch { toast.error('Error al guardar configuración') }
    finally { setSaving(false) }
  }

  const togglePaymentMethod = (id: string) => {
    setSettings({ ...settings, payment_methods: settings.payment_methods.map(pm => pm.id === id ? { ...pm, enabled: !pm.enabled } : pm) })
  }
  const toggleOperatingDay = (day: number) => {
    setSettings({ ...settings, operating_hours: settings.operating_hours.map(oh => oh.day === day ? { ...oh, is_open: !oh.is_open } : oh) })
  }
  const updateOperatingHours = (day: number, field: 'open' | 'close', value: string) => {
    setSettings({ ...settings, operating_hours: settings.operating_hours.map(oh => oh.day === day ? { ...oh, [field]: value } : oh) })
  }

  const handleSavePrinter = () => {
    if (editingPrinter) {
      setSettings({ ...settings, printers: settings.printers.map(p => p.id === editingPrinter.id ? printerForm : p) })
    } else {
      setSettings({ ...settings, printers: [...settings.printers, { ...printerForm, id: Date.now().toString() }] })
    }
    setShowPrinterModal(false)
    setEditingPrinter(null)
    setPrinterForm({ id: '', name: '', type: 'kitchen', ip_address: '', port: 9100, enabled: true })
  }

  const handleDeletePrinter = (id: string) => {
    if (confirm('¿Eliminar esta impresora?')) {
      setSettings({ ...settings, printers: settings.printers.filter(p => p.id !== id) })
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { toast.error('El logo no debe pesar más de 500KB'); return }
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten archivos de imagen'); return }
    setUploadingLogo(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      setSettings({ ...settings, logo_url: event.target?.result as string })
      setUploadingLogo(false)
      toast.success('Logo cargado. Recuerda guardar los cambios.')
    }
    reader.onerror = () => { setUploadingLogo(false); toast.error('Error al leer el archivo') }
    reader.readAsDataURL(file)
  }

  const handleRunSQL = async () => {
    if (!sqlQuery.trim()) { toast.error('Escribe una consulta SQL'); return }
    setRunningSql(true); setSqlResult(null); setSqlError(null)
    try {
      const res = await fetch('/api/system/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSqlResult(data)
        setSqlHistory(prev => [sqlQuery.trim(), ...prev.slice(0, 19)])
        toast.success(data.message || 'Consulta ejecutada')
      } else { setSqlError(data.error || 'Error ejecutando consulta') }
    } catch { setSqlError('Error de conexión con el servidor') }
    finally { setRunningSql(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configuración del Sistema</h1>
          <p className="text-sm text-gray-500 mt-1">Administra los ajustes generales del restaurante</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {([
            { id: 'general', label: 'General', icon: Building2 },
            { id: 'financial', label: 'Impuestos', icon: DollarSign },
            { id: 'payments', label: 'Métodos de Pago', icon: CreditCard },
            { id: 'printers', label: 'Impresoras', icon: Printer },
            { id: 'hours', label: 'Horarios', icon: Clock },
            { id: 'sql', label: 'SQL Editor', icon: Database },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Logo */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <ImageIcon className="h-5 w-5 text-gray-600" />
              Logo del Restaurante
            </h2>
            <p className="text-sm text-gray-500 mb-4">El logo aparecerá en las facturas impresas y reportes. Máximo 500KB.</p>
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-gray-300" />
                )}
              </div>
              <div className="space-y-3">
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploadingLogo ? 'Cargando...' : 'Subir Logo'}
                </button>
                {settings.logo_url && (
                  <button onClick={() => setSettings({ ...settings, logo_url: '' })}
                    className="inline-flex items-center gap-2 px-4 py-2 text-red-600 text-sm font-medium rounded-md border border-red-200 hover:bg-red-50 transition-colors ml-2">
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Restaurant Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-600" />
              Información del Restaurante
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante</label>
                <input type="text" value={settings.restaurant_name}
                  onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NIT / RUT</label>
                <input type="text" value={settings.nit} placeholder="000.000.000-0"
                  onChange={(e) => setSettings({ ...settings, nit: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={settings.address} placeholder="Calle, número, barrio, ciudad..."
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="text" value={settings.phone} placeholder="+57 300 123 4567"
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                <input type="email" value={settings.email} placeholder="contacto@restaurante.com"
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-600" />
            Configuración Financiera
          </h2>
          <div className="space-y-6">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
              <select value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent">
                <option value="COP">COP - Peso Colombiano</option>
                <option value="MXN">MXN - Peso Mexicano</option>
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="ARS">ARS - Peso Argentino</option>
                <option value="PEN">PEN - Sol Peruano</option>
              </select>
            </div>

            {/* Tax Toggle */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Impuesto (IVA)</label>
                  <p className="text-xs text-gray-500 mt-0.5">Habilitar o deshabilitar el cobro de impuestos en todas las ventas</p>
                </div>
                <button onClick={() => setSettings({ ...settings, tax_enabled: !settings.tax_enabled })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings.tax_enabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings.tax_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {settings.tax_enabled ? (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tasa de IVA (%)</label>
                    <input type="number" step="0.1" min="0" max="100" value={settings.tax_rate}
                      onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-700">Se aplicará {settings.tax_rate}% de IVA a todas las ventas</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <p className="text-xs text-yellow-700 font-medium">El impuesto está deshabilitado. Las ventas se registrarán sin IVA.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tip */}
            <div className="border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Propina Sugerida</label>
                  <p className="text-xs text-gray-500 mt-0.5">Mostrar propina sugerida en la cuenta</p>
                </div>
                <button onClick={() => setSettings({ ...settings, tip_enabled: !settings.tip_enabled })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${settings.tip_enabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings.tip_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {settings.tip_enabled && (
                <div className="w-32 pt-3 border-t border-gray-100">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Porcentaje (%)</label>
                  <input type="number" step="1" min="0" max="100" value={settings.tip_rate}
                    onChange={(e) => setSettings({ ...settings, tip_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-600" />
            Métodos de Pago Aceptados
          </h2>
          <div className="space-y-3">
            {settings.payment_methods.map(method => (
              <div key={method.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${method.enabled ? 'border-gray-300 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => togglePaymentMethod(method.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${method.enabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${method.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <div>
                    <p className={`font-medium ${method.enabled ? 'text-gray-900' : 'text-gray-500'}`}>{method.name}</p>
                    {method.requires_reference && <p className="text-xs text-gray-500">Requiere número de referencia</p>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded ${method.enabled ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {method.enabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Printers Tab */}
      {activeTab === 'printers' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Printer className="h-5 w-5 text-gray-600" />
                Impresoras de Cocina y Tickets
              </h2>
              <button onClick={() => { setEditingPrinter(null); setPrinterForm({ id: '', name: '', type: 'kitchen', ip_address: '', port: 9100, enabled: true }); setShowPrinterModal(true) }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors">
                <Plus className="h-4 w-4" /> Agregar Impresora
              </button>
            </div>
            {settings.printers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Printer className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p className="font-medium text-gray-900">No hay impresoras configuradas</p>
                <p className="text-sm">Agrega una impresora para enviar comandas automáticamente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.printers.map(printer => (
                  <div key={printer.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${printer.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-600">
                        <Printer className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{printer.name}</p>
                        <p className="text-sm text-gray-500">{printer.type === 'kitchen' ? 'Cocina' : printer.type === 'bar' ? 'Bar' : 'Caja'} • {printer.ip_address}:{printer.port}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${printer.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {printer.enabled ? 'Activa' : 'Inactiva'}
                      </span>
                      <button onClick={() => { setEditingPrinter(printer); setPrinterForm(printer); setShowPrinterModal(true) }}
                        className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDeletePrinter(printer.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <AutoPrintSettings />
        </div>
      )}

      {/* Operating Hours Tab */}
      {activeTab === 'hours' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Horarios de Operación
          </h2>
          <div className="space-y-3">
            {settings.operating_hours.map(day => (
              <div key={day.day} className={`flex items-center justify-between p-4 rounded-lg border ${day.is_open ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center gap-4 w-48">
                  <button onClick={() => toggleOperatingDay(day.day)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${day.is_open ? 'bg-gray-900' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${day.is_open ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className={`font-medium ${day.is_open ? 'text-gray-900' : 'text-gray-500'}`}>{day.day_name}</span>
                </div>
                {day.is_open ? (
                  <div className="flex items-center gap-2">
                    <input type="time" value={day.open} onChange={(e) => updateOperatingHours(day.day, 'open', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                    <span className="text-gray-500">a</span>
                    <input type="time" value={day.close} onChange={(e) => updateOperatingHours(day.day, 'close', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                  </div>
                ) : <span className="text-gray-400 text-sm">Cerrado</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SQL Editor Tab */}
      {activeTab === 'sql' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-gray-600" />
                Editor SQL
              </h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Supabase</span>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                <div className="text-xs text-yellow-700">
                  <p className="font-medium">Las consultas se ejecutan directamente en la base de datos.</p>
                  <p className="mt-1">USE SELECT para consultar. INSERT/UPDATE/DELETE se aplican inmediatamente.</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <textarea value={sqlQuery} onChange={(e) => setSqlQuery(e.target.value)}
                placeholder="SELECT * FROM settings ORDER BY key;"
                rows={6}
                className="w-full px-4 py-3 bg-gray-900 text-green-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-500 placeholder-gray-600 resize-y"
                onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleRunSQL() }} />
              <div className="absolute bottom-3 right-3 text-xs text-gray-500">Ctrl+Enter para ejecutar</div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleRunSQL} disabled={runningSql || !sqlQuery.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors">
                <Play className="h-4 w-4" /> {runningSql ? 'Ejecutando...' : 'Ejecutar'}
              </button>
              <select value="" onChange={(e) => { if (e.target.value) setSqlQuery(e.target.value) }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Consultas rápidas...</option>
                <option value="SELECT * FROM settings ORDER BY key;">Ver configuración</option>
                <option value="SELECT id, name, email, role, is_active FROM users ORDER BY name;">Ver usuarios</option>
                <option value="SELECT id, name, category_id, price, is_available FROM products ORDER BY name;">Ver productos</option>
                <option value="SELECT id, name, description, is_active FROM categories ORDER BY display_order;">Ver categorías</option>
                <option value="SELECT id, order_number, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;">Últimas órdenes</option>
                <option value="SELECT id, amount, method, status, created_at FROM payments ORDER BY created_at DESC LIMIT 20;">Últimos pagos</option>
                <option value="SELECT * FROM tables ORDER BY name;">Ver mesas</option>
                <option value={`SELECT column_name, data_type, table_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;`}>Estructura de tablas</option>
              </select>
            </div>
          </div>

          {sqlError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1 font-mono">{sqlError}</p>
                </div>
              </div>
            </div>
          )}

          {sqlResult && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">{sqlResult.message || `${sqlResult.data?.length || 0} registros`}</span>
                </div>
              </div>
              {sqlResult.data && sqlResult.data.length > 0 && (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {Object.keys(sqlResult.data[0]).map(col => (
                          <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sqlResult.data.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {Object.values(row).map((val: any, j: number) => (
                            <td key={j} className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate font-mono text-xs">
                              {val === null ? <span className="text-gray-400 italic">NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {sqlHistory.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Historial</h3>
              <div className="space-y-2">
                {sqlHistory.slice(0, 5).map((q, i) => (
                  <button key={i} onClick={() => setSqlQuery(q)}
                    className="w-full text-left px-3 py-2 text-xs font-mono text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 truncate transition-colors">{q}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printer Modal */}
      {showPrinterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editingPrinter ? 'Editar Impresora' : 'Nueva Impresora'}</h2>
              <button onClick={() => setShowPrinterModal(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={printerForm.name} onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" placeholder="Ej: Impresora Cocina 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={printerForm.type} onChange={(e) => setPrinterForm({ ...printerForm, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent">
                  <option value="kitchen">Cocina</option>
                  <option value="bar">Bar</option>
                  <option value="cashier">Caja (Tickets)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección IP</label>
                  <input type="text" value={printerForm.ip_address} onChange={(e) => setPrinterForm({ ...printerForm, ip_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" placeholder="192.168.1.100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Puerto</label>
                  <input type="number" value={printerForm.port} onChange={(e) => setPrinterForm({ ...printerForm, port: parseInt(e.target.value) || 9100 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Habilitada</span>
                <button onClick={() => setPrinterForm({ ...printerForm, enabled: !printerForm.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${printerForm.enabled ? 'bg-gray-900' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${printerForm.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowPrinterModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Cancelar</button>
              <button onClick={handleSavePrinter} disabled={!printerForm.name || !printerForm.ip_address}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors">
                <Save className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AutoPrintSettings() {
  const [autoPrint, setAutoPrint] = useState({ kitchen: false, invoice: false })
  const [ticketConfig, setTicketConfig] = useState({
    restaurantName: 'RESTAURANTE', address: '', phone: '', nit: '',
    footer: '¡Gracias por su visita!', paperWidth: 80 as 58 | 80
  })

  useEffect(() => {
    setAutoPrint(getAutoPrintSettings())
    try {
      const saved = localStorage.getItem('printer_config')
      if (saved) setTicketConfig(prev => ({ ...prev, ...JSON.parse(saved) }))
    } catch {}
  }, [])

  const handleAutoPrintChange = (key: 'kitchen' | 'invoice', value: boolean) => {
    const s = { ...autoPrint, [key]: value }
    setAutoPrint(s)
    setAutoPrintSettings(s)
    toast.success('Configuración de impresión actualizada')
  }
  const handleTicketConfigChange = (key: string, value: string | number) => {
    const c = { ...ticketConfig, [key]: value }
    setTicketConfig(c)
    saveTicketConfig(c)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
        <Printer className="h-5 w-5 text-gray-600" />
        Impresión Automática
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Imprimir comandas automáticamente</p>
            <p className="text-sm text-gray-500">Imprime el ticket de cocina cuando el mesero envía un pedido</p>
          </div>
          <button onClick={() => handleAutoPrintChange('kitchen', !autoPrint.kitchen)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPrint.kitchen ? 'bg-gray-900' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoPrint.kitchen ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">Imprimir facturas automáticamente</p>
            <p className="text-sm text-gray-500">Imprime la factura cuando se procesa un pago en caja</p>
          </div>
          <button onClick={() => handleAutoPrintChange('invoice', !autoPrint.invoice)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPrint.invoice ? 'bg-gray-900' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoPrint.invoice ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
      <div className="border-t pt-6">
        <h3 className="font-medium text-gray-900 mb-4">Datos del Ticket</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante</label>
            <input type="text" value={ticketConfig.restaurantName} onChange={(e) => handleTicketConfigChange('restaurantName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
            <input type="text" value={ticketConfig.nit} onChange={(e) => handleTicketConfigChange('nit', e.target.value)} placeholder="000.000.000-0"
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input type="text" value={ticketConfig.address} onChange={(e) => handleTicketConfigChange('address', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input type="text" value={ticketConfig.phone} onChange={(e) => handleTicketConfigChange('phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje de pie de ticket</label>
            <input type="text" value={ticketConfig.footer} onChange={(e) => handleTicketConfigChange('footer', e.target.value)} placeholder="¡Gracias por su visita!"
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ancho de papel</label>
            <select value={ticketConfig.paperWidth} onChange={(e) => handleTicketConfigChange('paperWidth', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent">
              <option value={58}>58mm (térmica pequeña)</option>
              <option value={80}>80mm (térmica estándar)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
