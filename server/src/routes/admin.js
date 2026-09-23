const express = require('express')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { auth, adminOnly } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.use(auth, adminOnly)

router.get('/dashboard', async (req, res) => {
  const totalDrivers = await prisma.user.count({ where: { role: 'driver' } })
  const activeDrivers = await prisma.user.count({ where: { role: 'driver', status: 'active' } })
  const inactiveDrivers = await prisma.user.count({ where: { role: 'driver', status: 'inactive' } })

  const drivers = await prisma.user.findMany({ where: { role: 'driver' }, include: { plan: true } })

  // MRR: sum of monthly plan prices for active drivers
  const monthlyRevenue = drivers
    .filter(d => d.status === 'active' && d.plan && d.plan.billingCycle === 'monthly' && d.plan.price > 0)
    .reduce((sum, d) => sum + d.plan.price, 0)
  const yearlyRevenue = drivers
    .filter(d => d.status === 'active' && d.plan && d.plan.billingCycle === 'yearly' && d.plan.price > 0)
    .reduce((sum, d) => sum + d.plan.price / 12, 0)
  const mrr = monthlyRevenue + yearlyRevenue

  // Churn: drivers who became inactive this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const churnedThisMonth = await prisma.user.count({
    where: { role: 'driver', status: 'inactive', updatedAt: { gte: monthStart } }
  })
  const churnRate = totalDrivers > 0 ? (churnedThisMonth / totalDrivers) * 100 : 0

  // Inadimplência: active drivers with expired subscription
  const inadimplentes = drivers.filter(d =>
    d.status === 'active' && d.subscriptionExpiresAt && new Date(d.subscriptionExpiresAt) < now
  ).length

  // Trial users
  const trialUsers = drivers.filter(d =>
    d.trialEndsAt && new Date(d.trialEndsAt) > now && !d.planId
  ).length

  const recentDrivers = await prisma.user.findMany({
    where: { role: 'driver' }, include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 5
  })

  // Last 6 months MRR trend
  const mrrTrend = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthDrivers = await prisma.user.findMany({
      where: { role: 'driver', createdAt: { lt: end }, status: 'active' },
      include: { plan: true }
    })
    const monthMrr = monthDrivers
      .filter(d => d.plan && d.plan.price > 0)
      .reduce((sum, d) => sum + (d.plan.billingCycle === 'yearly' ? d.plan.price / 12 : d.plan.price), 0)
    mrrTrend.push({ month: start.toLocaleDateString('pt-BR', { month: 'short' }), mrr: monthMrr })
  }

  res.json({
    totalDrivers, activeDrivers, inactiveDrivers, mrr, churnRate, churnedThisMonth,
    inadimplentes, trialUsers, recentDrivers, mrrTrend
  })
})

router.get('/drivers', async (req, res) => {
  const drivers = await prisma.user.findMany({ where: { role: 'driver' }, include: { plan: true }, orderBy: { createdAt: 'desc' } })
  res.json({ drivers: drivers.map(d => ({ ...d, password: undefined })) })
})

router.post('/drivers', async (req, res) => {
  const { name, email, password, phone, planId } = req.body
  if (await prisma.user.findUnique({ where: { email } })) return res.status(400).json({ error: 'Email já cadastrado' })
  const hashed = await bcrypt.hash(password, 10)
  const driver = await prisma.user.create({ data: { name, email, password: hashed, phone, role: 'driver', planId: planId || null } })
  res.json({ driver: { ...driver, password: undefined } })
})

router.put('/drivers/:id', async (req, res) => {
  const { name, email, phone, planId, status } = req.body
  const data = {}
  if (name !== undefined) data.name = name
  if (email !== undefined) data.email = email
  if (phone !== undefined) data.phone = phone
  if (planId !== undefined) data.planId = planId || null
  if (status !== undefined) data.status = status
  const driver = await prisma.user.update({ where: { id: req.params.id }, data, include: { plan: true } })
  res.json({ driver: { ...driver, password: undefined } })
})

router.patch('/drivers/:id/status', async (req, res) => {
  const driver = await prisma.user.findUnique({ where: { id: req.params.id } })
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: driver.status === 'active' ? 'inactive' : 'active' },
    include: { plan: true }
  })
  res.json({ driver: { ...updated, password: undefined } })
})

router.get('/plans', async (req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { price: 'asc' } })
  res.json({ plans })
})

router.post('/plans', async (req, res) => {
  const { name, price, description, durationDays, billingCycle } = req.body
  const plan = await prisma.plan.create({ data: { name, price, description, durationDays: durationDays || 30, billingCycle: billingCycle || 'monthly' } })
  res.json({ plan })
})

router.put('/plans/:id', async (req, res) => {
  const { name, price, description, durationDays, billingCycle } = req.body
  const plan = await prisma.plan.update({ where: { id: req.params.id }, data: { name, price, description, durationDays, billingCycle } })
  res.json({ plan })
})

router.delete('/plans/:id', async (req, res) => {
  await prisma.plan.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

module.exports = router
