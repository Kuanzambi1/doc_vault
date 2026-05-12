# DocVault — MVP
> React + Vite · Node.js + Express · MySQL · JWT Auth

## Estrutura

```
docvault/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── uploadMiddleware.js
│   ├── middleware/auth.js          ← JWT middleware
│   ├── routes/
│   │   ├── auth.js                 ← login, registar, /me
│   │   ├── pastas.js               ← CRUD + subpastas + eliminar recursivo
│   │   └── documentos.js           ← upload, download, ZIP, mover, eliminar
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── App.jsx                 ← auth gate (token → getMe)
        ├── main.jsx
        ├── index.css               ← tema dark editorial
        ├── api/client.js           ← todas as chamadas HTTP com Bearer token
        ├── hooks/useToast.js
        └── pages/
            ├── LoginPage.jsx       ← login + registar num ecrã
            ├── AppPage.jsx         ← gestor principal
            └── components/
                ├── FolderPanel.jsx ← NAVEGAÇÃO DE PASTAS CORRIGIDA
                ├── DocTable.jsx
                ├── DropZone.jsx
                ├── Modal.jsx
                ├── Btn.jsx
                └── Toast.jsx
```

---

## Arranque rápido

### 1. Criar base de dados
```sql
CREATE DATABASE docvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend
```bash
cd backend
cp .env.example .env       # edite DB_PASSWORD e JWT_SECRET
npm install
npm start                  # ou: npm run dev
```

### 3. Frontend (desenvolvimento)
```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### 4. Build produção
```bash
cd frontend && npm run build
# O backend serve o dist/ em http://localhost:3001
```

---

## Como funciona o sistema de pastas (fix)

O problema anterior era que a sidebar mostrava sempre as pastas raiz.
Agora o `FolderPanel` tem o seu próprio estado `paiUuid`:

- `paiUuid = null`   → mostra pastas raiz do utilizador
- `paiUuid = "uuid"` → faz fetch de `/api/pastas?pai_uuid=UUID` → mostra filhos diretos
- Clicar numa pasta atualiza `paiUuid` → novo fetch → novos filhos
- O breadcrumb vem do backend pronto
- "Nova pasta" passa sempre o `paiUuid` atual → cria no nível certo

---

## API

### Auth (pública)
```
POST /api/auth/registar    { nome, email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me          → requer Bearer token
```

### Pastas (requer token)
```
GET    /api/pastas                  → filhos diretos (query: pai_uuid)
GET    /api/pastas/todas            → todas as pastas (para selects)
POST   /api/pastas                  → { nome, pai_uuid? }
PATCH  /api/pastas/:uuid            → { nome }
DELETE /api/pastas/:uuid            → elimina recursivamente
```

### Documentos (requer token)
```
POST   /api/documentos              → upload multipart
GET    /api/documentos              → lista (pagina, limite, busca, pasta_uuid)
GET    /api/documentos/:uuid/download
POST   /api/documentos/download-zip → { uuids: [] }
PATCH  /api/documentos/:uuid/mover  → { pasta_uuid }
DELETE /api/documentos/:uuid
POST   /api/documentos/eliminar-lote → { uuids: [] }
```
