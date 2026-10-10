# Integrazione Anagrafica Centralizzata — Cerus ↔ Agenda LUMIA

> **Principio**: Cerus è l'unica source-of-truth per le anagrafiche pazienti.  
> LUMIA/Agenda **non** mantiene una tabella pazienti, ma solo i link identificativi  
> (fiscal_code, cerus_uuid) nelle tabelle operazionali (appointments, list_entries).

> **Stato**: ✅ **COMPLETATO** — 12 aprile 2026  
> Tutte e 4 le fasi implementate, testate e verificate end-to-end.

---

## 1. Stato Attuale

### 1.1 Cerus (sistema esterno)

| Proprietà | Valore |
|-----------|--------|
| Host | `http://localhost:3000` |
| Auth | `X-User-Id` + `X-User-Key` (coppia API-key) |
| DB | `cerus.db` (SQLite, standalone) |
| Schema nomi | EN: `first_name`, `last_name`, `fiscal_code`, `cerus_uuid` |
| Struttura | Normalizzata: `patients` + `addresses` (1:N) + `contacts` (1:N) |
| Soft-delete | `is_deleted = 1` (mai eliminazione fisica) |
| Paginazione | `page` + `limit`, risposta con `total` |
| Permessi | CRUD granulari per API-key: `can_read`, `can_create`, `can_update`, `can_delete` |

**API rilevanti per l'integrazione (solo lettura):**

| Endpoint | Uso |
|----------|-----|
| `GET /api/v1/patients?q=...&limit=10` | Ricerca libera (nome, cognome, CF) |
| `GET /api/v1/patients/search?last_name=...&fiscal_code=...` | Ricerca avanzata multi-campo |
| `GET /api/v1/patients/:id` | Dettaglio completo con addresses + contacts annidati |

**Formato risposta Cerus (dettaglio):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cerus_uuid": "abc-123-...",
    "fiscal_code": "RSSMRA80A01H501Z",
    "first_name": "Mario",
    "last_name": "Rossi",
    "birth_date": "1980-01-01",
    "birth_place": "Roma",
    "gender": "M",
    "notes": "",
    "addresses": [
      { "id": 1, "type": "residenza", "address": "Via Roma 1", "city": "Roma", "province": "RM", "zip_code": "00100", "is_active": 1 }
    ],
    "contacts": [
      { "id": 1, "type": "cellulare", "value": "+39 333 1234567", "is_active": 1 },
      { "id": 2, "type": "email", "value": "mario.rossi@example.com", "is_active": 1 }
    ]
  }
}
```

### 1.2 Agenda LUMIA (stato attuale)

**Tabella `patients` locale (da eliminare):**
```sql
patients (
  id INTEGER PK, uuid TEXT UNIQUE, nome TEXT, cognome TEXT,
  codice_fiscale TEXT UNIQUE, data_nascita TEXT, sesso TEXT,
  luogo_nascita TEXT, indirizzo TEXT, telefono TEXT, email TEXT,
  created_at TEXT, updated_at TEXT
)
```
- Tabella **mai popolata** (nessun seed data)
- Nessuna FK da appointments/list_entries verso patients
- Schema IT incompatibile con Cerus (EN)

**Campi paziente denormalizzati in `appointments`:**
```sql
patient_name  TEXT NOT NULL   -- "Mario Rossi" (display)
patient_id    TEXT            -- codice fiscale (link)
patient_uuid  TEXT            -- cerus_uuid (link)
phone         TEXT            -- ⚠ BUG: contiene data_nascita, non telefono
```

**Campi paziente denormalizzati in `list_entries`:**
```sql
patient_name  TEXT NOT NULL   -- "Mario Rossi" (display)
patient_id    TEXT            -- codice fiscale (link)
patient_uuid  TEXT            -- cerus_uuid (link)
phone         TEXT            -- telefono (corretto in list_entries)
```

### 1.3 Problemi identificati

| # | Problema | Impatto |
|---|----------|---------|
| P1 | Tabella `patients` ridondante e mai usata come FK | Complessità inutile |
| P2 | Campo `phone` in `appointments` contiene `data_nascita` | Bug semantico: il wizard scrive la data di nascita nel campo telefono |
| P3 | Schema locale IT vs Cerus EN | Richiede mapping nel proxy |
| P4 | Nessuna integrazione attiva con Cerus | `patient_uuid`/`cerus_uuid` esiste ma mai sincronizzato |
| P5 | Ricerca pazienti avviene su DB locale vuoto | Funzionalmente rotta |

---

## 2. Approccio: Link-Only (Nessuna Tabella Pazienti)

### 2.1 Principio architetturale

```
┌─────────────────────────────────────────────────────────────────┐
│  LUMIA Agenda                                                   │
│                                                                 │
│  appointments                    list_entries                   │
│  ┌──────────────────────┐        ┌──────────────────────┐       │
│  │ patient_name (cache)  │        │ patient_name (cache)  │      │
│  │ patient_id   (CF→link)│        │ patient_id   (CF→link)│      │
│  │ patient_uuid (→link)  │        │ patient_uuid (→link)  │      │
│  │ phone       (tel)     │        │ phone       (tel)     │      │
│  │ birth_date  (nascita) │ NEW    │ birth_date  (nascita) │ NEW  │
│  └────────┬─────────────┘        └────────┬─────────────┘       │
│           │ cerus_uuid                     │ cerus_uuid          │
└───────────┼────────────────────────────────┼────────────────────┘
            │                                │
            ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Cerus (localhost:3000) — Source of Truth                        │
│  GET /api/v1/patients/:cerus_id  →  anagrafica completa          │
│  GET /api/v1/patients?q=...      →  ricerca                     │
└─────────────────────────────────────────────────────────────────┘
```

**Cosa cambia:**
- La tabella `patients` viene **eliminata** dal DDL agenda
- `appointments` e `list_entries` restano le uniche tabelle che contengono dati paziente
- I campi `patient_id` (CF) e `patient_uuid` (cerus_uuid) sono i **link** verso Cerus
- Il campo `patient_name` rimane come **cache display** (necessario per renderizzare griglie senza chiamate API)
- Il campo `phone` torna al suo uso corretto (telefono)
- Nuovo campo `birth_date` per la data di nascita

### 2.2 Valutazione di fattibilità

| Aspetto | Valutazione | Note |
|---------|:-----------:|------|
| **Eliminazione tabella patients** | ✅ Fattibile | Nessuna FK, nessun seed, nessun trigger cross-table |
| **Denormalizzazione patient_name** | ✅ Già presente | appointments e list_entries hanno già il campo — nessuna JOIN necessaria per display |
| **Link via cerus_uuid** | ✅ Già predisposto | Colonna `patient_uuid` + indice `idx_appt_patient_uuid` già esistono |
| **Link via fiscal_code** | ✅ Già predisposto | Colonna `patient_id` + indice `idx_appt_patient` già esistono |
| **Proxy server-side** | ✅ Necessario | Le API-key Cerus NON devono essere esposte al browser |
| **Performance ricerca** | ✅ OK | Cerus su localhost, latenza < 5ms; limitate a max 10 risultati |
| **Performance griglia** | ✅ OK | Scheduler/elenco usano solo `patient_name` denormalizzato, zero chiamate extra |
| **Cerus offline** | ⚠ Parziale | Ricerca bloccata, ma appuntamenti esistenti visualizzabili (dati cached nei record) |
| **Fix campo phone** | ⚠ Migration | Richiede aggiunta colonna `birth_date` + migrazione dati da `phone` |

### 2.3 Vantaggi dell'approccio link-only

1. **Single source of truth** — L'anagrafica vive solo in Cerus; nessun rischio di dati stale in un DB locale
2. **Zero sincronizzazione** — Non serve sync batch, webhook, o cron; i dati vengono letti on-demand
3. **Snapshot storico** — `patient_name` cached nell'appuntamento registra il nome AL MOMENTO della prenotazione (corretto per record medici: se il cognome cambia, gli appuntamenti passati mantengono il dato originale)
4. **Minimo impatto** — Le tabelle `appointments` e `list_entries` hanno già le colonne necessarie; serve solo eliminare la tabella `patients` e aggiungere `birth_date`
5. **Nessuna duplicazione CRUD** — Le operazioni di creazione/modifica paziente restano esclusive di Cerus

### 2.4 Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Cerus down → ricerca impossibile | UI mostra messaggio chiaro "Servizio anagrafica non disponibile"; appuntamenti manuali restano possibili (input testo libero nome) |
| Risposta Cerus lenta | Timeout configurabile (default 5s); debounce 300ms sulla ricerca |
| API-key Cerus revocata | Health-check all'avvio del server; log di errore con istruzioni per l'admin |
| Cambio schema Cerus | Il mapping EN→IT è isolato in un unico file (`cerus-client.js`); un solo punto da aggiornare |
| Utente cerca per nome che non esiste in Cerus | Possibilità di inserimento manuale (solo `patient_name` senza link) per casi eccezionali |

---

## 3. Mapping Campi Cerus → Agenda

### 3.1 Risposta Cerus `GET /api/v1/patients/:id` → Campi agenda

```
Cerus                          Agenda (uso)
─────────────────────          ──────────────────────────────────
cerus_uuid                 →   patient_uuid  (link primario)
fiscal_code                →   patient_id    (link secondario / visualizzazione)
last_name + " " + first_name → patient_name  (cache display)
first_name                 →   (wizard: campo nome)
last_name                  →   (wizard: campo cognome)
birth_date                 →   birth_date    (nuovo campo)
birth_place                →   (dettaglio: solo visualizzazione)
gender                     →   (dettaglio: solo visualizzazione)
addresses[active][0]       →   (dettaglio: solo visualizzazione)
contacts[cellulare/tel][0] →   phone         (campo corretto)
contacts[email][0]         →   (dettaglio: solo visualizzazione)
```

### 3.2 Risposta Cerus `GET /api/v1/patients?q=...` → Lista autocomplete

```
Per ogni paziente nella lista:
  display   = last_name + " " + first_name
  subtitle  = fiscal_code
  cerus_id  = id           (per successiva GET /:id al momento della selezione)
```

### 3.3 Funzione di mapping (pseudocodice)

```js
function mapCerusToAgenda(cerusPatient) {
  const activeAddr = (cerusPatient.addresses || []).find(a => a.is_active);
  const activePhone = (cerusPatient.contacts || []).find(c => c.is_active && (c.type === 'cellulare' || c.type === 'telefono'));
  const activeEmail = (cerusPatient.contacts || []).find(c => c.is_active && c.type === 'email');

  return {
    cerus_id:      cerusPatient.id,
    cerus_uuid:    cerusPatient.cerus_uuid,
    fiscal_code:   cerusPatient.fiscal_code,
    first_name:    cerusPatient.first_name,
    last_name:     cerusPatient.last_name,
    display_name:  cerusPatient.last_name + ' ' + cerusPatient.first_name,
    birth_date:    cerusPatient.birth_date,
    birth_place:   cerusPatient.birth_place,
    gender:        cerusPatient.gender,
    address:       activeAddr ? [activeAddr.address, activeAddr.city, activeAddr.province].filter(Boolean).join(', ') : null,
    phone:         activePhone ? activePhone.value : null,
    email:         activeEmail ? activeEmail.value : null,
  };
}
```

---

## 4. Modifiche allo Schema DB

### 4.1 Eliminare tabella `patients`

Rimuovere dal DDL in `app/agenda/db.js`:
- CREATE TABLE patients (...)
- 3 indici (idx_patients_cf, idx_patients_uuid, idx_patients_nome)
- 1 trigger (trg_patients_updated_at)

### 4.2 Aggiungere colonna `birth_date`

**appointments:**
```sql
ALTER TABLE appointments ADD COLUMN birth_date TEXT;
-- Migrazione dati: il campo phone contiene data_nascita
UPDATE appointments SET birth_date = phone, phone = NULL WHERE phone LIKE '____-__-__';
```

**list_entries:**
```sql
ALTER TABLE list_entries ADD COLUMN birth_date TEXT;
```

> **Nota**: In sql.js ALTER TABLE ADD COLUMN è supportato. La migrazione deve avvenire
> nel boot (`initAgendaDb()`), con versioning per non rieseguire su DB già migrati.

### 4.3 Schema finale (solo colonne paziente)

```
appointments                        list_entries
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ patient_name  TEXT NOT NULL  │     │ patient_name  TEXT NOT NULL  │
│ patient_id    TEXT           │     │ patient_id    TEXT           │
│ patient_uuid  TEXT           │     │ patient_uuid  TEXT           │
│ phone         TEXT           │     │ phone         TEXT           │
│ birth_date    TEXT      NEW  │     │ birth_date    TEXT      NEW  │
│ ...altri campi appuntamento │     │ ...altri campi entry        │
└─────────────────────────────┘     └─────────────────────────────┘

Indici preservati:
  idx_appt_patient       ON appointments(patient_id)
  idx_appt_patient_uuid  ON appointments(patient_uuid)
  idx_le_patient         ON list_entries(patient_id)
  idx_le_patient_uuid    ON list_entries(patient_uuid)
```

---

## 5. Architettura Proxy Server-Side

### 5.1 Perché un proxy

Le credenziali Cerus (`X-User-Id`, `X-User-Key`) sono **segreti server-side**.
Il browser non deve mai conoscerle. Il flusso è:

```
Browser                      LUMIA Server               Cerus
───────                      ───────────               ─────
  │  GET /api/agenda/           │                         │
  │  patients?q=rossi           │                         │
  │  (cookie session)           │                         │
  │ ───────────────────────────>│                         │
  │                             │  GET /api/v1/           │
  │                             │  patients?q=rossi       │
  │                             │  X-User-Id: xxx         │
  │                             │  X-User-Key: yyy        │
  │                             │ ───────────────────────>│
  │                             │                         │
  │                             │  200 { success, data }  │
  │                             │<─────────────────────── │
  │                             │                         │
  │  200 { success, data }      │  (mapped EN→IT)         │
  │  (formato agenda)           │                         │
  │<─────────────────────────── │                         │
```

### 5.2 Configurazione — `lumia.config.json`

```json
{
  "port": 3500,
  "apiKey": "...",
  "cerus": {
    "baseUrl": "http://localhost:3000",
    "userId": "<api-key-user-id>",
    "userKey": "<api-key-user-key>",
    "timeout": 5000
  }
}
```

### 5.3 Nuovo file: `app/agenda/utils/cerus-client.js`

Responsabilità:
- Leggere config Cerus da lumia.config.json
- Fare richieste HTTP a Cerus con auth headers
- Mappare risposte EN → formato agenda IT
- Gestire errori (timeout, Cerus down, 401/403)
- Esporre: `search(q, limit)`, `getById(cerusId)`, `getByCf(fiscalCode)`

### 5.4 Nuovo file: `app/agenda/controllers/patients-cerus.js`

Responsabilità:
- Ricevere richieste dal frontend (con auth LUMIA/session)
- Chiamare cerus-client
- Rispondere nel formato envelope agenda `{ success: true, data: [...] }`

**Endpoint mantenuti (stesso path, backend diverso):**

| Endpoint | Prima | Dopo |
|----------|-------|------|
| `GET /api/agenda/patients?q=...` | Query su tabella `patients` locale | Proxy → Cerus `GET /api/v1/patients?q=...` |
| `GET /api/agenda/patients/:id` | getById su tabella locale | Proxy → Cerus `GET /api/v1/patients/:id` |

**Endpoint rimossi:**

| Endpoint | Motivo |
|----------|--------|
| `POST /api/agenda/patients` | CRUD pazienti è responsabilità esclusiva di Cerus |
| `PUT /api/agenda/patients/:id` | Idem |
| `DELETE /api/agenda/patients/:id` | Idem |

> **Nota**: I path restano identici → il frontend non deve cambiare le URL delle chiamate API.
> Cambia solo la risposta (formato campi leggermente diverso da gestire nell'autocomplete).

---

## 6. Modifiche Frontend

### 6.1 `agenda-patients.js` — Autocomplete

**Cosa cambia:**
- La risposta dal proxy ha campi mappati (dal mapping Cerus): il risultato contiene `cerus_uuid`, `fiscal_code`, `first_name`, `last_name`, `birth_date`, `phone`
- Al click su un risultato, l'autocomplete popola i campi del wizard/entry con i dati mappati
- Viene salvato `cerus_uuid` come valore nascosto per `patient_uuid`

**Mapping specifico per la selezione paziente:**
```
Selezione → wizard (appointment):
  w_nome            ← first_name
  w_cognome         ← last_name
  w_codice_fiscale  ← fiscal_code
  w_data_nascita    ← birth_date
  w_telefono        ← phone           (NEW: prima non esisteva)
  [hidden]          ← cerus_uuid → patient_uuid

Selezione → entry dialog (list):
  e_patient_name    ← last_name + " " + first_name
  e_patient_id      ← fiscal_code
  e_phone           ← phone
  e_birth_date      ← birth_date      (NEW)
  [hidden]          ← cerus_uuid → patient_uuid
```

### 6.2 `agenda-wizard.js` — Creazione/Modifica Appuntamento

**`submitWizard()` — body inviato al server:**
```js
// PRIMA (bug: phone = data_nascita)
body = {
  patient_name: nome + ' ' + cognome,
  patient_id:   codice_fiscale,
  patient_uuid: null,          // mai settato
  phone:        data_nascita,  // ⚠ BUG
  ...
}

// DOPO (corretto)
body = {
  patient_name: cognome + ' ' + nome,
  patient_id:   codice_fiscale,
  patient_uuid: cerus_uuid,    // dal hidden field
  phone:        telefono,      // telefono reale da Cerus
  birth_date:   data_nascita,  // nuovo campo dedicato
  ...
}
```

**`openWizard(appt)` — edit appuntamento esistente:**
```js
// PRIMA
w_data_nascita ← appt.phone  // leggeva birth_date dal campo phone

// DOPO
w_data_nascita ← appt.birth_date
w_telefono     ← appt.phone
```

### 6.3 `agenda-lists.js` — Entry CRUD

**`submitEntry()` — body:**
```js
// DOPO
body = {
  patient_name: cognome + ' ' + nome,
  patient_id:   codice_fiscale,
  patient_uuid: cerus_uuid,
  phone:        telefono,
  birth_date:   data_nascita,  // NEW
  ...
}
```

**`openEntryDetail()` — dettaglio paziente:**
```js
// PRIMA: GET /patients?q=<patient_id> sul DB locale
// DOPO:  GET /patients/<cerus_id> sul proxy Cerus (usando patient_uuid se disponibile)
//        Se patient_uuid non presente, ricerca per fiscal_code
```

### 6.4 `agenda-scheduler.js` — Dettaglio Appuntamento

```js
// PRIMA (bug)
"Data di nascita: " + appt.phone

// DOPO (corretto)
"Data di nascita: " + appt.birth_date
"Telefono: " + (appt.phone || '—')
```

### 6.5 `agenda-template.js` — Label HTML

Aggiornare eventuali label nei form del wizard dove "Telefono" è usato impropriamente per data di nascita.
Aggiungere campo "Telefono" reale nel wizard step 1 (dati paziente).

---

## 7. Modifiche Backend (Models)

### 7.1 `appointment.js`

**`create()` INSERT:** aggiungere `birth_date` alla lista colonne
```sql
INSERT INTO appointments
  (..., phone, birth_date, ...)
VALUES
  (..., @phone, @birth_date, ...)
```

**`update()` UPDATE:** aggiungere `birth_date = @birth_date`

### 7.2 `list-entry.js`

**`create()` INSERT:** aggiungere `birth_date`

**`promote()` → `apptModel.create()`:** copiare anche `birth_date`:
```js
apptModel.create({
  ...
  phone:        entry.phone,
  birth_date:   entry.birth_date,    // NEW
  ...
})
```

---

## 8. File Coinvolti — Riepilogo

### Nuovi file (2)

| File | Scopo |
|------|-------|
| `app/agenda/utils/cerus-client.js` | Client HTTP per API Cerus, mapping EN→IT, gestione errori |
| `app/agenda/controllers/patients-cerus.js` | Controller proxy: riceve richieste agenda, chiama cerus-client |

### File modificati (10)

| File | Modifiche |
|------|-----------|
| `lumia.config.json` | Aggiunta sezione `cerus: { baseUrl, userId, userKey, timeout }` |
| `app/agenda/db.js` | Rimuovere DDL tabella `patients`; aggiungere migrazione `birth_date` |
| `app/agenda/routes.js` | Route GET patients → controller cerus; rimuovere POST/PUT/DELETE patients |
| `app/agenda/models/appointments.js` | Aggiungere `birth_date` a create/update |
| `app/agenda/models/list-entries.js` | Aggiungere `birth_date` a create; copiare in promote |
| `app/agenda/controllers/appointments.js` | Aggiungere `birth_date` nel data object di create |
| `app/agenda/ui/agenda-patients.js` | Autocomplete: mapping campi risposta proxy, salvare cerus_uuid |
| `app/agenda/ui/agenda-wizard.js` | submitWizard: birth_date + phone corretti; openWizard: lettura corretta |
| `app/agenda/ui/agenda-lists.js` | submitEntry: birth_date; openEntryDetail: dettaglio da Cerus |
| `app/agenda/ui/agenda-scheduler.js` | Dettaglio: birth_date + phone separati |
| `app/agenda/ui/agenda-template.js` | Aggiungere campo telefono nel wizard; fix label |

### File eliminati (2)

| File | Motivo |
|------|--------|
| `app/agenda/models/patients.js` | Tabella patients rimossa, lettura da Cerus |
| `app/agenda/controllers/patients.js` | Sostituito da patients-cerus.js |

---

## 9. Piano di Implementazione (Ordine di Esecuzione)

> **Stato globale**: ✅ COMPLETATO — 12 aprile 2026

### Fase 1 — Backend Proxy Cerus ✅

| Step | Descrizione | File | Stato |
|------|-------------|------|:-----:|
| 1.1 | Aggiungere configurazione Cerus a `lumia.config.json` | lumia.config.json | ✅ |
| 1.2 | Creare `cerus-client.js`: HTTP client + mapping + errori | app/agenda/utils/cerus-client.js | ✅ |
| 1.3 | Creare `patients-cerus.js`: controller proxy search + getById | app/agenda/controllers/patients-cerus.js | ✅ |
| 1.4 | Aggiornare `routes.js`: GET patients → cerus; rimuovere POST/PUT/DELETE | app/agenda/routes.js | ✅ |
| 1.5 | Smoke test: `GET /api/agenda/patients?q=rossi` → proxy → Cerus → risposta mappata | Terminale | ✅ |

### Fase 2 — Migrazione Schema DB ✅

| Step | Descrizione | File | Stato |
|------|-------------|------|:-----:|
| 2.1 | Rimuovere DDL `patients` + trigger + indici da `db.js` | app/agenda/db.js | ✅ |
| 2.2 | Aggiungere migrazione: `ALTER TABLE appointments ADD COLUMN birth_date TEXT` | app/agenda/db.js | ✅ |
| 2.3 | Aggiungere migrazione: `ALTER TABLE list_entries ADD COLUMN birth_date TEXT` | app/agenda/db.js | ✅ |
| 2.4 | Migrazione dati: `UPDATE appointments SET birth_date = phone, phone = NULL WHERE phone LIKE '____-__-__'` | app/agenda/db.js | ✅ |
| 2.5 | Eliminare `models/patients.js` e `controllers/patients.js` | Eliminazione file | ✅ |
| 2.6 | Aggiornare `models/appointments.js`: birth_date in create/update | app/agenda/models/appointment.js | ✅ |
| 2.7 | Aggiornare `models/list-entries.js`: birth_date in create/promote | app/agenda/models/list-entry.js | ✅ |
| 2.8 | Smoke test: server boot OK, DB migration OK | Terminale | ✅ |

### Fase 3 — Frontend ✅

| Step | Descrizione | File | Stato |
|------|-------------|------|:-----:|
| 3.1 | Aggiornare `agenda-patients.js`: mapping risposta proxy, cerus_uuid | agenda-patients.js | ✅ |
| 3.2 | Aggiornare `agenda-wizard.js`: birth_date campo dedicato, phone reale, patient_uuid | agenda-wizard.js | ✅ |
| 3.3 | Aggiornare `agenda-lists.js`: entry submit + dettaglio da Cerus | agenda-lists.js | ✅ |
| 3.4 | Aggiornare `agenda-scheduler.js`: dettaglio birth_date + phone | agenda-scheduler.js | ✅ |
| 3.5 | Aggiornare `agenda-template.js`: campo telefono nel wizard, fix label | agenda-template.js | ✅ |

### Fase 4 — Test End-to-End ✅

| Step | Descrizione | Stato |
|------|-------------|:-----:|
| 4.1 | Cerus running → ricerca paziente da wizard → crea appuntamento → verifica dati salvati | ✅ |
| 4.2 | Promozione entry lista → appuntamento → verifica birth_date + phone + patient_uuid | ✅ |
| 4.3 | Cerus down → verifica messaggio errore UI + appuntamenti esistenti funzionanti | ✅ |
| 4.4 | Verifica indici su patient_uuid → performance query | ✅ |

---

## 10. Prerequisiti

| # | Cosa | Chi |
|---|------|-----|
| 1 | Cerus in esecuzione su localhost:3000 | Ops |
| 2 | Coppia API-key con `can_read = true` creata in Cerus | Admin Cerus |
| 3 | UserID e UserKey inseriti in `lumia.config.json` | Dev |
| 4 | Almeno 1 paziente in Cerus per test | Admin Cerus |
