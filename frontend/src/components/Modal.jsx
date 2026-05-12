import React, { useEffect } from 'react'

export default function Modal({ title, onClose, children, maxWidth = 420 }) {
  useEffect(() => {
    const fn = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ ...s.box, maxWidth }} className="fade-up">
        <div style={s.header}>
          <span style={s.title}>{title}</span>
          <button style={s.close} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

Modal.Footer = ({ children }) => <div style={s.footer}>{children}</div>

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 300, padding: '1rem', animation: 'fadeIn .15s ease',
  },
  box: {
    background: 'var(--bg2)', border: '0.5px solid var(--border2)',
    borderRadius: 'var(--r-lg)', width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,.5)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--border)',
  },
  title:  { fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  close:  {
    background: 'none', border: 'none', color: 'var(--text3)',
    cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px',
  },
  footer: {
    display: 'flex', gap: 8, justifyContent: 'flex-end',
    padding: '1rem 1.25rem', borderTop: '0.5px solid var(--border)',
    background: 'var(--bg)',
  },
}
