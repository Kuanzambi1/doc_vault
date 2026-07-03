import React from 'react'

const TC = {
  success: { bg: 'var(--green-bg)',  border: 'var(--green)', color: 'var(--green)',  icon: '✓' },
  error:   { bg: 'var(--danger-bg)', border: 'var(--danger)', color: 'var(--danger)', icon: '✕' },
  info:    { bg: 'var(--bg3)',       border: 'var(--border2)', color: 'var(--text2)', icon: 'ℹ' },
}

export default function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 999 }}>
      {toasts.map(t => {
        const c = TC[t.type] || TC.info
        return (
          <div key={t.id} className="fade-up" style={{
            padding: '10px 14px', borderRadius: 'var(--r)',
            background: c.bg, border: `0.5px solid ${c.border}`,
            color: c.color, fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
            maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,.3)',
          }}>
            <span>{c.icon}</span> {t.msg}
          </div>
        )
      })}
    </div>
  )
}
