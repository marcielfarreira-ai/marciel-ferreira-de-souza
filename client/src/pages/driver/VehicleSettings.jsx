import { useState, useEffect, useCallback } from 'react'
import api from '../../api'
import MaskedNumberInput from '../../components/MaskedNumberInput'
import {
  Car, Gauge, Battery, Fuel, DollarSign, Wrench, Calendar, Check,
  RefreshCw, Zap, Leaf, Droplet, Settings, Save, AlertTriangle,
} from 'lucide-react'

const PROPULSION_TYPES = [
  { value: 'electric', label: 'Elétrico (EV)', icon: Zap },
  { value: 'hybrid', label: 'Híbrido (PHEV/HEV)', icon: Leaf },
  { value: 'flex', label: 'Flex (Gasolina/Etanol)', icon: Fuel },
  { value: 'gasoline', label: 'Gasolina', icon: Fuel },
  { value: 'ethanol', label: 'Etanol', icon: Droplet },
  { value: 'gnv', label: 'GNV', icon: Fuel },
]

const FUEL_OPTIONS = {
  electric: [{ type: 'electric_kwh', label: 'Tarifa de Energia Residencial', suffix: 'R$/kWh' }],
  hybrid: [
    { type: 'electric_kwh', label: 'Tarifa de Energia (kWh)', suffix: 'R$/kWh' },
    { type: 'gasoline', label: 'Gasolina', suffix: 'R$/L' },
    { type: 'ethanol', label: 'Etanol', suffix: 'R$/L' },
  ],
  flex: [
    { type: 'gasoline', label: 'Gasolina', suffix: 'R$/L' },
    { type: 'ethanol', label: 'Etanol', suffix: 'R$/L' },
  ],
  gasoline: [{ type: 'gasoline', label: 'Gasolina', suffix: 'R$/L' }],
  ethanol: [{ type: 'ethanol', label: 'Etanol', suffix: 'R$/L' }],
  gnv: [{ type: 'gnv', label: 'GNV', suffix: 'R$/m³' }],
}

const isEV = (t) => t === 'electric'
const isCombustion = (t) => t !== 'electric' // hybrid, flex, gasoline, ethanol, gnv
const isGNV = (t) => t === 'gnv'

export default function VehicleSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [currentOdometer, setCurrentOdometer] = useState(0)

  // Vehicle + maintenance params
  const [vehicle, setVehicle] = useState({
    nickname: '', propulsionType: 'electric', tankCapacity: 0,
    initialOdometer: 0, initialEnergyMeter: 0,
    tireCost: 0, tireIntervalKm: 0,
    oilChangeCost: 0, oilIntervalKm: 0,
    maintenanceCost: 0, maintenanceOddCost: 0, maintenanceEvenCost: 0,
    maintenanceIntervalKm: 0, useAlternatingMaint: false,
    gnvInspectionCost: 0, gnvInspectionDate: '',
  })
  const [fuelPrices, setFuelPrices] = useState({})
  const [fixedCosts, setFixedCosts] = useState({
    installment: 0, insurance: 0, annualTaxes: 0, washCostWeekly: 0,
  })
  const [prevVehicle, setPrevVehicle] = useState({ consumptionKmPerLiter: 0, fuelPrice: 0 })

  // Maintenance reset state
  const [resetLoading, setResetLoading] = useState(null)
  const [resetFeedback, setResetFeedback] = useState(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => {
    api.get('/settings').then(res => {
      const d = res.data
      if (d.vehicle) {
        setVehicle({
          nickname: d.vehicle.nickname || '',
          propulsionType: d.vehicle.propulsionType || 'electric',
          tankCapacity: d.vehicle.tankCapacity || 0,
          initialOdometer: d.vehicle.initialOdometer || 0,
          initialEnergyMeter: d.vehicle.initialEnergyMeter || 0,
          tireCost: d.vehicle.tireCost || 0,
          tireIntervalKm: d.vehicle.tireIntervalKm || 0,
          oilChangeCost: d.vehicle.oilChangeCost || 0,
          oilIntervalKm: d.vehicle.oilIntervalKm || 0,
          maintenanceCost: d.vehicle.maintenanceCost || 0,
          maintenanceOddCost: d.vehicle.maintenanceOddCost || 0,
          maintenanceEvenCost: d.vehicle.maintenanceEvenCost || 0,
          maintenanceIntervalKm: d.vehicle.maintenanceIntervalKm || 0,
          useAlternatingMaint: d.vehicle.useAlternatingMaint || false,
          gnvInspectionCost: d.vehicle.gnvInspectionCost || 0,
          gnvInspectionDate: d.vehicle.gnvInspectionDate
            ? new Date(d.vehicle.gnvInspectionDate).toISOString().split('T')[0]
            : '',
        })
      }
      if (d.fuelPrices) {
        const fp = {}
        d.fuelPrices.forEach(p => { fp[p.fuelType] = p.pricePerUnit })
        setFuelPrices(fp)
      }
      if (d.fixedCosts) {
        setFixedCosts({
          installment: d.fixedCosts.installment || 0,
          insurance: d.fixedCosts.insurance || 0,
          annualTaxes: d.fixedCosts.annualTaxes || 0,
          washCostWeekly: d.fixedCosts.washCostWeekly || 0,
        })
      }
      if (d.previousVehicle) {
        setPrevVehicle({
          consumptionKmPerLiter: d.previousVehicle.consumptionKmPerLiter || 0,
          fuelPrice: d.previousVehicle.fuelPrice || 0,
        })
      }
      setCurrentOdometer(d.currentOdometer || 0)
      setLoading(false)
    }).catch(() => {
      showToast('Erro ao carregar configurações', 'error')
      setLoading(false)
    })
  }, [showToast])

  const handleSave = async () => {
    setSaving(true)
    try {
      const fuelPricesArray = (FUEL_OPTIONS[vehicle.propulsionType] || [])
        .map(opt => ({ fuelType: opt.type, pricePerUnit: fuelPrices[opt.type] || 0 }))

      await api.put('/settings', {
        vehicle,
        fuelPrices: fuelPricesArray,
        fixedCosts,
        previousVehicle: prevVehicle,
      })
      showToast('Configurações atualizadas com sucesso!')
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao salvar configurações', 'error')
    }
    setSaving(false)
  }

  const handleResetMaintenance = async (type, label) => {
    setResetLoading(type)
    try {
      await api.post('/settings/reset-maintenance', { type })
      setResetFeedback({ type, message: `${label} registrada! Contagem reiniciada a partir de ${currentOdometer.toLocaleString('pt-BR')} km.` })
      setTimeout(() => setResetFeedback(null), 4000)
      showToast(`${label} registrada com sucesso!`)
    } catch (err) {
      showToast('Erro ao registrar manutenção', 'error')
    }
    setResetLoading(null)
  }

  // Live provision calculation for display
  const liveTireProvision = (vehicle.tireCost > 0 && vehicle.tireIntervalKm > 0)
    ? vehicle.tireCost / vehicle.tireIntervalKm : 0
  const liveMaintProvision = (() => {
    let p = 0
    const mi = vehicle.maintenanceIntervalKm
    if (vehicle.useAlternatingMaint && mi > 0) {
      p += (vehicle.maintenanceOddCost + vehicle.maintenanceEvenCost) / 2 / mi
    } else if (vehicle.maintenanceCost > 0 && mi > 0) {
      p += vehicle.maintenanceCost / mi
    }
    if (vehicle.oilChangeCost > 0 && vehicle.oilIntervalKm > 0) {
      p += vehicle.oilChangeCost / vehicle.oilIntervalKm
    }
    return p
  })()
  const liveDailyFixed = (() => {
    const monthly = fixedCosts.installment + fixedCosts.insurance + (fixedCosts.annualTaxes / 12) + (fixedCosts.washCostWeekly * 52 / 12)
    return monthly / 30
  })()

  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5'
  const cardClass = 'bg-slate-900 rounded-xl p-5 border border-slate-800'
  const sectionTitle = 'text-lg font-semibold text-white mb-4 flex items-center gap-2'

  if (loading) return <div className="p-8 text-slate-400">Carregando configurações...</div>

  const currentFuelOpts = FUEL_OPTIONS[vehicle.propulsionType] || []

  // Maintenance reset buttons data
  const resetButtons = [
    { type: 'tires', label: 'Troquei os Pneus Hoje', icon: RefreshCw,
      baseKm: vehicle.tireCost > 0 ? (currentOdometer - (vehicle.lastTireChangeKm || vehicle.initialOdometer)) : null,
      interval: vehicle.tireIntervalKm },
    ...(isCombustion(vehicle.propulsionType) ? [{ type: 'oil', label: 'Fiz a Troca de Óleo Hoje', icon: Wrench,
      baseKm: vehicle.oilChangeCost > 0 ? (currentOdometer - (vehicle.lastOilChangeKm || vehicle.initialOdometer)) : null,
      interval: vehicle.oilIntervalKm }] : []),
    { type: 'maintenance', label: 'Fiz a Revisão Hoje', icon: Wrench,
      baseKm: vehicle.maintenanceCost > 0 || vehicle.useAlternatingMaint ? (currentOdometer - (vehicle.lastMaintenanceKm || vehicle.initialOdometer)) : null,
      interval: vehicle.maintenanceIntervalKm },
  ].filter(b => b.baseKm !== null)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Settings className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Configurações do Veículo</h1>
          <p className="text-sm text-slate-400">Gerencie parâmetros operacionais e manutenção</p>
        </div>
      </div>

      {/* ── Vehicle Info ── */}
      <div className={`${cardClass} mb-5`}>
        <h2 className={sectionTitle}><Car className="w-5 h-5 text-emerald-400" /> Dados do Veículo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome/Apelido</label>
            <input type="text" value={vehicle.nickname}
              onChange={e => setVehicle({ ...vehicle, nickname: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className={labelClass}>Tipo de Propulsão</label>
            <select value={vehicle.propulsionType}
              onChange={e => setVehicle({ ...vehicle, propulsionType: e.target.value })}
              className="w-full bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {PROPULSION_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Capacidade {isEV(vehicle.propulsionType) ? 'da Bateria (kWh)' : isGNV(vehicle.propulsionType) ? 'do Tanque (m³)' : 'do Tanque (L)'}
            </label>
            <MaskedNumberInput value={vehicle.tankCapacity}
              onChange={v => setVehicle({ ...vehicle, tankCapacity: v })}
              variant="volume_l"
              suffix={isEV(vehicle.propulsionType) ? 'kWh' : isGNV(vehicle.propulsionType) ? 'm³' : 'L'} />
          </div>
          <div>
            <label className={labelClass}>Odômetro Base (KM)</label>
            <MaskedNumberInput value={vehicle.initialOdometer}
              onChange={v => setVehicle({ ...vehicle, initialOdometer: v })}
              variant="km" icon={Gauge} />
          </div>
          {isEV(vehicle.propulsionType) && (
            <div className="md:col-span-2">
              <label className={labelClass}>Relógio de kWh da Garagem (leitura base)</label>
              <MaskedNumberInput value={vehicle.initialEnergyMeter}
                onChange={v => setVehicle({ ...vehicle, initialEnergyMeter: v })}
                variant="kwh" icon={Battery} />
            </div>
          )}
        </div>
      </div>

      {/* ── Fuel / Energy Prices ── */}
      {currentFuelOpts.length > 0 && (
        <div className={`${cardClass} mb-5`}>
          <h2 className={sectionTitle}><Fuel className="w-5 h-5 text-amber-400" /> Preços de Referência</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentFuelOpts.map(opt => (
              <div key={opt.type}>
                <label className={labelClass}>{opt.label}</label>
                <MaskedNumberInput value={fuelPrices[opt.type] || 0}
                  onChange={v => setFuelPrices({ ...fuelPrices, [opt.type]: v })}
                  variant="currency" icon={DollarSign} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GNV Inspection ── */}
      {isGNV(vehicle.propulsionType) && (
        <div className={`${cardClass} mb-5`}>
          <h2 className={sectionTitle}><Calendar className="w-5 h-5 text-blue-400" /> Vistoria Anual do Cilindro (INMETRO)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Custo da Vistoria (R$)</label>
              <MaskedNumberInput value={vehicle.gnvInspectionCost}
                onChange={v => setVehicle({ ...vehicle, gnvInspectionCost: v })}
                variant="currency" />
            </div>
            <div>
              <label className={labelClass}>Data Alvo da Próxima Vistoria</label>
              <input type="date" value={vehicle.gnvInspectionDate}
                onChange={e => setVehicle({ ...vehicle, gnvInspectionDate: e.target.value })}
                className="w-full bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* ── Oil Change (combustion/hybrid only) ── */}
      {isCombustion(vehicle.propulsionType) && (
        <div className={`${cardClass} mb-5`}>
          <h2 className={sectionTitle}><Wrench className="w-5 h-5 text-orange-400" /> Troca de Óleo e Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Custo da Troca (R$)</label>
              <MaskedNumberInput value={vehicle.oilChangeCost}
                onChange={v => setVehicle({ ...vehicle, oilChangeCost: v })}
                variant="currency" />
            </div>
            <div>
              <label className={labelClass}>Intervalo para Troca (KM)</label>
              <MaskedNumberInput value={vehicle.oilIntervalKm}
                onChange={v => setVehicle({ ...vehicle, oilIntervalKm: v })}
                variant="km" />
            </div>
          </div>
        </div>
      )}

      {/* ── Tire Change ── */}
      <div className={`${cardClass} mb-5`}>
        <h2 className={sectionTitle}><RefreshCw className="w-5 h-5 text-cyan-400" /> Troca de Pneus</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Valor do Jogo de Pneus (R$)</label>
            <MaskedNumberInput value={vehicle.tireCost}
              onChange={v => setVehicle({ ...vehicle, tireCost: v })}
              variant="currency" />
          </div>
          <div>
            <label className={labelClass}>Intervalo para Troca (KM)</label>
            <MaskedNumberInput value={vehicle.tireIntervalKm}
              onChange={v => setVehicle({ ...vehicle, tireIntervalKm: v })}
              variant="km" />
          </div>
        </div>
      </div>

      {/* ── Periodic Maintenance / Revision ── */}
      <div className={`${cardClass} mb-5`}>
        <h2 className={sectionTitle}><Wrench className="w-5 h-5 text-violet-400" /> Plano de Revisões Periódicas</h2>
        {/* Alternating toggle */}
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <div className="relative">
            <input type="checkbox" checked={vehicle.useAlternatingMaint}
              onChange={e => setVehicle({ ...vehicle, useAlternatingMaint: e.target.checked })}
              className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-700 peer-checked:bg-emerald-500 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </div>
          <span className="text-sm text-slate-300">Usar ciclo alternado (ex: R$ 400 na ímpar / R$ 1.200 na par)</span>
        </label>

        {vehicle.useAlternatingMaint ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Custo Revisão Ímpar (R$)</label>
              <MaskedNumberInput value={vehicle.maintenanceOddCost}
                onChange={v => setVehicle({ ...vehicle, maintenanceOddCost: v })}
                variant="currency" />
            </div>
            <div>
              <label className={labelClass}>Custo Revisão Par (R$)</label>
              <MaskedNumberInput value={vehicle.maintenanceEvenCost}
                onChange={v => setVehicle({ ...vehicle, maintenanceEvenCost: v })}
                variant="currency" />
            </div>
            <div>
              <label className={labelClass}>Intervalo (KM)</label>
              <MaskedNumberInput value={vehicle.maintenanceIntervalKm}
                onChange={v => setVehicle({ ...vehicle, maintenanceIntervalKm: v })}
                variant="km" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Custo da Revisão (R$)</label>
              <MaskedNumberInput value={vehicle.maintenanceCost}
                onChange={v => setVehicle({ ...vehicle, maintenanceCost: v })}
                variant="currency" />
            </div>
            <div>
              <label className={labelClass}>Intervalo para Revisão (KM)</label>
              <MaskedNumberInput value={vehicle.maintenanceIntervalKm}
                onChange={v => setVehicle({ ...vehicle, maintenanceIntervalKm: v })}
                variant="km" />
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed Costs ── */}
      <div className={`${cardClass} mb-5`}>
        <h2 className={sectionTitle}><DollarSign className="w-5 h-5 text-emerald-400" /> Custos Fixos e Impostos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Prestação/Aluguel/Financiamento (R$/mês)</label>
            <MaskedNumberInput value={fixedCosts.installment}
              onChange={v => setFixedCosts({ ...fixedCosts, installment: v })}
              variant="currency" />
          </div>
          <div>
            <label className={labelClass}>Seguro (R$/mês)</label>
            <MaskedNumberInput value={fixedCosts.insurance}
              onChange={v => setFixedCosts({ ...fixedCosts, insurance: v })}
              variant="currency" />
          </div>
          <div>
            <label className={labelClass}>Impostos Anuais - IPVA+Licenciamento (R$/ano)</label>
            <MaskedNumberInput value={fixedCosts.annualTaxes}
              onChange={v => setFixedCosts({ ...fixedCosts, annualTaxes: v })}
              variant="currency" />
          </div>
          <div>
            <label className={labelClass}>Lavagem (R$/semana)</label>
            <MaskedNumberInput value={fixedCosts.washCostWeekly}
              onChange={v => setFixedCosts({ ...fixedCosts, washCostWeekly: v })}
              variant="currency" />
          </div>
        </div>
      </div>

      {/* ── Live Calculations Preview ── */}
      <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/20 mb-5">
        <p className="text-sm font-medium text-emerald-400 mb-3">Prévia dos Cálculos (atualizada automaticamente)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Provisão Pneus/KM</p>
            <p className="text-white font-medium">R$ {liveTireProvision.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Provisão Revisão+Óleo/KM</p>
            <p className="text-white font-medium">R$ {liveMaintProvision.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Custo Fixo Diário</p>
            <p className="text-white font-medium">R$ {liveDailyFixed.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* ── Maintenance Reset ── */}
      {resetButtons.length > 0 && (
        <div className={`${cardClass} mb-5`}>
          <h2 className={sectionTitle}><Wrench className="w-5 h-5 text-amber-400" /> Registrar Manutenção Realizada</h2>
          <p className="text-sm text-slate-400 mb-4">
            Odômetro atual: <span className="text-white font-medium">{currentOdometer.toLocaleString('pt-BR')} km</span>
            {' — '}ao registrar, a contagem reinicia a partir deste valor.
          </p>
          {resetFeedback && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-4 py-3 mb-4">
              {resetFeedback.message}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            {resetButtons.map(btn => {
              const Icon = btn.icon
              const kmSince = btn.baseKm
              const kmRemaining = btn.interval > 0 ? btn.interval - (kmSince % btn.interval) : 0
              return (
                <button key={btn.type} type="button" disabled={resetLoading === btn.type}
                  onClick={() => handleResetMaintenance(btn.type, btn.label)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50">
                  <Icon className="w-4 h-4 text-emerald-400" />
                  {btn.label}
                  <span className="text-xs text-slate-500 ml-1">
                    ({kmSince.toLocaleString('pt-BR')} km · faltam {kmRemaining.toLocaleString('pt-BR')} km)
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Previous Vehicle ── */}
      <div className={`${cardClass} mb-5`}>
        <h2 className={sectionTitle}><Car className="w-5 h-5 text-slate-400" /> Veículo Anterior (comparação)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Consumo do carro anterior (km/l)</label>
            <MaskedNumberInput value={prevVehicle.consumptionKmPerLiter}
              onChange={v => setPrevVehicle({ ...prevVehicle, consumptionKmPerLiter: v })}
              variant="consumption" />
          </div>
          <div>
            <label className={labelClass}>Preço do combustível anterior (R$/L)</label>
            <MaskedNumberInput value={prevVehicle.fuelPrice}
              onChange={v => setPrevVehicle({ ...prevVehicle, fuelPrice: v })}
              variant="currency" />
          </div>
        </div>
      </div>

      {/* ── Save Button (fixed footer) ── */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 md:px-8 py-4 z-40">
        <div className="max-w-4xl mx-auto flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-lg text-sm transition disabled:opacity-50">
            {saving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
          </button>
        </div>
      </div>
    </div>
  )
}
