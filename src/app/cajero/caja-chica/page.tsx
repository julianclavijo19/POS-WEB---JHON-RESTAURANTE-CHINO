'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { formatCurrency, formatMiles, parseMiles } from '@/lib/utils'
import {
  Wallet, Plus, Minus, ArrowUpRight, ArrowDownLeft,
  FileText, Search, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

interface PettyCashEntry {
  id: string
  type: 'expense' | 'income' | 'withdrawal'
  amount: number
  description: string
  category: string
  authorizedBy?: string
  receipt?: string
  createdAt: string
  createdByName: string
}

const categories = [
  'Suministros',
  'Limpieza',
  'Transporte',
  'Propinas',
  'Gastos varios',
  'Reposición de fondo',
  'Retiro autorizado'
]

export default function CajaChicaPage() {
  const [entries, setEntries] = useState<PettyCashEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState(200000)
  const [initialFund, setInitialFund] = useState(200000)
  const [showNewEntry, setShowNewEntry] = useState(false)
  const [filterDate, setFilterDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [newEntry, setNewEntry] = useState({
    type: 'expense' as 'expense' | 'income' | 'withdrawal',
    amount: '',
    description: '',
    category: '',
    authorizedBy: ''
  })

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      // Simulated data
      setEntries([
        {
          id: '1',
          type: 'expense',
          amount: 15000,
          description: 'Compra de servilletas',
          category: 'Suministros',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          createdByName: 'Juan Pérez'
        },
        {
          id: '2',
          type: 'expense',
          amount: 8000,
          description: 'Domicilio insumos',
          category: 'Transporte',
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          createdByName: 'Juan Pérez'
        },
        {
          id: '3',
          type: 'withdrawal',
          amount: 50000,
          description: 'Retiro para pagos',
          category: 'Retiro autorizado',
          authorizedBy: 'Gerencia',
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          createdByName: 'María García'
        },
        {
          id: '4',
          type: 'income',
          amount: 100000,
          description: 'Reposición de fondo',
          category: 'Reposición de fondo',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdByName: 'Admin'
        }
      ])
      setCurrentBalance(227000)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEntry = async () => {
    if (!newEntry.amount || !newEntry.description || !newEntry.category) {
      toast.error('Complete todos los campos')
      return
    }

    if (newEntry.type === 'withdrawal' && !newEntry.authorizedBy) {
      toast.error('Los retiros requieren autorización')
      return
    }

    const amount = Number(newEntry.amount)
    if (newEntry.type !== 'income' && amount > currentBalance) {
      toast.error('Saldo insuficiente')
      return
    }

    try {
      // Add to entries
      const entry: PettyCashEntry = {
        id: Date.now().toString(),
        type: newEntry.type,
        amount,
        description: newEntry.description,
        category: newEntry.category,
        authorizedBy: newEntry.authorizedBy,
        createdAt: new Date().toISOString(),
        createdByName: 'Usuario Actual'
      }

      setEntries([entry, ...entries])
      setCurrentBalance(prev =>
        newEntry.type === 'income' ? prev + amount : prev - amount
      )

      toast.success('Movimiento registrado')
      setShowNewEntry(false)
      setNewEntry({
        type: 'expense',
        amount: '',
        description: '',
        category: '',
        authorizedBy: ''
      })
    } catch (error) {
      toast.error('Error al registrar')
    }
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDate = !filterDate || entry.createdAt.startsWith(filterDate)
    return matchesSearch && matchesDate
  })

  const todayExpenses = entries
    .filter(e => e.type === 'expense' && new Date(e.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, e) => sum + e.amount, 0)

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
          <h1 className="text-2xl font-semibold text-gray-900">Caja Chica</h1>
          <p className="text-gray-500 text-sm mt-1">Control de gastos menores</p>
        </div>
        <Button
          onClick={() => setShowNewEntry(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-gray-900">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Wallet className="h-5 w-5 text-gray-700" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Saldo Actual</div>
                <div className="text-xl font-semibold text-gray-900">{formatCurrency(currentBalance)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ArrowDownLeft className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Fondo Inicial</div>
                <div className="text-xl font-semibold">{formatCurrency(initialFund)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <ArrowUpRight className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Gastos Hoy</div>
                <div className="text-xl font-semibold">{formatCurrency(todayExpenses)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Movimientos</div>
                <div className="text-xl font-semibold">{entries.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar movimientos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      </div>

      {/* Entries list */}
      <Card>
        <CardContent className="p-0 divide-y">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay movimientos</p>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${entry.type === 'income' ? 'bg-gray-100' :
                    entry.type === 'withdrawal' ? 'bg-gray-200' : 'bg-gray-50'
                    }`}>
                    {entry.type === 'income' ? (
                      <ArrowDownLeft className="h-5 w-5 text-gray-700" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{entry.description}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{entry.category}</span>
                      <span>•</span>
                      <span>{entry.createdByName}</span>
                      {entry.authorizedBy && (
                        <>
                          <span>•</span>
                          <span>Autorizado: {entry.authorizedBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${entry.type === 'income' ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                    {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* New entry modal */}
      {showNewEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Nuevo Movimiento</CardTitle>
                <button onClick={() => setShowNewEntry(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Tipo de movimiento</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'expense', label: 'Gasto', icon: Minus },
                    { value: 'withdrawal', label: 'Retiro', icon: ArrowUpRight },
                    { value: 'income', label: 'Ingreso', icon: Plus }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setNewEntry({ ...newEntry, type: type.value as any })}
                      className={`p-3 rounded-lg border flex flex-col items-center gap-1 ${newEntry.type === type.value
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <type.icon className="h-4 w-4" />
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Monto</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatMiles(newEntry.amount)}
                  onChange={(e) => { const v = parseMiles(e.target.value); if (/^[0-9]*$/.test(v)) setNewEntry({ ...newEntry, amount: v }) }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="0"
                />
                {newEntry.type !== 'income' && (
                  <p className="text-xs text-gray-500 mt-1">Saldo disponible: {formatCurrency(currentBalance)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Descripción</label>
                <input
                  type="text"
                  value={newEntry.description}
                  onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Descripción del movimiento"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Categoría</label>
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Seleccionar...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {newEntry.type === 'withdrawal' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Autorizado por</label>
                  <input
                    type="text"
                    value={newEntry.authorizedBy}
                    onChange={(e) => setNewEntry({ ...newEntry, authorizedBy: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Nombre de quien autoriza"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowNewEntry(false)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
                  onClick={handleCreateEntry}
                >
                  Registrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
