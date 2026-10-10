# 01 — Server: Overview

## 1. Posizionamento

Il server LUMIA è un'unica implementazione, contenuta in `src/`. Entry-point: `src/init.js` (avviato da `npm start`).

> Nota storica: nelle prime versioni esisteva anche una cartella `server/` (stack legacy http+ws con autenticazione `X-API-Key`). È stata **rimossa nella fase V3** perché non più referenziata da nessuna parte del codice.

## 2. Stack

- **Runtime**: Node.js (≥ 18, per `crypto.randomBytes`/`pbkdf2Sync` ed `URL` globale).
- **Web framework**: nessuno. Solo moduli built-in (`http`, `fs`, `path`, `url`, `crypto`, `vm`).
- **DB**: SQLite via [`sql.js`](https://github.com/sql-js/sql.js) (WebAssembly, zero moduli nativi). Wrapper compatibile `better-sqlite3` in `src/lib/sqlite-wrapper.js`.
- **Engine loader**: `vm.runInContext` con sandbox `window`/`document` minimale per riutilizzare i `*-core.js` browser lato server (`src/lib/engine-loader.js`).
- **Dipendenze npm**: una sola — `sql.js`. Nessun framework HTTP, nessun ORM, nessuna libreria di sessione.

## 3. Architettura a strati

```
                    ┌────────────────────────────┐
                    │  src/init.js  (bootstrap)  │
                    └─────────────┬──────────────┘
                                  │
                ┌─────────────────┴────────────────┐
                │      src/server.js (factory)     │
                │   http.createServer(handler)     │
                └─────────────────┬────────────────┘
                                  │
                ┌─────────────────┴────────────────┐
                │ src/http/request-handler.js      │
                │  ─ security-headers              │
                │  ─ CORS                          │
                │  ─ /api/* → API pipeline         │
                │  ─ else   → static file server   │
                └────┬─────────────────────────┬───┘
                     │                         │
            ┌────────▼─────────┐    ┌──────────▼──────────┐
            │  src/routes.js   │    │  src/http/static.js │
            │  Router + match  │    │  MIME + auth-aware  │
            └────────┬─────────┘    └─────────────────────┘
                     │
       ┌─────────────┴─────────────┐
       │   middleware (in ordine): │
       │   ─ rate-limiter          │
       │   ─ auth-gate (session/   │
       │       API-key + CSRF +    │
       │       role)               │
       └─────────────┬─────────────┘
                     │
                ┌────▼────┐
                │ handler │   (registrato dai sotto-router:
                └────┬────┘    auth, admin, agenda, system,
                     │         diagnostic, scores, therapy)
                     │
                ┌────▼────────────────────────────┐
                │ src/db/instance + sql.js wrapper│
                │ src/lib/engine-loader.js        │
                └─────────────────────────────────┘
```

## 4. Sequenza di bootstrap

Definita in `src/init.js`:

1. **Carica `.env`** (`loadEnv()` da `src/config/env.js` — parser homemade, **nessuna dipendenza `dotenv`**).
2. **`await initDatabase()`** (`src/db/connection.js`):
   - `mkdir -p` della cartella di `DB_PATH`,
   - `await initSqlite()` (warm-up del WASM),
   - istanzia `new Database(DB_PATH)`,
   - `PRAGMA foreign_keys = ON`,
   - `beginBatch()` → `createTables()` (DDL di `utenti`, `sessioni`, `audit_log`) → `endBatch()`.
3. **`initAgendaDb()`** (`app/agenda/db.js`):
   - apre **un secondo file SQLite** in `data/agenda.db` (DB separato),
   - pragma WAL + foreign_keys + synchronous=NORMAL,
   - crea schema (12 tabelle, indici, trigger),
   - esegue migrazioni idempotenti (`birth_date`, drop `patients`),
   - seed di nodi e prestazioni se vuoto.
4. **`seedAdminUser()`** (`app/auth/seed.js`): se la tabella `utenti` non contiene un admin, lo crea con password da `ADMIN_PASSWORD` o random `crypto.randomBytes(16).toString("hex")`. Imposta `forza_cambio_password = 1`.
5. **`loadEngines()`** (`src/lib/engine-loader.js`): crea sandbox `vm`, carica i file browser `app/core/lumia-api.js`, `lumia-events.js`, `lumia-scores.js`, `app/diagnostics/cd-b-lpd-data.js`, `cd-b-lpd-core.js` e i therapy core (`cll`, `dlbcl`, `fl`, `mcl`) se presenti, estrae i namespace `LumiaAPI`, `LumiaScores`, `CDBLPDCore`, `CLLTherapyCore`, ecc.
6. **`setEngines(engines)`**: deposita gli engine nel modulo `src/routes.js`.
7. **`createServer()`** + `server.listen(PORT, HOST, …)`.
8. **`setInterval(cleanupSessions, 15 min)`** con `.unref()` per non tenere vivo il loop.
9. Handler **SIGINT/SIGTERM** per shutdown graceful:
   - `UPDATE sessioni SET valida = 0 WHERE valida = 1`,
   - `db.close()`,
   - `clearInterval(cleanupTimer)`,
   - `server.close()`,
   - fallback `setTimeout(() => process.exit(1), 3000)` per sblocco forzato.

## 5. Parametri del processo HTTP (`src/server.js`)

| Tunable | Default | Variabile env |
|---------|---------|---------------|
| Host di binding | `127.0.0.1` | `LUMIA_HOST` |
| Porta | `3500` | `LUMIA_PORT` |
| `headersTimeout` | 20 s | `HEADERS_TIMEOUT` |
| `requestTimeout` | 30 s | `REQUEST_TIMEOUT` |
| `socket.timeout` | 120 s | `SOCKET_TIMEOUT` |
| `keepAliveTimeout` | 5 s | `KEEP_ALIVE_TIMEOUT` |

> Binding di default su `127.0.0.1` (loopback) per esposizione esplicitamente locale; per esporre in LAN serve `LUMIA_HOST=0.0.0.0`.

## 6. Ciclo di vita di una richiesta `/api/*`

```
HTTP req
  │
  ├─ applySecurityHeaders(res)                   (X-Frame DENY, nosniff, referrer no-referrer, …)
  ├─ applyCors(req, res)                          (echo origin se whitelist; OPTIONS → 204/403)
  │
  ├─ se OPTIONS → end (preflight)
  ├─ se /api/* :
  │     ├─ applyCacheControl(res, "api")          (Cache-Control: no-store)
  │     ├─ parseBody(req)                          (JSON, max 1 MB, timeout 10 s)
  │     ├─ handleApiRequest(req, res, body)
  │     │     ├─ apiLimiter.check(ip)              (200/60s default)
  │     │     ├─ router.match(method, path)        (mini-router :param)
  │     │     ├─ apiLimiter.record(ip)
  │     │     ├─ enforceAuth(req, match, …)        (X-API-Key | cookie session + CSRF + role)
  │     │     ├─ handler(ctx)                      (handler della route)
  │     │     └─ catch → handleError(err, res)     (AppError → JSON tipizzato)
  │     └─ end
  │
  └─ else → serveStatic(req, res)                  (MIME + path-traversal guard + auth-aware redirect su `/`)
```

Tutte le richieste vengono loggate sulla console al momento di `res.end`, con metodo, URL, status e durata in ms.

## 7. Mappa cartelle del server attivo

```
src/
├── init.js                # bootstrap (4)
├── server.js              # http.createServer + tunables
├── routes.js              # Router + system endpoints + scores + diagnostic + therapy
├── config/
│   └── env.js             # parser .env homemade + getter env()
├── db/
│   ├── instance.js        # DB_PATH + getDb/_setDb
│   ├── connection.js      # initDatabase + DDL bootstrap
│   ├── schema.js          # DDL utenti/sessioni/audit_log
│   └── audit.js           # logAudit + pruneAuditLogs
├── http/
│   ├── router.js          # mini-Router con :param
│   ├── request-handler.js # dispatcher top-level
│   ├── body-parser.js     # JSON parser con limit + timeout
│   ├── response.js        # json/error/notFound helpers
│   └── static.js          # static file server (MIME + auth-aware)
├── middleware/
│   ├── auth.js            # barrel: csrf + cookies
│   ├── csrf.js            # CSRF_SECRET + deriveCsrfToken
│   ├── cookies.js         # parseCookies + set/clearSessionCookie
│   ├── cors.js            # whitelist host:port loopback
│   ├── security-headers.js# CSP + cache-control + headers
│   ├── rate-limiter.js    # createLimiter + apiLimiter + loginLimiter
│   └── auth-gate.js       # enforceAuth (session/API-key/CSRF/role)
├── errors/
│   ├── codes.js           # catalogo codici → {status, message}
│   ├── app-error.js       # AppError class + factory
│   └── handle.js          # handleError (AppError → JSON)
└── lib/
    ├── sqlite-wrapper.js  # wrapper sql.js compatibile better-sqlite3
    └── engine-loader.js   # vm sandbox + caricamento *-core.js browser
```

E i moduli applicativi montati dal router:

```
app/
├── auth/
│   ├── routes.js          # /api/auth/{check-user,login,logout,check,verify-password}
│   ├── seed.js            # seedAdminUser
│   ├── db.js              # barrel password+sessions+seed
│   ├── password.js        # PBKDF2-SHA512 600k iter + rehash
│   └── sessions.js        # createSession/getSessionByToken/cleanup
├── admin/
│   ├── routes.js          # /api/admin/utenti CRUD + audit-logs (role:admin)
│   └── users.js           # business logic utenti
└── agenda/
    ├── routes.js          # /api/agenda/* (~40 endpoint)
    ├── db.js              # secondo DB SQLite (data/agenda.db)
    ├── controllers/       # 13 controller
    ├── models/            # 11 model
    └── utils/
        ├── cerus-client.js# proxy verso Cerus (anagrafica pazienti)
        ├── response.js
        └── validate.js
```
