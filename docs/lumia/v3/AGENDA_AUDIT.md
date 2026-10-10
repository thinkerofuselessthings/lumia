# Audit modulo Agenda — Integrazione V2

> Analisi effettuata il 16 aprile 2026 sul modulo Agenda dopo la migrazione al layout V2
> (tab strip orizzontale + launcher). Lista numerata dei bug/problemi con severità, file,
> descrizione, conseguenza visibile e fix consigliato.

---

## Contesto

Il modulo Agenda è stato migrato a V2. Il provider `agenda-module-v2` registra il modulo
via `LayerSystem.registerContent`. `AGENDA_V2_CONFIG` contiene 4 sezioni
(`agenda`, `liste`, `elenco`, `panoramica`) e usa `setupLayerV2`. Il template HTML viene
iniettato una sola volta in `.content` da `ensureTemplate()` (guard `_templateInjected`) e
ogni sezione mostra/nasconde layer interni (`#layerAgenda`, `#layerListe`, `#layerElenco`,
`#layerPanoramica`) tramite `activateLayer()`.

---

## Bug CRITICI

### BUG 1 — Doppia registrazione provider
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L326-340 (V1) e L369-390 (V2)
- **Problema:** coesistono due provider: `agenda-module` (V1, usa `buildLayerLayout` +
  `setupLayerTabs`) e `agenda-module-v2` (V2, usa `buildLayerLayoutV2` + `setupLayerV2`).
  Se per errore il codice fa riferimento a `'agenda-module'` si carica il provider V1.
- **Conseguenza:** comportamento impredicibile; a volte tab-rail V1, a volte tab-strip V2.
- **Fix:** eliminare completamente il provider V1 e il codice V1-specifico
  (`setupLayerTabs`, `buildLayerLayout` Agenda, `injectTemplate` V1).

### BUG 2 — `activateLayer()` incompatibile con V2
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L22-26
- **Problema:** `activateLayer(id)` mostra/nasconde `#layerAgenda`, `#layerListe`, `#layerElenco`,
  `#layerPanoramica` con classe `active`. Nel V2 il template condiviso è iniettato in
  `.content` e contiene tutti e 4 i layer. I `.section-panel` del tab strip sono invece
  vuoti. Il contenuto reale sta nel template sottostante, non nei panel del tab strip.
- **Conseguenza:** clic sui tab non cambia sezione perché il contenuto reale non è nei
  panel. Era il root cause del "tab switching not working".
- **Fix:** l'architettura funziona per coincidenza. Normalizzare: o portare ogni sezione
  in un proprio `.section-panel` (riscrittura), oppure richiamare `render()` su ogni
  activate (già applicato come workaround).

### BUG 3 — `showAgenda/showListe/...` V1-centric
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L27-39, L69-87
- **Problema:** le funzioni chiamano `activateLayer`, `showModuleLoader`, manipolano stato
  globale. Funzionano in V2 solo perché il template è iniettato globalmente.
- **Conseguenza:** loader globale condiviso tra sezioni, stato trascinato.
- **Fix:** separare la logica di attivazione layer dal controllo loader; loader gestito
  a livello provider.

---

## Bug ALTI

### BUG 4 — `ensureTemplate()` fragile
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L278-292
- **Problema:** la logica di target dipende da `_container` valorizzato al momento del
  primo render. Se `insertBefore` fallisce, `_templateInjected = true` resta settato e
  il template non è nel DOM.
- **Conseguenza:** template mancante, riferimenti a ID che ritornano `null`.
- **Fix:** iniettare il template in `injectTemplate()` del provider V2 prima di
  `setupLayerV2`. Rimuovere la chiamata a `ensureTemplate()` dai `render` delle sezioni.

### BUG 5 — `showModuleLoader` globale, non scoped
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L11-17
- **Problema:** `#agModuleLoader` è un elemento globale del template. Sezioni diverse lo
  mostrano/nascondono creando race condition.
- **Conseguenza:** loader visibile in momenti inattesi, oppure scomparsa prematura.
- **Fix:** loader gestito a livello provider durante `boot()` (una volta), oppure
  loader per-sezione all'interno di ogni panel.

### BUG 6 — `boot()` non re-entrante
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L369-390
- **Problema:** `boot()` è chiamato una sola volta nel render del provider V2. Se fallisce
  (es. rete assente), le sezioni secondarie non hanno mai dati.
- **Conseguenza:** Liste/Elenco/Panoramica mostrano "Nessuna struttura configurata" anche
  dopo riconnessione.
- **Fix:** rendere `boot()` idempotente con guard `S.treeNodes.length === 0`, permetterne
  il retry.

### BUG 7 — Template con ID duplicati a rischio
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L368-390
- **Problema:** il template contiene ID hardcoded (`layerAgenda`, etc.). Se il destroy
  fallisce o il guard `_templateInjected` non viene resettato correttamente, il template
  può essere iniettato due volte → ID duplicati nel DOM.
- **Conseguenza:** `getElementById` ritorna il primo match, comportamento casuale.
- **Fix:** check idempotente: `if (document.getElementById('layerAgenda')) return;`
  prima di iniettare.

---

## Bug MEDI

### BUG 8 — `destroyTemplate()` resetta solo metà dello stato
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L312-326
- **Non resetta:** `S.closedDays`, `S.calCounts`, `S.dayOverrides`, `S.calStationClosures`,
  `S.dragApptId`, `S.rangeSel`, `S.rangeRoom`, `S.rangeS`, `S.rangeE`, `S.wizStep`,
  `_eCalY`, `_eCalM`, `_panDate`, D3 state (`S.treeSvg`, `S.treeG`, `S.treeZoom`).
- **Conseguenza:** dopo chiusura/riapertura, calendario mantiene posizione precedente,
  drag in stato intermedio, wizard a step precedente.
- **Fix:** reset completo di tutto lo state mutabile in `destroyTemplate()`.

### BUG 9 — D3 caricato condizionalmente
- **File:** [app/agenda/ui/agenda-gestione.js](../../../app/agenda/ui/agenda-gestione.js) L26-42
- **Problema:** `renderD3Tree()` usa `d3.select/hierarchy/tree` senza guard. Se D3 non è
  caricato (CDN non raggiungibile, ordine di caricamento), crash.
- **Conseguenza:** `ReferenceError: d3 is not defined`. Sezione Gestione inutilizzabile.
- **Fix:** guard `if (typeof d3 === 'undefined')` con fallback UI, oppure caricamento
  esplicito via `<script>` in index.html.

### BUG 10 — Flash del loader in `showAgenda()`
- **File:** [app/agenda/ui/agenda-main.js](../../../app/agenda/ui/agenda-main.js) L30-38
- **Problema:** `showModuleLoader()` chiamato prima del check su `S.selFlussoId`.
- **Conseguenza:** loader visibile per 1 frame quando non servirebbe.
- **Fix:** spostare il check prima del loader.

---

## Bug BASSI

### BUG 11 — ID hardcoded nel template
- **File:** [app/agenda/ui/agenda-template.js](../../../app/agenda/ui/agenda-template.js) L17-18, L77
- **Problema:** `layerAgenda`, `layerListe`, `layerElenco`, `layerPanoramica` sono ID
  globali. Se il template viene iniettato due volte → ID duplicati (vedi Bug 7).
- **Fix:** namespace con prefisso modulo o usare `data-*` invece di ID globali.

### BUG 12 — Listeners orfani in `setupLayerTabs` (V1)
- **File:** [app/shell/shell-state.js](../../../app/shell/shell-state.js) (V1)
- **Problema:** V1 registra listener sul rail senza cleanup nel destroy.
- **Conseguenza:** memory leak minore se si alterna V1/V2.
- **Fix:** risolto naturalmente eliminando V1 (Bug 1).

---

## Riepilogo

| Severità    | Count |
|-------------|-------|
| CRITICO     | 3     |
| ALTO        | 4     |
| MEDIO       | 3     |
| BASSO       | 2     |
| **TOTALE**  | **12**|

### Fix prioritari
1. Bug 1 — Eliminare provider V1 duplicato
2. Bug 2 — Normalizzare `activateLayer` / architettura template
3. Bug 3 — Rimuovere V1-isms da `show*()`
4. Bug 4 — Spostare `ensureTemplate()` nel provider
5. Bug 5 — Loader gestito dal provider

---

## Piano di fix consigliato

### Fase A — strutturale
- Eliminare provider V1 (`agenda-module`) e tutto il codice V1-specifico
  (`setupLayerTabs`, `buildLayerLayout` Agenda, `injectTemplate` V1).
- Spostare l'iniezione template in `injectTemplate` V2, **una volta sola** prima di
  `setupLayerV2`. Rimuovere `ensureTemplate()` dai `render` delle sezioni.
- Normalizzare `showAgenda/showListe/...`: solo `activateLayer()` + init sezione, senza
  `showModuleLoader`.

### Fase B — state & loader
- Loader gestito a livello provider (una volta in `boot()`, non per sezione).
- `destroyTemplate` resetta lo stato completo (lista esaustiva del Bug 8).
- `boot()` idempotente con guard basato sui dati (`S.treeNodes.length`).

### Fase C — polish
- D3 check con errore user-friendly.
- Rimuovere flash loader.
- Namespace ID template.
