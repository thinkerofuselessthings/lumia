# shell-state.js

> Global application state, module registry, shared utilities.

| Proprietà | Valore |
|-----------|--------|
| **File** | `app/shell/shell-state.js` |
| **Righe** | ~84 |
| **Dipendenze** | Nessuna (primo file caricato) |
| **Load order** | 1/6 nella catena shell |

## Scopo

`shell-state` è il fondamento dell'applicazione shell. Espone lo **stato globale**, i **metadati dei moduli**, le **utility condivise** e la configurazione API. Tutti gli altri file shell dipendono da questo modulo.

## Globali esportati

### Stato applicazione

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `state` | `Object` | Stato corrente: `activeModule`, `openModules`, `layerManager` |
| `csrfToken` | `string` | Token CSRF estratto dal cookie, aggiornato da session-guard |
| `apiOnline` | `boolean` | Flag connettività API |
| `apiPort` | `number` | Porta server API (da `<meta>` o default `3500`) |
| `apiKey` | `string` | Chiave API (da `<meta>`) |

### Registry moduli

```js
MODULE_INFO = {
  tools:  { icon: '…', name: 'Strumenti',     contentKey: 'tools-module' },
  admin:  { icon: '…', name: 'Admin',          contentKey: 'admin-module' },
  docs:   { icon: '…', name: 'Documentazione', contentKey: 'docs-module' },
  agenda: { icon: '…', name: 'Agenda',         contentKey: 'agenda-module' },
  user:   { icon: '…', name: 'Utente',         contentKey: 'user-module' },
};
```

### Utility e Helper

| Funzione | Firma | Descrizione |
|----------|-------|-------------|
| `esc(str)` | `string → string` | Escape HTML (previene XSS) |
| `$(sel)` | `string → Element` | Shortcut per `document.querySelector` |
| `buildLayerLayout(opts)` | `{sidebar, main, footer?} → string` | Genera HTML per layout a 2 colonne (sidebar + main) con header e footer opzionali |

### Icone Layer

```js
LAYER_ICONS = {
  'cd-diagnostic-helper': 'hgi-…',
  'fil-fitness-helper':   'hgi-…',
  'cll-therapy-helper':   'hgi-…',
  // … 10 mapping helper → classe icona HugeIcons
};
```

## Flusso dati

```
shell-state.js
  ├── state.layerManager    ← creato da shell-init.js
  ├── state.activeModule    ← aggiornato da shell-navigation.js
  ├── state.openModules     ← aggiornato da shell-navigation.js
  ├── csrfToken             ← aggiornato da shell-session-guard.js
  └── apiOnline             ← aggiornato da shell-init.js (health check)
```

## Note

- Le variabili sono dichiarate con `let` (non `const`) perché aggiornate da altri moduli shell.
- `buildLayerLayout()` è il template standard usato da tutti i content provider per generare la struttura sidebar + contenuto principale.
- `MODULE_INFO` è frozen: l'aggiunta di nuovi moduli richiede modifica qui.
