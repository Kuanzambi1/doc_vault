import React, { useState, useEffect } from 'react'
import * as api from '../api/client.js'

const API = api.BASE_URL
const fmt = b => b < 1024 ? b + 'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(2)+'MB'
const EXT_COLOR = {
  pdf:'#E05252', doc:'#5B9BD5', docx:'#5B9BD5', txt:'#C4B95A',
  xls:'#4CAF7D', xlsx:'#4CAF7D', csv:'#4CAF7D', png:'#9B8FE0', jpg:'#9B8FE0', jpeg:'#9B8FE0',
}

export default function SharePage({ token }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.getPartilha(token)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div style={s.page}>
      <div style={s.card}>
        <Brand /><div style={{ textAlign:'center', color:'var(--text3)', fontSize:13, padding:'2rem' }}>A carregar…</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={s.page}>
      <div style={s.card}>
        <Brand />
        <div style={s.errorBox}>
          <div style={{ fontSize:36, marginBottom:12 }}>🔒</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:8 }}>Link inválido ou expirado</div>
          <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.6 }}>
            Este link de partilha não existe ou foi revogado pelo proprietário.
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={s.page}>
      <div style={s.card}>
        <Brand shared />
        {data.tipo === 'documento'
          ? <DocView data={data} token={token} />
          : <PastaView data={data} token={token} />
        }
      </div>
    </div>
  )
}

function Brand({ shared }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
      <span style={{ color:'var(--accent)', fontSize:18 }}>◈</span>
      <span style={{ fontSize:15, fontWeight:600, letterSpacing:'-0.02em', color:'var(--text)', flex:1 }}>KapitalDocs</span>
      {shared && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:'var(--accent-bg)', color:'var(--accent)', letterSpacing:'0.05em', textTransform:'uppercase' }}>Partilhado</span>}
    </div>
  )
}

function DocView({ data, token }) {
  const ext = data.extensao?.toUpperCase() || '?'
  const color = EXT_COLOR[data.extensao?.toLowerCase()] || '#9A9990'
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={s.fileCard}>
        <div style={{ ...s.extBadge, background: color+'22', color }}>{ext}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{data.nome_original}</div>
          <div style={{ display:'flex', gap:8, fontSize:12, color:'var(--text3)', marginTop:4 }}>
            {data.tipo_mime && <span>{data.tipo_mime}</span>}
            {data.tamanho_bytes && <span>· {fmt(data.tamanho_bytes)}</span>}
          </div>
        </div>
      </div>
      <a href={`${API}/partilha/${token}/download`} download={data.nome_original} style={s.dlBtnBig}>
        ↓ Descarregar ficheiro
      </a>
    </div>
  )
}

function PastaView({ data, token }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={s.fileCard}>
        <span style={{ fontSize:28 }}>📁</span>
        <div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text)' }}>{data.nome}</div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{data.documentos?.length || 0} ficheiro{data.documentos?.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {!data.documentos?.length ? (
        <div style={{ textAlign:'center', color:'var(--text3)', fontSize:13, padding:'2rem' }}>📭 Pasta vazia</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:4, maxHeight:400, overflowY:'auto' }}>
          {data.documentos.map(doc => {
            const ext = doc.extensao?.toUpperCase() || '?'
            const color = EXT_COLOR[doc.extensao?.toLowerCase()] || '#9A9990'
            return (
              <div key={doc.uuid} style={s.docRow}>
                <div style={{ ...s.extBadgeSm, background:color+'22', color }}>{ext.slice(0,4)}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{doc.nome_original}</div>
                  {doc.tamanho_bytes && <div style={{ fontSize:11, color:'var(--text3)' }}>{fmt(doc.tamanho_bytes)}</div>}
                </div>
                <a href={`${API}/partilha/${token}/download/${doc.uuid}`} download={doc.nome_original} style={s.dlBtn}>↓</a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const s = {
  page:      { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:'1.5rem' },
  card:      { width:'100%', maxWidth:520, background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:'var(--r-lg)', padding:'1.75rem', boxShadow:'0 20px 60px rgba(0,0,0,.4)', display:'flex', flexDirection:'column', gap:20 },
  errorBox:  { textAlign:'center', padding:'2rem 1rem', background:'var(--bg)', borderRadius:'var(--r)', border:'0.5px solid var(--border)' },
  fileCard:  { display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--r)' },
  extBadge:  { width:48, height:48, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 },
  extBadgeSm:{ width:32, height:32, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9,  fontWeight:700, flexShrink:0 },
  dlBtnBig:  { display:'block', padding:'12px', borderRadius:'var(--r)', background:'var(--accent)', color:'#0F0F0E', textAlign:'center', textDecoration:'none', fontSize:14, fontWeight:600 },
  docRow:    { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--bg)', border:'0.5px solid var(--border)', borderRadius:'var(--r)' },
  dlBtn:     { padding:'5px 12px', borderRadius:'var(--r)', border:'0.5px solid var(--border2)', background:'var(--bg2)', color:'var(--accent)', textDecoration:'none', fontSize:13, fontWeight:600, flexShrink:0 },
}
