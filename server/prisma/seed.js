const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // Default plans
  const freePlan = await prisma.plan.upsert({
    where: { name: 'Gratuito' },
    update: {},
    create: { name: 'Gratuito', price: 0, description: 'Acesso básico', durationDays: 0 }
  })
  const proPlan = await prisma.plan.upsert({
    where: { name: 'Pro' },
    update: {},
    create: { name: 'Pro', price: 29.90, description: 'Recursos avançados de relatório', durationDays: 30 }
  })
  const premiumPlan = await prisma.plan.upsert({
    where: { name: 'Premium' },
    update: {},
    create: { name: 'Premium', price: 49.90, description: 'Todos os recursos disponíveis', durationDays: 30 }
  })

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@driver.finance' },
    update: {},
    create: { name: 'Administrador', email: 'admin@driver.finance', password: adminPassword, role: 'admin', status: 'active' }
  })

  // Sample driver
  const driverPassword = await bcrypt.hash('driver123', 10)
  const driver = await prisma.user.upsert({
    where: { email: 'motorista@exemplo.com' },
    update: {},
    create: { name: 'João Motorista', email: 'motorista@exemplo.com', password: driverPassword, role: 'driver', status: 'active', planId: proPlan.id, phone: '11999999999' }
  })

  // Sample transactions
  const existing = await prisma.transaction.count({ where: { userId: driver.id } })
  if (existing === 0) {
    const now = new Date()
    const txs = [
      { type: 'income', amount: 150.00, category: 'Corridas', platform: 'Uber', date: new Date(now.getFullYear(), now.getMonth(), 1) },
      { type: 'income', amount: 85.50, category: 'Corridas', platform: '99', date: new Date(now.getFullYear(), now.getMonth(), 2) },
      { type: 'expense', amount: 60.00, category: 'Combustível', platform: null, date: new Date(now.getFullYear(), now.getMonth(), 1) },
      { type: 'income', amount: 200.00, category: 'Corridas', platform: 'Uber', date: new Date(now.getFullYear(), now.getMonth(), 3) },
      { type: 'expense', amount: 25.00, category: 'Alimentação', platform: null, date: new Date(now.getFullYear(), now.getMonth(), 2) },
      { type: 'income', amount: 120.00, category: 'Gorjetas', platform: 'Uber', date: new Date(now.getFullYear(), now.getMonth(), 3) },
      { type: 'income', amount: 1800.00, category: 'Corridas', platform: 'Uber', date: new Date(now.getFullYear(), now.getMonth() - 1, 15) },
      { type: 'expense', amount: 400.00, category: 'Combustível', platform: null, date: new Date(now.getFullYear(), now.getMonth() - 1, 10) },
      { type: 'income', amount: 950.00, category: 'Corridas', platform: '99', date: new Date(now.getFullYear(), now.getMonth() - 1, 20) },
      { type: 'expense', amount: 150.00, category: 'Manutenção', platform: null, date: new Date(now.getFullYear(), now.getMonth() - 1, 5) },
    ]
    for (const t of txs) {
      await prisma.transaction.create({ data: { ...t, userId: driver.id } })
    }
  }

  console.log('Seed completed')
}

main().catch(console.error).finally(() => prisma.$disconnect())
