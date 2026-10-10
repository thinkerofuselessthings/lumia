# Sessioni — Architettura e Funzionalità

> **Data**: 2026-04-11 · **Versione**: lumia v0.0.1

---

## Panoramica

Sistema di sessioni server-side basato su token opachi, persistiti in SQLite.
Doppia scadenza (idle + assoluta), protezione CSRF derivata, cookie HttpOnly.

---

## File principali

| File | Responsabilità |
|------|----------------|
| [`app/auth/sessions.js`](../../../app/auth/sessions.js) | CRUD sessioni, token generation, cleanup |
| [`app/auth/password.js`](../../../app/auth/password.js) | Hashing PBKDF2-SHA512, verifica, rehash |
| [`app/auth/routes.js`](../../../app/auth/routes.js) | Endpoint auth: login, logout, check, verify |
| [`app/auth/seed.js`](../../../app/auth/seed.js) | Bootstrap utente admin |
| [`app/auth/db.js`](../../../app/auth/db.js) | Barrel export (sessions + password + seed) |
| [`src/middleware/csrf.js`](../../../src/middleware/csrf.js) | Derivazione e validazione token CSRF |
| [`src/middleware/cookies.js`](../../../src/middleware/cookies.js) | Set/clear/parse cookie sessione |
| [`src/middleware/rate-limiter.js`](../../../src/middleware/rate-limiter.js) | Rate limiting per IP |

---

## Token di sessione

| Proprietà | Valore |
|-----------|--------|
| Formato | 96 caratteri hex |
| Entropia | 48 byte = 384 bit (crittograficamente sicuro) |
| Generazione | `crypto.randomBytes(48).toString("hex")` |
| Unicità | Colonna `UNIQUE` in SQLite |

---

## Ciclo di vita

### Login

```
POST /api/auth/login { username, password }
  1. Rate limit check (5 tentativi / 15 min per IP)
  2. Lookup utente per username
  3. Verifica password (PBKDF2 timing-safe)
  4. Invalidazione sessioni precedenti dello stesso utente
  5. Creazione nuovo token (96-char hex)
  6. Inserimento in tabella `sessioni`
  7. Set cookie: session=<token>; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400
  8. Derivazione CSRF token da session token
  9. Risposta: { csrf_token, expires_at, user: {...} }
  10. Audit log: login.success
```

### Verifica sessione (ogni richiesta protetta)

```
Cookie: session=<token>
  → getSessionByToken(token)
    1. SELECT sessione + utente (JOIN)
    2. Filtro: valida = 1 AND scade_il > now
    3. Filtro: ultimo_accesso + 30 min > now (idle)
    4. Filtro: utente.attivo = 1
    5. UPDATE ultimo_accesso = now (slide idle window)
    → ritorna dati utente o null
```

### Check sessione (client-side guard)

```
GET /api/auth/check
  → Cookie session valido?
    SÌ: { authenticated: true, csrf_token: "...", user: {...} }
    NO: { authenticated: false } (401)
```

Usato da `index.html` come session guard: se non autenticato, redirect a `/login.html`.

### Logout

```
POST /api/auth/logout
  Header: X-CSRF-Token: <csrf_token>
  Cookie: session=<token>
    1. Validazione CSRF (confronto con derivato)
    2. invalidateSession(token) → SET valida = 0
    3. clearSessionCookie(res)
    4. Audit log: logout
    5. Risposta: { ok: true }
```

Lato client: overlay lightsaber (minimo 3 secondi), poi redirect a `/login.html`.

### Pulizia automatica

```
setInterval(cleanupSessions, 15 minuti)
  → DELETE FROM sessioni WHERE valida = 0 OR scade_il <= now
  → Log: "[auth] Sessioni scadute rimosse: N"
```

---

## Scadenza doppia

| Tipo | Durata | Configurazione | Logica |
|------|--------|----------------|--------|
| Idle | 30 minuti | `SESSION_IDLE_TIMEOUT` | `ultimo_accesso + 30 min > now` |
| Assoluta | 24 ore | Hardcoded | `scade_il > now` |

L'idle timeout scorre ad ogni richiesta autenticata (`ultimo_accesso` aggiornato).
La scadenza assoluta è fissata alla creazione e non può essere estesa.

**Nota critica**: tutti i confronti datetime usano ISO string JavaScript
(`new Date().toISOString()`), **mai** `datetime('now')` di SQLite — l'Italia è UTC+2
e SQLite restituisce UTC.

---

## Cookie di sessione

```
Set-Cookie: session=<token>; HttpOnly; SameSite=Strict; [Secure;] Path=/; Max-Age=86400
```

| Attributo | Valore | Scopo |
|-----------|--------|-------|
| `HttpOnly` | true | Impedisce accesso JS (mitigazione XSS) |
| `SameSite` | Strict | Nessun invio cross-site (mitigazione CSRF) |
| `Secure` | condizionale | Solo HTTPS se `SECURE_COOKIE=true` |
| `Path` | `/` | Tutte le route |
| `Max-Age` | 86400s | 24 ore (allineato a scadenza DB) |

---

## Protezione CSRF

### Derivazione

Il token CSRF è derivato deterministicamente dal token di sessione:

```javascript
deriveCsrfToken(sessionToken) {
  return crypto.createHmac("sha256", CSRF_SECRET)
    .update(sessionToken)
    .digest("hex")
    .slice(0, 32);
}
```

| Proprietà | Valore |
|-----------|--------|
| Algoritmo | HMAC-SHA256 |
| Segreto | 32 byte random hex, file `data/.csrf_secret` |
| Output | 32 caratteri hex |
| Lifecycle | Legato al token sessione — rigenerato al login |

### Validazione

Richiesto su tutte le richieste POST/PUT/DELETE autenticate via sessione:
- Header: `X-CSRF-Token: <valore>`
- Confrontato con `deriveCsrfToken(sessionToken)` della sessione attiva

### Flusso client

```
Login     → risposta include csrf_token → salvato in variabile JS
/api/auth/check → risposta include csrf_token → aggiornato al reload
POST/PUT/DELETE → header X-CSRF-Token: <csrf_token>
```

---

## Hashing password

### Algoritmo: PBKDF2-SHA512

| Parametro | Valore | Note |
|-----------|--------|------|
| Algoritmo | PBKDF2 | Standard OWASP 2024 |
| Digest | SHA-512 | 64 byte output |
| Iterazioni | 600 000 | Minimo OWASP 2024 |
| Salt | 32 byte (hex) | Random per utente |
| Output | 128 hex chars | 64 byte binari |
| Legacy | 100 000 | Supportato con upgrade automatico |

### Verifica

```javascript
crypto.timingSafeEqual(derivedKey, storedHash)
```

Usa confronto timing-safe per prevenire timing attacks.

### Rehash automatico

Dopo login riuscito, se `iterations < 600000`, il sistema:
1. Genera nuovo salt
2. Ricalcola hash con 600k iterazioni
3. Aggiorna record utente

---

## Rate limiting login

| Parametro | Valore | Configurazione |
|-----------|--------|----------------|
| Max tentativi | 5 per 15 min | `LOGIN_RATE_LIMIT` |
| Window | 15 minuti | `LOGIN_RATE_WINDOW` |
| Scope | Per IP | — |
| Reset | Dopo login riuscito | `limiter.reset(ip)` |

Risposta su superamento: `429 RATE_LIMIT_LOGIN — Troppi tentativi di accesso`

---

## Re-autenticazione

Per operazioni sensibili (cambio password, ecc.):

```
POST /api/auth/verify-password
  Header: X-CSRF-Token
  Cookie: session
  Body: { password }
  → Verifica password dell'utente corrente
  → { ok: true } oppure 401
```

---

## Seed admin

All'avvio (`src/init.js`), se l'utente `admin` non esiste:

1. Usa `ADMIN_PASSWORD` da `.env` oppure genera random 16-byte hex
2. Hash con PBKDF2 (600k iterazioni)
3. Inserisce in `utenti`:
   - username: `admin`
   - email: `admin@lumia.local`
   - ruolo: `admin`
   - `forza_cambio_password`: 1
4. Log password mascherata (primi 4 char + asterischi)

---

## Schema database

### Tabella `utenti`

```sql
id                      INTEGER PRIMARY KEY AUTOINCREMENT
username                TEXT UNIQUE NOT NULL
password_hash           TEXT NOT NULL
salt                    TEXT NOT NULL
iterations              INTEGER NOT NULL DEFAULT 600000
nome                    TEXT
cognome                 TEXT
ruolo                   TEXT NOT NULL DEFAULT 'medico'
email                   TEXT
attivo                  INTEGER NOT NULL DEFAULT 1
forza_cambio_password   INTEGER NOT NULL DEFAULT 0
creato_il               TEXT DEFAULT (datetime('now'))
aggiornato_il           TEXT DEFAULT (datetime('now'))
```

### Tabella `sessioni`

```sql
id              INTEGER PRIMARY KEY AUTOINCREMENT
utente_id       INTEGER NOT NULL  → FK utenti.id
token           TEXT UNIQUE NOT NULL
valida          INTEGER NOT NULL DEFAULT 1
ip              TEXT
user_agent      TEXT
creata_il       TEXT DEFAULT (datetime('now'))
ultimo_accesso  TEXT DEFAULT (datetime('now'))
scade_il        TEXT NOT NULL
```

### Tabella `audit_log`

```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
azione      TEXT NOT NULL
utente_id   INTEGER
ip          TEXT
user_agent  TEXT
metodo      TEXT
percorso    TEXT
esito       TEXT DEFAULT 'successo'
dettagli    TEXT   -- JSON stringified
creato_il   TEXT DEFAULT (datetime('now'))
```

---

## Audit log

### Eventi registrati

| Azione | Quando | Esito |
|--------|--------|-------|
| `login.success` | Login riuscito | successo |
| `login.failed` | Credenziali errate | errore |
| `logout` | Sessione invalidata | successo |
| `auth.denied` | Permessi insufficienti | errore |
| `csrf.failure` | Token CSRF non valido | errore |

### Retention

365 giorni (configurabile `AUDIT_RETENTION_DAYS`).

---

## Diagramma di sequenza

```
Client                    Server                    Database
  │                         │                         │
  ├─ POST /api/auth/login ──►                         │
  │  { username, password } │                         │
  │                         ├─ rate limit check ──────►│
  │                         ├─ SELECT utente ─────────►│
  │                         ├─ PBKDF2 verify           │
  │                         ├─ invalidate old sessions►│
  │                         ├─ INSERT new session ────►│
  │                         ├─ derive CSRF token       │
  │  ◄── Set-Cookie + JSON ─┤                         │
  │                         │                         │
  ├─ GET /api/auth/check ──►                         │
  │  Cookie: session=...    │                         │
  │                         ├─ getSessionByToken ────►│
  │                         ├─ idle + absolute check   │
  │                         ├─ UPDATE ultimo_accesso ─►│
  │  ◄── { authenticated, csrf_token, user }         │
  │                         │                         │
  ├─ POST /api/auth/logout ►                         │
  │  X-CSRF-Token: ...      │                         │
  │                         ├─ validate CSRF           │
  │                         ├─ SET valida = 0 ────────►│
  │                         ├─ clear cookie            │
  │  ◄── { ok: true } ──────┤                         │
  │                         │                         │
  │                    [ogni 15 min]                   │
  │                         ├─ cleanupSessions ───────►│
  │                         │  DELETE scadute/invalide │
```

---

## File coinvolti

| File | Percorso |
|------|----------|
| Sessions | [`app/auth/sessions.js`](../../../app/auth/sessions.js) |
| Password | [`app/auth/password.js`](../../../app/auth/password.js) |
| Auth routes | [`app/auth/routes.js`](../../../app/auth/routes.js) |
| Seed admin | [`app/auth/seed.js`](../../../app/auth/seed.js) |
| DB barrel | [`app/auth/db.js`](../../../app/auth/db.js) |
| CSRF | [`src/middleware/csrf.js`](../../../src/middleware/csrf.js) |
| Cookies | [`src/middleware/cookies.js`](../../../src/middleware/cookies.js) |
| Rate limiter | [`src/middleware/rate-limiter.js`](../../../src/middleware/rate-limiter.js) |
| Schema | [`src/db/schema.js`](../../../src/db/schema.js) |
| DB wrapper | [`src/db/sqlite-wrapper.js`](../../../src/db/sqlite-wrapper.js) |
| Session guard (client) | [`app/shell/shell-session-guard.js`](../../../app/shell/shell-session-guard.js) |

---

## Vincoli MDG

### 1. Un utente = un solo terminale

**Server-side**: `createSession()` esegue `UPDATE sessioni SET valida = 0 WHERE utente_id = ? AND valida = 1`
prima di ogni nuovo INSERT. Un login da un nuovo dispositivo invalida automaticamente
tutte le sessioni precedenti dell'utente.

**Client-side**: il file `shell-session-guard.js` esegue un heartbeat (`GET /api/auth/check`)
ogni 30 secondi. Se il server risponde 401 (sessione invalidata da un altro login),
un overlay bloccante viene mostrato con il messaggio "Sessione terminata — La sessione
è stata chiusa da un altro terminale o è scaduta" e un bottone redirect al login.

### 2. Nessuna tab multipla nello stesso browser

**BroadcastChannel**: all'apertura, ogni tab genera un `tabId` unico e invia un messaggio
`tab-open` sul canale `lumia-session`. Le tab già aperte ricevono il messaggio e si
bloccano con l'overlay "Sessione attiva altrove — LUMIA è già aperto in un'altra
scheda di questo browser".

```
Tab 1 (attiva)                    Tab 2 (nuova)
  │                                  │
  │  ◄── BroadcastChannel ──────── tab-open { tabId: "B" }
  │  overlay: "Sessione attiva altrove"
  │  tab-yield ──────────────────►  │
  │                                  │ (diventa tab attiva)
```

La tab più recente vince sempre. La tab bloccata mostra un bottone "Ricarica".

### 3. IP registrato nell'audit log

L'IP del client (`req.socket?.remoteAddress`) è salvato in:
- Tabella `audit_log` → colonna `ip` (ogni azione: login, logout, auth.denied, csrf.failure)
- Tabella `sessioni` → colonna `ip` (alla creazione della sessione)
