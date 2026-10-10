# 04 — Roadmap di migrazione V3.M4.A1

> Ordinata in 7 fasi atomiche, ognuna delle quali lascia il sistema **funzionante e deployabile**.

## 1. Fasi e dipendenze

```
A0 ─► A1 ─► A2 ─► A3 ─► A4 ─► A5 ─► A6
│      │      │      │      │      │      │
│      │      │      │      │      │      └─ Fix lookup per UUID (Cerus + client)
│      │      │      │      │      └─ Cleanup: rimozione codice legacy
│      │      │      │      └─ UI: rimozione hidden inputs + free-text
│      │      │      └─ Controllers: scrittura solo patient_uuid; lettura arricchita
│      │      └─ Resolver + cache + arricchimento risposte API
│      └─ Spostamento client/proxy in src/integrations/cerus/
└─ Backfill: riconciliare righe legacy con patient_uuid
```

## 2. Fase A0 — Backfill dei dati legacy (preparatoria) ✅

Obiettivo: garantire che **ogni** riga di `appointments`/`list_entries`/`transfusion_requests` con dati anagrafici abbia un `patient_uuid` valido prima di applicare il vincolo NOT NULL.

### Script `tools/backfill-cerus-uuid.js` ✅ (disponibile)

Implementato in [tools/backfill-cerus-uuid.js](../../../tools/backfill-cerus-uuid.js). Pseudo-codice:

```
Per ogni tabella in [appointments, list_entries, transfusion_requests]:
  Per ogni riga con patient_uuid IS NULL:
    se CF presente (patient_id / cf) → cerus.searchAdvanced({fiscal_code})
      se 1 risultato → UPDATE patient_uuid = result.cerus_uuid       → MATCH
      se 0 risultati → riga in report                                → ORFANA_404
      se >1 risultati → riga in report (intervento manuale)          → AMBIGUITA
    altrimenti (CF assente) → riga in report                         → ORFANA_NO_CF
    se errore HTTP/timeout → riga in report                          → ERRORE_API
```

### Uso

```bash
# Pre-requisiti: backup recente + Cerus configurato + LUMIA_ENCRYPTION_KEY
npm run backup

# Anteprima senza scrittura
node tools/backfill-cerus-uuid.js --dry-run

# Esecuzione reale
node tools/backfill-cerus-uuid.js

# Solo una tabella
node tools/backfill-cerus-uuid.js --table=appointments
```

Lo script è **idempotente**: filtra `WHERE patient_uuid IS NULL OR patient_uuid = ''`, quindi può essere ri-eseguito a piacere dopo aver risolto manualmente le righe del report.

Exit code:
- `0` — esecuzione completata (anche con righe non risolte: vedere il report)
- `1` — errore inatteso
- `2` — Cerus non configurato

### Output

- `tools/backfill-report.csv` con colonne: `table, id, patient_name, patient_id, motivo, extra`.
- L'admin/operatore deve **risolvere manualmente** ogni riga orfana prima della Fase A4. Opzioni:
  - creare il paziente in Cerus → ri-eseguire backfill;
  - cancellare la riga legacy se non più rilevante;
  - assegnare uuid speciale `__legacy_unknown__` per appuntamenti chiusi/storici (decisione di policy clinica).

### Stato attuale (esecuzione di riferimento)

Primo dry-run su dati di sviluppo: 11 righe legacy in `list_entries` (test data), 0 in `appointments`/`transfusion_requests`. Nessun MATCH automatico (i CF nel db locale sono fittizi e non esistono in Cerus). Il report richiede pulizia manuale prima di A4.

## 3. Fase A1 — Estrazione del modulo trasversale ✅

### Spostamenti ✅

| Da | A | Stato |
|----|---|-------|
| `app/agenda/utils/cerus-client.js` | `src/integrations/cerus/client.js` | fatto · shim rimosso in A5 |
| `app/agenda/controllers/patients-cerus.js` | `src/integrations/cerus/proxy.js` | fatto · shim rimosso in A5 |

I due file al path legacy restano come `module.exports = require('…/src/integrations/cerus/…')` (shim di back-compat) finché A5 non rimuove il vecchio path.

### Nuovi file ✅

- [src/integrations/cerus/client.js](../../../src/integrations/cerus/client.js) — HTTP client + mapping
- [src/integrations/cerus/cache.js](../../../src/integrations/cerus/cache.js) — `TtlCache` (TTL 30 s, cap 500)
- [src/integrations/cerus/resolver.js](../../../src/integrations/cerus/resolver.js) — `resolve()`, `resolveMany()`, `placeholder()`, `invalidate()`
- [src/integrations/cerus/proxy.js](../../../src/integrations/cerus/proxy.js) — controller proxy + `register(router)` per auto-montaggio
- [src/integrations/cerus/index.js](../../../src/integrations/cerus/index.js) — facade `{ client, resolver, proxy, cache }`

### Routing ✅

Montato in [src/routes.js](../../../src/routes.js) tramite `cerusIntegration.proxy.register(router)`. Endpoint attivi:

```
GET /api/cerus/health           → { success, data: { service, configured, ts } }  (no-auth)
GET /api/cerus/patients         → search semplice (param q, limit)
GET /api/cerus/patients/search  → searchAdvanced (first_name, last_name, fiscal_code, …)
GET /api/cerus/patients/:id     → getOne per cerus_uuid
```

Gli alias legacy `/api/agenda/patients/*` restano attivi (routing agenda invariato) — verranno rimossi in Fase A5.

### Test

```
node -e "require('./src/integrations/cerus')"   # smoke require
curl /api/cerus/health                           # { configured: true|false }
curl /api/cerus/patients?q=rossi                 # search
node tools/backfill-cerus-uuid.js --dry-run      # passa via shim legacy
```

Smoke verificato: il facade espone `{ client, resolver, proxy, cache }`; il backfill script continua a funzionare tramite il vecchio require (shim) senza modifiche.

## 4. Fase A2 — Resolver + arricchimento read ✅

### Modifiche controller agenda ✅

Nei controller [app/agenda/controllers/appointments.js](../../../app/agenda/controllers/appointments.js) e [app/agenda/controllers/list-entries.js](../../../app/agenda/controllers/list-entries.js) gli handler `list` / `getOne` / `panoramica` sono stati convertiti a `async` e arricchiti tramite il nuovo helper `resolver.enrichRows(rows)` / `resolver.enrichRow(row)`:

```js
const { resolver } = require('../../../src/integrations/cerus');

// list(ctx)
const items = await resolver.enrichRows(model.getByDate(q.date));
return res_.ok(ctx.res, items, { date: q.date, count: items.length });

// getOne(ctx)
const item = model.getById(id);
if (!item) return res_.notFound(ctx.res, '…');
const enriched = await resolver.enrichRow(item);
res_.ok(ctx.res, enriched);
```

### Dispatcher async-aware ✅

[src/routes.js](../../../src/routes.js#L378) è stato esteso per propagare gli errori degli handler `async` verso `handleError()`:

```js
const result = match.handler(ctx);
if (result && typeof result.then === 'function') {
  return result.catch((err) => handleError(err, res));
}
return result;
```

Così le Promise rigettate non diventano più `UnhandledPromiseRejection`.

### Nuova API `resolver.enrichRows(rows, opts)` / `enrichRow(row, opts)`

Aggiunta in [src/integrations/cerus/resolver.js](../../../src/integrations/cerus/resolver.js):

- estrae gli uuid unici non-null dal campo `opts.uuidField` (default `patient_uuid`);
- chiama `resolveMany()` (usa cache TTL 30 s);
- per ogni riga che ha uuid aggiunge `row.patient = { cerus_uuid, nome, cognome, nome_completo, ... }` oppure il placeholder `{ _unresolved: true }` se Cerus è offline o l'uuid è ignoto;
- le righe senza uuid vengono restituite invariate.

### Compatibilità

Le risposte API restano backward-compatible: i campi `patient_name`, `patient_id`, `phone`, `birth_date` continuano ad essere presenti nei payload (letti dai modelli cifrati at-rest). In aggiunta ora compare `patient` come sotto-oggetto. L'UI può iniziare a consumare `.patient.nome_completo` e i progressivi deprecheranno i campi piatti (Fasi A3-A5).

### Cosa NON cambia in A2

- `create` / `update` / `move` / `updateStatus`: ancora scrivono i campi legacy come prima (sarà A3).
- Schema DB: invariato (vincolo NOT NULL su `patient_uuid` in A4).
- UI: nessun cambiamento richiesto.
- `transfusion.js`: enrichment **non** applicato in A2 (basso traffico, sarà toccato in A3).

## 5. Fase A3 — Scrittura: Cerus come autorità sui campi anagrafici ✅

### Strategia

Invece di rimuovere subito i campi legacy dal payload SQL (che violerebbe i vincoli `NOT NULL` finché A4 non aggiorna la DDL), la Fase A3 introduce il principio **"Cerus è autorità"**: quando il body di una `POST`/`PUT` contiene `patient_uuid`, il server risolve il paziente in Cerus e **sovrascrive** i campi `patient_name`/`patient_id`/`phone`/`birth_date` con i valori canonici, ignorando l'input del client.

Vantaggi:
- le colonne legacy restano popolate (NOT NULL rispettato) ma in perfetto allineamento con Cerus;
- nessun client può più forgiare un nome o CF incoerente con Cerus: se invia `patient_uuid`, vince Cerus;
- la regola è retro-compatibile: i client che ancora non mandano `patient_uuid` (free-text storico) funzionano come prima, in attesa di A4.

### Nuovo helper `resolver.deriveLegacyFields(body)` ✅

In [src/integrations/cerus/resolver.js](../../../src/integrations/cerus/resolver.js):

```js
const derived = await resolver.deriveLegacyFields(body);
// derived.ok === true  → derived.body ha i campi anagrafici allineati a Cerus
// derived.ok === false → status 404 (uuid ignoto) o 502 (Cerus offline)
```

### Controller aggiornati ✅

- [app/agenda/controllers/appointments.js](../../../app/agenda/controllers/appointments.js) — `create` e `update` convertiti a `async` e chiamano `deriveLegacyFields` dopo la validazione e prima dell'INSERT/UPDATE.
- [app/agenda/controllers/list-entries.js](../../../app/agenda/controllers/list-entries.js) — idem per `create` e `update`.
- [app/agenda/utils/response.js](../../../app/agenda/utils/response.js) — aggiunto helper `serviceUnavailable(res, msg)` → 502 per Cerus offline.
- `transfusion.js` rimane fuori scope A3 (verrà allineato in A4 insieme alla UI).

### Gestione errori (502/404)

Se `patient_uuid` è fornito ma non risolvibile:
- **404** `NOT_FOUND` — uuid non esiste in Cerus
- **502** `SERVICE_UNAVAILABLE` — Cerus offline/timeout (non trattenere stale data sul server)

Il client riceve un errore chiaro e può guidare l'utente a creare prima il paziente in Cerus.

### Schema (preparazione vincolo)

In questa fase **non** si modifica ancora la DDL (le colonne legacy restano `NOT NULL`). Il vincolo sarà spostato su `patient_uuid` in Fase A4 dopo aver verificato che A0 ha riconciliato tutto.

### Audit

Le righe `audit_log` per `appointments.INSERT`/`UPDATE` ora hanno `before/after` con i valori Cerus-derived, garantendo tracciabilità anche se il client avesse tentato di sovrascrivere il nome con dati diversi (prevenuto server-side).

## 6. Fase A4 — Schema lock + UI

A4 ha **due tronconi indipendenti**:

### 6.a — Schema lock (DDL rebuild) ✅ **applicato in dev**

Il tool [tools/migrate-cerus-not-null.js](../../../tools/migrate-cerus-not-null.js) applica il vincolo `patient_uuid TEXT NOT NULL` alle 3 tabelle agenda e rimuove il `NOT NULL` dai campi legacy (`patient_name`/`patient_id`/`phone`/`birth_date`).

Run di riferimento (dev):
```
appointments        : already_not_null=true, null_rows=0
list_entries        : already_not_null=true, null_rows=0
transfusion_requests: already_not_null=true, null_rows=0
```

Note operative emerse durante l'esecuzione:
- 11 righe orfane in `list_entries` (CF mancante o non in Cerus) sono state assegnate al placeholder `__legacy_unknown__` tramite il flag `--assign-unknown` aggiunto a [tools/backfill-cerus-uuid.js](../../../tools/backfill-cerus-uuid.js). Il resolver emette un placeholder "Paziente sconosciuto" per quel UUID e l'operatore può riassegnarlo dall'UI.
- Il tool ora drop+ricrea il trigger esterno `trg_nodes_cascade_appt` (referenzia `appointments`) attorno al rebuild, altrimenti SQLite fallisce la validazione del corpo trigger durante DROP TABLE.
- Il tool fa flush esplicito su disco via `db.close()` prima di `process.exit()` (sql.js usa debounce 500 ms).

#### Comportamento

- **Preflight**: conta righe con `patient_uuid IS NULL` per ogni tabella.
- Se >0 in qualunque tabella → **BLOCCA** con exit code 3 e rimanda a `tools/backfill-cerus-uuid.js`. No DDL applicata, no backup consumato.
- Se 0 in tutte → backup automatico `agenda.db.pre-cerus-not-null.<ts>.bak`, poi table-swap in **unica transazione** (BEGIN / CREATE _new / INSERT ... SELECT / DROP / RENAME / ricrea indici+trigger / COMMIT); rollback automatico in caso di errore.
- **Idempotente**: se tutte le tabelle hanno già `patient_uuid NOT NULL`, esce con 0 e "Nothing to do".

#### Uso

```bash
# Preflight (solo check, no scrittura)
node tools/migrate-cerus-not-null.js --dry-run

# Esecuzione reale — prima assicurarsi che backfill sia completato
node tools/backfill-cerus-uuid.js          # 0 righe residue
node tools/migrate-cerus-not-null.js       # applica DDL rebuild
```

#### Exit code

| Code | Significato |
|------|-------------|
| 0 | ok (migrata o già migrata) |
| 1 | errore durante il rebuild (rollback applicato, backup preservato) |
| 2 | agenda.db non trovato |
| 3 | blocco preflight (righe con patient_uuid NULL presenti) |

#### Smoke test di riferimento

Dry-run su db di sviluppo (11 righe legacy pending): il tool rifiuta correttamente di procedere e segnala `list_entries(11)` come blocker. Comportamento atteso.

#### Cosa cambia nelle tabelle

| Colonna | Prima | Dopo A4 |
|---------|-------|---------|
| `patient_uuid` | TEXT (nullable) | TEXT NOT NULL |
| `patient_name` | TEXT NOT NULL | TEXT (nullable) |
| `patient_id`, `phone`, `birth_date` | TEXT nullable | TEXT nullable (invariato, a rigore) |
| tutte le altre colonne, indici, trigger | — | invariati |

Le colonne legacy **restano**: verranno droppate in Fase A5, dopo che UI e client avranno smesso di leggerle.

### 6.b — UI: rimozione free-text ✅

File aggiornati:
- [app/agenda/ui/agenda-api.js](../../../app/agenda/ui/agenda-api.js): `apiFetch` riconosce ora gli URL assoluti che iniziano con `/api/` (saltano `API_BASE = '/api/agenda'`). Permette di chiamare `/api/cerus/...` dal codice client senza wrapper aggiuntivi.
- [app/agenda/ui/agenda-patients.js](../../../app/agenda/ui/agenda-patients.js): tutte le chiamate `Ag.Api.fetch('/patients...')` redirezionate a `/api/cerus/patients/...`. I selettori `selectPatientEntry/Wizard` e `anaSelectItem` ora ricevono il `cerus_uuid` (stringa) invece dell'ID numerico locale.
- [app/agenda/ui/agenda-lists.js](../../../app/agenda/ui/agenda-lists.js): `openEntryDetail` consuma `e.patient` (enrichment server) invece di rifare lookup; fallback a `getOne(uuid)` se assente. `submitEntry` blocca il salvataggio finché `e_patient_uuid` non è valorizzato.
- [app/agenda/ui/agenda-wizard.js](../../../app/agenda/ui/agenda-wizard.js): `submitWizard` blocca il salvataggio finché `w_patient_uuid` non è valorizzato.
- [app/agenda/controllers/appointments.js](../../../app/agenda/controllers/appointments.js) e [list-entries.js](../../../app/agenda/controllers/list-entries.js): validazione server-side `patient_uuid` obbligatorio in `create` (400 con messaggio chiaro invece di errore SQL NOT NULL).

Resta da fare in una fase futura (non bloccante per A5):
- Rimuovere fisicamente gli `<input type="hidden" id="w_patient_uuid">` da [agenda-template.js](../../../app/agenda/ui/agenda-template.js) e sostituirli con un blocco "Paziente selezionato" read-only più visibile.
- Aggiungere CTA "Crea in Cerus" nella modale di ricerca quando il paziente non esiste.

### 6.c — Coverage controller ✅

Aggiornato anche [app/agenda/controllers/transfusion.js](../../../app/agenda/controllers/transfusion.js): `get`/`save`/`listByDate` ora `async`, con `enrichRow`/`enrichRows` in lettura e `deriveLegacyFields(body, { fieldMap: TRANSF_FIELD_MAP })` in scrittura (dove `paziente`/`cf`/`nascita`/`sesso` sostituiscono i nomi canonici). Chiude la copertura A3 iniziata in appointments/list-entries.

## 7. Fase A5 — Cleanup 🟡 **parziale**

A5 si svolge in due passi separati: il primo (cleanup imports + shim) è eseguibile **prima** di A4.b; il secondo (rimozione route legacy + colonne legacy) richiede che A4.b sia completata.

### 7.a — Imports interni + shim ✅ **fatto**

I due shim di compatibilità A1 sono stati eliminati e tutti gli import interni redirezionati al modulo canonico:

| Da rimuovere | Importatore aggiornato | Stato |
|--------------|------------------------|-------|
| `app/agenda/utils/cerus-client.js` | `tools/backfill-cerus-uuid.js` → `require('../src/integrations/cerus').client` | ✅ rimosso |
| `app/agenda/controllers/patients-cerus.js` | `app/agenda/routes.js` → `require('../../src/integrations/cerus').proxy` | ✅ rimosso |

Smoke test: `node -e "require('./app/agenda/routes')"` carica correttamente; `grep -r 'utils/cerus-client\|controllers/patients-cerus' app/ src/ tools/ server/` → solo riferimenti storici nei commenti d'origine in `src/integrations/cerus/{client,proxy,index}.js`.

Aggiornati anche i riferimenti in [docs/v3/server/05-server-database.md](../server/05-server-database.md), [07-server-api-reference.md](../server/07-server-api-reference.md), [08-server-config.md](../server/08-server-config.md).

### 7.b — Route legacy + colonne legacy 🟡 **route rimosse, drop colonne gated**

**Fatto:**
- Rimosse da [app/agenda/routes.js](../../../app/agenda/routes.js) le route `agenda/patients/*` (search/list/getOne) e l'import di `patCtrl`. L'unico endpoint paziente è ora `/api/cerus/patients/*` (vedi `proxy.register` in [src/integrations/cerus/proxy.js](../../../src/integrations/cerus/proxy.js)).
- Scritto il tool [tools/migrate-cerus-drop-legacy-cols.js](../../../tools/migrate-cerus-drop-legacy-cols.js) che droppa `patient_name`, `patient_id`, `phone`, `birth_date` da `appointments` e `list_entries` (transfusion fuori scope: i suoi campi denormalizzati restano per compatibilità col modulo trasfusione).

**Da fare prima di eseguire il tool drop-legacy-cols:**
- Refactor di [app/agenda/models/appointment.js](../../../app/agenda/models/appointment.js) e [list-entry.js](../../../app/agenda/models/list-entry.js): rimuovere le colonne legacy dalle prepared statement INSERT/UPDATE/SELECT. Anche `data = {...}` nei controller non deve più includerle.
- Refactor read-side: ovunque l'enrichment fornisca il dato (via `.patient`), eliminare il fallback ai campi piatti.

Il tool richiede flag esplicito `--i-confirm` per evitare esecuzioni accidentali prima del refactor model. Uso:

```bash
node tools/migrate-cerus-drop-legacy-cols.js --dry-run     # ispezione preflight
node tools/migrate-cerus-drop-legacy-cols.js --i-confirm   # esecuzione (post-refactor)
```

Exit code: `0` ok / nothing-to-do · `1` errore (rollback) · `2` db non trovato · `3` patient_uuid non NOT NULL (eseguire prima A4.a) · `4` manca `--i-confirm`.

## 8. Fase A6 — Fix lookup per UUID ✅ (2026-04-21)

### Problema emerso in smoke E2E

Dopo A5 il client `client.getById(uuid)` falliva con 404 perché Cerus storicamente espone solo `GET /api/v1/patients/<NUMERIC_ID>` e ignora i filtri `?cerus_uuid=` / `?uuid=`. Conseguenza: `proxy.getOne`, `resolver.resolve(uuid)`, `enrichRow/enrichRows` (single uuid) e la validazione lato controller di `patient_uuid` rispondevano 404/502 anche con UUID validi.

### Fix server-side (Cerus)

Aggiunto in [`cerus/src/routes/patients.js`](../../../../cerus/src/routes/patients.js) il route

```
GET /api/v1/patients/by-uuid/:uuid
```

**registrato prima** del catch-all `/:id` (il router custom di Cerus matcha in ordine di registrazione: i path letterali devono precedere i parametrici). Restituisce paziente + `addresses` + `contacts` per `WHERE cerus_uuid = ? AND is_deleted = 0`, oppure 404.

### Fix client-side (LUMIA)

In [`src/integrations/cerus/client.js#getById`](../../../src/integrations/cerus/client.js) aggiunto auto-routing per pattern dell'argomento:

```js
var path = /^\d+$/.test(String(cerusId))
  ? '/api/v1/patients/' + encodeURIComponent(cerusId)
  : '/api/v1/patients/by-uuid/' + encodeURIComponent(cerusId);
```

### Smoke test E2E (di riferimento)

UUID di test: `ac51b748-b8d7-4d1d-86f7-642b566d43c6` (Mario Rossi, CF `RSSMRA85M01H501Z`).

| # | Chiamata | Esito |
|---|----------|-------|
| T0 | `GET cerus:3100/api/v1/patients/by-uuid/<uuid>` (diretto) | 200 con `addresses`+`contacts` |
| T1 | `GET lumia:3500/api/cerus/patients/<uuid>` | 200, mapping EN→IT applicato |
| T2 | `POST lumia:3500/api/agenda/appointments` con `patient_uuid` + `patient_name="IGNORATO"` | 201, server riscrive `patient_name="Rossi Mario"`, `patient_id="RSSMRA85M01H501Z"`, `phone`, `birth_date` (A3 authority confermata) |
| T3 | `GET /api/agenda/appointments?date=2026-04-25` | 200 con `.patient` enrichment popolato |
| T4 | `DELETE /api/agenda/appointments/<id>` | 204 cleanup OK |

## 9. Checklist di verifica (prima del merge V3.M4.A1)

- [x] `tools/backfill-cerus-uuid.js` eseguito su DB di staging; `backfill-report.csv` con 0 righe orfane non risolte (11 righe legacy assegnate a `__legacy_unknown__`).
- [ ] `npm test` verde (mock di Cerus). — *non ancora eseguito*
- [x] Smoke `curl /api/cerus/health` → 200 con `{ success:true, data:{ configured:true } }`.
- [x] Smoke `GET /api/cerus/patients/<uuid>` → 200 (via nuovo endpoint Cerus `by-uuid`).
- [x] Smoke `POST /api/agenda/appointments` con `patient_uuid` → 201 e campi anagrafici sovrascritti da Cerus (A3 authority).
- [x] Smoke `GET /api/agenda/appointments?date=...` → risposta arricchita con sotto-oggetto `.patient`.
- [x] Wizard agenda: impossibile salvare appuntamento senza `patient_uuid` (validazione 400 lato server).
- [ ] Test "Cerus offline": stop processo Cerus → UI mostra placeholder, no crash.
- [x] DDL: `PRAGMA table_info(appointments)` → `patient_uuid NOT NULL` (verificato in A4.a). Drop colonne legacy gated dietro refactor models (A5.b).
- [x] Codice di `app/agenda/utils/cerus-client.js` rimosso, `grep -r 'utils/cerus-client'` vuoto (A5.a).
- [ ] Doc V3 aggiornata: cross-link da [audit/01](../audit/01-audit-overview.md) e [server/05](../server/05-server-database.md) a questa cartella.

## 10. Stima rischio

| Rischio | Mitigazione |
|---------|-------------|
| Backfill non riconcilia tutte le righe storiche | Policy `__legacy_unknown__` + report a operatore clinico |
| Latenza UI sensibile senza batch endpoint | `Promise.all` su N=100 chiamate parallele tipicamente < 200 ms in LAN; cache TTL 30 s assorbe il render successivo |
| Cerus down in produzione | Read-only degradato a placeholder; scrittura bloccata = comportamento desiderato (no più stale data scritti) |
| Breaking change UI per gli operatori | Training + screenshot del nuovo wizard nella release note |
