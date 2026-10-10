# 06 — Server: Modello errori

## 1. `AppError` — `src/errors/app-error.js`

```js
class AppError extends Error {
  constructor(code, message, status, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }
  static from(code, details) { /* lookup nel catalogo + costruisce */ }
}
```

Pattern d'uso:

```js
if (!input.username) throw AppError.from("VALIDATION_REQUIRED", { field: "username" });
```

`AppError.from(code)` cerca `code` in `src/errors/codes.js`; se non lo trova, fallback `INTERNAL`.

## 2. Catalogo codici — `src/errors/codes.js`

| Codice | Status | Messaggio |
|--------|--------|-----------|
| `AUTH_REQUIRED` | 401 | Autenticazione richiesta |
| `AUTH_INVALID_CREDENTIALS` | 401 | Credenziali non valide |
| `AUTH_USER_DISABLED` | 403 | Utente disabilitato |
| `AUTH_CSRF_INVALID` | 403 | Token CSRF non valido |
| `AUTH_ROLE_DENIED` | 403 | Accesso non autorizzato per questo ruolo |
| `AUTH_SESSION_EXPIRED` | 401 | Sessione scaduta |
| `AUTH_API_KEY_INVALID` | 401 | API Key non valida |
| `RATE_LIMIT_LOGIN` | 429 | Troppi tentativi di accesso |
| `RATE_LIMIT_API` | 429 | Troppe richieste |
| `VALIDATION_REQUIRED` | 400 | Campo obbligatorio mancante |
| `VALIDATION_INVALID` | 400 | Valore non valido |
| `VALIDATION_UNIQUE` | 409 | Valore già esistente (duplicato) |
| `VALIDATION_PASSWORD_WEAK` | 400 | Password troppo debole (min 8 caratteri) |
| `NOT_FOUND` | 404 | Risorsa non trovata |
| `NOT_FOUND_ROUTE` | 404 | Endpoint non trovato |
| `ENGINE_UNAVAILABLE` | 503 | Engine non caricato |
| `ENGINE_INVALID_INPUT` | 400 | Input non valido per l'engine |
| `ENGINE_COMPUTE_ERROR` | 500 | Errore durante il calcolo |
| `MODULE_NOT_FOUND` | 404 | Modulo non trovato |
| `BODY_TOO_LARGE` | 413 | Payload troppo grande |
| `BODY_INVALID_JSON` | 400 | JSON non valido |
| `BODY_TIMEOUT` | 408 | Timeout ricezione dati |
| `METHOD_NOT_ALLOWED` | 405 | Metodo non consentito |
| `FORBIDDEN` | 403 | Accesso vietato |
| `INTERNAL` | 500 | Errore interno del server |
| `DB_ERROR` | 500 | Errore database |

> Aggiungere un nuovo codice = una sola riga in `codes.js`. Non serve toccare l'handler.

## 3. `handleError(err, res)` — `src/errors/handle.js`

Singolo punto di traduzione errore → risposta HTTP:

```js
function handleError(err, res) {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    console.error(`[${err.code}] ${err.message}`, err.details || "");
    res.writeHead(err.status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({
      ok: false,
      error: { code: err.code, message: err.message, details: err.details }
    }));
    return;
  }

  console.error("[FATAL]", err);
  res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({
    ok: false,
    error: { code: "INTERNAL", message: "Errore interno del server" }
  }));
}
```

Note:

- gli errori **non `AppError`** vengono loggati come `[FATAL]` e **mai** restituiti al client (no information disclosure),
- `details` è opzionale e può contenere informazioni strutturate (campo invalido, valori ammessi, ecc.) — il client le usa per messaggi UX più precisi,
- `headersSent` guard evita doppia scrittura su `res`.

## 4. Contratto risposte API

### Successo

```json
{ "ok": true, "...payload-specifico-della-route..." }
```

### Errore

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_REQUIRED",
    "message": "Campo obbligatorio mancante",
    "details": { "field": "username" }
  }
}
```

Codice HTTP coincide con `error.status` del catalogo.

## 5. Dove si lanciano gli errori

| Codice tipico | Dove |
|---------------|------|
| `RATE_LIMIT_API` | `handleApiRequest` (prima del routing) |
| `NOT_FOUND_ROUTE` | `notFound(res)` chiamato dal dispatcher |
| `AUTH_*` | `enforceAuth` (`auth-gate.js`) |
| `BODY_*` | `parseBody` (`body-parser.js`) |
| `VALIDATION_*` | handler delle route (auth, admin, agenda controllers) |
| `ENGINE_*` | route `diagnostic`, `scores`, `therapy` in `src/routes.js` |
| `NOT_FOUND` | controller agenda + route therapy/scores |
| `INTERNAL` | fallback per errori non `AppError` |
