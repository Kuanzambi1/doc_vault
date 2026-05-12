const express = require('express')
const bcrypt   = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { getPool }    = require('../db')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

// Middleware: só admin
const onlyAdmin = (req, _res, next) => {
  if (req.user.role !== 'admin') return next(Object.assign(new Error('Acesso negado'), { status: 403 }))
  next()
}

// GET /api/utilizadores — listar (admin vê todos, user só o próprio)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const db = await getPool()
    if (req.user.role === 'admin') {
      const [users] = await db.execute(
        'SELECT id, uuid, nome, email, role, ativo, criado_em FROM utilizadores ORDER BY nome ASC'
      )
      return res.json(users)
    }
    // user normal só vê a si
    const [[user]] = await db.execute(
      'SELECT id, uuid, nome, email, role, ativo, criado_em FROM utilizadores WHERE id = ?',
      [req.user.id]
    )
    res.json(user ? [user] : [])
  } catch (err) { next(err) }
})

// POST /api/utilizadores — criar (admin cria qualquer, user cria-se a si)
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { nome, email, password, role } = req.body
    if (!nome || !email || !password)
      return res.status(400).json({ erro: 'Nome, email e password são obrigatórios' })
    if (password.length < 6)
      return res.status(400).json({ erro: 'Password deve ter pelo menos 6 caracteres' })

    // Só admin pode definir role
    const isAdmin = req.user.role === 'admin'
    const novoRole = isAdmin && role ? role : 'user'

    const db = await getPool()
    const [[existe]] = await db.execute('SELECT id FROM utilizadores WHERE email = ?', [email.toLowerCase().trim()])
    if (existe) return res.status(409).json({ erro: 'Email já registado' })

    const hash  = await bcrypt.hash(password, 12)
    const uuid  = uuidv4()
    const [r]   = await db.execute(
      'INSERT INTO utilizadores (uuid, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [uuid, nome.trim(), email.toLowerCase().trim(), hash, novoRole]
    )
    const user = { id: r.insertId, uuid, nome: nome.trim(), email, role: novoRole, ativo: true }
    res.status(201).json(user)
  } catch (err) { next(err) }
})

// PATCH /api/utilizadores/:uuid — editar (admin edita todos, user edita só nome/senha)
router.patch('/:uuid', authMiddleware, async (req, res, next) => {
  try {
    const { nome, password, ativo, role } = req.body
    const db = await getPool()

    // Verificar propriedade
    const [[target]] = await db.execute('SELECT id, role FROM utilizadores WHERE uuid = ?', [req.params.uuid])
    if (!target) return res.status(404).json({ erro: 'Utilizador não encontrado' })

    const isOwner = req.user.id === target.id
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) return res.status(403).json({ erro: 'Acesso negado' })

    const updates = []
    const vals    = []

    if (nome && nome.trim()) {
      updates.push('nome = ?')
      vals.push(nome.trim())
    }

    if (password && password.length >= 6) {
      updates.push('password_hash = ?')
      vals.push(await bcrypt.hash(password, 12))
    }

    // Só admin pode alterar ativo e role
    if (isAdmin) {
      if (ativo !== undefined) {
        updates.push('ativo = ?')
        vals.push(ativo ? 1 : 0)
      }
      if (role) {
        updates.push('role = ?')
        vals.push(role)
      }
    }

    if (!updates.length) return res.status(400).json({ erro: 'Nada para atualizar' })

    vals.push(req.params.uuid)
    await db.execute(`UPDATE utilizadores SET ${updates.join(', ')} WHERE uuid = ?`, vals)
    res.json({ mensagem: 'Atualizado com sucesso' })
  } catch (err) { next(err) }
})

// DELETE /api/utilizadores/:uuid — eliminar (só admin)
router.delete('/:uuid', authMiddleware, onlyAdmin, async (req, res, next) => {
  try {
    const db = await getPool()
    const [[user]] = await db.execute('SELECT id, nome FROM utilizadores WHERE uuid = ?', [req.params.uuid])
    if (!user) return res.status(404).json({ erro: 'Utilizador não encontrado' })
    if (user.id === req.user.id) return res.status(400).json({ erro: 'Não podes eliminar-te a ti mesmo' })

    await db.execute('DELETE FROM utilizadores WHERE uuid = ?', [req.params.uuid])
    res.json({ mensagem: `Utilizador "${user.nome}" eliminado` })
  } catch (err) { next(err) }
})

module.exports = router