import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'
import { Car, Gauge, Fuel, DollarSign, TrendingDown, Check, ChevronRight, ChevronLeft, Zap, Battery, Leaf, Droplet } from 'lucide-react'
import MaskedNumberInput from '../components/MaskedNumberInput'

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
  // Step 4: Fixed costs + maintenance/tire details
  const [fixedCosts, setFixedCosts] = useState({ installment: '', insurance: '', annualTaxes: '' })
  const [maintDetails, setMaintDetails] = useState({ cost: '', intervalKm: '' })
  const [tireDetails, setTireDetails] = useState({ cost: '', intervalKm: '' })
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

  const handleSkip = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/onboarding/complete', {
        vehicle: { nickname: 'Meu Veículo', propulsionType: 'electric', tankCapacity: 0 },
        odometer: 0,
        energyMeter: 0,
        fuelPrices: [],
        fixedCosts: { installment: 0, insurance: 0, annualTaxes: 0, maintenanceProvision: 0, tireProvision: 0 },
        previousVehicle: null,
      })
      updateUser({ ...user, onboardingCompleted: true })
      navigate('/app')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao pular onboarding')
    }
    setLoading(false)
  }

  const handleFinish = async () => {
    setLoading(true)
    setError('')
    try {
      const fuelPricesArray = currentFuelOptions
        .map(opt => ({ fuelType: opt.type, pricePerUnit: parseFloat(fuelPrices[opt.type]) || 0 }))
        .filter(fp => fp.pricePerUnit > 0)

      const maintenanceProvision = (maintDetails.cost && maintDetails.intervalKm)
        ? maintDetails.cost / maintDetails.intervalKm : 0
      const tireProvision = (tireDetails.cost && tireDetails.intervalKm)
        ? tireDetails.cost / tireDetails.intervalKm : 0

      const res = await api.post('/onboarding/complete', {
        vehicle: {
          ...vehicle,
          tireCost: tireDetails.cost || 0,
          tireIntervalKm: tireDetails.intervalKm || 0,
          maintenanceCost: maintDetails.cost || 0,
          maintenanceIntervalKm: maintDetails.intervalKm || 0,
        },
        odometer,
        energyMeter: isElectric ? energyMeter : 0,
        fuelPrices: fuelPricesArray,
        fixedCosts: { ...fixedCosts, maintenanceProvision, tireProvision },
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
                <MaskedNumberInput
                  value={vehicle.tankCapacity}
                  onChange={v => setVehicle({ ...vehicle, tankCapacity: v })}
                  variant="volume_l"
                  suffix={vehicle.propulsionType === 'electric' ? ' kWh' : vehicle.propulsionType === 'gnv' ? ' m³' : ' L'}
                />
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
                <MaskedNumberInput
                  value={odometer}
                  onChange={setOdometer}
                  variant="km"
                  icon={Gauge}
                />
              </div>
              {isElectric && (
                <div>
                  <label className={labelClass}>Leitura atual do medidor de kWh (opcional)</label>
                  <MaskedNumberInput
                    value={energyMeter}
                    onChange={setEnergyMeter}
                    variant="kwh"
                    icon={Battery}
                  />
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
                  <MaskedNumberInput
                    value={fuelPrices[opt.type] || 0}
                    onChange={v => setFuelPrices({ ...fuelPrices, [opt.type]: v })}
                    variant="currency"
                    icon={DollarSign}
                  />
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
                  <MaskedNumberInput
                    value={fixedCosts.installment}
                    onChange={v => setFixedCosts({ ...fixedCosts, installment: v })}
                    variant="currency"
                  />
                </div>
                <div>
                  <label className={labelClass}>Seguro (R$/mês)</label>
                  <MaskedNumberInput
                    value={fixedCosts.insurance}
                    onChange={v => setFixedCosts({ ...fixedCosts, insurance: v })}
                    variant="currency"
                  />
                </div>
                <div>
                  <label className={labelClass}>Impostos anuais - IPVA+Licenciamento (R$/ano)</label>
                  <MaskedNumberInput
                    value={fixedCosts.annualTaxes}
                    onChange={v => setFixedCosts({ ...fixedCosts, annualTaxes: v })}
                    variant="currency"
                  />
                </div>
                <div>
                  <label className={labelClass}>Valor da revisão (R$)</label>
                  <MaskedNumberInput
                    value={maintDetails.cost}
                    onChange={v => setMaintDetails({ ...maintDetails, cost: v })}
                    variant="currency"
                  />
                </div>
                <div>
                  <label className={labelClass}>Intervalo para revisão (KM)</label>
                  <MaskedNumberInput
                    value={maintDetails.intervalKm}
                    onChange={v => setMaintDetails({ ...maintDetails, intervalKm: v })}
                    variant="km"
                  />
                </div>
                {maintDetails.cost > 0 && maintDetails.intervalKm > 0 && (
                  <div className="md:col-span-2 bg-emerald-500/5 rounded-lg px-4 py-2.5 border border-emerald-500/20">
                    <p className="text-xs text-slate-500">Provisão calculada (R$/km)</p>
                    <p className="text-emerald-400 font-semibold text-sm">R$ {(maintDetails.cost / maintDetails.intervalKm).toFixed(4)}</p>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Valor do jogo de pneus (R$)</label>
                  <MaskedNumberInput
                    value={tireDetails.cost}
                    onChange={v => setTireDetails({ ...tireDetails, cost: v })}
                    variant="currency"
                  />
                </div>
                <div>
                  <label className={labelClass}>Intervalo para troca de pneus (KM)</label>
                  <MaskedNumberInput
                    value={tireDetails.intervalKm}
                    onChange={v => setTireDetails({ ...tireDetails, intervalKm: v })}
                    variant="km"
                  />
                </div>
                {tireDetails.cost > 0 && tireDetails.intervalKm > 0 && (
                  <div className="md:col-span-2 bg-emerald-500/5 rounded-lg px-4 py-2.5 border border-emerald-500/20">
                    <p className="text-xs text-slate-500">Provisão calculada (R$/km)</p>
                    <p className="text-emerald-400 font-semibold text-sm">R$ {(tireDetails.cost / tireDetails.intervalKm).toFixed(4)}</p>
                  </div>
                )}
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
                <MaskedNumberInput
                  value={prevVehicle.consumptionKmPerLiter}
                  onChange={v => setPrevVehicle({ ...prevVehicle, consumptionKmPerLiter: v })}
                  variant="consumption"
                />
              </div>
              <div>
                <label className={labelClass}>Preço do combustível do carro anterior (R$/L)</label>
                <MaskedNumberInput
                  value={prevVehicle.fuelPrice}
                  onChange={v => setPrevVehicle({ ...prevVehicle, fuelPrice: v })}
                  variant="currency"
                />
              </div>
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="flex items-start gap-3">
                  <TrendingDown className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400">Com esses dados, o app calculará automaticamente quanto você economiza rodando com o veículo atual em comparação ao anterior.</p>
                </div>
              </div>
            </div>
          )}

          {/* Skip onboarding (step 1 only) */}
          {step === 1 && (
            <div className="text-center mt-4">
              <button onClick={handleSkip} disabled={loading}
                className="text-sm text-slate-500 hover:text-slate-300 transition underline underline-offset-2">
                Pular pré-cadastro e configurar depois
              </button>
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
