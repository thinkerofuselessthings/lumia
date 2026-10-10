# 01 — Cerus: panoramica e principio architetturale

## 1. Cosa è Cerus

**Cerus** è un sistema esterno (separato da LUMIA, su `localhost:3000` in dev) che gestisce in modo autoritativo le anagrafiche pazienti: dati identificativi, contatti, indirizzi, soft-delete, audit. Fornisce una REST API documentata in [docs/cerus/README.md](../../cerus/README.md).

Le credenziali (`X-User-Id` + `X-User-Key`) sono per-utente di servizio e vivono **solo lato server**. Il browser non vede mai Cerus direttamente.

## 2. Principio: Cerus è la Source of Truth

```
┌─────────────────────────┐         ┌─────────────────────────┐
│   Cerus (esterno)       │  ←──→   │   LUMIA (questo repo)   │
│                         │ HTTP    │                         │
│  Anagrafica completa    │         │  Operazioni cliniche    │
│  (CRUD, audit, GDPR)    │         │  (appuntamenti, liste,  │
│                         │         │   trasfusioni)          │
│  source of truth        │         │  riferimento via UUID   │
└─────────────────────────┘         └─────────────────────────┘
```

**Regola d'oro V3**: nessun dato anagrafico viene **persistito** in `agenda.db`. Il riferimento è **solo `patient_uuid`** (opaco, fornito da Cerus). Tutti i dati visibili nell'UI vengono **risolti in lettura** via chiamata HTTP a Cerus.

## 3. Milestone V3.M4.A1 — Cerus-only anagrafica

V3.M4.A1 è la milestone che **completa** il principio §2, eliminando i tre debiti che V2 lasciava aperti:

| Debito V2 | Conseguenza | Risoluzione V3.M4.A1 |
|-----------|-------------|----------------------|
| `appointments.patient_name`/`patient_id`/`phone`/`birth_date` denormalizzati | Cache stale (un'anagrafica corretta in Cerus continua a mostrare il vecchio nome in agenda fino al prossimo refresh manuale) | Colonne deprecate; UI legge sempre live da Cerus via `patient_uuid` |
| Free-text manuale supportato per "paziente non in Cerus" | Riga in `appointments` senza `patient_uuid` → impossibile riconciliare in seguito; aggira il principio §2 | Vincolo NOT NULL su `patient_uuid` (post-migrazione); flusso di creazione apre Cerus se paziente assente |
| Client + proxy interni a `app/agenda/` | Trasfusione/prestazioni/admin si replicano la chiamata o accedono di sponda | Modulo trasversale `src/integrations/cerus/` esposto ai moduli via require |

## 4. Conseguenze operative

- **Latenza**: ogni render di lista/agenda fa 1 chiamata HTTP per N righe → mitigazione con **batch endpoint** Cerus `POST /api/v1/patients/by-uuids` (vedi [03 §4](03-cerus-to-be.md)) e cache di processo a TTL corto (30 s) sul server LUMIA.
- **Cerus offline**: l'UI mostra placeholder `<paziente non disponibile — UUID …>` invece di crash; nessuna nuova mutazione possibile finché Cerus non torna su.
- **Audit**: `patient_uuid` è dato opaco, non PHI → resta in chiaro nei log audit; nessuna redaction necessaria. La policy in `src/db/audit-policy.js` per le tabelle `appointments`/`list_entries`/`transfusion_requests` resta `redact: []` (vedi [audit/03 §3](../audit/03-audit-api.md#3-audit-policy-whitelist--redaction)).
- **Cifratura at-rest**: i blob `before_data`/`after_data` di audit non contengono più PHI dopo la migrazione (solo `patient_uuid`), riducendo la superficie di rischio. La cifratura resta attiva per difesa in profondità.

## 5. Glossario

| Termine | Significato |
|---------|-------------|
| **Cerus UUID** (`cerus_uuid`) | Identificatore opaco fornito da Cerus, formato UUID v4-like; chiave di linkage. In LUMIA è memorizzato come `patient_uuid` (TEXT). |
| **Cerus ID** (`id` numerico in Cerus) | ID interno Cerus; usato come parametro path in `GET /api/v1/patients/:id`. **Non** memorizzato in LUMIA. |
| **CF** (`fiscal_code` in Cerus, `patient_id` in legacy LUMIA) | Codice fiscale. In V3 **non** è più memorizzato in LUMIA: è derivato da Cerus. |
| **Lookup live** | Chiamata HTTP a Cerus al momento del rendering, contrapposta a "lookup da cache locale". |
| **Proxy** | Endpoint LUMIA (`/api/cerus/patients/*`) che inoltra a Cerus aggiungendo le credenziali di servizio e applicando il mapping campi EN→IT. |
