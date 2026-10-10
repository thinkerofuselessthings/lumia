# Cerus API — Guida Integrazione per App Esterne

Questa guida descrive come integrare un'applicazione esterna con le API REST di Cerus.

---

## 1. Ottenere le Credenziali

L'amministratore Cerus crea una coppia di chiavi dal pannello **API Keys** (SPA o admin panel).

Ogni coppia è composta da:

| Credenziale | Header HTTP | Descrizione |
|-------------|-------------|-------------|
| **UserId** | `X-User-Id` | Identificatore pubblico del consumer |
| **UserUUIDKey** | `X-User-Key` | Chiave segreta per l'autenticazione |

Le chiavi sono stringhe di 48 caratteri nel formato `xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx-xxxxxx` (7 blocchi × 6 alfanumerici, separati da trattino).

---

## 2. Autenticazione

Includi **entrambi** gli header in ogni richiesta HTTP:

```bash
curl -X GET http://<host>:3000/api/v1/patients \
  -H "X-User-Id: <il-tuo-user-id>" \
  -H "X-User-Key: <la-tua-user-key>"
```

### Codici di errore autenticazione

| Codice | Significato |
|--------|-------------|
| `401` | Header mancanti (servono entrambi `X-User-Id` e `X-User-Key`) |
| `403` | Credenziali non valide, chiave revocata, oppure permesso non concesso |

---

## 3. Permessi CRUD

Ogni coppia di chiavi ha 4 flag indipendenti configurabili dall'admin:

| Flag | Controlla | Metodi HTTP |
|------|-----------|-------------|
| `can_read` | Lettura | `GET` |
| `can_create` | Creazione | `POST` |
| `can_update` | Modifica | `PUT` |
| `can_delete` | Eliminazione | `DELETE` |

Se un'operazione non è autorizzata, il server risponde `403 — Permesso 'X' non concesso per questa API Key`.

I permessi possono essere modificati dall'admin in qualsiasi momento senza rigenerare le chiavi.

---

## 4. Formato delle Risposte

Tutte le risposte sono JSON con struttura uniforme:

**Successo:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Errore:**
```json
{
  "success": false,
  "error": "Messaggio di errore"
}
```

**Liste paginate:**
```json
{
  "success": true,
  "data": [ ... ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## 5. API Disponibili

### 5.1 Anagrafiche

#### `GET /api/v1/patients` — Lista anagrafiche (paginata)

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `page` | query | `1` | Numero pagina |
| `limit` | query | `20` | Risultati per pagina (max 100) |
| `q` | query | — | Ricerca libera su nome, cognome, codice fiscale |

```bash
curl -X GET "http://HOST:3000/api/v1/patients?page=1&limit=10&q=rossi" \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>"
```

#### `GET /api/v1/patients/search` — Ricerca avanzata

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `first_name` | query | Filtro per nome |
| `last_name` | query | Filtro per cognome |
| `fiscal_code` | query | Filtro per codice fiscale |
| `city` | query | Filtro per città (indirizzo attivo) |
| `birth_date` | query | Filtro per data di nascita |
| `gender` | query | `M` o `F` |
| `page`, `limit` | query | Paginazione |

```bash
curl -X GET "http://HOST:3000/api/v1/patients/search?last_name=rossi&gender=M" \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>"
```

#### `GET /api/v1/patients/:id` — Dettaglio anagrafica

Restituisce l'anagrafica con i suoi indirizzi e contatti **attivi** annidati.

```bash
curl -X GET http://HOST:3000/api/v1/patients/1 \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>"
```

**Risposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cerus_uuid": "...",
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
      { "id": 1, "type": "cellulare", "value": "+39 333 1234567", "is_active": 1 }
    ]
  }
}
```

#### `POST /api/v1/patients` — Crea anagrafica

**Richiede:** `can_create`

| Campo | Tipo | Obbligatorio | Validazione |
|-------|------|:------------:|-------------|
| `fiscal_code` | string | ✓ | Min 11 caratteri, univoco |
| `first_name` | string | ✓ | Non vuoto |
| `last_name` | string | ✓ | Non vuoto |
| `birth_date` | string | ✓ | Non vuoto |
| `birth_place` | string | ✓ | Non vuoto |
| `gender` | string | ✓ | `M` o `F` |
| `notes` | string | — | Testo libero |
| `reason` | string | — | Motivazione (registrata in audit) |

```bash
curl -X POST http://HOST:3000/api/v1/patients \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "fiscal_code": "RSSMRA80A01H501Z",
    "first_name": "Mario",
    "last_name": "Rossi",
    "birth_date": "1980-01-01",
    "birth_place": "Roma",
    "gender": "M"
  }'
```

| Codice | Significato |
|--------|-------------|
| `201` | Creato con successo |
| `400` | Campi obbligatori mancanti o genere non valido |
| `409` | Codice fiscale già esistente |

#### `PUT /api/v1/patients/:id` — Aggiorna anagrafica

**Richiede:** `can_update`

Aggiornamento parziale: invia solo i campi da modificare. Se si modifica `fiscal_code`, il campo `reason` diventa **obbligatorio**.

```bash
curl -X PUT http://HOST:3000/api/v1/patients/1 \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{ "notes": "Note aggiornate", "last_name": "Rossi Bianchi" }'
```

#### `DELETE /api/v1/patients/:id` — Soft-delete anagrafica

**Richiede:** `can_delete`

Il campo `reason` è **obbligatorio**. L'anagrafica non viene eliminata fisicamente ma marcata come `is_deleted = 1`.

```bash
curl -X DELETE http://HOST:3000/api/v1/patients/1 \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Trasferimento ad altra struttura" }'
```

---

### 5.2 Indirizzi

Gli indirizzi sono **versionati**: alla creazione di un nuovo indirizzo dello stesso tipo (residenza/domicilio), il precedente viene automaticamente disattivato.

#### `GET /api/v1/patients/:id/addresses` — Lista indirizzi

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `history` | query | `1` per includere indirizzi disattivati |

```bash
curl -X GET "http://HOST:3000/api/v1/patients/1/addresses?history=1" \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>"
```

#### `POST /api/v1/patients/:id/addresses` — Crea indirizzo

**Richiede:** `can_create`

| Campo | Tipo | Obbligatorio | Validazione |
|-------|------|:------------:|-------------|
| `type` | string | ✓ | `residenza` o `domicilio` |
| `address` | string | ✓ | Non vuoto |
| `city` | string | ✓ | Non vuoto |
| `province` | string | — | — |
| `zip_code` | string | — | — |
| `reason` | string | — | Motivazione audit |

```bash
curl -X POST http://HOST:3000/api/v1/patients/1/addresses \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "residenza",
    "address": "Via Garibaldi 15",
    "city": "Milano",
    "province": "MI",
    "zip_code": "20100"
  }'
```

#### `PUT /api/v1/addresses/:id` — Aggiorna indirizzo

**Richiede:** `can_update`

Disattiva il vecchio indirizzo e ne crea uno nuovo con i dati aggiornati (versionamento).

```bash
curl -X PUT http://HOST:3000/api/v1/addresses/1 \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{ "city": "Torino", "province": "TO", "zip_code": "10100" }'
```

---

### 5.3 Contatti

#### `GET /api/v1/patients/:id/contacts` — Lista contatti

| Parametro | Tipo | Descrizione |
|-----------|------|-------------|
| `history` | query | `1` per includere contatti disattivati |

```bash
curl -X GET http://HOST:3000/api/v1/patients/1/contacts \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>"
```

#### `POST /api/v1/patients/:id/contacts` — Crea contatto

**Richiede:** `can_create`

| Campo | Tipo | Obbligatorio | Validazione |
|-------|------|:------------:|-------------|
| `type` | string | ✓ | `telefono`, `cellulare`, `email`, `pec`, `fax` |
| `value` | string | ✓ | Non vuoto |
| `reason` | string | — | Motivazione audit |

```bash
curl -X POST http://HOST:3000/api/v1/patients/1/contacts \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{ "type": "email", "value": "mario.rossi@example.com" }'
```

#### `PUT /api/v1/contacts/:id` — Aggiorna contatto

**Richiede:** `can_update`

```bash
curl -X PUT http://HOST:3000/api/v1/contacts/1 \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{ "value": "mario.rossi@nuovaemail.com" }'
```

#### `DELETE /api/v1/contacts/:id` — Disattiva contatto

**Richiede:** `can_delete`

Il campo `reason` è **obbligatorio**.

```bash
curl -X DELETE http://HOST:3000/api/v1/contacts/1 \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Numero cambiato" }'
```

---

### 5.4 Audit Logs

#### `GET /api/v1/audit-logs` — Lista log (paginata)

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `table_name` | query | — | Filtra per tabella (`patients`, `contacts`, `addresses`, `api_keys`) |
| `record_id` | query | — | Filtra per ID record |
| `changed_by` | query | — | Filtra per autore modifica |
| `page` | query | `1` | Pagina |
| `limit` | query | `50` | Risultati per pagina (max 100) |

```bash
curl -X GET "http://HOST:3000/api/v1/audit-logs?table_name=patients&limit=10" \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>"
```

**Struttura singolo log:**
```json
{
  "id": 1,
  "action": "update",
  "changed_by": "admin",
  "table_name": "patients",
  "record_id": "1",
  "record_pre": { "last_name": "Rossi" },
  "record_post": { "last_name": "Rossi Bianchi" },
  "reason": "Correzione anagrafica",
  "created_at": "2026-04-12T10:30:00.000Z"
}
```

#### `GET /api/v1/audit-logs/:table/:record_id` — Log per record specifico

```bash
curl -X GET http://HOST:3000/api/v1/audit-logs/patients/1 \
  -H "X-User-Id: <user-id>" \
  -H "X-User-Key: <user-key>"
```

---

## 6. Codici di Errore Comuni

| Codice | Significato |
|--------|-------------|
| `200` | Operazione riuscita |
| `201` | Risorsa creata |
| `400` | Errore di validazione (campi mancanti, formato errato) |
| `401` | Non autenticato (header mancanti) |
| `403` | Accesso negato (credenziali errate, chiave revocata, permesso mancante) |
| `404` | Risorsa non trovata |
| `409` | Conflitto (es. codice fiscale duplicato) |

---

## 7. Note Importanti

- **Soft-delete**: le anagrafiche non vengono mai eliminate fisicamente. `DELETE` imposta `is_deleted = 1`. L'eliminazione richiede sempre una `reason`.
- **Versionamento indirizzi**: ogni modifica crea un nuovo record e disattiva il precedente. Usa `?history=1` per vedere lo storico completo.
- **Audit trail**: ogni creazione, modifica e cancellazione viene registrata con stati pre/post nel log di audit.
- **Sanitizzazione**: tutti i campi testuali vengono sanitizzati (rimozione `<>` e trim) prima dell'inserimento.
- **Content-Type**: per `POST`, `PUT` e `DELETE` con body, usa sempre `Content-Type: application/json`.
- **Paginazione**: le liste supportano `page` e `limit`. La risposta include `total` per calcolare il numero di pagine.
