# Hemato v0.0.1 — Analisi Progetto & Roadmap

> **Data**: 16 marzo 2026  
> **Scope**: Servizio diagnostico e supporto ematologico per linfoproliferative (B-LPD) e mieloproliferative (MPN/MDS) basato su Cluster of Differentiation (CD) e utility cliniche.  
> **Architettura target**: Vanilla JS ES6+ (zero dipendenze), CSS custom properties, IIFE pattern — conforme al sistema Janus/ChemERA.

---

## Indice

1. [Panoramica del Progetto](#1-panoramica-del-progetto)
2. [Inventario File e Stato Attuale](#2-inventario-file-e-stato-attuale)
3. [Architettura Attuale — Analisi Dettagliata](#3-architettura-attuale--analisi-dettagliata)
4. [Analisi per Componente](#4-analisi-per-componente)
5. [Gap Analysis — Clinica](#5-gap-analysis--clinica)
6. [Gap Analysis — Tecnica](#6-gap-analysis--tecnica)
7. [Architettura Target: Dual-Mode (API + UI)](#7-architettura-target-dual-mode-api--ui)
8. [Specifiche API Service](#8-specifiche-api-service)
9. [Specifiche UI System](#9-specifiche-ui-system)
10. [Roadmap Implementativa](#10-roadmap-implementativa)
11. [File Map Target](#11-file-map-target)
12. [Dipendenze e Ordine di Caricamento](#12-dipendenze-e-ordine-di-caricamento)
13. [Standard e Riferimenti Clinici](#13-standard-e-riferimenti-clinici)

---

## 1. Panoramica del Progetto

### 1.1 Missione

Creare un servizio ematologico integrato che permetta:

- **Inserimento marker CD** (citofluorimetria) con stati (Positivo/Negativo/Dim/Bright/Non testato)
- **Formulazione di ipotesi diagnostiche probabilistiche** tramite scoring engine pesato
- **Supporto terapeutico** per ciascuna patologia identificata (regimi, score prognostici, resistenze)
- **Esposizione duale**: API programmatica per software terzi + interfaccia utente diretta

### 1.2 Stack Tecnologico

| Componente | Scelta | Rationale |
|---|---|---|
| Linguaggio | Vanilla JavaScript ES6+ | Zero dipendenze, conforme Janus |
| Pattern moduli | IIFE `(function(global){...})(window)` | Incapsulamento, no build tools |
| CSS | Custom properties `:root` + classi BEM-like | Design tokens condivisi |
| Icone | Lucide (CDN) + SVG inline | Coerenza con sistema icone Janus |
| Build | Nessuno — file serviti direttamente | Semplicità, zero config |
| API | Event-driven + metodi sincroni su `window` | Interoperabilità immediata |

### 1.3 Filosofia di Design (da guidelines)

- **Flat White Minimalist** — bianco dominante, grigio per gerarchia, colore = segnale
- **Font Inter** con feature OpenType (`cv02`, `cv03`, `cv04`, `cv11`)
- **Bordi minimi** — `1px solid var(--border-color)`, ombre con parsimonia
- **Scala tipografica ordinata** — da `3xs` (0.5rem) a `3xl` (2rem)
- **Spaziature a 7 step** — `xs` (4px) → `3xl` (64px)

---

## 2. Inventario File e Stato Attuale

### 2.1 Mappa File

```
hemato.ver.0.0.1/
├── index.html                              # Shell HTML principale (210 righe)
├── index.app.html                          # Shell HTML alternativa (211 righe)
│
├── app/
│   ├── diagnostics/
│   │   └── cd-b-lpd-helper.js              # Diagnostica CD per B-LPD (340 righe)
│   │
│   ├── diseases/
│   │   ├── README_HELPERS.txt              # Documentazione helpers
│   │   ├── aml/aml-helper.js               # AML — scheletro (131 righe)
│   │   ├── cll/cll-therapy-helper.js       # CLL — completo (769 righe)
│   │   ├── cmml/cmml-helper.js             # CMML — scheletro (131 righe)
│   │   ├── dlbcl/dlbcl-therapy-helper.js   # DLBCL — completo (526 righe)
│   │   ├── fl/fl-therapy-helper.js         # FL — completo (542 righe)
│   │   ├── mcl/mcl-therapy-helper.js       # MCL — completo (577 righe)
│   │   ├── mds/mds-helper.js               # MDS — scheletro (131 righe)
│   │   └── mm/mm-therapy-helper.js         # MM — scheletro (157 righe)
│   │
│   └── utility/
│       ├── hemato-registry.js              # Registry condiviso (22 righe)
│       └── fitness/
│           └── fil-fitness-helper.js       # FIL Fitness — parziale (219 righe)
│
├── public/
│   └── css/
│       └── hemato-helpers.css              # CSS base helpers (30 righe)
│
└── guidelines/                             # Documentazione stile/architettura
    ├── root.md                             # Design tokens e palette
    ├── style.md                            # Style guide completa
    ├── LAYER_MODAL_SYSTEM.md               # Sistema layer/modale
    ├── library_style.md                    # Stili libreria
    ├── visual_schema.md                    # Schema visivo timeline
    └── visualization.md                    # Visualizzazione moduli clinici
```

### 2.2 Conteggio Righe per Area

| Area | File | Righe | % del totale |
|---|---|---|---|
| Diagnostica (CD B-LPD) | 1 | 340 | 9% |
| Therapy Helpers (maturi) | 4 | 2.414 | 64% |
| Therapy Helpers (scheletro) | 4 | 550 | 15% |
| Utility (registry + FIL) | 2 | 241 | 6% |
| CSS | 1 | 30 | 1% |
| HTML Shell | 2 | 421 | 11% |
| **Totale codice** | **14** | **~3.996** | **100%** |

---

## 3. Architettura Attuale — Analisi Dettagliata

### 3.1 Flusso Dati

```
                    ┌─────────────────┐
                    │  index.html     │
                    │  (shell)        │
                    └─────┬───────────┘
                          │ carica
               ┌──────────┼──────────────────┐
               ▼          ▼                  ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ hemato-      │  │ cd-b-lpd-    │  │ *-therapy-   │
     │ registry.js  │  │ helper.js    │  │ helper.js    │
     │              │  │              │  │              │
     │ Bus centrale │  │ Scoring      │  │ Genetica     │
     │ register()   │  │ engine per   │  │ Score prog.  │
     │ byId[]       │  │ 15 diagnosi  │  │ Regimi AIFA  │
     │              │  │ B-LPD        │  │ Resistenze   │
     └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
            │                 │                  │
            ▼                 ▼                  ▼
     ┌──────────────────────────────────────────────────┐
     │              window (global scope)                │
     │                                                   │
     │  .HematoHelpersRegistry   (registry-based)       │
     │  .CDDiagnosticHelper      (standalone)            │
     │  .CLLTherapyHelper        (standalone)            │
     │  .DLBCLTherapyHelper      (standalone)            │
     │  .FLTherapyHelper         (standalone)            │
     │  .MCLTherapyHelper        (standalone)            │
     └──────────────────────────────────────────────────┘
```

### 3.2 Due Pattern Coesistenti (Problema)

**Pattern A — Registry** (AML, CMML, MDS, MM, FIL):
```javascript
(function(global){
  const REG = global.HematoHelpersRegistry;
  const helper = { id:'...', title:'...', sections:[...] };
  helper.mount = function(mount){ buildUI(mount, helper); };
  REG.register(helper);
})(window);
```

**Pattern B — Standalone** (CLL, DLBCL, FL, MCL, CD B-LPD):
```javascript
// Tutto nel global scope
const TX_REGIMENS = {...};
const txState = {...};
function txCompute(){ ... }
window.CLLTherapyHelper = { init(), open(), getState() };
```

**Impatto**: i moduli maturi (Pattern B) non sono registrati nel registry, non seguono il pattern IIFE, e inquinano il global scope. I moduli scheletro (Pattern A) usano il registry ma non hanno logica interattiva.

### 3.3 Matrice di Maturità

| Modulo | Registry | IIFE | Scoring | UI Interattiva | Regimi AIFA | Score Prognostici | Resistenze |
|---|---|---|---|---|---|---|---|
| CD B-LPD | ❌ | ❌ | ✅ (15 dx) | ✅ | — | — | — |
| CLL | ❌ | ❌ | ✅ | ✅ (3 dialog) | ✅ (8) | ✅ (Rai/Binet/IPI) | ✅ (BTK/BCL2) |
| DLBCL | ❌ | ❌ | ✅ | ✅ (3 dialog) | ✅ (10) | ✅ (IPI/CNS-IPI) | ✅ (CD19) |
| FL | ❌ | ❌ | ✅ | ✅ (3 dialog) | ✅ (9) | ✅ (FLIPI/GELF) | ✅ |
| MCL | ❌ | ❌ | ✅ | ✅ (3 dialog) | ✅ (9) | ✅ (MIPI) | ✅ (BTKi) |
| AML | ✅ | ✅ | ❌ | ❌ (solo html) | ❌ | ❌ | ❌ |
| CMML | ✅ | ✅ | ❌ | ❌ (solo html) | ❌ | ❌ | ❌ |
| MDS | ✅ | ✅ | ❌ | ❌ (solo html) | ❌ | ❌ | ❌ |
| MM | ✅ | ✅ | ❌ | ❌ (solo html) | ❌ | ❌ | ❌ |
| FIL Fitness | ✅ | ✅ | ❌ | ⚠️ (dummy) | — | — | — |

---

## 4. Analisi per Componente

### 4.1 CD B-LPD Diagnostic Helper — `cd-b-lpd-helper.js`

**Punti di forza:**
- Scoring engine sofisticato: 25 marker × 15 diagnosi con punteggi pesati per 5 stati
- Copertura WHO 2022 eccellente: MCL con 5 varianti (classical, non-nodal, CD5⁻, CyclinD1⁻/SOX11⁺, CyclinD1⁻/SOX11⁻)
- DLBCL con algoritmo Hans (GCB vs non-GCB) + double-expressor flag
- Fallback differenziale intelligente per stati non mappati esplicitamente
- SMZL con esclusioni esplicite (CD103⁻, CD123⁻, AnnexinA1⁻)
- Entità rare: SDRPL, LPL/WM, HCL-variant

**Criticità:**
- Non usa il registry (`window.CDDiagnosticHelper` diretto)
- Costruisce DOM con `innerHTML` — nessun template strutturato
- `window.$` rischia collisione con jQuery o altri helper
- Nessun collegamento diagnostica → terapia
- Manca Burkitt Lymphoma con profilo più dettagliato
- Manca T-LPD completamente

**Score system:**

| Diagnosi | Marker chiave positivi | Marker chiave negativi | Score max teorico |
|---|---|---|---|
| CLL/SLL | CD5, CD23, CD200(br), LEF1, CD43 | CyclinD1, SOX11 | ~18 |
| MCL classical | CyclinD1, SOX11, CD5, FMC7, CD79b | CD23, CD200 | ~20 |
| HCL classica | AnnexinA1, CD103, CD25, CD11c, CD123 | CD5, CD23 | ~14 |
| SMZL | FMC7, CD79b, sIg, IgM | CD10, CD5, CD103, CD123 | ~22 |
| DLBCL Hans GCB | CD10, BCL6 | MUM1/IRF4 | ~7 |

### 4.2 CLL Therapy Helper — `cll-therapy-helper.js`

**Punti di forza:**
- Sistema completo: genetica (12 parametri), mutazioni resistenza (7), score (Rai/Binet/CLL-IPI), storia trattamenti, indicazioni iwCLL
- Calcolo CLL-IPI integrato con punteggio pesato (TP53=4, β2M=2, IGHV=2, stadio=1, età=1)
- 8 regimi AIFA con flag rimborsabilità
- Logica di raccomandazione basata su: frontline vs RR, TP53, IGHV, fallimento BTKi/BCL2i
- Dettaglio per schema: posologia, tossicità chiave, studi registrativi

**Criticità:**
- Global scope pollution: `TX_GENETICS`, `TX_MUTATIONS`, `txState`, `$tx` tutti esposti
- Prefisso `tx` ambiguo (potrebbe confondersi con "terapia" generico)
- Manca pirtobrutinib (BTKi non-covalente) — approvato EMA 2024 per BTKi-refrattari
- Manca venetoclax monoterapia post-BTKi
- Nessun calcolo automatico da genetica a score (TP53 inserita in genetica non aggiorna IPI)

### 4.3 DLBCL Therapy Helper — `dlbcl-therapy-helper.js`

**Punti di forza:**
- Copertura HGBL DH/TH (double/triple hit)
- 10 regimi inclusi CAR-T (axi-cel), bispecifici (glofitamab, epcoritamab), ADC (loncastuximab)
- Gating per IPI (pola-R-CHP ≥ IPI 3) e per tipo istologico (DA-R-EPOCH per PMBCL/HGBL)

**Criticità:**
- `dxBuildDialog()`, `dxBuildAddDialog()`, `dxBuildRegDialog()` sono definiti come stub nel file letto — possibile troncamento
- Manca stratificazione COO (cell-of-origin) da GEP oltre Hans
- Manca R-CHOP+pola per IPI 2 (indicazione emergente)

### 4.4 FL Therapy Helper — `fl-therapy-helper.js`

**Punti di forza:**
- FLIPI score con calcolo automatico
- Criteri GELF per indicazione al trattamento
- 9 regimi incluso rituximab maintenance e anti-CD20 da solo
- Logica per rituximab-refrattarietà

**Criticità:**
- Manca FLIPI-2
- Manca EZH2 come target terapeutico (tazemetostat)

### 4.5 MCL Therapy Helper — `mcl-therapy-helper.js`

**Punti di forza:**
- MIPI e MIPI-b (blastoid/pleomorphic flag)
- 9 regimi incluso ibrutinib, zanubrutinib, CAR-T (brexu-cel)
- Logica frontline giovane vs anziano vs RR

**Criticità:**
- Manca pirtobrutinib (approvato per MCL RR post-BTKi)
- Manca glofitamab/epcoritamab per MCL RR

### 4.6 Moduli Scheletro (AML, CMML, MDS, MM)

Tutti condividono lo stesso boilerplate di 131 righe con `buildUI()` identico. Contengono:
- Metadata (id, title, version, tags)
- Sezioni statiche con HTML inline
- Nessuna interattività reale

**Duplicazione critica**: la funzione `buildUI()` (60+ righe) è identica in tutti e 5 i file scheletro (AML, CMML, MDS, MM, FIL). Qualsiasi bugfix va replicato 5 volte.

### 4.7 FIL Fitness Helper

Struttura registry-based con tabella criteri e regole semplificata. Il `buildUI()` è il boilerplate generico — non ha calcolatore interattivo reale nonostante la sezione "Calcolatore" sia presente.

### 4.8 hemato-registry.js

Registry minimale (22 righe) ma ben progettato:
- Pattern `register(helper)` → emette `CustomEvent('hemato:helper:registered')`
- Indice `byId` per accesso diretto
- Lista `list` per iterazione

**Manca**: metodi `unregister()`, `getAll()`, capacità di query per tag/categoria.

### 4.9 hemato-helpers.css

Solo 30 righe. Definisce token di base (`--he-bg`, `--he-fg`, `--he-line`...) e classi essenziali.

**Mancano** (usate nel codice ma non definite):
- `.chip`, `.chip.pos`, `.chip.neg`, `.chip.dim`, `.chip.br`
- `.state-grid`
- `.field`
- `.actions`
- `.sep`
- `.content` (dentro `.card`)
- `.result-row .meta`
- `.result-row .name`
- Media queries responsive
- Animazioni di ingresso/uscita dialog

---

## 5. Gap Analysis — Clinica

### 5.1 Patologie Mancanti (Interattive)

| Patologia | Score Prognostico | Regimi Chiave | Priorità |
|---|---|---|---|
| **AML** | ELN 2022 (favorable/intermediate/adverse) | 7+3±midostaurin, VEN+HMA, allo-SCT, FLT3i, IDH1/2i | 🔴 Alta |
| **MDS** | IPSS-R, IPSS-M (molecular) | Azacitidina, lenalidomide (del5q), luspatercept, allo-SCT | 🔴 Alta |
| **MM** | ISS, R-ISS, R2-ISS | VRd, D-VRd, D-Rd, KRd, elo/isa-PomDex, CAR-T (ide/cilta-cel), bispecifici | 🔴 Alta |
| **CMML** | CPSS, CPSS-Mol | Azacitidina, idrossiurea, HSCT | 🟡 Media |
| **MPN (PV/ET/MF)** | IPSET, DIPSS, MIPSS70 | Idrossiurea, ruxolitinib, fedratinib, momelotinib, allo-SCT | 🟡 Media |
| **T-LPD** | — (eterogeneo) | CHOP, BV-CHP, gemcitabina-based, allo-SCT | 🟢 Bassa |
| **CML** | Sokal/Hasford/EUTOS/ELTS | TKI (imatinib, dasatinib, nilotinib, bosutinib, ponatinib, asciminib) | 🟢 Bassa |

### 5.2 Diagnostica CD Mancante

| Area | Marker Mancanti | Diagnosi Coperte |
|---|---|---|
| **T-LPD** | CD2, CD3, CD4, CD7, CD8, CD30, ALK, TCRαβ/γδ, TdT, CD1a | T-PLL, AITL, PTCL-NOS, ALCL, T-LGL, Sézary |
| **Blasti/LAL** | CD34, CD117, CD13, CD33, CD19, CD22(cy), MPO, TdT | LAL-B, LAL-T, MPAL, AML |
| **Plasma cell** | CD38, CD138, CD56, CD19, CD45, κ/λ | MM, AL amiloidosi, MGUS |
| **MPN markers** | CD34, CD117, CD13, CD33, CD42b | MPN blast phase |

### 5.3 Funzionalità Cliniche Mancanti

| Feature | Descrizione | Priorità |
|---|---|---|
| **Bridge diagnostica→terapia** | Dal risultato CD → apertura automatica helper terapeutico | 🔴 Alta |
| **Panel molecolare unificato** | DB condiviso mutazioni (TP53, FLT3, IDH1/2, NPM1, BRAF…) | 🔴 Alta |
| **Export clinico** | Generazione report strutturato (PDF/testo) | 🟡 Media |
| **Preset diagnostici** | Profili precompilati (es. "tipico CLL", "tipico HCL") per validazione | 🟡 Media |
| **MRD tracking** | Integrazione con dati di malattia minima residua | 🟢 Bassa |

---

## 6. Gap Analysis — Tecnica

### 6.1 Architettura

| Problema | Impatto | Soluzione |
|---|---|---|
| **Dual pattern** (registry vs standalone) | Incoerenza, impossibile iterare tutti i moduli | Unificare su registry + IIFE |
| **Global scope pollution** | `txState`, `dlState`, `flState`, `$tx`, `$dx`… | Incapsulare in IIFE, esporre solo API |
| **buildUI duplicato** (5×) | Manutenibilità zero | Factory condivisa `hemato-ui-factory.js` |
| **Nessun namespace** | Collisione tra `$tx`/`$dx`/`$fl`/`$mc` | Prefissi univoci o closure locale |
| **CSS incompleto** | Classi usate ma non definite | Completare `hemato-helpers.css` |
| **Nessun error handling** | `compute()` non gestisce eccezioni | Try/catch + toast/fallback |

### 6.2 Conformità Guidelines

| Guideline | Stato Attuale | Target |
|---|---|---|
| **IIFE pattern** | Solo scheletri | Tutti i moduli |
| **Layer system** (node-kinds, nesting) | Non implementato | Adottare per navigazione moduli |
| **Content registry** | Non usato | Registrare ogni helper come content provider |
| **Z-index management** | Nessuno (dialog nativi) | Automatico via layer manager |
| **Design tokens** | Token custom (`--he-*`) divergenti | Allineare a `--gray-*`, `--space-*`, `--font-size-*` |
| **Animazioni** | Nessuna | `modalScaleIn`, `layerFadeIn` da guidelines |
| **Toast notifications** | Assenti | Implementare da `libUtils.showToast()` |
| **Tipografia** | Inline styles | Classi + token |
| **ARIA** | Parziale (solo `aria-label` su dialog) | `role`, `aria-modal`, `aria-labelledby` completi |

### 6.3 Mancanze Funzionali

| Feature | Stato | Necessario per |
|---|---|---|
| **API programmatica** | Assente | Software terzi |
| **Serializzazione stato** | Solo `getState()` su alcuni | Persistenza, replay, interop |
| **Validazione input** | Minima | Robustezza clinica |
| **Internazionalizzazione** | Italiano hardcoded | Espandibilità |
| **Keyboard navigation** | Assente | Accessibilità |
| **Print/PDF** | Assente | Workflow clinico |

---

## 7. Architettura Target: Dual-Mode (API + UI)

### 7.1 Principio Fondamentale

Ogni modulo deve avere **separazione netta** tra:

```
┌───────────────────────────────────────────────────────────┐
│                    CORE (dati + logica)                     │
│  • Definizione marker/regimi/score                         │
│  • Scoring engine / recommendation engine                  │
│  • Stato (selections, genetics, history...)                │
│  • Validazione                                             │
│  → Nessuna dipendenza DOM                                  │
│  → Esposizione: window.HematoAPI.*                         │
├───────────────────────────────────────────────────────────┤
│                    UI (presentazione)                       │
│  • Dialog builder (conforme guidelines)                    │
│  • Rendering tabelle/risultati                             │
│  • Event handling                                          │
│  • Integrazione layer system                               │
│  → Dipende da CORE + DOM + CSS                             │
│  → Registrazione: contentRegistry + HematoHelpersRegistry  │
└───────────────────────────────────────────────────────────┘
```

### 7.2 Schema dei Layer

```
window.HematoAPI                    ← API per software terzi (nessun DOM)
  ├── .diagnostics
  │     ├── .bLPD                   ← CD B-LPD scoring engine
  │     ├── .tLPD                   ← CD T-LPD scoring engine (futuro)
  │     └── .blasts                 ← Pannello blasti (futuro)
  │
  ├── .therapy
  │     ├── .cll                    ← CLL recommendation engine
  │     ├── .dlbcl                  ← DLBCL recommendation engine
  │     ├── .fl                     ← FL recommendation engine
  │     ├── .mcl                    ← MCL recommendation engine
  │     ├── .aml                    ← AML recommendation engine
  │     ├── .mds                    ← MDS recommendation engine
  │     ├── .mm                     ← MM recommendation engine
  │     └── .cmml                   ← CMML recommendation engine
  │
  ├── .scores
  │     ├── .cllIPI(params)         ← Calcolo CLL-IPI
  │     ├── .flipi(params)          ← Calcolo FLIPI
  │     ├── .mipi(params)           ← Calcolo MIPI
  │     ├── .ipi(params)            ← Calcolo IPI (DLBCL)
  │     ├── .ipssR(params)          ← Calcolo IPSS-R (MDS)
  │     ├── .rISS(params)           ← Calcolo R-ISS (MM)
  │     └── .filFitness(params)     ← Calcolo FIL Fit/Unfit/Frail
  │
  ├── .markers
  │     ├── .allMarkers()           ← Lista tutti i marker
  │     ├── .markersByPanel(panel)  ← Marker per pannello
  │     └── .states()               ← Stati possibili
  │
  └── .version                      ← Versione del servizio

window.HematoHelpersRegistry        ← Registry UI (per il layer system)
  ├── .register(helper)
  ├── .byId[id]
  └── .list[]
```

### 7.3 Ciclo di Vita API Call (software terzo)

```javascript
// 1. Imposta marker
const result = HematoAPI.diagnostics.bLPD.compute([
  { marker: 'CD5',  state: 'pos' },
  { marker: 'CD23', state: 'pos' },
  { marker: 'CD200', state: 'br' },
  { marker: 'FMC7', state: 'neg' },
  { marker: 'CD79b', state: 'dim' }
]);

// 2. Risultato
// result = {
//   diagnoses: [
//     { name: 'CLL/SLL', score: 14, pct: 100, matches: [...], conflicts: [...] },
//     { name: 'MCL (leukemic)', score: 3, pct: 21, ... },
//     ...
//   ],
//   suggestedTherapyModules: ['cll'],
//   timestamp: '2026-03-16T...'
// }

// 3. Chiedi raccomandazione terapeutica
const rec = HematoAPI.therapy.cll.compute({
  genetics: [{ key: 'TP53_aberration', value: 'yes' }],
  mutations: [],
  scores: { cll_ipi: HematoAPI.scores.cllIPI({ age: true, b2m: true, stage: true, ighv: true, tp53: true }) },
  history: [],
  indications: ['Progressione rapida linfocitosi']
});

// rec = {
//   recommendations: [
//     { name: 'Acalabrutinib', score: 6, tags: ['1L','TP53+'], aifa: true, ... },
//     ...
//   ],
//   watchAndWait: false
// }
```

### 7.4 Ciclo di Vita UI (utente diretto)

```
Utente apre il modulo Hemato → Libreria con card per ogni helper
  ↓
Sceglie "Diagnostica CD B-LPD" → Apertura come node fullscreen/modal
  ↓
Aggiunge marker con stato → Tabella marker
  ↓
Preme "Elabora" → Risultati con barre percentuali
  ↓
Clicca su diagnosi (es. CLL/SLL) → Proposta: "Apri assistente terapeutico CLL?"
  ↓
Si apre child node (modal) → CLL Therapy Helper
  ↓
Inserisce genetica/score/storia → Raccomandazioni con regimi AIFA
  ↓
Clicca su regimen → Sheet con dettaglio (posologia, tossicità, studi)
```

---

## 8. Specifiche API Service

### 8.1 Interfaccia `HematoAPI.diagnostics.bLPD`

```typescript
interface BLPDDiagnosticAPI {
  /** Lista di tutti i marker supportati */
  markers(): string[];

  /** Lista degli stati possibili */
  states(): Array<{ key: string; label: string }>;

  /** Lista delle diagnosi nel motore */
  diagnoses(): string[];

  /** Regole per una diagnosi specifica */
  rulesFor(diagnosis: string): Record<string, Record<string, number>> | null;

  /** Calcola scoring dati un array di selezioni */
  compute(selections: Array<{
    marker: string;
    state: 'pos' | 'neg' | 'dim' | 'br' | 'nt';
    note?: string;
  }>): {
    diagnoses: Array<{
      name: string;
      score: number;
      pct: number;
      matches: string[];
      conflicts: string[];
    }>;
    suggestedTherapyModules: string[];
    timestamp: string;
  };

  /** Validazione input */
  validate(selections: Array<{ marker: string; state: string }>): {
    valid: boolean;
    errors: string[];
  };
}
```

### 8.2 Interfaccia `HematoAPI.therapy.*`

```typescript
interface TherapyAPI {
  /** Regimi disponibili */
  regimens(): Record<string, RegimenDef>;

  /** Parametri genetici accettati */
  geneticParams(): Array<{ key: string; label: string }>;

  /** Mutazioni di resistenza */
  resistanceMutations(): Array<{ key: string; label: string }>;

  /** Score prognostici supportati */
  scores(): Array<{ key: string; label: string }>;

  /** Calcola raccomandazioni */
  compute(state: {
    genetics: Array<{ key: string; value: string }>;
    mutations: Array<{ key: string; value: string }>;
    scores: Record<string, any>;
    history: Array<{ regimenKey: string; line: string; response: string }>;
    indications: string[];
  }): {
    recommendations: Array<{
      key: string;
      name: string;
      score: number;
      pct: number;
      tags: string[];
      reasons: string[];
      aifa: boolean;
    }>;
    watchAndWait: boolean;
    timestamp: string;
  };

  /** Dettaglio di un singolo regime */
  regimenDetail(key: string): RegimenDetail | null;
}
```

### 8.3 Interfaccia `HematoAPI.scores`

```typescript
interface ScoresAPI {
  cllIPI(params: { age: boolean; b2m: boolean; stage: boolean; ighv: boolean; tp53: boolean }): { score: number; risk: string };
  flipi(params: { age: boolean; ldh: boolean; hb: boolean; stage: boolean; nodal: boolean }): { score: number; risk: string };
  mipi(params: { age: number; ecog: number; ldh: number; wbc: number }): { score: number; risk: string };
  ipi(params: { age: boolean; ldh: boolean; ecog: boolean; stage: boolean; extranodal: boolean }): { score: number; risk: string };
  ipssR(params: { cytogenetics: string; blasts: number; hb: number; plt: number; anc: number }): { score: number; risk: string };
  rISS(params: { iss: number; ldh: boolean; highRiskFISH: boolean }): { stage: number; risk: string };
  filFitness(params: { ecog: number; cirs: number; adl: number }): { score: number; category: string };
}
```

### 8.4 Eventi API

```javascript
// Software terzo può ascoltare eventi
window.addEventListener('hemato:diagnostic:computed', (e) => {
  console.log(e.detail); // { type: 'bLPD', result: {...} }
});

window.addEventListener('hemato:therapy:computed', (e) => {
  console.log(e.detail); // { type: 'cll', result: {...} }
});

window.addEventListener('hemato:helper:registered', (e) => {
  console.log(e.detail); // { id: 'cll-therapy', title: '...' }
});
```

---

## 9. Specifiche UI System

### 9.1 Conformità al Layer System (da LAYER_MODAL_SYSTEM.md)

Ogni helper hemato deve essere registrato come **content provider** nel `contentRegistry`:

```javascript
contentRegistry.register('hemato-cd-blpd', {
  label: 'CD-Based B-LPD Diagnostic Helper',
  render(container, context) {
    // Costruisce UI nel container
    // context = { nodeId, parentId, moduleId, kind, ... }
  },
  destroy(container) {
    // Cleanup
  }
});
```

### 9.2 Node Kinds Utilizzati

| Caso d'uso | Node Kind | Dimensioni | Note |
|---|---|---|---|
| Helper diagnostico (CD B-LPD) | `fullscreen` o `modal` | Fullscreen o `min(1200px, 96vw)` | Vista principale |
| Helper terapeutico | `modal` | `min(1200px, 96vw) × min(90vh, 900px)` | Aperto da diagnostica o standalone |
| Aggiunta marker/parametro | `sheet` o nested `modal` | `min(600px, 90vw) × auto` | Wizard/form inline |
| Dettaglio regime/farmaco | `drawer` | `min(480px, 85vw)` | Pannello laterale destro |
| Calcolatore score | `sheet` | `min(720px, 95vw) × auto` | Bottom sheet |

### 9.3 Struttura DOM Conforme

```html
<!-- Generato dal layerTemplate per il CD B-LPD -->
<section class="node-modal" id="[nodeId]" role="dialog" aria-modal="true"
         data-node-id="[nodeId]" data-module-key="hemato"
         data-node-type="child" data-kind="modal">
  <div class="node-content">
    <div class="node-header">
      <div class="node-meta">
        <p class="node-title">CD-Based B-LPD Diagnostic Helper</p>
      </div>
      <button class="icon-button" data-action="close-node" data-node-id="[nodeId]">
        <span class="layer-close-icon">✕</span>
      </button>
    </div>
    <div class="node-body">
      <!-- Contenuto iniettato dal content provider -->
      <div class="he-actions">...</div>
      <div class="he-grid">
        <section class="he-card">...</section>
        <section class="he-card">...</section>
      </div>
    </div>
  </div>
</section>
```

### 9.4 Classi CSS da Implementare (conforme a style.md / root.md)

**Tokens allineati al sistema Janus:**

```css
/* ── hemato-helpers.css — allineato a guidelines ── */
:root {
  /* Ereditati da base.css Janus (se standalone, definire qui) */
  --white: #FFFFFF;
  --gray-50: #FAFAFA;
  --gray-100: #F5F5F5;
  --gray-200: #EEEEEE;
  --gray-300: #E0E0E0;
  --gray-400: #BDBDBD;
  --gray-500: #9E9E9E;
  --gray-600: #757575;
  --gray-700: #616161;
  --gray-800: #424242;
  --gray-900: #212121;
  --black: #000000;

  --accent: #1A1A1A;
  --accent-light: #404040;
  --error: #DC2626;
  --success: #16A34A;
  --acqua-sea: #6BAAAE;

  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-2xs: 0.625rem;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;

  --border-width: 1px;
  --border-color: var(--gray-200);
  --border-radius-sm: 4px;
  --border-radius-md: 6px;
  --border-radius-lg: 8px;

  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --shadow-md: 0 1px 3px 0 rgba(0,0,0,0.1);

  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
}
```

**Classi componente:**

| Classe | Ruolo | Pattern da guidelines |
|---|---|---|
| `.he-helper-root` | Container root helper | Flex layout, font-family inherit |
| `.he-card` | Card sezione | `border: 1px solid var(--border-color); border-radius: var(--border-radius-lg); padding: var(--space-md)` |
| `.he-grid` | Griglia 2 colonne | `display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md)` |
| `.he-actions` | Barra azioni | `display: flex; gap: var(--space-sm); align-items: center` |
| `.he-chip` | Badge marker stato | Come `.badge` + colore semantico per stato |
| `.he-chip--pos` | Positivo | `background: #DCFCE7; color: #166534` |
| `.he-chip--neg` | Negativo | `background: #FEE2E2; color: #991B1B` |
| `.he-chip--dim` | Dim | `background: #FEF3C7; color: #92400E` |
| `.he-chip--br` | Bright | `background: #DBEAFE; color: #1D4ED8` |
| `.he-chip--nt` | Non testato | `background: var(--gray-100); color: var(--gray-500)` |
| `.he-result-row` | Riga risultato | Grid 3 colonne: name + bar + score |
| `.he-bar` | Barra percentuale | `height: 10px; background: var(--gray-100); border-radius: 999px` |
| `.he-tag` | Tag generico | Come `.tag` da CSS attuale |
| `.he-field` | Gruppo campo form | `margin-bottom: var(--space-md)` |
| `.he-state-grid` | Griglia pulsanti stato | `display: flex; gap: var(--space-xs)` |

### 9.5 Animazioni (da guidelines)

```css
@keyframes modalScaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes sheetSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes drawerSlideIn {
  from { opacity: 0; transform: translateX(20px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

### 9.6 Responsive (da style.md)

```css
@media (max-width: 900px) {
  .he-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  dialog { width: 100vw; height: 100vh; border-radius: 0; }
  .he-actions { flex-wrap: wrap; }
}
```

---

## 10. Roadmap Implementativa

### Fase 0 — Fondamenta (Settimana 1)

| # | Task | File | Descrizione |
|---|---|---|---|
| 0.1 | **Factory UI condivisa** | `app/utility/hemato-ui-factory.js` | `buildHelperUI(mount, helper)` — sostituisce i 5 `buildUI()` duplicati |
| 0.2 | **CSS completo** | `public/css/hemato-helpers.css` | Tokens allineati, classi `.he-*`, chip, state-grid, result-row, animazioni, responsive |
| 0.3 | **Registry potenziato** | `app/utility/hemato-registry.js` | Aggiungere `unregister()`, `getByTag()`, `getAll()`, tipizzazione helper |
| 0.4 | **Namespace API** | `app/utility/hemato-api.js` | Crea `window.HematoAPI` con struttura namespace e metodi base |

**Deliverable F0**: Infrastruttura unificata, zero duplicazione, CSS conforme.

---

### Fase 1 — Core API (Settimana 2)

| # | Task | File | Descrizione |
|---|---|---|---|
| 1.1 | **Refactor CD B-LPD → core + UI** | `app/diagnostics/cd-b-lpd-core.js` + `cd-b-lpd-ui.js` | Separare scoring engine (nessun DOM) da presentazione |
| 1.2 | **Refactor CLL → core + UI** | `app/diseases/cll/cll-therapy-core.js` + `cll-therapy-ui.js` | Separare recommendation engine da dialog |
| 1.3 | **Refactor DLBCL → core + UI** | `app/diseases/dlbcl/dlbcl-therapy-core.js` + `dlbcl-therapy-ui.js` | Idem |
| 1.4 | **Refactor FL → core + UI** | `app/diseases/fl/fl-therapy-core.js` + `fl-therapy-ui.js` | Idem |
| 1.5 | **Refactor MCL → core + UI** | `app/diseases/mcl/mcl-therapy-core.js` + `mcl-therapy-ui.js` | Idem |
| 1.6 | **Score calculator** | `app/utility/hemato-scores.js` | CLL-IPI, FLIPI, MIPI, IPI unificati in `HematoAPI.scores.*` |
| 1.7 | **Event system** | `app/utility/hemato-events.js` | `hemato:diagnostic:computed`, `hemato:therapy:computed`, ecc. |

**Deliverable F1**: API funzionante (`HematoAPI.diagnostics.bLPD.compute(...)`, `HematoAPI.therapy.cll.compute(...)`). Software terzi possono integrare.

---

### Fase 2 — Nuovi Moduli Interattivi (Settimane 3–4)

| # | Task | File | Score | Regimi |
|---|---|---|---|---|
| 2.1 | **AML completo** | `app/diseases/aml/aml-core.js` + `aml-ui.js` | ELN 2022 (citogenetica + molecolare) | 7+3, VEN+HMA, midostaurin, ivosidenib, enasidenib, gilteritinib, allo-SCT |
| 2.2 | **MDS completo** | `app/diseases/mds/mds-core.js` + `mds-ui.js` | IPSS-R (5 variabili: citogenetica, blasti, Hb, PLT, ANC) | Azacitidina, lenalidomide (del5q), luspatercept, allo-SCT |
| 2.3 | **MM completo** | `app/diseases/mm/mm-core.js` + `mm-ui.js` | ISS, R-ISS, R2-ISS | VRd, D-VRd, D-Rd, KRd, elo-Pd, isa-KPd, CAR-T, bispecifici (teclistamab, talquetamab, elranatamab) |
| 2.4 | **CMML completo** | `app/diseases/cmml/cmml-core.js` + `cmml-ui.js` | CPSS-Mol | Azacitidina, idrossiurea, HSCT |
| 2.5 | **FIL Fitness interattivo** | `app/utility/fitness/fil-fitness-core.js` + `fil-fitness-ui.js` | ECOG+CIRS+ADL→Fit/Unfit/Frail | — |

**Deliverable F2**: Tutti i moduli ematologici principali con scoring interattivo e regimi AIFA.

---

### Fase 3 — Bridge & Integrazione (Settimana 5)

| # | Task | Descrizione |
|---|---|---|
| 3.1 | **Bridge diagnostica→terapia** | Risultato CD B-LPD propone apertura helper terapeutico (CLL→CLLTherapy, ecc.) |
| 3.2 | **Panel molecolare condiviso** | DB mutazioni centralizzato usato da tutti i moduli (TP53, FLT3, IDH1/2, NPM1…) |
| 3.3 | **Content provider registration** | Ogni helper registrato come content provider per il layer system Janus |
| 3.4 | **Libreria hemato** | Card grid per selezione helper (come `.lib-card` da guidelines) |
| 3.5 | **Toast/notification** | Feedback operazioni (salvataggio, errori, risultati) |

**Deliverable F3**: Sistema integrato con navigazione tra diagnostica e terapia.

---

### Fase 4 — UI Avanzata (Settimana 6)

| # | Task | Descrizione |
|---|---|---|
| 4.1 | **Stepper wizard** | Per flussi complessi (es. add storia trattamento = 3 step) |
| 4.2 | **Export report** | Generazione testo strutturato / stampa CSS |
| 4.3 | **Preset diagnostici** | Profili precompilati per validazione (es. "tipico CLL Matutes 5/5") |
| 4.4 | **Keyboard navigation** | Tab, Enter, Escape conformi a ARIA |
| 4.5 | **Responsive completo** | Mobile-friendly per uso al letto del paziente |

**Deliverable F4**: UX professionale, accessibile, esportabile.

---

### Fase 5 — Espansione Clinica (Settimane 7–8)

| # | Task | Descrizione |
|---|---|---|
| 5.1 | **Diagnostica T-LPD** | Marker T (CD2, CD3, CD4, CD7, CD8, CD30, ALK…) + scoring per T-PLL, AITL, PTCL, ALCL, T-LGL, Sézary |
| 5.2 | **Diagnostica blasti** | Pannello per LAL-B, LAL-T, MPAL, AML (CD34, TdT, MPO, CD19, CD3…) |
| 5.3 | **Diagnostica plasma cell** | CD38, CD138, CD56, κ/λ → MM, AL amiloidosi, MGUS |
| 5.4 | **MPN (PV/ET/MF)** | IPSET, DIPSS, MIPSS70 + idrossiurea, ruxolitinib, fedratinib |
| 5.5 | **CML** | Sokal/EUTOS/ELTS + TKI (imatinib→asciminib) |
| 5.6 | **Aggiornamento regimi** | Pirtobrutinib (CLL/MCL), tazemetostat (FL), nuovi bispecifici |

**Deliverable F5**: Copertura ematologica completa.

---

### Diagramma Gantt Sintetico

```
Settimana:  1        2        3        4        5        6        7        8
            ├────────┼────────┼────────┼────────┼────────┼────────┼────────┤
Fase 0      ████████                                                        Fondamenta
Fase 1               ████████                                               Core API
Fase 2                        ████████████████                              Nuovi moduli
Fase 3                                          ████████                    Bridge
Fase 4                                                   ████████          UI avanzata
Fase 5                                                            ████████████████  Espansione
```

---

## 11. File Map Target

### 11.1 Struttura Finale

```
hemato.ver.0.0.1/
├── index.html
├── index.app.html
├── ANALYSIS_AND_ROADMAP.md
│
├── app/
│   ├── core/                                  ← NUOVO: core condiviso
│   │   ├── hemato-api.js                      # window.HematoAPI namespace
│   │   ├── hemato-events.js                   # Sistema eventi
│   │   ├── hemato-scores.js                   # Calcolatori score unificati
│   │   └── hemato-molecular-panel.js          # DB mutazioni condiviso
│   │
│   ├── diagnostics/
│   │   ├── cd-b-lpd-core.js                   # Scoring engine B-LPD (no DOM)
│   │   ├── cd-b-lpd-ui.js                     # UI B-LPD (content provider)
│   │   ├── cd-t-lpd-core.js                   # ← Fase 5: T-LPD
│   │   ├── cd-t-lpd-ui.js                     #
│   │   ├── blast-panel-core.js                # ← Fase 5: Blasti
│   │   └── blast-panel-ui.js                  #
│   │
│   ├── diseases/
│   │   ├── cll/
│   │   │   ├── cll-therapy-core.js            # Recommendation engine (no DOM)
│   │   │   └── cll-therapy-ui.js              # UI (content provider)
│   │   ├── dlbcl/
│   │   │   ├── dlbcl-therapy-core.js
│   │   │   └── dlbcl-therapy-ui.js
│   │   ├── fl/
│   │   │   ├── fl-therapy-core.js
│   │   │   └── fl-therapy-ui.js
│   │   ├── mcl/
│   │   │   ├── mcl-therapy-core.js
│   │   │   └── mcl-therapy-ui.js
│   │   ├── aml/
│   │   │   ├── aml-core.js                    # ← Fase 2: nuovo
│   │   │   └── aml-ui.js
│   │   ├── mds/
│   │   │   ├── mds-core.js                    # ← Fase 2: nuovo
│   │   │   └── mds-ui.js
│   │   ├── mm/
│   │   │   ├── mm-core.js                     # ← Fase 2: nuovo
│   │   │   └── mm-ui.js
│   │   └── cmml/
│   │       ├── cmml-core.js                   # ← Fase 2: nuovo
│   │       └── cmml-ui.js
│   │
│   └── utility/
│       ├── hemato-registry.js                 # Registry potenziato
│       ├── hemato-ui-factory.js               # Factory UI condivisa
│       └── fitness/
│           ├── fil-fitness-core.js            # Calcolo FIL (no DOM)
│           └── fil-fitness-ui.js              # UI FIL
│
├── public/
│   └── css/
│       └── hemato-helpers.css                 # CSS completo, allineato guidelines
│
└── guidelines/                                # Documentazione (invariata)
```

### 11.2 Conteggio Stimato Righe

| Area | File | Righe stimate |
|---|---|---|
| Core condiviso | 4 | ~600 |
| Diagnostica (core + UI) | 2–6 | ~800 |
| Therapy helpers (core + UI) | 16 | ~6.000 |
| Utility | 3 | ~400 |
| CSS | 1 | ~300 |
| **Totale** | **~30** | **~8.100** |

---

## 12. Dipendenze e Ordine di Caricamento

### 12.1 Ordine Critico

```html
<!-- 0. CSS -->
<link rel="stylesheet" href="public/css/hemato-helpers.css" />

<!-- 1. Icone -->
<script src="https://unpkg.com/lucide@latest" defer></script>

<!-- 2. Core (nessuna dipendenza) -->
<script src="app/core/hemato-api.js" defer></script>
<script src="app/core/hemato-events.js" defer></script>
<script src="app/core/hemato-scores.js" defer></script>
<script src="app/core/hemato-molecular-panel.js" defer></script>

<!-- 3. Registry + Factory (dipende da core) -->
<script src="app/utility/hemato-registry.js" defer></script>
<script src="app/utility/hemato-ui-factory.js" defer></script>

<!-- 4. Diagnostica core (dipende da API + scores) -->
<script src="app/diagnostics/cd-b-lpd-core.js" defer></script>

<!-- 5. Therapy cores (dipende da API + scores + molecular panel) -->
<script src="app/diseases/cll/cll-therapy-core.js" defer></script>
<script src="app/diseases/dlbcl/dlbcl-therapy-core.js" defer></script>
<script src="app/diseases/fl/fl-therapy-core.js" defer></script>
<script src="app/diseases/mcl/mcl-therapy-core.js" defer></script>
<script src="app/diseases/aml/aml-core.js" defer></script>
<script src="app/diseases/mds/mds-core.js" defer></script>
<script src="app/diseases/mm/mm-core.js" defer></script>
<script src="app/diseases/cmml/cmml-core.js" defer></script>
<script src="app/utility/fitness/fil-fitness-core.js" defer></script>

<!-- 6. UI modules (dipende da registry + factory + rispettivo core) -->
<script src="app/diagnostics/cd-b-lpd-ui.js" defer></script>
<script src="app/diseases/cll/cll-therapy-ui.js" defer></script>
<!-- ... altri UI ... -->
```

### 12.2 Grafo Dipendenze

```
hemato-api.js ─────┐
hemato-events.js ──┤
hemato-scores.js ──┼──→ *-core.js ──→ *-ui.js ──→ hemato-registry.js
hemato-molecular   │                              hemato-ui-factory.js
  -panel.js ───────┘
```

---

## 13. Standard e Riferimenti Clinici

### 13.1 Classificazione

| Standard | Versione | Uso |
|---|---|---|
| WHO Classification | 5th ed. (2022) | Classificazione neoplasie ematologiche |
| ICC Classification | 2022 | Classificazione complementare |
| ICD-11 | 2024 | Codifica diagnosi |

### 13.2 Linee Guida Terapeutiche

| LG | Fonte | Patologie |
|---|---|---|
| ESMO | esmo.org | CLL, DLBCL, FL, MCL, AML, MDS, MM |
| ELN | leukemia-net.org | AML (risk stratification), CML |
| NCCN | nccn.org | Tutte |
| EHA | ehaweb.org | Tutte |
| AIFA | aifa.gov.it | Rimborsabilità IT |
| iwCLL | — | Indicazioni al trattamento CLL |
| GELF | — | Indicazioni al trattamento FL |
| IMWG | — | MM staging e risposta |

### 13.3 Score Prognostici

| Score | Patologia | Variabili | Classi di rischio |
|---|---|---|---|
| CLL-IPI | CLL | Età, β2M, stadio, IGHV, TP53 | Basso/Intermedio/Alto/Molto alto |
| Rai / Binet | CLL | Linfocitosi, linfoadenopatia, citopenie | 0–IV / A–C |
| FLIPI | FL | Età, LDH, Hb, stadio, siti nodali | Basso/Intermedio/Alto |
| MIPI | MCL | Età, ECOG, LDH, WBC | Basso/Intermedio/Alto |
| IPI | DLBCL | Età, LDH, ECOG, stadio, siti extranodali | Basso/Basso-int/Alto-int/Alto |
| ELN 2022 | AML | Citogenetica + molecolare | Favorable/Intermediate/Adverse |
| IPSS-R | MDS | Citogenetica, blasti, Hb, PLT, ANC | Very low→Very high |
| IPSS-M | MDS | Molecolare (TP53, SF3B1, ecc.) | Very low→Very high |
| ISS / R-ISS / R2-ISS | MM | β2M, albumina, LDH, FISH | I/II/III |
| CPSS-Mol | CMML | TET2, ASXL1, RAS, RUNX1, citogenetica | Basso→Alto |

---

> **Nota**: Questo documento è un riferimento vivente. Ogni fase completata deve essere annotata qui con data e note di implementazione.
