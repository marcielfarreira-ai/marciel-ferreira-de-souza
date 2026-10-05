import { useState, useEffect } from 'react'
import api from '../../api'
import { Plus, X, Trash2, Edit, Gauge, Battery, DollarSign, Fuel, TrendingUp, TrendingDown } from 'lucide-react'
import MaskedNumberInput from '../../components/MaskedNumberInput'

const FUEL_TYPES = [
  { value: 'electric_kwh', label: 'Energia (kWh)' },
  { value: 'gasoline', label: 'Gasolina (L)' },
  { value: 'ethanol', label: 'Etanol (L)' },
  { value: 'gnv', label: 'GNV (m³)' },
]

const INCOME_CATEGORIES = ['Corridas', 'Gorjetas', 'Bônus', 'Outros']
const EXPENSE_CATEGORIES = ['Combustível', 'Manutenção', 'Alimentação', 'Limpeza', 'Pedágio', 'Outros']
const PLATFORM_SUGGESTIONS = ['Uber', '99', 'inDriver', 'Lady Driver', 'Black+Yellow', 'Blablacar', 'Mohvin', 'Cabify', 'Táxi App']

export default function DriverClosings() {
  const [closings, setClosings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    vehicleId: '', date: today, odometerReading: '', energyMeterReading: '',
    grossRevenue: '', streetExpenses: '', notes: ''
  })
  const [fuelEntries, setFuelEntries] = useState([])
  const [transactions, setTransactions] = useState([])
  const [fuelPrices, setFuelPrices] = useState({})

  const load = async () => {
    const [c, v, s] = await Promise.all([api.get('/finance/closings'), api.get('/finance/vehicles'), api.get('/settings')])
    setClosings(c.data.closings)
    setVehicles(v.data.vehicles)
    if (s.data.fuelPrices) {
      const fp = {}
      s.data.fuelPrices.forEach(p => { fp[p.fuelType] = p.pricePerUnit })
      setFuelPrices(fp)
    }
    if (v.data.vehicles.length > 0 && !form.vehicleId) {
      const primary = v.data.vehicles.find(vv => vv.isPrimary) || v.data.vehicles[0]
      setForm(f => ({ ...f, vehicleId: primary.id }))
    }
  }
  useEffect(() => { load() }, [])

  const addFuelEntry = () => {
    const defaultType = 'electric_kwh'
    const refPrice = fuelPrices[defaultType] || 0
    setFuelEntries([...fuelEntries, { fuelType: defaultType, quantity: '', pricePerUnit: refPrice, amount: '0.00' }])
  }

  const updateFuelEntry = (index, field, value) => {
    const updated = [...fuelEntries]
    updated[index][field] = value
    // When fuel type changes, update price to reference price
    if (field === 'fuelType') {
      updated[index].pricePerUnit = fuelPrices[value] || 0
    }
    // Auto-calculate amount
    if (field === 'quantity' || field === 'pricePerUnit' || field === 'fuelType') {
      const qty = parseFloat(updated[index].quantity) || 0
      const price = parseFloat(updated[index].pricePerUnit) || 0
      updated[index].amount = (qty * price).toFixed(2)
    }
    setFuelEntries(updated)
  }

  const removeFuelEntry = (index) => {
    setFuelEntries(fuelEntries.filter((_, i) => i !== index))
  }

  const addTransaction = () => {
    setTransactions([...transactions, { type: 'income', amount: '', category: 'Corridas', platform: '', description: '' }])
  }

  const updateTransaction = (index, field, value) => {
    const updated = [...transactions]
    updated[index][field] = value
    if (field === 'type') {
      updated[index].category = value === 'income' ? 'Corridas' : 'Combustível'
    }
    setTransactions(updated)
  }

  const removeTransaction = (index) => {
    setTransactions(transactions.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      odometerReading: parseFloat(form.odometerReading) || 0,
      energyMeterReading: parseFloat(form.energyMeterReading) || 0,
      grossRevenue: parseFloat(form.grossRevenue) || 0,
      streetExpenses: parseFloat(form.streetExpenses) || 0,
      fuelEntries: fuelEntries.map(fe => ({
        ...fe,
        quantity: parseFloat(fe.quantity) || 0,
        pricePerUnit: parseFloat(fe.pricePerUnit) || 0,
        amount: parseFloat(fe.amount) || 0,
      })),
      transactions: transactions
        .filter(t => parseFloat(t.amount) > 0)
        .map(t => ({
          ...t,
          amount: parseFloat(t.amount) || 0,
        })),
    }
    if (editing) {
      await api.put(`/finance/closings/${editing.id}`, data)
    } else {
      await api.post('/finance/closings', data)
    }
    setShowModal(false)
    setEditing(null)
    setForm({ vehicleId: vehicles[0]?.id || '', date: today, odometerReading: '', energyMeterReading: '', grossRevenue: '', streetExpenses: '', notes: '' })
    setFuelEntries([])
    setTransactions([])
    load()
  }

  const handleDelete = async (c) => {
    if (confirm('Excluir este fechamento?')) { await api.delete(`/finance/closings/${c.id}`); load() }
  }

  const openEdit = (c) => {
    setEditing(c)
    setForm({
      vehicleId: c.vehicleId, date: new Date(c.date).toISOString().split('T')[0],
      odometerReading: String(c.odometerReading), energyMeterReading: String(c.energyMeterReading),
      grossRevenue: String(c.grossRevenue), streetExpenses: String(c.streetExpenses), notes: c.notes || ''
    })
    setFuelEntries(Array.isArray(c.fuelEntries) ? c.fuelEntries : [])
    setTransactions(Array.isArray(c.transactions) ? c.transactions.map(t => ({
      type: t.type, amount: String(t.amount), category: t.category, platform: t.platform || '', description: t.description || ''
    })) : [])
    setShowModal(true)
  }

  const openNew = () => {
    setEditing(null)
    setForm({ vehicleId: vehicles[0]?.id || '', date: today, odometerReading: '', energyMeterReading: '', grossRevenue: '', streetExpenses: '', notes: '' })
    setFuelEntries([])
    setTransactions([])
    setShowModal(true)
  }

  const inputClass = "w-full bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5"

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Fechamentos Diários</h1>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-4 h-4" /> Novo Fechamento
        </button>
      </div>

      {/* Closings list - responsive cards for all devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {closings.map(c => (
          <div key={c.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{new Date(c.date).toLocaleDateString('pt-BR')}</span>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{c.vehicle?.nickname || '—'}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(c)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-800/50 rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">KM Rodados</p>
                <p className="text-sm text-white">{c.kmDriven.toFixed(1)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">Combustível</p>
                <p className="text-sm text-red-400">R$ {c.fuelCost.toFixed(2)}</p>
                {c.vehicle?.propulsionType === 'electric' && (
                  <p className="text-[10px] text-slate-500">{c.energyConsumed?.toFixed(1) || '0.0'} kWh</p>
                )}
              </div>
              <div className="bg-slate-800/50 rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">Faturamento</p>
                <p className="text-sm text-emerald-400">R$ {c.grossRevenue.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">Custo Total</p>
                <p className="text-sm text-red-400">R$ {c.totalOperationalCost.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">Lucro Líquido</p>
                <p className={`text-sm font-semibold ${c.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {c.netProfit.toFixed(2)}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg px-2.5 py-2">
                <p className="text-[10px] uppercase text-slate-500 mb-0.5">Lucro/KM</p>
                <p className="text-sm text-slate-300">R$ {c.profitPerKm.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editing ? 'Editar Fechamento' : 'Novo Fechamento Diário'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Veículo</label>
                  <select value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })} required
                    className={inputClass}>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.nickname}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>KM Atual (odômetro)</label>
                  <MaskedNumberInput
                    value={form.odometerReading}
                    onChange={v => setForm({ ...form, odometerReading: v })}
                    variant="km"
                    icon={Gauge}
                  />
                </div>
                <div>
                  <label className={labelClass}>Medidor kWh (EV/híbrido)</label>
                  <MaskedNumberInput
                    value={form.energyMeterReading}
                    onChange={v => setForm({ ...form, energyMeterReading: v })}
                    variant="kwh"
                    icon={Battery}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Faturamento Bruto (R$)</label>
                  <MaskedNumberInput
                    value={form.grossRevenue}
                    onChange={v => setForm({ ...form, grossRevenue: v })}
                    variant="currency"
                    icon={DollarSign}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gastos na Rua (R$)</label>
                  <MaskedNumberInput
                    value={form.streetExpenses}
                    onChange={v => setForm({ ...form, streetExpenses: v })}
                    variant="currency"
                    icon={DollarSign}
                  />
                </div>
              </div>

              {/* Fuel entries (multi-fuel support) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + ' mb-0'}>Abastecimentos / Combustíveis</label>
                  <button type="button" onClick={addFuelEntry}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {fuelEntries.map((fe, i) => (
                    <div key={i} className="flex gap-2 items-start bg-slate-800 rounded-lg p-2">
                      <select value={fe.fuelType} onChange={e => updateFuelEntry(i, 'fuelType', e.target.value)}
                        className="bg-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none">
                        {FUEL_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                      </select>
                      <MaskedNumberInput
                        value={fe.quantity}
                        onChange={v => updateFuelEntry(i, 'quantity', v)}
                        variant="volume_l"
                        suffix={fe.fuelType === 'electric_kwh' ? ' kWh' : fe.fuelType === 'gnv' ? ' m³' : ' L'}
                        size="sm"
                        className="w-24"
                      />
                      <MaskedNumberInput
                        value={fe.pricePerUnit}
                        onChange={v => updateFuelEntry(i, 'pricePerUnit', v)}
                        variant="currency"
                        size="sm"
                        className="w-28"
                      />
                      <span className="text-xs text-slate-400 py-1.5">= R$ {fe.amount || '0.00'}</span>
                      <button type="button" onClick={() => removeFuelEntry(i)} className="p-1 text-slate-500 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {fuelEntries.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">Nenhum abastecimento. Clique em "Adicionar" para registrar.</p>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Suporte a múltiplos combustíveis no mesmo dia (ex: Etanol + Gasolina)</p>
              </div>

              {/* Transactions within closing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + ' mb-0'}>Transações do Dia</label>
                  <button type="button" onClick={addTransaction}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {transactions.map((t, i) => (
                    <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2 items-center">
                        <button type="button" onClick={() => updateTransaction(i, 'type', 'income')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition ${t.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>Receita</button>
                        <button type="button" onClick={() => updateTransaction(i, 'type', 'expense')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition ${t.type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-400'}`}>Despesa</button>
                        <div className="flex-1" />
                        <button type="button" onClick={() => removeTransaction(i)} className="p-1 text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <MaskedNumberInput
                          value={t.amount}
                          onChange={v => updateTransaction(i, 'amount', v)}
                          variant="currency"
                          size="sm"
                          className="w-full"
                        />
                        <select value={t.category} onChange={e => updateTransaction(i, 'category', e.target.value)}
                          className="bg-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none">
                          {(t.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <input type="text" list="closing-platform-suggestions" value={t.platform} onChange={e => updateTransaction(i, 'platform', e.target.value)}
                        className="w-full bg-slate-700 text-white rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="Plataforma (Uber, 99, inDriver...)" />
                      <datalist id="closing-platform-suggestions">
                        {PLATFORM_SUGGESTIONS.map(p => <option key={p} value={p} />)}
                      </datalist>
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">Nenhuma transação. Clique em "Adicionar" para registrar corridas e gastos por plataforma.</p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Observações (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className={inputClass} rows="2" placeholder="Notas sobre o dia" />
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-2.5 text-sm transition">
                {editing ? 'Salvar' : 'Registrar Fechamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
