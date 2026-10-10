# 04 — Server: Autenticazione

## 1. Modello concettuale

LUMIA supporta **due meccanismi di autenticazione** mutuamente esclusivi per richiesta:

| Meccanismo | Per chi | Stato | CSRF |
|------------|---------|-------|------|
| **Cookie `session`** | browser | sessione su DB (`sessioni`) | richiesto su POST/PUT/DELETE |
| **Header `X-API-Key`** | client esterni / script | stateless | non applicabile |

`enforceAuth` (`src/middleware/auth-gate.js`) prova prima `X-API-Key` se presente, altrimenti il cookie.

## 2. Hashing password — `app/auth/password.js`

- Algoritmo: **PBKDF2-SHA512**.
- Iterazioni: `PBKDF2_ITERATIONS = env("PBKDF2_ITERATIONS", 600000)` (raccomandazione OWASP 2024).
- Iterazioni legacy supportate per migrazione: `100000`.
- Salt: `crypto.randomBytes(32).toString("hex")` (256 bit).
- Output: `pbkdf2Sync(pwd, salt, iter, 64, "sha512")` → 512 bit.
- Verifica: `crypto.timingSafeEqual` per evitare timing attack.

```js
hashPassword(password)            → { hash, salt, iterations }
verifyPassword(pwd, hash, salt, iterations)
rehashIfNeeded(userId, password, currentIterations)
```

`rehashIfNeeded` è chiamata **dopo** un login riuscito: se le iterazioni del record sono sotto la soglia corrente, il record viene aggiornato in modo trasparente con il nuovo hash a 600 k.

## 3. Sessioni — `app/auth/sessions.js`

### Token

- 96 char hex = `crypto.randomBytes(48)`.
- Persistito in `sessioni.token` con `UNIQUE`.

### `createSession(utenteId, ip, userAgent)`

1. Invalida tutte le sessioni precedenti dello stesso utente:
   `UPDATE sessioni SET valida = 0 WHERE utente_id = ? AND valida = 1` (single-session per utente).
2. Genera token, calcola `expires_at = now + 24h`.
3. `INSERT INTO sessioni (utente_id, token, ip, user_agent, ultimo_accesso, scade_il)`.
4. Ritorna `{ token, expires_at }`.

### `getSessionByToken(token, opts?)`

Logica:

```sql
SELECT s.*, u.username, u.nome, u.cognome, u.ruolo, u.email, u.attivo AS utente_attivo
FROM sessioni s JOIN utenti u ON u.id = s.utente_id
WHERE s.token = ? AND s.valida = 1 AND s.scade_il > now
```

Quindi controlli aggiuntivi:

- `utente_attivo === 0` → `null` (utente disabilitato).
- **Idle timeout**: se `now - ultimo_accesso > SESSION_IDLE_TIMEOUT` (default 1 h):
  - `UPDATE sessioni SET valida = 0 WHERE id = ?`,
  - return `null`.
- **Touch**: se `!opts.skipTouch`, aggiorna `ultimo_accesso = now`. La heartbeat `GET /api/auth/check` usa `skipTouch: true` per non resettare il timer di idleness.

### `cleanupSessions()`

Eseguito ogni 15 min (timer in `src/init.js`). Invalida sessioni con `scade_il < now` e/o oltre la soglia di idle.

### `invalidateSession(token)`

`UPDATE sessioni SET valida = 0 WHERE token = ?`. Chiamata da `POST /api/auth/logout`.

## 4. Schema utenti (DDL)

Vedi `src/db/schema.js`:

```sql
CREATE TABLE IF NOT EXISTS utenti (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  username                 TEXT NOT NULL UNIQUE,
  password_hash            TEXT NOT NULL,
  salt                     TEXT NOT NULL,
  iterations               INTEGER NOT NULL DEFAULT 600000,
  nome                     TEXT,
  cognome                  TEXT,
  ruolo                    TEXT NOT NULL CHECK(ruolo IN
                            ('admin','medico','infermiere','tecnico','amministrativo')),
  email                    TEXT,
  attivo                   INTEGER NOT NULL DEFAULT 1,
  forza_cambio_password    INTEGER NOT NULL DEFAULT 0,
  -- V3.M2.A6: lockout per account (migrazione idempotente)
  tentativi_falliti        INTEGER NOT NULL DEFAULT 0,
  bloccato_fino_il         TEXT,
  creato_il                TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  aggiornato_il            TEXT
);
```

## 5. Schema sessioni (DDL)

```sql
CREATE TABLE IF NOT EXISTS sessioni (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  utente_id       INTEGER NOT NULL REFERENCES utenti(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  valida          INTEGER NOT NULL DEFAULT 1,
  ip              TEXT,
  user_agent      TEXT,
  ultimo_accesso  TEXT,
  scade_il        TEXT NOT NULL,
  creato_il       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

## 6. Seeding admin — `app/auth/seed.js`

All'avvio del server, se la tabella `utenti` non contiene `WHERE ruolo='admin'`:

1. Password = `env("ADMIN_PASSWORD")` se definita, altrimenti `crypto.randomBytes(16).toString("hex")` (32 char).
2. `hashPassword(password)` → `INSERT INTO utenti(...) VALUES(..., 'admin', forza_cambio_password=1)`.
3. Logga sulla console **una volta sola** la password mascherata (primi 4 e ultimi 4 caratteri) — utile in dev.

## 7. Endpoint `/api/auth/*` — `app/auth/routes.js`

Tutti registrati come `auth/:action` (rotta principale) + due rotte dedicate per la gestione sessioni multiple.

| Metodo | Path | Body | Auth | CSRF | Risposta |
|--------|------|------|------|------|----------|
| `POST` | `/api/auth/check-user` | `{ username }` | no | no | `{ ok, exists: true }` **costante** (V3.M1.A22) |
| `POST` | `/api/auth/login` | `{ username, password }` | no | no | `{ ok, csrf_token, expires_at, must_change_password, user }` + `Set-Cookie: session=...` (V3.M2.A5/A6) |
| `POST` | `/api/auth/logout` | — | no (legge cookie) | no | `{ ok }` + clear cookie |
| `GET`  | `/api/auth/check` | — | sì (cookie) | no | `{ ok, authenticated, csrf_token, idle_remaining, must_change_password, user }` |
| `POST` | `/api/auth/verify-password` | `{ password }` | sì + CSRF | sì | `{ ok, valid }` |
| `POST` | `/api/auth/change-password` | `{ old_password, new_password }` | sì + CSRF | sì | `{ ok, revoked_other_sessions: N }` (V3.M2.A5) |
| `GET`  | `/api/auth/sessions` | — | sì | no | `{ ok, sessions: [{ id, ip, user_agent, ultimo_accesso, scade_il, is_current }], max }` (V3.M2.A7) |
| `DELETE` | `/api/auth/sessions/:id` | — | sì + CSRF | sì | `{ ok, revoked }` (V3.M2.A7) |

Note:

- `login` consuma `loginLimiter.check/record` per IP (default 5 tentativi/15 min) e applica anche **lockout per account** (V3.M2.A6, default 5 fallimenti consecutivi → blocco 15 min). Errore: `AUTH_ACCOUNT_LOCKED` (HTTP 423).
- `login` chiama `rehashIfNeeded` e `resetLoginFailures` su success.
- `change-password` invalida tutte le **altre** sessioni dello stesso utente (la corrente resta).
- Mentre `forza_cambio_password=1`, tutte le rotte protette diverse da `auth/{logout,check,change-password,sessions,sessions/:id}` rispondono `AUTH_PASSWORD_CHANGE_REQUIRED` (V3.M2.A5).
- Multi-session: cap configurabile via `MAX_SESSIONS_PER_USER` (default 5). Oltre il cap viene invalidata la sessione meno recente.
- `check`/`verify-password` invariati come prima, ma `check` espone anche `must_change_password`.

## 8. Endpoint `/api/admin/*` — `app/admin/routes.js`

Tutti gli endpoint qui hanno `{ role: "admin" }` (verificato da `enforceAuth`).

| Metodo | Path | Descrizione |
|--------|------|-------------|
| `GET`  | `/api/admin/audit-logs?limit&offset` | Lista paginata di `audit_log` (max `limit=500`) |
| `GET`  | `/api/admin/utenti` | Tutti gli utenti (include `tentativi_falliti`, `bloccato_fino_il`) |
| `GET`  | `/api/admin/utenti/:id` | Singolo utente |
| `POST` | `/api/admin/utenti` | Crea utente; valida username ≥ 3, password ≥ 8, ruolo ∈ `RUOLI_VALIDI` |
| `PUT`  | `/api/admin/utenti/:id` | Aggiorna utente |
| `POST` | `/api/admin/utenti/:id/reset-password` | Reset password (≥ 8) |
| `POST` | `/api/admin/utenti/:id/unlock` | Sblocco manuale account bloccato (V3.M2.A6) |
| `DELETE` | `/api/admin/utenti/:id` | Elimina utente. Errore `LAST_ADMIN_PROTECTED` se rimuoverebbe l'ultimo admin attivo (V3.M2.A13) |

Ogni operazione di scrittura emette `logAudit("admin.user.<azione>", ctx, { details })`.

## 9. Audit log per autenticazione

Eventi tracciati automaticamente in `audit_log`:

| `azione` | Quando |
|----------|--------|
| `auth.denied` | Cookie assente / sessione invalida o scaduta |
| `auth.denied` (con `required_role`) | Ruolo insufficiente |
| `auth.password_change_required` | Tentativo di accesso a rotta protetta con `forza_cambio_password=1` |
| `auth.password_changed` | Cambio password riuscito |
| `auth.session_revoked` | Revoca esplicita di una sessione via `DELETE /api/auth/sessions/:id` |
| `auth.check` | Chiamata a `check-user` (utile per detection di enumeration) |
| `csrf.failure` | Header `X-CSRF-Token` mancante o errato |
| `login.success` / `login.failed` | Login (vedi handler) — `details` riporta `failures` e `locked_until` |
| `logout` | Logout esplicito |
| `admin.user.create` / `update` / `reset_password` / `delete` / `unlock` | Operazioni admin |
