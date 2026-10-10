# shell-modules.js

> Content provider per i moduli tools, docs, agenda e user.

| Proprietà | Valore |
|-----------|--------|
| **File** | `app/shell/shell-modules.js` |
| **Righe** | ~177 |
| **Dipendenze** | `shell-state.js`, `LayerSystem`, `LumiaLibrary`, `apiOnline`/`apiPort`/`apiKey` |
| **Load order** | 4/6 nella catena shell |

## Scopo

Registra 4 content provider nel LayerSystem per i moduli non-admin della shell.

## Content Provider registrati

### 1. `tools-module`

Layout a 2 colonne via `buildLayerLayout()`:
- **Sidebar**: lista helper raggruppati per categoria (diagnostici, terapeutici)
- **Main**: area mount per l'helper selezionato
- Click su un helper → `LumiaLibrary.launchById(id)`

### 2. `docs-module`

Layout con 3 sotto-tab:
- **API Monitor**: stato connessione (`apiOnline`), uptime, engine caricati
- **API Catalog**: elenco endpoint API con metodo, path, descrizione
- **Documentation**: link alla documentazione interna

### 3. `agenda-module`

Placeholder per funzionalità futura (calendario eventi clinici).

### 4. `user-module`

Placeholder per il profilo utente e le preferenze personali.

## Pattern comune

Ogni provider segue la stessa interfaccia:

```js
LayerSystem.registerContent('xxx-module', {
  render(container, node) {
    container.innerHTML = buildLayerLayout({ sidebar: '…', main: '…' });
    // wire events
  },
  destroy(container) {
    container.innerHTML = '';
  }
});
```

## Note

- `tools-module` è il modulo più complesso: gestisce il mount/unmount degli helper nel pannello principale.
- Il modulo docs mostra informazioni in tempo reale sulla connettività API e gli engine caricati lato server.
- Questo file conteneva originariamente anche il modulo admin (338 righe), estratto in `shell-admin.js` durante Phase D.
