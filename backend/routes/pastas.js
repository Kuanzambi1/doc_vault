const express = require('express')
const path    = require('path')
const fs      = require('fs')
const { v4: uuidv4 }   = require('uuid')
const { getPool }      = require('../db')
const authMiddleware   = require('../middleware/auth')
const { UPLOAD_DIR }   = require('../uploadMiddleware')

const router = express.Router()
router.use(authMiddleware)

/* ─────────────────────────────────────────
   GET /api/pastas
   Query params:
     - pai_uuid: uuid da pasta pai (omitir = raiz do utilizador)
   Devolve: pastas filhas diretas + breadcrumb da pasta pai
───────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const db = await getPool()
    const { pai_uuid } = req.query

    let paiId   = null
    let paiInfo = null

    // Se veio pai_uuid, resolver para id numérico
    if (pai_uuid) {
      const [[pai]] = await db.execute(
        'SELECT id, uuid, nome, pai_id FROM pastas WHERE uuid = ? AND dono_id = ?',
        [pai_uuid, req.user.id]
      )
      if (!pai) return res.status(404).json({ erro: 'Pasta pai não encontrada' })
      paiId   = pai.id
      paiInfo = pai
    }

    // Buscar filhos diretos
    const [pastas] = await db.execute(
      `SELECT p.id, p.uuid, p.nome, p.pai_id, p.criado_em, p.token_partilha,
              COUNT(d.id) AS total_docs,
              COUNT(sp.id) AS total_subpastas
       FROM pastas p
       LEFT JOIN documentos d  ON d.pasta_id = p.id
       LEFT JOIN pastas     sp ON sp.pai_id  = p.id
       WHERE p.pai_id ${paiId ? '= ?' : 'IS NULL'}
         AND p.dono_id = ?
       GROUP BY p.id
       ORDER BY p.nome ASC`,
      paiId ? [paiId, req.user.id] : [req.user.id]
    )

    // Construir breadcrumb
    const breadcrumb = []
    if (paiInfo) {
      breadcrumb.unshift({ uuid: paiInfo.uuid, nome: paiInfo.nome })
      let atual = paiInfo
      while (atual.pai_id) {
        const [[avo]] = await db.execute(
          'SELECT id, uuid, nome, pai_id FROM pastas WHERE id = ?', [atual.pai_id]
        )
        if (!avo) break
        breadcrumb.unshift({ uuid: avo.uuid, nome: avo.nome })
        atual = avo
      }
    }

    res.json({ pastas, pai_uuid: pai_uuid || null, breadcrumb })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* GET /api/pastas/todas — para selects de mover */
router.get('/todas', async (req, res) => {
  try {
    const db = await getPool()
    const [pastas] = await db.execute(
      'SELECT id, uuid, nome, pai_id FROM pastas WHERE dono_id = ? ORDER BY nome ASC',
      [req.user.id]
    )
    // Montar nomes com caminho completo para o select
    const mapaId = {}
    pastas.forEach(p => { mapaId[p.id] = p })

    function caminhoCompleto(p) {
      if (!p.pai_id || !mapaId[p.pai_id]) return p.nome
      return caminhoCompleto(mapaId[p.pai_id]) + ' / ' + p.nome
    }

    const resultado = pastas.map(p => ({ uuid: p.uuid, nome: caminhoCompleto(p) }))
      .sort((a, b) => a.nome.localeCompare(b.nome))

    res.json(resultado)
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* POST /api/pastas */
router.post('/', async (req, res) => {
  try {
    const { nome, pai_uuid } = req.body
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' })

    const db = await getPool()
    let paiId = null

    if (pai_uuid) {
      const [[pai]] = await db.execute(
        'SELECT id FROM pastas WHERE uuid = ? AND dono_id = ?',
        [pai_uuid, req.user.id]
      )
      if (!pai) return res.status(404).json({ erro: 'Pasta pai não encontrada' })
      paiId = pai.id
    }

    // Verificar nome duplicado no mesmo nível
    const [[dup]] = await db.execute(
      `SELECT id FROM pastas WHERE nome = ? AND dono_id = ? AND pai_id ${paiId ? '= ?' : 'IS NULL'}`,
      paiId ? [nome.trim(), req.user.id, paiId] : [nome.trim(), req.user.id]
    )
    if (dup) return res.status(409).json({ erro: `Já existe uma pasta com o nome "${nome.trim()}" aqui` })

    const uuid = uuidv4()
    const [r] = await db.execute(
      'INSERT INTO pastas (uuid, nome, pai_id, dono_id) VALUES (?, ?, ?, ?)',
      [uuid, nome.trim(), paiId, req.user.id]
    )

    res.status(201).json({
      id: r.insertId, uuid, nome: nome.trim(),
      pai_id: paiId, total_docs: 0, total_subpastas: 0
    })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* PATCH /api/pastas/:uuid — renomear */
router.patch('/:uuid', async (req, res) => {
  try {
    const { nome } = req.body
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' })

    const db = await getPool()
    const [[pasta]] = await db.execute(
      'SELECT id, dono_id FROM pastas WHERE uuid = ?',
      [req.params.uuid]
    )
    if (!pasta) return res.status(404).json({ erro: 'Pasta não encontrada' })

    // Apenas o dono ou admin podem editar
    if (pasta.dono_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ erro: 'Sem permissão para editar esta pasta' })
    }

    await db.execute('UPDATE pastas SET nome = ? WHERE uuid = ?', [nome.trim(), req.params.uuid])
    res.json({ mensagem: 'Renomeada', nome: nome.trim() })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

/* DELETE /api/pastas/:uuid — elimina pasta + docs do disco recursivamente */
router.delete('/:uuid', async (req, res) => {
  try {
    const db = await getPool()
    const [[pasta]] = await db.execute(
      'SELECT id, nome, dono_id FROM pastas WHERE uuid = ?',
      [req.params.uuid]
    )
    if (!pasta) return res.status(404).json({ erro: 'Pasta não encontrada' })

    // Apenas o dono ou admin podem eliminar
    if (pasta.dono_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ erro: 'Sem permissão para eliminar esta pasta' })
    }

    // Recolher todos os IDs descendentes (pastas filhas)
    const todosIds = await idsRecursivos(db, pasta.id)
    
    // IMPORTANTE: Incluir a pasta atual também
    const todosIdsCompleto = [pasta.id, ...todosIds]

    if (todosIdsCompleto.length) {
      const ph = todosIdsCompleto.map(() => '?').join(',')
      
      // 1. Buscar documentos para remover do disco
      const [docs] = await db.execute(
        `SELECT nome_arquivo FROM documentos WHERE pasta_id IN (${ph})`, 
        todosIdsCompleto
      )
      
      // 2. Remover arquivos físicos
      for (const doc of docs) {
        const filePath = path.resolve(UPLOAD_DIR, doc.nome_arquivo)
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath)
            console.log(`Arquivo removido: ${doc.nome_arquivo}`)
          } catch (err) {
            console.error(`Erro ao remover ${doc.nome_arquivo}:`, err)
          }
        }
      }
      
      // 3. Remover registros de documentos do banco
      const [result] = await db.execute(
        `DELETE FROM documentos WHERE pasta_id IN (${ph})`, 
        todosIdsCompleto
      )
      console.log(`${result.affectedRows} documentos removidos do banco`)
    }

    // 4. Remover as pastas (ON DELETE CASCADE cuida do resto se configurado)
    await db.execute('DELETE FROM pastas WHERE id = ?', [pasta.id])
    
    res.json({ mensagem: `Pasta "${pasta.nome}" e todo seu conteúdo foram eliminados` })
  } catch (err) {
    console.error('Erro ao deletar pasta:', err)
    res.status(500).json({ erro: err.message })
  }
})

async function idsRecursivos(db, pastaId) {
  const ids = [pastaId]
  const [filhos] = await db.execute('SELECT id FROM pastas WHERE pai_id = ?', [pastaId])
  for (const f of filhos) ids.push(...await idsRecursivos(db, f.id))
  return ids
}

/* POST /api/pastas/:uuid/partilhar — gerar link */
router.post('/:uuid/partilhar', async (req, res) => {
  try {
    const db = await getPool()
    const [[pasta]] = await db.execute(
      'SELECT id, token_partilha, dono_id FROM pastas WHERE uuid = ?',
      [req.params.uuid]
    )
    if (!pasta) return res.status(404).json({ erro: 'Pasta não encontrada' })
    if (pasta.dono_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ erro: 'Sem permissão' })
    if (pasta.token_partilha) return res.json({ token: pasta.token_partilha })
    const token = uuidv4()
    await db.execute('UPDATE pastas SET token_partilha = ? WHERE uuid = ?', [token, req.params.uuid])
    res.json({ token })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

/* DELETE /api/pastas/:uuid/partilhar — revogar */
router.delete('/:uuid/partilhar', async (req, res) => {
  try {
    const db = await getPool()
    const [[pasta]] = await db.execute(
      'SELECT id, dono_id FROM pastas WHERE uuid = ?',
      [req.params.uuid]
    )
    if (!pasta) return res.status(404).json({ erro: 'Pasta não encontrada' })
    if (pasta.dono_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ erro: 'Sem permissão' })
    await db.execute('UPDATE pastas SET token_partilha = NULL WHERE uuid = ?', [req.params.uuid])
    res.json({ mensagem: 'Partilha revogada' })
  } catch (err) { res.status(500).json({ erro: err.message }) }
})

module.exports = router
