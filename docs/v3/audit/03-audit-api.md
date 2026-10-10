# 03 — Audit: API server

Il modulo `src/db/audit.js` espone tre funzioni:

```js
const { logAudit, logChange, pruneAuditLogs } = require('./db/audit');
```

Tutte sono **sincrone** (`sql.js` è in-memory; il flush su disco è debounced dal wrapper SQLite).

A partire da V3.M3.A12 il modulo dipende da `src/db/audit-policy.js` per la **whitelist delle tabelle auditate** e le **regole di redaction** dei segreti (vedi §3).

## 1. `logAudit(action, ctx, opts)`

Registra un **evento di sistema/auth**. Non popola `target_table`/`target_id`/`before_data`/`after_data`.

### Firma

```js
logAudit(
  action,           // string — es. 'login.success', 'auth.denied'
  ctx = {},         // { userId?, ip?, userAgent?, method?, path?, source? }
  opts = {}         // { result?: 'successo'|'fallito', details?: object|string }
);
```

### Comportamento

```js
// V3.M3.A12: ctx.source si fonde con dettagli per eventi non-HTTP
let details = opts.details;
if (ctx.source) {
  if (details && typeof details === 'object') details = { source: ctx.source, ...details };
  else if (details == null) details = { source: ctx.source };
}

INSERT INTO audit_log
  (azione, utente_id, ip, user_agent, metodo, percorso, esito, dettagli)
VALUES
  (action,
   ctx.userId || null,
   ctx.ip || null,
   ctx.userAgent || null,
   ctx.method || null,
   ctx.path || null,
   opts.result || 'successo',
   details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null);
```

### Esempi reali (dal codice)

```js
// app/auth/routes.js
logAudit('login.success', auditCtx,
  { details: { must_change_password: !!user.forza_cambio_password } });

logAudit('login.failed', auditCtx,
  { result: 'fallito', details: { reason: 'account_locked', locked_until } });

// src/middleware/auth-gate.js
logAudit('auth.denied',
  { ip, userAgent, method, path: apiPath },
  { result: 'fallito' });

logAudit('csrf.failure',
  { userId: session.utente_id, ip, userAgent, method, path: apiPath },
  { result: 'fallito' });

// V3.M3.A12 — Eventi system originati da job (no HTTP context)
logAudit('audit.retention.run',
  { source: 'system:prune-audit-logs' },
  { details: { deleted: 1234 } });
// → dettagli registrato come {"source":"system:prune-audit-logs","deleted":1234}
```

> Da V3.M3.A12 i CRUD utenti **non** usano più `logAudit('admin.user.*')`: sono migrati a `logChange('utenti', …)` per produrre snapshot diff (vedi §2 esempi).

### Convenzione del campo `details`

- **Sempre JSON-serializzabile** (`JSON.stringify` viene applicato se non è già stringa).
- **NON deve contenere PHI** (nome paziente, codice fiscale, ecc.). Per quei dati esiste `before_data`/`after_data` cifrati: usare `logChange()`.
- Pensato come "info diagnostica + parametri di routing": id record, contatori, motivi di errore, flag booleani, timestamp.
- Per eventi system non-HTTP, `ctx.source` viene mergiato come prima chiave del JSON.

## 2. `logChange(table, id, action, before, after, ctx)`

Registra una **mutazione di dato**. Normalizza l'azione in `data.<table>.<action.toLowerCase()>`, applica la **redaction policy** (§3) sugli snapshot e li cifra.

### Firma

```js
logChange(
  table,           // string — es. 'utenti', 'appointments', 'list_entries'
  id,              // number|string — pkey del record
  action,          // string — 'INSERT' | 'UPDATE' | 'DELETE' | 'CASCADE_DELETE' | 'reset_password' | 'unlock' | …
  before,          // object|null — snapshot prima
  after,           // object|null — snapshot dopo
  ctx = {}         // { userId?, ip?, userAgent?, method?, path?, source? }
);
```

### Comportamento

```js
const azione = `data.${table}.${String(action).toLowerCase()}`;
// V3.M3.A12: applica redaction policy PRIMA di cifrare
const beforeRedacted = redactSnapshot(table, before);
const afterRedacted  = redactSnapshot(table, after);
const dettagli = ctx.source ? JSON.stringify({ source: ctx.source }) : null;

INSERT INTO audit_log
  (azione, utente_id, ip, user_agent, metodo, percorso, esito, dettagli,
   target_table, target_id, before_data, after_data)
VALUES
  (azione,
   ctx.userId || null, ctx.ip || null, ctx.userAgent || null,
   ctx.method || null, ctx.path || null,
   'successo',
   dettagli,                          -- null per HTTP, {source:...} per system
   table,
   Number(id) || null,
   beforeRedacted ? encField(JSON.stringify(beforeRedacted)) : null,   -- AES-256-GCM
   afterRedacted  ? encField(JSON.stringify(afterRedacted))  : null);
```

> `encField()` aggiunge il prefisso `enc:v1:` al ciphertext base64url. Se `LUMIA_ENCRYPTION_KEY` non è configurata, `encField()` ritorna il valore in chiaro (fail-soft) — vedi [05 §3](05-audit-retention-security.md).

### Adapter agenda — `app/agenda/models/audit.js`

Per non rompere i controller esistenti, esiste uno shim con la firma legacy:

```js
const audit = require('../models/audit');

audit.log(table, id, action, oldData, newData, userId);
//   → logChange(table, id, action, oldData, newData, { userId });

audit.logWithCtx(table, id, action, oldData, newData, httpCtx);
//   → estrae userId/ip/userAgent/method/path da httpCtx
//     e poi chiama logChange con ctx completo.
```

### Esempi nei controller

```js
// app/agenda/controllers/appointments.js — V3.M3.A12 coverage completa
const userId = ctx.session?.utente_id || null;
audit.log('appointments', created.id, 'INSERT', null, created, userId);
audit.log('appointments', id, 'UPDATE', existing, updated, userId);   // create / update
audit.log('appointments', id, 'UPDATE', existing, moved, userId);     // move
audit.log('appointments', id, 'UPDATE', existing, updated, userId);   // updateStatus
audit.log('appointments', id, 'DELETE', existing, null, userId);

// app/admin/routes.js — V3.M3.A12 sostituisce admin.user.* con data.utenti.*
logChange('utenti', user.id, 'INSERT', null, user, ctx);
logChange('utenti', id, 'UPDATE', existing, after, ctx);
logChange('utenti', id, 'reset_password', existing, after, ctx);    // → data.utenti.reset_password
logChange('utenti', id, 'unlock', existing, after, ctx);            // → data.utenti.unlock
logChange('utenti', id, 'DELETE', existing, null, ctx);
// In tutti i casi password_hash/salt/iterations vengono RIDOTTI a "<redacted>" prima di entrare nel blob cifrato (vedi §3).
```

### Casi `CASCADE_DELETE`

Quando una `DELETE` cascade trascina record correlati, **ogni riga eliminata genera la propria voce di audit** (separatamente). Esempio:

```js
// appointments.remove() — l'appuntamento ha richieste trasfusionali con emocomponenti
for (const tr of transfusionRequests) {
  audit.log('transfusion_requests', tr.id, 'CASCADE_DELETE',
    { ...tr, emocomponents: emos }, null, userId);
}
audit.log('appointments', id, 'DELETE', existing, null, userId);
```

In questo modo nel diff before→after del padre non si perde l'informazione di cosa è stato cancellato in cascata: lo si ritrova come righe sorelle nello stream `audit_log`.

## 3. Audit policy: whitelist + redaction

Modulo: `src/db/audit-policy.js` (V3.M3.A12).

Centralizza due responsabilità:

1. **Whitelist delle tabelle auditate** — chi non è in whitelist genera un warning a console (una volta per tabella) ma la `INSERT` audit avviene comunque (fail-open: meglio loggare un evento "non perfetto" che perdere la traccia).
2. **Regole di redaction** — per ciascuna tabella, l'elenco delle colonne che devono essere sostituite dal placeholder `"<redacted>"` *prima* dello snapshot. Si applica a `before` e `after`.

### Configurazione attuale

```js
TABLES = {
  // ── lumia.db ──
  utenti:   { redact: ['password_hash', 'salt', 'iterations'] },
  sessioni: { redact: ['token'] },

  // ── agenda.db ──
  appointments:              { redact: [] },
  list_entries:              { redact: [] },
  lists:                     { redact: [] },
  nodes:                     { redact: [] },
  transfusion_requests:      { redact: [] },
  transfusion_emocomponents: { redact: [] },
};
```

### Redaction vs cifratura — la regola di scelta

| Tipo di dato | Strategia | Motivo |
|--------------|-----------|--------|
| Hash password (`password_hash`, `salt`, `iterations`) | **Redaction** (`<redacted>`) | Irreversibile per design. Un admin che consulta l'audit non deve poter ricostruire l'hash, anche se salvato cifrato (la chiave di cifratura potrebbe essere compromessa). |
| Token di sessione (`sessioni.token`) | **Redaction** | Replay attack se esposto. |
| PHI/PII (nome paziente, email, codice fiscale, telefono, note cliniche) | **Cifratura at-rest** del blob | Il dato deve restare *leggibile in detail* per l'admin (audit forense legittimo). La cifratura protegge solo da accesso filesystem al `lumia.db`. |
| Campi strutturali (id, status, date, ruolo, contatori) | Nessuno | Servono nel diff per essere immediatamente leggibili. |

### Esempio di output

Una `data.utenti.update` su un record con email + password_hash, decifrata in detail dall'admin:

```json
{
  "before": {
    "id": 7, "username": "rossi", "email": "rossi@asl.it",
    "ruolo": "infermiere", "attivo": 1,
    "password_hash": "<redacted>", "salt": "<redacted>", "iterations": "<redacted>"
  },
  "after": {
    "id": 7, "username": "rossi", "email": "rossi@asl.it",
    "ruolo": "medico", "attivo": 1,
    "password_hash": "<redacted>", "salt": "<redacted>", "iterations": "<redacted>"
  }
}
```

L'admin vede chiaramente "ruolo: infermiere → medico", non vede il hash anche se lui stesso è admin.

### API del modulo

```js
const policy = require('./src/db/audit-policy');

policy.isAuditedTable('utenti');           // true
policy.isAuditedTable('foo_bar');          // false
policy.redactRule('utenti');               // { redact: ['password_hash','salt','iterations'], description: '…' }
policy.redactSnapshot('utenti', snapshot); // shallow clone con campi redatti
policy.REDACT_PLACEHOLDER;                 // '<redacted>'
policy.TABLES;                             // intero registry (Object.freeze)
```

### Aggiungere una tabella nuova

Quando un modulo introduce una nuova tabella che riceve scritture:

1. Aggiungere voce in `TABLES` con `redact: [...]` (vuoto se non ci sono segreti irreversibili).
2. Verificare che il controller chiami `logChange()` o usi lo shim `audit.log()`.
3. Eseguire smoke test: una `logChange` sulla tabella senza warning a console = policy registrata correttamente.

## 4. `pruneAuditLogs()`

Cancella le righe più vecchie del threshold di retention.

### Firma

```js
pruneAuditLogs() → number   // ritorna il numero di righe cancellate
```

### Comportamento

```js
const retentionDays = env('AUDIT_RETENTION_DAYS', 365);
DELETE FROM audit_log
WHERE creato_il < datetime('now', `-${retentionDays} days`);
```

### Schedule (V3.M3.A10)

Agganciato in `src/init.js` subito dopo `cleanupSessions`:

```js
// run subito al boot, poi ogni 24 ore
try { pruneAuditLogs(); } catch (e) { log.error({ msg: 'audit.prune.failed', err: e }); }
const auditPruneTimer = setInterval(() => {
  try { pruneAuditLogs(); } catch (e) { log.error({ msg: 'audit.prune.failed', err: e }); }
}, 24 * 60 * 60 * 1000);
auditPruneTimer.unref();   // non blocca lo shutdown
// shutdown handler:  clearInterval(auditPruneTimer);
```

## 5. Costruzione del `ctx` HTTP

Quasi tutti i call-site costruiscono il `ctx` allo stesso modo:

```js
const ctx = {
  userId:    session.utente_id,             // o null se anonimo
  ip:        getClientIp(req),              // src/lib/client-ip.js — rispetta TRUSTED_PROXIES
  userAgent: req.headers['user-agent'],
  method:    req.method,
  path:      req.url.split('?')[0]          // o ricostruito esplicitamente
};
```

Nei controller agenda, `audit.logWithCtx(httpCtx)` automatizza l'estrazione.

### Eventi senza request HTTP

Per eventi originati da timer / boot / job: passare `ctx = { source: 'system:<job-name>' }`. Tutti i campi HTTP restano `NULL` ma `dettagli` registra `{"source":"system:<job-name>"}` — sufficiente in detail per distinguere gli eventi non-utente da quelli HTTP. Esempio:

```js
logAudit('audit.retention.run',
  { source: 'system:prune-audit-logs' },
  { details: { deleted: 1234 } });
// dettagli risultante: {"source":"system:prune-audit-logs","deleted":1234}
```

## 6. Errori e fallimenti

- Le funzioni **non lanciano** in caso di payload inatteso — al massimo inseriscono `NULL` nei campi mancanti.
- Se `getDb()` non è inizializzato (chiamata pre-`initDatabase()`), `stmts()` lancerà — segnale di un bug di bootstrap.
- Eventuali eccezioni dal `INSERT` (es. lock SQLite) propagano al chiamante. È compito del chiamante decidere se fallire la richiesta utente o swallow (gli usi attuali in admin/auth fanno propagare; gli usi in `agenda/controllers` sono dentro la transaction del modello, quindi un fallimento dell'audit fa rollback della mutazione — comportamento conservativo desiderato).

## 7. Statement caching

Le due `prepare()` (per `insertEvent` e `insertChange`) sono **cachati una volta** alla prima invocazione, in una closure di modulo:

```js
let _stmts = null;
function stmts() {
  if (_stmts) return _stmts;
  const db = getDb();
  _stmts = {
    insertEvent: db.prepare(`INSERT INTO audit_log (azione, …, dettagli) VALUES (?,?,?,?,?,?,?,?)`),
    insertChange: db.prepare(`INSERT INTO audit_log (azione, …, after_data) VALUES (?,?,…,?,?,?)`),
  };
  return _stmts;
}
```

Costo per evento ≈ una `Stmt#run()` (microsecondi su sql.js); il flush su disco è gestito dal wrapper.
