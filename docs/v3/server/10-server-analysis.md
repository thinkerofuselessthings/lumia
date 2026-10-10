# 10 — Server: Analisi, punti deboli, bug, roadmap di hardening

> **Scopo del documento**: portare l'attuale server LUMIA dal livello "PoC funzionante in LAN" al livello "**gestionale clinico per dati sensibili sanitari**" (paziente identificabile, dati di terapia, eventualmente trasfusionali).
> **Riferimento normativo target**: GDPR (artt. 5/9/25/30/32), AgID Misure Minime di Sicurezza ICT, ISO/IEC 27001, OWASP ASVS L2 (auth/sessione/logging).
> **Stato attuale**: il server è solido come architettura ma ha **diverse falle reali** (alcune già "exploitable") da chiudere prima di toccare PII vere.

Le voci sono numerate **per priorità decrescente** (P0 = bloccante, P1 = alto, P2 = medio, P3 = basso/migliorativo). Ogni voce indica file/righe coinvolti e una proposta concreta.

---

## A. Bug e vulnerabilità reali (presenti **oggi** nel codice)

### A1 — `[P0] /api/config espone l'API key in chiaro a chiunque`

**File**: `src/routes.js` (handler `GET /api/config`).

L'endpoint è registrato con `{ auth: false }` e ritorna:

```json
{ "host": "...", "port": 3500, "apiKey": "<chiave segreta>", "wsEnabled": false }
```

Chiunque possa raggiungere il server (LAN, port-forward, container exposed) può fare `curl http://lumia:3500/api/config` e ottenere la chiave che dà accesso completo a **tutte** le API protette via `X-API-Key` (bypass totale di sessione/CSRF/role).

**Fix**:

- spostare `apiKey` fuori dalla risposta;
- cambiare `auth: false` → `auth: true, role: "admin"`;
- mantenere `/api/health` come unico endpoint pubblico per le check di liveness;
- esporre due endpoint separati: `/api/health` (no auth, info minime) e `/api/admin/config` (admin only, contiene anche `apiKey`).

### A2 — `[P0] /api/log espone log API in chiaro`

**File**: `src/routes.js` (handler `GET /api/log`).

`auth: false`. Ritorna l'ultima ring-buffer `apiLog` (max 500 entries) che include i campi `input` di scoring/diagnostic. Oggi sono soli numeri/marker; in futuro potrebbero contenere `patient_id`, `body` di POST, ecc. Già oggi rivela quali endpoint sono stati chiamati e da chi (nessuna sanitizzazione).

**Fix**:

- proteggere con `{ auth: true, role: "admin" }`;
- mai loggare body completi nella ring buffer (solo metodo, path, status, durata, hash dei parametri);
- valutare se sostituire la ring buffer con scrittura su `audit_log` DB.

### A3 — `[P0] CSRF non viene validato sui metodi PATCH`

**File**: `src/middleware/auth-gate.js` linee 56-60.

```js
if (["POST", "PUT", "DELETE"].includes(method)) { … }
```

`PATCH` non è incluso. Però il modulo Agenda usa `PATCH` per **operazioni state-changing**:

- `PATCH /api/agenda/appointments/reorder`
- `PATCH /api/agenda/appointments/:id/move`
- `PATCH /api/agenda/appointments/:id/status`
- `PATCH /api/agenda/list-entries/:id/promote`
- `PATCH /api/agenda/list-entries/:id/status`

Risultato: **un sito malevolo che l'utente visita mentre è loggato in LUMIA può fare CSRF su tutte queste route**, perché:

- il browser invia automaticamente il cookie `session` (`SameSite=Strict` mitiga, ma `Strict` consente comunque richieste con metodo "non-safe" da contesti same-origin se l'utente apre LUMIA prima),
- la sessione è valida,
- il CSRF token non è richiesto.

**Fix immediato** (1 riga):

```js
if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) { … }
```

### A4 — `[P0] CORS Allow-Methods non include PATCH`

**File**: `src/middleware/cors.js` linea 17.

```js
res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
```

Mancano `PATCH` (e altre eventuali). Conseguenza: una pagina servita su `localhost:<porta>` differente dal server non può fare le `PATCH` agenda da browser (preflight fallisce). Bug funzionale non di sicurezza. In ambiente attuale (UI servita stesso-origin) non si manifesta, ma rompe i test cross-origin.

**Fix**: aggiungere `PATCH`.

### A5 — `[P1] La flag forza_cambio_password viene scritta ma mai letta`

**File**: `app/admin/users.js` (write), `app/auth/routes.js` (login: read mancante).

Il seed admin (`app/auth/seed.js`) e `resetPasswordUtente` impostano `forza_cambio_password = 1`. **Nessun handler controlla mai questa flag**: l'utente loggato accede normalmente come se la password fosse stata cambiata.

**Fix**:

- in `POST /api/auth/login`, se `user.forza_cambio_password === 1` → ritornare comunque successo ma con `must_change_password: true`;
- bloccare tutti gli altri endpoint (eccetto `auth/change-password`) finché non viene chiamato un nuovo `POST /api/auth/change-password` (che resetta la flag).

### A6 — `[P1] Nessun lockout a livello account`

**File**: `app/auth/routes.js` (handler login).

Il `loginLimiter` rate-limita per **IP**, non per **utente**. Un attaccante che ruota IP (TOR/proxy/VPN) può fare brute-force su un utente specifico senza limite. Inoltre, lockout per IP solo "5/15min" significa che una rete NAT (es. ospedale con NAT pubblico) blocca **tutti** gli utenti dietro lo stesso IP.

**Fix**:

- aggiungere contatore `failed_login_count` su `utenti` con timestamp `bloccato_fino_il`;
- dopo N (5–10) tentativi falliti consecutivi, bloccare l'**account** per X minuti;
- rilasciare il blocco al primo login riuscito;
- `loginLimiter` per IP resta come prima difesa.

### A7 — `[P1] Single-session forzata = utente non può lavorare su più dispositivi`

**File**: `app/auth/sessions.js::createSession()`.

```js
db.prepare("UPDATE sessioni SET valida = 0 WHERE utente_id = ? AND valida = 1").run(utenteId);
```

Ad ogni login viene **invalidata ogni sessione precedente**. In un gestionale clinico è molto comune che un medico abbia LUMIA aperto su PC ambulatorio + tablet di reparto + smartphone: con la logica attuale, il login da un dispositivo butta fuori gli altri.

**Fix**:

- consentire N sessioni concorrenti (configurabile, default 3);
- esporre `GET /api/auth/sessions` (lista dispositivi/IP) e `DELETE /api/auth/sessions/:id` (revoca singola) — pattern "Active sessions" classico.

### A8 — `[P1] Nessun trust-proxy / X-Forwarded-For`

**File**: `src/http/request-handler.js`, `src/middleware/auth-gate.js`, `app/auth/routes.js` — ovunque si legga `req.socket.remoteAddress`.

In produzione il server **deve** stare dietro un reverse proxy (nginx/traefik/Caddy) per TLS. Tutti gli IP visti diventano quello del proxy (`127.0.0.1`):

- rate-limiter per IP diventa **inutile** (un'unica chiave per tutti),
- audit_log perde l'IP reale del client (compliance GDPR/AgID compromessa).

**Fix**:

- introdurre `TRUSTED_PROXIES` (lista CIDR);
- quando `req.socket.remoteAddress` è in lista, leggere il primo IP da `X-Forwarded-For`;
- centralizzare in `src/http/client-ip.js` e usarlo ovunque al posto di `req.socket.remoteAddress`.

### A9 — `[P1] DB SQLite non cifrato at-rest`

**File**: `data/lumia.db`, `data/agenda.db`.

I file SQLite sono in chiaro. Chiunque acceda al filesystem (operatore datacenter, backup non cifrato, snapshot Docker) può leggere `audit_log`, `sessioni` (token attivi → session hijack offline), e tutti i dati paziente.

**Fix** (uno di):

1. **Cifratura volume** (LUKS, BitLocker) — più semplice, copre tutto il disco;
2. **SQLCipher** — sostituisce `sql.js` con `sql.js` build-cifrata o passare a `better-sqlite3-multiple-ciphers`;
3. **Field-level encryption** per i campi PII più sensibili (CF, diagnosi, indicazione trasfusionale) tramite `crypto.createCipheriv`.

Decidere prima il modello di trust del filesystem.

### A10 — `[P1] Nessun cleanup automatico di audit_log`

**File**: `src/db/audit.js::pruneAuditLogs()` esiste ma **non è agganciato** a un timer.

Risultato: la tabella cresce indefinitamente. In un gestionale con ~1000 richieste/giorno → ~365k righe/anno solo da `audit_log`, più quelle di `audit_trail` (agenda).

**Fix**:

- in `src/init.js`, aggiungere `setInterval(pruneAuditLogs, 24 h).unref()`;
- esporre la stessa funzione anche come comando CLI (`node src/cli/prune-audit.js`).

### A11 — `[P1] Doppia tabella di audit non integrata`

**File**: `src/db/schema.js::audit_log` (lumia.db) vs `app/agenda/db.js::audit_trail` (agenda.db).

Sono **due meccanismi paralleli** che tracciano cose diverse:

- `audit_log` (lumia.db): autenticazione, admin, accessi → log di sicurezza;
- `audit_trail` (agenda.db): INSERT/UPDATE/DELETE su tabelle agenda → log applicativo con `old_data`/`new_data`.

Per la compliance GDPR (art. 30 — registro dei trattamenti) serve un **report unificato** di tutte le operazioni su PII. Oggi un audit completo richiede join cross-DB impossibili in SQLite.

**Fix**:

- unire la logica di `audit_trail` in `audit_log` (oppure spostare `audit_log` dentro `agenda.db`);
- standardizzare lo schema (action, actor, target_table, target_id, before, after, ip, ua, ts).

### A12 — `[P1] Nessun campo created_by/updated_by sulle tabelle agenda`

**File**: `app/agenda/db.js`.

Le tabelle `appointments`, `lists`, `list_entries`, `services`, `transfusion_requests`, ecc. non hanno colonne `created_by_user_id` / `updated_by_user_id`. Si può ricostruire dal `audit_trail` ma è uno scan O(n).

**Fix**: aggiungere `created_by INTEGER REFERENCES utenti(id)` e `updated_by` su tutte le tabelle che contengono PII paziente. Migrazione idempotente come M1/M2.

### A13 — `[P2] deleteUtente protegge solo username 'admin' letterale`

**File**: `app/admin/users.js::deleteUtente()`.

```js
if (user.username === "admin") return false; // protect seed admin
```

Se l'admin viene rinominato tramite `updateUtente`, questa protezione si **disabilita**. Inoltre non c'è verifica che esista almeno un altro admin attivo prima della cancellazione (lockout amministrativo possibile).

**Fix**:

- proteggere chi ha `ruolo='admin'` invece dello username;
- prima di eliminare un admin, verificare che `COUNT(*) WHERE ruolo='admin' AND attivo=1 > 1`.

### A14 — `[P2] init.js senza .catch sull'IIFE async`

**File**: `src/init.js` — `(async () => { … })();` senza `.catch`.

Se `initDatabase`, `initAgendaDb`, `seedAdminUser` o `loadEngines` rigetta, viene generato un `unhandledRejection` (in Node ≥ 15 il processo termina con codice 1 ma senza messaggio chiaro).

**Fix**:

```js
(async () => { … })().catch(err => {
  console.error("[FATAL] Bootstrap failed:", err);
  process.exit(1);
});
```

### A15 — `[P2] body-parser concatena chunk come stringa`

**File**: `src/http/body-parser.js` linea 35: `body += chunk`.

Funziona ma converte ogni chunk Buffer in stringa **con encoding di default**. Per body grandi e multi-byte (UTF-8) può causare:

- spreco di memoria (concatenazione di stringhe immutabili → re-allocation O(n²)),
- in casi rari, chunk spezzato a metà di un code point UTF-8.

**Fix**: accumulare `Buffer[]` e fare `Buffer.concat(...).toString('utf-8')` alla fine.

### A16 — `[P2] CSP con 'unsafe-inline' per script e style`

**File**: `src/middleware/security-headers.js::applyCsp()`.

```
script-src 'self' 'unsafe-inline' …
style-src  'self' 'unsafe-inline' …
```

`'unsafe-inline'` annulla buona parte della protezione XSS della CSP. È necessario perché molti moduli LUMIA inseriscono `<script>` / `<style>` inline.

**Fix** (richiede refactoring lato client):

- introdurre un `nonce` per request (generato in `applyCsp`, iniettato in tutti gli inline `<script nonce="…">`);
- in alternativa, raccogliere gli inline in file esterni `.js`/`.css`.

### A17 — `[P2] Nessuna validazione header Host`

**File**: `src/http/request-handler.js`, `src/middleware/cors.js`.

Il server non verifica mai `req.headers.host` contro una whitelist. Vulnerabilità potenziale a **host header injection** (cache poisoning, password reset poisoning se in futuro aggiungiamo email).

**Fix**: in `request-handler.js`, se `Host` non è in `ALLOWED_HOSTS` (env) → `400`.

### A18 — `[P2] CORS whitelist include localhost incondizionatamente`

**File**: `src/middleware/cors.js` linea 12.

```js
const isAllowed = origin === allowed || origin === `http://localhost:${PORT}`;
```

In produzione `localhost:3500` non dovrebbe essere ammesso (significa che chi accede al server localmente con un'altra app può inviare request cross-origin con cookie). Cumulato con `SameSite=Strict` il rischio è basso ma è **una superficie inutile**.

**Fix**: ammettere `localhost` solo se `NODE_ENV !== "production"`.

### A19 — `[P2] CSRF token solo 16 byte di output`

**File**: `src/middleware/csrf.js`.

```
HMAC-SHA256(secret, token).slice(0, 32)  // 32 hex chars = 16 byte = 128 bit
```

128 bit di entropia sono adeguati ma il taglio è arbitrario. Conviene usare i 32 byte interi (64 hex chars) per allinearsi a OWASP CSRF Cheat Sheet.

**Fix**: rimuovere `.slice(0, 32)`.

### A20 — `[P3] SECURE_COOKIE è opt-in (default false)`

**File**: `src/middleware/cookies.js`.

Se in produzione si dimentica di settare `SECURE_COOKIE=true`, il cookie può viaggiare su HTTP. Default-secure sarebbe più sicuro.

**Fix**: default `true` se `NODE_ENV === "production"`.

### A21 — `[P3] Ring buffer apiLog include input completo`

Vedi A2. Anche dopo aver protetto l'endpoint, conviene comunque sanitizzare i body prima di inserirli nel buffer (rimuovere `password`, `token`, ecc.).

### A22 — `[P3] /api/auth/check-user permette user enumeration`

**File**: `app/auth/routes.js` linee 22-29.

Risponde `{ exists: true/false }` per qualunque username. Un attaccante può **enumerare gli utenti validi** prima di tentare brute-force. È rate-limitato come login (`loginLimiter`) — buono — ma resta una superficie evitabile.

**Fix**:

- valutare se serve davvero (oggi è usato dalla UI per "username sconosciuto" vs "password errata"); se sì, fare in modo che `/api/auth/login` ritorni sempre lo stesso messaggio per "user inesistente" o "password sbagliata", e abolire `check-user`.

### A23 — `[P3] PBKDF2 ok ma argon2id sarebbe meglio`

**File**: `app/auth/password.js`.

PBKDF2-SHA512 con 600k iterazioni rispetta OWASP 2024 ma argon2id è lo standard moderno (resistente a GPU/FPGA). Migrazione possibile in modo trasparente come fatto già per il rehash 100k → 600k.

**Fix differito**: aggiungere `argon2` come dipendenza opzionale, gestire ibrido per migrazione progressiva.

---

## B. Punti deboli architetturali (non bug, ma limiti per "gestionale dati sensibili")

### B1 — `[P1] Nessuna gestione TLS nativa`

Va deployato dietro reverse proxy (nginx/traefik/Caddy). Documentare in [08-server-config.md](08-server-config.md) un esempio nginx+Let's Encrypt + `SECURE_COOKIE=true` + `LUMIA_HOST=127.0.0.1`.

### B2 — `[P1] Nessun backup automatizzato`

Il DB è un file SQLite ma:

- non c'è uno script `npm run backup` che faccia `VACUUM INTO`,
- il flush debounce di 500 ms del wrapper rende rischioso un copy "live",
- non c'è retention policy.

**Proposta**: `tools/backup.js` che:

1. apre il DB read-only,
2. esegue `VACUUM INTO 'backup-YYYY-MM-DD-HH.db'`,
3. gzippa,
4. ruota tenendo N snapshot,
5. opzionale: cifra con AES-256 prima di scrivere.

Schedulato via cron / Task Scheduler.

### B3 — `[P1] Nessun health-check approfondito`

`GET /api/health` ritorna solo `uptime` + flag engine. Per un orchestratore (k8s, docker healthcheck, monitoraggio ospedaliero) serve:

- `db_lumia_ok: true/false` (`SELECT 1`);
- `db_agenda_ok: true/false`;
- `cerus_reachable: true/false` (`HEAD` con timeout 1s, cached 30s);
- `disk_free_mb: …`;
- `sessions_active: N`.

### B4 — `[P2] Nessuna metrica per osservabilità`

Né Prometheus né esportazione strutturata. Un gestionale clinico beneficia di:

- counter request per route + status,
- istogramma latenza,
- gauge sessioni attive,
- gauge connessioni DB (qui è 1 ma se in futuro pool…).

**Proposta**: `GET /api/admin/metrics` (admin-only) in formato Prometheus text.

### B5 — `[P2] Logging su console.log non strutturato`

Tutto va su stdout in formato libero. Difficile da grep/parsare. Per audit GDPR/AgID serve log strutturato (JSON line).

**Proposta**: `src/lib/logger.js` minimale (no dipendenze):

```js
log({ level, msg, ...fields }) → process.stdout.write(JSON.stringify({ ts, ...}) + '\n')
```

Sostituire i `console.log` di richiesta in `request-handler.js`.

### B6 — `[P2] Nessun graceful drain delle richieste in flight`

`shutdown()` chiama `server.close()` ma in parallelo invalida le sessioni. Una richiesta in volo che fa `getDb()` dopo il close prende eccezione silenziosa.

**Proposta**: `server.close(callback)` → aspettare callback prima di chiudere DB.

### B7 — `[P2] Engine sandbox non è una sandbox di sicurezza`

`vm.runInContext` con `globalThis` esposto può accedere a `process`, `require`. Non è un meccanismo di security boundary. Va bene perché i `*-core.js` caricati sono codice **interno fidato**, ma documentarlo esplicitamente: niente caricamento di file utente.

### B8 — `[P3] DB_PATH per agenda hardcoded`

`app/agenda/db.js` usa `path.resolve(__dirname, '..', '..', 'data', 'agenda.db')` non configurabile via env. Per deployment in container con volume custom è scomodo.

**Fix**: introdurre `AGENDA_DB_PATH` (default `data/agenda.db`).

### B9 — `[P3] Nessuna paginazione di default sugli endpoint list-heavy`

`GET /api/admin/utenti`, `GET /api/agenda/appointments?date=...`, `GET /api/agenda/elenco` ritornano tutto. Con dataset reali (anni di appuntamenti) il payload diventa enorme.

**Fix**: parametri `limit`/`offset` con default sensati (es. 100/500), header `X-Total-Count`.

### B10 — `[P3] Nessun versioning API`

URL `/api/...` senza `/v1/`. Cambi breaking lato client diventano dolorosi.

**Fix**: introdurre `/api/v1/` come alias e cominciare a documentare la deprecation policy.

### B11 — `[P3] Documentazione OpenAPI assente`

Il [07-server-api-reference.md](07-server-api-reference.md) è ottimo ma "umano". Un file `openapi.yaml` consente:

- generazione client TS lato browser,
- test contract (`schemathesis`),
- mocking nello sviluppo dei moduli.

---

## C. Compliance "dati sensibili sanitari"

Mappatura GDPR/AgID → stato attuale → gap.

| Requisito | Stato attuale | Gap | Riferimento |
|-----------|---------------|-----|-------------|
| Identificazione univoca utente (art. 32) | ✓ tabella `utenti` | – | [04-server-auth.md](04-server-auth.md) |
| Autenticazione robusta | ✓ PBKDF2-600k + sessione DB | A6 (lockout account), A7 (multi-device), A23 (argon2) | A6 |
| Tracciabilità accessi (art. 30) | parz. `audit_log` + `audit_trail` | A11 (unificare), A2 (rendere admin-only), B5 (formato strutturato) | A11 |
| Confidenzialità at-rest (art. 32 §1.a) | ✗ DB in chiaro | A9 (cifratura) | A9 |
| Confidenzialità in-transit | ✗ no TLS nativo | B1 (TLS via reverse-proxy + SECURE_COOKIE) | B1 |
| Resilienza / backup (art. 32 §1.c) | ✗ nessun backup | B2 (script + retention) | B2 |
| Conservazione log (AgID: 6 mesi min) | ✓ 365 giorni di default | A10 (effettivamente attivo) | A10 |
| Gestione data breach (art. 33-34) | ✗ nessun alerting | B4 (metriche), monitoring esterno | – |
| Minimizzazione dati nei log | parz. (apiLog include `input`) | A21 (sanitizzare body) | – |
| Cancellazione fisica (art. 17) | parz. `deleteUtente` (soft = solo `attivo=0` non c'è soft-delete; hard delete diretto) | nessuna procedura `DELETE FROM appointments WHERE patient_uuid=?` esposta | C-extra |
| Pseudonimizzazione | ✗ patient_uuid presente ma in chiaro | considerare hash deterministico per logging | – |

---

## D. Roadmap di hardening proposta (V3)

Suddivisione in 4 milestone concrete, ciascuna chiudibile in pochi commit.

### V3.M1 — Hardening "low-hanging fruit" (1 sprint)

Tutti i `P0` + i `P1` più rapidi:

- [ ] **A1** — proteggere `/api/config` (nascondere apiKey, role admin)
- [ ] **A2** — proteggere `/api/log` (admin only) + sanitizzare entries
- [ ] **A3** — aggiungere `PATCH` alla validazione CSRF in `auth-gate.js`
- [ ] **A4** — aggiungere `PATCH` ai metodi CORS
- [ ] **A14** — `.catch` finale su `init.js`
- [ ] **A19** — rimuovere `.slice(0,32)` su CSRF
- [ ] **A18** — escludere `localhost` da CORS in produzione
- [ ] **A20** — `SECURE_COOKIE` default true se prod
- [ ] **A22** — abolire `check-user` o rendere costante la risposta

### V3.M2 — Auth & sessione di livello "gestionale" (1 sprint)

- [ ] **A5** — enforce `forza_cambio_password` (endpoint `change-password`, blocco delle altre route fino al cambio)
- [ ] **A6** — lockout account (failed_login_count + bloccato_fino_il)
- [ ] **A7** — multi-session (lista + revoca per dispositivo)
- [ ] **A13** — protezione admin per `ruolo` non per username + check "ultimo admin"

### V3.M3 — Audit, log, compliance (1 sprint)

- [ ] **A8** — `client-ip.js` + `TRUSTED_PROXIES`
- [ ] **A10** — agganciare `pruneAuditLogs` a un timer
- [ ] **A11** — unificare `audit_log` + `audit_trail`
- [ ] **A12** — `created_by`/`updated_by` su tabelle agenda
- [ ] **B5** — logger JSON-line strutturato
- [ ] **A21** — sanitizzazione body in apiLog

### V3.M4 — Operativo / produzione (1-2 sprint)

- [ ] **A9** — decisione + implementazione cifratura at-rest (preferibile SQLCipher)
- [ ] **B1** — guida deploy nginx + TLS + reverse proxy in [08-server-config.md](08-server-config.md)
- [ ] **B2** — `tools/backup.js` con `VACUUM INTO` + rotation
- [ ] **B3** — `/api/health` esteso (DB ping, Cerus reach, disk free)
- [ ] **B6** — graceful drain corretto in shutdown
- [ ] **B8** — `AGENDA_DB_PATH` env

### V3.M5 (opzionale / futuro)

- [ ] **A16** — CSP nonce-based (richiede refactor moduli client)
- [ ] **A23** — migrazione a argon2id
- [ ] **B4** — metriche Prometheus
- [ ] **B9** — paginazione di default
- [ ] **B10** — versioning `/api/v1/`
- [ ] **B11** — `openapi.yaml`

---

## E. Quick reference — file da modificare per milestone

| Milestone | File toccati |
|-----------|--------------|
| M1 | `src/routes.js`, `src/middleware/auth-gate.js`, `src/middleware/cors.js`, `src/middleware/csrf.js`, `src/middleware/cookies.js`, `src/init.js`, `app/auth/routes.js` |
| M2 | `app/admin/users.js`, `app/auth/routes.js`, `app/auth/password.js`, `app/auth/sessions.js`, `src/db/schema.js` |
| M3 | `src/http/client-ip.js` (nuovo), `src/db/audit.js`, `src/init.js`, `src/lib/logger.js` (nuovo), `src/db/schema.js`, `app/agenda/db.js` |
| M4 | `src/lib/sqlite-wrapper.js` (sostituire o configurare SQLCipher), `tools/backup.js` (nuovo), `src/routes.js` (`/api/health`), `docs/v3/server/08-server-config.md` |

---

## F. Cosa **non** è un problema (smentite a falsi allarmi)

Per chiarezza, alcuni elementi che a un audit superficiale sembrano fragili ma sono **scelte progettuali corrette**:

- **Cookie `HttpOnly + SameSite=Strict + Path=/`**: configurazione solida, niente da cambiare.
- **CSRF derivato (HMAC) invece che memorizzato**: pattern valido ("signed double-submit"); non richiede storage.
- **PBKDF2 600k iter + salt 32 byte + `timingSafeEqual`**: rispetta OWASP 2024 (passwd hashing), `verifyPassword` è time-constant.
- **Sql.js wrapper con prepared statement ovunque**: nessuna SQL injection nel codice attuale (verificato grep `\${` su query — nessun caso problematico).
- **Path traversal in `static.js`**: `path.resolve` + `startsWith(ROOT_DIR + path.sep)` è la mitigazione corretta.
- **Mini-router custom**: meno superficie d'attacco di Express, niente prototype pollution noto.
- **Audit `dettagli` come JSON-stringified TEXT**: scelta consapevole di SQLite (no JSON nativo); accettabile.

---

## Conclusione operativa

Il server è **architetturalmente solido** ma ha alcune falle puntuali (A1, A2, A3 in particolare) che lo rendono **inadeguato oggi** per dati sensibili sanitari. Chiudere la M1 è prerequisito per qualsiasi pilota con dati reali. La M2-M3-M4 sono i blocchi che alzano il prodotto da "applicativo interno" a "gestionale clinico conforme". La M5 è il polishing professionale.
