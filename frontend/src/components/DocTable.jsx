import React, { useState } from 'react'
import { downloadDoc } from '../api/client.js'

const fmt = b => b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'KB' : (b / 1048576).toFixed(2) + 'MB'
const fmtDate = iso => new Date(iso).toLocaleDateString('pt', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const EXT = {
  pdf:  ['#3D1C1C', '#E05252'], doc:  ['#1C2A3D', '#5B9BD5'],
  docx: ['#1C2A3D', '#5B9BD5'], txt:  ['#2A2A1C', '#C4B95A'],
  xls:  ['#1C3020', '#4CAF7D'], xlsx: ['#1C3020', '#4CAF7D'],
  csv:  ['#1C3020', '#4CAF7D'], png:  ['#221C3D', '#9B8FE0'],
  jpg:  ['#221C3D', '#9B8FE0'], jpeg: ['#221C3D', '#9B8FE0'],
}

function ExtBadge({ ext = '' }) {
  const e = ext.toLowerCase()
  const [bg, color] = EXT[e] || ['#2A2A28', '#9A9990']
  return (
    <div style={{
      width: 30, height: 30, borderRadius: 5, background: bg, color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, fontWeight: 700, flexShrink: 0, letterSpacing: '0.02em',
    }}>
      {e.toUpperCase().slice(0, 4)}
    </div>
  )
}

function DocRow({ doc, selected, onSelect, onDelete, onMove }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      style={{ background: selected ? 'var(--accent-bg)' : hov ? 'var(--bg2)' : 'transparent', transition: 'background .1s' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    >
      <td style={s.td}>
        <input type="checkbox" checked={selected}
          onChange={e => onSelect(doc.uuid, e.target.checked)}
          style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
      </td>
      <td style={s.td}><ExtBadge ext={doc.extensao} /></td>
      <td style={{ ...s.td, maxWidth: 220 }}>
        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}
          title={doc.nome_original}>{doc.nome_original}</div>
        {doc.pasta_nome && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>📁 {doc.pasta_nome}</div>}
      </td>
      <td style={{ ...s.td, color: 'var(--text2)', fontSize: 12, whiteSpace: 'nowrap' }}>{fmt(doc.tamanho_bytes)}</td>
      <td style={{ ...s.td, color: 'var(--text3)', fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(doc.criado_em)}</td>
      <td style={s.td}>
        <div style={{ display: 'flex', gap: 4, opacity: hov ? 1 : 0, transition: 'opacity .12s' }}>
          <button style={{ ...s.act, color: 'var(--green)' }} onClick={() => downloadDoc(doc.uuid, doc.nome_original)}>↓ Baixar</button>
          <button style={s.act} onClick={() => onMove(doc)}>↗ Mover</button>
          <button style={{ ...s.act, color: 'var(--danger)' }} onClick={() => onDelete(doc)}>✕</button>
        </div>
      </td>
    </tr>
  )
}

export default function DocTable({ docs, selecionados, loading, onSelect, onSelectAll, onDelete, onMove }) {
  const allSel = docs.length > 0 && docs.every(d => selecionados.has(d.uuid))

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}><span className="spin" style={{ width: 18, height: 18, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} /></div>
  if (!docs.length) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)', fontSize: 13 }}>📭 Sem documentos aqui</div>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={s.th}><input type="checkbox" checked={allSel} onChange={e => onSelectAll(e.target.checked)} style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} /></th>
            <th style={s.th}></th>
            <th style={s.th}>Nome</th>
            <th style={s.th}>Tamanho</th>
            <th style={s.th}>Data</th>
            <th style={s.th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {docs.map(d => <DocRow key={d.uuid} doc={d} selected={selecionados.has(d.uuid)} onSelect={onSelect} onDelete={onDelete} onMove={onMove} />)}
        </tbody>
      </table>
    </div>
  )
}

const s = {
  th: { textAlign: 'left', padding: '7px 10px', fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '0.5px solid var(--border)', whiteSpace: 'nowrap' },
  td: { padding: '9px 10px', borderBottom: '0.5px solid var(--border)', verticalAlign: 'middle' },
  act: { padding: '3px 8px', borderRadius: 4, border: '0.5px solid var(--border2)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', fontSize: 11, fontWeight: 500 },
}
