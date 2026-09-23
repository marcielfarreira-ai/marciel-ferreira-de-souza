import { useState, useEffect } from 'react'
import api from '../../api'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function DriverReports() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [data, setData] = useState(null)

  useEffect(() => { api.get('/finance/reports', { params: { month } }).then(res => setData(res.data)) }, [month])
  if (!data) return <div className="p-8 text-slate-400">Carregando...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Receita</p>
          <p className="text-2xl font-bold text-emerald-600">R$ {data.income.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Despesas</p>
          <p className="text-2xl font-bold text-red-600">R$ {data.expenses.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Lucro Líquido</p>
          <p className={`text-2xl font-bold ${data.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>R$ {data.profit.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {data.expenseByCategory.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Despesas por Categoria</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e => e.name}>
                  {data.expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={value => `R$ ${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {data.incomeByPlatform.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Receita por Plataforma</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.incomeByPlatform}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip formatter={value => `R$ ${value.toFixed(2)}`} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Transações do Mês</h2>
        <div className="space-y-2">
          {data.transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div>
                <span className="text-sm font-medium text-slate-900">{t.category}</span>
                {t.platform && <span className="text-xs text-slate-500 ml-2">{t.platform}</span>}
                <span className="text-xs text-slate-400 ml-2">{new Date(t.date).toLocaleDateString('pt-BR')}</span>
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
