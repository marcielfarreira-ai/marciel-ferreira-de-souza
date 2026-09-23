import { useState, useEffect } from 'react'
import api from '../../api'
import { Download, FileSpreadsheet } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

export default function DriverReports() {
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [data, setData] = useState(null)

  useEffect(() => { api.get('/finance/reports', { params: { month } }).then(res => setData(res.data)) }, [month])
  if (!data) return <div className="p-8 text-slate-400">Carregando...</div>

  const exportCSV = () => {
    window.open(`/api/finance/reports?month=${month}&format=csv`, '_blank')
  }

  const exportPDF = () => {
    // Simple print-to-PDF via browser
    window.print()
  }

  const inputClass = "bg-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-700"

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-white">Relatórios</h1>
        <div className="flex gap-2">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className={inputClass} />
          <button onClick={exportCSV} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg border border-slate-700 transition">
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button onClick={exportPDF} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg border border-slate-700 transition">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-800">
          <p className="text-sm text-slate-400 mb-1">Receita</p>
          <p className="text-xl md:text-2xl font-bold text-emerald-400">R$ {data.summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-800">
          <p className="text-sm text-slate-400 mb-1">Custo Total</p>
          <p className="text-xl md:text-2xl font-bold text-red-400">R$ {data.summary.totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-800">
          <p className="text-sm text-slate-400 mb-1">Lucro Líquido</p>
          <p className={`text-xl md:text-2xl font-bold ${data.summary.totalNetProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {data.summary.totalNetProfit.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-800">
          <p className="text-sm text-slate-400 mb-1">KM Total</p>
          <p className="text-xl md:text-2xl font-bold text-white">{data.summary.totalKm.toFixed(1)} km</p>
        </div>
      </div>

      {/* Per-km metrics */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400 mb-1">Faturamento/KM</p>
          <p className="text-lg font-bold text-emerald-400">R$ {data.summary.avgRevenuePerKm.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400 mb-1">Custo/KM</p>
          <p className="text-lg font-bold text-red-400">R$ {data.summary.avgCostPerKm.toFixed(2)}</p>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <p className="text-xs text-slate-400 mb-1">Lucro/KM</p>
          <p className={`text-lg font-bold ${data.summary.avgProfitPerKm >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {data.summary.avgProfitPerKm.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {data.closings.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-800">
            <h2 className="text-lg font-semibold text-white mb-4">Receita vs Custo por Dia</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.closings.map(c => ({
                day: new Date(c.date).getDate(),
                revenue: c.grossRevenue,
                cost: c.totalOperationalCost,
              })).reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip formatter={value => `R$ ${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="revenue" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Custo Operacional por Categoria</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={[
                { name: 'Combustível', value: data.closings.reduce((s, c) => s + c.fuelCost, 0) },
                { name: 'Custos Fixos', value: data.closings.reduce((s, c) => s + c.fixedCostDaily, 0) },
                { name: 'Provisões', value: data.closings.reduce((s, c) => s + c.provisionCost, 0) },
                { name: 'Gastos Rua', value: data.closings.reduce((s, c) => s + c.streetExpenses, 0) },
              ].filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={e => e.name}>
                {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <Tooltip formatter={value => `R$ ${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Closings detail */}
      <div className="bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4">Fechamentos do Mês</h2>
        <div className="space-y-2">
          {data.closings.map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
              <div>
                <span className="text-sm font-medium text-white">{new Date(c.date).toLocaleDateString('pt-BR')}</span>
                <span className="text-xs text-slate-500 ml-2">{c.vehicle?.nickname}</span>
                <span className="text-xs text-slate-500 ml-2">{c.kmDriven.toFixed(1)} km</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-emerald-400">R$ {c.grossRevenue.toFixed(2)}</span>
                <span className="text-red-400">R$ {c.totalOperationalCost.toFixed(2)}</span>
                <span className={`font-semibold ${c.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>R$ {c.netProfit.toFixed(2)}</span>
              </div>
            </div>
          ))}
          {data.closings.length === 0 && <p className="text-slate-500 text-sm py-4 text-center">Nenhum fechamento neste mês.</p>}
        </div>
      </div>
    </div>
  )
}
