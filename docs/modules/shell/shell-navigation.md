# shell-navigation.js

> Navigazione Library ↔ Layer, gestione moduli aperti, albero nodi, logout.

| Proprietà | Valore |
|-----------|--------|
| **File** | `app/shell/shell-navigation.js` |
| **Righe** | ~251 |
| **Dipendenze** | `shell-state.js`, `LayerSystem`, `LumiaHelpersRegistry`, `LumiaToast` |
| **Load order** | 2/6 nella catena shell |

## Scopo

Gestisce la **navigazione tra la Library e i Layer aperti**. Fornisce le funzioni per aprire/chiudere moduli, aggiornare lo stato delle card, e renderizzare l'elenco/tree dei nodi aperti nella sidebar.

## API esportata (globali)

| Funzione | Firma | Descrizione |
|----------|-------|-------------|
| `showLibrary()` | `→ void` | Mostra l'overlay Library, nasconde i layer |
| `openModule(mod)` | `string → void` | Apre un modulo (fullscreen layer) per chiave MODULE_INFO |
| `focusModule(mod, nodeId?)` | `string, string? → void` | Porta il focus su un modulo già aperto |
| `revealTree(nodeId)` | `string → void` | Espande il sotto-albero di un nodo nella sidebar |
| `updateCardStates()` | `→ void` | Aggiorna le card library (badge "aperto" / stato attivo) |
| `renderLibraryList()` | `→ void` | Renderizza la lista moduli aperti nella sidebar |
| `renderLibraryTree()` | `→ void` | Renderizza l'albero nodi gerarchico nella sidebar |
| `openRegistryHelper(id)` | `string → void` | Apre un helper dal registry come child del modulo tools |
| `doLogout()` | `→ void` | Effettua logout: `POST /api/auth/logout` + redirect login |

### Shim di compatibilità

```js
window.showLayer = (id) => openModule(id);   // legacy
window.hideLayer = () => showLibrary();       // legacy
```

## Flusso navigazione

```
Library (griglia card)
  │
  ├── click card → openModule(mod)
  │     └── LayerSystem.openNode(null, {kind:'fullscreen', contentKey})
  │           └── state.openModules.add(mod)
  │
  ├── click helper card → openRegistryHelper(id)
  │     └── openModule('tools') → LayerSystem.openNode(toolsNodeId, {kind:'panel', contentKey})
  │
  └── click modulo aperto → focusModule(mod)
        └── LayerSystem.applyFocus(nodeId)
```

## Interazione con LayerSystem

- Ascolta gli eventi `node:closed` e `focus:changed` per aggiornare `state.openModules` e il tree.
- Mantiene la mappa `mod → nodeId` per il focus diretto.
- Rendering del tree basato su `state.layerManager.getSnapshot()`.

## Note

- Massimo 5 moduli root aperti contemporaneamente (limite LayerSystem).
- `openRegistryHelper` nidifica il helper come child del nodo tools.
- `doLogout()` invalida sia sessione server che stato locale.
