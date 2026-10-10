# shell-init.js

> Handler DOMContentLoaded — crea il layer manager, wiring eventi, API monitor.

| Proprietà | Valore |
|-----------|--------|
| **File** | `app/shell/shell-init.js` |
| **Righe** | ~253 |
| **Dipendenze** | `shell-state.js`, `shell-navigation.js`, `LayerSystem`, `LumiaEvents`, `openRegistryHelper` |
| **Load order** | 5/6 nella catena shell |

## Scopo

Punto d'ingresso dell'applicazione client. Al `DOMContentLoaded`:

1. Crea `state.layerManager` tramite `LayerSystem.createManager(rootEl)`
2. Wiring ascoltatori eventi LayerSystem
3. Click delegation globale
4. Health check API periodico (ogni 15 secondi)
5. WebSocket log streaming per il monitor API

## Inizializzazione

```
DOMContentLoaded
  ├── LayerSystem.createManager(#lumia-root)
  │     └── state.layerManager = manager
  ├── manager.on('node:closed') → updateCardStates(), renderLibraryTree()
  ├── manager.on('node:opened') → updateCardStates(), renderLibraryTree()
  ├── manager.on('focus:changed') → evidenzia nodo attivo nel tree
  ├── delegazione click su #lumia-root
  │     ├── [data-open-module] → openModule(mod)
  │     ├── [data-focus-module] → focusModule(mod)
  │     ├── [data-open-helper] → openRegistryHelper(id)
  │     └── [data-action=show-library] → showLibrary()
  ├── API health check (setInterval 15s)
  │     └── GET /api/health → aggiorna apiOnline
  └── WebSocket connect (ws://host:port/ws/log)
        └── messaggi in tempo reale per il monitor API
```

## Health check API

```js
setInterval(async () => {
  const ok = await fetch('/api/health').then(r => r.ok).catch(() => false);
  apiOnline = ok;
}, 15000);
```

## WebSocket log streaming

- Connessione a `ws://HOST:PORT/ws/log`
- Messaggi JSON: `{timestamp, method, path, status, duration}`
- Visualizzati nel tab "API Monitor" del modulo docs
- Riconnessione automatica su chiusura

## Note

- **Side-effect only**: non espone funzioni globali — tutto è wiring interno.
- Il manager LayerSystem viene salvato in `state.layerManager` per accesso da tutti i moduli shell.
- La delegazione click è centralizzata: nessun `addEventListener` sparso nei moduli.

---

# shell-session-guard.js

> Protezione sessione single-tab + heartbeat autenticazione.

| Proprietà | Valore |
|-----------|--------|
| **File** | `app/shell/shell-session-guard.js` |
| **Righe** | ~113 |
| **Dipendenze** | `csrfToken` (da `shell-state.js`) |
| **Load order** | 6/6 nella catena shell |

## Scopo

Garantisce che l'applicazione sia aperta in **un solo tab** del browser e mantiene la sessione attiva con un heartbeat periodico.

## Meccanismi

### 1. Single-tab lock (BroadcastChannel)

```js
const channel = new BroadcastChannel('lumia-session');
channel.onmessage = (e) => {
  if (e.data === 'new-tab') showBlockingOverlay();
};
channel.postMessage('new-tab');
```

All'apertura, il tab invia `'new-tab'`. I tab già aperti ricevono il messaggio e mostrano un overlay di blocco ("Sessione aperta in un altro tab").

### 2. Heartbeat sessione

- `GET /api/auth/check` ogni **30 secondi**
- Aggiorna il `csrfToken` globale con il nuovo token dalla risposta
- Su **401 Unauthorized**: mostra overlay blocco + redirect a login dopo 3 secondi

### 3. Overlay blocco

Overlay modale full-screen non dismissibile che impedisce qualsiasi interazione. Si attiva in caso di:
- Tab duplicato (BroadcastChannel)
- Sessione scaduta (401 dal heartbeat)
- Errore rete persistente

## Flusso

```
Apertura tab
  ├── BroadcastChannel.postMessage('new-tab')
  │     └── altri tab → overlay blocco
  └── setInterval(30s) → GET /api/auth/check
        ├── 200 OK → aggiorna csrfToken
        └── 401    → overlay blocco → redirect login
```

## Note

- Implementato come IIFE isolata — nessun export globale.
- Il `csrfToken` viene aggiornato ad ogni heartbeat per evitare che scada prima della sessione.
- Il `BroadcastChannel` è supportato da tutti i browser moderni (Chrome, Firefox, Edge, Safari 15.4+).
