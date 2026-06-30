const express    = require('express')
const path       = require('path')
const fs         = require('fs')
const { getPool }    = require('../db')
const { UPLOAD_DIR } = require('../uploadMiddleware')

const router = express.Router()

/* GET /api/partilha/:token — info do recurso (sem autenticação) */
router.get('/:token', async (req, res) => {
  try {
    const db = await getPool()
    const { token } = req.params

    // Procurar em documentos
    const [[doc]] = await db.execute(
      'SELECT uuid, nome_original, tipo_mime, tamanho_bytes, extensao, criado_em FROM documentos WHERE token_partilha = ?',
      [token]
    )
    if (doc) return res.json({ tipo: 'documento', ...doc })

    // Procurar em pastas
    const [[pasta]] = await db.execute(
      'SELECT id, uuid, nome, criado_em FROM pastas WHERE token_partilha = ?',
      [token]
    )
    if (pasta) {
      const [docs] = await db.execute(
        'SELECT uuid, nome_original, tipo_mime, tamanho_bytes, extensao FROM documentos WHERE pasta_id = ?',
        [pasta.id]
      )
      const { id, ...pastaInfo } = pasta
      return res.json({ tipo: 'pasta', ...pastaInfo, documentos: docs })
    }

    res.status(404).json({ erro: 'Link de partilha não encontrado ou revogado' })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

/* GET /api/partilha/:token/download — download de ficheiro */
router.get('/:token/download', async (req, res) => {
  try {
    const db = await getPool()
    const [[doc]] = await db.execute(
      'SELECT nome_original, nome_arquivo FROM documentos WHERE token_partilha = ?',
      [req.params.token]
    )
    if (!doc) return res.status(404).json({ erro: 'Não encontrado' })
    const fp = path.resolve(UPLOAD_DIR, doc.nome_arquivo)
    if (!fs.existsSync(fp)) return res.status(404).json({ erro: 'Ficheiro não encontrado no disco' })
    res.download(fp, doc.nome_original)
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

/* GET /api/partilha/:token/download/:docUuid — download de ficheiro dentro de pasta partilhada */
router.get('/:token/download/:docUuid', async (req, res) => {
  try {
    const db = await getPool()
    const [[pasta]] = await db.execute(
      'SELECT id FROM pastas WHERE token_partilha = ?',
      [req.params.token]
    )
    if (!pasta) return res.status(404).json({ erro: 'Pasta não encontrada' })
    const [[doc]] = await db.execute(
      'SELECT nome_original, nome_arquivo FROM documentos WHERE uuid = ? AND pasta_id = ?',
      [req.params.docUuid, pasta.id]
    )
    if (!doc) return res.status(404).json({ erro: 'Documento não encontrado' })
    const fp = path.resolve(UPLOAD_DIR, doc.nome_arquivo)
    if (!fs.existsSync(fp)) return res.status(404).json({ erro: 'Ficheiro não encontrado no disco' })
    res.download(fp, doc.nome_original)
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

module.exports = router
