const express  = require('express')
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { getPool }    = require('../db')
const authMiddleware = require('../middleware/auth')

const router = express.Router()
const SECRET  = () => process.env.JWT_SECRET || 'dev_secret'
const EXPIRES = () => process.env.JWT_EXPIRES_IN || '8h'

function makeToken(user) {
  return jwt.sign(
    { id: user.id, uuid: user.uuid, nome: user.nome, email: user.email, role: user.role },
    SECRET(),
    { expiresIn: EXPIRES() }
  )
}

/* POST /api/auth/registar */
router.post('/registar', async (req, res) => {
  try {
    const { nome, email, password } = req.body
    if (!nome || !email || !password)
      return res.status(400).json({ erro: 'Nome, email e password são obrigatórios' })
    if (password.length < 6)
      return res.status(400).json({ erro: 'Password deve ter pelo menos 6 caracteres' })

    const db = await getPool()
    const [[existe]] = await db.execute('SELECT id FROM utilizadores WHERE email = ?', [email])
    if (existe) return res.status(409).json({ erro: 'Email já registado' })

    const hash = await bcrypt.hash(password, 12)
    const uuid = uuidv4()

    // Primeiro utilizador é admin
    const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM utilizadores')
    const role = total === 0 ? 'admin' : 'user'

    const [r] = await db.execute(
      'INSERT INTO utilizadores (uuid, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [uuid, nome.trim(), email.toLowerCase().trim(), hash, role]
    )

    const user = { id: r.insertId, uuid, nome: nome.trim(), email, role }
    res.status(201).json({ utilizador: user, token: makeToken(user) })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ erro: 'Email e password são obrigatórios' })

    const db = await getPool()
    const [[user]] = await db.execute(
      'SELECT id, uuid, nome, email, password_hash, role, ativo FROM utilizadores WHERE email = ?',
      [email.toLowerCase().trim()]
    )

    if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' })
    if (!user.ativo) return res.status(403).json({ erro: 'Conta desativada' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' })

    const { password_hash, ativo, ...safe } = user
    res.json({ utilizador: safe, token: makeToken(safe) })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* GET /api/auth/me */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = await getPool()
    const [[user]] = await db.execute(
      'SELECT id, uuid, nome, email, role, criado_em FROM utilizadores WHERE id = ?',
      [req.user.id]
    )
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

module.exports = router
