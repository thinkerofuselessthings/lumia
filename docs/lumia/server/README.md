# Server — Architettura

> **Data**: 2026-04-11 · **Versione**: lumia v0.0.1

---

## Panoramica

Server HTTP puro Node.js (nessun framework). Unica dipendenza npm: `sql.js`.
Bind configurabile via `.env` (`LUMIA_HOST`, `LUMIA_PORT`), default `127.0.0.1:3500`.

Entry point: `node src/init.js`

---

## File principali

| File | Responsabilità |
|------|----------------|
| [`src/init.js`](../../../src/init.js) | Entry point — env loading, DB init, engine loading, server start, cleanup job |
| [`src/server.js`](../../../src/server.js) | Factory `createServer()` — `http.createServer()` con timeout configurabili |
| [`src/http/request-handler.js`](../../../src/http/request-handler.js) | Dispatch: security headers → CORS → API o static |
| [`src/http/static.js`](../../../src/http/static.js) | Serving statico con routing basato su sessione |
| [`src/routes.js`](../../../src/routes.js) | Registrazione route API, dispatch, logging |
| [`src/middleware/security-headers.js`](../../../src/middleware/security-headers.js) | CSP, cache control, security headers |
| [`src/middleware/auth.js`](../../../src/middleware/auth.js) | Barrel: CSRF + cookie utilities |
| [`src/errors/app-error.js`](../../../src/errors/app-error.js) | Classe errore operativo con codici macchina |
| [`src/errors/codes.js`](../../../src/errors/codes.js) | Catalogo codici errore (status + messaggio) |

---

## Startup Sequence

```
node src/init.js
  1. Carica .env (prima di qualsiasi require)
  2. initDatabase()        → sql.js WASM init, crea/apre lumia.db, schema DDL
  3. seedAdminUser()       → inserisce utente admin se non esiste
  4. loadEngines()         → carica moduli diagnostici/score/terapia in VM sandbox
  5. createServer()        → crea http.Server con timeout
  6. server.listen(PORT, HOST)
  7. setInterval(cleanupSessions, 15 min)  → pulizia sessioni scadute
```

---

## Configurazione (`.env`)

| Variabile | Default | Scopo |
|-----------|---------|-------|
| `LUMIA_HOST` | `127.0.0.1` | IP di bind |
| `LUMIA_PORT` | `3500` | Porta |
| `LUMIA_API_KEY` | (vuoto) | Chiave API per client esterni |
| `NODE_ENV` | `development` | Modalità |
| `ADMIN_PASSWORD` | (random 16B) | Password iniziale admin |
| `DB_PATH` | `data/lumia.db` | Percorso database |

### Timeout HTTP

| Parametro | Default | Controllo |
|-----------|---------|-----------|
| `HEADERS_TIMEOUT` | 20 000 ms | Tempo massimo per ricevere headers |
| `REQUEST_TIMEOUT` | 30 000 ms | Tempo massimo per ricevere la richiesta completa |
| `SOCKET_TIMEOUT` | 120 000 ms | Timeout idle socket |
| `KEEP_ALIVE_TIMEOUT` | 5 000 ms | Keep-alive socket |

---

## Pipeline delle richieste

```
handleRequest(req, res)
  ├─ applySecurityHeaders(res)
  ├─ applyCors(req, res)
  │
  ├─ IF /api/*
  │  ├─ applyCacheControl(res, "api")   → no-store
  │  ├─ parseBody(req)                  → JSON body
  │  └─ handleApiRequest(req, res, body)
  │     ├─ Rate limit check (IP)
  │     ├─ Router match (method + path)
  │     ├─ enforceAuth (session/API-key + CSRF + ruolo)
  │     └─ route.handler(ctx)
  │
  └─ ELSE
     └─ serveStatic(req, res)
        ├─ Session routing: / → login.html o index.html
        ├─ Path traversal check
        ├─ MIME resolution
        └─ CSP + Cache-Control headers
```

---

## Route API

### Pubbliche (no auth)

| Metodo | Path | Scopo |
|--------|------|-------|
| GET | `/api/health` | Status server + engine disponibili |
| GET | `/api/config` | Host, porta, apiKey, features |
| GET | `/api/log` | Log chiamate API (ring buffer, `?limit=50`) |
| GET | `/api/catalog` | Catalogo moduli diagnostici/score/therapy |

### Protette (sessione o API key)

| Metodo | Path | Scopo |
|--------|------|-------|
| GET/POST | `/api/diagnostic/b-lpd` | Diagnosi differenziale CD-B-LPD |
| GET/POST | `/api/scores/*` | Calcolatori score (cllIPI, flipi, ecc.) |
| GET/POST | `/api/therapy/*` | Assistenti terapeutici (CLL, DLBCL, FL, MCL) |

### Auth

| Metodo | Path | Scopo |
|--------|------|-------|
| POST | `/api/auth/check-user` | Verifica esistenza utente |
| POST | `/api/auth/login` | Login (session + CSRF token) |
| POST | `/api/auth/logout` | Logout (invalida sessione) |
| GET | `/api/auth/check` | Verifica sessione attiva |
| POST | `/api/auth/verify-password` | Re-autenticazione per operazioni sensibili |

---

## Autenticazione duale

| Metodo | Contesto | Header/Cookie |
|--------|----------|---------------|
| Session | Browser | Cookie `session` (HttpOnly, SameSite=Strict) |
| API Key | Client esterni | Header `X-API-Key` |

Le route con `{ auth: true }` accettano entrambi i meccanismi.
Le route con `{ role: "amministratore" }` richiedono sessione con ruolo admin.

---

## Security Headers

Applicati a tutte le risposte:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 0
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

### Content-Security-Policy (solo HTML)

```
default-src 'self'
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
         https://use.hugeicons.com https://cdn.hugeicons.com
font-src 'self' https://fonts.gstatic.com
         https://use.hugeicons.com https://cdn.hugeicons.com
connect-src 'self'
img-src 'self' data:
base-uri 'self'
form-action 'self'
frame-ancestors 'none'
```

### Cache-Control

| Tipo | Policy |
|------|--------|
| API | `no-store` |
| HTML | `no-cache` |
| Static | `public, max-age=86400` (1 giorno) |

---

## Rate Limiting

### Limiter API

- **Max**: 200 richieste/minuto per IP (configurabile: `API_RATE_LIMIT`)
- **Window**: 60 secondi (`API_RATE_WINDOW`)
- **Pulizia**: entry stale rimosse ogni 10 minuti

### Limiter Login

- **Max**: 5 tentativi/15 minuti per IP (`LOGIN_RATE_LIMIT`)
- **Window**: 15 minuti (`LOGIN_RATE_WINDOW`)
- **Reset**: si azzera dopo login riuscito

---

## Engine Loader

Carica i moduli diagnostici/score/therapy in sandbox VM isolati.
I file nella directory `app/` vengono eseguiti con `vm.runInNewContext()`.

Engines caricati al boot (da log):
`LumiaAPI`, `LumiaScores`, `CDBLPDData`, `CDBLPDCore`,
`CLLTherapyCore`, `DLBCLTherapyCore`, `FLTherapyCore`, `MCLTherapyCore`

---

## Gestione errori

### Classe `AppError`

```javascript
new AppError(code, message, status, details)
AppError.from(code, details)  // factory da catalogo
```

### Codici errore

| Codice | Status | Messaggio |
|--------|--------|-----------|
| `AUTH_REQUIRED` | 401 | Autenticazione richiesta |
| `AUTH_INVALID_CREDENTIALS` | 401 | Credenziali non valide |
| `AUTH_CSRF_INVALID` | 403 | Token CSRF non valido |
| `RATE_LIMIT_LOGIN` | 429 | Troppi tentativi di accesso |
| `RATE_LIMIT_API` | 429 | Troppe richieste |
| `VALIDATION_REQUIRED` | 400 | Campo obbligatorio mancante |
| `ENGINE_UNAVAILABLE` | 503 | Engine non caricato |
| `INTERNAL` | 500 | Errore interno del server |

### Formato risposta errore

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Autenticazione richiesta",
    "details": null
  }
}
```

---

## Static File Serving

### MIME supportati

HTML, CSS, JS, JSON, SVG, PNG, JPEG, GIF, ICO, WOFF2, WOFF, TTF, OTF, WebP, PDF, TXT

### Routing basato su sessione

| URL | Senza sessione | Con sessione |
|-----|----------------|--------------|
| `/` | → `public/login.html` | → `index.html` |
| `/index.html` | → `public/login.html` | → `index.html` |
| `/login.html` | → `public/login.html` | → `public/login.html` |

### Sicurezza

- **Path traversal**: il percorso risolto deve rimanere dentro ROOT_DIR
- **CSP**: applicato alle risposte HTML
- **Cache-Control**: per tipo (no-cache HTML, 1 giorno static)

---

## Database

### Motore

`sql.js` — SQLite compilato in WebAssembly. Zero dipendenze native.

### Wrapper (`src/db/sqlite-wrapper.js`)

API compatibile con `better-sqlite3`:
- `db.prepare(sql).get(...params)` → prima riga o undefined
- `db.prepare(sql).all(...params)` → array di righe
- `db.prepare(sql).run(...params)` → `{ changes, lastInsertRowid }`
- `db.exec(sql)` → DDL multi-statement
- `db.transaction(fn)` → BEGIN/COMMIT/ROLLBACK automatico

### Persistenza

- Auto-save con debounce 500ms dopo ogni operazione
- Batch mode (`beginBatch/endBatch`) per operazioni bulk
- Flush sincrono su disco via `fs.writeFileSync()`

### Percorso

`data/lumia.db` (configurabile via `DB_PATH`)

---

## WebSocket

Il server supporta connessioni WebSocket sulla stessa porta.
Usato per streaming real-time dei log API al client.

```
ws://localhost:3500
  → { type: "auth", apiKey: "..." }    // autenticazione
  ← { type: "apiLog", entry: {...} }   // log entry in tempo reale
```

---

## API Log

Ring buffer in memoria (max 500 entry). Accessibile via:
- `GET /api/log?limit=N` — ultime N entry
- WebSocket — streaming in tempo reale
- UI: sezione API Monitor dentro il modulo Docs

---

## Audit Log

Tabella `audit_log` in SQLite. Registra:
- `login.success` / `login.failed`
- `logout`
- `auth.denied`
- `csrf.failure`

Retention: 365 giorni (configurabile `AUDIT_RETENTION_DAYS`).

---

## File coinvolti

| File | Percorso |
|------|----------|
| Entry point | [`src/init.js`](../../../src/init.js) |
| Server factory | [`src/server.js`](../../../src/server.js) |
| Request handler | [`src/http/request-handler.js`](../../../src/http/request-handler.js) |
| Static serving | [`src/http/static.js`](../../../src/http/static.js) |
| Route API | [`src/routes.js`](../../../src/routes.js) |
| Security headers | [`src/middleware/security-headers.js`](../../../src/middleware/security-headers.js) |
| Auth middleware | [`src/middleware/auth.js`](../../../src/middleware/auth.js) |
| CSRF | [`src/middleware/csrf.js`](../../../src/middleware/csrf.js) |
| Cookies | [`src/middleware/cookies.js`](../../../src/middleware/cookies.js) |
| Rate limiter | [`src/middleware/rate-limiter.js`](../../../src/middleware/rate-limiter.js) |
| Engine loader | [`src/engine-loader.js`](../../../src/engine-loader.js) |
| DB wrapper | [`src/db/sqlite-wrapper.js`](../../../src/db/sqlite-wrapper.js) |
| DB connection | [`src/db/connection.js`](../../../src/db/connection.js) |
| Errori | [`src/errors/app-error.js`](../../../src/errors/app-error.js) |
| Codici errore | [`src/errors/codes.js`](../../../src/errors/codes.js) |
| Env | [`.env`](../../../.env) |
