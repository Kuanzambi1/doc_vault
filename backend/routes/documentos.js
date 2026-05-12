const express  = require('express')
const path     = require('path')
const fs       = require('fs')
const archiver = require('archiver')
const { v4: uuidv4 }      = require('uuid')
const { getPool }         = require('../db')
const authMiddleware      = require('../middleware/auth')
const { upload, UPLOAD_DIR } = require('../uploadMiddleware')

const router = express.Router()
router.use(authMiddleware)

/* Upload */
router.post('/', upload.array('files', 50), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ erro: 'Nenhum ficheiro recebido' })
  const db = await getPool()
  const { pasta_uuid } = req.body
  let pastaId = null

  if (pasta_uuid) {
    const [[p]] = await db.execute(
      'SELECT id FROM pastas WHERE uuid = ? AND dono_id = ?', [pasta_uuid, req.user.id]
    )
    if (p) pastaId = p.id
  }

  const resultados = []
  for (const file of req.files) {
    const ext  = path.extname(file.originalname).toLowerCase().replace('.', '')
    const uuid = uuidv4()
    try {
      const [r] = await db.execute(
        `INSERT INTO documentos (uuid, nome_original, nome_arquivo, tipo_mime, tamanho_bytes, extensao, pasta_id, dono_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, file.originalname, file.filename, file.mimetype, file.size, ext, pastaId, req.user.id]
      )
      resultados.push({ id: r.insertId, uuid, nome_original: file.originalname, ok: true })
    } catch (err) {
      fs.unlink(file.path, () => {})
      resultados.push({ nome_original: file.originalname, erro: err.message })
    }
  }
  res.status(201).json({ documentos: resultados })
})

/* Listagem */
router.get('/', async (req, res) => {
  try {
    const db     = await getPool()
    const pagina = Math.max(1, parseInt(req.query.pagina) || 1)
    const limite = Math.min(100, parseInt(req.query.limite) || 25)
    const busca  = req.query.busca ? `%${req.query.busca}%` : null
    const pastaUuid = req.query.pasta_uuid || null
    const offset = (pagina - 1) * limite

    const where = ['d.dono_id = ?']
    const params = [req.user.id]

    if (pastaUuid === 'raiz') {
      where.push('d.pasta_id IS NULL')
    } else if (pastaUuid) {
      const [[p]] = await db.execute('SELECT id FROM pastas WHERE uuid = ?', [pastaUuid])
      if (p) { where.push('d.pasta_id = ?'); params.push(p.id) }
    }
    if (busca) { where.push('d.nome_original LIKE ?'); params.push(busca) }

    const cond = 'WHERE ' + where.join(' AND ')
    const [[{ total }]] = await db.execute(`SELECT COUNT(*) AS total FROM documentos d ${cond}`, params)
    const [rows] = await db.execute(
      `SELECT d.id, d.uuid, d.nome_original, d.tipo_mime, d.tamanho_bytes,
              d.extensao, d.criado_em, d.pasta_id,
              p.nome AS pasta_nome, p.uuid AS pasta_uuid
       FROM documentos d LEFT JOIN pastas p ON p.id = d.pasta_id
       ${cond} ORDER BY d.criado_em DESC LIMIT ? OFFSET ?`,
      [...params, limite, offset]
    )
    res.json({ total, pagina, limite, paginas: Math.ceil(total / limite) || 1, documentos: rows })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* Download individual */
router.get('/:uuid/download', async (req, res) => {
  try {
    const db = await getPool()
    const [[doc]] = await db.execute(
      'SELECT * FROM documentos WHERE uuid = ? AND dono_id = ?', 
      [req.params.uuid, req.user.id]
    )
    if (!doc) return res.status(404).json({ erro: 'Não encontrado' })
    
    // 🔍 LOGS DE DEBUG
    console.log('=== DEBUG DOWNLOAD ===')
    console.log('UPLOAD_DIR:', UPLOAD_DIR)
    console.log('nome_arquivo:', doc.nome_arquivo)
    console.log('nome_original:', doc.nome_original)
    
    const fp = path.resolve(UPLOAD_DIR, doc.nome_arquivo)
    console.log('Caminho completo:', fp)
    console.log('Arquivo existe?', fs.existsSync(fp))
    
    // Listar arquivos na pasta uploads para comparar
    if (fs.existsSync(UPLOAD_DIR)) {
      const arquivos = fs.readdirSync(UPLOAD_DIR)
      console.log(`Total de arquivos em ${UPLOAD_DIR}:`, arquivos.length)
      console.log('Primeiros 5 arquivos:', arquivos.slice(0, 5))
      
      // Verificar se o arquivo está lá com nome diferente
      const encontrado = arquivos.find(f => f === doc.nome_arquivo)
      console.log('Arquivo encontrado na lista?', encontrado || 'NÃO')
    } else {
      console.log('❌ UPLOAD_DIR não existe:', UPLOAD_DIR)
    }
    // ====================
    
    if (!fs.existsSync(fp)) {
      return res.status(404).json({ 
        erro: 'Ficheiro não encontrado no disco',
        caminho_procurado: fp,
        arquivo_bd: doc.nome_arquivo
      })
    }
    
    res.download(fp, doc.nome_original)
  } catch (err) {
    console.error('Erro no download:', err)
    res.status(500).json({ erro: err.message })
  }
})

/* Download ZIP */
router.post('/download-zip', async (req, res) => {
  try {
    const { uuids } = req.body
    if (!uuids?.length) return res.status(400).json({ erro: 'Sem UUIDs' })
    const db = await getPool()
    const ph = uuids.map(() => '?').join(',')
    const [docs] = await db.execute(
      `SELECT nome_original, nome_arquivo FROM documentos WHERE uuid IN (${ph}) AND dono_id = ?`,
      [...uuids, req.user.id]
    )
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="documentos.zip"')
    const arc = archiver('zip', { zlib: { level: 6 } })
    arc.pipe(res)
    for (const d of docs) {
      const p = path.resolve(UPLOAD_DIR, d.nome_arquivo)
      if (fs.existsSync(p)) arc.file(p, { name: d.nome_original })
    }
    await arc.finalize()
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* Mover */
router.patch('/:uuid/mover', async (req, res) => {
  try {
    const db = await getPool()
    const { pasta_uuid } = req.body
    let pastaId = null
    if (pasta_uuid) {
      const [[p]] = await db.execute('SELECT id FROM pastas WHERE uuid = ? AND dono_id = ?', [pasta_uuid, req.user.id])
      if (!p) return res.status(404).json({ erro: 'Pasta não encontrada' })
      pastaId = p.id
    }
    const [r] = await db.execute(
      'UPDATE documentos SET pasta_id = ? WHERE uuid = ? AND dono_id = ?',
      [pastaId, req.params.uuid, req.user.id]
    )
    if (!r.affectedRows) return res.status(404).json({ erro: 'Documento não encontrado' })
    res.json({ mensagem: 'Movido' })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* Eliminar um */
router.delete('/:uuid', async (req, res) => {
  try {
    const db = await getPool()
    const [[doc]] = await db.execute(
      'SELECT * FROM documentos WHERE uuid = ? AND dono_id = ?', [req.params.uuid, req.user.id]
    )
    if (!doc) return res.status(404).json({ erro: 'Não encontrado' })
    const p = path.resolve(UPLOAD_DIR, doc.nome_arquivo)
    if (fs.existsSync(p)) fs.unlink(p, () => {})
    await db.execute('DELETE FROM documentos WHERE uuid = ?', [req.params.uuid])
    res.json({ mensagem: 'Eliminado' })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* Eliminar lote */
router.post('/eliminar-lote', async (req, res) => {
  try {
    const { uuids } = req.body
    if (!uuids?.length) return res.status(400).json({ erro: 'Sem UUIDs' })
    const db = await getPool()
    const ph = uuids.map(() => '?').join(',')
    const [docs] = await db.execute(
      `SELECT nome_arquivo FROM documentos WHERE uuid IN (${ph}) AND dono_id = ?`,
      [...uuids, req.user.id]
    )
    docs.forEach(d => {
      const p = path.resolve(UPLOAD_DIR, d.nome_arquivo)
      if (fs.existsSync(p)) fs.unlink(p, () => {})
    })
    await db.execute(`DELETE FROM documentos WHERE uuid IN (${ph}) AND dono_id = ?`, [...uuids, req.user.id])
    res.json({ mensagem: `${docs.length} documento(s) eliminado(s)` })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

module.exports = router
