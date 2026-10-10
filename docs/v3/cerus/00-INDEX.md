# Documentazione V3 — Integrazione Cerus

> **Ambito**: integrazione di LUMIA con il sistema esterno **Cerus** come unica fonte di verità per le anagrafiche pazienti, e roadmap della modifica architetturale **V3.M4.A1** che rimuove la denormalizzazione, vincola la creazione tramite Cerus e sposta il client in `src/integrations/cerus/`.

Documentazione storica V2 in [docs/cerus/](../../cerus/) (conservata per riferimento; superata da questa cartella).

## Indice

| # | File | Scope |
|---|------|-------|
| 00 | [00-INDEX.md](00-INDEX.md) | Questo indice |
| 01 | [01-cerus-overview.md](01-cerus-overview.md) | Principio "Cerus = SoT", milestone V3.M4.A1, glossario |
| 02 | [02-cerus-as-is.md](02-cerus-as-is.md) | Stato attuale: client `app/agenda/utils/cerus-client.js`, proxy `patients-cerus.js`, denormalizzazione di `patient_name`/`phone`/`birth_date` in agenda + free-text manuale |
| 03 | [03-cerus-to-be.md](03-cerus-to-be.md) | Architettura target post-V3.M4.A1: solo `patient_uuid`, lookup live, modulo trasversale `src/integrations/cerus/`, divieto di free-text |
| 04 | [04-cerus-migration.md](04-cerus-migration.md) | Roadmap di migrazione: schema, dati legacy, controller, UI, test |
| 05 | [05-cerus-api.md](05-cerus-api.md) | Reference dell'API proxy esposta da LUMIA + payload mapping Cerus→LUMIA |

## Decisioni chiave (V3.M4.A1)

1. **No denormalizzazione**: le tabelle operazionali (`appointments`, `list_entries`, `transfusion_requests`) conservano **solo** `patient_uuid` come riferimento opaco a Cerus. I campi `patient_name`, `patient_id` (CF), `phone`, `birth_date` vengono **deprecati** in scrittura e risolti in lettura via lookup live.
2. **No free-text**: la creazione/modifica di un appuntamento richiede sempre selezione da Cerus. Caso "paziente non ancora in Cerus" → l'utente lo crea prima in Cerus, poi torna in LUMIA.
3. **Modulo trasversale**: il client e il proxy si spostano da `app/agenda/` a `src/integrations/cerus/`, esposti a tutti i moduli (agenda, prestazioni, trasfusione, admin) tramite un'unica interfaccia.
4. **Audit**: ogni chiamata di lookup non viene auditata (read-only, alto volume); le tabelle `appointments`/`list_entries`/`transfusion_requests` restano nella whitelist `audit-policy.js` con redaction nulla (il `patient_uuid` non è PHI).

## File di codice citati

| Path | Stato V3 |
|------|----------|
| `app/agenda/utils/cerus-client.js` | ✅ spostato in `src/integrations/cerus/client.js` (shim rimosso in A5.a) |
| `app/agenda/controllers/patients-cerus.js` | ✅ spostato in `src/integrations/cerus/proxy.js`, montato su `/api/cerus/patients/*` (shim rimosso in A5.a) |
| `src/integrations/cerus/{client,cache,resolver,proxy,index}.js` | ✅ creati in A1, in produzione |
| `cerus/src/routes/patients.js` (repo Cerus) | ✅ aggiunto `GET /api/v1/patients/by-uuid/:uuid` in A6 (2026-04-21) |
| `lumia.config.json` → `cerus.{baseUrl,userId,userKey,timeout}` | invariato |
| `app/agenda/db.js` (colonne `patient_*` su `appointments`/`list_entries`/`transfusion_requests`) | ✅ `patient_uuid NOT NULL` applicato in A4.a; drop colonne legacy gated in A5.b |
| `app/agenda/ui/agenda-wizard.js`, `agenda-template.js`, `agenda-patients.js` | ✅ rifattorizzati in A4.b (validazione bloccante senza `patient_uuid`); rimozione fisica hidden input pendente |
