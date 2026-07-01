const express = require('express')
const bcrypt   = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { getPool }    = require('../db')
const authMiddleware = require('../middleware/auth')
const path = require('path')
const fs = require('fs')
const { UPLOAD_DIR } = require('../uploadMiddleware')

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
    let usersData = []
    
    if (req.user.role === 'admin') {
      const [users] = await db.execute(
        `SELECT u.id, u.uuid, u.nome, u.email, u.role, u.ativo, u.criado_em, 
                (SELECT GROUP_CONCAT(departamento_id) FROM utilizador_departamentos WHERE utilizador_id = u.id) AS departamento_ids,
                (SELECT GROUP_CONCAT(d.nome) FROM utilizador_departamentos ud JOIN departamentos d ON d.id = ud.departamento_id WHERE ud.utilizador_id = u.id) AS departamento_nomes
         FROM utilizadores u
         ORDER BY u.nome ASC`
      )
      usersData = users
    } else {
      // user normal só vê a si
      const [[user]] = await db.execute(
        `SELECT u.id, u.uuid, u.nome, u.email, u.role, u.ativo, u.criado_em,
                (SELECT GROUP_CONCAT(departamento_id) FROM utilizador_departamentos WHERE utilizador_id = u.id) AS departamento_ids,
                (SELECT GROUP_CONCAT(d.nome) FROM utilizador_departamentos ud JOIN departamentos d ON d.id = ud.departamento_id WHERE ud.utilizador_id = u.id) AS departamento_nomes
         FROM utilizadores u
         WHERE u.id = ?`,
        [req.user.id]
      )
      usersData = user ? [user] : []
    }

    // Tratar os arrays
    usersData.forEach(u => {
      u.departamentos = u.departamento_ids ? u.departamento_ids.split(',').map(Number) : []
      const nomes = u.departamento_nomes ? u.departamento_nomes.split(',') : []
      u.departamento_nome = nomes.join(', ') // Compatibilidade com frontend
      delete u.departamento_ids
      delete u.departamento_nomes
    })

    res.json(usersData)
  } catch (err) { next(err) }
})

// POST /api/utilizadores — criar (admin cria qualquer, user cria-se a si)
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { nome, email, password, role, departamentos } = req.body
    if (!nome || !email || !password)
      return res.status(400).json({ erro: 'Nome, email e password são obrigatórios' })
    if (password.length < 6)
      return res.status(400).json({ erro: 'Password deve ter pelo menos 6 caracteres' })

    // Só admin pode definir role e departamentos
    const isAdmin = req.user.role === 'admin'
    const novoRole = isAdmin && role ? role : 'user'
    const depsToAssign = isAdmin && Array.isArray(departamentos) ? departamentos : []

    const db = await getPool()
    const [[existe]] = await db.execute('SELECT id FROM utilizadores WHERE email = ?', [email.toLowerCase().trim()])
    if (existe) return res.status(409).json({ erro: 'Email já registado' })

    const hash  = await bcrypt.hash(password, 12)
    const uuid  = uuidv4()
    const [r]   = await db.execute(
      'INSERT INTO utilizadores (uuid, nome, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [uuid, nome.trim(), email.toLowerCase().trim(), hash, novoRole]
    )
    const newUserId = r.insertId

    // Inserir departamentos
    if (depsToAssign.length > 0) {
      const vals = depsToAssign.map(dId => [newUserId, dId])
      await db.query('INSERT INTO utilizador_departamentos (utilizador_id, departamento_id) VALUES ?', [vals])
    }

    const user = { id: newUserId, uuid, nome: nome.trim(), email, role: novoRole, ativo: true, departamentos: depsToAssign }
    res.status(201).json(user)
  } catch (err) { next(err) }
})

// PATCH /api/utilizadores/:uuid — editar (admin edita todos, user edita só nome/senha)
router.patch('/:uuid', authMiddleware, async (req, res, next) => {
  try {
    const { nome, password, ativo, role, departamentos } = req.body
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

    // Só admin pode alterar ativo, role e departamentos
    if (isAdmin) {
      if (ativo !== undefined) {
        updates.push('ativo = ?')
        vals.push(ativo ? 1 : 0)
      }
      if (role) {
        updates.push('role = ?')
        vals.push(role)
      }
      if (Array.isArray(departamentos)) {
        // Atualizar departamentos intermédios
        await db.execute('DELETE FROM utilizador_departamentos WHERE utilizador_id = ?', [target.id])
        if (departamentos.length > 0) {
          const depsVals = departamentos.map(dId => [target.id, dId])
          await db.query('INSERT INTO utilizador_departamentos (utilizador_id, departamento_id) VALUES ?', [depsVals])
        }
      }
    }

    if (!updates.length) return res.status(200).json({ mensagem: 'Atualizado com sucesso (sem alterações no utilizador)' })

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

    // Remover ficheiros físicos
    const [docs] = await db.execute('SELECT nome_arquivo FROM documentos WHERE dono_id = ?', [user.id])
    for (const doc of docs) {
      const fp = path.resolve(UPLOAD_DIR, doc.nome_arquivo)
      if (fs.existsSync(fp)) fs.unlinkSync(fp)
    }

    // Remover registos da base de dados (cascade manual)
    await db.execute('DELETE FROM documentos WHERE dono_id = ?', [user.id])
    await db.execute('DELETE FROM pastas WHERE dono_id = ?', [user.id])

    await db.execute('DELETE FROM utilizadores WHERE uuid = ?', [req.params.uuid])
    res.json({ mensagem: `Utilizador "${user.nome}" eliminado` })
  } catch (err) { next(err) }
})

module.exports = router