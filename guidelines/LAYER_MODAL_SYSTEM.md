# Layer & Modal Management System — Guida Completa per la Replicazione

> Documento generato il 6 marzo 2026  
> **Dipendenze esterne**: Zero (vanilla JS ES6+ / CSS nativo)  
> **Target**: Qualsiasi browser moderno (ES6+)  
> **Scopo**: Permettere a un agente o sviluppatore di replicare l'intero sistema di gestione layer, modali e navigazione gerarchica in un nuovo progetto

---

## Indice

1. [Panoramica del sistema](#1-panoramica-del-sistema)
2. [Architettura e principi](#2-architettura-e-principi)
3. [Struttura file e ordine di caricamento](#3-struttura-file-e-ordine-di-caricamento)
4. [Modulo 1: ID Factory (`id.js`)](#4-modulo-1-id-factory)
5. [Modulo 2: Utilities (`utils.js`)](#5-modulo-2-utilities)
6. [Modulo 3: SVG Icons (`svg-icons.js`)](#6-modulo-3-svg-icons)
7. [Modulo 4: Node Kinds — Tipi di contenitore (`node-kinds.js`)](#7-modulo-4-node-kinds)
8. [Modulo 5: Nesting Policy — Regole di annidamento (`nesting-policy.js`)](#8-modulo-5-nesting-policy)
9. [Modulo 6: Content Registry — Registro contenuti (`content-registry.js`)](#9-modulo-6-content-registry)
10. [Modulo 7: Layer Template — Generazione DOM (`layer-template.js`)](#10-modulo-7-layer-template)
11. [Modulo 8: Layer Manager — Motore centrale (`layer-manager.js`)](#11-modulo-8-layer-manager)
12. [Modulo 9: Module Registry — Definizioni moduli (`module-registry.js`)](#12-modulo-9-module-registry)
13. [Modulo 10: Module Renderer — Content Providers (`module-renderer.js`)](#13-modulo-10-module-renderer)
14. [Modulo 11: App — Applicazione principale (`app.js`)](#14-modulo-11-app)
15. [Sistema CSS completo](#15-sistema-css-completo)
16. [HTML Shell](#16-html-shell)
17. [Sistema eventi](#17-sistema-eventi)
18. [Z-Index Management](#18-z-index-management)
19. [FocusMode — `open` vs `locked`](#19-focusmode)
20. [Flow Visibility](#20-flow-visibility)
21. [Overlay Libreria — UI a 3 colonne](#21-overlay-libreria)
22. [Pattern di utilizzo](#22-pattern-di-utilizzo)
23. [Checklist per la replicazione](#23-checklist-per-la-replicazione)

---

## 1. Panoramica del sistema

Il sistema è un **gestore di layer a navigazione gerarchica** che orchestra moduli, sotto-nodi e la navigazione tra di essi senza alcun framework esterno.

### Cosa può fare l'utente

- Aprire uno o più **moduli** (es. Pazienti, Ambulatorio, Agenda)
- All'interno di ogni modulo, aprire **nodi figli** di diversi tipi: `fullscreen`, `panel`, `modal`, `sheet`, `drawer`, `wizard`
- Navigare tra moduli e nodi attraverso una **overlay a 3 colonne** chiamata "Libreria"
- Ogni nodo figlio può a sua volta aprire sotto-nodi, formando un **albero di navigazione**
- Chiudere nodi con logica ricorsiva (i figli vengono chiusi automaticamente)

### Tre preoccupazioni ortogonali

Il sistema separa rigorosamente:

| Preoccupazione | File | Domanda che risolve |
|---|---|---|
| **Contenitore** | `node-kinds.js` | **Come** appare il nodo? (fullscreen, modal, panel…) |
| **Contenuto** | `content-registry.js` | **Cosa** va dentro il nodo? (form, lista, dashboard…) |
| **Regole** | `nesting-policy.js` | **Chi** può aprire **cosa**? (limiti annidamento) |

---

## 2. Architettura e principi

### Stack tecnologico

| Componente | Scelta |
|---|---|
| Linguaggio | **Vanilla JavaScript ES6+** |
| Pattern moduli | IIFE `(function(globalObject){...})(window)` |
| Build tools | Nessuno — file serviti direttamente |
| CSS | Custom properties, Flexbox, Grid, animazioni native |
| Icone | SVG inline centralizzati |
| Dipendenze | **Zero** |

### Principi fondamentali

1. **Zero dipendenze** — tutto vanilla JS + CSS nativo
2. **IIFE pattern** — ogni file è un modulo autocontenuto che espone API su `window`
3. **Separazione contenitore/contenuto/regole** — ortogonalità totale
4. **Event-driven** — bus eventi interno per comunicazione disaccoppiata
5. **Stato centralizzato** — il LayerManager è l'unica fonte di verità
6. **Z-index automatico** — calcolato dal manager, mai manuale
7. **Policy esternalizzata** — le regole di annidamento sono dati, non logica

---

## 3. Struttura file e ordine di caricamento

### Struttura cartelle

```
project/
├── index.html                    # Shell HTML
├── styles.css                    # Tutti gli stili (oppure layers.css)
└── js/
    ├── core/
    │   ├── id.js                 # Generatore ID univoci (crypto)
    │   ├── utils.js              # Utility condivise (escapeHtml, showToast)
    │   └── svg-icons.js          # Dizionario SVG centralizzato
    ├── layers/
    │   ├── node-kinds.js         # Registro dei 6 tipi di contenitore
    │   ├── nesting-policy.js     # Matrice di regole parent→child
    │   ├── layer-template.js     # Generazione DOM per ogni nodo
    │   └── layer-manager.js      # Motore centrale
    ├── content/
    │   └── content-registry.js   # Registro render/destroy dei contenuti
    ├── modules/
    │   ├── module-registry.js    # Definizioni dei moduli (con colori e icone)
    │   └── module-renderer.js    # Content provider per moduli e nodi generici
    ├── providers/                # Content provider specifici per modulo
    │   └── *.js
    └── app.js                    # Applicazione principale (UI libreria, eventi, tree)
```

### Ordine di caricamento (CRITICO)

L'ordine è rigido per via delle dipendenze tra moduli:

```html
<!-- 1. Core utilities — nessuna dipendenza -->
<script src="./js/core/id.js" defer></script>
<script src="./js/core/utils.js" defer></script>
<script src="./js/core/svg-icons.js" defer></script>

<!-- 2. Layer system — dipende da core -->
<script src="./js/layers/node-kinds.js" defer></script>
<script src="./js/layers/nesting-policy.js" defer></script>
<script src="./js/content/content-registry.js" defer></script>
<script src="./js/layers/layer-template.js" defer></script>
<script src="./js/layers/layer-manager.js" defer></script>

<!-- 3. Module definitions — dipende da layer system -->
<script src="./js/modules/module-registry.js" defer></script>
<script src="./js/modules/module-renderer.js" defer></script>

<!-- 4. Provider specifici (opzionali) — dopo module-renderer -->
<script src="./js/providers/mio-modulo-hub.js" defer></script>

<!-- 5. App entry point — dopo tutto il resto -->
<script src="./js/app.js" defer></script>
```

---

## 4. Modulo 1: ID Factory

**File**: `js/core/id.js`  
**Espone**: `window.layerIdUtils`

Genera ID alfanumerici unici e collision-safe usando `crypto.getRandomValues`.

### Implementazione completa

```javascript
(function attachIdUtils(globalObject) {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const randomAlphaNumeric = (length) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let result = "";
    for (let i = 0; i < length; i++) {
      result += CHARS[bytes[i] % CHARS.length];
    }
    return result;
  };

  const generateUniqueLayerId = ({ usedIds, length = 32 } = {}) => {
    if (!(usedIds instanceof Set)) {
      throw new Error("usedIds deve essere un Set.");
    }
    let id = "";
    do {
      id = randomAlphaNumeric(length);
    } while (usedIds.has(id));
    usedIds.add(id);
    return id;
  };

  globalObject.layerIdUtils = { generateUniqueLayerId };
})(window);
```

### API

| Metodo | Firma | Descrizione |
|---|---|---|
| `generateUniqueLayerId` | `({ usedIds: Set, length?: number }) → string` | Genera ID alfanumerico collision-safe |

---

## 5. Modulo 2: Utilities

**File**: `js/core/utils.js`  
**Espone**: `window.libUtils`

### Implementazione completa

```javascript
(function attachLibUtils(globalObject) {
  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const showToast = (message, type = "info") => {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-exit");
      toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, 2800);
  };

  globalObject.libUtils = { escapeHtml, showToast };
})(window);
```

### API

| Metodo | Firma | Descrizione |
|---|---|---|
| `escapeHtml` | `(string) → string` | Escape HTML entities (prevenzione XSS) |
| `showToast` | `(message, type?) → void` | Toast notification (2800ms auto-dismiss). Tipi: `info`, `warning`, `error`, `success` |

### Requisito HTML per Toast

```html
<div id="toastContainer" class="toast-container"></div>
```

---

## 6. Modulo 3: SVG Icons

**File**: `js/core/svg-icons.js`  
**Espone**: `window.svgIcons`

Dizionario centralizzato di icone SVG inline. Ogni icona è una stringa SVG registrata con una chiave.

### Schema

```javascript
(function attachSvgIcons(globalObject) {
  const ICONS = {
    close: '<svg ...>...</svg>',
    library: '<svg ...>...</svg>',
    // ... altre icone
  };

  const get = (key) => ICONS[key] || "";
  const list = () => Object.keys(ICONS);

  globalObject.svgIcons = Object.freeze({ get, list });
})(window);
```

### Icone raccomandate

| Chiave | Uso |
|---|---|
| `close` | Bottone chiusura nodi |
| `library` | Bottone apertura libreria |
| `inbox` | Empty state colonna moduli aperti |
| `structure` | Empty state colonna tree |
| `action-fullscreen` | Azione apertura nodo fullscreen |
| `action-panel` | Azione apertura nodo panel |
| `action-modal` | Azione apertura nodo modal |
| `action-sheet` | Azione apertura nodo sheet |
| `action-drawer` | Azione apertura nodo drawer |
| `action-wizard` | Azione apertura nodo wizard |

---

## 7. Modulo 4: Node Kinds

**File**: `js/layers/node-kinds.js`  
**Espone**: `window.nodeKinds`

Definisce **come** un nodo appare e si comporta visivamente. Ogni kind è un tipo di contenitore.

### Implementazione completa

```javascript
(function attachNodeKinds(globalObject) {
  "use strict";

  const NODE_KINDS = Object.freeze({
    fullscreen: {
      label: "Fullscreen",
      cssClass: "node-layer",
      role: "region",
      modal: false,
      closable: true,
      resizable: false,
      animation: "layerFadeIn",
      focusMode: "open",
    },
    panel: {
      label: "Panel",
      cssClass: "node-panel",
      role: "complementary",
      modal: false,
      closable: true,
      resizable: true,
      animation: "panelSlideIn",
      focusMode: "locked",
    },
    modal: {
      label: "Modal",
      cssClass: "node-modal",
      role: "dialog",
      modal: true,
      closable: true,
      resizable: false,
      animation: "modalScaleIn",
      focusMode: "locked",
    },
    sheet: {
      label: "Sheet",
      cssClass: "node-sheet",
      role: "dialog",
      modal: true,
      closable: true,
      resizable: false,
      animation: "sheetSlideUp",
      focusMode: "locked",
    },
    drawer: {
      label: "Drawer",
      cssClass: "node-drawer",
      role: "complementary",
      modal: false,
      closable: true,
      resizable: false,
      animation: "drawerSlideIn",
      focusMode: "locked",
    },
    wizard: {
      label: "Wizard",
      cssClass: "node-wizard",
      role: "dialog",
      modal: true,
      closable: true,
      resizable: false,
      animation: "modalScaleIn",
      focusMode: "locked",
    },
  });

  const getKind = (kindKey) => NODE_KINDS[kindKey] || null;
  const listKindKeys = () => Object.keys(NODE_KINDS);
  const listKinds = () =>
    Object.entries(NODE_KINDS).map(([key, def]) => ({ key, ...def }));
  const isValidKind = (kindKey) => kindKey in NODE_KINDS;

  globalObject.nodeKinds = Object.freeze({
    getKind, listKindKeys, listKinds, isValidKind,
  });
})(window);
```

### I 6 tipi di contenitore

| Kind | CSS class | Ruolo ARIA | Modale | Animazione | focusMode default |
|---|---|---|---|---|---|
| `fullscreen` | `.node-layer` | `region` | no | `layerFadeIn` | `open` |
| `panel` | `.node-panel` | `complementary` | no | `panelSlideIn` | `locked` |
| `modal` | `.node-modal` | `dialog` | sì | `modalScaleIn` | `locked` |
| `sheet` | `.node-sheet` | `dialog` | sì | `sheetSlideUp` | `locked` |
| `drawer` | `.node-drawer` | `complementary` | no | `drawerSlideIn` | `locked` |
| `wizard` | `.node-wizard` | `dialog` | sì | `modalScaleIn` | `locked` |

### Descrizione visiva dei kind

- **Fullscreen** — Occupa l'intera viewport. Background bianco. Bordo sinistro accent quando attivo. Opacità ridotta quando non attivo.
- **Panel** — Pannello laterale destro (`inset: 0 0 0 auto`). Larghezza `min(480px, 85%)`. Bordo sinistro.
- **Modal** — Centrato, backdrop scuro semitrasparente (`rgba(17,17,17,0.35)`). Contenuto scalato con animazione.
- **Sheet** — Bottom sheet, dal basso verso l'alto (`top: 30%`). Bordi arrotondati in alto.
- **Drawer** — Pannello laterale sinistro (`inset: 0 auto 0 0`). Larghezza `min(360px, 80%)`.
- **Wizard** — Come modal ma più grande (`min(720px, 95%)`). Backdrop più scuro (`rgba(17,17,17,0.45)`). Min-height 400px.

### Proprietà di un kind

```typescript
interface KindDefinition {
  label: string;        // Nome visualizzato (es. "Modal")
  cssClass: string;     // Classe CSS applicata all'elemento root
  role: string;         // Ruolo ARIA (region | dialog | complementary)
  modal: boolean;       // Se true, ha backdrop e aria-modal="true"
  closable: boolean;    // Se il nodo è chiudibile dall'utente
  resizable: boolean;   // Se il nodo è ridimensionabile
  animation: string;    // Nome keyframe CSS di ingresso
  focusMode: string;    // "open" | "locked" — comportamento nel tree
}
```

### Aggiungere un nuovo kind

1. Aggiungi una entry in `NODE_KINDS`
2. Aggiungi la classe CSS corrispondente in `layers.css`
3. Aggiungi l'animazione keyframe
4. Aggiungi la regola di nesting in `nesting-policy.js`

---

## 8. Modulo 5: Nesting Policy

**File**: `js/layers/nesting-policy.js`  
**Espone**: `window.nestingPolicy`

Definisce **chi** può aprire **cosa**: matrice di regole parent→child.

### Implementazione completa

```javascript
(function attachNestingPolicy(globalObject) {
  "use strict";

  const NESTING_RULES = Object.freeze({
    fullscreen: {
      allowedChildKinds: ["fullscreen", "panel", "modal", "sheet", "drawer", "wizard"],
      maxOpenChildren: 6,
      maxByKind: { fullscreen: 3, panel: 2, modal: 1, sheet: 1, drawer: 1, wizard: 1 },
    },
    panel: {
      allowedChildKinds: ["modal", "sheet"],
      maxOpenChildren: 2,
      maxByKind: { modal: 1, sheet: 1 },
    },
    modal: {
      allowedChildKinds: ["modal"],
      maxOpenChildren: 1,
      maxByKind: { modal: 1 },
    },
    sheet: {
      allowedChildKinds: ["modal"],
      maxOpenChildren: 1,
      maxByKind: { modal: 1 },
    },
    drawer: {
      allowedChildKinds: ["modal", "sheet"],
      maxOpenChildren: 1,
      maxByKind: { modal: 1, sheet: 1 },
    },
    wizard: {
      allowedChildKinds: [],
      maxOpenChildren: 0,
      maxByKind: {},
    },
  });

  const getRuleForParent = (parentKind) => NESTING_RULES[parentKind] || null;

  const isChildKindAllowed = (parentKind, childKind) => {
    const rule = NESTING_RULES[parentKind];
    return rule ? rule.allowedChildKinds.includes(childKind) : false;
  };

  const canOpenChild = (parentKind, childKind, openChildren) => {
    const rule = NESTING_RULES[parentKind];
    if (!rule) return { allowed: false, reason: "unknown_parent_kind" };
    if (!rule.allowedChildKinds.includes(childKind))
      return { allowed: false, reason: "kind_not_allowed" };
    if (openChildren.length >= rule.maxOpenChildren)
      return { allowed: false, reason: "max_children" };
    const sameKindCount = openChildren.filter((c) => c.kind === childKind).length;
    const maxByKind = rule.maxByKind[childKind] ?? 1;
    if (sameKindCount >= maxByKind)
      return { allowed: false, reason: "max_kind" };
    return { allowed: true, reason: null };
  };

  const listRuleKeys = () => Object.keys(NESTING_RULES);

  globalObject.nestingPolicy = Object.freeze({
    getRuleForParent, isChildKindAllowed, canOpenChild, listRuleKeys,
  });
})(window);
```

### Matrice di annidamento

| Parent kind | Tipi child consentiti | Max child | Limiti per tipo |
|---|---|---|---|
| `fullscreen` | tutti e 6 | 6 | fullscreen:3, panel:2, modal:1, sheet:1, drawer:1, wizard:1 |
| `panel` | modal, sheet | 2 | 1 ciascuno |
| `modal` | modal | 1 | 1 |
| `sheet` | modal | 1 | 1 |
| `drawer` | modal, sheet | 1 | 1 ciascuno |
| `wizard` | — (terminale) | 0 | — |

### API

| Metodo | Firma | Descrizione |
|---|---|---|
| `getRuleForParent` | `(parentKind) → object \| null` | Regola di annidamento per un tipo parent |
| `isChildKindAllowed` | `(parentKind, childKind) → boolean` | Verifica se un kind figlio è consentito |
| `canOpenChild` | `(parentKind, childKind, openChildren[]) → { allowed, reason? }` | Verifica completa con limiti numerici |
| `listRuleKeys` | `() → string[]` | Tutte le chiavi regola |

### Codici reason per blocco

| Reason | Significato |
|---|---|
| `unknown_parent_kind` | Il kind del parent non ha regole definite |
| `kind_not_allowed` | Il kind del child non è consentito per questo parent |
| `max_children` | Numero massimo di figli aperti raggiunto |
| `max_kind` | Limite per questo specifico kind figlio raggiunto |

---

## 9. Modulo 6: Content Registry

**File**: `js/content/content-registry.js`  
**Espone**: `window.contentRegistry`

Separa **cosa** va dentro un nodo dal contenitore. Ogni contenuto è un "provider" con lifecycle `render` / `destroy`.

### Implementazione completa

```javascript
(function attachContentRegistry(globalObject) {
  "use strict";

  const registry = new Map();

  const register = (contentKey, provider) => {
    if (!contentKey || typeof contentKey !== "string")
      throw new Error("contentKey deve essere una stringa non vuota.");
    if (typeof provider?.render !== "function")
      throw new Error(`Provider "${contentKey}" deve avere un metodo render().`);
    registry.set(contentKey, {
      label: provider.label || contentKey,
      render: provider.render,
      destroy: typeof provider.destroy === "function" ? provider.destroy : () => {},
    });
  };

  const getProvider = (contentKey) => registry.get(contentKey) || null;
  const hasProvider = (contentKey) => registry.has(contentKey);
  const listKeys = () => [...registry.keys()];

  const renderInto = (contentKey, container, context) => {
    const provider = registry.get(contentKey);
    if (!provider) {
      container.innerHTML = `<p class="node-help">Contenuto "${
        globalObject.libUtils.escapeHtml(contentKey)
      }" non trovato.</p>`;
      return false;
    }
    try {
      provider.render(container, context);
      return true;
    } catch (err) {
      container.innerHTML = `<p class="node-help">Errore rendering: ${
        globalObject.libUtils.escapeHtml(err.message)
      }</p>`;
      return false;
    }
  };

  const destroyIn = (contentKey, container) => {
    const provider = registry.get(contentKey);
    if (provider) {
      try { provider.destroy(container); } catch (_) { /* swallow */ }
    }
  };

  globalObject.contentRegistry = Object.freeze({
    register, getProvider, hasProvider, listKeys, renderInto, destroyIn,
  });
})(window);
```

### API

| Metodo | Firma | Descrizione |
|---|---|---|
| `register` | `(key, { label, render, destroy? })` | Registra un content provider |
| `renderInto` | `(key, container, context) → boolean` | Renderizza contenuto in un elemento |
| `destroyIn` | `(key, container) → void` | Cleanup del contenuto |
| `hasProvider` | `(key) → boolean` | Verifica esistenza provider |
| `listKeys` | `() → string[]` | Tutte le chiavi registrate |
| `getProvider` | `(key) → object \| null` | Ottieni definizione provider |

### Struttura di un Content Provider

```javascript
contentRegistry.register("mio-contenuto", {
  label: "Il mio contenuto",
  
  render(container, context) {
    // context = { nodeId, parentId, moduleId, kind, nodeType, contentData }
    container.innerHTML = `<h2>Ciao!</h2>`;
    // Puoi aggiungere event listeners, fetch dati, etc.
  },
  
  destroy(container) {
    // Cleanup: rimuovi listeners, cancella timers, abort fetch, etc.
    container.innerHTML = "";
  },
});
```

### Context passato a render()

```typescript
interface RenderContext {
  nodeId: string;         // ID del nodo
  parentId: string|null;  // ID del nodo padre
  moduleId: string;       // ID del modulo di appartenenza
  kind: string;           // Kind del nodo (fullscreen, modal, etc.)
  nodeType: string;       // "module" | "child"
  contentData: object;    // Dati arbitrari passati dall'openChild()
}
```

---

## 10. Modulo 7: Layer Template

**File**: `js/layers/layer-template.js`  
**Espone**: `window.layerTemplate`

Genera l'elemento DOM per ogni nodo. La struttura è: `<section>` → `.node-content` → `.node-header` + `.node-body`.

### Implementazione completa

```javascript
(function attachLayerTemplate(globalObject) {
  "use strict";

  const esc = (v) => globalObject.libUtils.escapeHtml(v);
  const closeIcon = globalObject.svgIcons?.get("close") || "✕";

  const createNodeMarkup = ({ nodeId, title, moduleKey, nodeType, kind, parentId, openedAt }) => `
    <div class="node-content">
      <div class="node-header">
        <div class="node-meta">
          <p class="node-title">${esc(title)}</p>
        </div>
        <button
          class="icon-button"
          type="button"
          data-action="${nodeType === "module" ? "close-module" : "close-node"}"
          data-node-id="${esc(nodeId)}"
          aria-label="Chiudi ${esc(title)}"
        >
          <span class="layer-close-icon" aria-hidden="true">${closeIcon}</span>
        </button>
      </div>
      <div class="node-body"></div>
    </div>
  `;

  const createNodeElement = ({
    nodeId, title, moduleKey, nodeType, kind, kindDef, parentId, openedAt, zIndex,
  }) => {
    const element = document.createElement("section");
    element.className = kindDef?.cssClass || "node-layer";
    element.id = nodeId;
    element.style.zIndex = String(zIndex || 1);
    element.setAttribute("data-node-id", nodeId);
    element.setAttribute("data-module-key", moduleKey);
    element.setAttribute("data-node-type", nodeType);
    element.setAttribute("data-kind", kind);
    element.setAttribute("data-parent-id", parentId || "");
    element.setAttribute("data-opened-at", openedAt);

    const role = kindDef?.role || "region";
    element.setAttribute("role", role);
    if (kindDef?.modal) element.setAttribute("aria-modal", "true");
    element.setAttribute("aria-label", title);

    element.innerHTML = createNodeMarkup({
      nodeId, title, moduleKey, nodeType, kind, parentId, openedAt,
    });

    return element;
  };

  globalObject.layerTemplate = { createNodeElement };
})(window);
```

### Struttura DOM generata

```
<section class="node-modal" id="abc123" role="dialog" aria-modal="true"
         data-node-id="abc123" data-module-key="pazienti"
         data-node-type="child" data-kind="modal">
  <div class="node-content">
    <div class="node-header">
      <div class="node-meta">
        <p class="node-title">Titolo del nodo</p>
      </div>
      <button class="icon-button" data-action="close-node" data-node-id="abc123">
        <span class="layer-close-icon">✕</span>
      </button>
    </div>
    <div class="node-body">
      <!-- Il contenuto viene iniettato qui dal content provider -->
    </div>
  </div>
</section>
```

---

## 11. Modulo 8: Layer Manager — Motore centrale

**File**: `js/layers/layer-manager.js`  
**Espone**: `window.layerManager.createLayerManager(config)`

Questo è il cuore del sistema. Gestisce stato, focus, z-index, eventi e il ciclo di vita completo dei nodi.

### Config di inizializzazione

```javascript
const manager = window.layerManager.createLayerManager({
  idFactory: window.layerIdUtils.generateUniqueLayerId,
  nodeFactory: window.layerTemplate.createNodeElement,
  moduleRegistry: window.layerModules,
  contentRegistry: window.contentRegistry,
  nestingPolicy: window.nestingPolicy,
  nodeKinds: window.nodeKinds,
  rootNode: document.getElementById("workspaceRoot"), // container DOM
});
```

### Stato interno

| Campo | Tipo | Descrizione |
|---|---|---|
| `nodes` | `Map<nodeId, NodeRecord>` | Tutti i nodi aperti |
| `moduleIndex` | `Map<moduleId, rootNodeId>` | Mappa modulo → nodo radice |
| `moduleOrder` | `string[]` | Ordine dei moduli (l'ultimo è attivo) |
| `focusStack` | `string[]` | Stack di focus (l'ultimo ha il focus) |
| `activeLayerId` | `string \| null` | ID del nodo radice del modulo attivo |
| `focusedNodeId` | `string \| null` | ID del nodo attualmente in focus |
| `events` | `array` | Buffer circolare ultimi 200 eventi |

### API pubblica

| Metodo | Firma | Descrizione |
|---|---|---|
| `on` | `(event, callback) → unsubscribe` | Registra listener. Ritorna funzione per de-registrare |
| `openModule` | `(moduleId, title?) → string \| null` | Apre un modulo (o lo riattiva se già aperto) |
| `openChild` | `(parentId, options) → string \| null` | Apre un nodo figlio |
| `activateLayer` | `(layerId, { forceFocus? }) → string \| null` | Attiva un modulo/nodo |
| `closeNode` | `(nodeId) → { closed, reason }` | Chiude un nodo (ricorsivo per i figli) |
| `closeTopNode` | `() → { closed, reason }` | Chiude il nodo in cima allo stack del modulo attivo |
| `closeNodeByElement` | `(element) → { closed, reason }` | Chiude il nodo associato a un elemento DOM |
| `getSnapshot` | `() → object` | Snapshot completo dello stato |

### Opzioni di openChild()

```javascript
manager.openChild(parentId, {
  kind: "modal",                    // Kind del nodo (obbligatorio)
  title: "Conferma operazione",     // Titolo (opzionale, auto-generato se omesso)
  contentKey: "confirm-dialog",     // Chiave contenuto registrato (opzionale)
  contentData: {                    // Dati passati al content provider (opzionale)
    focusMode: "locked",            // Override focusMode (opzionale)
    // ...qualsiasi dato custom
  },
});
```

### NodeRecord — Struttura di un nodo

```javascript
{
  id: "abc123",                    // ID univoco
  moduleId: "pazienti",           // Modulo di appartenenza
  title: "Paziente Rossi",        // Titolo visualizzato
  nodeType: "module" | "child",   // Tipo nodo
  kind: "fullscreen",             // Kind del contenitore
  focusMode: "open" | "locked",   // Comportamento focus nel tree
  parentId: null | "xyz456",      // ID del nodo padre (null se root)
  childrenIds: Set<string>,       // ID dei figli aperti
  contentKey: "pazienti-module",  // Chiave del content provider
  isOpen: true,
  zIndex: 400,                    // Z-index calcolato automaticamente
  sequence: 1,                    // Ordine di creazione
  element: HTMLElement,           // Riferimento DOM
  openedAt: "2026-03-06T...",     // Timestamp ISO
}
```

### Snapshot

```javascript
const snap = manager.getSnapshot();
// {
//   activeLayerId,     // ID del modulo root attivo
//   focusedNodeId,     // ID del nodo in focus
//   focusStack,        // Array ordinato di focus
//   openLayerIds,      // ID dei moduli root aperti
//   nodes,             // Array di tutti i nodi con proprietà serializzate
//   menu,              // Array menu moduli (open, layerId, icon, title)
//   events,            // Ultimi 200 eventi
// }
```

### Implementazione completa

```javascript
(function attachLayerManager(globalObject) {
  "use strict";

  const createLayerManager = ({
    idFactory, nodeFactory, moduleRegistry, contentRegistry,
    nestingPolicy, nodeKinds, rootNode = document.body,
  } = {}) => {
    // Validazione parametri
    if (typeof idFactory !== "function") throw new Error("idFactory deve essere una funzione.");
    if (typeof nodeFactory !== "function") throw new Error("nodeFactory deve essere una funzione.");
    if (!moduleRegistry) throw new Error("moduleRegistry non valido.");
    if (!contentRegistry) throw new Error("contentRegistry non valido.");
    if (!nestingPolicy) throw new Error("nestingPolicy non valido.");
    if (!nodeKinds) throw new Error("nodeKinds non valido.");

    /* ── Event Bus ── */
    const listeners = new Map();
    const on = (eventName, callback) => {
      if (!listeners.has(eventName)) listeners.set(eventName, new Set());
      listeners.get(eventName).add(callback);
      return () => listeners.get(eventName)?.delete(callback);
    };
    const emit = (eventName, data) => {
      const cbs = listeners.get(eventName);
      if (cbs) cbs.forEach((cb) => { try { cb(data); } catch (_) {} });
    };

    /* ── State ── */
    const usedIds = new Set();
    const nodes = new Map();
    const moduleIndex = new Map();
    const moduleOrder = [];
    const focusStack = [];
    const events = [];
    let activeLayerId = null;
    let focusedNodeId = null;
    let sequence = 0;
    let openGuard = false;

    /* ── Event logging (circular buffer, max 200) ── */
    const logEvent = (type, data) => {
      const entry = {
        id: idFactory({ usedIds, length: 12 }),
        at: new Date().toISOString(),
        type, data,
      };
      events.push(entry);
      if (events.length > 200) events.shift();
      emit("event", entry);
    };

    /* ── Node helpers ── */
    const getNodeById = (nodeId) => (nodeId ? nodes.get(nodeId) || null : null);
    
    const getModuleRoot = (nodeId) => {
      let current = getNodeById(nodeId);
      while (current && current.parentId) current = getNodeById(current.parentId);
      return current;
    };
    
    const collectOpenChildren = (parentNode) =>
      [...parentNode.childrenIds].map((id) => getNodeById(id)).filter(Boolean);

    /* ── Focus management ── */
    const applyFocus = (nodeId) => {
      focusedNodeId = nodeId;
      const index = focusStack.lastIndexOf(nodeId);
      if (index >= 0) focusStack.splice(index, 1);
      focusStack.push(nodeId);
      logEvent("focus_change", { nodeId });
      emit("focus:changed", { nodeId });
    };

    /* ── Active layer class toggle ── */
    const updateActiveClasses = () => {
      nodes.forEach((record) => {
        const kindDef = nodeKinds.getKind(record.kind);
        if (kindDef && !kindDef.modal) {
          const root = getModuleRoot(record.id);
          const isActive = root && root.id === activeLayerId;
          record.element.classList.toggle("is-active-layer", isActive);
        }
      });
    };

    /* ── Z-index recalculation (3 fasi) ── */
    const updateZIndexes = () => {
      // Fase 1: assegnazione base per ordine moduli
      const orderedRoots = moduleOrder
        .map((moduleId) => getNodeById(moduleIndex.get(moduleId)))
        .filter(Boolean);

      orderedRoots.forEach((rootNode, moduleIdx) => {
        const base = 200 + moduleIdx * 200;
        const assign = (nodeId, depth, offset) => {
          const record = getNodeById(nodeId);
          if (!record) return;
          record.zIndex = base + depth * 10 + offset;
          record.element.style.zIndex = String(record.zIndex);
          const children = [...record.childrenIds]
            .map((id) => getNodeById(id)).filter(Boolean)
            .sort((a, b) => a.sequence - b.sequence);
          children.forEach((child, idx) => assign(child.id, depth + 1, idx + 1));
        };
        assign(rootNode.id, 0, 0);
      });

      // Fase 2: boost z-index per il nodo focalizzato
      if (focusedNodeId) {
        const focusedRecord = getNodeById(focusedNodeId);
        if (focusedRecord) {
          const focusedRoot = getModuleRoot(focusedNodeId);
          if (focusedRoot) {
            const moduleIdx = moduleOrder.lastIndexOf(focusedRoot.moduleId);
            const base = 200 + moduleIdx * 200;
            focusedRecord.zIndex = base + 150;
            focusedRecord.element.style.zIndex = String(focusedRecord.zIndex);
          }
        }
      }

      // Fase 3: flow visibility
      if (focusedNodeId) {
        const activeFlowIds = new Set();
        // Walk up: focused → ancestors → root
        let walkUp = focusedNodeId;
        while (walkUp) {
          activeFlowIds.add(walkUp);
          const rec = getNodeById(walkUp);
          walkUp = rec?.parentId || null;
        }
        // Walk down: all descendants
        const addDescendants = (nid) => {
          const rec = getNodeById(nid);
          if (!rec) return;
          for (const childId of rec.childrenIds) {
            activeFlowIds.add(childId);
            addDescendants(childId);
          }
        };
        addDescendants(focusedNodeId);

        // Hide overlay nodes not in active flow
        const focusedRoot = getModuleRoot(focusedNodeId);
        if (focusedRoot) {
          nodes.forEach((record) => {
            if (getModuleRoot(record.id)?.id !== focusedRoot.id) return;
            const isOverlay = record.kind !== "fullscreen";
            if (isOverlay && !activeFlowIds.has(record.id)) {
              record.element.classList.add("is-flow-hidden");
            } else {
              record.element.classList.remove("is-flow-hidden");
            }
          });
        }
      }

      updateActiveClasses();
    };

    /* ── Node registration ── */
    const registerNode = (record) => {
      nodes.set(record.id, record);
      if (record.parentId) {
        const parent = getNodeById(record.parentId);
        parent?.childrenIds.add(record.id);
      } else {
        moduleIndex.set(record.moduleId, record.id);
        moduleOrder.push(record.moduleId);
      }
      applyFocus(record.id);
      const root = getModuleRoot(record.id);
      if (root) {
        activeLayerId = root.id;
        const idx = moduleOrder.lastIndexOf(root.moduleId);
        if (idx >= 0) {
          moduleOrder.splice(idx, 1);
          moduleOrder.push(root.moduleId);
        }
      }
      updateZIndexes();
    };

    const newId = () => idFactory({ usedIds, length: 32 });

    /* ── Node creation (DOM + state + content) ── */
    const createRecord = ({ id, title, moduleId, nodeType, kind, parentId, contentKey, contentData }) => {
      const openedAt = new Date().toISOString();
      sequence += 1;

      const kindDef = nodeKinds.getKind(kind);
      const element = nodeFactory({
        nodeId: id, title, moduleKey: moduleId, nodeType, kind,
        kindDef, parentId, openedAt, zIndex: 1,
      });

      // Render content into body slot
      const bodySlot = element.querySelector(".node-body");
      if (bodySlot && contentKey) {
        contentRegistry.renderInto(contentKey, bodySlot, {
          nodeId: id, parentId, moduleId, kind, nodeType,
          contentData: contentData || {},
        });
      }

      rootNode.appendChild(element);

      // Resolve focusMode: explicit override > kindDef default > "locked"
      const resolvedFocusMode =
        (contentData && contentData.focusMode) || (kindDef && kindDef.focusMode) || "locked";

      return {
        id, moduleId, title, nodeType, kind, focusMode: resolvedFocusMode,
        parentId: parentId || null, childrenIds: new Set(),
        contentKey: contentKey || null, isOpen: true, openedAt,
        zIndex: 1, sequence, element,
      };
    };

    /* ── activateLayer ── */
    const activateLayer = (layerId, options = {}) => {
      const target = getNodeById(layerId);
      if (!target) return null;
      const root = getModuleRoot(layerId);
      if (!root) return null;

      const index = moduleOrder.lastIndexOf(root.moduleId);
      if (index >= 0) { moduleOrder.splice(index, 1); moduleOrder.push(root.moduleId); }
      activeLayerId = root.id;

      if (options.forceFocus) {
        applyFocus(layerId);
      } else {
        const candidates = focusStack
          .map((id) => getNodeById(id))
          .filter((r) => r && getModuleRoot(r.id)?.id === root.id);
        const focusTarget = candidates[candidates.length - 1] || root;
        applyFocus(focusTarget.id);
      }

      updateZIndexes();
      logEvent("layer_activated", { layerId: root.id, moduleId: root.moduleId });
      emit("layer:activated", { layerId: root.id, moduleId: root.moduleId });
      emit("state:changed", {});
      return root.id;
    };

    /* ── openModule ── */
    const openModule = (moduleId, title) => {
      if (openGuard) return null;
      const definition = moduleRegistry.getModuleDefinition(moduleId);
      if (!definition) return null;

      // Se già aperto, riattiva
      const existingId = moduleIndex.get(moduleId);
      if (existingId) {
        activateLayer(existingId);
        logEvent("module_reactivated", { moduleId, layerId: existingId });
        emit("module:reactivated", { moduleId, layerId: existingId });
        return existingId;
      }

      openGuard = true;
      const nodeId = newId();
      const contentKey = definition.contentKey || `${moduleId}-module`;

      const record = createRecord({
        id: nodeId, title: title || definition.name, moduleId,
        nodeType: "module", kind: "fullscreen", parentId: null,
        contentKey, contentData: { moduleId },
      });

      registerNode(record);
      logEvent("module_opened", { moduleId, layerId: record.id });
      emit("module:opened", { moduleId, layerId: record.id });
      emit("state:changed", {});
      openGuard = false;
      return record.id;
    };

    /* ── openChild ── */
    const openChild = (parentId, options = {}) => {
      if (openGuard) return null;
      const parentNode = getNodeById(parentId);
      if (!parentNode) return null;

      const kind = options.kind || "fullscreen";

      // Validate kind
      if (!nodeKinds.isValidKind(kind)) {
        logEvent("child_open_blocked", { parentId, reason: "invalid_kind", kind });
        emit("action:blocked", { action: "open_child", parentId, reason: "invalid_kind", kind });
        return null;
      }

      // Check nesting policy
      const openChildren = collectOpenChildren(parentNode);
      const policyResult = nestingPolicy.canOpenChild(parentNode.kind, kind, openChildren);
      if (!policyResult.allowed) {
        logEvent("child_open_blocked", { parentId, reason: policyResult.reason, kind });
        emit("action:blocked", { action: "open_child", parentId, reason: policyResult.reason, kind });
        return null;
      }

      openGuard = true;
      const moduleId = parentNode.moduleId;
      const kindDef = nodeKinds.getKind(kind);
      const childTitle = options.title || `${kindDef.label} ${moduleId}`;

      const nodeId = newId();
      const record = createRecord({
        id: nodeId, title: childTitle, moduleId,
        nodeType: "child", kind, parentId,
        contentKey: options.contentKey || null,
        contentData: options.contentData || {},
      });

      registerNode(record);
      logEvent("child_opened", { parentId, childId: record.id, kind, contentKey: options.contentKey });
      emit("child:opened", { parentId, childId: record.id, kind, contentKey: options.contentKey });
      emit("state:changed", {});
      openGuard = false;
      return record.id;
    };

    /* ── removeNodeRecursive (internal) ── */
    const removeNodeRecursive = (nodeId) => {
      const target = getNodeById(nodeId);
      if (!target) return [];

      const closed = [];
      for (const childId of [...target.childrenIds]) {
        closed.push(...removeNodeRecursive(childId));
      }

      // Content cleanup
      if (target.contentKey) {
        const body = target.element.querySelector(".node-body");
        if (body) contentRegistry.destroyIn(target.contentKey, body);
      }

      if (target.parentId) {
        const parent = getNodeById(target.parentId);
        parent?.childrenIds.delete(target.id);
      } else {
        moduleIndex.delete(target.moduleId);
        const idx = moduleOrder.lastIndexOf(target.moduleId);
        if (idx >= 0) moduleOrder.splice(idx, 1);
      }

      target.element.remove();
      nodes.delete(target.id);
      const focusIdx = focusStack.lastIndexOf(target.id);
      if (focusIdx >= 0) focusStack.splice(focusIdx, 1);
      closed.push(target);
      return closed;
    };

    /* ── closeNode ── */
    const closeNode = (nodeId) => {
      const target = getNodeById(nodeId);
      if (!target) return { closed: false, reason: "not_found" };

      // Moduli con figli aperti: blocca chiusura
      if (target.nodeType === "module" && target.childrenIds.size > 0) {
        logEvent("module_close_blocked", { nodeId, reason: "children_open" });
        emit("action:blocked", { action: "close_module", nodeId, reason: "children_open", title: target.title });
        return { closed: false, reason: "children_open" };
      }

      const closedNodes = removeNodeRecursive(nodeId);

      // Focus fallback
      if (target.parentId && getNodeById(target.parentId)) {
        applyFocus(target.parentId);
      } else {
        focusedNodeId = focusStack[focusStack.length - 1] || null;
      }
      if (!focusedNodeId && moduleOrder.length > 0) {
        const fallbackModule = moduleOrder[moduleOrder.length - 1];
        focusedNodeId = moduleIndex.get(fallbackModule) || null;
      }
      if (target.nodeType === "module") {
        activeLayerId = moduleOrder.length > 0
          ? moduleIndex.get(moduleOrder[moduleOrder.length - 1]) || null
          : null;
      }

      updateZIndexes();
      logEvent("node_closed", { nodeId, closedCount: closedNodes.length });
      emit("node:closed", {
        nodeId, title: target.title, nodeType: target.nodeType,
        kind: target.kind, closedCount: closedNodes.length,
      });
      emit("state:changed", {});
      return { closed: true, reason: "ok" };
    };

    /* ── closeTopNode ── */
    const closeTopNode = () => {
      const activeRoot = activeLayerId ? getNodeById(activeLayerId) : null;
      if (!activeRoot) {
        const topId = focusStack[focusStack.length - 1];
        if (!topId) return { closed: false, reason: "empty" };
        return closeNode(topId);
      }
      for (let i = focusStack.length - 1; i >= 0; i--) {
        const candidate = getNodeById(focusStack[i]);
        if (candidate) {
          const root = getModuleRoot(candidate.id);
          if (root && root.id === activeLayerId) return closeNode(candidate.id);
        }
      }
      return { closed: false, reason: "no_closable_in_active" };
    };

    /* ── closeNodeByElement ── */
    const closeNodeByElement = (element) => {
      if (!(element instanceof Element)) return { closed: false, reason: "invalid" };
      const nodeId = element.getAttribute("data-node-id") ||
                     element.closest("[data-node-id]")?.getAttribute("data-node-id");
      if (!nodeId) return { closed: false, reason: "not_found" };
      return closeNode(nodeId);
    };

    /* ── getSnapshot ── */
    const getSnapshot = () => {
      const nodesSnap = [...nodes.values()].map((r) => ({
        id: r.id, moduleId: r.moduleId, title: r.title, nodeType: r.nodeType,
        kind: r.kind, focusMode: r.focusMode, parentId: r.parentId,
        childrenIds: [...r.childrenIds], contentKey: r.contentKey,
        zIndex: r.zIndex, isOpen: r.isOpen,
      }));
      const menu = moduleRegistry.listModuleDefinitions().map((m) => {
        const layerId = moduleIndex.get(m.key) || null;
        return { moduleId: m.key, title: m.name, icon: m.icon || null, open: Boolean(layerId), layerId };
      });
      return {
        activeLayerId, focusedNodeId, focusStack: [...focusStack],
        openLayerIds: [...moduleOrder].map((mid) => moduleIndex.get(mid)).filter(Boolean),
        nodes: nodesSnap, menu, events: [...events],
      };
    };

    return {
      on, openModule, openChild, activateLayer,
      closeNode, closeTopNode, closeNodeByElement, getSnapshot,
    };
  };

  globalObject.layerManager = { createLayerManager };
})(window);
```

---

## 12. Modulo 9: Module Registry

**File**: `js/modules/module-registry.js`  
**Espone**: `window.layerModules`

Definizioni pure dei moduli. Ogni modulo ha key, name, color, icon SVG e flag `singleActive`.

### Schema

```javascript
(function attachModuleRegistry(globalObject) {
  "use strict";

  const MODULE_DEFINITIONS = [
    {
      key: "pazienti",          // Identificatore unico
      name: "Pazienti",         // Label display
      color: "#2C6E8A",         // Colore identitario
      icon: '<svg>...</svg>',   // Icona SVG inline
      singleActive: true,       // Solo un'istanza alla volta
      // contentKey: "custom-key" // Opzionale: chiave provider custom
    },
    // ... altri moduli
  ];

  const getModuleDefinition = (moduleKey) =>
    MODULE_DEFINITIONS.find((m) => m.key === moduleKey) || null;

  const listModuleDefinitions = () => [...MODULE_DEFINITIONS];

  globalObject.layerModules = Object.freeze({
    getModuleDefinition, listModuleDefinitions,
  });
})(window);
```

### Proprietà di un modulo

| Proprietà | Tipo | Obbligatoria | Descrizione |
|---|---|---|---|
| `key` | `string` | sì | Identificatore unico (usato come `moduleId`) |
| `name` | `string` | sì | Nome visualizzato nella UI |
| `color` | `string` | sì | Colore HEX identitario (per badge, CSS vars) |
| `icon` | `string` | sì | SVG inline per la griglia moduli |
| `singleActive` | `boolean` | no | Se `true`, una sola istanza per volta (default) |
| `contentKey` | `string` | no | Chiave content provider custom. Se omesso: `"<key>-module"` |

### Convenzione contentKey

Se il modulo non ha `contentKey` esplicito, il layer-manager usa `"<key>-module"` come chiave.
Es. modulo con `key: "pazienti"` → cerca il provider `"pazienti-module"`.

---

## 13. Modulo 10: Module Renderer

**File**: `js/modules/module-renderer.js`  
**Espone**: Registra provider nel `contentRegistry` (nessuna API pubblica propria)

Registra automaticamente:
- Un content provider `"<moduleKey>-module"` per ogni modulo (tranne quelli con provider custom)
- Content provider generici: `"generic-fullscreen"`, `"generic-panel"`, `"generic-modal"`, `"generic-sheet"`, `"generic-drawer"`, `"generic-wizard"`

### Schema

```javascript
(function attachContentProviders(globalObject) {
  "use strict";

  const esc = (v) => globalObject.libUtils.escapeHtml(v);
  const registry = globalObject.contentRegistry;

  // Bottoni azione basati sulla nesting policy
  const buildActionButtons = (context) => {
    const { nodeId, moduleId, kind } = context;
    const rule = globalObject.nestingPolicy.getRuleForParent(kind);
    if (!rule || rule.allowedChildKinds.length === 0) {
      return '<p class="node-help">Nodo terminale.</p>';
    }
    const actions = rule.allowedChildKinds.map((childKind) => {
      const icon = globalObject.svgIcons?.get(`action-${childKind}`) || "";
      return `<button class="node-action-button" type="button"
        data-action="open-child"
        data-parent-id="${esc(nodeId)}"
        data-child-kind="${esc(childKind)}"
        data-content-key="generic-${esc(childKind)}"
        data-module-key="${esc(moduleId)}"
      >${icon} Apri ${childKind}</button>`;
    });
    return `<div class="node-actions">${actions.join("")}</div>`;
  };

  // Registra provider per ogni modulo
  const modules = globalObject.layerModules?.listModuleDefinitions() || [];
  modules.forEach((mod) => {
    // Salta moduli con provider custom
    if (mod.key === "pazienti") return;

    registry.register(`${mod.key}-module`, {
      label: mod.name,
      render: (container, context) => {
        container.innerHTML = `
          <p class="node-help">Modulo ${esc(mod.name)}</p>
          ${buildActionButtons(context)}
        `;
      },
    });
  });

  // Provider generici per child nodes
  ["fullscreen", "panel", "modal", "sheet", "drawer", "wizard"].forEach((kindKey) => {
    registry.register(`generic-${kindKey}`, {
      label: `Generic ${kindKey}`,
      render: (container, context) => {
        container.innerHTML = `
          <p class="node-help">${kindKey} child (module: ${esc(context.moduleId)})</p>
          ${buildActionButtons(context)}
        `;
      },
    });
  });
})(window);
```

---

## 14. Modulo 11: App — Applicazione principale

**File**: `js/app.js`

Responsabile di:
1. **Inizializzare il LayerManager** con le dipendenze
2. **Gestire la UI della Libreria** (overlay a 3 colonne)
3. **Delegare eventi** (click, keyboard) al manager
4. **Renderizzare il tree** dei nodi

### Inizializzazione

```javascript
document.addEventListener("DOMContentLoaded", () => {
  // Riferimenti DOM
  const workspaceRoot = document.getElementById("workspaceRoot");
  const libraryOverlay = document.getElementById("libraryOverlay");
  // ... altri elementi

  // Creazione manager
  const manager = window.layerManager.createLayerManager({
    idFactory: window.layerIdUtils.generateUniqueLayerId,
    nodeFactory: window.layerTemplate.createNodeElement,
    moduleRegistry: window.layerModules,
    contentRegistry: window.contentRegistry,
    nestingPolicy: window.nestingPolicy,
    nodeKinds: window.nodeKinds,
    rootNode: workspaceRoot,
  });

  // Esponi globalmente per debug
  window.__layerManager = manager;

  // ... gestione eventi, rendering, etc.
});
```

### Gestione eventi delegata

L'app usa un **singolo listener click** su `document` con pattern `data-action`:

```javascript
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  switch (target.dataset.action) {
    case "close-node":
    case "close-module":
      manager.closeNode(target.dataset.nodeId);
      break;

    case "open-module":
      manager.openModule(target.dataset.moduleId);
      break;

    case "open-child":
      manager.openChild(target.dataset.parentId, {
        kind: target.dataset.childKind,
        contentKey: target.dataset.contentKey,
        title: target.dataset.title,
        contentData: { moduleId: target.dataset.moduleKey },
      });
      break;

    case "focus-node":
      // Logica focusMode: drill to leaf se locked
      handleFocusNode(target.dataset.nodeId, target.dataset.focusMode);
      break;

    case "open-library":
      setLibraryOpen(true);
      break;
  }
});
```

### Keyboard shortcuts

```javascript
document.addEventListener("keydown", (event) => {
  // Ctrl+L → Toggle libreria
  if (event.ctrlKey && event.key.toLowerCase() === "l") {
    event.preventDefault();
    toggleLibrary();
  }
  // Escape → Chiudi libreria o nodo in cima
  if (event.key === "Escape") {
    if (isLibraryOpen()) { setLibraryOpen(false); return; }
    manager.closeTopNode();
  }
});
```

### Focus trap per la libreria

```javascript
const trapFocus = (container) => {
  const getFocusable = () =>
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

  const handler = (e) => {
    if (e.key !== "Tab") return;
    const focusable = getFocusable();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  };

  container.addEventListener("keydown", handler);
  return () => container.removeEventListener("keydown", handler);
};
```

---

## 15. Sistema CSS completo

### CSS Custom Properties (variabili) — root

```css
:root {
  /* Layer system palette */
  --lib-bg: #ffffff;
  --lib-text: #111111;
  --lib-line: #ececec;
  --lib-muted: #666666;
  --lib-accent: #2563eb;
  --lib-accent-light: #dbeafe;
  --lib-danger: #dc2626;
  --lib-success: #16a34a;

  /* Tree */
  --tree-card-hover: #EEE9DF;
  --tree-card-active: #EEE9DF;
  --tree-card-focused: #EEE9DF;

  /* Module identity colors (una per modulo) */
  --mod-pazienti: #2C6E8A;
  --mod-ambulatorio: #6BAAAE;
  /* ... */
}
```

### Workspace root

```css
.workspace-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
```

### Nodi — Base condivisa

```css
.node-layer,
.node-modal,
.node-panel,
.node-sheet,
.node-drawer,
.node-wizard {
  position: fixed;
  inset: 0;
  pointer-events: auto;
}
```

### Fullscreen (`.node-layer`)

```css
.node-layer {
  background: #fff;
  padding: 1rem;
  animation: layerFadeIn 150ms ease;
  transition: opacity 200ms ease, box-shadow 200ms ease;
}
.node-layer.is-active-layer {
  box-shadow: inset 4px 0 0 0 var(--lib-accent);
}
.node-layer:not(.is-active-layer) {
  opacity: 0.55;
}
```

### Modal (`.node-modal`)

```css
.node-modal {
  background: rgba(17, 17, 17, 0.35);
  display: grid;
  place-items: center;
  padding: 1rem;
  animation: modalScaleIn 200ms ease;
}
.node-modal .node-content {
  width: min(520px, 100%);
  animation: modalContentIn 200ms ease;
}
```

### Panel (`.node-panel`)

```css
.node-panel {
  inset: 0 0 0 auto;
  width: min(480px, 85%);
  background: #fff;
  border-left: 1px solid var(--lib-line);
  padding: 1rem;
  animation: panelSlideIn 200ms ease;
  transition: opacity 200ms ease, box-shadow 200ms ease;
}
.node-panel .node-content { width: 100%; }
```

### Sheet (`.node-sheet`)

```css
.node-sheet {
  inset: auto 0 0 0;
  top: 30%;
  background: rgba(17, 17, 17, 0.25);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  animation: sheetSlideUp 250ms ease;
}
.node-sheet .node-content {
  width: min(700px, 100%);
  border-radius: 12px 12px 0 0;
  border-bottom: none;
  max-height: 70vh;
  overflow-y: auto;
  animation: sheetContentUp 250ms ease;
}
```

### Drawer (`.node-drawer`)

```css
.node-drawer {
  inset: 0 auto 0 0;
  width: min(360px, 80%);
  background: #fff;
  border-right: 1px solid var(--lib-line);
  padding: 1rem;
  animation: drawerSlideIn 200ms ease;
  transition: opacity 200ms ease;
}
.node-drawer .node-content { width: 100%; }
```

### Wizard (`.node-wizard`)

```css
.node-wizard {
  background: rgba(17, 17, 17, 0.45);
  display: grid;
  place-items: center;
  padding: 1rem;
  animation: modalScaleIn 200ms ease;
}
.node-wizard .node-content {
  width: min(720px, 95%);
  min-height: 400px;
  animation: modalContentIn 200ms ease;
}
```

### Contenuto del nodo

```css
.node-content {
  width: min(900px, 100%);
  border: 1px solid var(--lib-line);
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
}
.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.node-body {
  margin-top: 1rem;
  border-top: 1px solid var(--lib-line);
  padding-top: 1rem;
}
```

### Flow visibility

```css
.is-flow-hidden {
  visibility: hidden !important;
  pointer-events: none !important;
}
```

### Animazioni keyframe

```css
@keyframes layerFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes modalScaleIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes modalContentIn {
  from { opacity: 0; transform: scale(0.95) translateY(6px); }
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
@keyframes sheetContentUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes drawerSlideIn {
  from { opacity: 0; transform: translateX(-24px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### Toast

```css
.toast-container {
  position: fixed;
  bottom: 1.2rem;
  right: 1.2rem;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}
.toast {
  background: #1e293b;
  color: #f8fafc;
  padding: 0.65rem 1.1rem;
  border-radius: 10px;
  font-size: 0.88rem;
  pointer-events: auto;
  max-width: 360px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: toastIn 200ms ease;
}
.toast-warning { background: #92400e; color: #fef3c7; }
.toast-error { background: var(--lib-danger); color: #fff; }
.toast-success { background: var(--lib-success); color: #fff; }
.toast-exit { animation: toastOut 200ms ease forwards; }

@keyframes toastIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes toastOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(8px); }
}
```

### Library overlay

```css
.library-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.97);
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 200ms ease, visibility 200ms;
}
.library-overlay.is-open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
.library-shell {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(750px, 1fr) 1fr 1fr;
  gap: 0;
  animation: shellSlideIn 200ms ease;
}

@keyframes shellSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Tree view (nested UL/LI con connettori arrotondati)

```css
.tree-view {
  --tree-indent: 1.1rem;
  --tree-line-w: 1px;
  --tree-line-color: #dcdce0;
  --tree-radius: 6px;
  margin: 0; padding: 0; list-style: none;
}
.tree-view ul {
  margin: 0; padding-left: var(--tree-indent); list-style: none;
}
/* Linea verticale */
.tree-view li {
  position: relative;
  padding-left: var(--tree-indent);
  border-left: var(--tree-line-w) solid var(--tree-line-color);
}
.tree-view li:last-child { border-color: transparent; }

/* Connettore orizzontale ├ */
.tree-view li::before {
  content: "";
  display: block;
  position: absolute;
  top: calc(var(--tree-indent) / 2);
  left: calc(var(--tree-line-w) * -1);
  width: var(--tree-indent);
  height: 0;
  border-top: var(--tree-line-w) solid var(--tree-line-color);
}
/* Ultimo figlio: arrotondato └ */
.tree-view li:last-child::before {
  border-top: none;
  border-left: var(--tree-line-w) solid var(--tree-line-color);
  border-bottom: var(--tree-line-w) solid var(--tree-line-color);
  height: calc(var(--tree-indent) / 2);
  top: 0;
  border-bottom-left-radius: var(--tree-radius);
}
/* Root: nessun connettore */
.tree-view > li { padding-left: 0; border-left: none; }
.tree-view > li::before { display: none; }
```

---

## 16. HTML Shell

### Struttura minima

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Layer System</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>

  <!-- Workspace: container per tutti i layer -->
  <div id="workspaceRoot" class="workspace-root"></div>

  <!-- Sidebar con bottone apertura libreria -->
  <button id="openLibraryButton" class="lib-button" type="button">
    Libreria
  </button>

  <!-- Overlay libreria (3 colonne) -->
  <div id="libraryOverlay" class="library-overlay" aria-hidden="true">
    <div class="library-shell">
      <!-- Colonna 1: Quick Launch -->
      <div class="library-col">
        <div id="quickLaunchGrid" class="quick-launch-grid"></div>
      </div>

      <!-- Colonna 2: Moduli aperti -->
      <div class="library-col">
        <div id="openModulesList" class="library-list"></div>
      </div>

      <!-- Colonna 3: Tree -->
      <div class="library-col">
        <div id="moduleTreePanel" class="library-tree"></div>
      </div>
    </div>
  </div>

  <!-- Toast container -->
  <div id="toastContainer" class="toast-container"></div>

  <!-- Scripts (ordine critico!) -->
  <script src="./js/core/id.js" defer></script>
  <script src="./js/core/utils.js" defer></script>
  <script src="./js/core/svg-icons.js" defer></script>
  <script src="./js/layers/node-kinds.js" defer></script>
  <script src="./js/layers/nesting-policy.js" defer></script>
  <script src="./js/content/content-registry.js" defer></script>
  <script src="./js/layers/layer-template.js" defer></script>
  <script src="./js/layers/layer-manager.js" defer></script>
  <script src="./js/modules/module-registry.js" defer></script>
  <script src="./js/modules/module-renderer.js" defer></script>
  <script src="./js/app.js" defer></script>
</body>
</html>
```

---

## 17. Sistema eventi

Il LayerManager emette eventi attraverso un bus interno. I listener si registrano con `manager.on(event, callback)` che ritorna una funzione di unsubscribe.

### Eventi disponibili

| Evento | Payload | Quando |
|---|---|---|
| `module:opened` | `{ moduleId, layerId }` | Modulo aperto per la prima volta |
| `module:reactivated` | `{ moduleId, layerId }` | Modulo già aperto riportato in primo piano |
| `child:opened` | `{ parentId, childId, kind, contentKey }` | Nodo figlio creato |
| `node:closed` | `{ nodeId, title, nodeType, kind, closedCount }` | Nodo chiuso (include count figli in cascata) |
| `layer:activated` | `{ layerId, moduleId }` | Modulo attivato (portato in primo piano) |
| `focus:changed` | `{ nodeId }` | Focus spostato su un nodo |
| `state:changed` | `{}` | Qualsiasi cambio di stato (per re-render UI) |
| `action:blocked` | `{ action, reason, ... }` | Azione bloccata da policy o validazione |

### Esempio di utilizzo

```javascript
// Mostra toast quando un'azione è bloccata
const unsub = manager.on("action:blocked", (data) => {
  const messages = {
    kind_not_allowed: "Tipo child non consentito.",
    max_children: "Max children raggiunto.",
    max_kind: "Limite per questo tipo raggiunto.",
    children_open: "Chiudi prima i child.",
  };
  showToast(messages[data.reason] || data.reason, "warning");
});

// Per rimuovere il listener:
unsub();
```

---

## 18. Z-Index Management

I z-index sono calcolati **automaticamente** dal LayerManager in 3 fasi.

### Fase 1 — Assegnazione base

Per ogni modulo nell'ordine di `moduleOrder`:

```
Base = 200 + (indice modulo × 200)
Nodo = Base + (profondità nell'albero × 10) + offset tra fratelli
```

Il modulo attivo (ultimo in `moduleOrder`) ha sempre la base più alta.

### Fase 2 — Focus boost

Il nodo con focus riceve un boost di **+150** rispetto alla base del suo modulo:

```
focusedNode.zIndex = base + 150
```

Questo garantisce che sia sempre visivamente sopra qualsiasi altro nodo del modulo.

### Fase 3 — Flow visibility

Vedi sezione dedicata sotto.

### Esempio pratico

```
moduleOrder = ["ambulatorio", "pazienti"]

ambulatorio (base=200):  root=200, child1=211
pazienti    (base=400):  root=400, panelA=411, modalB=421

Se modalB ha il focus: modalB.zIndex = 400+150 = 550
```

---

## 19. FocusMode

Ogni nodo ha una proprietà `focusMode` che controlla il comportamento quando viene selezionato dal tree della Libreria.

### `"open"` — Destinazione autonoma

Cliccando il nodo nel tree, si attiva **direttamente lui**.

**Caso d'uso**: un modulo hub (es. "Pazienti") che contiene più istanze parallele.

### `"locked"` — Flusso lineare

Cliccando il nodo nel tree, il sistema cerca la **foglia più profonda** nel suo sotto-albero e attiva quella.

**Caso d'uso**: una scheda paziente con sotto-nodi di dettaglio.

### Risoluzione della priorità

1. **Override esplicito** — `contentData.focusMode` passato a `openChild()`
2. **Default del kind** — definito in `node-kinds.js` (`fullscreen` = `"open"`, tutti gli altri = `"locked"`)

### Algoritmo "trova foglia"

```javascript
function findDeepestLeaf(nodeId, nodeMap) {
  const node = nodeMap.get(nodeId);
  if (!node || node.childrenIds.length === 0) return nodeId;
  // Sceglie l'ultimo figlio (il più recente)
  return findDeepestLeaf(node.childrenIds[node.childrenIds.length - 1], nodeMap);
}
```

### Esempio

```
Modulo "Pazienti" (fullscreen, focusMode: open)      ← click → attiva Pazienti
  ├── Paziente Rossi (fullscreen, locked)             ← click → attiva Prescrizione
  │     ├── Referti (panel)
  │     └── Prescrizione (modal)                      ← foglia più profonda
  └── Paziente Bianchi (fullscreen, locked)           ← click → attiva Anamnesi
        └── Anamnesi (panel)                          ← foglia
```

---

## 20. Flow Visibility

Quando il focus cambia, il sistema nasconde i nodi **overlay** (non-fullscreen) che non fanno parte del flusso attivo.

### Definizione di "flusso attivo"

Il percorso attivo comprende:
1. **Ancestors** — tutti i nodi dal nodo con focus fino alla root
2. **Il nodo con focus** stesso
3. **Discendenti** — tutti i figli ricorsivi del nodo con focus

### Regola

Per ogni nodo **overlay** (kind ≠ `fullscreen`) dello stesso modulo:
- Se è nel flusso attivo → mostra normalmente
- Se **non** è nel flusso attivo → applica `.is-flow-hidden`

```css
.is-flow-hidden {
  visibility: hidden !important;
  pointer-events: none !important;
}
```

### Esempio

```
Pazienti (root)
├── Paziente A (fullscreen)
├── Paziente B (fullscreen)
│   └── Modal B              ← visibile solo se B o Modal B ha focus
└── Paziente C (fullscreen)
    └── Sheet C              ← visibile solo se C o Sheet C ha focus

Focus su Modal B → Sheet C = hidden
Focus su Sheet C → Modal B = hidden
Focus su Pazienti → entrambi hidden
```

---

## 21. Overlay Libreria — UI a 3 colonne

### Attivazione

- **Ctrl+L** → Toggle apertura/chiusura
- **Pulsante** "Richiama Libreria" dentro un nodo fullscreen
- **Escape** → Chiude la libreria se aperta

### Layout

```
┌─────────────────────┬─────────────────┬─────────────────┐
│  Colonna 1          │  Colonna 2      │  Colonna 3      │
│  Quick Launch       │  Moduli aperti  │  Tree           │
│  (griglia moduli)   │  (lista)        │  (albero nodi)  │
│  min 750px          │  1fr            │  1fr            │
└─────────────────────┴─────────────────┴─────────────────┘
```

### Colonna 1 — Quick Launch

- Griglia 3×N con un pulsante per ogni modulo registrato
- Mostra: numero progressivo, nome, icona SVG, descrizione  
- Moduli già aperti: disabled con opacità ridotta
- Ultimo slot: "Chiudi Libreria" (hover rosso)

### Colonna 2 — Moduli aperti

- Lista verticale dei moduli attualmente aperti
- Badge icona con colore identitario del modulo
- Click → seleziona il modulo per mostrare il tree in colonna 3
- Stato `.is-selected`: sfondo scuro, testo bianco

### Colonna 3 — Tree

- Albero gerarchico dei nodi del modulo selezionato
- Struttura `<ul>/<li>` ricorsiva con connettori CSS arrotondati
- Ogni nodo mostra: titolo, icone per tipo/kind/focusMode/active/focused
- Click → applica logica focusMode e chiude la libreria

### Comportamento riapertura

Quando si chiude un **modulo** (non un child), se ci sono ancora altri moduli aperti, la libreria si riapre automaticamente.

---

## 22. Pattern di utilizzo

### Pattern 1: Hub module + sub-flow children

Il pattern consigliato per moduli multi-istanza:

```javascript
// 1. Registra il modulo
// module-registry.js
{ key: "pazienti", name: "Pazienti", color: "#2C6E8A", icon: "...", singleActive: true }

// 2. Registra il content provider hub (focusMode: open)
contentRegistry.register("pazienti-module", {
  label: "Pazienti",
  render(container, context) {
    // Dashboard, ricerca, liste...
    // Click su paziente → openChild fullscreen
  },
});

// 3. Nelle azioni del provider, apri child con focusMode: locked
manager.openChild(parentId, {
  kind: "fullscreen",
  title: "Paziente Mario Rossi",
  contentKey: "paziente-detail",
  contentData: { patientId: "123", focusMode: "locked" },
});
```

### Pattern 2: Modale semplice da qualsiasi nodo

```javascript
// Da un bottone nel content provider
manager.openChild(context.nodeId, {
  kind: "modal",
  title: "Conferma eliminazione",
  contentKey: "confirm-dialog",
  contentData: { message: "Sei sicuro?", onConfirm: () => { /* ... */ } },
});
```

### Pattern 3: Content provider con cleanup

```javascript
contentRegistry.register("live-data", {
  label: "Dati live",
  render(container, context) {
    const intervalId = setInterval(() => {
      container.querySelector(".count").textContent = Date.now();
    }, 1000);
    // Salva riferimento per cleanup
    container._intervalId = intervalId;
  },
  destroy(container) {
    clearInterval(container._intervalId);
  },
});
```

### Pattern 4: Data attributes per azioni nei template

I content provider rendono HTML con `data-action` e `data-*` attributes. L'event delegation in `app.js` gestisce tutto:

```html
<!-- Nel render() di un content provider -->
<button
  data-action="open-child"
  data-parent-id="${nodeId}"
  data-child-kind="modal"
  data-content-key="edit-form"
  data-module-key="${moduleId}"
  data-title="Modifica paziente"
>
  Modifica
</button>
```

---

## 23. Checklist per la replicazione

### File da creare (in ordine)

- [ ] `js/core/id.js` — ID factory con `crypto.getRandomValues`
- [ ] `js/core/utils.js` — `escapeHtml()` + `showToast()`
- [ ] `js/core/svg-icons.js` — Dizionario SVG (almeno `close` e le 6 `action-*`)
- [ ] `js/layers/node-kinds.js` — 6 kind: fullscreen, panel, modal, sheet, drawer, wizard
- [ ] `js/layers/nesting-policy.js` — Matrice regole parent→child
- [ ] `js/content/content-registry.js` — Registro provider con lifecycle render/destroy
- [ ] `js/layers/layer-template.js` — Generatore DOM (`<section>` con header + body)
- [ ] `js/layers/layer-manager.js` — Motore centrale completo
- [ ] `js/modules/module-registry.js` — Definizioni moduli (key, name, color, icon)
- [ ] `js/modules/module-renderer.js` — Provider auto-registrati per ogni modulo
- [ ] `js/app.js` — Init, eventi, rendering libreria
- [ ] `styles.css` — Tutto il CSS (variabili, nodi, libreria, tree, toast, animazioni)
- [ ] `index.html` — Shell con workspace root, overlay, toast container

### Validazione

- [ ] I moduli si aprono e si vedono a schermo intero
- [ ] I child si aprono con le animazioni corrette per ogni kind
- [ ] La nesting policy blocca aperture non consentite (con toast)
- [ ] I z-index sono auto-calcolati (modulo attivo sopra, focus boost)
- [ ] Il flow visibility nasconde overlay fuori dal flusso attivo
- [ ] Il tree mostra la gerarchia corretta con connettori arrotondati
- [ ] FocusMode `open` attiva il nodo diretto, `locked` drill-down alla foglia
- [ ] Ctrl+L apre/chiude la libreria
- [ ] Escape chiude il nodo in cima o la libreria
- [ ] Chiusura modulo con figli aperti è bloccata
- [ ] Chiusura child è ricorsiva (chiude sotto-figli)
- [ ] Il cleanup `destroy()` dei content provider viene chiamato alla chiusura
- [ ] I toast appaiono e si auto-rimuovono dopo 2800ms

### Anti-pattern da evitare

| ❌ Da evitare | ✅ Fare invece |
|---|---|
| Z-index manuali | Lasciare che il manager calcoli tutto |
| Creare nodi DOM direttamente | Usare `manager.openChild()` / `manager.openModule()` |
| Stato distribuito | Unica fonte di verità: `manager.getSnapshot()` |
| Event listener per ogni bottone | Event delegation con `data-action` |
| `autofocus` su HTML dinamico | `setTimeout(() => el.focus(), 50)` |
| Framework/librerie esterne | Vanilla JS + CSS nativo |
| CSS `overflow-y: auto` sul container nodo | Scroll nel `.node-body`, container con `overflow: hidden` |

---

## Appendice A: Diagramma flusso apertura nodo

```
openChild(parentId, { kind, contentKey, contentData })
  │
  ├─ parentNode esiste? ──no──→ return null
  │
  ├─ kind valido (nodeKinds)? ──no──→ emit action:blocked + return null
  │
  ├─ nesting policy permette? ──no──→ emit action:blocked + return null
  │
  ├─ Genera ID univoco
  ├─ Crea elemento DOM (nodeFactory)
  ├─ Renderizza contenuto (.node-body via contentRegistry)
  ├─ Appendi al rootNode
  ├─ Risolvi focusMode (override > kind default)
  ├─ Registra nel state (nodes, childrenIds, focusStack)
  ├─ Ricalcola z-index + flow visibility
  ├─ Emetti child:opened + state:changed
  └─ return childId
```

## Appendice B: Diagramma flusso chiusura nodo

```
closeNode(nodeId)
  │
  ├─ Nodo esiste? ──no──→ return { closed: false, reason: "not_found" }
  │
  ├─ È modulo con figli aperti? ──sì──→ emit action:blocked + return { closed: false }
  │
  ├─ removeNodeRecursive(nodeId)
  │     ├─ Per ogni figlio: removeNodeRecursive(childId)
  │     ├─ Chiama contentRegistry.destroyIn()
  │     ├─ Rimuovi da parent.childrenIds
  │     ├─ Rimuovi elemento DOM
  │     ├─ Rimuovi da nodes Map e focusStack
  │     └─ return [closedNodes]
  │
  ├─ Focus fallback: parent → last in focusStack → null
  ├─ Se era modulo: aggiorna activeLayerId
  ├─ Ricalcola z-index
  ├─ Emetti node:closed + state:changed
  └─ return { closed: true, reason: "ok" }
```
