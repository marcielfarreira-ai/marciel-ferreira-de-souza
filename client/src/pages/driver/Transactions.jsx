import { useState, useEffect } from 'react'
import api from '../../api'
import { Plus, X, Trash2, Edit, TrendingUp, TrendingDown } from 'lucide-react'

const INCOME_CATEGORIES = ['Corridas', 'Gorjetas', 'Bônus', 'Outros']
const EXPENSE_CATEGORIES = ['Combustível', 'Manutenção', 'Alimentação', 'Limpeza', 'Pedágio', 'Outros']
const PLATFORMS = ['Uber', '99', 'inDriver', 'Outros']

export default function DriverTransactions() {
  const [transactions, setTransactions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterType, setFilterType] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({ type: 'income', amount: '', category: 'Corridas', description: '', platform: 'Uber', date: today })

  const load = async () => {
    const res = await api.get('/finance/transactions', { params: filterType ? { type: filterType } : {} })
    setTransactions(res.data.transactions)
  }
  useEffect(() => { load() }, [filterType])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, amount: parseFloat(form.amount) }
    if (editing) { await api.put(`/finance/transactions/${editing.id}`, data) } else { await api.post('/finance/transactions', data) }
    setShowModal(false); setEditing(null)
    setForm({ type: 'income', amount: '', category: 'Corridas', description: '', platform: 'Uber', date: today })
    load()
  }

  const handleDelete = async (t) => { if (confirm('Excluir esta transação?')) { await api.delete(`/finance/transactions/${t.id}`); load() } }

  const openEdit = (t) => {
    setEditing(t)
    setForm({ type: t.type, amount: String(t.amount), category: t.category, description: t.description || '', platform: t.platform || '', date: new Date(t.date).toISOString().split('T')[0] })
    setShowModal(true)
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const inputClass = "w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const labelClass = "block text-sm font-medium text-slate-300 mb-1"

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Transações</h1>
        <button onClick={() => { setEditing(null); setForm({ type: 'income', amount: '', category: 'Corridas', description: '', platform: 'Uber', date: today }); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-4 h-4" /> Nova Transação
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterType('')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!filterType ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>Todas</button>
        <button onClick={() => setFilterType('income')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>Receitas</button>
        <button onClick={() => setFilterType('expense')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>Despesas</button>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {transactions.map(t => (
          <div key={t.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                {t.type === 'income' ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t.category}</p>
                <p className="text-xs text-slate-500">{t.platform || '—'} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
              </span>
              <button onClick={() => openEdit(t)} className="p-1 text-slate-400 hover:text-white"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(t)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-800">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Tipo</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Categoria</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Plataforma</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Data</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase px-6 py-3">Valor</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-800/30">
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {t.type === 'income' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {t.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-white font-medium">{t.category}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{t.platform || '—'}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                <td className={`px-6 py-4 text-sm font-semibold text-right ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(t)} className="p-1 text-slate-400 hover:text-white mr-2"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(t)} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">{editing ? 'Editar Transação' : 'Nova Transação'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'income', category: 'Corridas' })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${form.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>Receita</button>
                <button type="button" onClick={() => setForm({ ...form, type: 'expense', category: 'Combustível' })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${form.type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>Despesa</button>
              </div>
              <div>
                <label className={labelClass}>Valor (R$)</label>
                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputClass}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Plataforma</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className={inputClass}>
                  <option value="">Nenhuma</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Data</label>
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Descrição (opcional)</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass} />
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-2.5 text-sm transition">
                {editing ? 'Salvar' : 'Adicionar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
