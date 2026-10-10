# 02 — Audit: Schema DB

## 1. Tabella `audit_log` (lumia.db)

DDL definito in `src/db/schema.js::createTables()`:

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  azione      TEXT NOT NULL,
  utente_id   INTEGER,
  ip          TEXT,
  user_agent  TEXT,
  metodo      TEXT,
  percorso    TEXT,
  esito       TEXT DEFAULT 'successo',
  dettagli    TEXT,
  creato_il   TEXT DEFAULT (datetime('now'))
);
```

A cui si aggiungono **quattro colonne** introdotte dalla migrazione V3.M3.A11 (vedi §3):

```sql
ALTER TABLE audit_log ADD COLUMN target_table TEXT;
ALTER TABLE audit_log ADD COLUMN target_id    INTEGER;
ALTER TABLE audit_log ADD COLUMN before_data  TEXT;   -- enc:v1:<base64url>  (cifrato AES-256-GCM)
ALTER TABLE audit_log ADD COLUMN after_data   TEXT;   -- idem
```

## 2. Semantica delle colonne

| Colonna | Tipo | Origine / valori | Descrizione |
|---------|------|-------------------|-------------|
| `id` | INTEGER PK | autoincrement | Identificatore monotono crescente. Usato anche per ordinare cronologicamente in modo stabile (`ORDER BY id DESC` ≡ `ORDER BY creato_il DESC` ma immune a clock skew). |
| `azione` | TEXT NOT NULL | vedi tassonomia in [01 §3](01-audit-overview.md#3-tassonomia-delle-azioni) | Stringa gerarchica `<dominio>.<oggetto>.<verbo>`. Filtrabile con `LIKE 'data.%'` per separare auth da data mutation. |
| `utente_id` | INTEGER | `ctx.userId` (da sessione) o NULL | FK **logica** a `utenti(id)`. Non c'è FK SQL esplicita: alcuni eventi (`login.failed` con username inesistente, `auth.denied`) registrano `NULL`. |
| `ip` | TEXT | `ctx.ip` (rispetta `TRUSTED_PROXIES` per `X-Forwarded-For`) | IPv4/IPv6 del client. Dietro reverse proxy serve configurare `TRUSTED_PROXIES` (vedi [`../server/03-server-middleware.md`](../server/03-server-middleware.md)). |
| `user_agent` | TEXT | `req.headers["user-agent"]` | Stringa raw, può essere lunga; non viene troncata. |
| `metodo` | TEXT | `GET|POST|PUT|DELETE|...` | HTTP method della richiesta originaria. |
| `percorso` | TEXT | URL path | Es. `/api/auth/login`, `/api/admin/utenti/12`. Non include la query string. |
| `esito` | TEXT | `'successo'` o `'fallito'` | Default `'successo'`. Per i `logChange` è sempre `'successo'` (un mutation fallito non viene loggato perché tipicamente solleva eccezione PRIMA dell'INSERT audit). |
| `dettagli` | TEXT | JSON string | Payload libero per eventi auth/sistema (`{"username":"foo"}`, `{"locked_until":"2026-..."}`, `{"revoked_other_sessions":3}`). Per `logChange()` è normalmente `NULL`; viene popolato a `{"source":"system:<job>"}` se la mutazione è originata da un job non-HTTP (V3.M3.A12). **NON deve contenere PHI**: i dati clinici/anagrafici devono andare in `before_data`/`after_data` (cifrati). |
| `target_table` | TEXT | nome tabella mutata | NULL per eventi auth/admin. Per `logChange`: es. `'appointments'`, `'list_entries'`. |
| `target_id` | INTEGER | id record mutato | NULL per eventi auth/admin. |
| `before_data` | TEXT | `encField(JSON.stringify(redactSnapshot(table, snapshot)))` | Snapshot **prima** della mutazione, con segreti irreversibili (es. `password_hash`) sostituiti da `"<redacted>"` via `audit-policy.js`, poi cifrato AES-256-GCM. NULL per `INSERT`. Vedi [05 §2](05-audit-retention-security.md). |
| `after_data` | TEXT | `encField(JSON.stringify(redactSnapshot(table, snapshot)))` | Snapshot **dopo** la mutazione, redatto e cifrato come `before_data`. NULL per `DELETE` puro. |
| `creato_il` | TEXT | `datetime('now')` di SQLite | Timestamp UTC in formato `YYYY-MM-DD HH:MM:SS`. **Non** è `localtime` (consistente con UTC delle altre tabelle V3). |

## 3. Migrazioni

Le migrazioni sono **idempotenti** (rieseguibili senza danno). Tutte vivono in `src/db/schema.js` e vengono eseguite a ogni boot da `createTables()`:

```js
// V3.M3.A11: estensione di audit_log per audit unificato
applyMigrationIfMissing(db, "audit_log", "target_table",
  "ALTER TABLE audit_log ADD COLUMN target_table TEXT");
applyMigrationIfMissing(db, "audit_log", "target_id",
  "ALTER TABLE audit_log ADD COLUMN target_id INTEGER");
applyMigrationIfMissing(db, "audit_log", "before_data",
  "ALTER TABLE audit_log ADD COLUMN before_data TEXT");
applyMigrationIfMissing(db, "audit_log", "after_data",
  "ALTER TABLE audit_log ADD COLUMN after_data TEXT");
```

`applyMigrationIfMissing()` usa `PRAGMA table_info(<table>)` per verificare la presenza della colonna e lancia l'`ALTER TABLE` solo se assente — necessario perché SQLite non supporta `ADD COLUMN IF NOT EXISTS`.

Ordine di esecuzione al primo boot dopo l'upgrade:

1. `CREATE TABLE IF NOT EXISTS audit_log (...)` ← schema base, no-op se già esiste
2. 4× `ALTER TABLE audit_log ADD COLUMN ...` se mancanti
3. console: `[DB] Migrazione applicata: audit_log.target_table` (×4)

## 4. Indici

Allo stato attuale del codice **nessun indice esplicito** è creato sulla tabella `audit_log`. Le query ricorrenti sono:

| Query | Costo attuale | Nota |
|-------|---------------|------|
| `SELECT … ORDER BY id DESC LIMIT 50 OFFSET ?` | O(log N) — usa la PK implicita | OK fino a milioni di righe |
| `… WHERE azione LIKE 'data.%'` | full scan | con prune giornaliero a 365 gg, accettabile |
| `… WHERE utente_id = ?` | full scan | idem |
| `… WHERE creato_il >= ? AND creato_il <= ?` | full scan ma ordinamento naturale per id segue creato_il | idem |

Indici candidati per il futuro (non urgenti):

```sql
CREATE INDEX IF NOT EXISTS idx_audit_utente   ON audit_log(utente_id);
CREATE INDEX IF NOT EXISTS idx_audit_azione   ON audit_log(azione);
CREATE INDEX IF NOT EXISTS idx_audit_target   ON audit_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_creato   ON audit_log(creato_il);
```

Vanno aggiunti solo quando le tabelle superano ~100k righe e i filtri client diventano lenti.

## 5. Tabella legacy `audit_trail` (agenda.db)

Definita in `app/agenda/db.js`. **Non riceve più scritture** da V3.M3.A11; i nuovi eventi di mutazione vanno in `audit_log` via `logChange()` (vedi [03](03-audit-api.md)). I record pre-V3 restano consultabili solo via accesso diretto a `agenda.db`.

```sql
CREATE TABLE IF NOT EXISTS audit_trail (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT    NOT NULL,
  record_id  INTEGER NOT NULL,
  action     TEXT    NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
  old_data   TEXT,
  new_data   TEXT,
  user_id    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_audit_table ON audit_trail(table_name, record_id);
CREATE INDEX idx_audit_date  ON audit_trail(created_at);
```

Differenze chiave rispetto al nuovo `audit_log`:

| Campo legacy | Equivalente in `audit_log` | Note |
|--------------|----------------------------|------|
| `table_name` | `target_table` | identico |
| `record_id`  | `target_id` | identico |
| `action`     | (parte di) `azione` | era `INSERT|UPDATE|DELETE`; ora normalizzato in `data.<table>.<verb>` |
| `old_data`   | `before_data` | nel legacy era **in chiaro**; nel nuovo è cifrato |
| `new_data`   | `after_data` | idem |
| `user_id`    | `utente_id` | era TEXT (problematico: storicamente sempre `NULL` perché letto da header `X-User-Id` che il browser non invia); ora INTEGER popolato da `ctx.session.utente_id` |
| `created_at` | `creato_il` | era `localtime`; il nuovo è UTC |

## 6. Footprint disco

Stima a 1000 req/giorno con ~30% mutation (`logChange` con snapshot ~500B cifrati):

```
~700 logAudit/giorno × ~200B   = ~140 KB/giorno
~300 logChange/giorno × ~1.2KB = ~360 KB/giorno
Totale ~500 KB/giorno = ~180 MB/anno
```

Con retention default 365 giorni, dopo il primo anno il prune mantiene la dimensione attorno a quel valore. Il file `data/lumia.db` resta pienamente gestibile.
