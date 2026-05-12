import React, { useState, useRef } from 'react'

export default function DropZone({ onFiles }) {
  const [drag, setDrag] = useState(false)
  const ref = useRef()

  const handle = files => files.length && onFiles([...files])

  return (
    <div
      style={{
        border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--border2)'}`,
        borderRadius: 'var(--r-lg)', padding: '1.25rem 1.5rem',
        textAlign: 'center', cursor: 'pointer',
        background: drag ? 'var(--accent-bg)' : 'var(--bg2)',
        transition: 'all .2s', position: 'relative',
      }}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files) }}
      onClick={() => ref.current.click()}
    >
      <input ref={ref} type="file" multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
        style={{ display: 'none' }}
        onChange={e => { handle(e.target.files); e.target.value = '' }}
      />
      <div style={{ fontSize: 13, color: drag ? 'var(--accent)' : 'var(--text2)', fontWeight: 500 }}>
        {drag ? '↓ Solte aqui' : '↑ Arraste ficheiros ou clique para selecionar'}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
        PDF · DOCX · XLSX · PNG · JPG · CSV · TXT · máx 50 MB
      </div>
    </div>
  )
}
