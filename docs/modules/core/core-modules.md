# Core Modules

> Moduli infrastrutturali condivisi: layer system, event bus, API registry, scores, export, UI factory.

| Proprietà | Valore |
|-----------|--------|
| **Directory** | `app/core/` |
| **File** | 14 moduli |
| **Righe totali** | ~2 500 |
| **Pattern** | Ogni modulo espone un singleton globale su `window` |

---

## layer-system.js (~400+ righe)

> Motore di windowing con gerarchia parent→child, z-index management, content provider registry.

### Export: `window.LayerSystem`

| Metodo | Firma | Descrizione |
|--------|-------|-------------|
| `registerContent(key, provider)` | `string, {render,destroy}` | Registra un content provider |
| `createManager(rootEl)` | `Element → Manager` | Crea un'istanza layer manager |

### Manager API

| Metodo | Descrizione |
|--------|-------------|
| `openNode(parentId, config)` | Apre un nodo (null parent = root) |
| `closeNode(nodeId)` | Chiude nodo e tutti i figli |
| `applyFocus(nodeId)` | Porta il focus su un nodo |
| `getSnapshot()` | Albero completo dei nodi |
| `getAllNodes()` | Lista piatta di tutti i nodi |
| `getOpenRoots()` | Nodi root aperti |
| `hasOpenNodes()` | Boolean |
| `getNodeById(id)` | Nodo per ID |
| `on(event, cb)` | Sottoscrive eventi |

### Tipi nodo (kind)

| Kind | Nesting | Descrizione |
|------|---------|-------------|
| `fullscreen` | Solo root | Occupa tutto lo spazio disponibile |
| `modal` | Child di qualsiasi | Overlay centrato con backdrop |
| `panel` | Child di fullscreen | Pannello laterale |
| `sheet` | Child di qualsiasi | Bottom sheet |

### Z-index formula

```
z-index = 300 + (100 × rootIndex) + (10 × depth) + (80 se focused)
```

### Eventi

`node:opened`, `node:closed`, `focus:changed`, `action:blocked`, `state:changed`

### Limiti

- Max 5 nodi root aperti
- Nesting rules: fullscreen solo root, panel solo sotto fullscreen

---

## lumia-events.js (~73 righe)

> Event bus interno con sottoscrizione, emissione, buffer circolare.

### Export: `window.LumiaEvents`

| Metodo | Firma | Descrizione |
|--------|-------|-------------|
| `on(name, cb)` | `→ unsub()` | Sottoscrive un evento, ritorna funzione per annullare |
| `emit(name, data)` | `→ void` | Emette evento + CustomEvent su window |
| `off(name?)` | `→ void` | Rimuove tutti i listener (o per nome) |
| `recent(n?)` | `→ Event[]` | Ultimi N eventi (default 10, max 100) |

---

## lumia-api.js (~112 righe)

> Registry centrale per engine diagnostici, terapeutici, score e pannelli marcatori.

### Export: `window.LumiaAPI`

```js
{
  version: '0.0.1',
  diagnostics: {},     // CDBLPDCore registrato qui
  therapy: {},         // CLL/DLBCL/FL/MCL registrati qui
  scores: {},          // 11 calcolatori registrati qui
  markers: {
    _panels: {},
    registerPanel(key, panel),
    byPanel(key),
    all(),
    panels()
  },
  states(),
  registerDiagnostic(key, engine),
  registerTherapy(key, engine),
  registerScore(key, calc)
}
```

---

## lumia-scores.js (~198 righe)

> 11 calcolatori di score prognostici ematologici.

### Export: `window.LumiaScores`

| Score | Dominio | Output |
|-------|---------|--------|
| `cllIPI` | CLL | `{score, risk, detail}` |
| `flipi` | FL | `{score, risk, detail}` |
| `flipi2` | FL | `{score, risk, detail}` |
| `primaPI` | FL | `{score, risk, detail}` |
| `ipi` | DLBCL | `{score, risk, detail}` |
| `cnsIPI` | DLBCL/CNS | `{score, risk, detail}` |
| `sMIPI` | MCL | `{score, risk, detail}` |
| `mipiBiologic` | MCL | `{score, risk, detail}` |
| `ipssR` | MDS | `{score, risk, detail}` |
| `rISS` | MM | `{score, risk, detail}` |
| `filFitness` | Generale | `{score, risk, detail}` |

Tutti registrati anche su `LumiaAPI.scores`.

---

## lumia-toast.js (~70 righe)

> Sistema notifiche toast.

### Export: `window.LumiaToast`

| Metodo | Tipo | Durata default |
|--------|------|----------------|
| `show(msg, type, dur)` | generico | 3000ms |
| `info(msg)` | informativo | 3000ms |
| `success(msg)` | successo | 3000ms |
| `warning(msg)` | attenzione | 5000ms |
| `error(msg)` | errore | 5000ms |

Container: `#lumiaToastContainer` (creato automaticamente se assente).

---

## lumia-stepper.js (~221 righe)

> Componente wizard multi-step riutilizzabile.

### Export: `window.LumiaStepper`

```js
const wizard = LumiaStepper.create({
  container: el,
  steps: [
    { id: 'step1', label: 'Passo 1', render(el) {…}, validate() {…} },
    { id: 'step2', label: 'Passo 2', render(el) {…} }
  ],
  onComplete(data) { … }
});

wizard.next();     // avanza
wizard.prev();     // indietro
wizard.goTo(idx);  // va al passo specifico
wizard.current();  // passo corrente
wizard.data;       // dati raccolti
wizard.destroy();  // cleanup
```

Barra progresso visiva, navigazione da tastiera, validazione per step.

---

## lumia-export.js (~211 righe)

> Sistema export report — testo, clipboard, stampa.

### Export: `window.LumiaExport`

| Metodo | Descrizione |
|--------|-------------|
| `text(payload)` | Formatta payload in testo strutturato |
| `clipboard(payload)` | Copia nel clipboard |
| `print()` | Apre finestra stampa |
| `fromDiagnostic(result, selections)` | Report da risultato diagnostico CD |
| `fromTherapy(state, recommendations, title)` | Report da raccomandazioni terapeutiche |

---

## lumia-a11y.js (~193 righe)

> Accessibilità: focus trap, ARIA, navigazione da tastiera.

### Export: `window.LumiaA11y`

| Metodo | Descrizione |
|--------|-------------|
| `trapFocus(container)` | Blocca il focus all'interno del container (modale) |
| `autoFocusDialog(el)` | Focus automatico sul primo elemento interattivo |
| `announce(msg, priority?)` | Annuncio per screen reader (aria-live) |
| `FOCUSABLE` | Selettore CSS per elementi focusabili |

---

## lumia-content-bridge.js (~228 righe)

> Bridge tra registry helper e content provider + mapping diagnosi → terapia.

### Export: `window.LumiaContentBridge`

| Metodo | Descrizione |
|--------|-------------|
| `register(key, provider)` | Registra un content provider |
| `getProvider(key)` | Recupera un provider |
| `hasProvider(key)` | Controlla esistenza |
| `listKeys()` | Elenco chiavi |
| `renderInto(key, container)` | Renderizza provider in un container |
| `destroyIn(key, container)` | Distrugge provider in un container |
| `therapyForDiagnosis(dx)` | Mappa diagnosi → ID helper terapeutico |
| `openTherapyForDiagnosis(dx)` | Apre direttamente l'helper terapeutico per una diagnosi |

### Mapping DX → TX

```js
DX_TO_TX = {
  'CLL/SLL': 'cll-therapy-helper',
  'DLBCL':   'dlbcl-therapy-helper',
  'FL':      'fl-therapy-helper',
  'MCL':     'mcl-therapy-helper',
  // …
}
```

---

## lumia-library.js (~185 righe)

> UI overlay Library — sidebar categorie + pannello helper searchable.

### Export: `window.LumiaLibrary`

| Proprietà | Tipo | Descrizione |
|-----------|------|-------------|
| `HELPERS` | `Array` | 10 helper disponibili |
| `GROUPS` | `Array` | 2 categorie: `'helper'`, `'percorso'` |
| `ICON_MAP` | `Object` | Mappa helper → icona |
| `renderShell(el)` | `Function` | Renderizza la shell library |
| `launchById(id)` | `Function` | Lancia un helper per ID |
| `selectCategory(cat)` | `Function` | Seleziona categoria nel filtro |

---

## lumia-ui-factory.js (~167 righe)

> Factory per gli helper skeleton — elimina duplicazione `buildUI()`.

### Export: `window.LumiaUIFactory`

| Metodo | Descrizione |
|--------|-------------|
| `render(mount, helper)` | Renderizza sezioni helper nel mount point |
| `autoMount(helper)` | Registra e monta automaticamente un helper |

Usato da AML, CMML, MDS, MM (helper statici).

---

## lumia-molecular-panel.js (~161 righe)

> Database mutazioni molecolari centralizzato — zero DOM.

### Export: `window.LumiaMolecularPanel`

| Metodo | Descrizione |
|--------|-------------|
| `MUTATIONS` | Array frozen ~40 geni |
| `byDisease(disease)` | Mutazioni rilevanti per malattia |
| `findGene(name)` | Cerca gene per nome/alias |
| `byClass(cls)` | Filtra per classe (oncogene, TSG, signaling…) |
| `allGenes()` | Lista tutti i geni |
| `relatedDiseases(gene)` | Malattie associate a un gene |

---

## lumia-presets.js (~151 righe)

> Presets automatici per la diagnostica CD — generati dalle regole CDBLPDCore.

### Export: `window.LumiaPresets`

| Metodo | Descrizione |
|--------|-------------|
| `all()` | Tutti i preset disponibili |
| `byId(id)` | Preset per ID |
| `apply(id)` | Applica preset alla diagnostica CD |
| `categories()` | Lista categorie preset |
| `byCategory(cat)` | Preset filtrati per categoria |

---

## lumia-form-layer.js (~160 righe)

> Form modale generico per LayerSystem + builder utility.

### Export: `window.LumiaFormLayer`

| Metodo | Descrizione |
|--------|-------------|
| `buildForm(fields, data)` | Genera HTML form da definizioni campo |
| `collectForm(fields, container)` | Raccoglie dati dal form nel container |
| `openFormLayer(parentId, title, html, onSave, opts)` | Apre un form modale come child node |

Usato da shell-admin per i form utente (crea, modifica, reset password).

---

## lumia-registry.js (~100 righe, in `app/utility/`)

> Registry centrale per gli helper UI.

### Export: `window.LumiaHelpersRegistry`

| Metodo | Descrizione |
|--------|-------------|
| `register(helper)` | Registra un helper `{id, name, tag, group, mount, unmount}` |
| `unregister(id)` | Rimuove un helper |
| `get(id)` | Recupera helper per ID |
| `getByTag(tag)` | Filtra per tag |
| `getAll()` | Tutti gli helper registrati |
| `has(id)` | Controlla esistenza |
| `list` | Getter array |
| `byId` | Getter mappa |

Versione 2 con supporto hot-reload.

---

## Grafo dipendenze core

```
LumiaEvents (bus) ←──── usato da quasi tutti i moduli
     │
     ▼
LumiaAPI (registry) ←── registra engine da diagnostics/diseases
     │
     ├── LumiaScores (11 calcolatori)
     ├── LumiaMolecularPanel (database geni)
     └── LumiaPresets (preset diagnostici)
     
LumiaHelpersRegistry ←── registra helper da diseases/utility
     │
     ├── LumiaLibrary (UI library)
     ├── LumiaContentBridge (mapping DX→TX)
     └── LumiaUIFactory (renderer skeleton)

LayerSystem ←── usato da shell + LumiaFormLayer
     │
     └── LumiaFormLayer (form modali)

LumiaA11y, LumiaToast, LumiaStepper, LumiaExport ←── utility standalone
```
