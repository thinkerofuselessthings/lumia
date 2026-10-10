# 11 — Roadmap V3: hardening server per gestionale dati sensibili

> **Scopo**: ordinare in modo eseguibile gli interventi indicati in [10-server-analysis.md](10-server-analysis.md), con criteri di accettazione, file impattati, rischio di regressione e log delle modifiche per ciascuna voce.

## Convenzioni

- **Stato**: ⏳ pending • 🟡 in corso • ✅ completato
- **Rischio regressione**: 🟢 basso • 🟡 medio • 🔴 alto
- Ogni voce è atomica e committable separatamente.
- Ogni voce ha **definizione di "fatto"** verificabile.
- Le voci marcate `[BREAKING-CLIENT]` richiedono modifica a `app/shell/**` o `public/**`.

---

## Milestone V3.M1 — Hardening immediato (security low-hanging fruit)

Obiettivo: chiudere tutte le falle che permettono un attacco diretto in poche ore di lavoro. Nessun cambiamento di schema DB.

### M1.A1 — Proteggere `/api/config` (no leak di `apiKey`) 🟡

- **File**: `src/routes.js`
- **Rischio**: 🟡 (cambia output endpoint usato da `app/shell/shell-init.js`)
- **Modifica**:
  1. `auth: false` → `auth: true`
  2. Rimuovere `apiKey` dalla response JSON (il browser non ne ha bisogno: usa cookie+CSRF)
  3. Lasciare solo `{ ok, host, port, wsEnabled }`
- **Side-effect client**: `app/shell/shell-init.js:170-174` legge `cfgData.apiKey` → diventerà `undefined`. Update: rimuovere display (`apiKeyDisplay.textContent = '—'`). `app/shell/shell-modules.js:104` chiama `/api/catalog` con header `X-API-Key`: ma `catalog` è `auth:false`, quindi l'header è già inutile → rimuovere.
- **Definizione di fatto**: `curl http://host:3500/api/config` senza cookie → `401`. Con cookie valido → JSON senza `apiKey`. Login + caricamento app shell continua a funzionare.

### M1.A2 — Proteggere `/api/log` (admin-only) ⏳

- **File**: `src/routes.js`
- **Rischio**: 🟢
- **Modifica**: `{ auth: false }` → `{ auth: true, role: "admin" }`
- **Side-effect client**: `app/shell/shell-init.js:208` lo richiama. Va incapsulato in try/catch silenzioso per utenti non admin.
- **Definizione di fatto**: utente non-admin riceve `403`. Admin riceve l'array `entries`.

### M1.A3 — CSRF copre anche `PATCH` ⏳

- **File**: `src/middleware/auth-gate.js` linea 56
- **Rischio**: 🟢
- **Modifica**: `["POST", "PUT", "DELETE"]` → `["POST", "PUT", "PATCH", "DELETE"]`
- **Definizione di fatto**: `PATCH /api/agenda/appointments/:id/status` senza header `X-CSRF-Token` → `403 AUTH_CSRF_INVALID`.

### M1.A4 — CORS `Allow-Methods` include `PATCH` ⏳

- **File**: `src/middleware/cors.js` linea 17
- **Rischio**: 🟢
- **Modifica**: aggiungere `PATCH` nella string Access-Control-Allow-Methods
- **Definizione di fatto**: preflight `OPTIONS` per request `PATCH` cross-origin (entro origini ammesse) restituisce `204` e header che includono `PATCH`.

### M1.A14 — `.catch` finale su `init.js` IIFE ⏳

- **File**: `src/init.js`
- **Rischio**: 🟢
- **Modifica**: aggiungere `.catch(err => { console.error('[FATAL]', err); process.exit(1); })`
- **Definizione di fatto**: simulando un errore in `initDatabase`, il processo termina con codice 1 e log chiaro.

### M1.A19 — CSRF token a 64 hex chars ⏳

- **File**: `src/middleware/csrf.js` linea 25
- **Rischio**: 🟡 (token cambia → tutte le sessioni in volo invalidate il CSRF check)
- **Modifica**: rimuovere `.slice(0, 32)` dal `deriveCsrfToken`
- **Mitigazione**: rilasciare insieme a logout server-side (richiesta normale di re-login). In dev: nessun problema.
- **Definizione di fatto**: `csrf_token` ritornato dal login ha 64 caratteri esadecimali.

### M1.A18 — CORS no `localhost` in produzione ⏳

- **File**: `src/middleware/cors.js` linea 12
- **Rischio**: 🟢
- **Modifica**: includere `localhost` solo se `process.env.NODE_ENV !== "production"`
- **Definizione di fatto**: in `NODE_ENV=production`, request da `Origin: http://localhost:3500` su un server pubblicato → no CORS headers.

### M1.A20 — `SECURE_COOKIE` default `true` in produzione ⏳

- **File**: `src/middleware/cookies.js` linea 21
- **Rischio**: 🟡 (rompe accesso HTTP puro in produzione — comportamento desiderato)
- **Modifica**: default `true` se `NODE_ENV === "production"`, altrimenti `false`. Resta override esplicito via env.
- **Definizione di fatto**: `Set-Cookie` include `Secure;` in produzione senza configurazione esplicita.

### M1.A22 — `/api/auth/check-user` non rivela esistenza ⏳

- **File**: `app/auth/routes.js` linee 22-29
- **Rischio**: 🟡 (cambia UX login: utente sconosciuto non rilevato a step 1)
- **Modifica**: rispondere sempre `{ exists: true }` (mantenere endpoint per backward compat con `public/login.html`). L'errore vero arriva da `login` con messaggio `AUTH_INVALID_CREDENTIALS` (uguale per user inesistente o password sbagliata).
- **Audit**: continuare a loggare `auth.check` (utile per detection).
- **Definizione di fatto**: `POST /api/auth/check-user {username:"xyz_inesistente"}` → `{ exists: true }`. Login con stesso username + password → `401 AUTH_INVALID_CREDENTIALS`.

### M1 — Smoke test ⏳

Boot completo + login + accesso ad almeno una rotta `PATCH` agenda (per validare A3). Conferma che server non si rompe.

---

## Milestone V3.M2 — Auth & sessione di livello "gestionale"

Obiettivo: rendere l'auth resiliente a brute force per-account, multi-device, con cambio password forzato dopo reset/seed.

### M2.A5 — Enforcement `forza_cambio_password` ✅

- **File**: `app/auth/routes.js` (login + nuovo endpoint), `src/middleware/auth-gate.js`, `app/admin/users.js`
- **Rischio**: 🟡 (introduce un nuovo stato di sessione)
- **Modifica**:
  1. In `login`, se `user.forza_cambio_password === 1`: ritornare comunque `csrf_token` ma con flag `must_change_password: true`
  2. In `enforceAuth`, se `session` ha `forza_cambio_password=1` (join utenti) → bloccare ogni request tranne `POST /api/auth/change-password`
  3. Nuovo endpoint `POST /api/auth/change-password { old, new }` → verifica vecchia, hash nuova, set `forza_cambio_password=0`, invalida tutte le altre sessioni
  4. Lato shell: gestire flag → mostrare modale obbligatorio
- **Definizione di fatto**: subito dopo `seed.js` o `resetPasswordUtente`, l'utente non può fare nessuna API se non `change-password`.

### M2.A6 — Lockout per account ✅

- **File**: `src/db/schema.js`, `app/auth/routes.js`
- **Rischio**: 🟡 (modifica schema DB)
- **Modifica**:
  1. Migrazione idempotente: `ALTER TABLE utenti ADD COLUMN tentativi_falliti INTEGER DEFAULT 0; ADD COLUMN bloccato_fino_il TEXT;`
  2. Su login fallito: incrementare; se ≥ 5 → `bloccato_fino_il = now + 15min`
  3. Su login: se `bloccato_fino_il > now` → throw `AUTH_ACCOUNT_LOCKED`
  4. Su login riuscito: reset a 0
  5. Endpoint admin `POST /api/admin/utenti/:id/unlock` per sblocco manuale
- **Definizione di fatto**: 5 login falliti consecutivi sullo stesso utente → 6° tentativo (con password corretta) → `423 AUTH_ACCOUNT_LOCKED`. Admin sblocca → login OK.

### M2.A7 — Multi-session per dispositivo ✅

- **File**: `app/auth/sessions.js`, `app/auth/routes.js`
- **Rischio**: 🟡
- **Modifica**:
  1. `createSession`: NON invalidare sessioni precedenti. Limitare a `MAX_SESSIONS_PER_USER` (default 5): se superato, invalidare la più vecchia
  2. Nuovo `GET /api/auth/sessions` → lista (id, ip, user-agent, ultimo_accesso) della sessione corrente e altre
  3. Nuovo `DELETE /api/auth/sessions/:id` → revoca la sessione indicata
- **Definizione di fatto**: 2 login in parallelo dallo stesso utente → entrambi i token validi. `GET /api/auth/sessions` ne ritorna 2.

### M2.A13 — `deleteUtente` controlla "ultimo admin" + protezione su ruolo ✅

- **File**: `app/admin/users.js`
- **Rischio**: 🟢
- **Modifica**:
  1. Cambiare `if (user.username === "admin")` → controllo su `user.ruolo === "admin"`
  2. Prima di delete/disattivazione: query `COUNT(*) FROM utenti WHERE ruolo='admin' AND attivo=1` → se ≤ 1 e l'utente in delete è admin → throw `LAST_ADMIN_PROTECTED`
- **Definizione di fatto**: tentativo di cancellare l'unico admin → errore. Cancellazione di admin secondario (se ne esistono altri) → OK.

---

## Milestone V3.M3 — Audit, log, compliance

Obiettivo: tracciabilità completa per conformità GDPR art. 30/32.

### M3.A8 — `client-ip.js` + `TRUSTED_PROXIES` ✅

- **File**: nuovo `src/http/client-ip.js`; chiamanti: `auth-gate.js`, `auth/routes.js`, `db/audit.js`
- **Rischio**: 🟡
- **Modifica**:
  1. Funzione `getClientIp(req)` che leggge `req.socket.remoteAddress`; se in `TRUSTED_PROXIES` (env CSV CIDR) → primo IP da `X-Forwarded-For`
  2. Sostituire ogni `req.socket?.remoteAddress` con `getClientIp(req)`
- **Definizione di fatto**: dietro nginx con `proxy_set_header X-Forwarded-For $remote_addr;`, audit_log mostra IP reale del browser.

### M3.A10 — Schedule `pruneAuditLogs` ✅

- **File**: `src/init.js`, `src/db/audit.js`
- **Rischio**: 🟢
- **Modifica**: in init, dopo `cleanupSessions`, aggiungere `setInterval(pruneAuditLogs, 24*3600*1000).unref()`. Esporre `AUDIT_RETENTION_DAYS` env (default 365).
- **Definizione di fatto**: log con `created_at < now - 365gg` rimossi al primo run del timer.

### M3.A11 — Unificare `audit_log` + `audit_trail` ✅

- **File**: `src/db/schema.js`, `src/db/audit.js`, `app/agenda/db.js`, `app/agenda/utils/audit-trail.js`
- **Rischio**: 🔴 (cambio schema importante)
- **Modifica**:
  1. Spostare `audit_trail` in `lumia.db` come `audit_log_data` (cambia il prefisso) **o** estendere `audit_log` con colonne `target_table`, `target_id`, `before`, `after`
  2. Helper `audit.logChange(table, id, before, after, ctx)` che scrive in `audit_log` unificato
  3. Migrazione: copiare `audit_trail` esistente in `audit_log` con backfill
  4. Deprecare il modulo `app/agenda/utils/audit-trail.js`
- **Definizione di fatto**: una singola query SELECT su `audit_log` ritorna sia eventi auth sia mutazioni agenda, joinabile per `actor_id`.

### M3.A12 — `created_by`/`updated_by` su tabelle agenda ✅

- **File**: `app/agenda/db.js` (migrazione), tutti i controller agenda
- **Rischio**: 🟡
- **Modifica**:
  1. Migrazione: aggiungere `created_by INTEGER`, `updated_by INTEGER`, `created_at TEXT`, `updated_at TEXT` a tutte le tabelle che mancano
  2. Wrappare CRUD perché ogni INSERT/UPDATE peschi da `ctx.session.utente_id`
- **Definizione di fatto**: ogni nuovo `appointment` ha `created_by = utente_id` corretto.

### M3.B5 — Logger JSON-line ✅

- **File**: nuovo `src/lib/logger.js`; sostituire `console.log` in `request-handler.js`, `init.js`
- **Rischio**: 🟢
- **Modifica**: API `log.info({ msg, ...fields })` → stdout JSON. Mantenere TTY-friendly se `process.stdout.isTTY` (formato compatto).
- **Definizione di fatto**: `node src/init.js | jq` parsea ogni riga.

### M3.A21 — Sanitizzare body in `apiLog` ✅

- **File**: `src/routes.js` (helper `apiLog.push`)
- **Rischio**: 🟢
- **Modifica**: filtro che rimuove chiavi `password`, `token`, `secret`, `api_key`, `csrf_token` da `input` prima del push.
- **Definizione di fatto**: una request che invia `{password:"x"}` non vede `"x"` nel ring buffer.

---

## Milestone V3.M4 — Operativo e produzione

Obiettivo: prerequisiti per deploy reale con dati sensibili.

### M4.A9 — Cifratura at-rest dei dati sensibili ✅

- **Decisione tecnica**: field-level encryption AES-256-GCM via `crypto` builtin (no SQLCipher: vincolo offline, no native modules). Mantiene indici tecnici, cifra solo PII/clinici.
- **File nuovi**: `src/lib/field-crypto.js`, `tools/encrypt-existing.js`, script `npm run encrypt-existing`.
- **File modificati**: `app/agenda/models/{appointment,list-entry}.js`, `app/admin/users.js`, `src/db/audit.js`, `app/auth/{sessions,routes}.js`.
- **Rischio**: 🟡 (ridotto: nessun cambio di motore DB, formato wire `enc:v1:` con back-compat trasparente per righe legacy).
- **Definizione di fatto**: i campi `utenti.email`, `audit_log.before/after_data`, `appointments.{patient_name,phone,birth_date,notes,description}`, `list_entries.{patient_name,phone,birth_date,notes}` non sono leggibili nel `.db` senza `LUMIA_ENCRYPTION_KEY`. Vedi [08-server-config.md §8.7](08-server-config.md).

### M4.B1 — Guida deploy TLS + reverse proxy ✅

- **File**: [08-server-config.md §8](08-server-config.md)
- **Rischio**: 🟢
- **Definizione di fatto**: procedura nginx + Let's Encrypt + `LUMIA_HOST=127.0.0.1` + `SECURE_COOKIE=true` + `TRUSTED_PROXIES=127.0.0.1` + systemd unit + cron backup.

### M4.B2 — Backup automatico ✅

- **File**: `tools/backup.js` (nuovo), `package.json` (script `backup`)
- **Rischio**: 🟢
- **Modifica**: copia binaria + gzip in `$BACKUP_DIR/<label>-YYYYMMDD-HHmm.db.gz`, verifica con `PRAGMA integrity_check` su copia gunzippata, rotazione `BACKUP_KEEP` (default 30).
- **Definizione di fatto**: script eseguibile (`npm run backup`), output JSON con `status: ok` per ogni DB, integrity_check superato.

### M4.B3 — Health-check profondo ✅

- **File**: `src/routes.js`
- **Rischio**: 🟢
- **Modifica**: `/api/health` invariato (compat); nuovi `/api/health/lite` (liveness minimal) e `/api/health/deep` (DB principale + agenda + ultimo backup + memoria; 503 se un check fallisce).

### M4.B6 — Graceful drain corretto ✅

- **File**: `src/init.js`
- **Modifica**: shutdown ora chiama `server.close(cb)` PRIMA di chiudere i DB; nel callback invalida sessioni e chiude. Hard-exit fallback dopo `SHUTDOWN_GRACE_MS` (default 10s).

### M4.B8 — `AGENDA_DB_PATH` env ✅

- **File**: `app/agenda/db.js`
- **Modifica**: legge `AGENDA_DB_PATH` (assoluto o relativo al cwd), default invariato (`data/agenda.db`). Esporta `AGENDA_DB_PATH` per consumo da health-check e backup.

---

## Milestone V3.M5 — Polishing ✅

Tutte le voci pianificate sono state completate prima del go-live (zero deps esterne).

### M5.A16 — CSP nonce-based ✅

- **File**: `src/middleware/security-headers.js`, `src/http/static.js`.
- **Modifica**: opt-in via env `CSP_STRICT=true`. Genera nonce 16 byte base64 per request HTML, lo aggiunge al header CSP come `'nonce-XXX' 'strict-dynamic'` (al posto di `'unsafe-inline'`) e lo inietta automaticamente in tutti i tag `<script>` e `<style>` inline degli HTML serviti. Default: comportamento legacy invariato.
- **Definizione di fatto**: con `CSP_STRICT=true` il browser respinge inline script non annotati col nonce della response.

### M5.A23 — Password hashing scrypt ✅

- **File**: `app/auth/password.js` (riscritto), call site in `app/auth/routes.js`.
- **Modifica**: dual-algo PBKDF2 (legacy) + scrypt (default). Autodetect via prefisso `$scrypt$N$r$p$saltHex$hashHex`. Parametri OWASP 2024 (N=32768, r=8, p=1). `rehashIfNeeded()` migra al primo login (mai downgrade). Vedi [§8.8](08-server-config.md).
- **Definizione di fatto**: nuovi utenti vengono creati con scrypt; utenti pbkdf2 esistenti continuano a loggare e vengono ri-hashati al primo login successivo.

### M5.B4 — Endpoint `/api/metrics` Prometheus ✅

- **File nuovi**: `src/lib/metrics.js`. **File modificati**: `src/routes.js`, `src/http/request-handler.js`.
- **Modifica**: implementazione builtin (Counter/Gauge/Histogram, formato text v0.0.4, zero deps). Hook in `res.end` per registrare `lumia_http_requests_total` e `lumia_http_request_duration_ms`. Esposto pubblicamente su `GET /api/metrics`.
- **Definizione di fatto**: `curl /api/metrics` restituisce `# TYPE lumia_http_requests_total counter` + valori; `prometheus_node_exporter`-compatibile.

### M5.B9 — Paginazione default ✅

- **File nuovi**: `src/lib/pagination.js`. **File modificati**: `app/admin/routes.js`.
- **Modifica**: `parsePagination(ctx, {default_size, max_size})` accetta sia `?page=&page_size=` sia `?limit=&offset=`. `paginated(items, total, page, page_size)` ritorna oggetto standard. Defaults: 50/200. Applicato a `admin/utenti` e `admin/audit-logs`.

### M5.B10 — API versioning ✅

- **File**: `src/http/request-handler.js`.
- **Modifica**: il prefisso `/api/v1/...` è alias trasparente di `/api/...` (rewrite, zero duplicazione di route). `req.originalUrl` preservato per i log.

### M5.B11 — OpenAPI spec ✅

- **File**: `openapi.yaml` (root).
- **Modifica**: spec OpenAPI 3.1 minimale per gli endpoint stabili (system, auth, diagnostic, scores, therapy, admin). Documenta paginazione, auth a sessione+CSRF, alias `/api/v1`.

---

## Tracking modifiche

Le modifiche effettive ai file sono tracciate in [12-changelog.md](12-changelog.md), una entry per voce, con diff sintetico e data.
