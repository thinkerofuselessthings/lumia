# Hemato — Roadmap Moduli & API

> Ultimo aggiornamento: 2026-03-16

## Visione

Hemato è un **servizio standalone** (desktop, no cloud) che:
1. Espone **API REST + WebSocket** su `localhost` per ricevere input da software esterni e restituire valutazioni strutturate (JSON).
2. Fornisce un'**interfaccia grafica** (Electron + browser) per uso diretto da parte del clinico.
3. Richiede **API key** per ogni chiamata esterna.
4. Mostra un **log delle chiamate API** in tempo reale nell'interfaccia.

---

## Architettura

```
┌──────────────────────────────────────────────────┐
│                   Electron App                    │
│                                                   │
│  ┌─────────────┐    ┌──────────────────────────┐ │
│  │  Express +   │    │    BrowserWindow (UI)     │ │
│  │  WebSocket   │    │    index.html + app/*     │ │
│  │  Server      │    │                          │ │
│  │  localhost:N │◄──►│  API Log Panel (live)     │ │
│  └──────┬───────┘    └──────────────────────────┘ │
│         │                                         │
│  ┌──────▼───────────────────────────┐             │
│  │       Engine Loader (Node.js)    │             │
│  │  Carica i *-core.js in sandbox   │             │
│  │  Nessuna modifica ai file browser│             │
│  └──────────────────────────────────┘             │
└──────────────────────────────────────────────────┘
          ▲
          │ REST / WebSocket (JSON)
          │ Header: X-API-Key
          │
   ┌──────┴──────┐
   │  Software    │
   │  esterno     │
   │  (Node, …)   │
   └─────────────┘
```

### Stack

| Layer          | Tecnologia           |
|----------------|----------------------|
| Desktop shell  | Electron             |
| API server     | Express 4            |
| WebSocket      | ws                   |
| Auth           | API key (header)     |
| Engine loader  | Node.js `vm` module  |
| UI             | Vanilla JS (invariata) |
| Porta          | Configurabile (default 3500) |

---

## Moduli — Roadmap

Ogni modulo viene lavorato uno alla volta.  
Stato: ⬜ Da fare · 🔨 In corso · ✅ Completato

### M0 — Infrastruttura ⬜
> Fondazione: Electron, Express, WebSocket, auth, engine-loader, API log UI.

| File | Scopo |
|------|-------|
| `package.json` | Dipendenze: electron, express, ws, uuid |
| `main.js` | Electron main process |
| `server/config.js` | Porta, API key, opzioni |
| `server/api-server.js` | Express app + WS attach |
| `server/engine-loader.js` | Carica *-core.js in Node.js sandbox |
| `server/middleware/auth.js` | Verifica X-API-Key |
| `server/routes/*.js` | Route REST per ogni modulo |
| `server/ws-handler.js` | Protocollo WebSocket |
| `index.html` update | Pannello API log in UI |

---

### M1 — B-LPD Diagnostic 🔨
> Già funzionante: `cd-b-lpd-core.js` con `compute()`.

**API endpoint:** `POST /api/diagnostic/b-lpd`

**Input (JSON):**
```json
{
  "selections": [
    { "marker": "CD5",  "state": "pos" },
    { "marker": "CD23", "state": "pos" },
    { "marker": "CD200","state": "br"  }
  ]
}
```

**Output (JSON):**
```json
{
  "ok": true,
  "engine": "b-lpd",
  "version": "0.1.0",
  "timestamp": "2026-03-16T10:00:00Z",
  "input": { "selections": [...] },
  "result": {
    "entries": [
      {
        "diagnosis": "CLL/SLL",
        "score": 14,
        "pct": 87.5,
        "matches": ["CD5 pos +2", "CD23 pos +2", "CD200 br +3"],
        "conflicts": []
      }
    ],
    "all": [...]
  },
  "meta": {
    "markers_available": ["CD5","CD23","CD200","LEF1",...],
    "states_available": ["pos","neg","dim","br","nt"],
    "diagnoses_available": ["CLL/SLL","MCL (classical/nodal)",...]
  }
}
```

**Route WebSocket:**
```json
{ "action": "evaluate", "engine": "diagnostic/b-lpd", "data": { "selections": [...] } }
```

---

### M2 — Score Calculators ⬜
> Già funzionante: `hemato-scores.js` con 11 calcolatori.

**API endpoint:** `POST /api/scores/:calculator`

Calcolatori disponibili:
| Key | Score | Parametri |
|-----|-------|-----------|
| `cllIPI` | CLL-IPI | age, b2m, stage, ighv, tp53 |
| `flipi` | FLIPI | age, stage, hb, ldh, nodes |
| `flipi2` | FLIPI-2 | age, b2m, bm, hb, ln |
| `primaPI` | PRIMA-PI | b2m, bm |
| `ipi` | IPI | age, ldh, ecog, stage, extranodal |
| `cnsIPI` | CNS-IPI | age, ldh, stage, ecog, extranodal, renal |
| `sMIPI` | S-MIPI | age, ecog, ldh, wbc |
| `mipiBiologic` | MIPI-b | smipi, ki67 |
| `ipssR` | IPSS-R | cytogenetics, blasts, hb, plt, anc |
| `rISS` | R-ISS | iss, ldh, highRiskFISH |
| `filFitness` | FIL Fitness | ecog, cirs, adl |

**Endpoint discovery:** `GET /api/scores` → lista di tutti i calcolatori con i parametri attesi.

---

### M3 — CLL Therapy ⬜
> Già funzionante: `cll-therapy-helper.js` + `cll-therapy-core.js` con regimi e logica.

**API endpoint:** `POST /api/therapy/cll`

**Input:** genetica, mutazioni, fitness, linea, età, comorbidità, pretrattamenti.

**Output:** regimi raccomandati con livello di evidenza, note AIFA, dosaggi.

---

### M4 — DLBCL Therapy ⬜
> Già funzionante: `dlbcl-therapy-helper.js` + `dlbcl-therapy-core.js`.

**API endpoint:** `POST /api/therapy/dlbcl`

---

### M5 — FL Therapy ⬜
> Già funzionante: `fl-therapy-helper.js` + `fl-therapy-core.js`.

**API endpoint:** `POST /api/therapy/fl`

---

### M6 — MCL Therapy ⬜
> Già funzionante: `mcl-therapy-helper.js` + `mcl-therapy-core.js`.

**API endpoint:** `POST /api/therapy/mcl`

---

### M7 — FIL Fitness ⬜
> Scheletro. Necessita motore `compute()` dedicato. Score base in `hemato-scores.js → filFitness`.

**API endpoint:** `POST /api/evaluate/fitness`

---

### M8 — Multiple Myeloma ⬜
> Scheletro. Necessita: dataset completo, motore a regole, regimi AIFA.

**API endpoint:** `POST /api/therapy/mm`

---

### M9 — MDS ⬜
> Scheletro. Necessita: IPSS-R/M engine, terapia per rischio.

**API endpoint:** `POST /api/therapy/mds`

---

### M10 — CMML ⬜
> Scheletro. Necessita: classificazione, motore terapeutico.

**API endpoint:** `POST /api/therapy/cmml`

---

### M11 — AML ⬜
> Scheletro. Necessita: ELN risk engine, motore terapeutico.

**API endpoint:** `POST /api/therapy/aml`

---

## Protocollo API

### Autenticazione
Ogni richiesta (REST e WebSocket) deve includere:
- **REST:** Header `X-API-Key: <token>`
- **WebSocket:** Primo messaggio `{ "type": "auth", "apiKey": "<token>" }`

### Risposta standard (REST)
```json
{
  "ok": true|false,
  "engine": "<module-key>",
  "version": "<semver>",
  "timestamp": "<ISO 8601>",
  "input": { ... },
  "result": { ... },
  "meta": {
    "fields_required": [...],
    "fields_optional": [...],
    "description": "..."
  },
  "error": null | { "code": "...", "message": "..." }
}
```

### Discovery
- `GET /api/catalog` → lista di tutti gli engine disponibili con i loro parametri attesi
- `GET /api/scores` → lista calcolatori di score
- `GET /api/health` → stato del servizio

### WebSocket
```json
// → Request
{ "id": "uuid", "action": "evaluate", "engine": "diagnostic/b-lpd", "data": {...} }

// ← Response
{ "id": "uuid", "ok": true, "engine": "diagnostic/b-lpd", "result": {...} }
```

---

## Ordine di esecuzione

```
M0  Infrastruttura       ← PRIMO (fondazione)
M1  B-LPD Diagnostic     ← primo engine (pattern di riferimento)
M2  Scores               ← indipendente, rapido
M3  CLL Therapy           ← primo "percorso" completo
M4  DLBCL Therapy
M5  FL Therapy
M6  MCL Therapy
M7  FIL Fitness           ← upgrade da scheletro
M8  MM                    ← upgrade da scheletro
M9  MDS                   ← upgrade da scheletro
M10 CMML                  ← upgrade da scheletro
M11 AML                   ← upgrade da scheletro
```
