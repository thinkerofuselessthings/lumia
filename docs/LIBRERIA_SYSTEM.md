# Sistema Libreria — Documentazione Tecnica Completa

> Documento di riferimento per la reimplementazione **esatta** del sistema "Libreria".
> Contiene **tutto il codice verbatim**, ogni regola CSS, e le spiegazioni passo-passo
> della logica parent/child con l'albero dei nodi.
> Estratto dal progetto Polyglobulia Research Service (vanilla JS, zero framework).

---

## Indice

1. [Panoramica e Concetti Fondamentali](#1-panoramica-e-concetti-fondamentali)
2. [Stato dell'Applicazione](#2-stato-dellapplicazione)
3. [HTML Completo — Library Shell](#3-html-completo--library-shell)
4. [Module Registry](#4-module-registry)
5. [Layer System — Il Motore di Windowing](#5-layer-system--il-motore-di-windowing)
6. [Navigazione — Library ↔ Layer](#6-navigazione--library--layer)
7. [Colonna 2 — Moduli Aperti (`renderLibraryList`)](#7-colonna-2--moduli-aperti-renderliblibrarylist)
8. [Colonna 3 — Albero Nodi (`renderLibraryTree`) ★](#8-colonna-3--albero-nodi-renderlibrarytree-)
9. [Event Wiring Completo](#9-event-wiring-completo)
10. [IDE Layout — Struttura dei Moduli Fullscreen](#10-ide-layout--struttura-dei-moduli-fullscreen)
11. [Content Provider Pattern](#11-content-provider-pattern)
12. [CSS Completo — Library Shell](#12-css-completo--library-shell)
13. [CSS Completo — Tree View (Colonna 3)](#13-css-completo--tree-view-colonna-3)
14. [CSS Completo — IDE Layout](#14-css-completo--ide-layout)
15. [CSS Completo — Layer System](#15-css-completo--layer-system)
16. [Design Tokens Rilevanti](#16-design-tokens-rilevanti)
17. [Guida Passo-Passo alla Reimplementazione](#17-guida-passo-passo-alla-reimplementazione)

---

## 1. Panoramica e Concetti Fondamentali

### 1.1 Cos'è il Sistema Libreria

Il sistema Libreria è un **application shell** post-login che gestisce la navigazione tra moduli.
Funziona come il "home screen" di un IDE: da qui si aprono i moduli, si vedono quelli aperti,
e si naviga un albero gerarchico di nodi (parent → child).

### 1.2 I Due Stati Visivi

L'interfaccia ha **sempre e solo** uno di questi due stati:

| Stato | Cosa si vede | `#library-shell` | Layer nodes |
|---|---|---|---|
| **Library** | Home a 3 colonne | `display: ""` (visibile) | Tutti hanno classe `is-background` (nascosti) |
| **Module attivo** | Un fullscreen occupa tutto lo schermo | `display: "none"` | L'albero del modulo attivo è visibile, tutti gli altri sono `is-background` |

### 1.3 Il Modello Parent → Child (Concetto Chiave)

Ogni modulo aperto crea un **nodo root** (fullscreen, `parentId = null`).
Quel nodo può generare **figli**: un modal, un panel, uno sheet.
Ogni figlio può a sua volta avere sotto-figli secondo le regole di annidamento.

**Esempio concreto di albero:**
```
Pazienti (fullscreen, root)       ← nodo root, parentId = null
 ├─ Paziente "Rossi" (fullscreen) ← figlio, parentId = Pazienti
 │   ├─ Modal "Nuova visita"      ← figlio, parentId = Paziente Rossi
 │   └─ Panel "Lab completa"      ← figlio, parentId = Paziente Rossi
 └─ Paziente "Bianchi" (fullscreen)
     └─ Modal "Nuova diagnosi"
```

Il layer system traccia questa struttura ad albero. La **colonna 3** della library
la visualizza esattamente con connettori grafici CSS-only.

### 1.4 Punti Critici per la Reimplementazione

1. **`is-background`** — classe CSS che nasconde un nodo (`display: none` su fullscreen).
   Viene aggiunta a TUTTI i nodi quando si torna alla library, e rimossa selettivamente
   quando si entra in un modulo (solo i nodi di quell'albero).

2. **`revealTree(nodeId)`** — Dato un qualsiasi nodo, risale fino alla root e poi
   rimuove `is-background` da TUTTA la sottostruttura. Senza questa funzione,
   rientrando in un modulo con figli aperti, i figli resterebbero nascosti.

3. **Tree rendering ricorsivo** — `renderLibraryTree()` prende uno snapshot di TUTTI i nodi,
   filtra le root, e per ciascuna root genera ricorsivamente l'HTML dei figli.
   I connettori (linee verticali e orizzontali) sono fatti con `border-left` su `<li>`
   e `::before` pseudo-element con `border-top`.

4. **Sincronizzazione** — Le colonne 2 e 3 si ri-renderizzano automaticamente su ogni
   evento `node:opened`, `node:closed`, `focus:changed` del layer system.

---

## 2. Stato dell'Applicazione

Il modulo `state.js` esporta un oggetto mutabile condiviso. Le proprietà rilevanti per
la Libreria sono:

```js
const state = {
  /* ── Libreria ── */
  activeModule: null,        // string | null — chiave del modulo in primo piano ("dashboard", "pazienti", ecc.), null = library visibile
  openModules: new Map(),    // Map<moduleKey, nodeId> — ogni modulo aperto mappia alla sua root node ID
  layerManager: null,        // istanza creata con LayerSystem.createManager()

  /* ── Contesto corrente (usato dai moduli) ── */
  currentUser: null,
  currentPatient: null,
  currentPatientNodeId: null,
  currentTab: "anagrafica",
  currentSubTab: null,
  patientLayerBody: null,
  openPatients: new Map(),   // Map<nodeId, { patient, layerBody, tab, subTab }> — pazienti aperti multi-tab
  currentPazientiNodeId: null,
  pazientiLayerBody: null,
  currentAdminNodeId: null,
  adminLayerBody: null,
  currentDashboardNodeId: null,
  dashboardLayerBody: null,
  // ...altri campi specifici dei moduli
};
```

**Nota cruciale**: `state.openModules` è una `Map`, non un oggetto. Mantiene l'ordine
di inserzione. Quando un modulo viene chiuso (evento `node:closed`), viene rimosso da
questa map. `updateCardStates()` scorre la map per decidere quali card hanno `is-open`.

---

## 3. HTML Completo — Library Shell

Questo è l'HTML esatto presente in `index.html`. Il `#app-shell` è il container post-login
(inizia nascosto con classe `hidden`, viene mostrato dopo il login).

```html
<!-- ═══ APP SHELL (post-login) ═══ -->
<div class="app-shell hidden" id="app-shell">

  <!-- Library Shell (3 columns — always the "home" view) -->
  <div class="library-shell" id="library-shell">

    <!-- ════ Col 1: Quick Launch ════ -->
    <div class="library-col library-col--launch">
      <div class="library-col-title">
        <i class="hgi hgi-stroke hgi-grid-view"></i>
      </div>
      <div class="quick-launch-grid" id="quick-launch-grid">

        <button class="quick-module-button" data-module="dashboard">
          <div class="quick-module-header">
            <span class="quick-module-num">01</span>
            <span class="quick-module-name">Dashboard</span>
          </div>
          <div class="quick-module-icon"><i class="hgi hgi-stroke hgi-chart-line-data-02"></i></div>
          <div class="quick-module-desc">Stato del servizio e statistiche</div>
        </button>

        <button class="quick-module-button" data-module="pazienti">
          <div class="quick-module-header">
            <span class="quick-module-num">02</span>
            <span class="quick-module-name">Pazienti</span>
          </div>
          <div class="quick-module-icon"><i class="hgi hgi-stroke hgi-user-group"></i></div>
          <div class="quick-module-desc">Ricerca, schede e gestione</div>
        </button>

        <button class="quick-module-button quick-module-button--admin hidden" data-module="admin">
          <div class="quick-module-header">
            <span class="quick-module-num">03</span>
            <span class="quick-module-name">Admin</span>
          </div>
          <div class="quick-module-icon"><i class="hgi hgi-stroke hgi-user-settings-01"></i></div>
          <div class="quick-module-desc">Utenti, tabelle e audit</div>
        </button>

        <button class="quick-module-button" data-module="api-ref">
          <div class="quick-module-header">
            <span class="quick-module-num">04</span>
            <span class="quick-module-name">API</span>
          </div>
          <div class="quick-module-icon"><i class="hgi hgi-stroke hgi-api"></i></div>
          <div class="quick-module-desc">Documentazione API REST</div>
        </button>

        <button class="quick-module-button" data-module="docs-ref">
          <div class="quick-module-header">
            <span class="quick-module-num">05</span>
            <span class="quick-module-name">Docs</span>
          </div>
          <div class="quick-module-icon"><i class="hgi hgi-stroke hgi-doc-02"></i></div>
          <div class="quick-module-desc">Documentazione tecnica</div>
        </button>

        <button class="quick-module-button" data-module="preferenze">
          <div class="quick-module-header">
            <span class="quick-module-name">Preferenze</span>
          </div>
          <div class="quick-module-icon"><i class="hgi hgi-stroke hgi-settings-02"></i></div>
          <div class="quick-module-desc">Password e account</div>
        </button>

        <button class="quick-module-button quick-module-button--logout" id="btn-logout">
          <div class="quick-module-header">
            <span class="quick-module-name">Esci</span>
          </div>
          <div class="quick-module-icon"><i class="hgi hgi-stroke hgi-logout-03"></i></div>
          <div class="quick-module-desc">Disconnetti sessione</div>
        </button>

      </div>
      <div class="library-user-info">
        <span class="library-user-avatar"><i class="hgi hgi-stroke hgi-user"></i></span>
        <span class="library-user-name" id="header-user"></span>
      </div>
    </div>

    <!-- ════ Col 2: Open Modules ════ -->
    <div class="library-col library-col--open">
      <div class="library-col-title">
        <i class="hgi hgi-stroke hgi-layers-01"></i>
      </div>
      <div class="library-list" id="library-list">
        <p class="text-xs text-muted" style="padding:0 .7rem">Nessun modulo aperto</p>
      </div>
    </div>

    <!-- ════ Col 3: Node Tree ════ -->
    <div class="library-col library-col--tree">
      <div class="library-col-title">
        <i class="hgi hgi-stroke hgi-node-edit"></i>
      </div>
      <div class="library-tree" id="library-tree">
        <p class="text-xs text-muted" style="padding:0 .7rem">Nessun nodo attivo</p>
      </div>
    </div>

  </div>

  <!-- Layer Root — tutti i nodi (fullscreen/modal/panel/sheet) vengono montati QUI -->
  <div id="layerRoot"></div>

</div>
```

**Note strutturali:**
- `#library-shell` è un flexbox row con 3 figli `.library-col`
- La colonna 1 (`--launch`) ha `flex: 2`, le colonne 2 e 3 hanno `flex: 1`
- `#library-list` e `#library-tree` vengono svuotati e ripopolati da JS ad ogni cambio di stato
- `#layerRoot` è un container `position: fixed; inset: 0` dove i `<section>` dei layer vengono appesi
- La card Admin ha classe `hidden` di default, mostrata via JS solo se `ruolo === "amministratore"`

---

## 4. Module Registry

Dizionario che collega ogni modulo alla sua icona, nome e content provider:

```js
const MODULE_INFO = {
  dashboard:  { icon: "hgi-chart-line-data-02", name: "Dashboard",  contentKey: "dashboard-detail" },
  pazienti:   { icon: "hgi-user-group",         name: "Pazienti",   contentKey: "pazienti-module" },
  admin:      { icon: "hgi-user-settings-01",   name: "Admin",      contentKey: "admin-detail" },
  preferenze: { icon: "hgi-settings-02",        name: "Preferenze", contentKey: "preferenze-detail" },
  "api-ref":  { icon: "hgi-api",               name: "API",         contentKey: "api-ref-detail" },
  "docs-ref": { icon: "hgi-doc-02",            name: "Docs",        contentKey: "docs-ref-detail" },
};
```

| Campo | Ruolo | Usato dove |
|---|---|---|
| chiave (es. `"dashboard"`) | ID univoco del modulo | `data-module` negli HTML, `state.openModules`, `renderLibraryList/Tree` |
| `icon` | Classe icona senza prefix `hgi hgi-stroke` | Card, library items, tree nodes |
| `name` | Label leggibile | Header layer, sidebar, tree labels |
| `contentKey` | Chiave del content provider nel Layer System | `layerManager.openNode({ contentKey })` |

---

## 5. Layer System — Il Motore di Windowing

Il layer system (`layer-system.js`) è un modulo autonomo che gestisce apertura/chiusura di
nodi gerarchici. **Non conosce la Libreria**. Il collegamento avviene attraverso:
- `contentKey` → content provider registry
- eventi (`node:opened`, `node:closed`, `focus:changed`) → la Libreria ascolta e aggiorna le colonne

### 5.1 Tipi di Nodo e Regole di Annidamento

```js
const NODE_KINDS = {
  fullscreen: { cssClass: "layer-fullscreen", role: "region",        modal: false, animation: "layerFadeIn"   },
  modal:      { cssClass: "layer-modal",      role: "dialog",        modal: true,  animation: "modalScaleIn"  },
  panel:      { cssClass: "layer-panel",      role: "complementary", modal: false, animation: "panelSlideIn"  },
  sheet:      { cssClass: "layer-sheet",      role: "dialog",        modal: true,  animation: "sheetSlideUp"  },
};

const NESTING_RULES = {
  fullscreen: { allowed: ["fullscreen", "modal", "panel", "sheet"], max: 5 },
  modal:      { allowed: ["modal"], max: 1 },
  panel:      { allowed: ["modal", "sheet"], max: 2 },
  sheet:      { allowed: ["modal"], max: 1 },
};
```

**Come leggere**: Un nodo `fullscreen` può ospitare fino a 5 figli di qualsiasi tipo.
Un nodo `modal` può ospitare al massimo 1 figlio, e solo di tipo `modal`.
Se il limite è raggiunto, `openNode()` emette `action:blocked` e restituisce `null`.

### 5.2 Struttura di un Record Nodo (internal state)

Ogni nodo nel layer system è rappresentato da:
```js
{
  id: "abc123...",             // ID univoco (16 byte hex random)
  kind: "fullscreen",         // tipo nodo
  title: "Pazienti",          // titolo
  parentId: null,             // null se root, altrimenti ID del padre
  childrenIds: new Set(),     // Set<string> — IDs dei figli diretti
  contentKey: "pazienti-module",
  contentData: {},
  zIndex: 300,                // calcolato automaticamente
  sequence: 1,                // ordine di apertura (incrementale)
  element: HTMLElement,        // il <section> nel DOM
  previousFocus: HTMLElement,  // elemento che aveva il focus prima dell'apertura
  trapHandler: Function|null,  // per focus trap (modal/sheet)
  beforeClose: Function|null,  // hook FE3 per dirty-form
}
```

### 5.3 Z-Index Management

```js
function updateZIndexes() {
  // Ordina le root per ordine di apertura (sequence)
  const roots = [...nodes.values()]
    .filter(n => !n.parentId)
    .sort((a, b) => a.sequence - b.sequence);

  roots.forEach((root, idx) => {
    const base = 300 + idx * 100;  // Root 0 = 300, Root 1 = 400, Root 2 = 500...

    function assign(nodeId, depth, offset) {
      const rec = getNode(nodeId);
      if (!rec) return;
      rec.zIndex = base + depth * 10 + offset;  // Depth 0 = base, Depth 1 = base+10...
      rec.element.style.zIndex = String(rec.zIndex);
      const children = [...rec.childrenIds]
        .map(id => getNode(id)).filter(Boolean)
        .sort((a, b) => a.sequence - b.sequence);
      children.forEach((child, i) => assign(child.id, depth + 1, i + 1));
    }
    assign(root.id, 0, 0);
  });

  // Il nodo focalizzato riceve un BOOST di +80
  const focusedId = focusStack[focusStack.length - 1];
  if (focusedId) {
    const rec = getNode(focusedId);
    if (rec) {
      const root = getRoot(focusedId);
      const rootIdx = roots.findIndex(r => r.id === root.id);
      rec.zIndex = 300 + (rootIdx >= 0 ? rootIdx : 0) * 100 + 80;
      rec.element.style.zIndex = String(rec.zIndex);
    }
  }

  // Applica "is-active-layer" solo ai nodi dell'albero focalizzato
  const activeRootId = focusedId ? getRoot(focusedId)?.id : null;
  const activeTreeIds = new Set();
  if (activeRootId) {
    (function collectTree(nodeId) {
      activeTreeIds.add(nodeId);
      const n = getNode(nodeId);
      if (n) n.childrenIds.forEach(collectTree);
    })(activeRootId);
  }
  // I nodi NON nell'albero attivo perdono la classe → CSS li rende opacity 0.45
  for (const n of nodes.values()) {
    n.element.classList.toggle("is-active-layer", activeTreeIds.has(n.id));
  }
}
```

### 5.4 DOM Element di un Nodo

Ogni nodo produce un `<section>` montato come figlio diretto di `#layerRoot`:

```js
function createNodeElement({ nodeId, title, kind, kindDef, parentId, zIndex }) {
  const el = document.createElement("section");
  el.className = kindDef.cssClass;           // "layer-fullscreen", "layer-modal", etc.
  el.id = nodeId;
  el.style.zIndex = String(zIndex || 1);
  el.setAttribute("data-node-id", nodeId);
  el.setAttribute("data-kind", kind);
  el.setAttribute("data-parent-id", parentId || "");
  el.setAttribute("role", kindDef.role);
  if (kindDef.modal) el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", title);

  el.innerHTML = `
    <div class="layer-content">
      <div class="layer-header">
        <div class="layer-meta">
          <p class="layer-title">${esc(title)}</p>
        </div>
        <button class="layer-close-btn" type="button"
                data-layer-action="close" data-node-id="${esc(nodeId)}"
                aria-label="Chiudi ${esc(title)}">
          <i class="hgi hgi-stroke hgi-cancel-01"></i>
        </button>
      </div>
      <div class="layer-body"></div>
    </div>
  `;
  return el;
}
```

**Struttura risultante nel DOM:**
```
#layerRoot                          (position: fixed; inset: 0; pointer-events: none)
  ├─ section.layer-fullscreen       (Pazienti — root)
  │    └─ .layer-content
  │         ├─ .layer-header  →  .layer-title + .layer-close-btn
  │         └─ .layer-body    →  contenuto del content provider (IDE layout)
  ├─ section.layer-fullscreen       (Paziente "Rossi" — figlio)
  │    └─ ...
  └─ section.layer-modal            (Nuova visita — figlio del paziente)
       └─ ...
```

I nodi sono **piatti nel DOM** (tutti figli diretti di `#layerRoot`),
ma **logicamente gerarchici** tramite `parentId` / `childrenIds`.
Il z-index assicura che i figli siano sopra i genitori.

### 5.5 API Pubblica del Layer Manager

```js
const layerManager = LayerSystem.createManager();  // o createManager(rootElement)

// ── Apertura ──
layerManager.openNode(parentId, {
  kind: "fullscreen",       // "fullscreen" | "modal" | "panel" | "sheet"
  title: "Titolo",
  contentKey: "mio-provider",
  contentData: { ... },
});
// parentId = null per root, oppure ID di un nodo esistente per creare un figlio
// Ritorna nodeId (string) o null se bloccato da nesting rules

// ── Chiusura ──
layerManager.closeNode(nodeId);                     // chiude ricorsivamente (figli prima)
layerManager.closeNode(nodeId, { force: true });    // ignora beforeClose hook
layerManager.closeTopNode();                        // chiude il nodo in cima al focusStack

// ── Focus ──
layerManager.applyFocus(nodeId);                    // porta il nodo in primo piano

// ── Query ──
layerManager.hasOpenNodes();     // boolean
layerManager.getOpenRoots();     // Array<nodeRecord> — solo nodi con parentId = null
layerManager.getAllNodes();       // Array<nodeRecord> — tutti
layerManager.getNodeById(id);    // nodeRecord | null
layerManager.getSnapshot();      // { focusedNodeId, focusStack, nodes: [...] }

// ── Hook dirty-form (FE3) ──
layerManager.setBeforeClose(nodeId, () => {
  // return false per bloccare la chiusura
  // return true per procedere
});

// ── Eventi ──
layerManager.on("node:opened",    ({ nodeId, kind, parentId, contentKey }) => { ... });
layerManager.on("node:closed",    ({ nodeId, kind, title, parentId, closedCount }) => { ... });
layerManager.on("focus:changed",  ({ nodeId }) => { ... });
layerManager.on("action:blocked", ({ reason, parentId, kind }) => { ... });
```

### 5.6 Chiusura Ricorsiva

Quando si chiude un nodo, **tutti i figli vengono chiusi prima** (depth-first):

```js
function removeRecursive(nodeId) {
  const target = getNode(nodeId);
  if (!target) return [];
  const closed = [];

  // Prima chiudi tutti i figli ricorsivamente
  for (const childId of [...target.childrenIds]) {
    closed.push(...removeRecursive(childId));
  }

  // Poi distruggi il content provider
  if (target.contentKey) {
    const body = target.element.querySelector(".layer-body");
    if (body) destroyContent(target.contentKey, body);
  }

  // Rimuovi focus trap listener (modal/sheet)
  if (target.trapHandler) {
    target.element.removeEventListener("keydown", target.trapHandler);
  }

  // Rimuovi dal padre
  if (target.parentId) {
    const parent = getNode(target.parentId);
    parent?.childrenIds.delete(target.id);
  }

  // Rimuovi dal DOM e dalla map
  target.element.remove();
  nodes.delete(target.id);
  const idx = focusStack.lastIndexOf(target.id);
  if (idx >= 0) focusStack.splice(idx, 1);
  closed.push(target);
  return closed;
}
```

### 5.7 Focus Trap (Modal / Sheet)

Per nodi con `focusMode: "locked"` (modal e sheet), viene installato un handler
sull'evento `keydown` che intrappola il Tab/Shift+Tab dentro l'elemento:

```js
function setupFocusTrap(element) {
  const FOCUSABLE_SEL = 'a[href],button:not([disabled]),textarea:not([disabled]),'
    + 'input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

  function handler(e) {
    if (e.key !== "Tab") return;
    const focusable = [...element.querySelectorAll(FOCUSABLE_SEL)]
      .filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  element.addEventListener("keydown", handler);
  // Auto-focus al mount
  requestAnimationFrame(() => {
    const close = element.querySelector(".layer-close-btn");
    if (close) close.focus();
    else { const f = element.querySelector(FOCUSABLE_SEL); if (f) f.focus(); }
  });
  return handler;
}
```

### 5.8 Global Event Delegation del Layer System

Il layer system installa 3 listener globali (in `createManager`):

```js
// 1. Click su pulsanti [data-layer-action="close"]
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-layer-action]");
  if (!btn) return;
  if (btn.dataset.layerAction === "close") {
    const nodeId = btn.dataset.nodeId;
    if (nodeId) closeNode(nodeId);
  }
});

// 2. Click sul backdrop di modal/sheet → chiude
rootNode.addEventListener("click", (e) => {
  if (e.target.classList.contains("layer-modal") || e.target.classList.contains("layer-sheet")) {
    const nodeId = e.target.getAttribute("data-node-id");
    if (nodeId) closeNode(nodeId);
  }
});

// 3. Escape chiude il nodo in cima
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nodes.size > 0) {
    e.preventDefault();
    closeTopNode();
  }
});
```

### 5.9 Content Provider Registry

Registrato globalmente (non per-manager), è una Map `contentKey → { render, destroy }`:

```js
const contentProviders = new Map();

function registerContent(key, provider) {
  contentProviders.set(key, {
    label: provider.label || key,
    render: provider.render,
    destroy: typeof provider.destroy === "function" ? provider.destroy : () => {},
  });
}

// Chiamato durante openNode():
function renderContent(key, container, context) {
  const provider = contentProviders.get(key);
  if (!provider) {
    container.innerHTML = `<p class="layer-empty">Contenuto "${key}" non trovato.</p>`;
    return false;
  }
  provider.render(container, context);  // context = { nodeId, parentId, kind, contentData, manager }
  return true;
}
```

---

## 6. Navigazione — Library ↔ Layer

### 6.1 `showLibrary()` — Torna alla home

```js
function showLibrary() {
  state.activeModule = null;
  const shell = $("#library-shell");
  if (shell) shell.style.display = "";

  // CRUCIALE: metti in background TUTTI i nodi aperti (root + figli)
  state.layerManager.getAllNodes().forEach(n =>
    n.element.classList.add("is-background")
  );

  renderLibraryList();   // aggiorna colonna 2
  renderLibraryTree();   // aggiorna colonna 3
}
```

**Cosa succede:**
1. `activeModule` → `null` (nessun modulo in primo piano)
2. `#library-shell` → torna visibile
3. Ogni `<section>` layer riceve `is-background` → CSS li nasconde (`display: none` per fullscreen)
4. Le colonne vengono ri-renderizzate per mostrare lo stato corrente

### 6.2 `openModule(mod)` — Apre o riporta un modulo

```js
function openModule(mod) {
  // 1. Se già aperto → riportalo in primo piano
  const existing = state.openModules.get(mod);
  if (existing) { focusModule(mod, existing); return; }

  // 2. Guard: admin solo per amministratori
  if (mod === "admin" && state.currentUser?.ruolo !== "amministratore") return;

  const cfg = MODULE_INFO[mod];
  if (!cfg) return;

  // 3. Nascondi la library
  state.activeModule = mod;
  const shell = $("#library-shell");
  if (shell) shell.style.display = "none";

  // 4. Background TUTTI i layer esistenti
  state.layerManager.getAllNodes().forEach(n =>
    n.element.classList.add("is-background")
  );

  // 5. Apri un nodo ROOT fullscreen (parentId = null)
  const nodeId = state.layerManager.openNode(null, {
    kind: "fullscreen",
    title: cfg.name,
    contentKey: cfg.contentKey,
    contentData: {},
  });

  // 6. Registra nella map
  if (nodeId) {
    state.openModules.set(mod, nodeId);
    updateCardStates();
  }
}
```

### 6.3 `focusModule(mod, nodeId)` — Riporta in primo piano un modulo già aperto

```js
function focusModule(mod, nodeId) {
  state.activeModule = mod;
  const shell = $("#library-shell");
  if (shell) shell.style.display = "none";

  // Background TUTTO
  state.layerManager.getAllNodes().forEach(n =>
    n.element.classList.add("is-background")
  );

  // Rivela tutto l'albero di questo nodo (dal root ai figli più profondi)
  revealTree(nodeId);

  // Porta il focus sul nodo
  state.layerManager.applyFocus(nodeId);
}
```

### 6.4 `revealTree(nodeId)` — ★ Funzione critica per il parent/child

Dato un qualsiasi `nodeId`:
1. **Risale fino alla root** (segue la catena `parentId`)
2. **Raccoglie TUTTI i discendenti** (ricorsivamente via `childrenIds`)
3. **Rimuove `is-background`** da ciascuno

Senza questa funzione, tornando a un modulo con figli aperti, questi resterebbero nascosti.

```js
function revealTree(nodeId) {
  const snap = state.layerManager.getSnapshot();
  const nodeMap = new Map(snap.nodes.map(n => [n.id, n]));

  // Passo 1: risali fino alla root
  let root = nodeMap.get(nodeId);
  while (root && root.parentId) root = nodeMap.get(root.parentId);
  if (!root) return;

  // Passo 2: raccogli l'INTERO albero (root + tutti i discendenti)
  const toReveal = [];
  (function collect(id) {
    toReveal.push(id);
    const n = nodeMap.get(id);
    if (n) n.childrenIds.forEach(collect);  // childrenIds è un array nello snapshot
  })(root.id);

  // Passo 3: rimuovi is-background da ciascun nodo dell'albero
  toReveal.forEach(id => {
    const rec = state.layerManager.getNodeById(id);
    if (rec) rec.element.classList.remove("is-background");
  });
}
```

**Esempio**: Se Pazienti (root A) ha 2 figli (B, C) e il figlio B ha un modal (D):
```
revealTree("D")
  → risale: D.parentId=B, B.parentId=A, A.parentId=null → root = A
  → raccoglie: [A, B, D, C]  (tutto l'albero)
  → rimuove is-background da A, B, C, D
```

### 6.5 `updateCardStates()` — Toggle visuale sulle card quick-launch

```js
function updateCardStates() {
  $$(".quick-module-button[data-module]").forEach(btn => {
    btn.classList.toggle("is-open", state.openModules.has(btn.dataset.module));
  });
}
```

Una card con `is-open` diventa semi-trasparente (`opacity: 0.5` in CSS).

---

## 7. Colonna 2 — Moduli Aperti (`renderLibraryList`)

La colonna 2 mostra una lista piatta dei moduli/layer root aperti, con icona, nome, e pulsante chiudi.

```js
function renderLibraryList() {
  const list = $("#library-list");
  if (!list) return;
  const trackedNodeIds = new Set(state.openModules.values());
  let html = "";

  // Moduli tracciati in state.openModules
  for (const [mod, nodeId] of state.openModules) {
    const info = MODULE_INFO[mod] || { icon: "hgi-grid-view", name: mod };
    html += `
      <button class="library-item" data-module="${esc(mod)}" data-node-id="${esc(nodeId)}">
        <span class="library-item-icon"><i class="hgi hgi-stroke ${info.icon}"></i></span>
        <span class="library-item-name">${esc(info.name)}</span>
        <span class="library-item-close" data-close-module="${esc(mod)}" title="Chiudi">
          <i class="hgi hgi-stroke hgi-cancel-01"></i>
        </span>
      </button>`;
  }

  // Layer root NON tracciati (es. paziente aperto direttamente, non da un modulo)
  state.layerManager.getOpenRoots().forEach(r => {
    if (!trackedNodeIds.has(r.id)) {
      html += `
        <button class="library-item" data-node-id="${esc(r.id)}">
          <span class="library-item-icon"><i class="hgi hgi-stroke hgi-user"></i></span>
          <span class="library-item-name">${esc(r.title || "Layer")}</span>
          <span class="library-item-close" data-close-node="${esc(r.id)}" title="Chiudi">
            <i class="hgi hgi-stroke hgi-cancel-01"></i>
          </span>
        </button>`;
    }
  });

  list.innerHTML = html || '<p class="text-xs text-muted" style="padding:0 .7rem">Nessun modulo aperto</p>';
}
```

**Differenza tra i due tipi:**
- Moduli tracciati: hanno `data-module` + `data-node-id` → click chiama `focusModule(mod, nodeId)`
- Layer non tracciati: hanno solo `data-node-id` → click usa `revealTree()` + `applyFocus()`
- Il pulsante chiudi usa `data-close-module` (tracciati) o `data-close-node` (non tracciati)

---

## 8. Colonna 3 — Albero Nodi (`renderLibraryTree`) ★

Questa è la parte più complessa. Visualizza l'intera gerarchia parent→child di tutti i nodi aperti.

### 8.1 La Funzione Completa

```js
function renderLibraryTree() {
  const tree = $("#library-tree");
  if (!tree) return;

  // 1. Prendi uno snapshot di TUTTI i nodi dal layer system
  const snap = state.layerManager.getSnapshot();

  // 2. Se non ci sono nodi, mostra placeholder
  if (!snap.nodes.length) {
    tree.innerHTML = '<p class="text-xs text-muted" style="padding:0 .7rem">Nessun nodo attivo</p>';
    return;
  }

  // 3. Crea una mappa per lookup veloce
  const nodeMap = new Map(snap.nodes.map(n => [n.id, n]));

  // 4. Filtra solo le root (nodi senza parentId)
  const roots = snap.nodes
    .filter(n => !n.parentId)
    .sort((a, b) => a.zIndex - b.zIndex);

  const focusedId = snap.focusedNodeId;

  // 5. Helper: trova il nome del modulo per un nodo root
  function modNameForNode(nodeId) {
    for (const [mod, nid] of state.openModules) {
      if (nid === nodeId) return MODULE_INFO[mod]?.name || mod;
    }
    return null;
  }

  // 6. Helper: trova l'icona per un nodo
  function iconForNode(n) {
    for (const [mod, nid] of state.openModules) {
      if (nid === n.id) return MODULE_INFO[mod]?.icon || "hgi-grid-view";
    }
    if (n.contentKey === "paziente-detail") return "hgi-user";
    return "hgi-grid-view";
  }

  // 7. ★ FUNZIONE RICORSIVA — genera HTML per un nodo + tutti i suoi figli
  function renderNode(n, isRoot) {
    const isFocused = n.id === focusedId;

    // Trova i figli diretti di questo nodo
    const children = snap.nodes
      .filter(c => c.parentId === n.id)
      .sort((a, b) => a.zIndex - b.zIndex);

    const label = modNameForNode(n.id) || n.title || "Layer";
    const icon = iconForNode(n);

    // Root → tree-card-module (icona accento), figlio → tree-card-child
    const cardClass = isRoot
      ? "tree-card tree-card-module"
      : "tree-card tree-card-child";
    const activeClass = isFocused ? " tree-card-active" : "";

    // Apri <li>
    let html = `<li>
      <div class="${cardClass}${activeClass}" data-tree-node="${esc(n.id)}">
        <span class="tree-icon${isRoot ? "" : " tree-icon-child"}">
          <i class="hgi hgi-stroke ${icon}"></i>
        </span>
        <span class="tree-label">${esc(label)}</span>
      </div>`;

    // Se ha figli, apri <ul> e recurse
    if (children.length) {
      html += "<ul>";
      children.forEach(c => { html += renderNode(c, false); });
      html += "</ul>";
    }

    html += "</li>";
    return html;
  }

  // 8. Genera l'albero completo
  let html = '<ul class="tree-view">';
  roots.forEach(r => { html += renderNode(r, true); });
  html += "</ul>";
  tree.innerHTML = html;
}
```

### 8.2 Struttura HTML Generata dall'Albero — Esempio Dettagliato

Dato questo stato:
```
Roots: [Pazienti, Dashboard]
Pazienti.childrenIds = [Paziente-Rossi]
Paziente-Rossi.childrenIds = [Modal-Visita]
Dashboard.childrenIds = []
```

L'HTML generato sarà:
```html
<ul class="tree-view">

  <!-- Root 1: Pazienti -->
  <li>
    <div class="tree-card tree-card-module" data-tree-node="abc123">
      <span class="tree-icon"><i class="hgi hgi-stroke hgi-user-group"></i></span>
      <span class="tree-label">Pazienti</span>
    </div>
    <ul>
      <!-- Figlio: Paziente Rossi -->
      <li>
        <div class="tree-card tree-card-child" data-tree-node="def456">
          <span class="tree-icon tree-icon-child"><i class="hgi hgi-stroke hgi-user"></i></span>
          <span class="tree-label">Rossi Mario</span>
        </div>
        <ul>
          <!-- Sotto-figlio: Modal Visita -->
          <li>
            <div class="tree-card tree-card-child tree-card-active" data-tree-node="ghi789">
              <span class="tree-icon tree-icon-child"><i class="hgi hgi-stroke hgi-grid-view"></i></span>
              <span class="tree-label">Nuova visita</span>
            </div>
            <!-- Nessun <ul> perché nessun figlio -->
          </li>
        </ul>
      </li>
    </ul>
  </li>

  <!-- Root 2: Dashboard (nessun figlio) -->
  <li>
    <div class="tree-card tree-card-module" data-tree-node="jkl012">
      <span class="tree-icon"><i class="hgi hgi-stroke hgi-chart-line-data-02"></i></span>
      <span class="tree-label">Dashboard</span>
    </div>
  </li>

</ul>
```

### 8.3 Come Funzionano i Connettori CSS dell'Albero

I connettori (le linee verticali e orizzontali che collegano parent a child)
sono **pure CSS**, senza SVG o canvas. Il meccanismo:

```
tree-view (ul)
  └─ li                         ← border-left: 1px solid (linea verticale)
       ├─ ::before              ← border-top: 1px solid (linea orizzontale)
       ├─ .tree-card            ← la card cliccabile
       └─ ul                    ← sotto-albero (indent via padding-left)
            ├─ li               ← border-left + ::before
            │    └─ .tree-card
            └─ li:last-child    ← border-left: transparent + ::before con border-bottom-left curvo
                 └─ .tree-card
```

**Regola 1** — Ogni `<li>` dentro un `<ul>` ha una linea verticale a sinistra:
```css
.tree-view ul > li {
  border-left: var(--tree-line-w) solid var(--tree-line-color);
}
```

**Regola 2** — L'ultimo `<li>` NON ha la linea verticale (per non continuare oltre):
```css
.tree-view ul > li:last-child {
  border-left-color: transparent;
}
```

**Regola 3** — Ogni `<li>` ha una linea orizzontale (connettore al parent):
```css
.tree-view ul > li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.85rem;                /* allineato al centro verticale della card */
  width: var(--tree-indent);   /* lungo quanto l'indentazione */
  height: 0;
  border-top: var(--tree-line-w) solid var(--tree-line-color);
}
```

**Regola 4** — L'ultimo `<li>` ha un angolo arrotondato (curva a L):
```css
.tree-view ul > li:last-child::before {
  border-top: none;
  border-left: var(--tree-line-w) solid var(--tree-line-color);
  border-bottom: var(--tree-line-w) solid var(--tree-line-color);
  border-bottom-left-radius: var(--tree-radius);  /* 6px */
  height: 0.85rem;
  top: 0;
}
```

**Risultato visivo:**
```
Pazienti                    ← tree-card-module (accento bg)
 │
 ├── Paziente Rossi         ← tree-card-child (border-left + ::before orizzontale)
 │    │
 │    └── Nuova visita      ← ultimo figlio: angolo curvo a L
 │
 └── Paziente Bianchi       ← ultimo figlio: angolo curvo a L
```

---

## 9. Event Wiring Completo

### 9.1 Quick Launch Grid — Click su card

```js
$$("#quick-launch-grid .quick-module-button").forEach(btn =>
  btn.addEventListener("click", () => {
    const mod = btn.dataset.module;
    if (mod) openModule(mod);
  })
);
```

### 9.2 Library List (Colonna 2) — Event delegation

```js
const libList = $("#library-list");
if (libList) {
  libList.addEventListener("click", (e) => {
    // Chiudi modulo tracciato
    const closeModBtn = e.target.closest("[data-close-module]");
    if (closeModBtn) {
      e.stopPropagation();
      const mod = closeModBtn.dataset.closeModule;
      const nodeId = state.openModules.get(mod);
      if (nodeId) state.layerManager.closeNode(nodeId);
      return;
    }

    // Chiudi layer non tracciato
    const closeNodeBtn = e.target.closest("[data-close-node]");
    if (closeNodeBtn) {
      e.stopPropagation();
      const nodeId = closeNodeBtn.dataset.closeNode;
      if (nodeId) state.layerManager.closeNode(nodeId);
      return;
    }

    // Focus item (click sulla riga)
    const item = e.target.closest(".library-item");
    if (item) {
      const mod = item.dataset.module;
      const nodeId = item.dataset.nodeId;
      if (mod && nodeId) {
        focusModule(mod, nodeId);
      } else if (nodeId) {
        // Layer non tracciato — focus diretto
        state.activeModule = null;
        const shell = $("#library-shell");
        if (shell) shell.style.display = "none";
        state.layerManager.getAllNodes().forEach(n => n.element.classList.add("is-background"));
        revealTree(nodeId);
        state.layerManager.applyFocus(nodeId);
      }
    }
  });
}
```

### 9.3 Node Tree (Colonna 3) — Event delegation

Quando l'utente clicca un nodo nell'albero, il sistema:
1. Trova la root dell'albero di quel nodo
2. Se è un modulo tracciato → usa `focusModule()` per ripristinare tutto l'albero
3. Se non è tracciato → rivela manualmente con `revealTree()` + `applyFocus()`
4. Se il nodo cliccato è un figlio (non la root) → porta il focus su quel figlio specifico

```js
const libTree = $("#library-tree");
if (libTree) {
  libTree.addEventListener("click", (e) => {
    const card = e.target.closest("[data-tree-node]");
    if (!card) return;
    const nodeId = card.dataset.treeNode;
    const node = state.layerManager.getNodeById(nodeId);
    if (!node) return;

    // Risali alla root di questo nodo
    const snap = state.layerManager.getSnapshot();
    const nodeMap = new Map(snap.nodes.map(n => [n.id, n]));
    let rootSnap = nodeMap.get(nodeId);
    while (rootSnap && rootSnap.parentId) rootSnap = nodeMap.get(rootSnap.parentId);
    if (!rootSnap) return;

    // La root è un modulo tracciato?
    let mod = null;
    for (const [m, nid] of state.openModules) {
      if (nid === rootSnap.id) { mod = m; break; }
    }

    if (mod) {
      if (nodeId !== rootSnap.id) {
        // Click su un FIGLIO — prima apri il modulo, poi focus sul figlio
        focusModule(mod, rootSnap.id);
        state.layerManager.applyFocus(nodeId);
      } else {
        // Click sulla ROOT — apri il modulo
        focusModule(mod, rootSnap.id);
      }
    } else {
      // Layer non tracciato
      const shell = $("#library-shell");
      if (shell) shell.style.display = "none";
      state.layerManager.getAllNodes().forEach(n => n.element.classList.add("is-background"));
      revealTree(rootSnap.id);
      state.layerManager.applyFocus(nodeId);
    }
  });
}
```

### 9.4 Layer System Events — Sincronizzazione

#### `node:closed` — Cleanup + fallback

```js
state.layerManager.on("node:closed", async (data) => {
  // Rimuovi dalla map se era un modulo tracciato
  for (const [mod, nodeId] of state.openModules) {
    if (nodeId === data.nodeId) {
      state.openModules.delete(mod);
      break;
    }
  }
  updateCardStates();

  // [Cleanup specifici moduli — patient lock release, state reset, etc.]

  // Se non ci sono più nodi aperti → torna alla library
  if (!state.layerManager.hasOpenNodes()) {
    showLibrary();
  } else {
    // Porta in primo piano l'ultimo nodo focalizzato
    const snap = state.layerManager.getSnapshot();
    const focused = snap.focusedNodeId;
    if (focused) {
      const nodeMap = new Map(snap.nodes.map(n => [n.id, n]));
      let root = nodeMap.get(focused);
      while (root && root.parentId) root = nodeMap.get(root.parentId);
      if (root) {
        const rootRec = state.layerManager.getNodeById(root.id);
        if (rootRec) {
          const shell = $("#library-shell");
          if (shell) shell.style.display = "none";
          state.layerManager.getAllNodes().forEach(n => n.element.classList.add("is-background"));
          revealTree(root.id);
          // Trova se è un modulo tracciato
          state.activeModule = null;
          for (const [mod, nid] of state.openModules) {
            if (nid === root.id) { state.activeModule = mod; break; }
          }
        }
      }
    }
    renderLibraryList();
    renderLibraryTree();
  }
});
```

#### `node:opened` — Aggiorna albero

```js
state.layerManager.on("node:opened", () => {
  renderLibraryTree();
  updateOpenPatientsSidebar();
});
```

#### `focus:changed` — Aggiorna contesto paziente + sidebar

```js
state.layerManager.on("focus:changed", ({ nodeId }) => {
  const patCtx = state.openPatients.get(nodeId);
  if (patCtx) {
    // Salva lo stato del tab del paziente precedente
    const prevCtx = state.openPatients.get(state.currentPatientNodeId);
    if (prevCtx) {
      prevCtx.tab = state.currentTab;
      prevCtx.subTab = state.currentSubTab;
    }
    // Ripristina il contesto del paziente focalizzato
    state.currentPatient = patCtx.patient;
    state.currentPatientNodeId = nodeId;
    state.patientLayerBody = patCtx.layerBody;
    state.currentTab = patCtx.tab || "anagrafica";
    state.currentSubTab = patCtx.subTab || null;
    updateOpenPatientsSidebar();
  }
});
```

### 9.5 "Back to Library" (global delegation)

```js
document.addEventListener("click", (e) => {
  if (e.target.closest(".ide-back-library")) {
    e.preventDefault();
    showLibrary();
  }
});
```

---

## 10. IDE Layout — Struttura dei Moduli Fullscreen

Ogni content provider fullscreen rende un layout a 3 colonne stile VS Code
dentro il `.layer-body` del nodo.

### 10.1 Struttura HTML

```html
<div class="ide-layout">
  <!-- Col 1: Activity Bar (40px) — Icone verticali -->
  <nav class="ide-activity-bar">
    <div class="ide-activity-bar__top">
      <button class="ide-activity-icon is-active" data-tab="anagrafica" title="Anagrafica">
        <i class="hgi hgi-stroke hgi-user"></i>
      </button>
      <button class="ide-activity-icon" data-tab="diagnosi" title="Diagnosi">
        <i class="hgi hgi-stroke hgi-stethoscope-02"></i>
      </button>
      <!-- ...altre icone... -->
    </div>
    <div class="ide-activity-bar__bottom">
      <!-- Azioni: edit, delete -->
      <button class="ide-activity-icon" data-patient-action="edit" title="Modifica">
        <i class="hgi hgi-stroke hgi-pencil-edit-02"></i>
      </button>
      <!-- SEMPRE presente: bottone back alla library -->
      <button class="ide-activity-icon ide-back-library" title="Torna alla libreria">
        <i class="hgi hgi-stroke hgi-grid-view"></i>
      </button>
    </div>
  </nav>

  <!-- Col 2: Sidebar (272px) — Navigazione contestuale -->
  <aside class="ide-sidebar">
    <div class="ide-sidebar__header">
      <span class="ide-sidebar__title">TITOLO SIDEBAR</span>
    </div>
    <div class="ide-sidebar__content">
      <button class="sidebar-tree-item active">
        <i class="hgi hgi-stroke hgi-user"></i> Elemento
      </button>
      <!-- Per sub-items indentati: -->
      <button class="sidebar-tree-item sidebar-tree-item--sub">Sub-item</button>
      <!-- Per group headers non-cliccabili: -->
      <div class="sidebar-tree-header"><i class="hgi hgi-stroke hgi-api"></i> GRUPPO</div>
    </div>
  </aside>

  <!-- Col 3: Content (flex 1fr) — Area principale scrollabile -->
  <div class="ide-content">
    <div style="padding:var(--space-lg);height:100%;overflow-y:auto">
      <!-- Il contenuto del tab attivo -->
    </div>
  </div>
</div>
```

### 10.2 Navigazione Activity Bar → Tab

Il pattern è identico in ogni content provider: le icone in `__top` hanno `data-tab`.
Al click:
1. Viene rimossa/aggiunta `is-active` sulle icone
2. Il contenuto della sidebar cambia
3. Il contenuto di `ide-content` cambia

```js
container.querySelectorAll(".ide-activity-icon[data-tab]").forEach(btn => {
  btn.addEventListener("click", () => {
    container.querySelectorAll(".ide-activity-icon[data-tab]").forEach(b =>
      b.classList.remove("is-active")
    );
    btn.classList.add("is-active");
    switchTab(btn.dataset.tab);
  });
});
```

---

## 11. Content Provider Pattern

### 11.1 Provider Registrati

| `contentKey` | Modulo | Tipo | Note |
|---|---|---|---|
| `dashboard-detail` | Dashboard | fullscreen + IDE | Sidebar statica "Home" |
| `pazienti-module` | Pazienti | fullscreen + IDE | Sidebar dinamica: pazienti aperti. Search nel content |
| `paziente-detail` | Dettaglio Paziente | fullscreen + IDE | 8 tab clinici, sidebar sub-tab, multi-istanza (Map openPatients) |
| `admin-detail` | Admin | fullscreen + IDE | 3 tab: utenti, tabelle DB, audit |
| `preferenze-detail` | Preferenze | fullscreen + IDE | Sidebar statica "Account" |
| `api-ref-detail` | API Reference | fullscreen + IDE | Clona HTML dalla landing page, sidebar navigabile |
| `docs-ref-detail` | Docs Reference | fullscreen + IDE | Clona HTML dalla landing page, sidebar navigabile |
| `generic-form` | Form modali | modal, no IDE | Footer con Annulla/Salva. Dirty-state tracking (FE3) |
| `generic-html` | HTML generico | modal, no IDE | Semplice innerHTML passato |

### 11.2 Esempio: Content Provider Minimo (Dashboard)

```js
LayerSystem.registerContent("dashboard-detail", {
  label: "Dashboard",
  render(container, ctx) {
    state.currentDashboardNodeId = ctx.nodeId;
    state.dashboardLayerBody = container;

    container.innerHTML = `
      <div class="ide-layout">
        <nav class="ide-activity-bar">
          <div class="ide-activity-bar__top">
            <button class="ide-activity-icon is-active" title="Home">
              <i class="hgi hgi-stroke hgi-home-01"></i>
            </button>
          </div>
          <div class="ide-activity-bar__bottom">
            <button class="ide-activity-icon ide-back-library" title="Torna alla libreria">
              <i class="hgi hgi-stroke hgi-grid-view"></i>
            </button>
          </div>
        </nav>
        <aside class="ide-sidebar">
          <div class="ide-sidebar__header">
            <span class="ide-sidebar__title">DASHBOARD</span>
          </div>
          <div class="ide-sidebar__content">
            <button class="sidebar-tree-item active">
              <i class="hgi hgi-stroke hgi-home-01"></i> Home
            </button>
          </div>
        </aside>
        <div class="ide-content">
          <div id="dashboard-content-area"
               style="padding:var(--space-lg);height:100%;overflow-y:auto">
          </div>
        </div>
      </div>`;

    loadDashboardContent(container.querySelector("#dashboard-content-area"));
  },
  destroy() {
    state.currentDashboardNodeId = null;
    state.dashboardLayerBody = null;
  },
});
```

### 11.3 Esempio: Generic Form (Modal con dirty-state)

```js
LayerSystem.registerContent("generic-form", {
  label: "Form",
  render(container, ctx) {
    const { bodyHtml, onSave, wide } = ctx.contentData;

    // Opzionale: layout largo
    if (wide) {
      const lc = container.closest(".layer-content");
      if (lc) lc.classList.add("layer-wide");
    }

    container.innerHTML = bodyHtml +
      `<div class="layer-form-footer">
        <button class="btn" data-layer-action="close" data-node-id="${ctx.nodeId}">Annulla</button>
        <button class="btn btn-primary layer-form-save">Salva</button>
      </div>`;

    container.querySelector(".layer-form-save")
      .addEventListener("click", () => onSave(ctx.nodeId));

    // FE3: dirty state detection
    let dirty = false;
    container.addEventListener("input", () => { dirty = true; }, { once: true });
    state.layerManager.setBeforeClose(ctx.nodeId, () => {
      if (!dirty) return true;
      showConfirm("Ci sono modifiche non salvate. Chiudere comunque?", () => {
        closeConfirm();
        state.layerManager.closeNode(ctx.nodeId, { force: true });
      });
      return false;
    });
  },
  destroy() {},
});
```

---

## 12. CSS Completo — Library Shell

```css
/* ═══ Library Shell — 3-column home ═══ */

.library-shell {
  height: 100%;
  display: flex;
  flex-direction: row;
  gap: 0;
  animation: shellSlideIn 200ms ease;
}

.library-col {
  padding: 3rem;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.library-col--launch {
  background: var(--white, #fff);
  flex: 2;                      /* 2x larghezza delle altre */
}

.library-col--open {
  background: var(--surface-2, #f3f5f7);
  flex: 1;
}

.library-col--tree {
  background: var(--white, #fff);
  border-left: 1px solid var(--border-color);
  flex: 1;
}

.library-col-title {
  margin: 0 0 1rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  color: var(--muted, var(--gray-400));
}
.library-col-title i { font-size: 18px; }

@keyframes shellSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── User info (fondo colonna 1) ── */

.library-user-info {
  margin-top: auto;
  padding-top: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.library-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-500);
  font-size: 16px;
  flex-shrink: 0;
}

.library-user-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--gray-700);
}

/* ── Quick Launch Grid (col 1) ── */

.quick-launch-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  flex: 1;
  align-content: center;
  margin: auto;
}

.quick-module-button {
  border: none;
  background: transparent;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  aspect-ratio: 1;
  text-align: left;
  font-size: 0.82rem;
  padding: 0.6rem;
  transition: background 120ms ease;
  width: 100%;
  font-family: inherit;
}

.quick-module-button:hover { background: var(--gray-200, #f9fafb); }
.quick-module-button:active { background: var(--gray-100, #f3f4f6); }
.quick-module-button.is-open { opacity: 0.5; }

.quick-module-header {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  width: 100%;
}

.quick-module-num {
  font-size: 0.72rem;
  color: var(--muted, var(--gray-400));
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.quick-module-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--gray-900, #111);
}

.quick-module-icon {
  font-size: 2rem;
  color: var(--muted, var(--gray-400));
  margin: auto 0;
}

.quick-module-desc {
  font-size: 0.68rem;
  color: var(--muted, var(--gray-500));
  line-height: 1.4;
}

/* Logout variant */
.quick-module-button--logout:hover {
  background: rgba(229, 62, 62, 0.06);
}
.quick-module-button--logout:hover .quick-module-icon {
  color: var(--error, #e53e3e);
}

/* ── Library List — open modules (col 2) ── */

.library-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
  margin-top: 40px;
}

.library-item {
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  transition: background 120ms ease, color 120ms ease;
  font-family: inherit;
  text-align: left;
  width: 100%;
}

.library-item:hover { background: var(--surface-3, #edf1f5); }

.library-item .library-item-icon {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-100);
  color: var(--gray-600);
  font-size: 16px;
  flex-shrink: 0;
}

.library-item .library-item-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--gray-900);
}

.library-item-close {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--gray-400);
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity .12s ease, color .12s ease;
}

.library-item:hover .library-item-close { opacity: 1; }
.library-item-close:hover { color: var(--error, #e53e3e); }

/* ── Library Tree container (col 3) ── */

.library-tree {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 40px;
}
```

---

## 13. CSS Completo — Tree View (Colonna 3)

Questo è il CSS più critico. Genera i connettori visivi tra nodi parent e child.

```css
/* ═══ Tree View — Gerarchia nodi con connettori CSS-only ═══ */

.tree-view {
  --tree-indent: 1.1rem;                               /* indentazione tra livelli */
  --tree-line-w: 1px;                                   /* spessore linea */
  --tree-line-color: var(--border-color, #dcdce0);      /* colore linea */
  --tree-radius: 6px;                                   /* raggio angolo ultimo figlio */
  list-style: none;
  padding: 0;
  margin: 0;
}

/* Sotto-liste (figli) */
.tree-view ul {
  list-style: none;
  padding-left: var(--tree-indent);
  margin: 0;
  position: relative;
}

/* Ogni <li> ha padding-left per il connettore orizzontale */
.tree-view li {
  position: relative;
  padding-left: var(--tree-indent);
}

/* ── Linea verticale: i <li> figli (dentro <ul>) hanno un bordo sinistro ── */
.tree-view ul > li {
  border-left: var(--tree-line-w) solid var(--tree-line-color);
}

/* L'ultimo figlio NON continua la linea verticale */
.tree-view ul > li:last-child {
  border-left-color: transparent;
}

/* ── Connettore orizzontale: pseudo-element ::before ── */
.tree-view ul > li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.85rem;                    /* allineato al centro verticale della tree-card */
  width: var(--tree-indent);       /* lungo quanto l'indentazione */
  height: 0;
  border-top: var(--tree-line-w) solid var(--tree-line-color);
}

/* ── Ultimo figlio: angolo arrotondato a L (curva) ── */
.tree-view ul > li:last-child::before {
  border-top: none;                /* rimuovi la linea orizzontale dritta */
  border-left: var(--tree-line-w) solid var(--tree-line-color);
  border-bottom: var(--tree-line-w) solid var(--tree-line-color);
  border-bottom-left-radius: var(--tree-radius);
  height: 0.85rem;
  top: 0;                          /* parte dall'alto e scende fino a 0.85rem */
}

/* ═══ Tree Card — Nodo cliccabile ═══ */

.tree-card {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  margin-bottom: 0.35rem;
  cursor: pointer;
  transition: background 100ms ease;
  font-size: var(--font-size-xs, 0.8rem);
}

.tree-card:hover {
  background: var(--gray-100, #f3f5f7);
}

/* Nodo attivo (focalizzato) */
.tree-card-active {
  background: var(--gray-150, #e8ecef);
}

/* Root module attivo → accento colorato */
.tree-card-module.tree-card-active {
  background: var(--accent-bg, #e0f0f1);
}

/* ═══ Tree Icon — Badge icona nel nodo ═══ */

.tree-icon {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 5px;
  background: var(--gray-100, #f0f0f0);
  color: var(--gray-500, #888);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  flex-shrink: 0;
}

/* Root: icona con sfondo accento */
.tree-card-module .tree-icon {
  background: var(--accent, #6BAAAE);
  color: #fff;
}

/* Figlio: icona grigio più scuro */
.tree-icon-child {
  background: var(--gray-200, #e0e0e0);
  color: var(--gray-600, #666);
}

/* ═══ Tree Label ═══ */

.tree-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
```

---

## 14. CSS Completo — IDE Layout

```css
/* ═══ IDE Layout — Grid 3 colonne (activity bar | sidebar | content) ═══ */

.ide-layout {
  display: grid;
  grid-template-columns: var(--ide-activity-w) var(--ide-sidebar-w) 1fr;
  height: 100%;
  overflow: hidden;
}

/* ── Activity Bar (col 1) ── */

.ide-activity-bar {
  grid-column: 1;
  background: var(--surface-2);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-sm) 0;
}

.ide-activity-bar__top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  flex: 1;
}

.ide-activity-bar__bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding-bottom: var(--space-sm);
}

.ide-activity-icon {
  position: relative;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  border: none; background: transparent;
  color: var(--muted, var(--gray-400));
  font-size: 18px;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background .18s ease, color .18s ease;
  padding: 0;
}

.ide-activity-icon:hover {
  color: var(--text-strong, var(--gray-700));
  background: var(--gray-100);
}

.ide-activity-icon.is-active {
  color: var(--text-strong, var(--gray-900));
  background: var(--gray-100);
}

/* ── Sidebar (col 2) ── */

.ide-sidebar {
  grid-column: 2;
  background: var(--surface-2);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ide-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--border-color);
  min-height: 36px;
  flex-shrink: 0;
}

.ide-sidebar__title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gray-500);
}

.ide-sidebar__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) 0;
}

/* ── Sidebar Tree Items ── */

.sidebar-tree-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 4px var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--gray-700);
  cursor: pointer;
  transition: background .12s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}
.sidebar-tree-item:hover { background: var(--surface-3); }
.sidebar-tree-item.active {
  background: var(--surface-3);
  color: var(--gray-900);
  font-weight: 600;
}
.sidebar-tree-item i { font-size: 14px; color: var(--gray-400); flex-shrink: 0; }
.sidebar-tree-item.active i { color: var(--gray-700); }

/* Group header (non-clickable) */
.sidebar-tree-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 6px var(--space-md) 2px;
  font-size: 10px;
  font-weight: 700;
  color: var(--gray-400);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: var(--space-sm);
}
.sidebar-tree-header:first-child { margin-top: 0; }
.sidebar-tree-header i { font-size: 12px; }

/* Sub-items (indented) */
.sidebar-tree-item--sub {
  padding-left: calc(var(--space-md) + var(--space-md));
  font-size: var(--font-size-xs);
  color: var(--gray-500);
}

/* ── Content Area (col 3) ── */

.ide-content {
  grid-column: 3;
  position: relative;
  overflow: hidden;
  background: var(--bg, var(--gray-50));
}
```

---

## 15. CSS Completo — Layer System

```css
/* ═══ Layer Root ═══ */

#layerRoot {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 500;
}

/* ── Tutti i tipi di nodo ── */

.layer-fullscreen,
.layer-modal,
.layer-panel,
.layer-sheet {
  position: fixed;
  inset: 0;
  pointer-events: auto;
}

/* ── Fullscreen ── */

.layer-fullscreen {
  background: var(--bg, var(--gray-50));
  animation: layerFadeIn 200ms ease;
  transition: opacity 200ms ease, box-shadow 200ms ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Alberi non attivi → dimmed */
.layer-fullscreen:not(.is-active-layer) {
  opacity: 0.45;
  pointer-events: none;
}
.layer-fullscreen.is-active-layer {
  opacity: 1;
}

/* ★ CRUCIALE: is-background nasconde il fullscreen quando si torna alla library */
.layer-fullscreen.is-background {
  display: none;
}

.layer-fullscreen > .layer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  max-width: 100%;
  border: none;
  border-radius: 0;
  background: var(--bg, var(--gray-50));
}

/* ── Modal ── */

.layer-modal {
  background: rgba(17, 17, 17, 0.35);       /* backdrop semi-trasparente */
  display: grid;
  place-items: center;
  padding: var(--space-md);
  animation: modalScaleIn 200ms ease;
}

.layer-modal > .layer-content {
  width: min(580px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  animation: modalContentIn 200ms ease;
}

/* ── Panel ── */

.layer-panel {
  inset: 0 0 0 auto;
  width: min(520px, 90%);
  background: var(--white);
  border-left: 1px solid var(--border-color);
  animation: panelSlideIn 200ms ease;
  transition: opacity 200ms ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.layer-panel > .layer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  border: none;
  border-radius: 0;
}

/* ── Sheet ── */

.layer-sheet {
  inset: auto 0 0 0;
  top: 25%;
  background: rgba(17, 17, 17, 0.25);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  animation: sheetSlideUp 200ms ease;
}

.layer-sheet > .layer-content {
  width: min(720px, 100%);
  border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
  border-bottom: none;
  max-height: 75vh;
  overflow-y: auto;
}

/* ── Shared: layer-content, header, body, close ── */

.layer-content {
  background: var(--surface, var(--white));
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-lg, 0 8px 30px rgba(0,0,0,0.12));
}

.layer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: rgba(255,255,255,.62);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  min-height: 49px;
}

.layer-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--gray-900);
  margin: 0;
}

.layer-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--white);
  color: var(--gray-500);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
  font-size: 16px;
  flex-shrink: 0;
}

.layer-close-btn:hover {
  color: var(--gray-900);
  background: var(--gray-100);
}

.layer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

/* Fullscreen body — no padding, flex column per IDE layout */
.layer-fullscreen .layer-body {
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* IDE layout inside fullscreen fills height */
.layer-fullscreen .layer-body > .ide-layout {
  flex: 1;
  min-height: 0;
}

/* Modal body — constrained height */
.layer-modal .layer-body {
  max-height: calc(90vh - 60px);
  overflow-y: auto;
}

/* Wide modal variant */
.layer-content.layer-wide {
  width: min(760px, 95%);
}

/* ── Animations ── */

@keyframes layerFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes modalScaleIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes modalContentIn {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes panelSlideIn {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes sheetSlideUp {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

---

## 16. Design Tokens Rilevanti

Variabili CSS usate dal sistema Libreria (definite in `base.css` su `:root`):

```css
:root {
  /* Grigi */
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

  /* Superfici */
  --bg: #f5f7fa;
  --surface: var(--white);
  --surface-2: #f3f5f7;
  --surface-3: #edf1f5;
  --surface-4: #e7ebf0;

  /* Testo */
  --text: #5b6270;
  --text-strong: #2f3541;
  --muted: #8b93a0;

  /* Bordi */
  --border-color: #e1e6eb;
  --border-radius-sm: 4px;
  --border-radius-md: 6px;
  --border-radius-lg: 8px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;

  /* Font */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;

  /* IDE Layout */
  --ide-activity-w: 40px;
  --ide-sidebar-w: 272px;

  /* Transizioni */
  --transition-fast: 150ms ease;

  /* Ombre */
  --shadow-lg: 0 10px 30px rgba(31, 35, 40, 0.10);
}
```

---

## 17. Guida Passo-Passo alla Reimplementazione

### Step 1 — Layer System (File: `layer-system.js`)

Implementa il windowing engine come modulo autonomo.

**Cosa serve:**
- ID factory (crypto random hex)
- Node record: `{ id, kind, title, parentId, childrenIds: Set, element, zIndex, sequence }`
- Map `nodes` per storage
- Array `focusStack` per focus management
- `openNode(parentId, config)` — crea elemento DOM, monta in `#layerRoot`, chiama content provider
- `closeNode(nodeId)` — chiusura ricorsiva (figli prima del padre)
- `updateZIndexes()` — ricalcola z-index (300 base + 100 per root + 10 per depth + 80 boost focus)
- `applyFocus(nodeId)` — sposta in cima al focusStack
- Content provider registry: `registerContent(key, { render, destroy })`
- Event bus: `on(event, callback)`, `emit(event, data)`
- Focus trap per modal/sheet

**Output:** Un export default `{ createManager, registerContent, NODE_KINDS }`.

### Step 2 — State Module

Crea l'oggetto state condiviso:

```js
const state = {
  activeModule: null,       // string | null
  openModules: new Map(),   // Map<moduleKey, nodeId>
  layerManager: null,       // verrà assegnato in init
};
```

### Step 3 — HTML Shell

Crea la struttura HTML esatta della sezione 3. I punti chiave:
- `#library-shell` → flexbox row
- `#quick-launch-grid` → grid 3×N con `<button>` e `data-module`
- `#library-list` → container dinamico per moduli aperti
- `#library-tree` → container dinamico per albero nodi
- `#layerRoot` → container vuoto per i layer DOM

### Step 4 — CSS: Copia le sezioni 12, 13, 14, 15

I 4 bocchi CSS sono autonomi e coprono:
- Library shell + quick launch + library list (sez. 12)
- Tree view con connettori (sez. 13) — **questa è la parte più delicata**
- IDE layout (sez. 14)
- Layer system (sez. 15)

### Step 5 — Module Registry + Navigation Functions

Implementa in quest'ordine:

1. `MODULE_INFO` — dizionario moduli (sez. 4)
2. `showLibrary()` — background tutto, mostra shell, re-render colonne (sez. 6.1)
3. `openModule(mod)` — nascondi shell, background tutto, `openNode(null, fullscreen)` (sez. 6.2)
4. `focusModule(mod, nodeId)` — nascondi shell, background, `revealTree`, `applyFocus` (sez. 6.3)
5. `revealTree(nodeId)` — risali a root, raccogli discendenti, rimuovi `is-background` (sez. 6.4)
6. `updateCardStates()` — toggle `is-open` sulle card (sez. 6.5)

### Step 6 — Rendering Colonne

1. `renderLibraryList()` — lista piatta moduli aperti + layer non tracciati (sez. 7)
2. `renderLibraryTree()` — albero ricorsivo con `renderNode()` (sez. 8)

**Errori comuni nel tree:**
- Dimenticare di filtrare `n.parentId === null` per le root
- Dimenticare di ordinare per `zIndex` (i figli devono apparire nell'ordine giusto)
- Non gestire il caso "nessun nodo" (mostrare il placeholder)
- Nei connettori CSS, dimenticare `position: relative` su `<li>` → il `::before` non si posiziona correttamente

### Step 7 — Event Wiring

Collega tutti gli event listener (sez. 9):
1. Click su card quick launch → `openModule()`
2. Click + close su library list → `focusModule()` / `closeNode()`
3. Click su tree node → find root → `focusModule()` o `revealTree()` + `applyFocus()`
4. Layer events → `node:closed` (cleanup + fallback), `node:opened` (re-render tree)
5. Global delegation su `.ide-back-library` → `showLibrary()`

### Step 8 — Content Providers

Per ogni modulo, registra un content provider che monta l'IDE layout dentro il `.layer-body`.
Ogni provider segue il pattern della sezione 11.
Non dimenticare il pulsante `.ide-back-library` in ogni activity bar.

### Checklist Finale

- [ ] `showLibrary()` → `is-background` su TUTTI i nodi, shell visibile
- [ ] `openModule()` → shell nascosto, `openNode(null, fullscreen)`, `openModules.set()`
- [ ] `focusModule()` → `revealTree()` rimuove `is-background` dall'intero albero
- [ ] `revealTree()` → risale a root, raccoglie ricorsivamente, rimuove `is-background`
- [ ] `renderLibraryTree()` → ricorsione `renderNode()` con `<ul>/<li>` nested
- [ ] Connettori CSS → `border-left` su `li`, `::before` con `border-top`, ultimo figlio con curva
- [ ] `node:closed` → rimuovi da `openModules`, `updateCardStates()`, fallback a library se vuoto
- [ ] `node:opened` → re-render `renderLibraryTree()`
- [ ] Click tree node → risalire alla root, trovare modulo, `focusModule()` + `applyFocus()` sul nodo specifico
- [ ] `is-background` su fullscreen = `display: none` in CSS
- [ ] `is-active-layer` = `opacity: 1`, non-active = `opacity: 0.45`
