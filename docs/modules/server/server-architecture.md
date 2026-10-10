# Server Architecture

> HTTP server custom Node.js (zero framework), SQLite, WebSocket, autenticazione PBKDF2.

| Proprietà | Valore |
|-----------|--------|
| **Directory** | `src/` |
| **Entry point** | `node src/init.js` |
| **Porta** | `LUMIA_PORT` (default 3500) |
| **Host** | `LUMIA_HOST` (default 127.0.0.1) |
| **Database** | SQLite via `sql.js` → `data/lumia.db` |
| **Dipendenze npm** | Solo `sql.js` |

## Struttura directory

```
src/
├── init.js                 ← entry point
├── server.js               ← HTTP server factory
├── routes.js               ← routing API completo
├── config/
│   └── env.js              ← .env loader
├── db/
│   ├── connection.js       ← connessione SQLite
│   ├── instance.js         ← singleton DB
│   ├── schema.js           ← DDL tabelle
│   └── audit.js            ← utility audit log
├── lib/
│   └── engine-loader.js    ← carica browser JS in VM sandbox
├── http/
│   ├── router.js           ← mini-router pattern-matching
│   ├── request-handler.js  ← dispatcher richieste
│   ├── body-parser.js      ← parser JSON con size limit
│   ├── response.js         ← helper json()/notFound()
│   └── static.js           ← file server con MIME types
├── middleware/
│   ├── auth.js             ← cookie parser + CSRF derivation
│   ├── auth-gate.js        ← session/CSRF/role enforcement
│   ├── cookies.js          ← parse/serialize cookie
│   ├── cors.js             ← CORS preflight
│   ├── csrf.js             ← generazione token CSRF
│   ├── rate-limiter.js     ← IP-based sliding window
│   └── security-headers.js ← CSP, CORP, X-Frame-Options
├── auth/
│   ├── routes.js           ← login/logout/check endpoints
│   ├── seed.js             ← seed admin iniziale
│   └── sessions.js         ← gestione sessioni + cleanup
├── admin/
│   └── routes.js           ← CRUD utenti + audit log
└── errors/
    ├── app-error.js        ← classe AppError custom
    ├── codes.js            ← mappa codice → HTTP status
    └── handle.js           ← error → JSON response
```

---

## Flusso richiesta

```
Client HTTP request
  │
  ▼
handleRequest (request-handler.js)
  ├── applyCors()             ← CORS headers + preflight 204
  ├── applySecurityHeaders()  ← CSP, CORP, X-Frame-Options
  │
  ├── /api/* → handleApiRequest (routes.js)
  │     ├── parseBody()       ← JSON body (max 1MB)
  │     ├── rateLimiter()     ← 100 req/min per IP
  │     ├── router.match()    ← pattern matching
  │     ├── enforceAuth()     ← session/API-key + CSRF + role
  │     │     ├── X-API-Key header → stateless auth
  │     │     └── session cookie  → DB-validated session
  │     └── handler(req, res, params, session)
  │
  └── /* → serveStatic (static.js)
        ├── path traversal check
        ├── unauthenticated → login.html
        └── authenticated → index.html / file richiesto
```

---

## Autenticazione

### Stack crittografico

| Componente | Algoritmo |
|------------|-----------|
| Password hash | PBKDF2-SHA512, 600 000 iterazioni |
| Salt | 32 byte crypto random |
| Session token | 96 caratteri hex (48 byte random) |
| CSRF token | HMAC-SHA256(session_token, secret) |

### Endpoint auth

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/auth/login` | POST | `{username, password}` → set-cookie session |
| `/api/auth/logout` | POST | Invalida sessione |
| `/api/auth/check` | GET | Verifica sessione + refresh CSRF |

### Sessioni

- Stored in tabella `sessioni` (SQLite)
- Scadenza configurabile (default 8h)
- Cleanup periodico (timer in init.js)
- Single-session per utente (login invalida sessioni precedenti)

---

## Database

### Tabelle

| Tabella | Colonne principali |
|---------|--------------------|
| `utenti` | id, username, password_hash, salt, iterations, role, created_at |
| `sessioni` | token, user_id, expires_at, valid, created_at |
| `audit_log` | id, action, username, ip, method, path, outcome, details, ts |

### Constraint ruoli

```sql
CHECK(role IN ('admin','medico','specializzando','biologo','infermiere','readonly'))
```

### Seed iniziale

Al primo avvio, se non esistono utenti, viene creato: `admin` / `admin` (ruolo admin).

---

## Engine Loader

Il file `lib/engine-loader.js` carica i file JavaScript browser (IIFE) all'interno di una **VM sandbox Node.js**, creando un ambiente minimo che simula il browser:

```js
const sandbox = {
  window: {},
  document: { createElement: () => ({}), addEventListener: () => {} },
  CustomEvent: class CustomEvent {},
  setTimeout, setInterval, clearTimeout, clearInterval,
  console
};
```

### Engine caricati

| Globale sandbox | File sorgente |
|-----------------|---------------|
| `LumiaAPI` | `app/core/lumia-api.js` |
| `LumiaScores` | `app/core/lumia-scores.js` |
| `CDBLPDData` | `app/diagnostics/cd-b-lpd-data.js` |
| `CDBLPDCore` | `app/diagnostics/cd-b-lpd-core.js` |
| `CLLTherapyCore` | `app/diseases/cll/cll-therapy-core.js` |
| `DLBCLTherapyCore` | `app/diseases/dlbcl/dlbcl-therapy-core.js` |
| `FLTherapyCore` | `app/diseases/fl/fl-therapy-core.js` |
| `MCLTherapyCore` | `app/diseases/mcl/mcl-therapy-core.js` |

**Zero modifiche ai file sorgente browser** — gli stessi file funzionano sia nel browser che nel server.

---

## API REST

### System

| Endpoint | Metodo | Auth | Descrizione |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Uptime, engine status |
| `/api/config` | GET | Sì | Configurazione app |
| `/api/log` | GET | Sì | Ring buffer ultimi 500 log |
| `/api/catalog` | GET | Sì | Elenco endpoint disponibili |

### Diagnostica

| Endpoint | Metodo | Auth | Descrizione |
|----------|--------|------|-------------|
| `/api/diagnostic/b-lpd` | GET | Sì | Metadata (markers, states, diseases) |
| `/api/diagnostic/b-lpd` | POST | Sì | `{selections}` → compute risultati |

### Score

| Endpoint | Metodo | Auth | Descrizione |
|----------|--------|------|-------------|
| `/api/scores` | GET | Sì | Lista calcolatori disponibili |
| `/api/scores/:key` | GET | Sì | Metadata calcolatore |
| `/api/scores/:key` | POST | Sì | `{params}` → `{score, risk, detail}` |

### Terapia

| Endpoint | Metodo | Auth | Descrizione |
|----------|--------|------|-------------|
| `/api/therapy` | GET | Sì | Lista engine disponibili |
| `/api/therapy/:key` | GET | Sì | Metadata engine |
| `/api/therapy/:key` | POST | Sì | `{state}` → raccomandazioni |

### Admin

| Endpoint | Metodo | Auth | Ruolo | Descrizione |
|----------|--------|------|-------|-------------|
| `/api/admin/users` | GET | Sì | admin | Lista utenti |
| `/api/admin/users` | POST | Sì | admin | Crea utente |
| `/api/admin/users/:id` | PUT | Sì | admin | Modifica utente |
| `/api/admin/users/:id/password` | PUT | Sì | admin | Reset password |
| `/api/admin/users/:id` | DELETE | Sì | admin | Elimina utente |
| `/api/admin/audit` | GET | Sì | admin | Log audit |

---

## Security headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Resource-Policy: same-origin
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  font-src 'self' https://cdn.hugeicons.com https://cdn.jsdelivr.net;
  connect-src 'self' ws://... https://cdn.hugeicons.com https://cdn.jsdelivr.net;
  img-src 'self' data:
```

## WebSocket

- Endpoint: `ws://HOST:PORT/ws/log`
- Protocollo: raw JSON messages
- Contenuto: `{timestamp, method, path, status, duration}`
- Usato dal modulo docs per il monitor API in tempo reale

## Note

- **Zero framework**: nessun Express, Koa, Fastify — server HTTP puro Node.js
- **Dual auth**: browser (cookie session) + API client (X-API-Key header)
- **Rate limiting**: 100 richieste/minuto per IP (sliding window)
- **Audit trail**: ogni azione admin viene loggata con IP, utente, esito
- **Cache-Control: no-cache** per sviluppo
