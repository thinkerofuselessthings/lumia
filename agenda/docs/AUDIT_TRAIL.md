# Audit Trail — Agenda Module

## Stato attuale

### Schema DB (`audit_trail`)
```sql
CREATE TABLE audit_trail (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT    NOT NULL,         -- tabella (es. 'appointments')
  record_id  INTEGER NOT NULL,         -- ID del record
  action     TEXT    NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
  old_data   TEXT,                     -- JSON dello stato precedente
  new_data   TEXT,                     -- JSON dello stato nuovo
  user_id    TEXT,                     -- chi ha fatto l'azione
  created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
);
```
Indici: `idx_audit_table(table_name, record_id)`, `idx_audit_date(created_at)`.

### Azioni attualmente tracciate

| Tabella               | Azione         | Controller                        | Note                   |
|----------------------|----------------|------------------------------------|------------------------|
| `appointments`       | INSERT         | `appointments.create()`           | ✅ tracciata           |
| `appointments`       | UPDATE         | `appointments.update()`           | ✅ tracciata           |
| `appointments`       | DELETE         | `appointments.remove()`           | ✅ tracciata           |
| `transfusion_requests` | CASCADE_DELETE | `appointments.remove()`         | ✅ tracciata (incluso emocomponents) |
| `list_entries`       | INSERT         | `list-entries.create()`           | ✅ tracciata           |
| `list_entries`       | DELETE         | `list-entries.remove()`           | ✅ tracciata           |

### Azioni **NON** tracciate (gap)

| Tabella               | Azione         | Controller                        | Urgenza  |
|----------------------|----------------|------------------------------------|----------|
| `appointments`       | MOVE           | `appointments.move()`             | ⚠️ ALTA   |
| `appointments`       | STATUS_CHANGE  | `appointments.updateStatus()`     | ⚠️ ALTA   |
| `appointments`       | REORDER        | `appointments.reorder()`          | 🟡 MEDIA  |
| `list_entries`       | UPDATE         | `list-entries.update()`           | 🟡 MEDIA  |
| `list_entries`       | STATUS_CHANGE  | `list-entries.updateStatus()`     | 🟡 MEDIA  |
| `list_entries`       | PROMOTE        | `list-entries.promote()`          | 🟡 MEDIA  |
| `nodes`              | * (CRUD)       | `nodes.*`                         | 🟢 BASSA  |
| `services`           | * (CRUD)       | `services.*`                      | 🟢 BASSA  |
| `lists`              | * (CRUD)       | `lists.*`                         | 🟡 MEDIA  |
| `closed_days`        | * (CRUD)       | `closed_days.*`                   | 🟢 BASSA  |
| `day_room_overrides` | * (CRUD)       | `day_room_overrides.*`            | 🟢 BASSA  |
| `station_closures`   | * (CRUD)       | `station_closures.*`              | 🟢 BASSA  |
| `station_openings`   | * (CRUD)       | `station_openings.*`              | 🟢 BASSA  |

---

## Problema critico: `user_id` sempre NULL

### Causa
Tutti i controller usano:
```js
const userId = ctx.req.headers['x-user-id'] || null;
```
Ma il browser non invia mai `X-User-Id`. L'header non è standard e non viene settato da nessuna parte.

### Soluzione
La sessione è disponibile in `ctx.session` (popolata da `enforceAuth`). Il campo corretto è:
```js
const userId = ctx.session?.utente_id || null;
```
Questo restituisce l'ID dell'utente autenticato che ha fatto la richiesta (es. `"admin"`, `"operatore1"`).

**File da correggere:**
- `app/agenda/controllers/appointments.js` — 3 occorrenze (righe ~85, ~110, ~167)
- `app/agenda/controllers/list-entries.js` — 2 occorrenze (righe ~47, ~96)

---

## Proposta di miglioramento

### 1. Aggiungere audit a `move()` e `updateStatus()` (priorità alta)

```js
// appointments.move()
function move(ctx) {
  // ...existing validation...
  const userId = ctx.session?.utente_id || null;
  const moved = model.move(id, { ...body, duration_min });
  audit.log('appointments', id, 'UPDATE', existing, moved, userId);
  // action distinguibile: nel new_data si vede che room_id/start_time/end_time sono cambiati
  res_.ok(ctx.res, moved);
}

// appointments.updateStatus()
function updateStatus(ctx) {
  // ...existing validation...
  const userId = ctx.session?.utente_id || null;
  const updated = model.updateStatus(id, body.status);
  audit.log('appointments', id, 'UPDATE', existing, updated, userId);
  res_.ok(ctx.res, updated);
}
```

### 2. Estendere lo schema con campo `action` più granulare

Attualmente `action` è limitato a `INSERT|UPDATE|DELETE`. Si potrebbe estendere con:

```sql
ALTER TABLE audit_trail ADD COLUMN sub_action TEXT;
-- Valori: 'move', 'status_change', 'reorder', 'promote', 'cascade_delete', etc.
```

Questo permette di filtrare facilmente per tipo di operazione senza parsare `old_data`/`new_data`.

### 3. Aggiungere IP e User-Agent

```sql
ALTER TABLE audit_trail ADD COLUMN ip TEXT;
ALTER TABLE audit_trail ADD COLUMN user_agent TEXT;
```

Disponibili da `ctx.ip` e `ctx.userAgent` (già nel context object).

### 4. Frontend: mostra storico nell'appt-detail

Nella nuova sezione "Azioni" del drawer laterale dell'appuntamento, aggiungere un capitolo **Cronologia** che mostra gli eventi audit per quell'appuntamento, con:
- Data/ora
- Utente
- Azione (Creato / Modificato / Spostato / Cambio stato / Eliminato)
- Diff dei campi modificati

Serve un nuovo endpoint:
```
GET /api/agenda/appointments/:id/audit
```
Che restituisce le righe di `audit_trail` dove `table_name = 'appointments' AND record_id = :id`, ordinate per `created_at DESC`.

---

## Riepilogo interventi

| #  | Intervento                          | File coinvolti                               | Priorità |
|----|-------------------------------------|----------------------------------------------|----------|
| 1  | Fix `user_id`: usare `ctx.session`  | appointments.js, list-entries.js             | 🔴 CRITICA |
| 2  | Audit su `move()`                   | appointments.js                              | ⚠️ ALTA   |
| 3  | Audit su `updateStatus()`           | appointments.js                              | ⚠️ ALTA   |
| 4  | Audit su list-entries update/status | list-entries.js                              | 🟡 MEDIA  |
| 5  | Campo `sub_action` in schema        | db.js (migration)                            | 🟡 MEDIA  |
| 6  | IP + User-Agent in audit            | db.js (migration), audit.js                 | 🟢 BASSA  |
| 7  | Endpoint GET audit per appuntamento | controllers/appointments.js, routes.js       | 🟡 MEDIA  |
| 8  | UI cronologia nel dettaglio         | agenda-scheduler.js                          | 🟡 MEDIA  |
