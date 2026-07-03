import React, { useState, useEffect, useCallback } from 'react'
import Modal from './Modal.jsx'
import Btn   from './Btn.jsx'
import ChangePasswordModal from './ChangePasswordModal.jsx'
import * as api from '../api/client.js'

export default function UsersPanel({ user, onToast }) {
  const [users,          setUsers]          = useState([])
  const [deps,           setDeps]           = useState([])
  const [loading,        setLoading]        = useState(true)
  const [isAdmin,        setIsAdmin]        = useState(false)
  const [modal,          setModal]          = useState(null)  // null | { mode: 'add' } | { mode: 'edit', user }
  const [form,           setForm]           = useState({ nome: '', email: '', password: '', role: 'user', departamentos: [] })
  const [saving,         setSaving]         = useState(false)
  const [deleting,       setDeleting]       = useState(null)
  const [chgPwdUser,     setChgPwdUser]     = useState(null)  // user para mudar password

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [data, depsData] = await Promise.all([
        api.getUtilizadores(),
        api.getDepartamentos()
      ])
      setUsers(Array.isArray(data) ? data : [data])
      setDeps(Array.isArray(depsData) ? depsData : [])
    } catch (e) { onToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [onToast])

  useEffect(() => { carregar() }, [])
  useEffect(() => { setIsAdmin(user?.role === 'admin') }, [user])

  const openAdd = () => {
    setForm({ nome: '', email: '', password: '', role: 'user', departamentos: [] })
    setModal({ mode: 'add' })
  }

  const openEdit = (user) => {
    setForm({ nome: user.nome, email: user.email, password: '', role: user.role, ativo: user.ativo, departamentos: user.departamentos || [] })
    setModal({ mode: 'edit', user })
  }

  const onChange = (k, v) => setForm(f => ({ ...f, [k]: v }))
  
  const toggleDep = (id) => {
    setForm(f => {
      const deps = f.departamentos.includes(id)
        ? f.departamentos.filter(d => d !== id)
        : [...f.departamentos, id]
      return { ...f, departamentos: deps }
    })
  }

  const onSubmit = async () => {
    if (!form.nome.trim() || !form.email.trim()) {
      return onToast('Nome e email são obrigatórios', 'error')
    }
    if (modal.mode === 'add' && !form.password) {
      return onToast('Password é obrigatória', 'error')
    }
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        const payload = { ...form }
        await api.criarUtilizador(payload)
        onToast('Utilizador criado', 'success')
      } else {
        const payload = { nome: form.nome }
        if (form.password) payload.password = form.password
        if (form.role)     payload.role     = form.role
        if (form.ativo !== undefined) payload.ativo = form.ativo
        if (form.departamentos !== undefined) payload.departamentos = form.departamentos
        await api.atualizarUtilizador(modal.user.uuid, payload)
        onToast('Utilizador atualizado', 'success')
      }
      setModal(null)
      carregar()
    } catch (e) { onToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const onDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await api.eliminarUtilizador(deleting.uuid)
      onToast(`"${deleting.nome}" eliminado`, 'success')
      setDeleting(null)
      carregar()
    } catch (e) { onToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.title}>Utilizadores</h2>
        <Btn size="sm" onClick={openAdd}>+ Novo</Btn>
      </div>

      {loading ? (
        <div style={s.hint}><span className="spin" style={s.spinner} /></div>
      ) : (
        <div style={s.list}>
          {users.map(u => (
            <div key={u.uuid} style={s.row}>
              <div style={s.info}>
                <div style={s.name}>{u.nome}</div>
                <div style={s.email}>{u.email} {u.departamento_nome ? `• ${u.departamento_nome}` : ''}</div>
              </div>
              <div style={s.meta}>
                <span style={{ ...s.badge, background: u.role === 'admin' ? 'var(--accent-bg)' : 'var(--bg3)', color: u.role === 'admin' ? 'var(--accent)' : 'var(--text3)' }}>
                  {u.role}
                </span>
                {!u.ativo && <span style={{ ...s.badge, background: 'var(--danger-bg)', color: 'var(--danger)' }}>inativo</span>}
              </div>
              <div style={s.actions}>
                <button style={s.actBtn} title="Editar perfil" onClick={() => openEdit(u)}>✏️</button>
                <button style={s.actBtn} title="Alterar password" onClick={() => setChgPwdUser(u)}>🔑</button>
                {isAdmin && u.uuid !== user?.uuid && (
                  <button style={{ ...s.actBtn, color: 'var(--danger)' }} onClick={() => setDeleting(u)}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <Modal title={modal.mode === 'add' ? 'Novo utilizador' : `Editar: ${modal.user.nome}`} onClose={() => setModal(null)}>
          <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={s.label}>Nome</label>
              <input style={s.input} value={form.nome} onChange={e => onChange('nome', e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label style={s.label}>Email</label>
              <input style={s.input} type="email" value={form.email} onChange={e => onChange('email', e.target.value)}
                placeholder="email@exemplo.com" disabled={modal.mode === 'edit'} />
            </div>
            {modal.mode === 'add' && (
              <div>
                <label style={s.label}>Password</label>
                <input style={s.input} type="password" value={form.password} onChange={e => onChange('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres" />
              </div>
            )}
            {isAdmin && (
              <>
                <div>
                  <label style={s.label}>Tipo</label>
                  <select style={s.select} value={form.role} onChange={e => onChange('role', e.target.value)}>
                    <option value="user">Utilizador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>Departamentos</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 150, overflowY: 'auto', background: 'var(--bg)', padding: '8px 10px', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)' }}>
                    {deps.map(d => (
                      <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.departamentos.includes(d.id)} onChange={() => toggleDep(d.id)} />
                        {d.nome}
                      </label>
                    ))}
                    {deps.length === 0 && <span style={{fontSize: 12, color: 'var(--text3)'}}>Nenhum departamento criado.</span>}
                  </div>
                </div>
                {modal.mode === 'edit' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.ativo} onChange={e => onChange('ativo', e.target.checked)} />
                    Ativo
                  </label>
                )}
              </>
            )}
          </div>
          <Modal.Footer>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancelar</Btn>
            <Btn variant="primary" onClick={onSubmit} disabled={saving}>
              {saving ? 'A guardar…' : modal.mode === 'add' ? 'Criar' : 'Guardar'}
            </Btn>
          </Modal.Footer>
        </Modal>
      )}

      {/* Modal confirmar eliminação */}
      {deleting && (
        <Modal title="Eliminar utilizador" onClose={() => setDeleting(null)}>
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={s.warnBox}>
              Eliminar <strong>"{deleting.nome}"</strong> ({deleting.email})?<br />
              Esta ação é <strong>irreversível</strong>.
            </div>
          </div>
          <Modal.Footer>
            <Btn variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Btn>
            <Btn variant="danger" onClick={onDelete} disabled={saving}>
              {saving ? 'A eliminar…' : 'Eliminar'}
            </Btn>
          </Modal.Footer>
        </Modal>
      )}

      {/* Modal: Alterar password (via botão 🔑 em qualquer linha) */}
      {chgPwdUser && (
        <ChangePasswordModal
          user={chgPwdUser}
          onClose={() => setChgPwdUser(null)}
          onToast={onToast}
          requireCurrent={false}
        />
      )}
    </div>
  )
}

const s = {
  wrap:    { display: 'flex', flexDirection: 'column', height: '100%' },
  header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)' },
  title:   { fontSize: 13, fontWeight: 600, color: 'var(--text2)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' },
  hint:    { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 18, height: 18, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)', borderRadius: '50%', display: 'inline-block' },
  list:    { flex: 1, overflowY: 'auto', padding: '0.5rem' },
  row:     { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--r)', transition: 'background .1s', marginBottom: 2 },
  info:    { flex: 1, minWidth: 0 },
  name:    { fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  email:   { fontSize: 11, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta:    { display: 'flex', gap: 4 },
  badge:   { fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.04em' },
  actions: { display: 'flex', gap: 4 },
  actBtn:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 4, borderRadius: 4 },
  label:   { display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:   { width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  select:  { width: '100%', padding: '8px 10px', background: 'var(--bg)', border: '0.5px solid var(--border2)', borderRadius: 'var(--r)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' },
  warnBox: { padding: '12px 14px', background: 'var(--danger-bg)', border: '0.5px solid var(--danger)', borderRadius: 'var(--r)', color: 'var(--danger)', fontSize: 13 },
}