import React, { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage.jsx'
import AppPage   from './pages/AppPage.jsx'
import Toast     from './components/Toast.jsx'
import { useToast } from './hooks/useToast.js'
import { getMe } from './api/client.js'

export default function App() {
  const [user,    setUser]    = useState(undefined) // undefined = verificando, null = não autenticado
  const [loading, setLoading] = useState(true)
  const { toasts, toast } = useToast()

  useEffect(() => {
    const token = localStorage.getItem('dv_token')
    if (!token) { setUser(null); setLoading(false); return }
    getMe()
      .then(u => setUser(u))
      .catch(() => { localStorage.removeItem('dv_token'); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  const onAuth = u => setUser(u)

  const onLogout = () => {
    localStorage.removeItem('dv_token')
    setUser(null)
    toast('Sessão terminada', 'info')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: 24 }}>
      ◈
    </div>
  )

  return (
    <>
      {!user
        ? <LoginPage onAuth={onAuth} />
        : <AppPage   user={user} onLogout={onLogout} toast={toast} />
      }
      <Toast toasts={toasts} />
    </>
  )
}
