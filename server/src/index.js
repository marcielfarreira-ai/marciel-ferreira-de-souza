const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const financeRoutes = require('./routes/finance')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/finance', financeRoutes)

const PORT = process.env.PORT || 4000
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`))
