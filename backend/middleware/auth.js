const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || ''
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) return res.status(401).json({ erro: 'Token em falta' })

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.user = payload   // { id, uuid, nome, email, role }
    next()
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado' })
  }
}

module.exports = authMiddleware
