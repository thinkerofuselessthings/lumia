# LUMIA v0.0.1 — Piano di Integrazione da Polyglobulia

> Documento di lavoro — revisione e note inline benvenute.

Nota: il progetto deve evolvere verso un sistema diagnostico/linee guida/helper ematologico. Fonti principali sono le linee guida EHA, NCCN ed ELN

## Stato Attuale

### LUMIA (destinazione)
- Server: `server/api-server.js` — monolitico, http puro, zero framework
- Auth: solo `X-API-Key` (header statico)
- Frontend: `index.html` monolitico con CSS inline (~500 righe)
- Layer system: `app/core/layer-system.js` (fullscreen/modal/panel/sheet)
- Libreria: `app/core/lumia-library.js` (HELPERS + GROUPS, 3 colonne)
- Engine: VM sandbox (`server/engine-loader.js`) per eseguire JS browser lato server
- DB: nessuno (engines in-memory)
- Dipendenze: solo `sql.js

### Polyglobulia (sorgente)
- Server: `src/init.js` → `src/server.js` → `src/routes.js` — modulare
- Router: pattern matcher con `:params` (`src/http/router.js`)
- Auth: session-based (cookie HttpOnly, PBKDF2-SHA512, CSRF, rate-limit)
- Frontend: file CSS separati (base.css, app.css, layers.css, layers/)
- Layer system: `public/js/layer-system.js` (stessa architettura)
- DB: sql.js dual-DB (config + pazienti), ATTACH pattern
- Middleware: security-headers, cors, body-parser, auth-gate, csrf, rate-limiter

---

## Fase 1 — CSS: da inline a file separati

**Obiettivo**: estrarre il CSS inline da `index.html` in file esterni.

### Cosa fare
- [x] Estrarre tutto il blocco `<style>` da `index.html`
- [x] Creare file CSS granulari (5 file per responsabilità)
- [x] Importare `base.css` da Polyglobulia come fondazione design tokens (→ Fase 7)
- [x] Collegare i file CSS in `index.html` con `<link>`

### File creati
- `public/css/lumia-global.css` — tokens, reset, animazioni, utility
- `public/css/lumia-front-page.css` — appbar, landing, engines
- `public/css/lumia-layer-system.css` — layer types, header, body, actions
- `public/css/lumia-library-shell.css` — 3 colonne, quick launch, tree, categorie
- `public/css/lumia-api-log.css` — pannello API log slide-in

### File coinvolti
| Sorgente (Polyglobulia) | Destinazione (LUMIA) | Note |
|--------------------------|----------------------|------|
| `public/css/base.css` | `public/css/base.css` | Design tokens, reset, componenti base |
| — | `public/css/lumia-app.css` | CSS specifico LUMIA (estratto da index.html) |

### Note / Revisione
> nota generale su file: i file devono avere una separazione granulare, il css ed il javascript un compito un file. Questo aiuta nella modifica e nel mantenimento del progetto.

---

## Fase 2 — Layer System & CSS Layers

**Obiettivo**: allineare il layer system e portare i CSS dedicati.

### Cosa fare
- [x] Diff tra `app/core/layer-system.js` (LUMIA) e `public/js/layer-system.js` (Polyglobulia)
- [x] Merge eventuali fix/evoluzioni da Polyglobulia
- [x] Portare `public/css/layers.css` e `public/css/layers/` da Polyglobulia
- [x] Rimuovere CSS layer inline da `lumia-app.css` (già in layers.css)

### File coinvolti
| Sorgente | Destinazione | Note |
|----------|-------------|------|
| `public/css/layers.css` | `public/css/layers.css` | Stili layer principali |
| `public/css/layers/` (3 file) | `public/css/layers/` | core, layout, tree |
| `public/js/layer-system.js` | `app/core/layer-system.js` | Solo se più recente |

### Note / Revisione
> Merge selettivo completato. Mantenuta architettura IIFE + UI header LUMIA (library button). Adottati da Polyglobulia: crypto ID, provider validation, render try-catch, event unsubscribe, openGuard, return values da close, state:changed event, closeByElement. Backdrop/Escape disabilitati di default ma configurabili via manager flags. — Server: architettura modulare

**Obiettivo**: migrare da server monolitico a struttura `src/` modulare.

### Cosa fare
- [x] Creare struttura `src/` in LUMIA
- [x] Portare `src/http/router.js` (pattern matcher con `:params`)
- [x] Portare `src/http/request-handler.js` (adattato per static + engines LUMIA)
- [x] Portare `src/http/body-parser.js`
- [x] Adattare `src/init.js` (mantiene engine-loader LUMIA)
- [x] Adattare `src/server.js`
- [x] Merge `src/routes.js` (rotte LUMIA + rotte Polyglobulia)
- [x] Mantenere `server/engine-loader.js` (specifico LUMIA, invariato)
- [x] Aggiornare `package.json` script start → `node src/init.js`

### Struttura target
```
src/
  init.js              ← da Polyglobulia (adattato)
  server.js            ← da Polyglobulia
  routes.js            ← merge rotte
  config/
    env.js             ← da Polyglobulia (merge con server/config.js)
  http/
    router.js          ← da Polyglobulia
    request-handler.js ← da Polyglobulia (adattato)
    body-parser.js     ← da Polyglobulia
  db/
    connection.js      ← da Polyglobulia (sql.js)
    core.js            ← da Polyglobulia
    instance.js        ← adattato per path LUMIA
  errors/
    app-error.js       ← da Polyglobulia
    codes.js           ← da Polyglobulia
  middleware/
    auth-gate.js       ← da Polyglobulia
    cors.js            ← da Polyglobulia
    csrf.js            ← da Polyglobulia
    rate-limiter.js    ← da Polyglobulia
    security-headers.js ← da Polyglobulia
    cookies.js         ← da Polyglobulia
server/
  engine-loader.js     ← MANTENERE (specifico LUMIA)
```

### Decisioni aperte
- [x] Mantenere `server/api-server.js` come fallback o sostituire completamente? → Sostituito. Legacy disponibile via `npm run start:legacy`
- [x] `lumia.config.json` resta o migra tutto in `.env`? → .env primario, lumia.config.json come fallback per apiKey

### Note / Revisione
> Server modulare completato. 12 file in src/: init.js, server.js, routes.js, config/env.js, http/{router,request-handler,body-parser,response,static}.js, errors/{app-error,codes,handle}.js, middleware/{security-headers,cors,rate-limiter}.js. Tutte le rotte LUMIA (health, config, catalog, log, diagnostic, scores, therapy) migrate al pattern Router. Engine-loader intatto. Security headers attivi (nosniff, DENY, no-referrer, CSP). CORS ristretto. Rate limiting attivo.

---

## Fase 4 — Database: sql.js per utenti e sessioni

**Obiettivo**: inizializzare DB con tabelle utenti/sessioni/audit.

### Cosa fare
- [x] Portare `src/db/connection.js` (wrapper sql.js con API better-sqlite3-like)
- [x] Portare `src/lib/sqlite-wrapper.js` (wrapper sql.js ↔ better-sqlite3 API: prepare/get/all/run/exec/pragma, auto-save debounced, batch, transazioni)
- [x] Portare `src/db/instance.js` (singleton, path `data/lumia.db`)
- [x] Creare schema tabelle: `utenti`, `sessioni`, `audit_log`
- [x] Portare `src/db/audit.js` (logAudit + pruneAuditLogs con retention configurabile)
- [x] DB unico (`data/lumia.db`) — sufficiente per LUMIA

### Schema minimo utenti
```sql
CREATE TABLE IF NOT EXISTS utenti (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  iterations INTEGER NOT NULL DEFAULT 600000,
  nome TEXT, cognome TEXT,
  ruolo TEXT NOT NULL DEFAULT 'medico',
  email TEXT,
  attivo INTEGER NOT NULL DEFAULT 1,
  forza_cambio_password INTEGER NOT NULL DEFAULT 0,
  creato_il TEXT DEFAULT (datetime('now')),
  aggiornato_il TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessioni (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  utente_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  valida INTEGER NOT NULL DEFAULT 1,
  ip TEXT,
  user_agent TEXT,
  creata_il TEXT DEFAULT (datetime('now')),
  ultimo_accesso TEXT DEFAULT (datetime('now')),
  scade_il TEXT NOT NULL,
  FOREIGN KEY (utente_id) REFERENCES utenti(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  azione TEXT NOT NULL,
  utente_id INTEGER,
  ip TEXT,
  user_agent TEXT,
  metodo TEXT,
  percorso TEXT,
  risultato TEXT,
  dettagli TEXT,
  creato_il TEXT DEFAULT (datetime('now'))
);
```

### File creati
```
src/lib/sqlite-wrapper.js   ← wrapper sql.js con API better-sqlite3 (~190 righe)
src/db/instance.js          ← DB_PATH + singleton (_setDb/getDb)
src/db/schema.js            ← DDL: utenti, sessioni, audit_log
src/db/connection.js        ← initDatabase() (async: initSqlite → Database → DDL)
src/db/audit.js             ← logAudit(action, ctx, opts), pruneAuditLogs()
data/lumia.db              ← DB creato (28672 bytes)
```

### Note / Revisione
> sqlite-wrapper.js offre API sincrona (prepare/get/all/run/exec) sopra sql.js asincrono (WASM). Auto-save debounced 500ms. Batch mode per bulk insert. Transazioni via db.transaction(fn). DB unico a `data/lumia.db`. init.js reso async per attendere initSqlite(). Server verificato: DB pronto, tutti gli engine caricati, health 200 OK.

---

## Fase 4.a — Documentazione schema DB

**Obiettivo**: documentare ogni tabella del database in file separati dentro `docs/db/`.

### Cosa fare
- [x] Creare cartella `docs/db/`
- [x] Creare `docs/db/utenti.md` — campi, tipi, vincoli, default, note su hashing, relazioni
- [x] Creare `docs/db/sessioni.md` — campi, dual-expiry (idle 30min + assoluta 24h), query frequenti
- [x] Creare `docs/db/audit_log.md` — campi, azioni registrate, pruning, query frequenti

### File creati
```
docs/db/utenti.md       ← 14 campi, relazioni 1→N con sessioni e audit_log
docs/db/sessioni.md     ← 9 campi, FK utenti(id), query verifica/invalidazione
docs/db/audit_log.md    ← 10 campi, tabella azioni, query pruning 90gg
```

### Note / Revisione
> Ogni file .md documenta: tabella campi (tipo, vincoli, default, descrizione), note implementative, relazioni, indici impliciti e query SQL frequenti. Il campo `dettagli` in audit_log è JSON libero. utente_id in audit_log è riferimento logico senza FK esplicita per consentire log di azioni su utenti inesistenti.

---

## Fase 5 — Autenticazione completa

**Obiettivo**: login/logout/sessioni con cookie sicuri.

### Cosa fare
- [x] Portare `app/auth/password.js` (PBKDF2-SHA512, 600k iterazioni, rehash trasparente)
- [x] Portare `app/auth/sessions.js` (token 96 char, idle 30min, max 24h, cleanup timer)
- [x] Portare `app/auth/db.js` (barrel re-export)
- [x] Portare `app/auth/routes.js` (check-user, login, logout, check, verify-password)
- [x] Portare `app/auth/seed.js` (admin iniziale da ADMIN_PASSWORD env)
- [x] Portare middleware: `auth-gate.js` (dual-auth), `csrf.js` (HMAC-SHA256), `cookies.js` (HttpOnly/SameSite/Strict), `auth.js` (barrel)
- [x] Aggiungere `loginLimiter` a rate-limiter.js (5 tentativi / 15 min)
- [x] Integrare `enforceAuth` in routes.js (sostituisce auth X-API-Key inline)
- [x] Aggiornare init.js (seedAdminUser + cleanupSessions timer 15min)

### Flusso auth target
```
POST /api/auth/check-user  → { exists: bool }      (rate-limited)
POST /api/auth/login       → set cookie + { user }  (rate-limited)
GET  /api/auth/check       → { authenticated, user }
POST /api/auth/logout      → clear cookie
```

### Dual-auth (transizione)
- Cookie `session=...` → validazione sessione DB (browser)
- Header `X-API-Key` → validazione chiave statica (client API esterni)
- L'`auth-gate` accetta entrambi

### Note / Revisione
> _Spazio per note..._

---

## Fase 6 — Login page

**Obiettivo**: pagina di login con redirect a index.html.

### Cosa fare
- [x] Portare `public/login.html` da Polyglobulia (adattato branding LUMIA, rimosso import API module, inline fetch)
- [x] Adattare branding (titolo "LUMIA — Login", logo, versione v0.0.1, descrizione "LUMIAlogy Decision Support")
- [x] Portare `public/css/login.css` (3-col layout, card, field, error, animazioni)
- [x] Portare `public/css/loader.css` (spinner CRUD + lightsaber login/logout)
- [x] In `static.js`: redirect root `/` e `/index.html` a login.html se non autenticato
- [x] In `index.html`: session guard con fetch `/api/auth/check`, redirect a `/login.html` se 401

### File creati
```
public/login.html      ← login 2-step (username → password), lightsaber loader, session check
public/css/login.css   ← 3-col layout, card, field, error, animazioni (~160 righe)
public/css/loader.css  ← spinner + lightsaber fight (~200 righe, 12 keyframes)
```

### File modificati
```
src/http/static.js     ← +parseCookies/getSessionByToken, redirect root/index.html basato su sessione
index.html             ← +session guard (fetch /api/auth/check → redirect /login.html)
```

### Note / Revisione
> Login page adattata da Polyglobulia: branding "LUMIA", CDN hugeicons (come index.html), rimosso `import API` (sostituito con inline fetch per evitare dipendenza da moduli ES). Flusso 2-step: check-user → password. Lightsaber loader con 5s minimo. Session guard in index.html non blocca se server offline (graceful fallback). Static serve login.html da `public/` via path `/public/login.html` (coerente con ROOT_DIR = project root). CSS vars da lumia-global.css. Test verificato: root(200→login) • CSS(200) • login(200→cookie) • root+cookie(200→app) • index.html+cookie(200→app) • index.html senza cookie(200→login).

---

## Fase 7 — UI Layout & Libreria

**Obiettivo**: consolidare CSS e arricchire la libreria.

### Cosa fare
- [x] Portare design tokens completi da `base.css` Polyglobulia → `public/css/lumia-base.css`
- [x] Verificare compatibilità variabili CSS (`:root` vars) — alias --fg/--line/--card/--shadow inclusi in base.css
- [x] Portare supporto "moduli aperti" nella colonna 2 della library shell — già implementato in index.html
- [x] Portare `public/css/icons.css` → `public/css/lumia-icons.css` (CSS mask-image offline fallback)

### File creati / modificati
- `public/css/lumia-base.css` (NUOVO) — design tokens completi, reset, componenti atomici (~500 righe) da Polyglobulia base.css
- `public/css/lumia-icons.css` (NUOVO) — HugeIcons CSS mask-image offline fallback (99 righe)
- `public/css/lumia-global.css` (MODIFICATO) — rimossi tokens/:root/reset duplicati, mantenute solo animazioni + utility LUMIA-specifiche
- `index.html` (MODIFICATO) — aggiunto `<link>` per lumia-base.css e lumia-icons.css
- `public/login.html` (MODIFICATO) — aggiunto `<link>` per lumia-base.css e lumia-icons.css

### Note / Revisione
> Design tokens portati da Polyglobulia base.css: `:root` con grays, accents, primary scale, IDE palette, spacing, typography, borders, surfaces, shadows, transitions, layer tokens. Reset body/box-sizing. Componenti atomici: buttons, inputs, forms, badges, tables, stat cards, modals, confirm dialogs, toasts, utility classes, scrollbar. Backward-compat aliases mantenuti (--fg, --line, --card, --shadow). lumia-global.css snellito a sole animazioni + utility specifiche LUMIA. Colonna 2 "moduli aperti" verificata: già completamente implementata in index.html (renderLibraryList, openModule, focusModule, event wiring). Test: CSS serviti (200), login page e app page caricate correttamente con nuovi stylesheet.

---

## Vincoli e Rischi

| Vincolo | Impatto |
|---------|---------|
| **Solo sql.js** come dipendenza npm | Nessun blocco — Polyglobulia usa già sql.js |
| **No Electron** | Già risolto — server puro Node.js |
| **No npm install** | Tutto il codice deve essere copiato/adattato manualmente |
| **Engine loader** | Deve restare funzionante — è il cuore di LUMIA |

| Rischio | Mitigazione |
|---------|-------------|
| Conflitti CSS (base.css vs inline LUMIA) | Fase 1: test visivo dopo estrazione |
| Router mismatch (rotte LUMIA vs pattern Polyglobulia) | Fase 3: mapping esplicito delle rotte |
| Dual-auth complessità | Fase 5: test entrambi i flussi |
| Layer system divergenze | Fase 2: diff prima di merge |

---

## Ordine di esecuzione consigliato

```
Fase 1 (CSS)  ──→  Fase 2 (Layers)  ──→  Fase 7 (UI/Libreria)
                                              ↑
Fase 3 (Server) ──→ Fase 4 (DB) ──→ Fase 5 (Auth) ──→ Fase 6 (Login)
```

Le due tracce (frontend e backend) possono procedere in parallelo.

---

## Log Modifiche

| Data | Fase | Descrizione |
|------|------|-------------|
| 2026-04-10 | Fase 1 | CSS estratto da index.html in 5 file granulari. Encoding fix UTF-8. Server testato OK, tutti i CSS serviti (200). |
| 2026-04-10 | Fase 2 | Selective merge layer-system.js: +8 miglioramenti da Polyglobulia, sintassi verificata OK (526→571 righe). CSS layers copiato (core+layout+tree), lumia-layer-system.css ripulito. |
| 2026-04-10 | Fase 3 | Server modulare src/ creato (12 file). Router pattern-matching, security headers, CORS ristretto, rate-limiting. Tutti gli endpoint testati OK. Package.json aggiornato. |
| 2026-04-10 | Fase 4 | Database sql.js inizializzato. sqlite-wrapper.js (API better-sqlite3-like), schema utenti/sessioni/audit_log, singleton DB, audit logging. DB creato a data/lumia.db (28KB). Server verificato OK. |
| 2026-04-10 | Fase 4.a | Documentazione schema DB: creati docs/db/utenti.md, sessioni.md, audit_log.md con campi, vincoli, relazioni, query frequenti. |
| 2026-04-10 | Fase 5 | Auth stack completo: 9 file creati (app/auth/*, src/middleware/*), 3 modificati (rate-limiter, routes, init). Dual-auth (cookie+API-key), CSRF, admin seed, session cleanup. Test end-to-end OK. |
| 2026-04-10 | Fase 6 | Login page: login.html (2-step + lightsaber loader), login.css, loader.css. Static.js redirect session-based. Index.html session guard. Test end-to-end OK. |
| 2026-04-10 | Fase 7 | UI Layout & Libreria: lumia-base.css (design tokens da Polyglobulia), lumia-icons.css (mask-image offline), lumia-global.css snellito, CSS links aggiornati in index.html e login.html. Open modules colonna 2 già presente. Test OK. |

---
