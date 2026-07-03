import React, { useState } from 'react'
import * as api from '../api/client.js'

export default function LoginPage({ onAuth }) {
  const [modo, setModo]     = useState('login') // 'login' | 'registar'
  const [nome, setNome]     = useState('')
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      let data
      if (modo === 'login') {
        data = await api.login(email, pass)
      } else {
        if (!nome.trim()) { setErro('Nome é obrigatório'); setLoading(false); return }
        data = await api.registar(nome.trim(), email, pass)
      }
      localStorage.setItem('dv_token', data.token)
      onAuth(data.utilizador)
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      {/* Left panel */}
      <div style={s.left}>
        <div style={s.leftContent}>
          <div style={s.logo}>
            <span style={s.logoIcon}>◈</span>
            <span style={s.logoText}>KapitalDocs</span>
          </div>
          <div style={s.tagline}>
            <div style={s.taglineTitle}>Os seus documentos,<br /><em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: 'var(--accent)' }}>em segurança.</em></div>
            <div style={s.taglineSub}>Organize, partilhe e aceda aos seus ficheiros em qualquer lugar, com total controlo.</div>
          </div>
          <div style={s.features}>
            {['Upload drag & drop', 'Pastas e subpastas', 'Download em ZIP', 'Controlo de acesso'].map(f => (
              <div key={f} style={s.feature}>
                <span style={s.featureDot}>◆</span> {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={s.right}>
        <div style={s.card} className="fade-up">
          <div style={s.cardHeader}>
            <div style={s.cardTitle}>{modo === 'login' ? 'Entrar' : 'Criar conta'}</div>
            <div style={s.cardSub}>
              {modo === 'login' ? 'Bem-vindo de volta' : 'Comece gratuitamente'}
            </div>
          </div>

          <form onSubmit={submit} style={s.form}>
            {modo === 'registar' && (
              <Field label="Nome completo" value={nome} onChange={setNome} placeholder="O seu nome" autoFocus />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail}
              placeholder="email@exemplo.com" autoFocus={modo === 'login'} />
            <Field label="Password" type="password" value={pass} onChange={setPass}
              placeholder={modo === 'login' ? '••••••••' : 'Mínimo 6 caracteres'} />

            {erro && <div style={s.erro}>{erro}</div>}

            <button type="submit" style={s.submitBtn} disabled={loading}>
              {loading
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <span style={s.spinner} className="spin" /> A processar…
                  </span>
                : modo === 'login' ? 'Entrar' : 'Criar conta'
              }
            </button>
          </form>

          <div style={s.switchRow}>
            <span style={{ color: 'var(--text2)' }}>
              {/*modo === 'login' ? 'Não tem conta?' : 'Já tem conta?'*/}
            </span>
            <button style={s.switchBtn} onClick={() => { setModo(modo === 'login' ? 'registar' : 'login'); setErro('') }}>
              {/*modo === 'login' ? 'Registar' : 'Entrar'*/}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type = 'text', value, onChange, placeholder, autoFocus }) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={s.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ ...s.input, borderColor: focused ? 'var(--accent)' : 'var(--border2)' }}
      />
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh', display: 'flex',
  },
  left: {
    flex: 1, background: 'var(--bg2)',
    borderRight: '0.5px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '3rem',
  },
  leftContent: { maxWidth: 380 },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3rem' },
  logoIcon: { fontSize: 24, color: 'var(--accent)' },
  logoText: { fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)' },
  tagline: { marginBottom: '2.5rem' },
  taglineTitle: { fontSize: 32, fontWeight: 600, lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.02em' },
  taglineSub: { fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 },
  features: { display: 'flex', flexDirection: 'column', gap: 10 },
  feature: { fontSize: 13, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 },
  featureDot: { color: 'var(--accent)', fontSize: 8 },
  right: {
    width: 440, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '2rem', background: 'var(--bg)',
  },
  card: { width: '100%', maxWidth: 380 },
  cardHeader: { marginBottom: '2rem' },
  cardTitle: { fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 4 },
  cardSub: { fontSize: 13, color: 'var(--text2)' },
  form: {},
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 6, letterSpacing: '0.02em', textTransform: 'uppercase' },
  input: {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg2)', border: '0.5px solid var(--border2)',
    borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 14,
    outline: 'none', transition: 'border-color .15s',
    display: 'block',
  },
  erro: {
    padding: '10px 12px', background: 'var(--danger-bg)',
    border: '0.5px solid var(--danger)', borderRadius: 'var(--r)',
    color: 'var(--danger)', fontSize: 13, marginBottom: '1rem',
  },
  submitBtn: {
    width: '100%', padding: '11px', borderRadius: 'var(--r)',
    background: 'var(--accent)', color: '#FFFFFF',
    border: 'none', fontSize: 14, fontWeight: 600,
    cursor: 'pointer', marginTop: '0.5rem', marginBottom: '1.5rem',
    transition: 'opacity .15s',
  },
  switchRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  switchBtn: {
    background: 'none', border: 'none', color: 'var(--accent)',
    fontWeight: 500, cursor: 'pointer', fontSize: 13, padding: 0,
  },
  spinner: {
    width: 14, height: 14, border: '2px solid rgba(0,0,0,.2)',
    borderTopColor: '#FFFFFF', borderRadius: '50%', display: 'inline-block',
  },
}
