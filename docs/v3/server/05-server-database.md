# 05 — Server: Database

## 1. Tecnologia

LUMIA usa **SQLite tramite [`sql.js`](https://github.com/sql-js/sql.js)** (build WebAssembly). Vantaggi:

- zero moduli nativi → installazione triviale anche in ambienti vincolati,
- portabilità totale (Linux/macOS/Windows/Docker senza compilation step).

Svantaggi (compensati dal wrapper):

- API asincrona di init e in-memory di base; il wrapper aggiunge persistenza su disco "debounced",
- `sql.js` accetta solo parametri posizionali; il wrapper traduce parametri named (`@name`) → array.

## 2. Wrapper — `src/lib/sqlite-wrapper.js`

Espone una classe `Database` con API **compatibile `better-sqlite3`**:

```js
const { initSqlite, Database } = require("./lib/sqlite-wrapper");

await initSqlite();              // warm-up del WASM (una volta sola, all'avvio)
const db = new Database(dbPath); // legge il file se esiste
db.pragma("foreign_keys = ON");
const row = db.prepare("SELECT * FROM utenti WHERE id = ?").get(1);
const all = db.prepare("SELECT * FROM utenti WHERE ruolo = ?").all("admin");
const r   = db.prepare("INSERT INTO utenti (...) VALUES (?, ?, ?)").run(...);
//          → { changes, lastInsertRowid }
```

### Persistenza su disco

- Ogni `run()`/`exec()` triggera `_save()` → `setTimeout(..., 500)` per **debounce**.
- `beginBatch()` disabilita il save automatico; `endBatch()` flush sincrono finale. Usato in fase di bootstrap (DDL massivo).
- `transaction(fn)`: wrappa `fn` in `BEGIN`/`COMMIT`/`ROLLBACK`. Espone anche `.deferred/.immediate/.exclusive` come no-op per compatibilità.

### Parametri named

```js
db.prepare("INSERT INTO t (a, b) VALUES (@a, @b)").run({ a: 1, b: 2 });
```

Il wrapper estrae `@a, @b` dalla query e converte l'oggetto in array posizionale.

## 3. Due database, due file

| Variabile | Default | Contenuto |
|-----------|---------|-----------|
| `DB_PATH` (env) | `data/lumia.db` | `utenti`, `sessioni`, `audit_log` |
| (hardcoded in `app/agenda/db.js`) | `data/agenda.db` | tutte le tabelle dell'agenda (~12) |

Sono fisicamente separati. Pragma usate sul DB agenda: `journal_mode=WAL`, `foreign_keys=ON`, `synchronous=NORMAL`.

## 4. Schema `lumia.db`

DDL completo in `src/db/schema.js`. Tre tabelle:

### `utenti`

Vedi [04-server-auth.md](04-server-auth.md#4-schema-utenti-ddl). Vincolo `CHECK` su `ruolo` con valori `admin | medico | infermiere | tecnico | amministrativo`.

### `sessioni`

Vedi [04-server-auth.md](04-server-auth.md#5-schema-sessioni-ddl). FK su `utenti(id) ON DELETE CASCADE`.

### `audit_log`

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  azione      TEXT NOT NULL,
  utente_id   INTEGER REFERENCES utenti(id) ON DELETE SET NULL,
  ip          TEXT,
  user_agent  TEXT,
  metodo      TEXT,
  percorso    TEXT,
  esito       TEXT NOT NULL DEFAULT 'successo',
  dettagli    TEXT,                   -- JSON-stringified
  -- V3.M3.A11: audit unificato (eventi auth + mutazioni di dato)
  target_table TEXT,                  -- es. 'appointments'
  target_id    INTEGER,
  before_data  TEXT,                  -- JSON snapshot
  after_data   TEXT,                  -- JSON snapshot
  creato_il   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
```

API in `src/db/audit.js`:

```js
// Eventi (auth/sistema):
logAudit(azione, ctx, opts)
  // ctx: { userId?, ip, userAgent, method, path }
  // opts: { result?: "successo"|"fallito", details?: object }

// Mutazioni di dato (V3.M3.A11):
logChange(table, id, action, before, after, ctx)
  // azione = `data.${table}.${action.toLowerCase()}`
  // popola target_table, target_id, before_data, after_data

pruneAuditLogs()
  // DELETE FROM audit_log WHERE creato_il < datetime('now', '-N days')
  // N = AUDIT_RETENTION_DAYS (default 365)
```

`pruneAuditLogs` non è chiamato automaticamente nel codice attuale: va invocato da un job esterno o aggiunto a un timer in `src/init.js` (TODO V3).

## 5. Schema `agenda.db`

DDL in `app/agenda/db.js`. Otto tabelle principali + 2 dipendenti + 1 audit interno.

### Tabelle

| Tabella | Funzione | Note |
|---------|----------|------|
| `nodes` | Albero gerarchico macroarea→area→sede→flusso→postazione | `parent_id` self-FK, CHECK su `type` (5 valori), CHECK su `station_type` (`letto|poltrona|ambulatorio`) |
| `appointments` | Appuntamenti | FK indiretta a postazione via trigger; CHECK su `type` e `status` |
| `closed_days` | Giorni chiusi globali | UNIQUE su `date` |
| `day_room_overrides` | Override per giorno+postazione | UNIQUE `(date, room_id)`, trigger validate `room_id` |
| `station_closures` | Chiusure ricorrenti/intervalli per postazione | `recurrence_type ∈ {weekly, monthly}`, `recurrence_pattern` JSON |
| `station_openings` | Aperture eccezionali fuori da pattern | UNIQUE `(room_id, date)` |
| `lists` | Liste/agende ricorrenti per flusso | `slot_interval_min`, `max_patients`, `recurrence_pattern` JSON |
| `list_entries` | Voci nelle liste | FK su `list`, `appointment_id` opzionale (promote → appointment) |
| `list_closed_days` | Giorni chiusi per le liste | UNIQUE su `date` |
| `services` | Catalogo prestazioni | UNIQUE `(code, site_id)`, FK indiretta a `nodes(id)` via trigger |
| `audit_trail` | Audit interno agenda | `INSERT|UPDATE|DELETE`, `old_data`/`new_data` JSON |
| `transfusion_requests` | Richieste di trasfusione | FK su `appointments(id) ON DELETE CASCADE` |
| `transfusion_emocomponents` | Emocomponenti per richiesta | FK su `transfusion_requests(id) ON DELETE CASCADE` |

### Trigger applicativi

- `trg_nodes_updated_at`, `trg_appointments_updated_at`, `trg_lists_updated_at`, `trg_list_entries_updated_at`, `trg_services_updated_at`, `trg_trasf_updated_at`: aggiornano `updated_at` su `UPDATE`.
- `trg_appt_room_check` / `trg_appt_room_check_upd`: validano che `appointments.room_id` punti a un `nodes` di tipo `postazione`.
- `trg_dro_room_check`: idem per `day_room_overrides.room_id`.
- `trg_svc_site_check`: valida `services.site_id` ∈ `nodes`.
- `trg_nodes_cascade_appt`: alla cancellazione di un `nodes` di tipo `postazione`, mette `appointments.room_id = NULL` e `DELETE FROM day_room_overrides`.

### Migrazioni idempotenti

`runMigrations()` viene chiamato a ogni `initAgendaDb()`:

- **M1**: `appointments.birth_date` aggiunta se mancante. Migrazione storica: i valori che matchano `GLOB '????-??-??'` in `phone` vengono spostati in `birth_date` e `phone` azzerato.
- **M2**: `list_entries.birth_date` aggiunta se mancante.
- **M3**: `DROP TABLE IF EXISTS patients` — l'anagrafica è centralizzata in **Cerus** (vedi `08-server-config.md` e `src/integrations/cerus/client.js`).

### Seed

- `seedNodes()`: se `nodes` è vuoto, crea l'albero "USL Toscana Centro → Empoli/Castelfiorentino → flussi → postazioni" (Ambulatori 1-2, Poltrone 1-3, Letti 1-2, Letti DH 1-3, Ambulatorio Castelfiorentino).
- `seedServices()`: prestazioni di default se `services` è vuoto.

## 6. Singleton di accesso

- **Lumia DB**: `src/db/instance.js` espone `getDb()` (richiede chiamata pregressa a `initDatabase()`).
- **Agenda DB**: `app/agenda/db.js` espone `getAgendaDb()` (richiede `initAgendaDb()`).

I due DB **non condividono** la connessione e **non possono** essere joinati con SQL: per dati cross-DB serve un fetch applicativo.

## 7. Backup e portabilità

- Spegnere il server (`SIGTERM`) prima del copy: il wrapper ha un debounce di 500 ms per il flush; lo shutdown handler chiama `db.close()` che esegue `_flushToDisk()`.
- I file `data/lumia.db` e `data/agenda.db` sono SQLite standard: leggibili con `sqlite3` CLI.
- Il file `data/.csrf_secret` deve essere copiato/preservato per non invalidare i CSRF token al riavvio (le sessioni sopravvivono al restart se non scadute).
