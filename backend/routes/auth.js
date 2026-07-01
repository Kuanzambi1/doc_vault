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
    { id: user.id, uuid: user.uuid, nome: user.nome, email: user.email, role: user.role, departamento_ids: user.departamento_ids, is_boss: user.is_boss },
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
      `SELECT u.id, u.uuid, u.nome, u.email, u.password_hash, u.role, u.ativo, 
              (SELECT GROUP_CONCAT(departamento_id) FROM utilizador_departamentos WHERE utilizador_id = u.id) AS departamento_ids,
              (SELECT GROUP_CONCAT(d.nome) FROM utilizador_departamentos ud JOIN departamentos d ON d.id = ud.departamento_id WHERE ud.utilizador_id = u.id) AS departamento_nomes
       FROM utilizadores u
       WHERE u.email = ?`,
      [email.toLowerCase().trim()]
    )

    if (!user) return res.status(401).json({ erro: 'Credenciais inválidas' })
    if (!user.ativo) return res.status(403).json({ erro: 'Conta desativada' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' })

    const { password_hash, ativo, departamento_ids, departamento_nomes, ...safe } = user
    safe.departamento_ids = departamento_ids ? departamento_ids.split(',').map(Number) : []
    const nomesArray = departamento_nomes ? departamento_nomes.split(',') : []
    safe.is_boss = nomesArray.includes('Geral')
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
      `SELECT u.id, u.uuid, u.nome, u.email, u.role, u.criado_em, 
              (SELECT GROUP_CONCAT(departamento_id) FROM utilizador_departamentos WHERE utilizador_id = u.id) AS departamento_ids,
              (SELECT GROUP_CONCAT(d.nome) FROM utilizador_departamentos ud JOIN departamentos d ON d.id = ud.departamento_id WHERE ud.utilizador_id = u.id) AS departamento_nomes
       FROM utilizadores u
       WHERE u.id = ?`,
      [req.user.id]
    )
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' })
    
    user.departamento_ids = user.departamento_ids ? user.departamento_ids.split(',').map(Number) : []
    const nomesArray = user.departamento_nomes ? user.departamento_nomes.split(',') : []
    user.is_boss = nomesArray.includes('Geral')
    delete user.departamento_nomes
    res.json(user)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

module.exports = router
