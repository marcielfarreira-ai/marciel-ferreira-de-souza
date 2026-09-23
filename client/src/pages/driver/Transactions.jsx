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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Transações</h1>
        <button onClick={() => { setEditing(null); setForm({ type: 'income', amount: '', category: 'Corridas', description: '', platform: 'Uber', date: today }); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-4 h-4" /> Nova Transação
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterType('')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!filterType ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Todas</button>
        <button onClick={() => setFilterType('income')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType === 'income' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Receitas</button>
        <button onClick={() => setFilterType('expense')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType === 'expense' ? 'bg-red-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>Despesas</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Tipo</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Categoria</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Plataforma</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase px-6 py-3">Data</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Valor</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${t.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {t.type === 'income' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {t.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-900 font-medium">{t.category}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{t.platform || '—'}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                <td className={`px-6 py-4 text-sm font-semibold text-right ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(t)} className="p-1 text-slate-400 hover:text-slate-700 mr-2"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(t)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Editar Transação' : 'Nova Transação'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, type: 'income', category: 'Corridas' })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${form.type === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Receita</button>
                <button type="button" onClick={() => setForm({ ...form, type: 'expense', category: 'Combustível' })}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${form.type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}>Despesa</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                <input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plataforma</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Nenhuma</option>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (opcional)</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
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
