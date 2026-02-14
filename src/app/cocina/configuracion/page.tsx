'use client'

import { useState, useEffect } from 'react'
import {
  Settings, Bell, Clock, Printer, AlertTriangle, Volume2,
  Monitor, Save, RefreshCw, Package, Flame, Salad, IceCream, Utensils
} from 'lucide-react'
import toast from 'react-hot-toast'

interface StationConfig {
  id: string
  name: string
  icon: any
  enabled: boolean
  alertTime: number
  criticalTime: number
}

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // General settings
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 5,
    soundAlerts: true,
    visualAlerts: true,
    autoPrint: false,
    printerName: 'Cocina Principal',
    defaultAlertTime: 15,
    criticalAlertTime: 25
  })

  // Stations config
  const [stations, setStations] = useState<StationConfig[]>([
    { id: 'parrilla', name: 'Parrilla', icon: Flame, enabled: true, alertTime: 15, criticalTime: 25 },
    { id: 'cocina_fria', name: 'Cocina Fría', icon: Salad, enabled: true, alertTime: 8, criticalTime: 15 },
    { id: 'fritos', name: 'Fritos', icon: Utensils, enabled: true, alertTime: 10, criticalTime: 18 },
    { id: 'postres', name: 'Postres', icon: IceCream, enabled: true, alertTime: 8, criticalTime: 12 }
  ])

  // Out of stock items
  const [outOfStock, setOutOfStock] = useState<string[]>([
    'Camarones',
    'Langostinos'
  ])
  const [newOutOfStock, setNewOutOfStock] = useState('')

  useEffect(() => {
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Configuración guardada')
    } catch (error) {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleAddOutOfStock = () => {
    if (newOutOfStock.trim() && !outOfStock.includes(newOutOfStock.trim())) {
      setOutOfStock([...outOfStock, newOutOfStock.trim()])
      setNewOutOfStock('')
      toast.success('Ingrediente marcado como agotado')
    }
  }

  const handleRemoveOutOfStock = (item: string) => {
    setOutOfStock(outOfStock.filter(i => i !== item))
    toast.success('Ingrediente disponible nuevamente')
  }

  const handleStationChange = (stationId: string, field: string, value: any) => {
    setStations(stations.map(s => {
      if (s.id === stationId) {
        return { ...s, [field]: value }
      }
      return s
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración de Cocina</h1>
          <p className="text-gray-500 text-sm mt-1">Ajustes de alertas, tiempos e impresión</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar Cambios
        </button>
      </div>

      {/* General settings */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configuración General
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <div className="font-medium text-gray-900">Auto-actualización</div>
              <div className="text-sm text-gray-500">Actualizar comandas automáticamente</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoRefresh}
                onChange={(e) => setSettings({ ...settings, autoRefresh: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>

          {settings.autoRefresh && (
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <div className="font-medium text-gray-900">Intervalo de actualización</div>
                <div className="text-sm text-gray-500">Cada cuántos segundos se actualizan las comandas</div>
              </div>
              <select
                value={settings.refreshInterval}
                onChange={(e) => setSettings({ ...settings, refreshInterval: Number(e.target.value) })}
                className="px-3 py-2 border rounded-lg"
              >
                <option value={3}>3 segundos</option>
                <option value={5}>5 segundos</option>
                <option value={10}>10 segundos</option>
                <option value={15}>15 segundos</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Volume2 className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Alertas sonoras</div>
                <div className="text-sm text-gray-500">Sonar cuando llegue nueva comanda o se atrase</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundAlerts}
                onChange={(e) => setSettings({ ...settings, soundAlerts: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Alertas visuales</div>
                <div className="text-sm text-gray-500">Resaltar comandas urgentes o atrasadas</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.visualAlerts}
                onChange={(e) => setSettings({ ...settings, visualAlerts: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Printer className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">Impresión automática</div>
                <div className="text-sm text-gray-500">Imprimir ticket al recibir comanda</div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoPrint}
                onChange={(e) => setSettings({ ...settings, autoPrint: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Time alerts */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Tiempos de Alerta
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alerta de demora (minutos)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={settings.defaultAlertTime}
              onChange={(e) => { const v = e.target.value; if (/^[0-9]*$/.test(v)) setSettings({ ...settings, defaultAlertTime: Number(v) || 0 }) }}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Se marca en amarillo cuando pasa este tiempo</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alerta crítica (minutos)
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={settings.criticalAlertTime}
              onChange={(e) => { const v = e.target.value; if (/^[0-9]*$/.test(v)) setSettings({ ...settings, criticalAlertTime: Number(v) || 0 }) }}
              className="w-full px-4 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Se marca en rojo cuando pasa este tiempo</p>
          </div>
        </div>
      </div>

      {/* Stations config */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Utensils className="h-5 w-5" />
          Configuración de Estaciones
        </h2>

        <div className="space-y-4">
          {stations.map(station => (
            <div key={station.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${station.enabled ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <station.icon className="h-5 w-5" />
                  </div>
                  <span className="font-medium">{station.name}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={station.enabled}
                    onChange={(e) => handleStationChange(station.id, 'enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-gray-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>

              {station.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tiempo alerta (min)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={station.alertTime}
                      onChange={(e) => { const v = e.target.value; if (/^[0-9]*$/.test(v)) handleStationChange(station.id, 'alertTime', Number(v) || 0) }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tiempo crítico (min)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={station.criticalTime}
                      onChange={(e) => { const v = e.target.value; if (/^[0-9]*$/.test(v)) handleStationChange(station.id, 'criticalTime', Number(v) || 0) }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Out of stock */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Ingredientes Agotados
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Los platillos con estos ingredientes se marcarán con alerta
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newOutOfStock}
            onChange={(e) => setNewOutOfStock(e.target.value)}
            placeholder="Nombre del ingrediente"
            className="flex-1 px-4 py-2 border rounded-lg"
            onKeyPress={(e) => e.key === 'Enter' && handleAddOutOfStock()}
          />
          <button
            onClick={handleAddOutOfStock}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            Agregar
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {outOfStock.length === 0 ? (
            <p className="text-gray-400 text-sm">No hay ingredientes agotados</p>
          ) : (
            outOfStock.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full"
              >
                {item}
                <button
                  onClick={() => handleRemoveOutOfStock(item)}
                  className="hover:bg-red-200 rounded-full p-0.5"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
