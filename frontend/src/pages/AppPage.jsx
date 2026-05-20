import React, { useState, useEffect, useRef, useCallback } from 'react'
import FolderPanel from '../components/FolderPanel.jsx'
import DocTable    from '../components/DocTable.jsx'
import DropZone    from '../components/DropZone.jsx'
import Modal       from '../components/Modal.jsx'
import Btn         from '../components/Btn.jsx'
import UsersPanel  from '../components/UsersPanel.jsx'
import * as api    from '../api/client.js'

export default function AppPage({ user, onLogout, toast }) {
  // Localização atual (uuid da pasta ou null = raiz)
  const [pastaUuid,   setPastaUuid]   = useState(null)
  const [view,        setView]        = useState('files') // 'files' | 'users' (admin)

  // Documentos
  const [docs,        setDocs]        = useState([])
  const [total,       setTotal]       = useState(0)
  const [paginas,     setPaginas]     = useState(1)
  const [pagina,      setPagina]      = useState(1)
  const [busca,       setBusca]       = useState('')
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [selecionados,setSelecionados]= useState(new Set())
  const [folders,     setFolders]     = useState([])

  // Upload queue
  const [queue,    setQueue]    = useState([])
  const uploading  = useRef(false)

  // Modais
  const [modalDelDoc,  setModalDelDoc]  = useState(null)
  const [modalMover,   setModalMover]   = useState(null)  // doc ou null (= usa selecionados)
  const [todasPastas,  setTodasPastas]  = useState([])
  const [destPasta,    setDestPasta]    = useState('')

  const searchTimer = useRef()

  /* ── Carregar docs ── */
  const carregarDocs = useCallback(async (pg = 1, q = '') => {
    setLoadingDocs(true)
    try {
      const params = { pagina: pg, limite: 25 }
      if (q) params.busca = q
      if (pastaUuid) params.pasta_uuid = pastaUuid
      else params.pasta_uuid = 'raiz'
      const data = await api.getDocs(params)
      setDocs(data.documentos)
      setTotal(data.total)
      setPaginas(data.paginas)
    } catch (e) { toast(e.message, 'error') }
    finally { setLoadingDocs(false) }
  }, [pastaUuid, toast])

  useEffect(() => {
    setSelecionados(new Set())
    setPagina(1)
    setBusca('')
    carregarDocs(1, '')
  }, [pastaUuid])

  /* ── Upload ── */
  const onFiles = files => {
    const novos = files.map(f => ({ id: Math.random().toString(36).slice(2), name: f.name, raw: f, status: 'pendente', progress: 0 }))
    setQueue(p => [...p, ...novos])
    if (!uploading.current) processQueue(novos)
  }

  const setQueueItem = (id, patch) =>
    setQueue(p => p.map(f => f.id === id ? { ...f, ...(typeof patch === 'function' ? patch(f) : patch) } : f))

  const processQueue = async (pendentes) => {
    uploading.current = true
    for (const f of pendentes) {
      setQueueItem(f.id, { status: 'enviando' })
      const timer = setInterval(() => setQueueItem(f.id, x => ({ progress: Math.min(x.progress + 5, 85) })), 80)
      try {
        await api.uploadDocs([f.raw], pastaUuid)
        clearInterval(timer)
        setQueueItem(f.id, { status: 'ok', progress: 100 })
      } catch {
        clearInterval(timer)
        setQueueItem(f.id, { status: 'erro', progress: 100 })
      }
    }
    uploading.current = false
    setTimeout(() => setQueue([]), 2500)
    carregarDocs(pagina, busca)
    toast('Upload concluído', 'success')
  }

  /* ── Seleção ── */
  const onSelect    = (uuid, v) => setSelecionados(p => { const s = new Set(p); v ? s.add(uuid) : s.delete(uuid); return s })
  const onSelectAll = v => setSelecionados(v ? new Set(docs.map(d => d.uuid)) : new Set())

  /* ── Eliminar doc ── */
  const confirmarEliminarDoc = async () => {
    try {
      await api.eliminarDoc(modalDelDoc.uuid)
      toast('Documento eliminado', 'success')
      setModalDelDoc(null)
      carregarDocs(pagina, busca)
    } catch (e) { toast(e.message, 'error') }
  }

  /* ── Eliminar lote ── */
  const eliminarSelecionados = async () => {
    if (!selecionados.size) return
    try {
      const r = await api.eliminarLote([...selecionados])
      toast(r.mensagem, 'success')
      setSelecionados(new Set())
      carregarDocs(pagina, busca)
    } catch (e) { toast(e.message, 'error') }
  }

  /* ── Download ZIP ── */
  const downloadZip = async () => {
    try { await api.downloadZip([...selecionados]) }
    catch (e) { toast(e.message, 'error') }
  }

  /* ── Mover ── */
  const abrirMover = async (doc) => {
    try {
      const lista = await api.getTodasPastas()
      setTodasPastas(lista)
      setDestPasta('')
      setModalMover(doc) // null = usa selecionados
    } catch (e) { toast(e.message, 'error') }
  }

  const confirmarMover = async () => {
    const uuids = modalMover ? [modalMover.uuid] : [...selecionados]
    try {
      for (const uuid of uuids) await api.moverDoc(uuid, destPasta || null)
      toast(`${uuids.length} movido(s)`, 'success')
      setModalMover(null)
      setSelecionados(new Set())
      carregarDocs(pagina, busca)
    } catch (e) { toast(e.message, 'error') }
  }

  /* ── Pesquisa ── */
  const onSearch = e => {
    const v = e.target.value; setBusca(v)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setPagina(1); carregarDocs(1, v) }, 350)
  }

  return (
    <div style={s.app}>
      {/* Topbar */}
      <header style={s.topbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={s.brand}>
            <span style={{ color: 'var(--accent)', fontSize: 18 }}>◈</span>
            <span style={s.brandText}>KapitalDocs</span>
          </div>
          {user.role === 'admin' && (
            <div style={s.tabs}>
              <button style={{ ...s.tab, background: view === 'files' ? 'var(--accent-bg)' : 'transparent', color: view === 'files' ? 'var(--accent)' : 'var(--text3)' }} onClick={() => setView('files')}>📄 Documentos</button>
              <button style={{ ...s.tab, background: view === 'users' ? 'var(--accent-bg)' : 'transparent', color: view === 'users' ? 'var(--accent)' : 'var(--text3)' }} onClick={() => setView('users')}>👥 Utilizadores</button>
            </div>
          )}
        </div>
        <div style={s.topRight}>
          <span style={s.userName}>{user.nome}</span>
          <Btn size="sm" variant="ghost" onClick={onLogout} style={{ color: 'var(--text3)' }}>Sair</Btn>
        </div>
      </header>

      <div style={s.body}>
        {/* Sidebar pastas */}
        <aside style={s.sidebar}>
          <FolderPanel
            onLocationChange={setPastaUuid}
            onToast={toast}
            onBreadcrumbChange={setFolders}
          />
        </aside>

        {/* Main content */}
        <main style={s.main}>
          {view === 'users' ? (
            <UsersPanel user={user} onToast={toast} />
          ) : (
            <>
              {/* Toolbar */}
          <div style={s.toolbar}>
            {/* Breadcrumb */}
            <div style={s.breadcrumb}>
              <button style={s.bcBtn} onClick={() => setPastaUuid(null)}>Início</button>
              {folders.map((b, i) => (
                <React.Fragment key={b.uuid}>
                  <span style={s.bcSep}>›</span>
                  <button style={{ ...s.bcBtn, color: i === folders.length - 1 ? 'var(--text)' : 'var(--text2)', fontWeight: i === folders.length - 1 ? 500 : 400 }} onClick={() => setPastaUuid(b.uuid)}>{b.nome}</button>
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                style={s.search}
                placeholder="Pesquisar documentos…"
                value={busca}
                onChange={onSearch}
              />
              <Btn size="sm" onClick={() => setSelecionados(new Set())}
                style={{ display: selecionados.size ? 'flex' : 'none', color: 'var(--text3)' }}
                variant="ghost">Limpar seleção</Btn>
            </div>
          </div>

          {/* Content */}
          <div style={s.content}>
            {/* Drop zone */}
            <DropZone onFiles={onFiles} />

            {/* Upload queue */}
            {queue.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {queue.map(f => (
                  <div key={f.id} style={s.queueItem}>
                    <span style={s.queueName}>{f.name}</span>
                    <div style={s.queueBar}>
                      <div style={{
                        height: '100%', borderRadius: 99, transition: 'width .2s',
                        width: f.progress + '%',
                        background: f.status === 'ok' ? 'var(--green)' : f.status === 'erro' ? 'var(--danger)' : 'var(--accent)',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: f.status === 'ok' ? 'var(--green)' : f.status === 'erro' ? 'var(--danger)' : 'var(--text3)', flexShrink: 0 }}>
                      {f.status === 'enviando' && 'enviando…'}
                      {f.status === 'ok'       && '✓ guardado'}
                      {f.status === 'erro'     && '✕ erro'}
                      {f.status === 'pendente' && 'aguarda'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Selection bar */}
            {selecionados.size > 0 && (
              <div style={s.selBar}>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>{selecionados.size} selecionado{selecionados.size > 1 ? 's' : ''}</span>
                <Btn size="sm" onClick={downloadZip}>↓ ZIP</Btn>
                <Btn size="sm" onClick={() => abrirMover(null)}>↗ Mover</Btn>
                <Btn size="sm" variant="danger" onClick={eliminarSelecionados}>✕ Eliminar</Btn>
              </div>
            )}

            {/* Docs */}
            <div>
              <div style={s.sectionHeader}>
                <span style={s.sectionTitle}>Documentos {total > 0 && `(${total})`}</span>
                <Btn size="sm" onClick={() => carregarDocs(pagina, busca)} variant="ghost"
                  style={{ color: 'var(--text3)' }}>↻</Btn>
              </div>
              <DocTable
                docs={docs}
                selecionados={selecionados}
                loading={loadingDocs}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                onDelete={setModalDelDoc}
                onMove={abrirMover}
              />
            </div>

            {/* Pagination */}
            {paginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Btn size="sm" disabled={pagina <= 1} onClick={() => { const p = pagina - 1; setPagina(p); carregarDocs(p, busca) }}>← Anterior</Btn>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Pág. {pagina} / {paginas}</span>
                <Btn size="sm" disabled={pagina >= paginas} onClick={() => { const p = pagina + 1; setPagina(p); carregarDocs(p, busca) }}>Próxima →</Btn>
              </div>
            )}
          </div>
          </>
          )}
        </main>
      </div>

      {/* Modal: Eliminar doc */}
      {modalDelDoc && (
        <Modal title="Eliminar documento" onClose={() => setModalDelDoc(null)}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={s.warnBox}>
              Eliminar <strong>"{modalDelDoc.nome_original}"</strong>? Esta ação é irreversível.
            </div>
          </div>
          <Modal.Footer>
            <Btn variant="ghost" onClick={() => setModalDelDoc(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={confirmarEliminarDoc}>Eliminar</Btn>
          </Modal.Footer>
        </Modal>
      )}

      {/* Modal: Mover */}
      {modalMover !== undefined && modalMover !== null || false ? null : null}
      {modalMover !== null && modalMover !== undefined && (
        <Modal title={`Mover: ${modalMover.nome_original}`} onClose={() => setModalMover(null)}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <label style={s.formLabel}>Pasta de destino</label>
            <select style={s.select} value={destPasta} onChange={e => setDestPasta(e.target.value)}>
              <option value="">— Raiz (sem pasta) —</option>
              {todasPastas.map(p => <option key={p.uuid} value={p.uuid}>{p.nome}</option>)}
            </select>
          </div>
          <Modal.Footer>
            <Btn variant="ghost" onClick={() => setModalMover(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={confirmarMover}>Mover</Btn>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  )
}

const s = {
  app:    { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  topbar: { height: 46, background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', flexShrink: 0 },
  brand:  { display: 'flex', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' },
  topRight: { display: 'flex', alignItems: 'center', gap: 12 },
  userName: { fontSize: 12, color: 'var(--text2)' },
  body:   { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar:{ width: 220, flexShrink: 0, borderRight: '0.5px solid var(--border)', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  tabs:   { display: 'flex', gap: 4 },
  tab:    { padding: '5px 12px', border: 'none', cursor: 'pointer', fontSize: 12, borderRadius: 'var(--r)', transition: 'background .1s, color .1s' },
  main:   { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  toolbar:{ padding: '0.75rem 1.25rem', borderBottom: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0, background: 'var(--bg2)' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', fontSize: 12 },
  bcBtn:  { background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, padding: '2px 4px', borderRadius: 4 },
  bcSep:  { color: 'var(--text3)', fontSize: 12 },
  search: { flex: 1, padding: '7px 11px', background: 'var(--bg3)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none' },
  content:{ flex: 1, overflowY: 'auto', padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  queueItem: { background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 },
  queueName: { flex: 0 , minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 },
  queueBar: { flex: 1, height: 3, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' },
  selBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--accent-bg)', border: '0.5px solid #3D3010', borderRadius: 'var(--r)', fontSize: 13 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  warnBox: { padding: '11px 13px', background: 'var(--danger-bg)', border: '0.5px solid #5A2020', borderRadius: 'var(--r)', color: 'var(--danger)', fontSize: 13 },
  formLabel: { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' },
  select: { width: '100%', padding: '9px 11px', background: 'var(--bg)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none' },
}
