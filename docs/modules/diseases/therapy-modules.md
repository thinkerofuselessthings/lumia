# Disease Therapy Modules

> Motori terapeutici e UI per le patologie ematologiche supportate.

| Proprietà | Valore |
|-----------|--------|
| **Directory** | `app/diseases/` |
| **Patologie complete** | CLL, DLBCL, FL, MCL (core + UI) |
| **Patologie skeleton** | AML, CMML, MDS, MM (solo helper informativo) |
| **Righe totali** | ~2 300 |

## Pattern architetturale

Ogni patologia completa segue lo schema **Core → UI → Helper**:

```
xxx-therapy-core.js ────── engine puro (zero DOM), registrato su LumiaAPI
        │
        ▼
xxx-therapy-ui.js   ────── interfaccia mount-based con sub-dialog
        │
        ▼
xxx-therapy-helper.js ──── (opzionale) registrazione su LumiaHelpersRegistry
```

Le patologie "skeleton" hanno solo un file helper con contenuto informativo statico renderizzato da `LumiaUIFactory`.

---

## Patologie complete

### CLL — Leucemia Linfatica Cronica

| File | Righe | Export |
|------|-------|--------|
| `cll/cll-therapy-core.js` | ~239 | `window.CLLTherapyCore` |
| `cll/cll-therapy-ui.js` | ~572 | `window.CLLTherapyHelper` |
| `cll/cll-therapy-helper.js` | — | (registrazione inclusa in ui.js) |

**Core engine** (`CLLTherapyCore`):

| Metodo | Descrizione |
|--------|-------------|
| `compute(state)` | Raccomandazioni terapeutiche dato lo stato clinico |
| `computeCLLIPI(params)` | Calcolo CLL-IPI |
| `genetics()` | 12 anomalie genetiche (TP53, IGHV, del11q, NOTCH1…) |
| `mutations()` | 7 resistenze molecolari (BTK C481, PLCG2, BCL2…) |
| `regimens()` | 8 regimi (acalabrutinib, zanubrutinib, ibrutinib, VO, VR, FCR…) |
| `iwcllFlags()` | 7 indicazioni iwCLL al trattamento |

**Algoritmo `compute()`**: classifica 1L vs R/R, applica penalità resistenze, gating AIFA, score finale per regime.

**UI** (`CLLTherapyHelper`):
- State: `{genetics[], mutations[], scores{}, history[], indications Set}`
- 5 sub-dialog: genetica, mutazioni, score, storia trattamenti, indicazioni iwCLL
- Output: lista raccomandazioni ranked con barre percentuali

---

### DLBCL — Linfoma Diffuso a Grandi Cellule B

| File | Righe | Export |
|------|-------|--------|
| `dlbcl/dlbcl-therapy-core.js` | ~250 | `window.DLBCLTherapyCore` |
| `dlbcl/dlbcl-therapy-ui.js` | ~86 | `window.DLBCLTherapyHelper` |

**Core engine** (`DLBCLTherapyCore`):

| Dato | Contenuto |
|------|-----------|
| `GENETICS` | 13 anomalie: HGBL double/triple hit, MYC, BCL2/6, TP53, PMBCL, Transformed FL… |
| `CONTEXT_FLAGS` | 6: early/late relapse, transplant eligible/ineligible, cardiac, CNS |
| `REGIMENS` | R-CHOP, Pola-R-CHP, DA-R-EPOCH, Salvage+ASCT, CAR-T axi-cel… |

**Score**: IPI e CNS-IPI calcolati internamente.

---

### FL — Linfoma Follicolare

| File | Righe | Export |
|------|-------|--------|
| `fl/fl-therapy-core.js` | ~216 | `window.FLTherapyCore` |
| `fl/fl-therapy-ui.js` | ~137 | `window.FLTherapyHelper` |

**Core engine** (`FLTherapyCore`):

| Dato | Contenuto |
|------|-----------|
| `GENETICS` | 8: t(14;18), EZH2, TP53, CREBBP… |
| `MOLECULAR_RESIST` | 5: POD24, refrattario anti-CD20/lenalidomide/alchilanti, trasformazione |
| `SCORE_DEFS` | FLIPI, FLIPI-2, PRIMA-PI |
| `INDICAZIONI_GELF` | 8 criteri GELF |
| `REGIMEN_LIST` | 12: Watch&Wait, BR, R-CHOP, G-benda, R², Mosunetuzumab, CAR-T… |
| `GATE` | Gating AIFA (Mosunetuzumab ≥2L, Axi-cel ≥3L…) |

---

### MCL — Linfoma Mantellare

| File | Righe | Export |
|------|-------|--------|
| `mcl/mcl-therapy-core.js` | ~336 | `window.MCLTherapyCore` |
| `mcl/mcl-therapy-ui.js` | ~190 | `window.MCLTherapyHelper` |

**Core engine** (`MCLTherapyCore`):

| Dato | Contenuto |
|------|-----------|
| `GENETICS` | 8: t(11;14), SOX11-neg, TP53, CCND1… |
| `MOLECULAR` | 7: Ki-67≥30%, blastoide/pleomorfo, BTK C481, CNS… |
| `SCORE_DEFS` | S-MIPI, MIPI-b |
| `REGIMENS` | 16: R-CHOP/R-DHAP+ASCT, Nordic, BR, BTKi, Pirtobrutinib, CAR-T Tecartus, allo-SCT… |
| `CONTEXT_FLAGS` | 7 flag contesto clinico |
| `GATE` | Gating AIFA (ibrutinib, pirtobrutinib post-BTKi, brexucabtagene ≥3L) |

---

## Patologie skeleton

Queste patologie hanno solo un helper informativo statico auto-registrato via `LumiaUIFactory.autoMount()`.

### AML — Leucemia Mieloide Acuta (`aml/aml-helper.js`, ~62 righe)

3 sezioni: diagnosi (blasti ≥20%), classificazione rischio ELN, esempi induzione (7+3, Ven+HMA, IDH1/2).

### CMML — Leucemia Mielomonocitica Cronica (`cmml/cmml-helper.js`, ~57 righe)

3 sezioni: diagnosi, classificazione CMML-0/1/2, terapia (azacitidina, HSCT).

### MDS — Sindromi Mielodisplastiche (`mds/mds-helper.js`, ~58 righe)

3 sezioni: diagnosi, rischio IPSS-R/IPSS-M, terapia per rischio (EPO/Luspatercept, azacitidina, HSCT).

### MM — Mieloma Multiplo (`mm/mm-therapy-helper.js`, ~95 righe)

5 sezioni: diagnosi IMWG, staging R-ISS, 1ª linea (VRd/Dara-VRd vs Dara-Rd), R/R (anti-CD38, IMiDs, CAR-T), gestione tossicità.

---

## API server integration

Tutti i core engine (CLL, DLBCL, FL, MCL) vengono anche caricati lato server tramite `engine-loader.js` in una VM sandbox. Gli endpoint sono:

| Endpoint | Engine |
|----------|--------|
| `POST /api/therapy/cll` | `CLLTherapyCore.compute()` |
| `POST /api/therapy/dlbcl` | `DLBCLTherapyCore.compute()` |
| `POST /api/therapy/fl` | `FLTherapyCore.compute()` |
| `POST /api/therapy/mcl` | `MCLTherapyCore.compute()` |

Le patologie skeleton (AML, CMML, MDS, MM) sono registrate come stub lato server.

## Interfaccia UI comune

Ogni UI terapeutica espone la stessa interfaccia:

```js
{
  init()              // inizializzazione one-time
  open()              // apre il pannello
  close()             // chiude
  mount(el)           // monta nell'elemento
  getState() / getData()  // ritorna stato corrente
  setState(s) / setData(d)  // ripristina stato
}
```

Il pattern mount-based permette al LayerSystem di gestire il ciclo di vita senza accoppiamento diretto.
