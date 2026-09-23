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
  const drivers = await prisma.user.findMany({ where: { role: 'driver' }, include: { plan: true } })
  const monthlyRevenue = drivers
    .filter(d => d.status === 'active' && d.plan && d.plan.price > 0)
    .reduce((sum, d) => sum + d.plan.price, 0)
  const recentDrivers = await prisma.user.findMany({
    where: { role: 'driver' }, include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 5
  })
  res.json({ totalDrivers, activeDrivers, monthlyRevenue, recentDrivers })
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
  const { name, price, description, durationDays } = req.body
  const plan = await prisma.plan.create({ data: { name, price, description, durationDays: durationDays || 30 } })
  res.json({ plan })
})

router.put('/plans/:id', async (req, res) => {
  const { name, price, description, durationDays } = req.body
  const plan = await prisma.plan.update({ where: { id: req.params.id }, data: { name, price, description, durationDays } })
  res.json({ plan })
})

router.delete('/plans/:id', async (req, res) => {
  await prisma.plan.delete({ where: { id: req.params.id } })
  res.json({ success: true })
})

module.exports = router
