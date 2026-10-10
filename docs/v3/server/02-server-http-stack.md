# 02 — Server: HTTP Stack

## 1. `src/server.js` — factory

Espone `createServer()` che:

- chiama `http.createServer(requestHandler)` (`requestHandler` importato da `src/http/request-handler.js`),
- legge da env: `LUMIA_PORT` (default `3500`), `LUMIA_HOST` (default `127.0.0.1`),
- imposta i tunable: `headersTimeout=20000`, `requestTimeout=30000`, `timeout=120000`, `keepAliveTimeout=5000`,
- ritorna `{ server, PORT, HOST }`.

Non esegue `listen` — quello è compito di `src/init.js`.

## 2. `src/http/request-handler.js` — dispatcher

Un'unica funzione esportata. Catena, in ordine fisso:

1. **`applySecurityHeaders(res)`** — su **ogni** risposta.
2. **`applyCors(req, res)`** — gestisce origini permesse e termina con `204`/`403` se è una `OPTIONS` di preflight.
3. **Logging**: registra `start = Date.now()` e wrappa `res.end` per `console.log` finale con `method`, `url`, `statusCode`, `durationMs`.
4. **Routing**:
   - se `req.url.startsWith("/api/")`:
     - `applyCacheControl(res, "api")` → `Cache-Control: no-store`,
     - `await parseBody(req)`,
     - `handleApiRequest(req, res, body)`,
     - `catch (err) → handleError(err, res)`;
   - altrimenti `serveStatic(req, res)`.

## 3. `src/http/router.js` — mini-Router

Implementazione minimale (zero dipendenze):

```js
class Router {
  add(method, pattern, handler, opts = {})
  get/post/put/patch/delete/all(pattern, handler, opts)
  match(method, path) → { handler, params, auth, role } | null
}
```

- `:param` nel pattern viene compilato a regex `([^/]+)`. Supporta più parametri.
- `opts` di default: `{ auth: true, role: null }`. Le route pubbliche devono passare `{ auth: false }` esplicitamente.
- `all` registra un handler valido per qualunque metodo HTTP.
- I path montati partono **senza** `/api/` (stripped da `handleApiRequest`).

## 4. `src/http/request-handler.js`/`src/routes.js` — `handleApiRequest`

Definito in `src/routes.js`. Pseudocodice:

```js
function handleApiRequest(req, res, body) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const apiPath = url.pathname.replace("/api/", "");
  const ip = req.socket.remoteAddress;

  if (!apiLimiter.check(ip)) throw AppError.from("RATE_LIMIT_API");

  const match = router.match(req.method, apiPath);
  if (!match) return notFound(res);                  // → NOT_FOUND_ROUTE

  apiLimiter.record(ip);
  const { session } = enforceAuth(req, match, req.method, apiPath);

  const ctx = { req, res, body, params: match.params, query: url.searchParams,
                session, ip, userAgent: req.headers["user-agent"] };
  return match.handler(ctx);
}
```

> Il limiter è chiamato **due volte**: `check()` prima del routing (rifiuta subito), `record()` dopo il match (conta solo richieste valide). Questo evita che 404 brucino quota.

## 5. `src/http/body-parser.js`

- `GET`, `DELETE`, `HEAD` → ritorna `null` (mai parsing).
- Limite hard: `MAX_BODY_SIZE = env("MAX_BODY_SIZE", 1 MB)`. Eccesso → `AppError.from("BODY_TOO_LARGE")`.
- Timeout: `BODY_PARSE_TIMEOUT = env("BODY_PARSE_TIMEOUT", 10 s)`. Eccesso → `AppError.from("BODY_TIMEOUT")`.
- Parsing: `JSON.parse`. Se fallisce → `AppError.from("BODY_INVALID_JSON")`.
- Body vuoto → `null`.

## 6. `src/http/response.js`

Tre helper minimali:

```js
json(res, data, status = 200)        // imposta Content-Type, scrive JSON.stringify(data)
error(res, message, status = 500)    // wrapper per errori non-AppError
notFound(res)                        // throw AppError.from("NOT_FOUND_ROUTE") via handleError
```

Tutte le risposte API hanno la forma `{ ok: true, … }` (successo) oppure `{ ok: false, error: { code, message, details } }` (errore — vedi `06-server-errors.md`).

## 7. `src/http/static.js` — file server statico

Comportamento:

- **Routing speciale per `/` e `/index.html`**:
  - legge il cookie `session`,
  - se manca o non valido → riscrive `urlPath = "/public/login.html"`,
  - altrimenti → `urlPath = "/index.html"`.
- **Alias**: `/login.html` e `/login` → `/public/login.html`.
- **Path-traversal guard**: `path.resolve(ROOT_DIR, urlPath)` deve iniziare per `ROOT_DIR + path.sep` o coincidere con `ROOT_DIR`. Altrimenti `403 Forbidden`.
- **Directory**: se il path risolto è una directory, prova `index.html` al suo interno.
- **Errori filesystem**: `ENOENT` → `404 Not Found`, altri → `500 Internal Server Error` (text/plain, **non** payload JSON: questo è statico, non API).
- **Headers**:
  - file `.html` → `applyCsp(res)` + `applyCacheControl(res, "html")` (`Cache-Control: no-cache`),
  - altri → `applyCacheControl(res, "static")`.

### MIME map

```
.html → text/html; charset=utf-8
.css  → text/css; charset=utf-8
.js   → application/javascript; charset=utf-8
.json → application/json; charset=utf-8
.svg  → image/svg+xml
.png .jpg .jpeg .gif .ico .webp → image/<…>
.woff2 .woff .ttf .otf → font/<…>
.pdf  → application/pdf
.txt  → text/plain; charset=utf-8
default → application/octet-stream
```

## 8. Convenzioni di context (`ctx`)

Ogni handler montato sul Router riceve un singolo oggetto `ctx`:

```ts
interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  body: any | null;            // JSON parsato (null per GET/DELETE/HEAD)
  params: Record<string,string>; // dai :param della route
  query: URLSearchParams;
  session: SessionRow | null;  // null se route con auth:false o se autenticazione via X-API-Key
  ip: string;
  userAgent: string;
}
```

L'handler:

- ritorna l'esito di `json(res, payload)` (non c'è middleware "next").
- per errori applicativi **fa `throw new AppError(...)`** (intercettato da `handleError`).
- non deve toccare `res.statusCode` direttamente: usare gli helper.
