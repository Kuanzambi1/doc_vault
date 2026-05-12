const BASE = '/api'

function getToken() { return localStorage.getItem('dv_token') || '' }

async function req(url, opts = {}) {
  const res = await fetch(BASE + url, {
    ...opts,
    headers: {
      'Authorization': 'Bearer ' + getToken(),
      ...(opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
    body: opts.body instanceof FormData ? opts.body :
          opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`)
  return data
}

// Auth
export const login    = (email, password) => req('/auth/login',   { method: 'POST', body: { email, password } })
export const registar = (nome, email, password) => req('/auth/registar', { method: 'POST', body: { nome, email, password } })
export const getMe    = () => req('/auth/me')
export const status   = () => req('/status')

// Pastas — pai_uuid undefined = raiz
export const getPastas    = (pai_uuid) => req('/pastas' + (pai_uuid ? `?pai_uuid=${pai_uuid}` : ''))
export const getTodasPastas = () => req('/pastas/todas')
export const criarPasta   = (nome, pai_uuid) => req('/pastas', { method: 'POST', body: { nome, pai_uuid } })
export const renomearPasta= (uuid, nome) => req(`/pastas/${uuid}`, { method: 'PATCH', body: { nome } })
export const eliminarPasta= (uuid) => req(`/pastas/${uuid}`, { method: 'DELETE' })

// Documentos
export const getDocs = (params = {}) => {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v != null && q.set(k, v))
  return req('/documentos?' + q)
}

export async function uploadDocs(files, pastaUuid) {
  const form = new FormData()
  files.forEach(f => form.append('files', f))
  if (pastaUuid) form.append('pasta_uuid', pastaUuid)
  const res = await fetch(BASE + '/documentos', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + getToken() },
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.erro || 'Erro no upload')
  return data
}

export const moverDoc    = (uuid, pasta_uuid) => req(`/documentos/${uuid}/mover`, { method: 'PATCH', body: { pasta_uuid } })
export const eliminarDoc = (uuid)             => req(`/documentos/${uuid}`, { method: 'DELETE' })
export const eliminarLote= (uuids)           => req('/documentos/eliminar-lote', { method: 'POST', body: { uuids } })

// ✅ CORRETO - Usar fetch com blob
export async function downloadDoc(uuid, nome) {
  try {
    const response = await fetch(BASE + `/documentos/${uuid}/download`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + getToken()
      }
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.erro || 'Erro no download')
    }
    
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nome
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Erro no download:', error)
    alert(error.message || 'Falha ao baixar o arquivo')
  }
}

export async function downloadZip(uuids) {
  const res = await fetch(BASE + '/documentos/download-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
    body: JSON.stringify({ uuids }),
  })
  if (!res.ok) throw new Error('Erro ao gerar ZIP')
  const blob = await res.blob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'documentos.zip'; a.click()
  URL.revokeObjectURL(url)
}

// ── Utilizadores ──────────────────────────────────────────
export const getUtilizadores  = () => req('/utilizadores')
export const criarUtilizador  = (dados) => req('/utilizadores', { method: 'POST', body: dados })
export const atualizarUtilizador = (uuid, dados) => req(`/utilizadores/${uuid}`, { method: 'PATCH', body: dados })
export const eliminarUtilizador = (uuid) => req(`/utilizadores/${uuid}`, { method: 'DELETE' })
