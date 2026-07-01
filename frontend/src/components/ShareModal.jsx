import React, { useState } from 'react'
import Modal from './Modal.jsx'
import Btn   from './Btn.jsx'
import * as api from '../api/client.js'

export default function ShareModal({ item, tipo, onClose, onToast, onRefresh }) {
  const [token,   setToken]   = useState(item.token_partilha || null)
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [changed, setChanged] = useState(false)
  
  const [departamentos, setDepartamentos] = useState([])
  const [partilhados, setPartilhados] = useState([])
  const [loadingInterna, setLoadingInterna] = useState(true)

  React.useEffect(() => {
    async function carregar() {
      setLoadingInterna(true)
      try {
        const [deps, parts] = await Promise.all([
          api.getDepartamentos(),
          tipo === 'documento' ? api.getDepartamentosPartilhadosDoc(item.uuid) : api.getDepartamentosPartilhadosPasta(item.uuid)
        ])
        setDepartamentos(deps || [])
        setPartilhados(parts || [])
      } catch (e) {
        onToast(e.message, 'error')
      } finally {
        setLoadingInterna(false)
      }
    }
    carregar()
  }, [item.uuid, tipo, onToast])

  const shareUrl = token ? `${window.location.origin}/s/${token}` : null
  const nome = item.nome_original || item.nome

  const gerar = async () => {
    setLoading(true)
    try {
      const fn = tipo === 'documento' ? api.partilharDoc : api.partilharPasta
      const r = await fn(item.uuid)
      setToken(r.token)
      setChanged(true)
      onToast('Link de partilha gerado!', 'success')
    } catch (e) { onToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const revogar = async () => {
    setLoading(true)
    try {
      const fn = tipo === 'documento' ? api.revogarPartilhaDoc : api.revogarPartilhaPasta
      await fn(item.uuid)
      setToken(null)
      setChanged(true)
      onToast('Partilha revogada', 'success')
    } catch (e) { onToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const inp = document.createElement('input')
      inp.value = shareUrl
      document.body.appendChild(inp)
      inp.select()
      document.execCommand('copy')
      document.body.removeChild(inp)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const togglePartilha = async (depId) => {
    const novos = partilhados.includes(depId)
      ? partilhados.filter(id => id !== depId)
      : [...partilhados, depId]

    setPartilhados(novos)
    setChanged(true)

    try {
      const fn = tipo === 'documento' ? api.setDepartamentosPartilhadosDoc : api.setDepartamentosPartilhadosPasta
      await fn(item.uuid, novos)
    } catch (e) {
      onToast('Erro a gravar partilha interna', 'error')
    }
  }

  const handleClose = () => { if (changed) onRefresh(); onClose() }

  return (
    <Modal title={tipo === 'documento' ? 'Partilhar Documento' : 'Partilhar Pasta'} onClose={handleClose}>
      <div style={s.body}>
        <div style={s.resource}>
          <span style={{ fontSize: 18 }}>{tipo === 'documento' ? '📄' : '📁'}</span>
          <span style={s.resourceName}>{nome}</span>
          <span style={{ ...s.badge, ...(token ? s.badgeOn : s.badgeOff) }}>
            {token ? '● Ativo' : '○ Privado'}
          </span>
        </div>

        {/* Partilha Interna */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Partilha Interna (Departamentos)</div>
          {loadingInterna ? (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>A carregar...</div>
          ) : (
            <div style={s.depList}>
              {departamentos.map(d => (
                <label key={d.id} style={s.depItem}>
                  <input
                    type="checkbox"
                    checked={partilhados.includes(d.id)}
                    onChange={() => togglePartilha(d.id)}
                  />
                  {d.nome}
                </label>
              ))}
              {departamentos.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Nenhum departamento encontrado.</div>}
            </div>
          )}
        </div>

        {/* Partilha Externa */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Partilha Externa (Link Público)</div>
          {!token ? (
            <div style={s.empty}>
              <div style={s.emptySub}>
                Gera um link único para partilhar com pessoas externas sem login.
              </div>
              <Btn size="sm" variant="primary" onClick={gerar} disabled={loading}>{loading ? 'A gerar…' : 'Gerar link público'}</Btn>
            </div>
          ) : (
            <div style={s.linkBox}>
              <div style={s.linkRow}>
                <div style={s.linkText}>{shareUrl}</div>
                <button style={{ ...s.copyBtn, ...(copied ? s.copyOk : {}) }} onClick={copiar}>
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <div style={s.linkHint}>
                Acesso público ativado.
              </div>
              <div style={{ marginTop: 8 }}>
                 <Btn size="sm" variant="danger" onClick={revogar} disabled={loading}>{loading ? 'A revogar…' : 'Revogar link'}</Btn>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal.Footer>
        <Btn variant="ghost" onClick={handleClose}>Concluir</Btn>
      </Modal.Footer>
    </Modal>
  )
}

const s = {
  body:         { padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 14 },
  resource:     { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)' },
  resourceName: { fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge:        { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, letterSpacing: '0.05em', flexShrink: 0 },
  badgeOn:      { background: '#0D2A1A', color: '#4CAF7D' },
  badgeOff:     { background: 'var(--bg3)', color: 'var(--text3)' },
  empty:        { textAlign: 'center', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  emptyTitle:   { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  emptySub:     { fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, maxWidth: 300 },
  linkBox:      { background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--r)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  linkLabel:    { fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  linkRow:      { display: 'flex', gap: 8, alignItems: 'center' },
  linkText:     { flex: 1, padding: '7px 10px', background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', color: 'var(--accent)', fontSize: 11, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  copyBtn:      { padding: '6px 14px', borderRadius: 'var(--r)', border: '0.5px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 500, flexShrink: 0, transition: 'background .15s, color .15s' },
  copyOk:       { background: '#0D2A1A', color: '#4CAF7D', borderColor: '#1A4A2A' },
  linkHint:     { fontSize: 11, color: 'var(--text3)' },
  warn:         { padding: '8px 10px', background: 'var(--danger-bg)', border: '0.5px solid #5A2020', borderRadius: 'var(--r)', color: 'var(--danger)', fontSize: 11, lineHeight: 1.5 },
  section:      { padding: '12px 0', borderTop: '0.5px solid var(--border2)' },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' },
  depList:      { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', background: 'var(--bg2)', padding: 10, borderRadius: 'var(--r)', border: '0.5px solid var(--border2)' },
  depItem:      { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }
}
