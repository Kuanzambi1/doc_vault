const express = require('express')
const { getPool } = require('../db')
const authMiddleware = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

/* GET /api/departamentos */
router.get('/', async (req, res) => {
  try {
    const db = await getPool()
    const [departamentos] = await db.execute('SELECT id, nome FROM departamentos ORDER BY nome ASC')
    res.json(departamentos)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

module.exports = router
