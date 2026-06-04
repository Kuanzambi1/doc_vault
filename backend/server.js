require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const path    = require('path')
const { initDB }       = require('./db')
const authRoutes       = require('./routes/auth')
const pastasRoutes     = require('./routes/pastas')
const documentosRoutes = require('./routes/documentos')
const usersRoutes       = require('./routes/utilizadores')

const app  = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth',       authRoutes)
app.use('/api/pastas',     pastasRoutes)
app.use('/api/documentos', documentosRoutes)
app.use('/api/utilizadores', usersRoutes)
app.get('/api/status', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

// Serve build React em produção
const dist = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(dist))
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ erro: 'Ficheiro demasiado grande' })
  if (err.message?.includes('Tipo não permitido')) return res.status(415).json({ erro: err.message })
  console.error('❌', err.message)
  res.status(500).json({ erro: 'Erro interno' })
})

async function start() {
  try {
    await initDB()
    app.listen(PORT, () => console.log(`🚀  http://localhost:${PORT}`))
  } catch (err) {
    console.error('❌  Server failed to start:')
    console.error(err.stack || err.message)
    process.exit(1)
  }
}
start()
