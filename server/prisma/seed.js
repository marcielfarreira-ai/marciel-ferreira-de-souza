const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Default plans
  const trialPlan = await prisma.plan.upsert({
    where: { name: 'Trial 7 dias' },
    update: {},
    create: { name: 'Trial 7 dias', price: 0, description: '7 dias grátis para testar', durationDays: 7, billingCycle: 'monthly' }
  })
  const proPlan = await prisma.plan.upsert({
    where: { name: 'Pro Mensal' },
    update: {},
    create: { name: 'Pro Mensal', price: 29.90, description: 'Recursos avançados de relatório e gestão', durationDays: 30, billingCycle: 'monthly' }
  })
  const annualPlan = await prisma.plan.upsert({
    where: { name: 'Pro Anual' },
    update: {},
    create: { name: 'Pro Anual', price: 299.90, description: 'Todos os recursos - melhor custo', durationDays: 365, billingCycle: 'yearly' }
  })

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@driver.finance' },
    update: {},
    create: { name: 'Administrador', email: 'admin@driver.finance', password: adminPassword, role: 'admin', status: 'active' }
  })

  // Sample driver with onboarding completed
  const driverPassword = await bcrypt.hash('driver123', 10)
  const driver = await prisma.user.upsert({
    where: { email: 'motorista@exemplo.com' },
    update: { onboardingCompleted: true },
    create: {
      name: 'João Motorista', email: 'motorista@exemplo.com', password: driverPassword,
      role: 'driver', status: 'active', planId: proPlan.id, phone: '11999999999',
      onboardingCompleted: true
    }
  })

  // Create vehicle for sample driver
  const existingVehicle = await prisma.vehicle.count({ where: { userId: driver.id } })
  if (existingVehicle === 0) {
    const vehicle = await prisma.vehicle.create({
      data: {
        userId: driver.id,
        nickname: 'Meu BYD Dolphin',
        propulsionType: 'electric',
        tankCapacity: 60,
        initialOdometer: 15000,
        initialEnergyMeter: 5000,
        isPrimary: true,
      }
    })

    // Fuel prices
    await prisma.fuelPrice.create({ data: { userId: driver.id, fuelType: 'electric_kwh', pricePerUnit: 0.72 } })
    await prisma.fuelPrice.create({ data: { userId: driver.id, fuelType: 'gasoline', pricePerUnit: 6.49 } })

    // Fixed costs
    await prisma.fixedCost.create({
      data: {
        userId: driver.id,
        installment: 1200,
        insurance: 250,
        annualTaxes: 1200,
        maintenanceProvision: 0.08,
        tireProvision: 0.05,
      }
    })

    // Previous vehicle for comparison
    await prisma.previousVehicle.create({
      data: {
        userId: driver.id,
        consumptionKmPerLiter: 10,
        fuelPrice: 6.49,
      }
    })

    // Sample daily closings
    const now = new Date()
    const closings = [
      { date: new Date(now.getFullYear(), now.getMonth(), 1), odometer: 15050, energy: 5075, revenue: 180, street: 25, fuel: [{ fuelType: 'electric_kwh', amount: 18, quantity: 25, pricePerUnit: 0.72 }] },
      { date: new Date(now.getFullYear(), now.getMonth(), 2), odometer: 15120, energy: 5155, revenue: 220, street: 30, fuel: [{ fuelType: 'electric_kwh', amount: 21.6, quantity: 30, pricePerUnit: 0.72 }] },
      { date: new Date(now.getFullYear(), now.getMonth(), 3), odometer: 15190, energy: 5230, revenue: 195, street: 20, fuel: [{ fuelType: 'electric_kwh', amount: 18, quantity: 25, pricePerUnit: 0.72 }] },
      { date: new Date(now.getFullYear(), now.getMonth() - 1, 15), odometer: 14950, energy: 4950, revenue: 350, street: 40, fuel: [{ fuelType: 'electric_kwh', amount: 36, quantity: 50, pricePerUnit: 0.72 }] },
      { date: new Date(now.getFullYear(), now.getMonth() - 1, 20), odometer: 15000, energy: 5000, revenue: 280, street: 35, fuel: [{ fuelType: 'electric_kwh', amount: 28.8, quantity: 40, pricePerUnit: 0.72 }] },
    ]

    for (const c of closings) {
      const km = c.odometer - 15000
      const energy = c.energy - 5000
      const fuelCost = c.fuel.reduce((s, f) => s + f.amount, 0)
      const fixedDaily = (1200 + 250 + 1200 / 12) / 30
      const provision = km * 0.13
      const totalCost = fuelCost + fixedDaily + provision + c.street
      const netProfit = c.revenue - totalCost
      await prisma.dailyClosing.create({
        data: {
          userId: driver.id,
          vehicleId: vehicle.id,
          date: c.date,
          odometerReading: c.odometer,
          energyMeterReading: c.energy,
          grossRevenue: c.revenue,
          streetExpenses: c.street,
          fuelEntries: c.fuel,
          kmDriven: km,
          energyConsumed: energy,
          fuelCost,
          fixedCostDaily: fixedDaily,
          provisionCost: provision,
          totalOperationalCost: totalCost,
          netProfit,
          revenuePerKm: km > 0 ? c.revenue / km : 0,
          costPerKm: km > 0 ? totalCost / km : 0,
          profitPerKm: km > 0 ? netProfit / km : 0,
        }
      })
    }
  }

  console.log('Seed completed')
}

main().catch(console.error).finally(() => prisma.$disconnect())
