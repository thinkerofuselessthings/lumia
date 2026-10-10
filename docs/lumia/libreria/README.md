# Libreria — Stato attuale

> **Data**: 2026-04-11 · **Versione**: lumia v0.0.1

---

## Ruolo

La **Libreria** è la landing page dell'applicazione dopo il login.
Non esiste più una front-page statica; l'utente autenticato atterra direttamente 
sulla shell a tre colonne della Libreria.

---

## Struttura DOM

Il markup vive in [`index.html`](../../../index.html) dentro `#library-shell`.

```
body
├── #apiLogPanel          (overlay nascosta, data-store per API log)
├── #library-shell        (landing — 3 colonne)
│   ├── .library-col--launch   (Col 1 — Quick Launch Grid)
│   ├── .library-col--open     (Col 2 — Moduli aperti)
│   └── .library-col--tree     (Col 3 — Node Tree)
├── #logout-loader        (overlay loader lightsaber per il logout)
├── #layerRoot            (root mount per il layer system)
└── <script defer>        (4 file shell: state → navigation → modules → init)
```

---

## Colonne

### Col 1 — Quick Launch (`#quick-launch-grid`)

Griglia 3 colonne di pulsanti modulo (card compatte, max-width 420px).
Ogni card ha `data-module="<key>"` e apre un layer fullscreen.

| # | key | nome | icona |
|---|-----|------|-------|
| 01 | `tools` | Tools | `hgi-stethoscope` |
| 02 | `admin` | Admin | `hgi-settings-02` |
| 03 | `agenda` | Agenda | `hgi-calendar-03` |
| 04 | `docs` | Docs | `hgi-book-open-01` |
| 05 | `user` | User | `hgi-user` |
| — | — | **Logout** | `hgi-logout-03` |

Il bottone Logout (`#btn-logout`) ha classe `quick-module-button--logout`, 
non ha `data-module` (gestione click dedicata). Senza bordo.

### Col 2 — Open Modules (`#library-list`)

Lista dei moduli/layer attualmente aperti. 
Generata da `renderLibraryList()` ad ogni evento di apertura/chiusura layer.
Click → ri-focus del modulo. Click × → chiude il layer.

### Col 3 — Node Tree (`#library-tree`)

Albero gerarchico di tutti i nodi layer (root → figli).
Generato da `renderLibraryTree()`. Click → focus sul nodo.

---

## CSS

| File | Responsabilità |
|------|----------------|
| [`lumia-library-shell.css`](../../../public/css/lumia-library-shell.css) | Layout 3 colonne, quick launch grid, tree view, categorie |
| [`lumia-base.css`](../../../public/css/lumia-base.css) | Design tokens (`--bg`, `--line`, `--fg`, `--muted`, ecc.) |
| [`lumia-icons.css`](../../../public/css/lumia-icons.css) | Icone offline SVG mask-image (fallback a HugeIcons CDN) |
| [`lumia-global.css`](../../../public/css/lumia-global.css) | Utility, animazioni, `.hidden` |
| [`loader.css`](../../../public/css/loader.css) | Animazione lightsaber (login + logout overlay) |

### Regole chiave

```css
.library-shell     → fixed inset:0, z-index:50, flex row
.library-col       → padding:3rem, flex-direction:column, overflow:auto
.library-col--launch → background:#fff, flex:2
.library-col--open   → background:#f3f5f7, flex:1
.library-col--tree   → background:#fff, border-left, flex:1
.quick-launch-grid   → grid 3 colonne, gap:.5rem, max-width:420px
.quick-module-button → border-radius:8px, aspect-ratio:1, flex-column, padding:.5rem
.quick-module-button--logout → hover rosso, nessun bordo
```

---

## JavaScript — Shell Files

Lo script inline è stato estratto in 4 file dedicati dentro `app/shell/`,
caricati con `defer` DOPO tutti gli script core/disease/bridge/library.

### Ordine di caricamento

```
<script src="./app/shell/shell-state.js" defer></script>
<script src="./app/shell/shell-navigation.js" defer></script>
<script src="./app/shell/shell-modules.js" defer></script>
<script src="./app/shell/shell-init.js" defer></script>
```

Un piccolo script inline in fondo alla pagina esegue il **session guard**
(fetch `/api/auth/check`, salva `csrfToken`, redirect a `/login.html` se non autenticato).

### shell-state.js

Stato dell'applicazione, registry moduli, icone helper, stato API, utility.

```javascript
var state       = { activeModule, openModules, layerManager };
var csrfToken   = '';
var MODULE_INFO = { tools, admin, agenda, docs, user };
var LAYER_ICONS = { ... };
var apiPort, apiKey, apiOnline;
function esc(s) { ... }
function $(s, r) { ... }
```

### shell-navigation.js

Tutte le funzioni di navigazione libreria ↔ layer + logout con loader.

| Funzione | Scopo |
|----------|-------|
| `showLibrary()` | Mostra `#library-shell`, mette in background tutti i layer |
| `openModule(mod)` | Apre un layer fullscreen per il modulo, o ri-focalizza se già aperto |
| `focusModule(mod, nodeId)` | Nasconde libreria, rivela l'albero di quel layer |
| `revealTree(nodeId)` | Rimuove `is-background` da tutto l'albero di un nodo |
| `renderLibraryList()` | Aggiorna Col 2 (moduli aperti) |
| `renderLibraryTree()` | Aggiorna Col 3 (albero nodi) |
| `openRegistryHelper(id)` | Apre un helper registrato come figlio di Tools |
| `updateCardStates()` | Toggle classe `is-open` sulle card Quick Launch |
| `doLogout()` | Mostra loader lightsaber, POST logout, attende min 3s, redirect |
| `finishLogout(t0)` | Timer residuo → redirect `/login.html` |

### shell-modules.js

Content provider per ciascun modulo, registrati su `LayerSystem.registerContent()`.

| contentKey | Contenuto |
|------------|-----------|
| `tools-module` | LumiaLibrary.renderShell() — browser categorie/helper |
| `admin-module` | Placeholder — gestione utenti, config app, log errori |
| `agenda-module` | Placeholder — "Modulo in fase di sviluppo" |
| `docs-module` | API Monitor (status + log) + API Catalog (fetch `/api/catalog`) + documentazione tecnica |
| `user-module` | Placeholder — "Modulo in fase di sviluppo" |

### shell-init.js

Handler `DOMContentLoaded`: crea il layer manager, mostra la libreria,
wira gli eventi layer (node:closed/opened/focus:changed), 
delegazione click unificata, API config + health + WebSocket, event bus.

### Navigazione

```
Login → /api/auth/check (salva csrfToken) → index.html → showLibrary()
       ↓ card click                         ↓ sidebar back-to-library
    openModule(key)                       showLibrary()
       ↓                                    ↑
    layer fullscreen ←───────────── data-go-library button
```

### Logout (con animazione)

```
#btn-logout click → doLogout()
  → mostra #logout-loader (lightsaber animation)
  → POST /api/auth/logout (X-CSRF-Token)
  → attende min 3 secondi (LOGOUT_MIN_MS)
  → redirect /login.html
```

Il logout invalida la sessione server-side (CSRF-protected), cancella il cookie
e redirige al login. L'overlay lightsaber è lo stesso usato nella pagina di login.

---

## Layer System — Sidebar (fullscreen)

I layer `fullscreen` usano un layout con sidebar verticale a sinistra (64px, sfondo scuro).

```
.layer-content.layer-content--has-sidebar
├── .layer-sidebar
│   ├── .layer-sidebar__top     (badge icona decorativa)
│   └── .layer-sidebar__bottom  (bottone libreria + chiudi)
└── .layer-main
    └── .layer-body             (contenuto del modulo)
```

| File CSS | Contenuto |
|----------|-----------|
| [`layers-layout.css`](../../../public/css/layers/layers-layout.css) | `.layer-sidebar`, `.layer-sidebar-icon`, varianti hover |
| [`lumia-layer-system.css`](../../../public/css/lumia-layer-system.css) | `.layer-content--has-sidebar` (flex-direction:row) |
| [`layers-core.css`](../../../public/css/layers/layers-core.css) | `.layer-fullscreen`, `.layer-content`, `.layer-body` |

I layer `modal`, `panel` e `sheet` mantengono l'header orizzontale classico 
(definito in [`lumia-layer-system.css`](../../../public/css/lumia-layer-system.css) → `.layer-header`).

---

## Dipendenze

- **HugeIcons CDN** — `use.hugeicons.com/font/icons.css` (icone font)
- **lumia-icons.css** — fallback offline SVG mask-image
- **Chart.js 4.4.7** — CDN, usato da CD diagnostics (radar chart)
- **LayerSystem** — `app/core/layer-system.js`
- **LumiaLibrary** — `app/core/lumia-library.js` (categoria browser dentro Tools)
- **LumiaHelpersRegistry** — `app/utility/lumia-registry.js` (helper registrati a runtime)

---

## File coinvolti

| File | Percorso |
|------|----------|
| HTML shell | [`index.html`](../../../index.html) |
| JS shell state | [`app/shell/shell-state.js`](../../../app/shell/shell-state.js) |
| JS shell navigation | [`app/shell/shell-navigation.js`](../../../app/shell/shell-navigation.js) |
| JS shell modules | [`app/shell/shell-modules.js`](../../../app/shell/shell-modules.js) |
| JS shell init | [`app/shell/shell-init.js`](../../../app/shell/shell-init.js) |
| CSS libreria | [`public/css/lumia-library-shell.css`](../../../public/css/lumia-library-shell.css) |
| CSS loader | [`public/css/loader.css`](../../../public/css/loader.css) |
| CSS layer system | [`public/css/lumia-layer-system.css`](../../../public/css/lumia-layer-system.css) |
| CSS layer layout | [`public/css/layers/layers-layout.css`](../../../public/css/layers/layers-layout.css) |
| CSS layer core | [`public/css/layers/layers-core.css`](../../../public/css/layers/layers-core.css) |
| CSS icone | [`public/css/lumia-icons.css`](../../../public/css/lumia-icons.css) |
| JS layer system | [`app/core/layer-system.js`](../../../app/core/layer-system.js) |
| JS library | [`app/core/lumia-library.js`](../../../app/core/lumia-library.js) |
| JS registry | [`app/utility/lumia-registry.js`](../../../app/utility/lumia-registry.js) |
| Auth routes | [`app/auth/routes.js`](../../../app/auth/routes.js) |
