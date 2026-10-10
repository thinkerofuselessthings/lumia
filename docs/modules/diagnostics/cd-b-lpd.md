# CD-Based B-LPD Diagnostic Suite

> Diagnosi differenziale delle neoplasie B-linfoproliferative (B-LPD) basata sull'immunofenotipo CD.

| Proprietà | Valore |
|-----------|--------|
| **Directory** | `app/diagnostics/` |
| **File** | 5 moduli (data, core, knowledge, ui, helper) |
| **Righe totali** | ~3 500 |
| **Pattern** | Data → Core (engine) → Knowledge → UI |

## Architettura

```
cd-b-lpd-data.js  ─────┐
  (espressione marker)  │
                        ▼
cd-b-lpd-core.js  ────── compute() → {entries, all}
  (scoring engine)        ▲
                          │
cd-b-lpd-knowledge.js     │  (info molecolare per marker)
                          │
cd-b-lpd-ui.js  ──────── UI 3 colonne + modal picker
  (interfaccia)
```

---

## cd-b-lpd-data.js (~1 569 righe)

> Database immunofenotipico — puro dato, zero logica.

### Export: `window.CDBLPDData`

| Metodo | Ritorna | Descrizione |
|--------|---------|-------------|
| `markers()` | `string[]` | Lista marcatori (CD19, CD20, CD5, CD23, CD200…) |
| `categories()` | `string[]` | Categorie (B-cell, T-cell, activation…) |
| `diseases()` | `string[]` | 17 sottotipi B-LPD |
| `table()` | `Object` | MARKER_TABLE completa |
| `markersByCategory()` | `Object` | Marcatori raggruppati per categoria |
| `profileOf(disease)` | `Object` | Profilo completo di una malattia |
| `diseaseKeys` | `string[]` | Chiavi interne malattie |
| `markerKeys` | `string[]` | Chiavi interne marcatori |

### Struttura MARKER_TABLE

```js
{
  CD19: {
    category: 'B-cell',
    fullName: 'CD19 (B-lymphocyte antigen)',
    diseases: {
      CLL: { expr: ['+'], typical: true, weight: 1.0, note: '…' },
      MCL: { expr: ['+'], typical: true, weight: 0.8, note: '…' },
      // … 17 malattie
    }
  },
  // … 30+ marcatori
}
```

### Malattie coperte (17)

CLL, MCL, FL, MZL, SMZL, NMZL, LPL/WM, HCL, HCL-v, B-PLL, DLBCL, BL, PMBCL, SLL, B-ALL, Richter, CLL/PL

---

## cd-b-lpd-core.js (~212 righe)

> Motore di scoring diagnostico — zero DOM.

### Export: `window.CDBLPDCore`

| Metodo | Firma | Descrizione |
|--------|-------|-------------|
| `compute(selections)` | `Object → {entries, all}` | Calcola score diagnosi dati i marcatori selezionati |
| `markers()` | `→ string[]` | Lista marcatori |
| `states()` | `→ string[]` | Stati possibili per marcatore (`+`, `-`, `dim`, `bright`…) |
| `diagnoses()` | `→ string[]` | Lista diagnosi |
| `rules()` | `→ Object` | Regole di scoring derivate da MARKER_TABLE |
| `data` | `CDBLPDData` | Riferimento al modulo data |

### Registrazioni API

```js
LumiaAPI.diagnostics.bLPD = CDBLPDCore;
LumiaAPI.markers.registerPanel('bLPD', { markers, states, compute });
```

### Algoritmo `compute()`

1. Per ogni malattia, scorre i marcatori selezionati
2. Confronta l'espressione selezionata con le regole tipiche
3. Accumula score pesato (`weight × match`)
4. Identifica conflitti (espressioni atipiche)
5. Ritorna `entries[]` ordinate per score decrescente con `{disease, score, maxScore, pct, matches, conflicts}`

---

## cd-b-lpd-knowledge.js (~627 righe)

> Base di conoscenza molecolare per ogni marcatore CD.

### Export: `window.CDBLPDKnowledge`

Oggetto con ~40 entry, ciascuna:

```js
{
  CD19: {
    aliases: ['B4', 'Leu-12'],
    gene: 'CD19',
    mw: '95 kDa',
    structure: 'Ig superfamily member, type I transmembrane…',
    distribution: 'All B-cell stages except plasma cells…',
    fn: 'B-cell receptor signaling co-receptor…',
    clinical: 'Pan-B marker, target for blinatumomab…',
    clones: ['HIB19', 'SJ25C1', '4G7']
  },
  // …
}
```

### Campi per marcatore

| Campo | Descrizione |
|-------|-------------|
| `aliases` | Nomi alternativi / nomenclatura precedente |
| `gene` | Gene codificante |
| `mw` | Peso molecolare |
| `structure` | Struttura proteica |
| `distribution` | Distribuzione cellulare |
| `fn` | Funzione biologica |
| `clinical` | Rilevanza clinica |
| `clones` | Cloni anticorpali di riferimento |

---

## cd-b-lpd-ui.js (~1 105 righe)

> Interfaccia diagnostica a 3 colonne + modal picker.

### Export: `window.CDDiagnosticHelper`

| Metodo | Firma | Descrizione |
|--------|-------|-------------|
| `open()` | `→ void` | Apre il pannello diagnostico |
| `close()` | `→ void` | Chiude e pulisce |
| `mount(el)` | `Element → void` | Monta l'UI nell'elemento dato |
| `getSelection()` | `→ Object` | Ritorna le selezioni correnti |
| `setSelection(arr)` | `Array → void` | Imposta selezioni programmaticamente |
| `reset()` | `→ void` | Resetta tutte le selezioni |

### Layout 3 colonne

| Colonna | Contenuto |
|---------|-----------|
| **Col 1** — Marcatori | Lista marcatori con stato selezionato, filtro ricerca, preset rapidi |
| **Col 2** — Risultati | Diagnosi ordinate per probabilità con barra percentuale |
| **Col 3** — Profilo | Confronto dettagliato tra profilo atteso e reale per la diagnosi selezionata |

### Modal picker

- Griglia bento-style per selezione intensità espressione
- Info layer per dettagli marker (da CDBLPDKnowledge)
- Radar chart per visualizzazione grafica
- Report stampabile via LumiaExport

### Dipendenze

`CDBLPDCore`, `CDBLPDData`, `CDBLPDKnowledge`, `LumiaEvents`, `LumiaToast`, `LumiaExport`

---

## Flusso dati completo

```
Utente seleziona marcatori (UI)
  │
  ▼
CDDiagnosticHelper.getSelection()
  │
  ▼
CDBLPDCore.compute(selections)
  ├── legge regole da CDBLPDData.table()
  ├── calcola score per ogni diagnosi
  └── ritorna entries ordinate
  │
  ▼
UI aggiorna Col2 (risultati) e Col3 (profilo)
  │
  ▼ (opzionale)
LumiaExport.fromDiagnostic(result, selections)
  └── genera report testuale per condivisione
```

## Note

- Il modulo data è anche usato lato server tramite engine-loader (VM sandbox).
- Knowledge è stato estratto da cd-b-lpd-ui.js durante Phase C del refactoring (618 righe → file separato).
- L'UI utilizza event delegation per gestire click su marcatori e diagnosi.
