import { useState, useEffect } from 'react'
import api from '../../api'
import { TrendingUp, TrendingDown, Wallet, ReceiptText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function DriverDashboard() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/finance/dashboard').then(res => setData(res.data)) }, [])
  if (!data) return <div className="p-8 text-slate-400">Carregando...</div>

  const stats = [
    { label: 'Receita do Mês', value: `R$ ${data.income.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Despesas do Mês', value: `R$ ${data.expenses.toFixed(2)}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Lucro Líquido', value: `R$ ${data.profit.toFixed(2)}`, icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Transações', value: data.transactionCount, icon: ReceiptText, color: 'text-slate-600', bg: 'bg-slate-100' },
  ]

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Últimos 6 Meses</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip formatter={value => `R$ ${value.toFixed(2)}`} />
            <Legend />
            <Bar dataKey="income" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Transações Recentes</h2>
        <div className="space-y-3">
          {data.recent.map(t => (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {t.type === 'income' ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.category}</p>
                  <p className="text-xs text-slate-500">{t.platform || '—'} · {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
