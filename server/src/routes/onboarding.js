const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { auth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.use(auth)

// GET onboarding status + existing data
router.get('/', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, onboardingCompleted: true, trialEndsAt: true, planId: true, plan: true }
  })
  const vehicles = await prisma.vehicle.findMany({ where: { userId: req.user.id } })
  const fuelPrices = await prisma.fuelPrice.findMany({ where: { userId: req.user.id } })
  const fixedCosts = await prisma.fixedCost.findFirst({ where: { userId: req.user.id } })
  const previousVehicle = await prisma.previousVehicle.findFirst({ where: { userId: req.user.id } })
  res.json({ user, vehicles, fuelPrices, fixedCosts, previousVehicle })
})

// POST complete onboarding (all steps at once)
router.post('/complete', async (req, res) => {
  const userId = req.user.id
  const { vehicle, odometer, energyMeter, fuelPrices, fixedCosts, previousVehicle } = req.body

  // Step 1+2: Create vehicle
  const v = await prisma.vehicle.create({
    data: {
      userId,
      nickname: vehicle.nickname,
      propulsionType: vehicle.propulsionType,
      tankCapacity: parseFloat(vehicle.tankCapacity) || 0,
      initialOdometer: parseFloat(odometer) || 0,
      initialEnergyMeter: parseFloat(energyMeter) || 0,
      isPrimary: true,
    }
  })

  // Step 3: Fuel prices
  if (fuelPrices && Array.isArray(fuelPrices)) {
    for (const fp of fuelPrices) {
      if (fp.pricePerUnit > 0) {
        await prisma.fuelPrice.create({
          data: { userId, fuelType: fp.fuelType, pricePerUnit: parseFloat(fp.pricePerUnit) }
        })
      }
    }
  }

  // Step 4: Fixed costs
  if (fixedCosts) {
    await prisma.fixedCost.create({
      data: {
        userId,
        installment: parseFloat(fixedCosts.installment) || 0,
        insurance: parseFloat(fixedCosts.insurance) || 0,
        annualTaxes: parseFloat(fixedCosts.annualTaxes) || 0,
        maintenanceProvision: parseFloat(fixedCosts.maintenanceProvision) || 0,
        tireProvision: parseFloat(fixedCosts.tireProvision) || 0,
      }
    })
  }

  // Step 5: Previous vehicle (optional)
  if (previousVehicle && previousVehicle.consumptionKmPerLiter > 0) {
    await prisma.previousVehicle.create({
      data: {
        userId,
        consumptionKmPerLiter: parseFloat(previousVehicle.consumptionKmPerLiter),
        fuelPrice: parseFloat(previousVehicle.fuelPrice) || 0,
      }
    })
  }

  // Mark onboarding complete + set trial
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true, trialEndsAt },
    select: { id: true, name: true, email: true, role: true, onboardingCompleted: true, trialEndsAt: true, plan: true }
  })

  res.json({ user: updatedUser, vehicle: v })
})

module.exports = router
