# 05 — Cerus API reference (proxy LUMIA)

> Endpoint pubblici esposti da LUMIA su `/api/cerus/*` dopo V3.M4.A1.
> Tutti gli endpoint richiedono sessione utente LUMIA valida (`requireAuth`); il browser **non** invia mai le credenziali Cerus.

## 1. Convenzioni

- Base URL proxy: `/api/cerus`
- Auth: cookie sessione LUMIA + `X-CSRF-Token` per chiamate non-GET (`/health` è no-auth).
- Envelope risposta: `{ success: true, data: ... }` (eventuale `meta`) oppure `{ success: false, error: { code, message } }` — coerente col resto delle API LUMIA via `app/agenda/utils/response.js`.
- Codici di errore proxy:
  - `CERUS_NOT_CONFIGURED` (503) → manca config in env/file
  - `CERUS_UNAVAILABLE`     (502) → Cerus offline o timeout
  - `NOT_FOUND`             (404) → uuid/id non esiste in Cerus

## 2. Endpoints

### `GET /api/cerus/patients?q=<text>&limit=<n>`

Ricerca free-text su nome/cognome/CF. Restituisce lista compatta.

| Param | Tipo | Default | Note |
|-------|------|---------|------|
| `q`     | string | — | almeno 2 caratteri |
| `limit` | int    | 10 | max 50 |

```json
{
  "success": true,
  "data": [
    {
      "id": 12,
      "cerus_uuid": "abc-123-…",
      "codice_fiscale": "RSSMRA80A01H501Z",
      "nome": "Mario",
      "cognome": "Rossi",
      "nome_completo": "Rossi Mario",
      "data_nascita": "1980-01-01",
      "sesso": "M"
    }
  ],
  "meta": { "count": 1, "total": 1 }
}
```

### `GET /api/cerus/patients/search`

Ricerca strutturata. Almeno uno tra `first_name`, `last_name`, `fiscal_code` deve essere presente.

| Param | Tipo |
|-------|------|
| `first_name`, `last_name`, `fiscal_code`, `city`, `birth_date`, `gender`, `page`, `limit` | string/int |

Risposta identica a `/patients?q=`.

### `GET /api/cerus/patients/:uuid`

Dettaglio completo via `cerus_uuid` (UUID v4) **oppure** ID numerico interno Cerus. **Passa per cache** TTL 30 s.

Il client [`src/integrations/cerus/client.js#getById`](../../../src/integrations/cerus/client.js) sceglie automaticamente la rotta upstream:
- pattern `^\d+$` → `GET /api/v1/patients/<id>` (Cerus)
- altrimenti → `GET /api/v1/patients/by-uuid/<uuid>` (Cerus, endpoint aggiunto 2026-04-21 — vedi [04 §10](04-cerus-migration.md#10-fase-a6--fix-lookup-per-uuid))

```json
{
  "success": true,
  "data": {
    "id": 12,
    "cerus_uuid": "abc-123-…",
    "codice_fiscale": "RSSMRA80A01H501Z",
    "nome": "Mario",
    "cognome": "Rossi",
    "nome_completo": "Rossi Mario",
    "data_nascita": "1980-01-01",
    "luogo_nascita": "Roma",
    "sesso": "M",
    "indirizzo": "Via Roma 1, Milano, MI",
    "telefono": "+39 333 1234567",
    "email": "mario.rossi@example.com"
  }
}
```

### Batch resolve (interno, non esposto come endpoint HTTP)

Il proxy LUMIA **non** espone `POST /api/cerus/patients/by-uuids`. La risoluzione batch usata da `resolver.enrichRows` ([src/integrations/cerus/resolver.js](../../../src/integrations/cerus/resolver.js#L80)) è implementata server-side come `Promise.all` di N `getById(uuid)` paralleli, con cache TTL che assorbe le ripetizioni. Un endpoint batch upstream `POST /api/v1/patients/by-uuids` resta un'evoluzione possibile (vedi [03 §4](03-cerus-to-be.md#4-batch-endpoint-richiesta-a-team-cerus)) ma non è bloccante per V3.M4.A1.

### `GET /api/cerus/health`

Smoke endpoint per monitoring/CI. **No-auth** (registrato con `{ auth: false }`).

```json
{ "success": true, "data": { "service": "cerus", "configured": true, "ts": "2026-04-21T19:00:00.000Z" } }
```

Note:
- `configured: false` se manca env/file (`CERUS_BASE_URL`/`CERUS_USER_ID`/`CERUS_USER_KEY`).
- L'endpoint **non** fa ping a Cerus: verifica solo la configurazione locale. Per testare la raggiungibilità reale eseguire `GET /api/cerus/patients?q=test`.

## 3. Mapping Cerus (EN) → LUMIA (IT)

Trasformazione applicata da `client.mapPatient()`:

| Cerus (EN) | LUMIA (IT) | Note |
|------------|-----------|------|
| `id` | `id` | numerico interno Cerus |
| `cerus_uuid` | `cerus_uuid` | chiave di linkage |
| `fiscal_code` | `codice_fiscale` | |
| `first_name` | `nome` | |
| `last_name` | `cognome` | |
| (derivato) | `nome_completo` | `last_name + ' ' + first_name` |
| `birth_date` | `data_nascita` | ISO `YYYY-MM-DD` |
| `birth_place` | `luogo_nascita` | |
| `gender` | `sesso` | `M`/`F`/`X` |
| `addresses[?is_active]` | `indirizzo` | join `address, city, province` |
| `contacts[?is_active && type∈{cellulare,telefono}]` | `telefono` | primo match |
| `contacts[?is_active && type==email]` | `email` | primo match |

Le liste `addresses`/`contacts` complete restano accessibili nella forma raw consultando direttamente Cerus (non esposte dal proxy LUMIA per ora).

## 4. Configurazione

| Sorgente | Variabile | Default |
|----------|-----------|---------|
| env  | `CERUS_BASE_URL` | — |
| env  | `CERUS_USER_ID`  | — |
| env  | `CERUS_USER_KEY` | — |
| env  | `CERUS_TIMEOUT`  | 5000 |
| env  | `CERUS_CACHE_TTL_MS` | 30000 (V3.M4.A1) |
| file | `lumia.config.json → cerus.{baseUrl,userId,userKey,timeout}` | — |

Precedenza: env > file. Se nessuna sorgente fornisce `baseUrl` + `userId` + `userKey`, ogni chiamata risponde `503 CERUS_NOT_CONFIGURED`.

## 5. CRUD anagrafica: assente per design

LUMIA **non** espone POST/PUT/DELETE su `/api/cerus/patients/*`. Per creare/modificare/eliminare un paziente, l'operatore agisce direttamente su Cerus (UI Cerus). Questo preserva il principio "Cerus = Source of Truth" ([01 §2](01-cerus-overview.md#2-principio-cerus-è-la-source-of-truth)) e tiene l'audit di compliance dove è già presente (lato Cerus).
