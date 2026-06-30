import React, { useState } from 'react'
import Modal from './Modal.jsx'
import Btn   from './Btn.jsx'
import * as api from '../api/client.js'

export default function ChangePasswordModal({ user, onClose, onToast }) {
  const [form, setForm] = useState({ atual: '', nova: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const [erros,  setErros]  = useState({})

  const onChange = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    setErros(e => ({ ...e, [k]: undefined }))
  }

  const validar = () => {
    const e = {}
    if (!form.atual)               e.atual      = 'Insira a password atual'
    if (!form.nova)                e.nova       = 'Insira a nova password'
    else if (form.nova.length < 6) e.nova       = 'Mínimo 6 caracteres'
    if (form.nova !== form.confirmar) e.confirmar = 'As passwords não coincidem'
    return e
  }

  const onSubmit = async () => {
    const e = validar()
    if (Object.keys(e).length) { setErros(e); return }

    setSaving(true)
    try {
      // Verifica a password atual via login antes de alterar
      await api.login(user.email, form.atual)
      await api.atualizarUtilizador(user.uuid, { password: form.nova })
      onToast('Password alterada com sucesso!', 'success')
      onClose()
    } catch (err) {
      const msg = err.message.toLowerCase()
      if (msg.includes('credenciais') || msg.includes('inv')) {
        setErros({ atual: 'Password atual incorreta' })
      } else {
        onToast(err.message, 'error')
      }
    } finally { setSaving(false) }
  }

  const Field = ({ label, name, placeholder }) => (
    <div>
      <label style={s.label}>{label}</label>
      <input
        style={{ ...s.input, ...(erros[name] ? s.inputErr : {}) }}
        type="password"
        value={form[name]}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
        autoComplete={name === 'atual' ? 'current-password' : 'new-password'}
      />
      {erros[name] && <span style={s.errMsg}>{erros[name]}</span>}
    </div>
  )

  return (
    <Modal title="Alterar Password" onClose={onClose}>
      <div style={s.body}>
        <div style={s.info}>
          <span style={s.infoIcon}>👤</span>
          <span style={s.infoName}>{user.nome}</span>
          <span style={s.infoEmail}>{user.email}</span>
        </div>

        <Field label="Password Atual"     name="atual"     placeholder="Insira a password atual" />
        <Field label="Nova Password"      name="nova"      placeholder="Mínimo 6 caracteres" />
        <Field label="Confirmar Password" name="confirmar" placeholder="Repita a nova password" />

        <div style={s.hint}>
          A nova password deve ter pelo menos 6 caracteres.
        </div>
      </div>
      <Modal.Footer>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Btn>
        <Btn variant="primary" onClick={onSubmit} disabled={saving}>
          {saving ? 'A guardar…' : 'Alterar Password'}
        </Btn>
      </Modal.Footer>
    </Modal>
  )
}

const s = {
  body: {
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  info: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    background: 'var(--bg)',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--r)',
  },
  infoIcon:  { fontSize: 16 },
  infoName:  { fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 },
  infoEmail: { fontSize: 11, color: 'var(--text3)' },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text2)',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg)',
    border: '0.5px solid var(--border2)',
    borderRadius: 'var(--r)',
    color: 'var(--text)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  },
  inputErr: {
    borderColor: 'var(--danger)',
  },
  errMsg: {
    display: 'block',
    fontSize: 11,
    color: 'var(--danger)',
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    color: 'var(--text3)',
    padding: '7px 10px',
    background: 'var(--bg3)',
    borderRadius: 'var(--r)',
    lineHeight: 1.5,
  },
}
