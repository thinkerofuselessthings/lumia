# 08 — Server: Configurazione

## 1. Sorgenti di configurazione

Per priorità decrescente:

1. **`.env`** — caricato da `src/config/env.js::loadEnv()` all'avvio (`src/init.js`). Parser homemade, **nessuna dipendenza `dotenv`**. Supporta:
   - `KEY=value`,
   - commenti con `#`,
   - valori tra virgolette singole o doppie (con strip),
   - valori multilinea no.
   - I valori valorizzati nel parser sono iniettati in `process.env` (se non già definiti).
2. **`process.env`** già esportate dall'OS / launcher.
3. **`lumia.config.json`** — fallback per pochi campi specifici (oggi: `apiKey`, `port`, `host`, `cerus`).
4. **Default hardcoded** nel modulo che richiede la variabile via `env(KEY, fallback)`.

## 2. Helper `env(key, fallback)` — `src/config/env.js`

Comportamento:

```js
env("LUMIA_PORT", 3500)        // ritorna number 3500 se non definito
env("FOO", "bar")              // ritorna string "bar" se non definito
env("LUMIA_PORT")              // ritorna string o undefined
```

Coercion: se `fallback` è `number`, il valore di `process.env` viene `parseInt(..., 10)` automaticamente. Idem per `boolean` letto dalla stringa (`"true"`/`"1"` → `true`).

## 3. Variabili d'ambiente — riferimento completo

### Core HTTP (`src/server.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `LUMIA_HOST` | `127.0.0.1` | string | Host di binding |
| `LUMIA_PORT` | `3500` | number | Porta HTTP |
| `HEADERS_TIMEOUT` | `20000` | ms | `server.headersTimeout` |
| `REQUEST_TIMEOUT` | `30000` | ms | `server.requestTimeout` |
| `SOCKET_TIMEOUT` | `120000` | ms | `server.timeout` |
| `KEEP_ALIVE_TIMEOUT` | `5000` | ms | `server.keepAliveTimeout` |
| `TRUSTED_PROXIES` | `""` | CSV | IP esatti dei reverse-proxy fidati. Solo se l'IP del socket è in lista, `X-Forwarded-For[0]` viene preso come IP client (V3.M3.A8) |

### Body parsing (`src/http/body-parser.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `MAX_BODY_SIZE` | `1048576` (1 MB) | bytes | Limite body JSON |
| `BODY_PARSE_TIMEOUT` | `10000` | ms | Timeout ricezione body |

### Sessioni & cookie (`src/middleware/cookies.js`, `app/auth/sessions.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `SESSION_MAX_AGE` | `86400` | s | TTL del cookie e di `sessioni.scade_il` |
| `SESSION_IDLE_TIMEOUT` | `3600000` | ms | Idle timeout (1 h) |
| `SECURE_COOKIE` | `false` (`true` se `NODE_ENV=production`) | bool | Aggiunge `Secure` al `Set-Cookie` (V3.M1.A20) |
| `MAX_SESSIONS_PER_USER` | `5` | number | Tetto sessioni concorrenti per utente; oltre, viene invalidata la più vecchia (V3.M2.A7) |

### CSRF (`src/middleware/csrf.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `CSRF_SECRET` | (auto-gen → `data/.csrf_secret`) | string | Segreto HMAC per derivazione token CSRF |

### Rate-limit & lockout (`src/middleware/rate-limiter.js`, `app/admin/users.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `API_RATE_LIMIT` | `200` | number | Richieste consentite per IP |
| `API_RATE_WINDOW` | `60000` | ms | Finestra del limiter API |
| `LOGIN_RATE_LIMIT` | `5` | number | Tentativi di login per IP |
| `LOGIN_RATE_WINDOW` | `900000` (15 min) | ms | Finestra del limiter login |
| `LOCKOUT_THRESHOLD` | `5` | number | Soglia di fallimenti consecutivi che blocca l'**account** (V3.M2.A6) |
| `LOCKOUT_WINDOW_MS` | `900000` (15 min) | ms | Durata blocco account dopo soglia raggiunta |

### Database (`src/db/instance.js`, `src/db/audit.js`, `app/auth/password.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `DB_PATH` | `data/lumia.db` | path | File SQLite del DB principale (`utenti`/`sessioni`/`audit_log`) |
| `AGENDA_DB_PATH` | `data/agenda.db` | path | File SQLite del DB agenda (V3.M4.B8). Assoluto o relativo al cwd |
| `AUDIT_RETENTION_DAYS` | `365` | days | Soglia per `pruneAuditLogs()` |
| `PBKDF2_ITERATIONS` | `600000` | number | Iterazioni hash password |

### Backup & shutdown (`tools/backup.js`, `src/init.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `BACKUP_DIR` | `data/backups` | path | Cartella di destinazione degli archivi `.db.gz` (V3.M4.B2) |
| `BACKUP_KEEP` | `30` | number | Snapshot da conservare per ciascun DB; i più vecchi vengono cancellati |
| `SHUTDOWN_GRACE_MS` | `10000` | ms | Tempo massimo per il drain delle connessioni in volo prima dell'hard-exit (V3.M4.B6) |

### API key (`src/middleware/auth-gate.js`, `src/routes.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `LUMIA_API_KEY` | (legge da `lumia.config.json::apiKey`) | string | API key per `X-API-Key` |

### Admin seed (`app/auth/seed.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `ADMIN_PASSWORD` | (random hex 16 byte) | string | Password iniziale dell'admin (al primo avvio se la tabella `utenti` non ha admin) |

### Cerus integration (`src/integrations/cerus/client.js`)

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `CERUS_BASE_URL` | (legge da `lumia.config.json::cerus.baseUrl`) | URL | Base URL del servizio Cerus |
| `CERUS_USER_ID` | (legge da `lumia.config.json::cerus.userId`) | string | User ID di autenticazione |
| `CERUS_USER_KEY` | (legge da `lumia.config.json::cerus.userKey`) | string | Chiave segreta |
| `CERUS_TIMEOUT` | `5000` | ms | Timeout HTTP per chiamate Cerus |

### Ambiente

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `NODE_ENV` | `production` | string | Ambiente |

### Crittografia & hashing (V3.M4.A9 + V3.M5.A23 + V3.M5.A16)

Per i dettagli operativi vedi §8.7 (field-level encryption), §8.8 (scrypt) e §8.9 (CSP strict).

| Variabile | Default | Tipo | Descrizione |
|-----------|---------|------|-------------|
| `LUMIA_ENCRYPTION_KEY` | — | hex/base64 | Chiave master AES-256-GCM per field-encryption |
| `LUMIA_ENCRYPTION_PASSPHRASE` | — | string | Alternativa a `LUMIA_ENCRYPTION_KEY`: deriva la chiave via scrypt |
| `PASSWORD_ALGO` | `scrypt` | enum | Algoritmo per nuovi hash (`scrypt`\|`pbkdf2`) |
| `SCRYPT_N` | `32768` | number | scrypt cost factor |
| `SCRYPT_R` | `8` | number | scrypt block size |
| `SCRYPT_P` | `1` | number | scrypt parallelism |
| `SCRYPT_KEYLEN` | `64` | number | Hash output (byte) |
| `SCRYPT_MAXMEM` | `268435456` | number | Memoria max scryptSync (byte) |
| `CSP_STRICT` | `false` | bool | Attiva CSP nonce-based + iniezione automatica negli HTML |

## 4. `lumia.config.json` — fallback config

Esempio:

```json
{
  "host": "127.0.0.1",
  "port": 3500,
  "apiKey": "abcd1234...",
  "cerus": {
    "baseUrl": "https://cerus.example/api",
    "userId":  "lumia",
    "userKey": "..."
  }
}
```

Usato da:

- `enforceAuth` per validare `X-API-Key` (auth server-to-server),
- `cerus-client.js` (legge `cerus.*` come fallback per le `CERUS_*`).

> **V3.M1.A1**: la `apiKey` non viene più ritornata da `GET /api/config`. È riservata a chiamate server-to-server: i browser usano cookie+CSRF e non hanno bisogno di conoscerla.

## 5. File generati a runtime

| File | Generato da | Note |
|------|-------------|------|
| `data/lumia.db` | `initDatabase()` | DB SQLite principale |
| `data/agenda.db` | `initAgendaDb()` | DB SQLite agenda (WAL → genera anche `agenda.db-wal`, `agenda.db-shm`) |
| `data/.csrf_secret` | `csrf.js` (al primo accesso senza env) | 32 byte hex; preservare nei backup per non invalidare CSRF al restart |
| `data/.enc_salt` | `field-crypto.js` (se passphrase senza key) | 16 byte; preservare nei backup per derivare la stessa chiave (V3.M4.A9) |

## 6. `.env.example` minimo

Vedi `.env.example` nella root. Estratto:

```
# Host di binding (default 127.0.0.1)
LUMIA_HOST=127.0.0.1

# Porta HTTP (default 3500)
LUMIA_PORT=3500

# API key per autenticazione X-API-Key (se vuota → letta da lumia.config.json)
LUMIA_API_KEY=

# Ambiente (development | production)
NODE_ENV=production
```

Per produzione si raccomanda di impostare esplicitamente:

```
ADMIN_PASSWORD=<password forte iniziale>
CSRF_SECRET=<32+ byte random>
LUMIA_API_KEY=<random>
SECURE_COOKIE=true        # solo dietro HTTPS reverse proxy
```

## 7. Precedenza: regola operativa

```
.env  >  process.env preesistente  >  lumia.config.json  >  default hardcoded
```

Per ribaltare temporaneamente un valore in produzione: settare la variabile prima di `node src/init.js` (`LUMIA_PORT=3600 npm start` non funziona su Windows: usare `cross-env` o `set` PowerShell).

## 8. Deploy in produzione — TLS + reverse proxy (V3.M4.B1)

LUMIA è progettato per girare **dietro un reverse-proxy** che termina TLS. Non implementa HTTPS nativo.

### 8.1 Architettura raccomandata

```
[client] ──HTTPS──> [nginx :443] ──HTTP loopback──> [lumia :3500] ──> [sql.js → data/*.db]
```

- LUMIA ascolta su `127.0.0.1:3500` (loopback only).
- nginx termina TLS, gestisce HSTS, redirect 80→443, e aggiunge `X-Forwarded-For`.
- LUMIA legge l'IP reale via `TRUSTED_PROXIES=127.0.0.1` (V3.M3.A8).

### 8.2 Variabili obbligatorie in produzione

```
NODE_ENV=production
LUMIA_HOST=127.0.0.1
LUMIA_PORT=3500
SECURE_COOKIE=true             # cookie inviati solo su HTTPS
TRUSTED_PROXIES=127.0.0.1      # solo l'IP del reverse proxy
CSRF_SECRET=<32+ byte random, persistente nei backup>
ADMIN_PASSWORD=<solo al primo boot, poi rimuovere>
LUMIA_API_KEY=<random per chiamate server-to-server>
BACKUP_DIR=/var/backups/lumia
BACKUP_KEEP=60
SHUTDOWN_GRACE_MS=15000
```

### 8.3 nginx — snippet minimo

```nginx
server {
    listen 80;
    server_name lumia.example.org;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lumia.example.org;

    ssl_certificate     /etc/letsencrypt/live/lumia.example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lumia.example.org/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    client_max_body_size 2m;

    location = /api/health/lite {
        proxy_pass http://127.0.0.1:3500;
        access_log off;
    }

    location /api/health/deep {
        # readiness profondo: limita a IP dell'orchestratore
        allow 10.0.0.0/8;
        deny  all;
        proxy_pass http://127.0.0.1:3500;
    }

    location / {
        proxy_pass http://127.0.0.1:3500;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

### 8.4 systemd unit — esempio

```ini
[Unit]
Description=LUMIA hematology backend
After=network.target

[Service]
Type=simple
User=lumia
WorkingDirectory=/opt/lumia
EnvironmentFile=/etc/lumia/lumia.env
ExecStart=/usr/bin/node src/init.js
Restart=on-failure
RestartSec=3
KillSignal=SIGTERM
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

`TimeoutStopSec` deve essere **> `SHUTDOWN_GRACE_MS / 1000`** per consentire il drain pulito (V3.M4.B6).

### 8.5 Backup — cron giornaliero

```cron
# /etc/cron.d/lumia-backup — alle 03:15 ogni giorno
15 3 * * *  lumia  cd /opt/lumia && /usr/bin/node tools/backup.js >> /var/log/lumia/backup.log 2>&1
```

Per cifratura at-rest dei backup (consigliata in ambito sanitario) wrappare con GPG:

```sh
node tools/backup.js && \
  find $BACKUP_DIR -name '*.db.gz' -mmin -10 -exec gpg --batch --yes -e -r ops@example.org {} \; -delete
```

### 8.6 Health-check — endpoint disponibili (V3.M4.B3)

| Endpoint | Auth | Uso |
|----------|------|-----|
| `GET /api/health` | no | Liveness base + introspezione engine caricati |
| `GET /api/health/lite` | no | Liveness probe minimal — sempre 200 se il processo è in vita |
| `GET /api/health/deep` | no | Readiness: ping DB principale + agenda, dimensione file, ultimo backup. Restituisce **503** se un check fallisce. **Esporre solo a IP fidati** |

### 8.7 Cifratura at-rest dei dati sensibili (V3.M4.A9)

LUMIA implementa **field-level encryption** AES-256-GCM tramite `crypto` builtin (zero npm). Cifra i campi PII/clinici critici prima della scrittura su SQLite, lasciando intatti gli indici tecnici (id, timestamp, FK).

**Helper**: `src/lib/field-crypto.js`. Formato wire: `enc:v1:<base64(iv12 ‖ tag16 ‖ ciphertext)>`. Le stringhe senza prefisso vengono restituite as-is (back-compat per righe legacy).

**Tabelle/campi cifrati**:

| Tabella | Campi |
|---------|-------|
| `utenti` | `email` |
| `audit_log` | `before_data`, `after_data` |
| `appointments` (agenda) | `patient_name`, `phone`, `birth_date`, `notes`, `description` |
| `list_entries` (agenda) | `patient_name`, `phone`, `birth_date`, `notes` |

**Configurazione chiave** — una delle due:

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `LUMIA_ENCRYPTION_KEY` | hex 64ch o base64 44ch | Chiave master raw (raccomandato: gestita da KMS/secret manager) |
| `LUMIA_ENCRYPTION_PASSPHRASE` | string | Passphrase; chiave derivata via `scrypt` con salt persistente in `data/.enc_salt` (mode 0o600) |

Se nessuna è impostata: encryption disabilitato, dati scritti in chiaro (utile in dev). Il modulo logga `[field-crypto] disabled` in stdout.

**Migrazione righe esistenti** (one-shot, idempotente):

```sh
# Dry-run: stima righe da cifrare senza modificare nulla
LUMIA_ENCRYPTION_KEY=... npm run encrypt-existing -- --dry-run

# Esecuzione reale (transazione per tabella; salta righe già cifrate)
LUMIA_ENCRYPTION_KEY=... npm run encrypt-existing
```

**Operativo**:

- La chiave deve essere preservata: perderla = perdere i dati cifrati.
- Backup gzip continuano a funzionare (i campi cifrati restano cifrati nel `.db.gz`).
- Ricerca/ORDER BY sui campi cifrati non funziona più (ciphertext != plaintext): usare per filtraggio solo campi non sensibili (id, date, status).
- Per cifratura del *volume* SQLite (oltre i singoli campi) restano valide le opzioni: BitLocker/LUKS sul filesystem o backup wrappati con GPG (§8.5).

### 8.8 Password hashing — scrypt (V3.M5.A23)

LUMIA supporta due algoritmi di hashing, con autodetect via prefisso del campo `password_hash`:

- **PBKDF2-SHA256** (legacy) — backward compatibility con utenti pre-V3.M5.
- **scrypt** (default V3.M5.A23) — parametri OWASP 2024 (N=32768, r=8, p=1, ~32MB), formato `$scrypt$N$r$p$saltHex$hashHex`.

`verifyPassword()` riconosce entrambi. `rehashIfNeeded()` ri-hasha con scrypt al primo login successivo (mai downgrade scrypt→pbkdf2).

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `PASSWORD_ALGO` | `scrypt` | Algoritmo per nuovi hash (`scrypt` \| `pbkdf2`) |
| `SCRYPT_N` | `32768` | Cost factor (memoria + CPU) |
| `SCRYPT_R` | `8` | Block size |
| `SCRYPT_P` | `1` | Parallelism |
| `SCRYPT_KEYLEN` | `64` | Lunghezza hash output in byte |
| `SCRYPT_MAXMEM` | `268435456` | Memoria max (byte) per `crypto.scryptSync` |

### 8.9 Content-Security-Policy strict (V3.M5.A16)

Default: CSP permissivo con `'unsafe-inline'` per script/style — necessario per la shell legacy.

Modalità strict opt-in: settare `CSP_STRICT=true`. Il middleware genera un nonce per request (16 byte base64), lo aggiunge al header `Content-Security-Policy` come `'nonce-XXX' 'strict-dynamic'`, e lo inietta automaticamente in tutti i tag `<script>` e `<style>` inline degli HTML serviti da `src/http/static.js`.

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `CSP_STRICT` | `false` | Se `true`, attiva CSP nonce-based + iniezione automatica nonce negli HTML |

> **Nota**: gli HTML possono usare il placeholder `__CSP_NONCE__` (sostituito a runtime) per impostare manualmente `nonce` su `<link>` o asset con CSP-nonce esterno. L'iniezione automatica copre solo `<script>` e `<style>` inline.

### 8.10 Metriche Prometheus (V3.M5.B4)

Endpoint `GET /api/metrics` (auth: no) espone metriche in formato Prometheus text v0.0.4. Implementato con builtin (`src/lib/metrics.js`, zero deps).

Metriche pre-registrate:

- `lumia_http_requests_total{method,status_class}` (counter)
- `lumia_http_request_duration_ms{method,status_class}` (histogram, bucket: 5..5000ms)
- `lumia_process_start_time_seconds`, `lumia_process_uptime_seconds`, `lumia_process_memory_rss_bytes`, `lumia_process_memory_heap_used_bytes` (gauge)

### 8.11 API versioning (V3.M5.B10)

Il prefisso `/api/v1/...` è **alias trasparente** di `/api/...` (rewrite a livello di request-handler, zero duplicazione di route). `req.originalUrl` viene preservato per i log d'accesso.
