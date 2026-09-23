import { useState, useEffect } from 'react'
import api from '../../api'
import { Users, UserCheck, DollarSign } from 'lucide-react'

export default function AdminDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    api.get('/admin/dashboard').then(res => setData(res.data))
  }, [])

  if (!data) return <div className="p-8 text-slate-400">Carregando...</div>

  const stats = [
    { label: 'Total de Motoristas', value: data.totalDrivers, icon: Users, color: 'bg-blue-500' },
    { label: 'Motoristas Ativos', value: data.activeDrivers, icon: UserCheck, color: 'bg-emerald-500' },
    { label: 'Receita Mensal', value: `R$ ${data.monthlyRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-amber-500' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
            </div>
          )
        })}
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Motoristas Recentes</h2>
        <div className="space-y-3">
          {data.recentDrivers.map(driver => (
            <div key={driver.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{driver.name}</p>
                  <p className="text-xs text-slate-500">{driver.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{driver.plan?.name || 'Sem plano'}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${driver.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {driver.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
