import { useState, useEffect } from 'react'
import api from '../../api'
import { TrendingUp, TrendingDown, Wallet, Gauge, AlertTriangle, Car, Leaf, Zap, Fuel } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'

const PROPULSION_ICONS = {
  electric: Zap, hybrid: Leaf, flex: Fuel, gasoline: Fuel, ethanol: Fuel, gnv: Fuel,
}

export default function DriverDashboard() {
  const [data, setData] = useState(null)
  useEffect(() => { api.get('/finance/dashboard').then(res => setData(res.data)) }, [])
  if (!data) return <div className="p-8 text-slate-400">Carregando...</div>

  const stats = [
    { label: 'Receita do Mês', value: `R$ ${data.income.toFixed(2)}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Custo Operacional', value: `R$ ${data.expenses.toFixed(2)}`, icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Lucro Líquido', value: `R$ ${data.profit.toFixed(2)}`, icon: Wallet, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'KM Rodados', value: `${data.totalKm?.toFixed(1) || 0} km`, icon: Gauge, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="p-4 md:p-8">
      {/* Vehicle info banner */}
      {data.vehicle && (
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-6 flex items-center gap-4">
          {(() => {
            const Icon = PROPULSION_ICONS[data.vehicle.propulsionType] || Car
            return (
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-emerald-400" />
              </div>
            )
          })()}
          <div>
            <p className="text-white font-semibold">{data.vehicle.nickname}</p>
            <p className="text-sm text-slate-400 capitalize">{data.vehicle.propulsionType} · {data.vehicle.tankCapacity} {data.vehicle.propulsionType === 'electric' ? 'kWh' : data.vehicle.propulsionType === 'gnv' ? 'm³' : 'L'}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-slate-900 rounded-xl p-4 md:p-5 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xs md:text-sm font-medium text-slate-400 mb-1">{stat.label}</p>
              <p className="text-lg md:text-2xl font-bold text-white">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Maintenance alerts */}
      {data.maintenanceAlerts && data.maintenanceAlerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {data.maintenanceAlerts.map(alert => (
            <div key={alert.type} className={`rounded-xl p-4 border ${alert.urgency === 'high' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className={`w-5 h-5 ${alert.urgency === 'high' ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className="text-white font-medium">{alert.label}</span>
                {alert.urgency === 'high' && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Atenção</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">KM desde última</p>
                  <p className="text-white font-medium">{alert.kmSinceLast.toLocaleString('pt-BR')} km</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Próxima em</p>
                  <p className="text-white font-medium">{alert.kmRemaining.toLocaleString('pt-BR')} km</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Economy comparison */}
      {data.economyComparison && (
        <div className="bg-gradient-to-br from-emerald-500/10 to-slate-900 rounded-xl p-5 border border-emerald-500/20 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Comparador de Economia</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400">Custo atual/KM</p>
              <p className="text-lg font-bold text-white">R$ {data.economyComparison.currentCostPerKm.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Custo anterior/KM</p>
              <p className="text-lg font-bold text-slate-400">R$ {data.economyComparison.previousCostPerKm.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Economia/KM</p>
              <p className="text-lg font-bold text-emerald-400">R$ {data.economyComparison.savingsPerKm.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Economia total</p>
              <p className="text-lg font-bold text-emerald-400">R$ {data.economyComparison.totalSavings.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-800 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Últimos 6 Meses</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} />
            <Tooltip formatter={value => `R$ ${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
            <Legend />
            <Bar dataKey="income" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" name="Custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Recent closings */}
      {data.recent && data.recent.length > 0 && (
        <div className="bg-slate-900 rounded-xl p-4 md:p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-4">Fechamentos Recentes</h2>
          <div className="space-y-3">
            {data.recent.map(c => (
              <div key={c.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {c.netProfit >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{new Date(c.date).toLocaleDateString('pt-BR')}</p>
                    <p className="text-xs text-slate-500">{c.kmDriven.toFixed(1)} km · R$ {c.profitPerKm.toFixed(2)}/km</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold ${c.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  R$ {c.netProfit.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
