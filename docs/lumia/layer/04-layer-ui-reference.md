# 04 — Layer UI Reference (Struttura Completa)

> Documento di riferimento per ricostruire il layer fullscreen con sidebar, menu, area contenuto, breadcrumb. Include HTML generato, classi CSS, varianti, nesting.

---

## 1. Architettura DOM di un Layer Fullscreen

Ogni modulo aperto produce questa struttura DOM:

```
<section class="node-layer" data-node-id="node-1-m3x…" data-kind="fullscreen">
  └─ <div class="node-content">
       └─ <div class="node-body">
            └─ [contenuto iniettato dal Content Provider]
                 └─ <div class="layer-layout">
                      ├─ <nav class="layer-sidebar">
                      │    ├─ .layer-module-icon      ← icona modulo (top)
                      │    ├─ .layer-menu-section      ← tab navigazione (center)
                      │    └─ .layer-nav-functions     ← library + close (bottom)
                      │
                      └─ <div class="layer-main">
                           └─ <div class="layer-main-content">
                                └─ [contenuto del tab attivo]
                           </div>
                      </div>
                 </div>
       └─ <div class="layer-breadcrumb">  ← overlay bottom-right
            <span class="bc-seg">Anagrafiche</span>
            <span class="bc-sep">/</span>
            <span class="bc-seg">Rossi Mario — RSSMRA…</span>
       </div>
```

### Nota: fullscreen vs modal/panel/sheet

| Tipo | Classe sezione | Header automatico | Sidebar | Breadcrumb |
|------|---------------|-------------------|---------|------------|
| `fullscreen` | `.node-layer` | NO (il modulo gestisce tutto) | SÌ (`.layer-sidebar`) | SÌ |
| `modal` | `.node-modal` | SÌ (`.node-header` + `.node-title`) | NO | NO |
| `panel` | `.node-panel` | SÌ | NO | NO |
| `sheet` | `.node-sheet` | SÌ | NO | NO |

---

## 2. HTML Generato da `buildLayerLayout()`

La funzione `CerusShell.buildLayerLayout(opts)` produce l'HTML della sidebar + area main.

### Parametri

```js
buildLayerLayout({
  badge:     'hgi-user-multiple-02',   // icona HuGeIcons del modulo
  nodeId:    ctx.nodeId,               // ID nodo per il bottone chiudi
  activeTab: 'list',                   // key del tab attivo
  tabs: [
    { key: 'list',   icon: 'hgi-menu-square', title: 'Lista' },
    { key: 'search', icon: 'hgi-search-01',   title: 'Cerca' }
  ]
});
```

### Output HTML

```html
<div class="layer-layout">

  <!-- ═══ SIDEBAR (64px icon rail) ═══ -->
  <nav class="layer-sidebar">

    <!-- Icona modulo (top, non cliccabile) -->
    <div class="layer-module-icon">
      <svg>…</svg>  <!-- CerusIcons.html(badge) -->
    </div>

    <!-- Tab di navigazione (center, flex:1) -->
    <div class="layer-menu-section">
      <button type="button"
              class="layer-sidebar-icon is-active"
              data-tab="list"
              title="Lista">
        <svg>…</svg>
      </button>
      <button type="button"
              class="layer-sidebar-icon"
              data-tab="search"
              title="Cerca">
        <svg>…</svg>
      </button>
    </div>

    <!-- Funzioni fisse (bottom) -->
    <div class="layer-nav-functions">
      <button type="button"
              class="layer-sidebar-icon"
              data-go-library
              title="Libreria">
        <svg>…</svg>  <!-- hgi-grid-view -->
      </button>
      <button type="button"
              class="layer-sidebar-icon"
              data-action="close-node"
              data-node-id="node-1-m3x…"
              title="Chiudi">
        <svg>…</svg>  <!-- hgi-cancel-01 -->
      </button>
    </div>

  </nav>

  <!-- ═══ AREA MAIN ═══ -->
  <div class="layer-main">
    <div class="layer-main-content">
      <!-- Il modulo inietta qui il contenuto del tab -->
    </div>
  </div>

</div>
```

---

## 3. CSS — Sidebar (64px rail)

```css
/* Contenitore 2 colonne */
.layer-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

/* Rail sidebar */
.layer-sidebar {
  width: var(--layer-sidebar-width, 64px);
  flex-shrink: 0;
  background: var(--layer-sidebar-bg, var(--white));
  border-right: 1px solid var(--layer-sidebar-border, var(--border-color));
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

/* Icona modulo (top) — 40×40, non interattiva */
.layer-module-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-400);
  font-size: 22px;
  margin-bottom: 8px;
  pointer-events: none;
  flex-shrink: 0;
}

/* Sezione tab (center) — cresce per occupare lo spazio */
.layer-menu-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
}

/* Funzioni fisse (bottom) — library + close */
.layer-nav-functions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding-bottom: 8px;
}
```

### Bottoni icona sidebar — 36×36

```css
.layer-sidebar-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--layer-sidebar-color, var(--gray-500));
  font-size: 20px;
  border-radius: var(--border-radius-md, 6px);
  cursor: pointer;
  transition: background .12s ease, color .12s ease;
  padding: 0;
}

/* Hover standard */
.layer-sidebar-icon:hover {
  color: var(--layer-sidebar-hover, var(--gray-900));
  background: var(--gray-100);
}

/* Tab attivo */
.layer-sidebar-icon.is-active {
  color: var(--gray-900);
  background: var(--gray-100);
}

/* Hover speciali */
.layer-sidebar-icon[data-action="close-node"]:hover {
  color: var(--error);
  background: rgba(220, 38, 38, 0.08);
}
.layer-sidebar-icon[data-go-library]:hover {
  color: var(--blue-dark);
  background: rgba(40, 112, 148, 0.08);
}
```

---

## 4. CSS — Area Main

```css
.layer-main {
  flex: 1;
  min-width: 0;
  position: relative;
  overflow: hidden;
  background: var(--layer-main-bg, var(--gray-50));
  display: flex;
  flex-direction: column;
}

.layer-main-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: var(--space-lg, 24px);
}
```

### Variante: Submenu opzionale (272px)

Per moduli con sottomenu laterale, il contenuto dentro `.layer-main` si divide:

```html
<div class="layer-main">
  <div class="layer-main-split">
    <aside class="layer-submenu">
      <div class="layer-submenu__header">
        <span class="layer-submenu__title">SEZIONI</span>
      </div>
      <div class="layer-submenu__content">
        <!-- sidebar-tree-item elements -->
      </div>
    </aside>
    <div class="view-area">
      <!-- contenuto -->
    </div>
  </div>
</div>
```

```css
.layer-main-split {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.layer-submenu {
  width: var(--layer-submenu-width, 272px);
  flex-shrink: 0;
  background: var(--surface-2, #f8f9fa);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Collassabile */
.layer-submenu.is-collapsed {
  width: 0;
  opacity: 0;
  border-right-width: 0;
  pointer-events: none;
}

.view-area {
  flex: 1;
  overflow-y: auto;
  min-width: 0;
  min-height: 0;
}
```

---

## 5. CSS — Layer Engine (node-layer, node-modal, …)

### Fullscreen

```css
.node-layer {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  animation: layerFadeIn var(--layer-anim-base, 200ms) ease;
}
```

### Modal

```css
.node-modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(17, 17, 17, 0.35);
  animation: modalScaleIn var(--layer-anim-base) ease;
}

.node-modal > .node-content {
  width: min(580px, 95%);
  max-height: 90vh;
  background: var(--white);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalContentIn var(--layer-anim-slow) ease;
}

/* Variante larga */
.node-modal > .node-content.layer-wide {
  width: min(760px, 95%);
}
```

### Panel (slide da destra)

```css
.node-panel {
  position: fixed;
  inset: 0 0 0 auto;
  width: min(480px, 85%);
  background: var(--white);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: panelSlideIn var(--layer-anim-base) ease;
}
```

### Sheet (slide dal basso)

```css
.node-sheet {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: rgba(17, 17, 17, 0.25);
}

.node-sheet > .node-content {
  width: min(720px, 100%);
  max-height: 75vh;
  margin: 0 auto;
  background: var(--white);
  border-radius: 12px 12px 0 0;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
```

### Struttura interna condivisa

```css
.node-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  position: relative;   /* per il breadcrumb */
}

.node-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header automatico (modal, panel, sheet — NON fullscreen) */
.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  min-height: 44px;
}

.node-title {
  font-size: .8125rem;
  font-weight: 600;
  color: var(--fg);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 150ms ease;
}
.node-close-btn:hover {
  color: var(--error);
  border-color: var(--error);
  background: rgba(220,38,38,.06);
}
```

---

## 6. Breadcrumb Overlay

Il breadcrumb compare automaticamente in basso a destra su tutti i layer fullscreen.

### Generazione (layer-system.js)

```js
function injectBreadcrumb(nodeId) {
  // Risale la catena parentId → costruisce segmenti
  var chain = [];
  var n = nodes[nodeId];
  while (n) {
    chain.unshift(n.title || n.contentKey || n.kind);
    n = n.parentId ? nodes[n.parentId] : null;
  }
  // chain = ['Anagrafiche', 'Rossi Mario — RSSMRA…']

  var crumb = document.createElement('div');
  crumb.className = 'layer-breadcrumb';
  chain.forEach(function(seg, i) {
    if (i > 0) html += '<span class="bc-sep">/</span>';
    html += '<span class="bc-seg">' + seg + '</span>';
  });
  node.el.querySelector('.node-content').appendChild(crumb);
}
```

### CSS

```css
.layer-breadcrumb {
  position: absolute;
  bottom: 12px;
  right: 16px;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 255, 255, 0.85);
  padding: 5px 12px;
  border-radius: var(--border-radius-md, 6px);
  font-size: 11px;
  letter-spacing: 0.02em;
  line-height: 1.4;
  z-index: 50;
  pointer-events: none;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  gap: 4px;
}

.layer-breadcrumb .bc-sep {
  opacity: 0.45;
  margin: 0 2px;
}

.layer-breadcrumb .bc-seg:last-child {
  font-weight: 600;
  color: #fff;
}
```

### Esempio visivo

```
┌─────────────────────────────────────────────────────────┐
│  [sidebar]  │          Contenuto layer                  │
│             │                                           │
│     🧑‍🤝‍🧑     │   Rossi Mario                            │
│             │   CF: RSSMRA80A01H501Z                    │
│    ────     │   …                                       │
│     📚      │                                           │
│     ✕       │              ┌─────────────────────────┐  │
│             │              │ Anagrafiche / Rossi Ma… │  │
│             │              └─────────────────────────┘  │
└─────────────┴───────────────────────────────────────────┘
```

---

## 7. Animazioni

```css
@keyframes layerFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modalScaleIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes modalContentIn {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes panelSlideIn {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes sheetSlideUp {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes sheetContentUp {
  from { opacity: 0; transform: translateY(30px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 8. Nesting Rules

| Parent → | fullscreen | panel | modal | sheet | drawer | wizard |
|----------|-----------|-------|-------|-------|--------|--------|
| **fullscreen** | 3 | 2 | 1 | 1 | 1 | 1 |
| **panel** | — | — | 1 | 1 | — | — |
| **modal** | — | — | 1 | — | — | — |
| **sheet** | — | — | 1 | — | — | — |
| **drawer** | — | — | 1 | 1 | — | — |
| **wizard** | — | — | — | — | — | — |

Max 5 root simultanei.

---

## 9. Pattern: Come un modulo usa la struttura

### Registro + render

```js
LayerSystem.registerContent('my-module', {
  render: function(container, ctx) {
    // container = .node-body
    // ctx = { nodeId, parentId, kind, contentKey }

    container.innerHTML = CerusShell.buildLayerLayout({
      badge: 'hgi-my-icon',
      nodeId: ctx.nodeId,
      activeTab: 'tab1',
      tabs: [
        { key: 'tab1', icon: 'hgi-icon-a', title: 'Tab A' },
        { key: 'tab2', icon: 'hgi-icon-b', title: 'Tab B' }
      ]
    });

    // Bind sidebar tab clicks
    container.querySelector('.layer-sidebar').addEventListener('click', function(e) {
      var btn = e.target.closest('[data-tab]');
      if (!btn) return;
      var tab = btn.dataset.tab;
      // switch tab...
    });

    // Bind library button
    container.querySelector('[data-go-library]').addEventListener('click', function() {
      CerusShell.showLibrary();
    });

    // Render content in .layer-main-content
    renderTab1();
  },
  destroy: function() { /* cleanup */ }
});
```

### Aprire layer figlio (da un modulo)

```js
// Modal
CerusShell.state.layerManager.openNode(currentNodeId, {
  kind: 'modal',
  title: 'Titolo Modal',
  contentKey: 'my-modal-content'
});

// Fullscreen figlio (con breadcrumb automatico)
CerusShell.state.layerManager.openNode(currentNodeId, {
  kind: 'fullscreen',
  title: 'Dettaglio Record',
  contentKey: 'my-detail'
});
```

### Chiudere un nodo

```js
// Da bottone inline
CerusShell.state.layerManager.closeNode(ctx.nodeId);

// Oppure via data-attribute (gestito globalmente)
'<button data-action="close-node" data-node-id="' + nodeId + '">Chiudi</button>'
'<button data-layer-action="close" data-node-id="' + nodeId + '">Annulla</button>'
```

---

## 10. Variabili CSS utilizzate

| Variabile | Default | Uso |
|-----------|---------|-----|
| `--layer-sidebar-width` | `64px` | Larghezza sidebar |
| `--layer-sidebar-bg` | `var(--white)` | Background sidebar |
| `--layer-sidebar-border` | `var(--border-color)` | Bordo destro sidebar |
| `--layer-sidebar-color` | `var(--gray-500)` | Colore icone inattive |
| `--layer-sidebar-hover` | `var(--gray-900)` | Colore icone hover |
| `--layer-main-bg` | `var(--gray-50)` | Background area main |
| `--layer-submenu-width` | `272px` | Larghezza submenu |
| `--layer-anim-base` | `200ms` | Durata animazioni base |
| `--layer-anim-slow` | (definita nel tema) | Durata animazione contenuto modal |
| `--border-radius-md` | `6px` | Border-radius bottoni |
| `--space-lg` | `24px` | Padding main content |

---

## 11. Mappa File Sorgente

| File | Contenuto |
|------|-----------|
| `public/js/layer-system.js` | Engine: createManager, openNode, closeNode, breadcrumb, focus, z-index |
| `public/js/shell.js` | `buildLayerLayout()`, `api()`, `toast()`, `esc()`, module registry |
| `public/css/layers-core.css` | `.node-layer`, `.node-modal`, `.node-panel`, `.node-sheet`, animazioni |
| `public/css/layers-layout.css` | `.layer-layout`, `.layer-sidebar`, `.layer-main`, submenu, breadcrumb |
