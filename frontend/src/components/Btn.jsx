import React from 'react'

const V = {
  primary:   { background: 'var(--accent)',  color: '#0F0F0E', border: 'none' },
  secondary: { background: 'var(--bg3)',     color: 'var(--text)', border: '0.5px solid var(--border2)' },
  ghost:     { background: 'transparent',    color: 'var(--text2)', border: 'none' },
  danger:    { background: 'transparent',    color: 'var(--danger)', border: '0.5px solid #5A2020' },
}

export default function Btn({ children, variant = 'secondary', size = 'md', disabled, style, ...p }) {
  const pad = size === 'sm' ? '4px 10px' : size === 'lg' ? '11px 22px' : '7px 14px'
  const fs  = size === 'sm' ? '12px' : '13px'
  return (
    <button disabled={disabled} style={{
      ...V[variant], padding: pad, fontSize: fs, fontWeight: 500,
      borderRadius: 'var(--r)', cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? .4 : 1, display: 'inline-flex', alignItems: 'center',
      gap: 5, whiteSpace: 'nowrap', transition: 'opacity .12s', ...style,
    }} {...p}>{children}</button>
  )
}
