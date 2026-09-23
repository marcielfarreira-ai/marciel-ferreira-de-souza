const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { auth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.use(auth)

router.get('/dashboard', async (req, res) => {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const transactions = await prisma.transaction.findMany({ where: { userId: req.user.id, date: { gte: startOfMonth, lt: endOfMonth } } })
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const monthTx = await prisma.transaction.findMany({ where: { userId: req.user.id, date: { gte: start, lt: end } } })
    const mIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const mExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    monthlyData.push({ month: start.toLocaleDateString('pt-BR', { month: 'short' }), income: mIncome, expenses: mExpense, profit: mIncome - mExpense })
  }

  const recent = await prisma.transaction.findMany({ where: { userId: req.user.id }, orderBy: { date: 'desc' }, take: 5 })
  res.json({ income, expenses, profit: income - expenses, transactionCount: transactions.length, monthlyData, recent })
})

router.get('/transactions', async (req, res) => {
  const { type, month } = req.query
  const where = { userId: req.user.id }
  if (type) where.type = type
  if (month) {
    const [y, m] = month.split('-')
    where.date = { gte: new Date(+y, +m - 1, 1), lt: new Date(+y, +m, 1) }
  }
  const transactions = await prisma.transaction.findMany({ where, orderBy: { date: 'desc' } })
  res.json({ transactions })
})

router.post('/transactions', async (req, res) => {
  const { type, amount, category, description, platform, date } = req.body
  const transaction = await prisma.transaction.create({
    data: { userId: req.user.id, type, amount: parseFloat(amount), category, description, platform, date: new Date(date) }
  })
  res.json({ transaction })
})

router.put('/transactions/:id', async (req, res) => {
  const { type, amount, category, description, platform, date } = req.body
  const data = {}
  if (type !== undefined) data.type = type
  if (amount !== undefined) data.amount = parseFloat(amount)
  if (category !== undefined) data.category = category
  if (description !== undefined) data.description = description
  if (platform !== undefined) data.platform = platform
  if (date !== undefined) data.date = new Date(date)
  const transaction = await prisma.transaction.update({ where: { id: req.params.id, userId: req.user.id }, data })
  res.json({ transaction })
})

router.delete('/transactions/:id', async (req, res) => {
  await prisma.transaction.delete({ where: { id: req.params.id, userId: req.user.id } })
  res.json({ success: true })
})

router.get('/reports', async (req, res) => {
  const { month } = req.query
  const now = new Date()
  const [y, m] = month ? month.split('-') : [now.getFullYear(), now.getMonth() + 1]
  const start = new Date(+y, +m - 1, 1)
  const end = new Date(+y, +m, 1)

  const transactions = await prisma.transaction.findMany({ where: { userId: req.user.id, date: { gte: start, lt: end } }, orderBy: { date: 'desc' } })
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const expenseByCategory = {}
  const incomeByPlatform = {}
  transactions.forEach(t => {
    if (t.type === 'expense') expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount
    if (t.type === 'income' && t.platform) incomeByPlatform[t.platform] = (incomeByPlatform[t.platform] || 0) + t.amount
  })

  res.json({
    income, expenses, profit: income - expenses, transactionCount: transactions.length,
    expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value })),
    incomeByPlatform: Object.entries(incomeByPlatform).map(([name, value]) => ({ name, value })),
    transactions
  })
})

module.exports = router
