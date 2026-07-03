const jwt = require('jsonwebtoken')

async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) return res.status(401).json({ erro: 'Token em falta' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    
    // Fetch fresh user data from DB to ensure permissions are always up to date
    const { getPool } = require('../db')
    const db = await getPool()
    const [[user]] = await db.execute(
      `SELECT u.role, u.ativo,
              (SELECT GROUP_CONCAT(departamento_id) FROM utilizador_departamentos WHERE utilizador_id = u.id) AS departamento_ids,
              (SELECT GROUP_CONCAT(d.nome) FROM utilizador_departamentos ud JOIN departamentos d ON d.id = ud.departamento_id WHERE ud.utilizador_id = u.id) AS departamento_nomes
       FROM utilizadores u WHERE u.id = ?`,
      [payload.id]
    )

    if (!user || !user.ativo) {
      return res.status(403).json({ erro: 'Conta desativada ou removida' })
    }

    req.user = {
      ...payload,
      role: user.role,
      departamento_ids: user.departamento_ids ? user.departamento_ids.split(',').map(Number) : [],
      is_boss: user.departamento_nomes ? user.departamento_nomes.split(',').includes('Geral') : false
    }
    
    next()
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' })
  }
}

module.exports = authMiddleware
