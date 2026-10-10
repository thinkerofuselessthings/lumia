# 12 — Changelog interventi V3 (server hardening)

> Append-only. Una entry per voce della roadmap, in ordine cronologico.
> Format: `[YYYY-MM-DD] [Mx.Ay] Titolo` + file impattati + diff sintetico + esito test.

---

## Milestone V3.M1 — Hardening immediato

### [2026-04-19] [M1.A1] Proteggere `/api/config`
- **File**: `src/routes.js`, `app/shell/shell-init.js`, `tests/stress-test.js`
- **Diff**: handler `GET /api/config` con `auth: true` e response senza `apiKey`. Shell smette di fetchare e mostrare la chiave (placeholder `"— (cookie session)"`). Stress test marca lo scenario come `authed:true` e passa header `X-API-Key`.
- **Esito**: `curl /api/config` senza cookie → 401. Login + boot shell continuano a funzionare.

### [2026-04-19] [M1.A2] `/api/log` admin-only
- **File**: `src/routes.js`, `app/shell/shell-init.js`
- **Diff**: handler `GET /api/log` con `{ auth: true, role: "admin" }`. Shell rimuove header `X-API-Key`, usa `credentials: 'same-origin'` e ignora silenziosamente 403.
- **Esito**: utenti non admin → 403, admin → entries.

### [2026-04-19] [M1.A3] CSRF copre PATCH
- **File**: `src/middleware/auth-gate.js` (riga ~57)
- **Diff**: array metodi state-changing aggiornato a `["POST","PUT","PATCH","DELETE"]`.
- **Esito**: `PATCH /api/agenda/...` senza `X-CSRF-Token` → `AUTH_CSRF_INVALID`.

### [2026-04-19] [M1.A4] CORS Allow-Methods include PATCH
- **File**: `src/middleware/cors.js`
- **Diff**: header `Access-Control-Allow-Methods` aggiornato.

### [2026-04-19] [M1.A14] `.catch` su `init.js` IIFE
- **File**: `src/init.js`
- **Diff**: aggiunto `.catch((err) => { console.error('[FATAL]', err); process.exit(1); })`.
- **Esito**: errori bootstrap loggati esplicitamente.

### [2026-04-19] [M1.A19] CSRF token full 64 hex
- **File**: `src/middleware/csrf.js`
- **Diff**: rimosso `.slice(0, 32)`.
- **Note**: utenti con sessione attiva al deploy devono ri-loggare (CSRF cambia).

### [2026-04-19] [M1.A18] CORS no `localhost` in produzione
- **File**: `src/middleware/cors.js`
- **Diff**: `localhost` ammesso solo se `NODE_ENV !== "production"`.

### [2026-04-19] [M1.A20] `SECURE_COOKIE` default true in produzione
- **File**: `src/middleware/cookies.js`
- **Diff**: default dinamico basato su `NODE_ENV`. Override esplicito via env preservato.

### [2026-04-19] [M1.A22] `/api/auth/check-user` constant response
- **File**: `app/auth/routes.js`
- **Diff**: rimossa query `SELECT id, attivo FROM utenti`. Risposta sempre `{ exists: true }`. Audit `auth.check` aggiunto per detection.
- **Note**: backward compat con flusso 2-step di `public/login.html`. Login resta unico arbitro.

### [2026-04-19] [M1] Doc sync
- **File**: `docs/v3/server/{03,04,07,08}-*.md`
- **Diff**: tabelle e snippet aggiornati con marker `V3.M1.Ax`.

---

## Milestone V3.M2 — Auth & sessione di livello gestionale

### [2026-04-19] [M2.A6] Lockout per account
- **File**: `src/db/schema.js`, `src/errors/codes.js`, `app/admin/users.js`, `app/admin/routes.js`, `app/auth/routes.js`
- **Diff**:
  - schema: migrazione idempotente (`PRAGMA table_info`) → aggiunte colonne `tentativi_falliti INTEGER DEFAULT 0`, `bloccato_fino_il TEXT` su `utenti`;
  - nuovo errore `AUTH_ACCOUNT_LOCKED` (HTTP 423);
  - helper `isUserLocked / recordFailedLogin / resetLoginFailures / unlockUtente` in `app/admin/users.js`;
  - login: blocca con `AUTH_ACCOUNT_LOCKED` se `bloccato_fino_il > now`; incrementa contatore su fail; reset su success;
  - nuovo endpoint admin `POST /api/admin/utenti/:id/unlock` per sblocco manuale;
  - parametri env: `LOCKOUT_THRESHOLD` (default 5), `LOCKOUT_WINDOW_MS` (default 15 min).
- **Esito**: 5 login falliti consecutivi → DB persiste `tentativi_falliti=5` + `bloccato_fino_il=ISO`. Reset diretto da DB OK.

### [2026-04-19] [M2.A7] Multi-session per dispositivo
- **File**: `app/auth/sessions.js`, `app/auth/routes.js`
- **Diff**:
  - `createSession` non invalida più tutte le sessioni precedenti: applica un cap `MAX_SESSIONS_PER_USER` (default 5) e invalida le più vecchie quando viene superato;
  - nuovo `listUserSessions(userId)` e `revokeUserSession(userId, sessionId)` (verifica ownership);
  - nuovo `invalidateOtherSessions(userId, keepToken)` per change-password;
  - nuovi endpoint `GET /api/auth/sessions` (lista propria, marca `is_current`) e `DELETE /api/auth/sessions/:id` (richiede CSRF);
  - `createSession` restituisce anche `id` della nuova sessione.

### [2026-04-19] [M2.A5] Enforcement `forza_cambio_password` + endpoint change-password
- **File**: `app/auth/sessions.js`, `app/auth/routes.js`, `src/middleware/auth-gate.js`, `src/errors/codes.js`
- **Diff**:
  - `getSessionByToken` JOIN aggiornato per esporre `forza_cambio_password`;
  - login risponde `must_change_password: true|false`;
  - `check` espone lo stesso flag;
  - nuovo `POST /api/auth/change-password { old_password, new_password }` (richiede session + CSRF): verifica vecchia, hash nuova (PBKDF2 600k), `forza_cambio_password=0`, reset contatori lockout, invalida tutte le altre sessioni;
  - nuovi errori: `AUTH_PASSWORD_CHANGE_REQUIRED` (403), `AUTH_PASSWORD_REUSE` (400);
  - `enforceAuth` blocca tutte le rotte protette (auth-gated) con `AUTH_PASSWORD_CHANGE_REQUIRED` finché la flag è attiva (le rotte `auth/*` sono già auth-disabled e gestiscono internamente la sessione).

### [2026-04-19] [M2.A13] `deleteUtente`: protezione su ruolo + last-admin
- **File**: `app/admin/users.js`, `app/admin/routes.js`, `src/errors/codes.js`
- **Diff**:
  - check sostituito: `user.ruolo === 'admin'` invece di `user.username === 'admin'` (la rinomina dell'admin non disabilita più la protezione);
  - prima della delete di un admin: `COUNT(*) FROM utenti WHERE ruolo='admin' AND attivo=1 AND id != ?` ≥ 1, altrimenti throw `LAST_ADMIN_PROTECTED` (HTTP 409);
  - `getAllUtenti`/`getUtenteById` esposti anche con `tentativi_falliti` e `bloccato_fino_il`.

### [2026-04-19] [M2] Doc sync
- **File**: `docs/v3/server/{04,05,07,08}-*.md`
- **Diff**: aggiornate tabelle endpoint, schema `utenti` con colonne lockout, riferimenti env (`MAX_SESSIONS_PER_USER`, `LOCKOUT_THRESHOLD`, `LOCKOUT_WINDOW_MS`), elenco audit actions.

---

## Milestone V3.M3 — Audit, log, compliance

### [2026-04-19] [M3.A8] `client-ip.js` + `TRUSTED_PROXIES`
- **File**: nuovo `src/http/client-ip.js`; `src/middleware/auth-gate.js`, `src/routes.js`, `app/auth/routes.js` (5 punti)
- **Diff**: nuovo helper `getClientIp(req)` che usa `req.socket.remoteAddress` (normalizzato `::ffff:`) e legge `X-Forwarded-For` solo se l'IP del socket è in `TRUSTED_PROXIES` (CSV di IP esatti). Sostituiti tutti i `req.socket?.remoteAddress` espliciti con `getClientIp(req)`.
- **Env**: `TRUSTED_PROXIES` (default `""` — nessun proxy fidato).
- **Esito**: dietro nginx con `TRUSTED_PROXIES=127.0.0.1`, `audit_log.ip` riporterà l'IP reale del client; senza configurazione il comportamento resta identico (no spoofing).

### [2026-04-19] [M3.A21] Sanitizzazione `apiLog`
- **File**: `src/routes.js`
- **Diff**: `apiLog.push` ora applica `sanitizeForLog` ricorsivo su `entry.input`, sostituendo con `[REDACTED]` le chiavi sensibili (`password`, `old_password`, `new_password`, `token`, `csrf_token`, `secret`, `api_key`, `apiKey`, `authorization`, `cookie`, `session`).
- **Esito**: le entry nel ring buffer non contengono più credenziali grezze.

### [2026-04-19] [M3.A10] Schedule `pruneAuditLogs`
- **File**: `src/init.js`
- **Diff**: dopo `cleanupSessions`, prune subito al boot (best-effort) + `setInterval(24h)` con `.unref()`. Cleared in shutdown. Errori loggati via `log.error`.
- **Env**: `AUDIT_RETENTION_DAYS` (default 365).

### [2026-04-19] [M3.B5] Logger JSON-line
- **File**: nuovo `src/lib/logger.js`; `src/http/request-handler.js`, `src/init.js`
- **Diff**: API minimale `log.info/warn/error({ msg, ...fields })`. In TTY: output compatto leggibile. In non-TTY: JSON-line per riga (parsabile con `jq`). `request-handler` usa `log.info({ msg: "api.request", method, url, status, ms })`. Init usa `log.info({ msg: "server.listen", host, port })` e `log.error({ msg: "bootstrap.failed", err })`.
- **Esito**: `node src/init.js | jq` parsea ogni riga.

### [2026-04-19] [M3.A12] `created_by`/`updated_by` su tabelle agenda
- **File**: `app/agenda/db.js`, `app/agenda/models/appointment.js`, `app/agenda/models/list-entry.js`, `app/agenda/controllers/appointments.js`, `app/agenda/controllers/list-entries.js`
- **Diff**:
  - migrazione idempotente (`PRAGMA table_info`) → `appointments.created_by/updated_by`, `list_entries.created_by/updated_by` (INTEGER NULL);
  - statement INSERT/UPDATE/move estesi nei due model;
  - `model.create/update/move` accettano `userId` come secondo/terzo parametro (default `null`, retro-compatibile);
  - controller usano `ctx.session?.utente_id || null` invece dell'header **insicuro** `x-user-id` (5 sostituzioni);
- **Esito**: nuovi appuntamenti/entry nascono con `created_by` valorizzato all'utente di sessione; le righe storiche restano `NULL`.

### [2026-04-19] [M3.A11] Unificazione `audit_log` + `audit_trail`
- **File**: `src/db/schema.js`, `src/db/audit.js`, `app/agenda/models/audit.js`
- **Diff**:
  - migrazione idempotente: `audit_log` ora ha anche `target_table TEXT`, `target_id INTEGER`, `before_data TEXT`, `after_data TEXT`;
  - nuovo `logChange(table, id, action, before, after, ctx)` in `src/db/audit.js`. `azione` normalizzata a `data.<table>.<insert|update|delete>`;
  - `app/agenda/models/audit.js::log(...)` ora delega a `logChange` (firma legacy preservata). Nuovo `logWithCtx(table, id, action, before, after, httpCtx)` per popolare `ip`/`method`/`path`;
  - `audit_trail` in `agenda.db` non è più scritto: resta come tabella legacy (storico). **Nessun backfill** (i record vecchi restano in `audit_trail`).
- **Esito**: una singola `SELECT * FROM audit_log` su `lumia.db` ritorna sia eventi auth (`auth.login.*`, `csrf.*`) sia mutazioni di dato (`data.appointments.insert`, `data.list_entries.delete`, …).
- **Note**: per uniformità futura: aggiornare i controller agenda ai punti più sensibili per usare `audit.logWithCtx(table, id, action, before, after, ctx)` (oggi viene chiamato `audit.log(...)` che perde ip/method/path).

### [2026-04-19] [M3] Doc sync
- **File**: questo changelog + `11-roadmap.md` (M3 voci ✅).

---

## Milestone V3.M4 — Operativo e produzione

### [2026-04-21] [M4.B8] `AGENDA_DB_PATH` env
- **File**: `app/agenda/db.js`
- **Diff**: `DB_PATH` ora deriva da `env('AGENDA_DB_PATH')` (assoluto o relativo a `process.cwd()`), default invariato `data/agenda.db`. Esportato come `AGENDA_DB_PATH` in `module.exports` per consumo da `health/deep` e backup.
- **Env**: `AGENDA_DB_PATH` (default `data/agenda.db`).
- **Esito**: smoke boot OK, `[Agenda DB] Database ready: …\data\agenda.db` invariato col default.

### [2026-04-21] [M4.B6] Graceful drain corretto
- **File**: `src/init.js`
- **Diff**: shutdown handler riscritto. Ora chiama `server.close(cb)` PRIMA di chiudere i DB; nel callback invalida sessioni (`UPDATE sessioni SET valida=0`) e chiude `db`. Hard-exit di sicurezza dopo `SHUTDOWN_GRACE_MS` (default 10s, prima 3s). Timer `cleanupTimer`/`auditPruneTimer` clearati subito.
- **Env**: `SHUTDOWN_GRACE_MS` (default 10000).
- **Esito**: `kill -TERM` non interrompe più richieste in volo; ultimo log `shutdown.complete` confermato.

### [2026-04-21] [M4.B3] Health-check profondo
- **File**: `src/routes.js`
- **Diff**: aggiunti due endpoint (auth: false):
  - `GET /api/health/lite` → `{ ok:true, uptime }` — liveness probe (no side-effect, no query DB).
  - `GET /api/health/deep` → ping `SELECT 1` su `lumia.db` e `agenda.db` (con `path`, `size_bytes`), ultimo backup in `data/backups/` (`file`, `mtime`, `size_bytes`, `count`), `process.memoryUsage()`. Restituisce **HTTP 503** se un check fallisce.
  - `GET /api/health` originale invariato (compat con shell).
- **Esito**: smoke `curl /api/health/deep` → `{ ok:true, checks:{ db:{ok:true}, agenda_db:{ok:true}, last_backup:{file:"agenda-…db.gz",count:2}, memory:{…} } }`.

### [2026-04-21] [M4.B2] Backup automatico
- **File**: `tools/backup.js` (nuovo), `package.json` (script `backup`)
- **Diff**: nuovo script standalone. Carica `.env`, copia binaria + gzip in `$BACKUP_DIR/<label>-YYYYMMDD-HHmm.db.gz` per ciascuno di `lumia.db` e `agenda.db`, verifica con `PRAGMA integrity_check` su copia gunzippata, rotazione `BACKUP_KEEP` snapshot per label (più vecchi cancellati). Output JSON-line per consumo log.
- **Env**: `BACKUP_DIR` (default `data/backups`), `BACKUP_KEEP` (default 30).
- **Note operative**: sql.js usa debounce 500ms su `_save()` → preferire cron quando il server non scrive intensamente. Per snapshot a caldo perfetti servirebbe SQLCipher/better-sqlite3 con backup API (vedi A9).
- **Esito**: `npm run backup` → entrambi i DB archiviati e verificati (`status: ok`), rotazione operativa.

### [2026-04-21] [M4.B1] Guida deploy TLS + reverse proxy (doc)
- **File**: `docs/v3/server/08-server-config.md` (sezione 8 nuova)
- **Diff**: aggiunte sottosezioni: 8.1 architettura nginx→loopback, 8.2 env obbligatorie produzione, 8.3 snippet nginx (TLS + HSTS + headers + allow-list su `health/deep`), 8.4 unit systemd (con `TimeoutStopSec` coordinato a `SHUTDOWN_GRACE_MS`), 8.5 cron backup giornaliero + wrap GPG, 8.6 mappa endpoint health, 8.7 nota su cifratura at-rest (workaround volume-level).
- **Esito**: doc-only, no codice.

### [2026-04-21] [M4.A9] Cifratura DB at-rest — bloccata (superata da entry M5 sotto)
- **Decisione iniziale**: la migrazione a SQLCipher implica abbandonare `sql.js` (WASM puro) per `better-sqlite3 + sqlcipher binding`, perdendo portabilità e introducendo dipendenza nativa pesante. In assenza di alternative pratiche per MVP, marcata come "bloccata" in roadmap con workaround volume-level (BitLocker/LUKS).
- **Stato**: superata dalla decisione finale del 2026-04-21 (vedi entry M4.A9 in M5 sotto): adottata field-level encryption builtin, A9 ora ✅.

### [2026-04-21] [M4] Doc sync
- **File**: `08-server-config.md` (env table + §8 deploy), `11-roadmap.md` (M4 voci ✅), questo changelog.

---

## Milestone V3.M5 — Polishing pre-go-live

### [2026-04-21] [M4.A9] Cifratura at-rest — field-level encryption (sblocca M4.A9)
- **Decisione finale**: scartato cambio motore DB (vincolo: no native modules, no download npm). Adottata **field-level encryption AES-256-GCM** via `crypto` builtin. Mantiene `sql.js`, mantiene indici, cifra solo PII/clinici.
- **File nuovi**: `src/lib/field-crypto.js` (~135 righe), `tools/encrypt-existing.js` (~125 righe), script `npm run encrypt-existing`.
- **File modificati**: `app/agenda/models/appointment.js` (`ENC_FIELDS=['patient_name','phone','birth_date','notes','description']`, helper `_encIn`/`_decOut`/`_decRows`); `app/agenda/models/list-entry.js` (idem, no `description`); `app/admin/users.js` (cifra `email` su INSERT/UPDATE, decifra su SELECT); `src/db/audit.js` (cifra `before_data`/`after_data` JSON-stringified); `app/auth/sessions.js` (`safeDecField` su `getSessionByToken` post-join); `app/auth/routes.js` (decifra email login response).
- **Formato wire**: `enc:v1:<base64(iv12 ‖ tag16 ‖ ciphertext)>`. Stringhe non prefissate ritornate as-is (back-compat per righe legacy + SELECT idempotente).
- **Env**: `LUMIA_ENCRYPTION_KEY` (hex 64ch o base64 44ch) **oppure** `LUMIA_ENCRYPTION_PASSPHRASE` (deriva via scrypt + salt persistente `data/.enc_salt` mode 0o600).
- **Migrazione**: `npm run encrypt-existing -- --dry-run` stima righe; senza flag esegue (transazione per tabella, idempotente, salta righe già cifrate).
- **Smoke**: roundtrip `encField('Mario Rossi') → enc:v1:0hbI… → 'Mario Rossi'` ✅; `decField('plain text')` → `'plain text'` (legacy) ✅; dry-run su DB reale: 2 utenti + 2 appointments (6 campi) + 17 list_entries (34 campi) ✅; boot con key attiva → `/api/health/deep` db=true agenda=true ✅.
- **Doc**: `08-server-config.md §8.7` riscritta (sezione field-level + tabella campi + procedura migrazione).

### [2026-04-21] [M5.A23] Password hashing scrypt
- **File**: `app/auth/password.js` (riscritto), `app/auth/routes.js` (call site `rehashIfNeeded` esteso a 4 argomenti).
- **Diff**: dual-algo PBKDF2 (legacy) + scrypt (default V3.M5). Autodetect via prefisso del campo `password_hash`: scrypt se inizia con `$scrypt$`, altrimenti pbkdf2. Funzioni `_isScryptHash`, `_hashScrypt`, `_verifyScrypt`. Parametri OWASP 2024 (N=32768, r=8, p=1, ~32MB). `rehashIfNeeded(userId, password, currentIterations, currentHash)` mai downgrade scrypt→pbkdf2.
- **Env**: `PASSWORD_ALGO` (default `scrypt`), `SCRYPT_N=32768`, `SCRYPT_R=8`, `SCRYPT_P=1`, `SCRYPT_KEYLEN=64`, `SCRYPT_MAXMEM=268435456`.
- **Esito**: utenti pbkdf2 esistenti continuano a loggare; al primo login successivo vengono ri-hashati con scrypt e salvati. Nuovi utenti creati direttamente con scrypt.

### [2026-04-21] [M5.B10] Versioning `/api/v1/` alias
- **File**: `src/http/request-handler.js`.
- **Diff**: il prefisso `/api/v1/...` viene riscritto in `/api/...` prima del routing (zero duplicazione di route). `req.originalUrl` preservato per i log d'accesso.
- **Esito**: `GET /api/v1/health` → 200 (idem `GET /api/health`). Smoke ✅.

### [2026-04-21] [M5.B9] Paginazione default
- **File nuovi**: `src/lib/pagination.js` (~50 righe). **Modificati**: `app/admin/routes.js`.
- **Diff**: `parsePagination(ctx, {default_size:50, max_size:200})` accetta sia `?page=&page_size=` sia `?limit=&offset=` e applica i tetti hard. `paginated(items, total, page, page_size)` ritorna `{items, page, page_size, total, total_pages}`. Applicato a `admin/utenti` (slice in-memory) e `admin/audit-logs` (limit/offset DB).

### [2026-04-21] [M5.B4] Endpoint `/api/metrics` Prometheus
- **File nuovi**: `src/lib/metrics.js` (~145 righe). **Modificati**: `src/routes.js` (route pubblica, `auth: false`, `Content-Type: text/plain; version=0.0.4`), `src/http/request-handler.js` (hook `metrics.recordHttp(...)` in `res.end` override).
- **Diff**: implementazione builtin Counter/Gauge/Histogram. Pre-registrati `lumia_http_requests_total{method,status_class}`, `lumia_http_request_duration_ms{method,status_class}` (bucket 5..5000ms), `lumia_process_start_time_seconds`/`uptime_seconds`/`memory_rss_bytes`/`memory_heap_used_bytes`. Zero deps esterne.
- **Esito**: `curl /api/metrics` → output text v0.0.4 valido, counter incrementa correttamente per ogni request HTTP. Smoke ✅.

### [2026-04-21] [M5.A16] CSP nonce-based opt-in
- **File**: `src/middleware/security-headers.js` (aggiunte `generateCspNonce()` + parametro `{nonce}` su `applyCsp`), `src/http/static.js` (per `.html`: genera nonce, applica CSP con nonce, regex-inietta `nonce="…"` in `<script>` e `<style>` inline non già annotati).
- **Env**: `CSP_STRICT` (default `false`). Quando `true`: CSP usa `'nonce-XXX' 'strict-dynamic'` al posto di `'unsafe-inline'`.
- **Default**: comportamento legacy invariato (shell continua a funzionare). Strict da abilitare quando il client è pronto a gestire i nonce.

### [2026-04-21] [M5.B11] OpenAPI spec
- **File**: `openapi.yaml` (root, nuovo).
- **Diff**: spec OpenAPI 3.1 minimale. Coperti: system (`/health`, `/health/lite`, `/health/deep`, `/metrics`, `/config`), auth (`/auth/login`, `/logout`, `/me`, `/change-password`), engine (`/diagnostic/{key}`, `/scores[/{key}]`, `/therapy[/{key}]`), admin (`/admin/utenti`, `/admin/audit-logs` con paginazione). Documenta cookie session + CSRF + alias `/api/v1`.

### [2026-04-21] [M5] Doc sync
- **File**: `08-server-config.md` (§3 nuova tabella crittografia/hashing, §5 file generati `.enc_salt`, §8.7 riscritta field-level, §8.8 scrypt, §8.9 CSP strict, §8.10 metrics, §8.11 versioning), `11-roadmap.md` (M4.A9 ✅, M5 tutte ✅), questo changelog.