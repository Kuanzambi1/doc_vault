import React, { useState, useEffect, useCallback, useRef } from 'react'
import * as api from '../api/client.js'
import Btn from './Btn.jsx'
import Modal from './Modal.jsx'
import ShareModal from './ShareModal.jsx'

/* ── FolderPanel ──────────────────────────────────────────
   Este componente é a fonte da verdade para navegação de pastas.
   Estado principal: paiUuid (null = raiz, string = uuid da pasta aberta)

   Cada vez que paiUuid muda, faz fetch dos filhos diretos.
   O breadcrumb vem do backend já pronto.
─────────────────────────────────────────────────────────── */
export default function FolderPanel({ onLocationChange, onToast, onBreadcrumbChange }) {
  const [paiUuid,    setPaiUuid]    = useState(null)   // null = raiz
  const [pastas,     setPastas]     = useState([])
  const [breadcrumb, setBreadcrumb] = useState([])
  const [loading,    setLoading]    = useState(false)

  // Modal nova pasta
  const [showModal,   setShowModal]  = useState(false)
  const [nomeInput,   setNomeInput]   = useState('')
  const [creating,    setCreating]    = useState(false)

  // Modal eliminar
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Modal renomear
  const [toRename,    setToRename]   = useState(null)
  const [renameInput, setRenameInput] = useState('')
  const [renaming,    setRenaming]   = useState(false)

  // Modal partilhar pasta
  const [toShare, setToShare] = useState(null)

  const carregar = useCallback(async (uuid) => {
    setLoading(true)
    try {
      const data = await api.getPastas(uuid)
      setPastas(data.pastas)
      setBreadcrumb(data.breadcrumb) // vem do backend
    } catch (e) {
      onToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => {
    carregar(paiUuid)
    onLocationChange(paiUuid)
  }, [paiUuid])

  useEffect(() => {
    if (onBreadcrumbChange) onBreadcrumbChange(breadcrumb)
  }, [breadcrumb, onBreadcrumbChange])

  const navTo = (uuid) => setPaiUuid(uuid)
  const navUp = () => {
    if (!breadcrumb.length) return
    // Vai para o avô (penúltimo no breadcrumb)
    const novo = breadcrumb.length >= 2 ? breadcrumb[breadcrumb.length - 2].uuid : null
    setPaiUuid(novo)
  }

  const criarPasta = async () => {
    if (!nomeInput.trim()) return
    setCreating(true)
    try {
      const nova = await api.criarPasta(nomeInput.trim(), paiUuid)
      setPastas(p => [...p, nova].sort((a, b) => a.nome.localeCompare(b.nome)))
      setNomeInput('')
      setShowModal(false)
      onToast(`Pasta "${nova.nome}" criada`, 'success')
    } catch (e) {
      onToast(e.message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const r = await api.eliminarPasta(toDelete.uuid)
      setPastas(p => p.filter(x => x.uuid !== toDelete.uuid))
      setToDelete(null)
      onToast(r.mensagem, 'success')
    } catch (e) {
      onToast(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const abrirRenomear = (pasta) => {
    setRenameInput(pasta.nome)
    setToRename(pasta)
  }

  const confirmarRenomear = async () => {
    if (!toRename || !renameInput.trim()) return
    if (renameInput.trim() === toRename.nome) { setToRename(null); return }
    setRenaming(true)
    try {
      await api.renomearPasta(toRename.uuid, renameInput.trim())
      setPastas(p => p.map(x => x.uuid === toRename.uuid ? { ...x, nome: renameInput.trim() } : x))
      setToRename(null)
      onToast(`Renomeada para "${renameInput.trim()}"`, 'success')
    } catch (e) {
      onToast(e.message, 'error')
    } finally {
      setRenaming(false)
    }
  }

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {paiUuid && (
            <button style={s.backBtn} onClick={navUp} title="Subir">‹</button>
          )}
          <span style={s.headerTitle}>
            {paiUuid
              ? (breadcrumb[breadcrumb.length - 1]?.nome || 'Pasta')
              : 'Pastas'}
          </span>
        </div>
        <Btn size="sm" variant="ghost" onClick={() => { setNomeInput(''); setShowModal(true) }}
          style={{ color: 'var(--accent)', fontSize: 12 }}>
          + Nova
        </Btn>
      </div>

      {/* Lista de pastas */}
      <div style={s.list}>
        {loading && <div style={s.hint}><span className="spin" style={s.spinner} /></div>}

        {!loading && pastas.length === 0 && (
          <div style={s.hint}>Sem pastas aqui</div>
        )}

        {!loading && pastas.map(p => (
          <FolderRow key={p.uuid} pasta={p} onOpen={navTo} onDelete={setToDelete} onRenameRow={() => abrirRenomear(p)} onShare={() => setToShare(p)} />
        ))}
      </div>

      {/* Modal nova pasta */}
      {showModal && (
        <Modal title="Nova pasta" onClose={() => setShowModal(false)}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={s.formLabel}>Nome</div>
            <input
              autoFocus
              value={nomeInput}
              onChange={e => setNomeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && criarPasta()}
              placeholder={paiUuid ? 'Subpasta…' : 'Ex: Relatórios 2025'}
              style={s.input}
            />
          </div>
          <Modal.Footer>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn variant="primary" onClick={criarPasta} disabled={creating || !nomeInput.trim()}>
              {creating ? 'A criar…' : 'Criar pasta'}
            </Btn>
          </Modal.Footer>
        </Modal>
      )}

      {/* Modal eliminar pasta */}
      {toDelete && (
        <Modal title="Eliminar pasta" onClose={() => setToDelete(null)}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={s.warnBox}>
              Vai eliminar <strong>"{toDelete.nome}"</strong> e todos os ficheiros dentro dela.<br />
              Esta ação é <strong>irreversível</strong>.
            </div>
          </div>
          <Modal.Footer>
            <Btn variant="ghost" onClick={() => setToDelete(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={confirmarEliminar} disabled={deleting}>
              {deleting ? 'A eliminar…' : 'Eliminar pasta'}
            </Btn>
          </Modal.Footer>
        </Modal>
      )}

      {/* Modal renomear pasta */}
      {toRename && (
        <Modal title="Renomear pasta" onClose={() => setToRename(null)}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={s.formLabel}>Nome</div>
            <input
              autoFocus
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmarRenomear()}
              style={s.input}
            />
          </div>
          <Modal.Footer>
            <Btn variant="ghost" onClick={() => setToRename(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={confirmarRenomear} disabled={renaming || !renameInput.trim()}>
              {renaming ? 'A renomear…' : 'Renomear'}
            </Btn>
          </Modal.Footer>
          </Modal>
      )}

      {/* Modal partilhar pasta */}
      {toShare && (
        <ShareModal
          item={toShare}
          tipo="pasta"
          onClose={() => setToShare(null)}
          onToast={onToast}
          onRefresh={() => carregar(paiUuid)}
        />
      )}
    </div>
  )
}

function FolderRow({ pasta, onOpen, onDelete, onRenameRow, onShare }) {
  const [hov, setHov] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div
      style={{ ...s.folderRow, background: hov ? 'var(--bg3)' : 'transparent' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { if (!menuOpen) setHov(false) }}
    >
      <button style={s.folderBtn} onClick={() => onOpen(pasta.uuid)}>
        <span style={{ fontSize: 14 }}>{pasta.token_partilha ? '🌐' : (pasta.departamentos_partilhados?.length ? '👥' : '📁')}</span>
        <span style={s.folderName}>{pasta.nome}</span>
        <span style={s.folderMeta}>
          {pasta.total_docs > 0 && `${pasta.total_docs} doc${pasta.total_docs > 1 ? 's' : ''}`}
          {pasta.total_subpastas > 0 && ` · ${pasta.total_subpastas} pasta${pasta.total_subpastas > 1 ? 's' : ''}`}
        </span>
      </button>
      <button
        style={{ ...s.menuBtn, opacity: hov || menuOpen ? 1 : 0 }}
        onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
        title="Opções"
      >
        ⋮
      </button>
      {menuOpen && (
        <div ref={menuRef} style={s.ctxMenu}>
          <button style={s.ctxItem} onClick={() => { setMenuOpen(false); onRenameRow() }}>
            ✏️ Renomear
          </button>
          <button style={s.ctxItem} onClick={() => { setMenuOpen(false); onShare() }}>
            🔗 {(pasta.token_partilha || pasta.departamentos_partilhados?.length) ? 'Gerir partilha' : 'Partilhar'}
          </button>
          <button style={{ ...s.ctxItem, color: 'var(--danger)' }} onClick={() => { onDelete(pasta); setMenuOpen(false) }}>
            🗑️ Eliminar
          </button>
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', height: '100%' },
  breadcrumb: {
    display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
    padding: '0.6rem 1rem', borderBottom: '0.5px solid var(--border)',
    fontSize: 11, minHeight: 34,
  },
  bcBtn: {
    background: 'none', border: 'none', color: 'var(--text2)',
    cursor: 'pointer', fontSize: 11, padding: '1px 3px', borderRadius: 4,
  },
  bcSep: { color: 'var(--text3)', fontSize: 11 },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.5rem 1rem 0.25rem',
  },
  headerTitle: { fontSize: 12, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  backBtn: {
    background: 'none', border: 'none', color: 'var(--text3)',
    cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px',
  },
  list: { flex: 1, overflowY: 'auto', padding: '0.25rem 0.5rem' },
  hint: { fontSize: 12, color: 'var(--text3)', padding: '1rem', textAlign: 'center', display: 'flex', justifyContent: 'center' },
  spinner: { width: 14, height: 14, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block' },
  folderRow: {
    display: 'flex', alignItems: 'center',
    borderRadius: 'var(--r)', transition: 'background .1s',
    marginBottom: 1, position: 'relative',
  },
  folderBtn: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 7,
    padding: '6px 8px', background: 'none', border: 'none',
    color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
    borderRadius: 'var(--r)',
  },
  folderName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 },
  folderMeta: { fontSize: 11, color: 'var(--text3)', flexShrink: 0 },
  menuBtn: {
    width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer',
    fontSize: 14, borderRadius: 4, transition: 'opacity .1s, background .1s',
    flexShrink: 0, marginRight: 4,
  },
  ctxMenu: {
    position: 'absolute', right: 8, top: '100%', zIndex: 100,
    background: 'var(--bg2)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--r)', boxShadow: '0 4px 12px rgba(0,0,0,.3)',
    minWidth: 120, overflow: 'hidden',
  },
  ctxItem: {
    display: 'block', width: '100%', padding: '8px 12px',
    background: 'none', border: 'none', color: 'var(--text)',
    cursor: 'pointer', fontSize: 12, textAlign: 'left',
  },
  delBtn: {
    padding: '3px 7px', background: 'none', border: 'none',
    color: 'var(--danger)', cursor: 'pointer', fontSize: 11,
    borderRadius: 4, transition: 'opacity .12s', flexShrink: 0,
  },
  formLabel: { fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input: {
    width: '100%', padding: '9px 11px',
    background: 'var(--bg)', border: '0.5px solid var(--border2)',
    borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none',
  },
  warnBox: {
    padding: '12px 14px', background: 'var(--danger-bg)',
    border: '0.5px solid var(--danger)', borderRadius: 'var(--r)',
    color: 'var(--danger)', fontSize: 13, lineHeight: 1.6,
  },
}
