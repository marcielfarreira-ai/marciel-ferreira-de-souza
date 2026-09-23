const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { auth } = require('../middleware/auth')

const router = express.Router()
const prisma = new PrismaClient()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email }, include: { plan: true } })
  if (!user) return res.status(401).json({ error: 'Email ou senha inválidos' })

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return res.status(401).json({ error: 'Email ou senha inválidos' })
  if (user.status !== 'active') return res.status(403).json({ error: 'Conta inativa' })

  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } })
})

router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { plan: true },
    select: { id: true, name: true, email: true, role: true, phone: true, status: true, plan: true, subscriptionExpiresAt: true }
  })
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json({ user })
})

module.exports = router
