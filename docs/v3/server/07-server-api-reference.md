# 07 — Server: API Reference

Catalogo completo degli endpoint REST esposti dal server attivo (`src/`). Tutti hanno prefisso `/api/`.

Legenda:

- **Auth**: `no` (pubblico), `cookie` (sessione browser), `apikey` (`X-API-Key`), `cookie+csrf` (state-changing), `role:admin` (richiede ruolo).
- **Body**: forma del JSON in input (omesso per metodi senza body).
- **Risposta**: shape principale (omessi i campi standard `ok`).

---

## A. System

| Metodo | Path | Auth | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/health` | no | `{ service, version, uptime, engines: {...} }` |
| `GET` | `/api/config` | cookie | `{ host, port, wsEnabled }` (V3.M1.A1: `apiKey` rimosso) |
| `GET` | `/api/log?limit=N` | cookie + `role:admin` | Ultimi `N` log della ring buffer (V3.M1.A2) |
| `GET` | `/api/catalog` | no | Catalogo engine (diagnostic/scores/therapy) con flag `available` |

> ⚠️ **V3.M1.A1**: `/api/config` non espone più `apiKey`. La chiave per auth `X-API-Key` resta su `lumia.config.json` / `LUMIA_API_KEY` env, ad uso esclusivo di client server-to-server. Il browser non ne ha bisogno: usa cookie+CSRF.

## B. Auth

| Metodo | Path | Auth | Descrizione |
|--------|------|------|-------------|
| `POST` | `/api/auth/check-user` | no (rate-limited) | `{ exists: true }` **costante** (V3.M1.A22: anti-enumeration) |
| `POST` | `/api/auth/login` | no (rate-limited) | `{ csrf_token, expires_at, must_change_password, user }` + `Set-Cookie: session` |
| `POST` | `/api/auth/logout` | cookie | `{ ok }` + clear cookie |
| `GET`  | `/api/auth/check` | cookie | `{ authenticated, csrf_token, idle_remaining, must_change_password, user }` (no-touch) |
| `POST` | `/api/auth/verify-password` | cookie + CSRF | `{ valid }` |
| `POST` | `/api/auth/change-password` | cookie + CSRF | `{ ok, revoked_other_sessions }` — V3.M2.A5 |
| `GET`  | `/api/auth/sessions` | cookie | Lista sessioni attive dell'utente — V3.M2.A7 |
| `DELETE` | `/api/auth/sessions/:id` | cookie + CSRF | Revoca singola sessione propria — V3.M2.A7 |

Dettagli in [04-server-auth.md](04-server-auth.md).

## C. Admin (`role: admin` su tutto)

| Metodo | Path | Descrizione |
|--------|------|-------------|
| `GET`  | `/api/admin/audit-logs?limit&offset` | Audit log paginati (`limit ≤ 500`) |
| `GET`  | `/api/admin/utenti` | Tutti gli utenti (include `tentativi_falliti`, `bloccato_fino_il`) |
| `GET`  | `/api/admin/utenti/:id` | Singolo utente |
| `POST` | `/api/admin/utenti` | Crea utente (`username≥3`, `password≥8`, ruolo valido) |
| `PUT`  | `/api/admin/utenti/:id` | Aggiorna utente |
| `POST` | `/api/admin/utenti/:id/reset-password` | Reset password |
| `POST` | `/api/admin/utenti/:id/unlock` | Sblocco manuale account bloccato — V3.M2.A6 |
| `DELETE` | `/api/admin/utenti/:id` | Elimina utente; errore `LAST_ADMIN_PROTECTED` se ultimo admin — V3.M2.A13 |

Tutte le scritture loggate in `audit_log` con `azione = admin.user.<op>`.

## D. Diagnostic — solo `b-lpd` (CD-Based B-LPD)

| Metodo | Path | Auth | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/diagnostic/:key` | no | Solo `key=b-lpd`. Ritorna `markers_available`, `states_available`, `diagnoses_available`. |
| `POST` | `/api/diagnostic/:key` | no | Body `{ selections: [{marker, state}, …] }` → `{ result: { entries, all } }` |

Validazione: `selections` non vuoto, ogni `marker ∈ Core.markers()`, ogni `state ∈ Core.states().key`. Errori → `ENGINE_INVALID_INPUT` o `VALIDATION_INVALID`.

## E. Scores — `LumiaScores`

| Metodo | Path | Auth | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/scores` | no | Lista calcolatori con `params`, `desc`, `booleans`, `note` |
| `GET` | `/api/scores/:key` | no | Schema input: `fields_required: [{ name, type, required }]` |
| `POST` | `/api/scores/:key` | no | Body = parametri richiesti → `{ result: { risk, ... } }` |

Calcolatori disponibili (`SCORE_PARAMS` in `src/routes.js`):

| Key | Parametri | Descrizione |
|-----|-----------|-------------|
| `cllIPI` | age, b2m, stage, ighv, tp53 | CLL-IPI (Lancet Oncol 2016) |
| `flipi` | age, stage, hb, ldh, nodes | FLIPI (Blood 2004) |
| `flipi2` | age, b2m, bm, hb, ln | FLIPI-2 (JCO 2009) |
| `primaPI` | b2m, bm | PRIMA-PI (Lancet Haematol 2017) |
| `ipi` | age, ldh, ecog, stage, extranodal | IPI (NEJM 1993) |
| `cnsIPI` | age, ldh, stage, ecog, extranodal, renal | CNS-IPI (Blood 2016) |
| `sMIPI` | age, ecog, ldh, wbc | S-MIPI (Blood 2008) — valori 0-2 |
| `mipiBiologic` | smipi, ki67 | MIPI-b |
| `ipssR` | cytogenetics, blasts, hb, plt, anc | IPSS-R MDS (Blood 2012) |
| `rISS` | iss, ldh, highRiskFISH | R-ISS MM (JCO 2015) |
| `filFitness` | ecog, cirs, adl | FIL Fitness semplificato |

Errori: `ENGINE_UNAVAILABLE` se `LumiaScores` non caricato, `NOT_FOUND` se `key` sconosciuta, `VALIDATION_REQUIRED` con `details.missing` se mancano parametri.

## F. Therapy — assistenti terapeutici

| Metodo | Path | Auth | Descrizione |
|--------|------|------|-------------|
| `GET` | `/api/therapy` | no | Lista moduli con `available` (boolean) |
| `GET` | `/api/therapy/:key` | no | Descrizione + schema `fields` |
| `POST` | `/api/therapy/:key` | no | Body = input → `{ result: {...} }` |

Moduli attesi (`THERAPY_META`):

| Key | Stato | Campi richiesti |
|-----|-------|-----------------|
| `cll` | implementato | genetics, mutations, fitness, line, age |
| `dlbcl` | implementato | genetics, mutations, fitness, line, subtype, ipi_score |
| `fl` | implementato | genetics, fitness, line, gelf_met, flipi_score, pod24 |
| `mcl` | implementato | genetics, fitness, line, variant, mipi_score |
| `mm`, `mds`, `cmml`, `aml` | non implementato | — (`available=false`, `MODULE_NOT_FOUND` su POST) |

## G. Agenda — `app/agenda/routes.js`

Tutti gli endpoint hanno prefisso `/api/agenda/`. Tutti `auth=true` tranne `health`.

### G.1 — Health

- `GET /api/agenda/health` → `{ status:"ok", service:"agenda", ts }`

### G.2 — Elenco (vista flat di sintesi)

- `GET /api/agenda/elenco`

### G.3 — Nodes (albero macroarea→postazione)

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/nodes` |
| `POST` | `/api/agenda/nodes` |
| `GET` | `/api/agenda/nodes/:id` |
| `PUT` | `/api/agenda/nodes/:id` |
| `DELETE` | `/api/agenda/nodes/:id` |
| `GET` | `/api/agenda/nodes/:id/children` |
| `GET` | `/api/agenda/nodes/:id/descendants` |
| `GET` | `/api/agenda/nodes/:id/ancestors` |

### G.4 — Closed days

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/closed-days` |
| `POST` | `/api/agenda/closed-days` |
| `DELETE` | `/api/agenda/closed-days/:date` |

### G.5 — Day room overrides

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/day-room-overrides` |
| `POST` | `/api/agenda/day-room-overrides` |
| `DELETE` | `/api/agenda/day-room-overrides` |
| `POST` | `/api/agenda/day-room-overrides/bulk` |

### G.6 — Services

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/services` |
| `POST` | `/api/agenda/services` |
| `GET` | `/api/agenda/services/:id` |
| `PUT` | `/api/agenda/services/:id` |
| `DELETE` | `/api/agenda/services/:id` |

### G.7 — Appointments

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/appointments?date=YYYY-MM-DD` |
| `GET` | `/api/agenda/appointments?week=YYYY-Wxx` |
| `GET` | `/api/agenda/appointments?from=…&to=…` |
| `GET` | `/api/agenda/appointments?patient_id=…` |
| `GET` | `/api/agenda/appointments/counts` |
| `GET` | `/api/agenda/appointments/counts-by-room` |
| `GET` | `/api/agenda/appointments/panoramica` |
| `GET` | `/api/agenda/appointments/slots` |
| `GET` | `/api/agenda/appointments/:id` |
| `POST` | `/api/agenda/appointments` |
| `PUT` | `/api/agenda/appointments/:id` |
| `DELETE` | `/api/agenda/appointments/:id` |
| `PATCH` | `/api/agenda/appointments/reorder` |
| `PATCH` | `/api/agenda/appointments/:id/move` |
| `PATCH` | `/api/agenda/appointments/:id/status` |

### G.8 — Transfusion (per appointment)

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/transfusions?date=…` |
| `GET` | `/api/agenda/appointments/:id/transfusion` |
| `POST` | `/api/agenda/appointments/:id/transfusion` |
| `DELETE` | `/api/agenda/appointments/:id/transfusion` |

### G.9 — Lists & list-entries

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/lists` |
| `POST` | `/api/agenda/lists` |
| `GET` | `/api/agenda/lists/:id` |
| `PUT` | `/api/agenda/lists/:id` |
| `DELETE` | `/api/agenda/lists/:id` |
| `GET` | `/api/agenda/lists/:id/slots` |
| `GET` | `/api/agenda/list-entries` |
| `POST` | `/api/agenda/list-entries` |
| `GET` | `/api/agenda/list-entries/:id` |
| `PUT` | `/api/agenda/list-entries/:id` |
| `DELETE` | `/api/agenda/list-entries/:id` |
| `PATCH` | `/api/agenda/list-entries/:id/promote` |
| `PATCH` | `/api/agenda/list-entries/:id/status` |

### G.10 — Patients (proxy → Cerus)

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/patients?q=…&limit=…` |
| `GET` | `/api/agenda/patients/search?q=…` |
| `GET` | `/api/agenda/patients/:id` |

Implementati come **proxy HTTP** verso Cerus (vedi `src/integrations/cerus/`). Errori dedicati:

- Cerus non configurato → `503 CERUS_NOT_CONFIGURED`,
- Cerus irraggiungibile → `502 CERUS_UNAVAILABLE`,
- paziente assente → `404`.

### G.11 — List closed days

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/list-closed-days` |
| `POST` | `/api/agenda/list-closed-days` |
| `DELETE` | `/api/agenda/list-closed-days/:date` |

### G.12 — Station closures (chiusure ricorrenti)

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/station-closures` |
| `POST` | `/api/agenda/station-closures` |
| `GET` | `/api/agenda/station-closures/bulk` |
| `POST` | `/api/agenda/station-closures/bulk` |
| `GET` | `/api/agenda/station-closures/:id` |
| `PUT` | `/api/agenda/station-closures/:id` |
| `DELETE` | `/api/agenda/station-closures/:id` |

### G.13 — Station openings

| Metodo | Path |
|--------|------|
| `GET` | `/api/agenda/station-openings` |
| `POST` | `/api/agenda/station-openings` |
| `DELETE` | `/api/agenda/station-openings/:id` |

---

## Note generali

- **Dual auth**: tutti gli endpoint con `auth: true` accettano sia cookie sessione (browser) sia `X-API-Key` (client esterni). Il CSRF (`X-CSRF-Token`) è richiesto solo per cookie + metodi `POST`/`PUT`/`DELETE` (vedi nota in [03-server-middleware.md](03-server-middleware.md#6-auth-gatejs--enforceauthreq-match-method-apipath) sui `PATCH`).
- **Risposte d'errore**: vedi [06-server-errors.md](06-server-errors.md).
- **Rate-limit**: applicato su `/api/*` (200 req/60 s/IP di default); login ha un secondo limiter (5/15 min).
- **CORS**: solo origin `http://${HOST}:${PORT}` e `http://localhost:${PORT}` (vedi `cors.js`).
