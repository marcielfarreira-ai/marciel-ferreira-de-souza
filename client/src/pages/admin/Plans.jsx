import { useState, useEffect } from 'react'
import api from '../../api'
import { Plus, X, Trash2, Edit } from 'lucide-react'

export default function AdminPlans() {
  const [plans, setPlans] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', description: '', durationDays: 30 })

  const load = async () => { const res = await api.get('/admin/plans'); setPlans(res.data.plans) }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { ...form, price: parseFloat(form.price) }
    if (editing) { await api.put(`/admin/plans/${editing.id}`, data) } else { await api.post('/admin/plans', data) }
    setShowModal(false); setEditing(null)
    setForm({ name: '', price: '', description: '', durationDays: 30 })
    load()
  }

  const handleDelete = async (plan) => {
    if (confirm(`Excluir o plano "${plan.name}"?`)) { await api.delete(`/admin/plans/${plan.id}`); load() }
  }

  const openEdit = (plan) => {
    setEditing(plan)
    setForm({ name: plan.name, price: String(plan.price), description: plan.description || '', durationDays: plan.durationDays })
    setShowModal(true)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Planos</h1>
        <button onClick={() => { setEditing(null); setForm({ name: '', price: '', description: '', durationDays: 30 }); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                <p className="text-3xl font-bold text-emerald-600 mt-2">R$ {plan.price.toFixed(2)}<span className="text-sm font-normal text-slate-400">/mês</span></p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(plan)} className="p-1.5 text-slate-400 hover:text-slate-700"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(plan)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {plan.description && <p className="text-sm text-slate-500">{plan.description}</p>}
            <p className="text-xs text-slate-400 mt-3">Duração: {plan.durationDays} dias</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Editar Plano' : 'Novo Plano'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preço (R$)</label>
                <input type="number" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" rows="2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Duração (dias)</label>
                <input type="number" required value={form.durationDays} onChange={e => setForm({ ...form, durationDays: parseInt(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-2.5 text-sm transition">
                {editing ? 'Salvar' : 'Criar Plano'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
