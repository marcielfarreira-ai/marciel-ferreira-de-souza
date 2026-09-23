import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { Car, Gauge, Fuel, DollarSign, TrendingDown, Check, ChevronRight, ChevronLeft, Zap, Battery, Leaf, Droplet } from 'lucide-react'

const PROPULSION_TYPES = [
  { value: 'electric', label: 'Elétrico (EV)', icon: Zap },
  { value: 'hybrid', label: 'Híbrido (PHEV/HEV)', icon: Leaf },
  { value: 'flex', label: 'Flex (Gasolina/Etanol)', icon: Fuel },
  { value: 'gasoline', label: 'Gasolina', icon: Fuel },
  { value: 'ethanol', label: 'Etanol', icon: Droplet },
  { value: 'gnv', label: 'GNV', icon: Fuel },
]

const FUEL_OPTIONS = {
  electric: [{ type: 'electric_kwh', label: 'Energia (R$/kWh)' }],
  hybrid: [{ type: 'electric_kwh', label: 'Energia (R$/kWh)' }, { type: 'gasoline', label: 'Gasolina (R$/L)' }, { type: 'ethanol', label: 'Etanol (R$/L)' }],
  flex: [{ type: 'gasoline', label: 'Gasolina (R$/L)' }, { type: 'ethanol', label: 'Etanol (R$/L)' }],
  gasoline: [{ type: 'gasoline', label: 'Gasolina (R$/L)' }],
  ethanol: [{ type: 'ethanol', label: 'Etanol (R$/L)' }],
  gnv: [{ type: 'gnv', label: 'GNV (R$/m³)' }],
}

export default function Onboarding() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1: Vehicle
  const [vehicle, setVehicle] = useState({ nickname: '', propulsionType: 'electric', tankCapacity: '' })
  // Step 2: Odometer
  const [odometer, setOdometer] = useState('')
  const [energyMeter, setEnergyMeter] = useState('')
  // Step 3: Fuel prices
  const [fuelPrices, setFuelPrices] = useState({})
  // Step 4: Fixed costs
  const [fixedCosts, setFixedCosts] = useState({ installment: '', insurance: '', annualTaxes: '', maintenanceProvision: '', tireProvision: '' })
  // Step 5: Previous vehicle
  const [prevVehicle, setPrevVehicle] = useState({ consumptionKmPerLiter: '', fuelPrice: '' })

  if (!user) return <Navigate to="/login" />
  if (user.onboardingCompleted) return <Navigate to="/app" />

  const isElectric = vehicle.propulsionType === 'electric' || vehicle.propulsionType === 'hybrid'
  const currentFuelOptions = FUEL_OPTIONS[vehicle.propulsionType] || []

  const totalSteps = 5

  const canProceed = () => {
    if (step === 1) return vehicle.nickname.trim() && vehicle.tankCapacity
    if (step === 2) return odometer
    if (step === 3) return true // optional prices
    if (step === 4) return true // optional costs
    if (step === 5) return true // optional
    return false
  }

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1)
  }

  const handlePrev = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      const fuelPricesArray = currentFuelOptions
        .map(opt => ({ fuelType: opt.type, pricePerUnit: parseFloat(fuelPrices[opt.type]) || 0 }))
        .filter(fp => fp.pricePerUnit > 0)

      const res = await api.post('/onboarding/complete', {
        vehicle,
        odometer,
        energyMeter: isElectric ? energyMeter : 0,
        fuelPrices: fuelPricesArray,
        fixedCosts,
        previousVehicle: prevVehicle.consumptionKmPerLiter ? prevVehicle : null,
      })
      updateUser({ ...user, onboardingCompleted: true })
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao finalizar onboarding')
    }
    setLoading(false)
  }

  const inputClass = "w-full bg-slate-800 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5"

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">DriverFina</span>
          <span className="text-slate-500 text-sm ml-auto">Configuração Inicial</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-2xl w-full mx-auto px-6 pt-6">
        <div className="flex items-center gap-2 mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full transition ${i + 1 <= step ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          ))}
        </div>
        <p className="text-sm text-slate-400">Etapa {step} de {totalSteps}</p>
      </div>

      {/* Steps */}
      <div className="flex-1 flex items-start justify-center px-6 py-8">
        <div className="max-w-2xl w-full">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
          )}

          {/* Step 1: Vehicle */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Cadastre seu veículo</h2>
                <p className="text-slate-400 text-sm">Conte-nos sobre o carro que você usa para trabalhar</p>
              </div>
              <div>
                <label className={labelClass}>Nome/Apelido do veículo</label>
                <input type="text" value={vehicle.nickname} onChange={e => setVehicle({ ...vehicle, nickname: e.target.value })}
                  className={inputClass} placeholder="Ex: Meu BYD Dolphin, Meu Onix" />
              </div>
              <div>
                <label className={labelClass}>Tipo de propulsão</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PROPULSION_TYPES.map(pt => {
                    const Icon = pt.icon
                    return (
                      <button key={pt.value} type="button" onClick={() => setVehicle({ ...vehicle, propulsionType: pt.value })}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${vehicle.propulsionType === pt.value ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'}`}>
                        <Icon className="w-6 h-6" />
                        <span className="text-xs font-medium text-center">{pt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className={labelClass}>
                  Capacidade do tanque/bateria {vehicle.propulsionType === 'electric' ? '(kWh)' : vehicle.propulsionType === 'gnv' ? '(m³)' : '(Litros)'}
                </label>
                <input type="number" step="0.01" value={vehicle.tankCapacity} onChange={e => setVehicle({ ...vehicle, tankCapacity: e.target.value })}
                  className={inputClass} placeholder={vehicle.propulsionType === 'electric' ? 'Ex: 60' : 'Ex: 45'} />
              </div>
            </div>
          )}

          {/* Step 2: Odometer */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Odômetro inicial</h2>
                <p className="text-slate-400 text-sm">Registre a quilometragem atual do painel do carro</p>
              </div>
              <div>
                <label className={labelClass}>Quilometragem atual (KM total)</label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="number" step="0.1" value={odometer} onChange={e => setOdometer(e.target.value)}
                    className={inputClass + ' pl-10'} placeholder="Ex: 15000" />
                </div>
              </div>
              {isElectric && (
                <div>
                  <label className={labelClass}>Leitura atual do medidor de kWh (opcional)</label>
                  <div className="relative">
                    <Battery className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input type="number" step="0.1" value={energyMeter} onChange={e => setEnergyMeter(e.target.value)}
                      className={inputClass + ' pl-10'} placeholder="Ex: 5000" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Para veículos elétricos/híbridos: leitura do relógio de kWh da tomada</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Fuel prices */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Preços dos combustíveis</h2>
                <p className="text-slate-400 text-sm">Informe os valores médios na sua região</p>
              </div>
              {currentFuelOptions.map(opt => (
                <div key={opt.type}>
                  <label className={labelClass}>{opt.label}</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input type="number" step="0.01" value={fuelPrices[opt.type] || ''} onChange={e => setFuelPrices({ ...fuelPrices, [opt.type]: e.target.value })}
                      className={inputClass + ' pl-10'} placeholder="0.00" />
                  </div>
                </div>
              ))}
              {currentFuelOptions.length === 0 && (
                <p className="text-slate-400 text-sm">Selecione um tipo de propulsão na etapa anterior.</p>
              )}
            </div>
          )}

          {/* Step 4: Fixed costs */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Custos fixos e provisões</h2>
                <p className="text-slate-400 text-sm">Para calcular o custo operacional real do seu veículo</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Prestação/Aluguel/Financiamento (R$/mês)</label>
                  <input type="number" step="0.01" value={fixedCosts.installment} onChange={e => setFixedCosts({ ...fixedCosts, installment: e.target.value })}
                    className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Seguro (R$/mês)</label>
                  <input type="number" step="0.01" value={fixedCosts.insurance} onChange={e => setFixedCosts({ ...fixedCosts, insurance: e.target.value })}
                    className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Impostos anuais - IPVA+Licenciamento (R$/ano)</label>
                  <input type="number" step="0.01" value={fixedCosts.annualTaxes} onChange={e => setFixedCosts({ ...fixedCosts, annualTaxes: e.target.value })}
                    className={inputClass} placeholder="0.00" />
                </div>
                <div>
                  <label className={labelClass}>Provisão para revisões (R$/km)</label>
                  <input type="number" step="0.001" value={fixedCosts.maintenanceProvision} onChange={e => setFixedCosts({ ...fixedCosts, maintenanceProvision: e.target.value })}
                    className={inputClass} placeholder="0.08" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Provisão para pneus (R$/km)</label>
                  <input type="number" step="0.001" value={fixedCosts.tireProvision} onChange={e => setFixedCosts({ ...fixedCosts, tireProvision: e.target.value })}
                    className={inputClass} placeholder="0.05" />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Previous vehicle */}
          {step === 5 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Veículo anterior (opcional)</h2>
                <p className="text-slate-400 text-sm">Para gerar o gráfico de economia acumulada comparando com o carro antigo</p>
              </div>
              <div>
                <label className={labelClass}>Consumo do carro anterior (km/l)</label>
                <input type="number" step="0.1" value={prevVehicle.consumptionKmPerLiter} onChange={e => setPrevVehicle({ ...prevVehicle, consumptionKmPerLiter: e.target.value })}
                  className={inputClass} placeholder="Ex: 10" />
              </div>
              <div>
                <label className={labelClass}>Preço do combustível do carro anterior (R$/L)</label>
                <input type="number" step="0.01" value={prevVehicle.fuelPrice} onChange={e => setPrevVehicle({ ...prevVehicle, fuelPrice: e.target.value })}
                  className={inputClass} placeholder="Ex: 6.49" />
              </div>
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400">Com esses dados, o app calculará automaticamente quanto você economiza rodando com o veículo atual em comparação ao anterior.</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button onClick={handlePrev} disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white disabled:opacity-30 transition">
              <ChevronLeft className="w-4 h-4" /> Voltar
            </button>
            {step < totalSteps ? (
              <button onClick={handleNext} disabled={!canProceed()}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-50">
                Avançar <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={loading}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-50">
                {loading ? 'Salvando...' : <>Finalizar <Check className="w-4 h-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
