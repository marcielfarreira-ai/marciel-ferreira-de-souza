import { useState, useEffect } from 'react'
import api from '../../api'
import { Users, UserCheck, UserX, DollarSign, TrendingDown, AlertCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function AdminDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => { api.get('/admin/dashboard').then(res => setData(res.data)) }, [])
  if (!data) return <div className="p-8 text-slate-400">Carregando...</div>

  const stats = [
    { label: 'Total de Assinantes', value: data.totalDrivers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Ativos', value: data.activeDrivers, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'MRR', value: `R$ ${data.mrr.toFixed(2)}`, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Churn', value: `${data.churnRate.toFixed(1)}%`, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Inadimplência', value: data.inadimplentes, icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Em Trial', value: data.trialUsers, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard SuperAdmin</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
              <p className="text-lg md:text-2xl font-bold text-white">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* MRR Trend */}
      <div className="bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-800 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Evolução do MRR</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.mrrTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip formatter={value => `R$ ${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
            <Bar dataKey="mrr" name="MRR" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent drivers */}
      <div className="bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4">Motoristas Recentes</h2>
        <div className="space-y-3">
          {data.recentDrivers.map(driver => (
            <div key={driver.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-300">
                  {driver.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{driver.name}</p>
                  <p className="text-xs text-slate-500">{driver.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{driver.plan?.name || 'Sem plano'}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${driver.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
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
