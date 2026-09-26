const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { auth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.use(auth)

// Helper: get current odometer from latest closing or vehicle initial
async function getCurrentOdometer(userId, vehicleId) {
  const lastClosing = await prisma.dailyClosing.findFirst({
    where: { userId, vehicleId },
    orderBy: { date: 'desc' },
  })
  return lastClosing ? lastClosing.odometerReading : null
}

// GET all vehicle settings
router.get('/', async (req, res) => {
  const userId = req.user.id
  const vehicle = await prisma.vehicle.findFirst({ where: { userId, isPrimary: true } })
  const fuelPrices = await prisma.fuelPrice.findMany({ where: { userId } })
  const fixedCosts = await prisma.fixedCost.findFirst({ where: { userId } })
  const previousVehicle = await prisma.previousVehicle.findFirst({ where: { userId } })

  let currentOdometer = vehicle?.initialOdometer || 0
  if (vehicle) {
    const odo = await getCurrentOdometer(userId, vehicle.id)
    if (odo !== null) currentOdometer = odo
  }

  res.json({ vehicle, fuelPrices, fixedCosts, previousVehicle, currentOdometer })
})

// PUT update all settings + recalculate provisions
router.put('/', async (req, res) => {
  const userId = req.user.id
  const { vehicle, fuelPrices, fixedCosts, previousVehicle } = req.body

  // ── Update vehicle ──
  if (vehicle) {
    const existing = await prisma.vehicle.findFirst({ where: { userId, isPrimary: true } })
    if (existing) {
      await prisma.vehicle.update({
        where: { id: existing.id },
        data: {
          nickname: vehicle.nickname,
          propulsionType: vehicle.propulsionType,
          tankCapacity: parseFloat(vehicle.tankCapacity) || 0,
          initialOdometer: parseFloat(vehicle.initialOdometer) || 0,
          initialEnergyMeter: parseFloat(vehicle.initialEnergyMeter) || 0,
          tireCost: parseFloat(vehicle.tireCost) || 0,
          tireIntervalKm: parseFloat(vehicle.tireIntervalKm) || 0,
          oilChangeCost: parseFloat(vehicle.oilChangeCost) || 0,
          oilIntervalKm: parseFloat(vehicle.oilIntervalKm) || 0,
          maintenanceCost: parseFloat(vehicle.maintenanceCost) || 0,
          maintenanceOddCost: parseFloat(vehicle.maintenanceOddCost) || 0,
          maintenanceEvenCost: parseFloat(vehicle.maintenanceEvenCost) || 0,
          maintenanceIntervalKm: parseFloat(vehicle.maintenanceIntervalKm) || 0,
          useAlternatingMaint: vehicle.useAlternatingMaint || false,
          gnvInspectionCost: parseFloat(vehicle.gnvInspectionCost) || 0,
          gnvInspectionDate: vehicle.gnvInspectionDate ? new Date(vehicle.gnvInspectionDate) : null,
        },
      })
    }
  }

  // ── Update fuel prices (upsert per fuelType) ──
  if (fuelPrices && Array.isArray(fuelPrices)) {
    for (const fp of fuelPrices) {
      const existing = await prisma.fuelPrice.findFirst({ where: { userId, fuelType: fp.fuelType } })
      if (existing) {
        await prisma.fuelPrice.update({
          where: { id: existing.id },
          data: { pricePerUnit: parseFloat(fp.pricePerUnit) || 0 },
        })
      } else {
        await prisma.fuelPrice.create({
          data: { userId, fuelType: fp.fuelType, pricePerUnit: parseFloat(fp.pricePerUnit) || 0 },
        })
      }
    }
  }

  // ── Recalculate provisions per km from detailed params ──
  let maintenanceProvision = 0
  let tireProvision = 0

  if (vehicle) {
    // Tire provision
    const tc = parseFloat(vehicle.tireCost) || 0
    const ti = parseFloat(vehicle.tireIntervalKm) || 0
    if (tc > 0 && ti > 0) tireProvision = tc / ti

    // Maintenance/revision provision
    const mi = parseFloat(vehicle.maintenanceIntervalKm) || 0
    if (vehicle.useAlternatingMaint && mi > 0) {
      const avgCost = (parseFloat(vehicle.maintenanceOddCost) + parseFloat(vehicle.maintenanceEvenCost)) / 2
      maintenanceProvision += avgCost / mi
    } else {
      const mc = parseFloat(vehicle.maintenanceCost) || 0
      if (mc > 0 && mi > 0) maintenanceProvision += mc / mi
    }

    // Oil change provision (folded into maintenance)
    const oc = parseFloat(vehicle.oilChangeCost) || 0
    const oi = parseFloat(vehicle.oilIntervalKm) || 0
    if (oc > 0 && oi > 0) maintenanceProvision += oc / oi
  }

  // ── Update fixed costs ──
  if (fixedCosts) {
    const existing = await prisma.fixedCost.findFirst({ where: { userId } })
    const data = {
      installment: parseFloat(fixedCosts.installment) || 0,
      insurance: parseFloat(fixedCosts.insurance) || 0,
      annualTaxes: parseFloat(fixedCosts.annualTaxes) || 0,
      washCostWeekly: parseFloat(fixedCosts.washCostWeekly) || 0,
      maintenanceProvision,
      tireProvision,
    }
    if (existing) {
      await prisma.fixedCost.update({ where: { id: existing.id }, data })
    } else {
      await prisma.fixedCost.create({ data: { userId, ...data } })
    }
  }

  // ── Update previous vehicle ──
  if (previousVehicle) {
    const existing = await prisma.previousVehicle.findFirst({ where: { userId } })
    const data = {
      consumptionKmPerLiter: parseFloat(previousVehicle.consumptionKmPerLiter) || 0,
      fuelPrice: parseFloat(previousVehicle.fuelPrice) || 0,
    }
    if (existing) {
      await prisma.previousVehicle.update({ where: { id: existing.id }, data })
    } else if (data.consumptionKmPerLiter > 0) {
      await prisma.previousVehicle.create({ data: { userId, ...data } })
    }
  }

  res.json({ success: true, maintenanceProvision, tireProvision })
})

// POST reset maintenance marker — saves current odometer as new base
router.post('/reset-maintenance', async (req, res) => {
  const userId = req.user.id
  const { type } = req.body // 'tires' | 'oil' | 'maintenance'

  const vehicle = await prisma.vehicle.findFirst({ where: { userId, isPrimary: true } })
  if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado' })

  let currentOdometer = vehicle.initialOdometer
  const odo = await getCurrentOdometer(userId, vehicle.id)
  if (odo !== null) currentOdometer = odo

  const updateData = {}
  if (type === 'tires') updateData.lastTireChangeKm = currentOdometer
  else if (type === 'oil') updateData.lastOilChangeKm = currentOdometer
  else if (type === 'maintenance') updateData.lastMaintenanceKm = currentOdometer
  else return res.status(400).json({ error: 'Tipo de manutenção inválido' })

  await prisma.vehicle.update({ where: { id: vehicle.id }, data: updateData })

  res.json({ success: true, currentOdometer, type })
})

module.exports = router
