# 02 — Stato attuale (as-is)

> Snapshot dell'integrazione Cerus prima dell'avvio della milestone V3.M4.A1.

## 1. Componenti

| Componente | Path | Ruolo |
|------------|------|-------|
| Client HTTP | [`app/agenda/utils/cerus-client.js`](../../../app/agenda/utils/cerus-client.js) | `request()`, `search()`, `getById()`, `searchAdvanced()`, `mapPatient()`, `mapPatientList()`. Risolve config da env (`CERUS_*`) o file (`lumia.config.json → cerus`). |
| Proxy controller | [`app/agenda/controllers/patients-cerus.js`](../../../app/agenda/controllers/patients-cerus.js) | Endpoints `GET /api/agenda/patients` (search), `GET /api/agenda/patients/:id` (detail), `GET /api/agenda/patients/advanced`. Solo READ; nessun POST/PUT/DELETE (CRUD esclusivo Cerus). |
| Config | [`lumia.config.json`](../../../lumia.config.json) → `cerus.{baseUrl,userId,userKey,timeout}` | File-based; env vars `CERUS_BASE_URL`/`CERUS_USER_ID`/`CERUS_USER_KEY`/`CERUS_TIMEOUT` hanno precedenza. |
| UI wizard | [`app/agenda/ui/agenda-wizard.js`](../../../app/agenda/ui/agenda-wizard.js), [`agenda-template.js`](../../../app/agenda/ui/agenda-template.js), [`agenda-patients.js`](../../../app/agenda/ui/agenda-patients.js) | Modale "Cerca anagrafica", popola form con `patient_name` + hidden `patient_uuid`. |

## 2. Schema attuale (denormalizzato)

`agenda.db`:

```sql
CREATE TABLE appointments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_name TEXT    NOT NULL,        -- denormalizzato (cache nome)
  patient_id   TEXT,                    -- denormalizzato (cache CF)
  patient_uuid TEXT,                    -- link a Cerus (opzionale!)
  phone        TEXT,                    -- denormalizzato
  -- ... (campi appuntamento)
);
CREATE INDEX idx_appt_patient      ON appointments(patient_id);
CREATE INDEX idx_appt_patient_uuid ON appointments(patient_uuid);
```

Stesso pattern in `list_entries` (con aggiunta di `birth_date`) e `transfusion_requests` (con `nascita`, `sesso`, `cf`).

### Conseguenze

- **Stale data**: se in Cerus si correggono `last_name` o numero di telefono, le righe esistenti in agenda continuano a mostrare il valore vecchio. Nessun meccanismo di refresh.
- **`patient_uuid` opzionale**: la colonna è nullable e non indicizzata come UNIQUE. Esistono righe con `patient_name` libero ma `patient_uuid = NULL` (free-text manuale). Queste righe sono **non riconciliabili** con Cerus.
- **Duplicazione**: gli stessi campi vivono come *snapshot* in 3+ tabelle, ognuna con drift indipendente.

## 3. Flusso di scrittura attuale

```
Browser                          LUMIA server              Cerus
   │                                  │                      │
   │ GET /api/agenda/patients?q=ros   │                      │
   ├─────────────────────────────────►│                      │
   │                                  │ GET /api/v1/patients?q=ros
   │                                  ├─────────────────────►│
   │                                  │◄─────────────────────┤
   │ [{cerus_uuid, nome_completo,...}]│                      │
   │◄─────────────────────────────────┤                      │
   │                                  │                      │
   │ utente seleziona riga →          │                      │
   │ form popolato:                   │                      │
   │   patient_name = "ROSSI MARIO"   │                      │
   │   patient_id   = "RSSMRA80…"     │                      │
   │   patient_uuid = "abc-123-…"     │                      │
   │   phone        = "333…"          │                      │
   │                                  │                      │
   │ POST /api/agenda/appointments    │                      │
   │   {patient_name, patient_id,     │                      │
   │    patient_uuid, phone, …}       │                      │
   ├─────────────────────────────────►│ INSERT (snapshot)    │
   │                                  │                      │
```

Tutte le 4 colonne `patient_*` vengono persistite. Cerus **non** viene più consultato per questa riga.

## 4. Flusso di lettura attuale

```
Browser                          LUMIA server
   │ GET /api/agenda/appointments?date=…
   ├─────────────────────────────────►│
   │                                  │ SELECT * FROM appointments
   │                                  │ ─ campi cached restituiti
   │ [{patient_name, phone, …}]       │   senza chiamata a Cerus
   │◄─────────────────────────────────┤
```

Latenza minima, ma *what you see is what was true al momento della scrittura*.

## 5. Free-text manuale

L'UI consente di compilare `w_patient_name` e salvare l'appuntamento **senza** aprire la modale Cerus (e quindi senza `patient_uuid`). Caso d'uso: paziente d'emergenza non ancora registrato in Cerus.

Questo path:
- ✗ viola il principio "Cerus = SoT" ([01 §2](01-cerus-overview.md#2-principio-cerus-è-la-source-of-truth));
- ✗ produce righe non riconciliabili;
- ✗ è la causa principale della complessità del wizard.

## 6. Posizione del codice

`cerus-client.js` e `patients-cerus.js` vivono **dentro `app/agenda/`** perché storicamente l'unico consumer era l'agenda. Oggi però:

- `app/agenda/controllers/transfusion.js` legge `patient_uuid`/`paziente`/`cf`/… (campi anagrafici denormalizzati) — non chiama mai Cerus direttamente;
- `app/prestazioni/trasfusione/trasfusione-logic.js` mostra `patient_uuid` come "nosologico" — anche qui dati cached;
- futuri moduli (cartella clinica, referti) avrebbero bisogno della stessa risoluzione anagrafica.

Mantenere l'integrazione sotto `app/agenda/` è quindi un **vincolo di package** che la realtà ha già superato.

## 7. Debiti tecnici elencati

| ID | Debito | Severità | Risoluzione |
|----|--------|----------|-------------|
| D1 | Denormalizzazione → stale data | Alta | Rimossa in V3.M4.A1 ([03 §2](03-cerus-to-be.md)) |
| D2 | `patient_uuid` nullable + free-text | Alta | NOT NULL in V3.M4.A1; UI rimuove free-text |
| D3 | Client/proxy in `app/agenda/` | Media | Spostati in `src/integrations/cerus/` |
| D4 | Nessuna cache di processo per i lookup | Media | Cache TTL 30 s in V3.M4.A1 |
| D5 | Nessun batch endpoint | Media | `POST /api/v1/patients/by-uuids` da concordare con team Cerus |
| D6 | Audit Cerus calls assente | Bassa | Volumetria troppo alta per auditare; lasciato fuori scope |
