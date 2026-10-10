# Modulo Diagnostico CD — B-LPD (Mature B-cell Lymphoproliferative Disorders)

> Stato: 🔨 In revisione  
> Ultima modifica: 17 marzo 2026  
> Modulo: M1 (Roadmap)

---

## Panoramica

Il modulo diagnostico CD è il **primo motore di valutazione** di LUMIA. Analizza un pannello di marcatori immunofenotipici (CD) e produce una diagnosi differenziale ordinata per punteggio tra 17 entità B-LPD mature.

**Flusso:**
```
Selezione marcatori → Scoring engine → Diagnosi differenziale ordinata
   (marker+stato)     (cd-b-lpd-core)    (entries con score, %, match, conflitti)
```

---

## File del modulo

| File | Ruolo | Linee | Stato |
|------|-------|-------|-------|
| `app/diagnostics/cd-b-lpd-core.js` | Motore di scoring (zero DOM) | ~165 | ✅ Canonico |
| `app/diagnostics/cd-b-lpd-ui.js` | UI v2 (mount-based, HugeIcons) | ~395 | ✅ Attivo |
| `app/diagnostics/cd-b-lpd-helper.js` | UI v1 legacy (dialog, Lucide) | ~525 | ⚠️ Deprecato |
| `server/routes/diagnostics.js` | Route REST API | ~82 | ✅ Attivo |

### Dipendenze (browser)

`cd-b-lpd-core.js` → nessuna (standalone IIFE)  
`cd-b-lpd-ui.js` → `CDBLPDCore`, `LumiaEvents`, `LumiaExport`, `LumiaContentBridge`, `LumiaPresets` (opzionale), `LumiaHelpersRegistry`  
`cd-b-lpd-helper.js` → nessuna (tutto duplicato internamente) — **da eliminare**

### Dipendenze (server)

`server/engine-loader.js` carica `cd-b-lpd-core.js` in sandbox vm → `engines.CDBLPDCore`  
`server/routes/diagnostics.js` chiama `engines.CDBLPDCore.compute()`

---

## Dati del motore

### Marcatori (25)

```
CD5, CD10, CD19, CD20, CD22, CD23, CD24, CD25, CD27, CD38,
CD43, CD79b, CD103, CD123, CD148, CD200, FMC7, LEF1, SOX11,
LAIR1, cyclinD1, TRAP, sIg, Annexin_A1, IgD
```

### Stati possibili (5)

| Key | Significato |
|-----|-------------|
| `pos` | Positivo |
| `neg` | Negativo |
| `dim` | Dim (debolmente positivo) |
| `br` | Bright (fortemente positivo) |
| `nt` | Non testato |

### Diagnosi (17)

```
CLL/SLL, MCL (classical/nodal), MCL (leukemic non-nodal), MZL (splenic),
MZL (nodal), MZL (extranodal/MALT), FL, LPL/WM, HCL, HCL-variant,
B-PLL, DLBCL-NOS, BL, MCL (blastoid/pleomorphic), Richter (DLBCL),
Richter (BL-like), SMZL variant w/ villous lymphocytes
```

---

## Logica di scoring

### Regola base

Ogni diagnosi ha una mappa `marker → { stato → peso }`. Per ciascun marcatore selezionato:

1. **Match diretto**: `RULES[diagnosi][marcatore][stato]` → somma peso
2. **Approssimazioni**: `dim ≈ pos`, `pos ≈ br`, `br ≥ pos`
3. **Fallback differenziale**: se nessun match → `fallbackDifferential()`
   - Marker positivo ma non atteso: `+0.5` (POS_FALLBACK)
   - Marker negativo e con aspettativa positiva forte: `-1.5` (NEG_STRONG_PEN)

### Output compute()

```javascript
// Input
compute([
  { marker: 'CD5',  state: 'pos' },
  { marker: 'CD23', state: 'pos' },
  { marker: 'CD200', state: 'br' }
])

// Output
{
  entries: [                          // solo score > 0, ordinati desc
    {
      diagnosis: 'CLL/SLL',
      score: 14,
      pct: 87.5,                      // percentuale relativa al max
      matches: ['CD5 pos +2', ...],
      conflicts: []
    },
    ...
  ],
  all: [...]                          // tutte le 17 diagnosi, ordinate desc
}
```

### Bug noto

`Math.max(1, Math.min(1, expect.pos))` → sempre `1`, è un no-op. Presente sia in `core.js` che in `helper.js`. Non impatta il risultato clinico perché il valore viene usato come denominatore per il fallback che è già `1`.

---

## API REST

### Discovery

```
GET /api/diagnostic/b-lpd

→ 200 {
    ok: true,
    engine: 'b-lpd',
    markers: [...],        // 25 stringhe
    states: [...],         // 5 oggetti {key, label}
    diagnoses: [...],      // 17 stringhe (chiavi RULES)
    fields: [
      { name: 'selections', type: 'array', required: true,
        items: { marker: 'string', state: 'string', note: 'string (opzionale)' } }
    ]
  }
```

### Evaluate

```
POST /api/diagnostic/b-lpd
Content-Type: application/json
X-API-Key: <token>

{ "selections": [
    { "marker": "CD5", "state": "pos" },
    { "marker": "CD23", "state": "pos" }
  ]
}

→ 200 {
    ok: true,
    engine: 'b-lpd',
    version: '0.1.0',
    timestamp: '...',
    input: { selections: [...] },
    result: { entries: [...], all: [...] },
    meta: { markers: [...], states: [...], diagnoses: [...] }
  }
```

### Errori

| Status | Codice | Causa |
|--------|--------|-------|
| 400 | `INVALID_INPUT` | Selezioni non array, marker sconosciuto, stato sconosciuto |
| 401 | `AUTH_REQUIRED` | Header X-API-Key mancante |
| 403 | `AUTH_INVALID` | API key non valida |
| 503 | `ENGINE_UNAVAILABLE` | CDBLPDCore non caricato |
| 405 | `METHOD_NOT_ALLOWED` | Metodo HTTP non GET/POST |

---

## API WebSocket

```json
// → Request (dopo autenticazione)
{
  "id": "uuid",
  "action": "evaluate",
  "engine": "diagnostic/b-lpd",
  "data": { "selections": [...] }
}

// ← Response
{
  "id": "uuid",
  "ok": true,
  "engine": "diagnostic/b-lpd",
  "timestamp": "...",
  "result": { "entries": [...], "all": [...] }
}
```

---

## UI — Interfaccia utente

### v2 (attiva): `cd-b-lpd-ui.js`

Pattern: **mount-based** — `CDDiagnosticHelper.mount(element)` inietta il layout nel contenitore passato.

**Layout:**
```
┌────────────────────────────────────────────────────┐
│  Action bar: [Aggiungi] [Esporta] [Reset] [Info]  │
├────────────────────────────────────────────────────┤
│  Presets bar: chip preset (se LumiaPresets attivo)│
├──────────────────────┬─────────────────────────────┤
│  Tabella marcatori   │  Pannello risultati         │
│  ┌─────┬──────┬────┐ │  ┌──────────────────────┐  │
│  │Mark │Stato │ ✏🗑│ │  │ Diagnosi #1  ████ 87%│  │
│  │CD5  │ pos  │ ✏🗑│ │  │ matches: CD5 pos +2  │  │
│  │CD23 │ pos  │ ✏🗑│ │  │ conflicts: —         │  │
│  └─────┴──────┴────┘ │  │                      │  │
│                      │  │ Diagnosi #2  ██ 45%  │  │
│                      │  │ [Apri assistente →]   │  │
│                      │  └──────────────────────┘  │
└──────────────────────┴─────────────────────────────┘
```

**Integrazioni:** HugeIcons, LumiaEvents (emette `lumia:diagnostic:computed`), LumiaExport (clipboard/print), LumiaContentBridge (link a terapia), LumiaPresets (preset marker), LumiaHelpersRegistry (registrazione automatica).

### v1 (legacy): `cd-b-lpd-helper.js`

Pattern: **dialog-based** — `CDDiagnosticHelper.open()` crea e mostra un `<dialog>` modale.  
**Problemi**: duplica tutto il core, usa Lucide (vecchio), nessun mount(), nessuna integrazione con il framework attuale.  
**Usato solo da**: `index.app.html` (shell legacy).

---

## Problemi aperti

| # | Severità | Descrizione | File |
|---|----------|-------------|------|
| 1 | 🔴 | Export mismatch: `module.exports = handle` (bare) ma api-server.js chiama `.handle()` | `routes/diagnostics.js` |
| 2 | 🟡 | `cd-b-lpd-helper.js` duplica RULES/compute — rischio divergenza silente | `diagnostics/cd-b-lpd-helper.js` |
| 3 | 🟡 | `Math.max(1, Math.min(1, x))` no-op nel fallback | `cd-b-lpd-core.js:130` |
| 4 | ⚪ | `cd-b-lpd-helper.js` espone `window.$` — inquina lo scope globale | `cd-b-lpd-helper.js:156` |

---

## Prossimi passi (modulo CD)

1. **Fix export mismatch** in `routes/diagnostics.js` → `module.exports = { handle }`
2. **Decidere destino di `cd-b-lpd-helper.js`**: deprecare formalmente o eliminare
3. **Fix no-op** `Math.max/Math.min` in `cd-b-lpd-core.js`
4. **Test end-to-end**: `node server/api-server.js` → curl POST → validare output JSON
