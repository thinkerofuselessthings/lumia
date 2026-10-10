# 03 — Server: Middleware (security, CORS, sessione, CSRF, rate-limit)

I middleware sono in `src/middleware/`. Non c'è una catena formale "tipo Express": vengono richiamati in punti precisi del dispatcher (`src/http/request-handler.js`) e dell'`enforceAuth` di `auth-gate.js`.

## 1. `security-headers.js`

### `applySecurityHeaders(res)` — applicato su ogni risposta

| Header | Valore |
|--------|--------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-XSS-Protection` | `0` (deprecato — disabilitazione esplicita) |
| `Cross-Origin-Resource-Policy` | `same-origin` |

### `applyCsp(res)` — solo su risposte HTML

Content-Security-Policy:

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://d3js.org`
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.hugeicons.com`
- `font-src 'self' https://fonts.gstatic.com https://*.hugeicons.com`
- `connect-src 'self' ws: https://*.hugeicons.com https://cdn.jsdelivr.net`
- `img-src 'self' data:`
- `frame-ancestors 'none'`

`'unsafe-inline'` è presente per supportare il pattern attuale dei moduli LUMIA (script/style inline nei singoli moduli). Da rimuovere quando i moduli passeranno a bundle con nonce.

### `applyCacheControl(res, type)`

| `type` | Header `Cache-Control` |
|--------|------------------------|
| `"api"` | `no-store` |
| `"html"` | `no-cache` |
| `"static"` | `no-cache` |

> Anche gli statici sono `no-cache` per facilitare il refresh in fase di sviluppo. Per produzione su LAN/intranet può essere desiderabile passare a `public, max-age=...` per `.css/.js/.woff2`.

## 2. `cors.js`

Whitelist molto ristretta:

- `Origin` ammessi: `http://${LUMIA_HOST}:${LUMIA_PORT}` **e** `http://localhost:${LUMIA_PORT}` (quest'ultimo solo se `NODE_ENV !== "production"` — V3.M1.A18).
- Risposta:
  - `Access-Control-Allow-Origin`: echo dell'`Origin` se in whitelist,
  - `Access-Control-Allow-Credentials: true`,
  - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`,
  - `Access-Control-Allow-Headers: Content-Type, X-API-Key, X-CSRF-Token`.
- `OPTIONS` di preflight → `204 No Content` (o `403` se origin non in whitelist) e termina la richiesta.

> Per esporre il server ad altri host serve aggiungere l'origin alla whitelist (oggi: solo modificando `cors.js`). Il design intenzionale è "loopback only".

## 3. `cookies.js`

```js
parseCookies(headerValue) → { [name]: value, ... }

setSessionCookie(res, token, opts = {})
  // Set-Cookie: session=<token>; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400
  // + Secure se SECURE_COOKIE=true (default true in NODE_ENV=production — V3.M1.A20)

clearSessionCookie(res)
  // Set-Cookie: session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0
```

`Max-Age` letto da `SESSION_MAX_AGE` (default 86400 s = 24 h).

## 4. `csrf.js`

Strategia: token CSRF **derivato** (no storage) dal token di sessione.

```
csrf_token = HMAC-SHA256(CSRF_SECRET, session_token)  // 64 hex (V3.M1.A19)
```

Dove `CSRF_SECRET` viene risolto in cascata:

1. `process.env.CSRF_SECRET`,
2. file `data/.csrf_secret` (se esiste, viene letto),
3. altrimenti viene **generato** una volta (`crypto.randomBytes(32).toString("hex")`) e **persistito** in `data/.csrf_secret`.

Vantaggi di questo approccio: nessuna tabella CSRF, ma legame **deterministico** col session token. La rotazione del CSRF avviene quando la sessione viene rigenerata (login).

## 5. `rate-limiter.js`

Factory:

```js
createLimiter({ maxAttempts, windowMs }) → { check(key), record(key), reset(key) }
```

- Storage in `Map` per istanza.
- Cleanup periodico (`setInterval` ogni 10 min, `.unref()`) elimina chiavi scadute.
- `check(key)` → `false` se la chiave ha già `>= maxAttempts` nella finestra; `true` altrimenti.
- `record(key)` → incrementa il contatore; il primo `record` fissa l'istante di scadenza della finestra.

Due limiter pronti:

| Nome | Default | Variabili env |
|------|---------|---------------|
| `apiLimiter` | 200 richieste / 60 s per IP | `API_RATE_LIMIT`, `API_RATE_WINDOW` |
| `loginLimiter` | 5 tentativi / 15 min per IP | `LOGIN_RATE_LIMIT`, `LOGIN_RATE_WINDOW` |

`apiLimiter` è applicato dal dispatcher API. `loginLimiter` è applicato esplicitamente dall'handler `POST /api/auth/login`.

## 6. `auth-gate.js` — `enforceAuth(req, match, method, apiPath)`

Pipeline:

1. Se `match.auth === false` → ritorna `{ session: null }` senza ulteriori controlli.
2. **X-API-Key first** (auth stateless per client esterni):
   - Se l'header `X-API-Key` è presente:
     - confronto con `env("LUMIA_API_KEY", file.apiKey)` (file = `lumia.config.json`),
     - match → `{ session: null }`,
     - mismatch → `throw AppError.from("AUTH_API_KEY_INVALID")`.
3. **Cookie session** (browser):
   - `parseCookies(req.headers.cookie).session` → token,
   - `getSessionByToken(token)` (vedi `04-server-auth.md`),
   - `null` → `logAudit("auth.denied", ...)` e `throw AUTH_REQUIRED`.
4. **CSRF** (solo per metodi state-changing `POST`, `PUT`, `PATCH`, `DELETE` — V3.M1.A3):
   - confronto `req.headers["x-csrf-token"]` con `deriveCsrfToken(token)`,
   - mismatch → `logAudit("csrf.failure", ...)` e `throw AUTH_CSRF_INVALID`.
5. **Role check** (se la route definisce `role`):
   - `session.ruolo !== match.role` → `logAudit("auth.denied", ..., { required_role })` e `throw AUTH_ROLE_DENIED`.
6. Ritorna `{ session }`.

> `PATCH` non è incluso fra i metodi soggetti a CSRF nel codice attuale: l'agenda usa `PATCH` per `move`, `reorder`, `status`, `promote`. Da valutare se aggiungerlo per coerenza.

## 7. Mappa "chi chiama chi"

```
request-handler.js
  ├─ applySecurityHeaders          (security-headers.js)
  ├─ applyCors                     (cors.js)
  ├─ applyCacheControl             (security-headers.js)
  ├─ parseBody                     (body-parser.js)
  └─ handleApiRequest              (routes.js)
        ├─ apiLimiter.check/record (rate-limiter.js)
        ├─ router.match            (router.js)
        ├─ enforceAuth             (auth-gate.js)
        │     ├─ parseCookies      (cookies.js)
        │     ├─ getSessionByToken (app/auth/sessions.js)
        │     ├─ deriveCsrfToken   (csrf.js)
        │     └─ logAudit          (db/audit.js)
        └─ handler(ctx)            (route handler)
```
