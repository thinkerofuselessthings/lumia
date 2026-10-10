# 03 — Architettura target (to-be) — V3.M4.A1

> Stato dell'integrazione **dopo** il completamento della milestone V3.M4.A1.

## 1. Vista di insieme

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser                                                          │
│  - mostra dati anagrafici risolti dinamicamente                  │
│  - non tiene mai stato anagrafico oltre la sessione UI corrente  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP /api/cerus/patients/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LUMIA server                                                     │
│                                                                  │
│  ┌─────────────────────────────────────────────────┐             │
│  │  src/integrations/cerus/                        │  trasversale│
│  │   ├─ client.js     (HTTP, mapping, cache TTL)   │  a tutti i  │
│  │   ├─ proxy.js      (router /api/cerus/...)      │  moduli      │
│  │   └─ resolver.js   (resolve(uuid) + batch)      │             │
│  └─────────────────────────────────────────────────┘             │
│              ▲                                                    │
│   require    │   require                                          │
│   ┌──────────┴──────────┬─────────────────┬─────────────────┐    │
│   │ app/agenda/         │ app/prestazioni │ admin/transfusione│   │
│   └─────────────────────┴─────────────────┴─────────────────┘    │
│                                                                   │
│  agenda.db                                                        │
│   appointments (patient_uuid NOT NULL)                            │
│   list_entries (patient_uuid NOT NULL)                            │
│   transfusion_requests (patient_uuid NOT NULL)                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP (X-User-Id/X-User-Key)
                             ▼
                       ┌──────────────┐
                       │  Cerus API   │
                       └──────────────┘
```

## 2. Schema target

```sql
-- agenda.db (post-migrazione V3.M4.A1)

CREATE TABLE appointments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_uuid TEXT    NOT NULL,            -- unico riferimento all'anagrafica
  -- NESSUN patient_name, patient_id (CF), phone, birth_date
  doctor       TEXT,
  room_id      INTEGER,
  type         TEXT NOT NULL CHECK(type IN ('visita','terapia','prestazione')),
  title        TEXT NOT NULL,
  description  TEXT,
  -- ... (campi appuntamento puri)
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE INDEX idx_appt_patient_uuid ON appointments(patient_uuid);
```

Stessa rimozione su `list_entries` e `transfusion_requests`. Il vincolo NOT NULL su `patient_uuid` è applicato **solo** dopo che la migrazione dati ha riconciliato le righe legacy (vedi [04 §3](04-cerus-migration.md#3-piano-dati-legacy)).

### Cosa tenere

Sopravvivono i campi clinici/operativi che **non** esistono in Cerus:

- `notes` (annotazioni dell'operatore sull'appuntamento)
- `status` (`scheduled` / `confirmed` / …)
- campi specifici della trasfusione (peso, infusione, prodotto richiesto…)

Questi non sono anagrafici — restano in `agenda.db`.

## 3. Modulo `src/integrations/cerus/`

```
src/integrations/cerus/
├── client.js      # HTTP a Cerus + mapping EN→IT (ex cerus-client.js)
├── resolver.js    # resolve(uuid) + resolveMany(uuids[]) con cache TTL
├── proxy.js       # Router /api/cerus/patients/* (ex patients-cerus.js)
├── cache.js       # LRU + TTL (process-local, no Redis per ora)
└── index.js       # facade pubblica { client, resolver, mountProxy }
```

### Cache di processo (`cache.js`)

- Map LRU (max 500 voci);
- TTL 30 s (configurabile via `CERUS_CACHE_TTL_MS`, default 30000);
- chiave = `cerus_uuid`;
- valore = `{ data: PatientMapped, exp: Date.now() + ttl }`;
- invalidata su miss del `cerus_uuid` (404 da Cerus);
- **mai persistita su disco** — niente PHI a riposo.

### Resolver (`resolver.js`)

```js
// API pubblica
async function resolve(uuid)              → PatientMapped | null
async function resolveMany(uuids)         → Map<uuid, PatientMapped>
function placeholder(uuid)                → { uuid, display: '<paziente non disponibile>' }
```

`resolveMany` usa il batch endpoint `POST /api/v1/patients/by-uuids` (vedi §4) quando disponibile, altrimenti fa N chiamate parallele con `Promise.all`.

### Proxy (`proxy.js`)

Endpoint pubblici, montati in `src/routes.js` su `/api/cerus`:

| Method | Path | Scope |
|--------|------|-------|
| GET    | `/api/cerus/patients?q=…` | search free-text |
| GET    | `/api/cerus/patients/search?first_name=…&fiscal_code=…` | search strutturata |
| GET    | `/api/cerus/patients/:uuid` | dettaglio singolo (uuid o numeric id; passa per cache) |
| GET    | `/api/cerus/health` | smoke-check (`isConfigured()`) |

**Non** esistono endpoint POST/PUT/DELETE per la creazione/modifica anagrafica: questa rimane esclusiva di Cerus stesso. La risoluzione batch usata da `enrichRows` è interna al server (`Promise.all` di N `getById`) e non è esposta come HTTP.

## 4. Endpoint upstream Cerus utilizzati

LUMIA usa queste rotte di Cerus tramite [`src/integrations/cerus/client.js`](../../../src/integrations/cerus/client.js):

| Cerus | Uso LUMIA |
|-------|-----------|
| `GET /api/v1/patients?q=&limit=` | `client.search()` |
| `GET /api/v1/patients/search?first_name=&…` | `client.searchAdvanced()` |
| `GET /api/v1/patients/<NUMERIC_ID>` | `client.getById(numericId)` |
| `GET /api/v1/patients/by-uuid/<uuid>` | `client.getById(uuid)` — *aggiunto in A6 (2026-04-21), vedi [04 §8](04-cerus-migration.md#8-fase-a6--fix-lookup-per-uuid)* |

### Batch endpoint (evoluzione futura)

Un ipotetico:

```
POST /api/v1/patients/by-uuids
Headers: X-User-Id, X-User-Key
Body:    { "uuids": ["abc-123", "def-456", ...] }   (max 100)
Response:
{
  "success": true,
  "data": {
    "abc-123": { id, cerus_uuid, first_name, last_name, ... },
    "def-456": { id, cerus_uuid, ... },
    "ghi-789": null      // not found
  }
}
```

**Stato**: non implementato. Finché non disponibile, `resolveMany` cade su N chiamate parallele (`Promise.all` su `getById` con cache TTL 30 s che assorbe le ripetizioni). Da concordare con il team Cerus solo se il profilo di carico lo giustifica.

## 5. Flussi operativi

### 5.1 Creazione appuntamento

```
Browser                          LUMIA                  Cerus
  │ apre wizard                    │                      │
  │ digita "Rossi"                 │                      │
  ├─ GET /api/cerus/patients?q=Rossi ──────►              │
  │                                ├──── proxy ──────────►│
  │ ◄ [{uuid, nome_completo, cf}…] ◄───────               │
  │ utente seleziona → form mostra │                      │
  │   uuid + display readonly      │                      │
  │ POST /api/agenda/appointments  │                      │
  │   { patient_uuid, type, … }    │                      │
  ├─────────────────────────────►  │ INSERT (1 colonna)   │
  │                                │                      │
  ◀── 201 ─────────                                       │
```

**Niente più hidden inputs** `patient_name`/`patient_id`/`phone`/`birth_date`. Il wizard ha un solo campo paziente: la scelta da Cerus, con un display read-only sotto.

### 5.2 Caso "paziente non in Cerus"

L'UI mostra un CTA **"Crea in Cerus"** che apre Cerus in una nuova tab/iframe. Quando l'utente torna in LUMIA può ripetere la ricerca. Nessun fallback free-text.

### 5.3 Lettura agenda del giorno

```
Browser                          LUMIA                  Cerus
  │ GET /api/agenda/appointments?date=2026-04-22         │
  ├──────────────────────────────►│                      │
  │                               │ SELECT (uuid, type, title…)
  │                               │ → estrae uuid distinct
  │                               │ → resolver.resolveMany([...])
  │                               │      │
  │                               │      ├ cache hit per N1
  │                               │      └ batch a Cerus per N2
  │                               │                      ├─ POST /by-uuids
  │                               │                      │
  │                               │      ◄───────────────┤
  │                               │ merge anagrafica + appt
  ◀── [{uuid, nome_completo, type, title, …}] ──         │
```

Risposta API agenda **arricchita**: il client riceve già `patient_display` (nome completo) e `patient_data` (oggetto completo opzionale), senza dover fare chiamate aggiuntive lato browser.

### 5.4 Cerus offline

- Lettura: `resolveMany` ritorna `placeholder(uuid)` per ogni UUID non risolvibile → l'UI mostra `⚠ paziente non disponibile (uuid: abc-123-…)`.
- Scrittura: la ricerca paziente fallisce con errore esplicito; il wizard impedisce il submit (no `patient_uuid` valido).
- Rotture esistenti: gli appuntamenti già creati restano accessibili (uuid noto), solo il display è degradato.

## 6. Audit e sicurezza

- `audit-policy.js`: tabelle `appointments`/`list_entries`/`transfusion_requests` restano in whitelist con `redact: []`. Il `patient_uuid` è opaco e non costituisce PHI di per sé.
- Le chiamate a Cerus **non vengono auditate** in `audit_log` (volume troppo alto, sono read-only, e Cerus stesso ha il suo audit interno).
- Le credenziali `X-User-Id`/`X-User-Key` restano in `lumia.config.json` con permessi filesystem stretti, mai esposte al browser. Considerare il loro spostamento in `.env` come step di hardening.
- Il proxy LUMIA applica il middleware `requireAuth` (qualsiasi utente LUMIA loggato può consultare): l'autorizzazione fine-grained è demandata a Cerus.

## 7. Cosa **non** cambia

- `lumia.config.json → cerus.{baseUrl,userId,userKey,timeout}` resta la fonte di config (con env override).
- Il mapping campi EN→IT (`mapPatient`) resta concettualmente identico, solo spostato.
- Il modulo `agenda` continua a possedere appointments/list_entries/transfusion_requests; **solo** la risoluzione anagrafica diventa esterna.
