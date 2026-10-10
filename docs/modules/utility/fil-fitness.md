# FIL Fitness Assessment (sGA / EPI)

> Valutazione geriatrica semplificata (sGA) e Elderly Prognostic Index (EPI) secondo protocollo FIL (Merli et al., JCO 2021).

| Proprietà | Valore |
|-----------|--------|
| **Directory** | `app/utility/fitness/` |
| **File** | 4 moduli (data, core, ui, helper) |
| **Righe totali** | ~1 280 |
| **Pattern** | Data → Core (engine) → UI → Helper (registry) |

## Architettura

```
fil-fitness-data.js ────── scale ADL/IADL/CIRS-G, costanti, cutoff
        │
        ▼
fil-fitness-core.js ────── computeSGA(), computeEPI(), computeAll()
        │
        ▼
fil-fitness-ui.js   ────── pannello IDE-style con sidebar + editor
        │
        ▼
fil-fitness-helper.js ──── registrazione su LumiaHelpersRegistry
```

---

## fil-fitness-data.js (~259 righe)

> Costanti cliniche e scale di valutazione.

### Export: `window.FILFitnessData`

| Costante | Descrizione |
|----------|-------------|
| `ADL_ITEMS` | 6 item scala Katz (ADL): bagno, vestirsi, toilette, trasferimento, continenza, alimentazione |
| `IADL_ITEMS` | 8 item scala Lawton (IADL): telefono, spesa, cucina, pulizie, bucato, trasporti, farmaci, finanze — con scoring gender-specific |
| `CIRS_CATEGORIES` | 14 categorie organo CIRS-G: cardiaca, ipertensione, vascolare, respiratoria, OOGL, GI-superiore, GI-inferiore, epatica, renale, genito-urinaria, muscolo-scheletrica, neurologica, endocrina, psichiatrica |

### Funzioni di scoring

| Funzione | Output |
|----------|--------|
| `adlScore(items)` | Score 0-6 (6 = indipendente) |
| `iadlScore(items, gender)` | Score 0-8/5 (M/F) |
| `cirsGrade(categories)` | Grado comorbidità (numero cat. ≥ 3) |
| `cirsScore(categories)` | Score cumulativo |
| `classifySGA(adl, iadl, cirs, age)` | `'fit'` / `'unfit'` / `'frail'` |
| `classifyEPI(epiScore)` | Categoria EPI |

---

## fil-fitness-core.js (~116 righe)

> Motore di calcolo sGA/EPI — zero DOM.

### Export: `window.FILFitnessCore`

| Metodo | Firma | Output |
|--------|-------|--------|
| `computeSGA(input)` | `{adl, iadl, cirs, age, gender}` | `{adlScore, iadlScore, cirsGrade, cirsScore, sga: 'fit'/'unfit'/'frail'}` |
| `computeEPI(input)` | `{age, albumin, β2m, creatinine, sga}` | `{epiScore, epiCategory, risk, components}` |
| `computeAll(input)` | tutti i parametri | `{sga: {…}, epi: {…}}` |

### Classificazione sGA (Merli et al.)

| Categoria | Criterio |
|-----------|----------|
| **Fit** | ADL 6, IADL ≥ soglia, CIRS grade 0, età < 80 |
| **Unfit** | Almeno 1 deficit lieve (ADL 5, IADL borderline, CIRS 1-2 cat.) |
| **Frail** | ADL ≤ 4, o CIRS ≥ 3 cat. grado 3-4, o età ≥ 80 con deficit |

---

## fil-fitness-ui.js (~867 righe)

> Interfaccia IDE-style con sidebar punteggi e area editor.

### Export: `window.FILFitnessUI`

| Metodo | Firma | Descrizione |
|--------|-------|-------------|
| `mount(el)` | `Element → void` | Monta l'interfaccia completa nell'elemento dato |

### Layout

```
┌─────────────────────────────────────────────┐
│  Sidebar (score list)  │  Editor area       │
│  ─────────────────     │  ─────────────     │
│  📋 Anagrafica         │  [Form attivo]     │
│  🔢 ADL (6/6)          │                    │
│  🔢 IADL (8/8)         │                    │
│  🏥 CIRS-G (0)         │                    │
│  📊 EPI                │                    │
│  ✅ Risultati           │                    │
└─────────────────────────────────────────────┘
```

### Sezioni sidebar (6)

| Sezione | Contenuto editor |
|---------|-----------------|
| **Anagrafica** | Età, genere, albumina, β2-microglobulina, creatinina |
| **ADL** | 6 item Katz con toggle indipendente/dipendente |
| **IADL** | 8 item Lawton (gender-adaptive) con radio 0/1 |
| **CIRS-G** | 14 categorie con slider 0-4 per gravità |
| **EPI** | Calcolo automatico dall'anagrafica + sGA |
| **Risultati** | Classificazione sGA + EPI con colore/icona |

### Funzionalità

- Calcolo live ad ogni modifica parametro
- Sub-score visualizzati in sidebar (badge colore)
- CIRS-G griglia interattiva con tooltip per ogni organo
- Report esportabile via LumiaExport

---

## fil-fitness-helper.js (~36 righe)

> Wrapper di registrazione per il registry helper.

```js
LumiaHelpersRegistry.register({
  id: 'fil-fitness-helper',
  name: 'FIL sGA/EPI',
  tag: 'helper',
  group: 'Score clinici',
  icon: 'hgi-…',
  mount: (el) => FILFitnessUI.mount(el),
  unmount: (el) => { el.innerHTML = ''; }
});
```

## Note

- I dati e il core engine vengono anche caricati lato server via engine-loader per l'endpoint `POST /api/scores/fil-fitness`.
- I criteri di classificazione seguono strettamente la pubblicazione FIL (Fondazione Italiana Linfomi).
- La UI supporta navigazione da tastiera tra le sezioni (Tab / Shift+Tab).
