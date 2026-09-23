const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { auth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.use(auth)

// Helper: get user's fixed costs as daily rate
async function getDailyFixedCosts(userId) {
  const fc = await prisma.fixedCost.findFirst({ where: { userId } })
  if (!fc) return 0
  const monthly = fc.installment + fc.insurance + (fc.annualTaxes / 12)
  return monthly / 30 // daily rate
}

// Helper: get provision per km
async function getProvisionPerKm(userId) {
  const fc = await prisma.fixedCost.findFirst({ where: { userId } })
  if (!fc) return 0
  return fc.maintenanceProvision + fc.tireProvision
}

// GET dashboard with closing data + maintenance alerts + economy comparison
router.get('/dashboard', async (req, res) => {
  const userId = req.user.id
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const vehicle = await prisma.vehicle.findFirst({ where: { userId, isPrimary: true } })
  const closings = await prisma.dailyClosing.findMany({
    where: { userId, date: { gte: startOfMonth, lt: endOfMonth } },
    orderBy: { date: 'desc' }
  })

  const totalRevenue = closings.reduce((s, c) => s + c.grossRevenue, 0)
  const totalCost = closings.reduce((s, c) => s + c.totalOperationalCost, 0)
  const totalNetProfit = closings.reduce((s, c) => s + c.netProfit, 0)
  const totalKm = closings.reduce((s, c) => s + c.kmDriven, 0)

  // Legacy transactions for backward compat
  const transactions = await prisma.transaction.findMany({ where: { userId, date: { gte: startOfMonth, lt: endOfMonth } } })
  const legacyIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const legacyExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Monthly chart data (last 6 months)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthClosings = await prisma.dailyClosing.findMany({ where: { userId, date: { gte: start, lt: end } } })
    const mRevenue = monthClosings.reduce((s, c) => s + c.grossRevenue, 0)
    const mCost = monthClosings.reduce((s, c) => s + c.totalOperationalCost, 0)
    monthlyData.push({
      month: start.toLocaleDateString('pt-BR', { month: 'short' }),
      income: mRevenue,
      expenses: mCost,
      profit: mRevenue - mCost,
    })
  }

  // Maintenance alerts based on odometer
  let maintenanceAlerts = []
  if (vehicle) {
    const lastClosing = await prisma.dailyClosing.findFirst({
      where: { userId, vehicleId: vehicle.id },
      orderBy: { date: 'desc' }
    })
    const currentOdometer = lastClosing ? lastClosing.odometerReading : vehicle.initialOdometer
    const fc = await prisma.fixedCost.findFirst({ where: { userId } })

    // Tire change every 40000 km, maintenance every 10000 km
    const tireInterval = 40000
    const maintInterval = 10000
    const lastTireChange = vehicle.initialOdometer
    const kmSinceTires = currentOdometer - lastTireChange
    const kmSinceMaint = currentOdometer - vehicle.initialOdometer

    maintenanceAlerts = [
      {
        type: 'tires',
        label: 'Troca de Pneus',
        kmSinceLast: kmSinceTires,
        kmRemaining: tireInterval - (kmSinceTires % tireInterval),
        urgency: kmSinceTires % tireInterval > tireInterval * 0.8 ? 'high' : 'normal',
        interval: tireInterval,
      },
      {
        type: 'maintenance',
        label: 'Revisão',
        kmSinceLast: kmSinceMaint,
        kmRemaining: maintInterval - (kmSinceMaint % maintInterval),
        urgency: kmSinceMaint % maintInterval > maintInterval * 0.8 ? 'high' : 'normal',
        interval: maintInterval,
      }
    ]
  }

  // Economy comparison
  let economyComparison = null
  const prevVehicle = await prisma.previousVehicle.findFirst({ where: { userId } })
  if (prevVehicle && vehicle && totalKm > 0) {
    // Current vehicle cost per km
    const currentCostPerKm = totalKm > 0 ? totalCost / totalKm : 0
    // Previous vehicle cost per km = fuelPrice / consumptionKmPerLiter
    const prevCostPerKm = prevVehicle.consumptionKmPerLiter > 0 ? prevVehicle.fuelPrice / prevVehicle.consumptionKmPerLiter : 0
    const savingsPerKm = prevCostPerKm - currentCostPerKm
    const totalSavings = savingsPerKm * totalKm
    economyComparison = {
      currentCostPerKm,
      previousCostPerKm: prevCostPerKm,
      savingsPerKm,
      totalSavings,
      totalKm,
    }
  }

  res.json({
    income: totalRevenue + legacyIncome,
    expenses: totalCost + legacyExpense,
    profit: totalNetProfit + legacyIncome - legacyExpense,
    transactionCount: closings.length + transactions.length,
    totalKm,
    monthlyData,
    recent: closings.slice(0, 5),
    vehicle,
    maintenanceAlerts,
    economyComparison,
  })
})

// GET all closings
router.get('/closings', async (req, res) => {
  const { month } = req.query
  const where = { userId: req.user.id }
  if (month) {
    const [y, m] = month.split('-')
    where.date = { gte: new Date(+y, +m - 1, 1), lt: new Date(+y, +m, 1) }
  }
  const closings = await prisma.dailyClosing.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { vehicle: true }
  })
  res.json({ closings })
})

// POST create daily closing with auto-calculation
router.post('/closings', async (req, res) => {
  const userId = req.user.id
  const { vehicleId, date, odometerReading, energyMeterReading, grossRevenue, streetExpenses, fuelEntries, notes } = req.body

  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } })
  if (!vehicle) return res.status(400).json({ error: 'Veículo não encontrado' })

  // Find previous closing for delta calculation
  const prevClosing = await prisma.dailyClosing.findFirst({
    where: { userId, vehicleId, date: { lt: new Date(date) } },
    orderBy: { date: 'desc' }
  })

  const prevOdometer = prevClosing ? prevClosing.odometerReading : vehicle.initialOdometer
  const prevEnergyMeter = prevClosing ? prevClosing.energyMeterReading : vehicle.initialEnergyMeter

  const kmDriven = Math.max(0, parseFloat(odometerReading) - prevOdometer)
  const energyConsumed = Math.max(0, parseFloat(energyMeterReading || 0) - prevEnergyMeter)

  // Fuel cost from entries
  let fuelCost = 0
  const entries = Array.isArray(fuelEntries) ? fuelEntries : []
  for (const entry of entries) {
    fuelCost += parseFloat(entry.amount) || 0
  }

  // Fixed costs (daily rate)
  const fixedCostDaily = await getDailyFixedCosts(userId)

  // Provisions (per km)
  const provisionPerKm = await getProvisionPerKm(userId)
  const provisionCost = kmDriven * provisionPerKm

  const totalOperationalCost = fuelCost + fixedCostDaily + provisionCost + (parseFloat(streetExpenses) || 0)
  const netProfit = (parseFloat(grossRevenue) || 0) - totalOperationalCost

  const revenuePerKm = kmDriven > 0 ? (parseFloat(grossRevenue) || 0) / kmDriven : 0
  const costPerKm = kmDriven > 0 ? totalOperationalCost / kmDriven : 0
  const profitPerKm = kmDriven > 0 ? netProfit / kmDriven : 0

  const closing = await prisma.dailyClosing.create({
    data: {
      userId,
      vehicleId,
      date: new Date(date),
      odometerReading: parseFloat(odometerReading) || 0,
      energyMeterReading: parseFloat(energyMeterReading) || 0,
      grossRevenue: parseFloat(grossRevenue) || 0,
      streetExpenses: parseFloat(streetExpenses) || 0,
      fuelEntries: entries,
      kmDriven,
      energyConsumed,
      fuelCost,
      fixedCostDaily,
      provisionCost,
      totalOperationalCost,
      netProfit,
      revenuePerKm,
      costPerKm,
      profitPerKm,
      notes: notes || null,
    },
    include: { vehicle: true }
  })

  res.json({ closing })
})

// PUT update closing
router.put('/closings/:id', async (req, res) => {
  const { date, odometerReading, energyMeterReading, grossRevenue, streetExpenses, fuelEntries, notes } = req.body
  const userId = req.user.id
  const existing = await prisma.dailyClosing.findFirst({ where: { id: req.params.id, userId } })
  if (!existing) return res.status(404).json({ error: 'Fechamento não encontrado' })

  // Recalculate
  const vehicle = await prisma.vehicle.findFirst({ where: { id: existing.vehicleId, userId } })
  const prevClosing = await prisma.dailyClosing.findFirst({
    where: { userId, vehicleId: existing.vehicleId, date: { lt: new Date(date) }, id: { not: existing.id } },
    orderBy: { date: 'desc' }
  })
  const prevOdometer = prevClosing ? prevClosing.odometerReading : vehicle.initialOdometer
  const prevEnergyMeter = prevClosing ? prevClosing.energyMeterReading : vehicle.initialEnergyMeter
  const kmDriven = Math.max(0, parseFloat(odometerReading) - prevOdometer)
  const energyConsumed = Math.max(0, parseFloat(energyMeterReading || 0) - prevEnergyMeter)

  let fuelCost = 0
  const entries = Array.isArray(fuelEntries) ? fuelEntries : []
  for (const entry of entries) { fuelCost += parseFloat(entry.amount) || 0 }

  const fixedCostDaily = await getDailyFixedCosts(userId)
  const provisionPerKm = await getProvisionPerKm(userId)
  const provisionCost = kmDriven * provisionPerKm
  const totalOperationalCost = fuelCost + fixedCostDaily + provisionCost + (parseFloat(streetExpenses) || 0)
  const netProfit = (parseFloat(grossRevenue) || 0) - totalOperationalCost
  const revenuePerKm = kmDriven > 0 ? (parseFloat(grossRevenue) || 0) / kmDriven : 0
  const costPerKm = kmDriven > 0 ? totalOperationalCost / kmDriven : 0
  const profitPerKm = kmDriven > 0 ? netProfit / kmDriven : 0

  const closing = await prisma.dailyClosing.update({
    where: { id: req.params.id },
    data: {
      date: new Date(date),
      odometerReading: parseFloat(odometerReading) || 0,
      energyMeterReading: parseFloat(energyMeterReading) || 0,
      grossRevenue: parseFloat(grossRevenue) || 0,
      streetExpenses: parseFloat(streetExpenses) || 0,
      fuelEntries: entries,
      kmDriven, energyConsumed, fuelCost, fixedCostDaily, provisionCost,
      totalOperationalCost, netProfit, revenuePerKm, costPerKm, profitPerKm,
      notes: notes || null,
    },
    include: { vehicle: true }
  })
  res.json({ closing })
})

// DELETE closing
router.delete('/closings/:id', async (req, res) => {
  await prisma.dailyClosing.delete({ where: { id: req.params.id, userId: req.user.id } })
  res.json({ success: true })
})

// GET vehicles
router.get('/vehicles', async (req, res) => {
  const vehicles = await prisma.vehicle.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } })
  res.json({ vehicles })
})

// POST vehicle
router.post('/vehicles', async (req, res) => {
  const { nickname, propulsionType, tankCapacity, initialOdometer, initialEnergyMeter } = req.body
  const vehicle = await prisma.vehicle.create({
    data: {
      userId: req.user.id,
      nickname,
      propulsionType,
      tankCapacity: parseFloat(tankCapacity) || 0,
      initialOdometer: parseFloat(initialOdometer) || 0,
      initialEnergyMeter: parseFloat(initialEnergyMeter) || 0,
    }
  })
  res.json({ vehicle })
})

// GET reports with CSV export
router.get('/reports', async (req, res) => {
  const { month, format } = req.query
  const userId = req.user.id
  const now = new Date()
  const [y, m] = month ? month.split('-') : [now.getFullYear(), now.getMonth() + 1]
  const start = new Date(+y, +m - 1, 1)
  const end = new Date(+y, +m, 1)

  const closings = await prisma.dailyClosing.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: { date: 'desc' },
    include: { vehicle: true }
  })

  const totalRevenue = closings.reduce((s, c) => s + c.grossRevenue, 0)
  const totalCost = closings.reduce((s, c) => s + c.totalOperationalCost, 0)
  const totalNetProfit = closings.reduce((s, c) => s + c.netProfit, 0)
  const totalKm = closings.reduce((s, c) => s + c.kmDriven, 0)

  const reportData = {
    month: `${m}/${y}`,
    closings,
    summary: {
      totalRevenue,
      totalCost,
      totalNetProfit,
      totalKm,
      avgRevenuePerKm: totalKm > 0 ? totalRevenue / totalKm : 0,
      avgCostPerKm: totalKm > 0 ? totalCost / totalKm : 0,
      avgProfitPerKm: totalKm > 0 ? totalNetProfit / totalKm : 0,
    }
  }

  if (format === 'csv') {
    const headers = ['Data', 'Veículo', 'KM Rodados', 'Faturamento', 'Custo Combustível', 'Custos Fixos', 'Provisões', 'Gastos Rua', 'Custo Total', 'Lucro Líquido', 'R$/KM', 'Custo/KM', 'Lucro/KM']
    const rows = closings.map(c => [
      new Date(c.date).toLocaleDateString('pt-BR'),
      c.vehicle?.nickname || '',
      c.kmDriven.toFixed(1),
      c.grossRevenue.toFixed(2),
      c.fuelCost.toFixed(2),
      c.fixedCostDaily.toFixed(2),
      c.provisionCost.toFixed(2),
      c.streetExpenses.toFixed(2),
      c.totalOperationalCost.toFixed(2),
      c.netProfit.toFixed(2),
      c.revenuePerKm.toFixed(2),
      c.costPerKm.toFixed(2),
      c.profitPerKm.toFixed(2),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${month || 'atual'}.csv"`)
    return res.send(csv)
  }

  res.json(reportData)
})

module.exports = router
