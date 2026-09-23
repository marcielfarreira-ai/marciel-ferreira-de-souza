import { useState, useEffect } from 'react'
import api from '../../api'
import { UserPlus, Search, X } from 'lucide-react'

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState([])
  const [plans, setPlans] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', planId: '' })

  const loadData = async () => {
    const [d, p] = await Promise.all([api.get('/admin/drivers'), api.get('/admin/plans')])
    setDrivers(d.data.drivers)
    setPlans(p.data.plans)
  }
  useEffect(() => { loadData() }, [])

  const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase()))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (editing) {
      await api.put(`/admin/drivers/${editing.id}`, { name: form.name, email: form.email, phone: form.phone, planId: form.planId || null })
    } else {
      await api.post('/admin/drivers', form)
    }
    setShowModal(false); setEditing(null)
    setForm({ name: '', email: '', password: '', phone: '', planId: '' })
    loadData()
  }

  const toggleStatus = async (driver) => { await api.patch(`/admin/drivers/${driver.id}/status`); loadData() }

  const openEdit = (driver) => {
    setEditing(driver)
    setForm({ name: driver.name, email: driver.email, password: '', phone: driver.phone || '', planId: driver.planId || '' })
    setShowModal(true)
  }

  const inputClass = "w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const labelClass = "block text-sm font-medium text-slate-300 mb-1"

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Motoristas</h1>
        <button onClick={() => { setEditing(null); setForm({ name: '', email: '', password: '', phone: '', planId: '' }); setShowModal(true) }}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition">
          <UserPlus className="w-4 h-4" /> Novo Motorista
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar motorista..."
          className="w-full bg-slate-900 border border-slate-800 text-white rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map(driver => (
          <div key={driver.id} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300">{driver.name.charAt(0)}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{driver.name}</p>
                <p className="text-xs text-slate-500">{driver.email}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${driver.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {driver.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{driver.plan?.name || 'Sem plano'}</span>
              <div className="flex gap-2">
                <button onClick={() => openEdit(driver)} className="text-sm text-slate-400 hover:text-white">Editar</button>
                <button onClick={() => toggleStatus(driver)} className="text-sm text-slate-400 hover:text-white">
                  {driver.status === 'active' ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-800">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Nome</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Plano</th>
              <th className="text-left text-xs font-semibold text-slate-400 uppercase px-6 py-3">Status</th>
              <th className="text-right text-xs font-semibold text-slate-400 uppercase px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(driver => (
              <tr key={driver.id} className="hover:bg-slate-800/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300">{driver.name.charAt(0)}</div>
                    <span className="text-sm font-medium text-white">{driver.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{driver.email}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{driver.plan?.name || '—'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${driver.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {driver.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(driver)} className="text-sm text-slate-400 hover:text-white font-medium mr-3">Editar</button>
                  <button onClick={() => toggleStatus(driver)} className="text-sm text-slate-400 hover:text-white font-medium">
                    {driver.status === 'active' ? 'Desativar' : 'Ativar'}
                  </button>
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
              <h2 className="text-lg font-semibold text-white">{editing ? 'Editar Motorista' : 'Novo Motorista'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>Nome</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
              {!editing && (
                <div>
                  <label className={labelClass}>Senha</label>
                  <input type="text" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputClass} />
                </div>
              )}
              <div>
                <label className={labelClass}>Telefone</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Plano</label>
                <select value={form.planId} onChange={e => setForm({ ...form, planId: e.target.value })} className={inputClass}>
                  <option value="">Nenhum</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} — R$ {p.price.toFixed(2)}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-2.5 text-sm transition">
                {editing ? 'Salvar' : 'Criar Motorista'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
