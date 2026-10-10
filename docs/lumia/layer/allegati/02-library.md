# 02 — Libreria (Library Shell)

> Guida completa per ricreare la landing page a 3 colonne e il browser di contenuti all'interno dei moduli.

---

## Anatomia visiva

```
┌─────────────────────────────────────────────────────────────────────┐
│                    .library-shell (fixed inset 0, z:50)            │
│                                                                     │
│  ┌─────────────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Col 1: LAUNCH       │ │ Col 2: OPEN  │ │ Col 3: TREE          │ │
│  │ (flex:2, #fff)      │ │ (flex:1)     │ │ (flex:1)             │ │
│  │                     │ │ bg:#f3f5f7   │ │ bg:#fff, border-left │ │
│  │ ┌───┐ ┌───┐ ┌───┐  │ │              │ │                      │ │
│  │ │ 1 │ │ 2 │ │ 3 │  │ │ ● Admin      │ │  ▸ Admin             │ │
│  │ │TOO│ │ADM│ │DOC│  │ │   ✕ (hover)  │ │     ├─ Utenti        │ │
│  │ │   │ │   │ │   │  │ │              │ │     └─ Logs          │ │
│  │ └───┘ └───┘ └───┘  │ │ ● Tools      │ │  ▸ Tools             │ │
│  │ ┌───┐ ┌───┐ ┌───┐  │ │              │ │     ├─ CLL           │ │
│  │ │ 4 │ │ 5 │ │ 6 │  │ │              │ │     └─ FIL Fitness   │ │
│  │ │AGE│ │USE│ │LOG│  │ │              │ │                      │ │
│  │ │   │ │   │ │OUT│  │ │              │ │                      │ │
│  │ └───┘ └───┘ └───┘  │ │              │ │                      │ │
│  │                     │ │              │ │                      │ │
│  │ 160×160px ciascuno  │ │              │ │                      │ │
│  └─────────────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Struttura HTML

```html
<!-- Library Shell — 3 colonne -->
<div class="library-shell" id="library-shell">

  <!-- ═══ Colonna 1: Quick Launch ═══ -->
  <div class="library-col library-col--launch">
    <div class="library-col-title">
      <i class="hgi-stroke hgi-grid-view"></i>&nbsp; Moduli
    </div>

    <div class="quick-launch-grid">
      <!-- 5 moduli + 1 logout -->
      <button class="quick-module-button" data-module="tools" type="button">
        <div class="quick-module-header">
          <span class="quick-module-num">01</span>
          <span class="quick-module-name">Tools</span>
        </div>
        <i class="hgi-stroke hgi-stethoscope quick-module-icon"></i>
        <span class="quick-module-desc">Strumenti diagnostici e terapeutici</span>
      </button>

      <button class="quick-module-button" data-module="admin" type="button">
        <div class="quick-module-header">
          <span class="quick-module-num">02</span>
          <span class="quick-module-name">Admin</span>
        </div>
        <i class="hgi-stroke hgi-settings-02 quick-module-icon"></i>
        <span class="quick-module-desc">Gestione utenti, log, agenda</span>
      </button>

      <button class="quick-module-button" data-module="docs" type="button">
        <div class="quick-module-header">
          <span class="quick-module-num">03</span>
          <span class="quick-module-name">Docs</span>
        </div>
        <i class="hgi-stroke hgi-book-open-01 quick-module-icon"></i>
        <span class="quick-module-desc">Documentazione e catalogo</span>
      </button>

      <button class="quick-module-button" data-module="agenda" type="button">
        <div class="quick-module-header">
          <span class="quick-module-num">04</span>
          <span class="quick-module-name">Agenda</span>
        </div>
        <i class="hgi-stroke hgi-calendar-03 quick-module-icon"></i>
        <span class="quick-module-desc">Calendario e appuntamenti</span>
      </button>

      <button class="quick-module-button" data-module="user" type="button">
        <div class="quick-module-header">
          <span class="quick-module-num">05</span>
          <span class="quick-module-name">User</span>
        </div>
        <i class="hgi-stroke hgi-user quick-module-icon"></i>
        <span class="quick-module-desc">Profilo e preferenze</span>
      </button>

      <button class="quick-module-button quick-module-button--logout"
              id="btn-logout" type="button">
        <div class="quick-module-header">
          <span class="quick-module-num">06</span>
          <span class="quick-module-name">Logout</span>
        </div>
        <i class="hgi-stroke hgi-logout-03 quick-module-icon"></i>
        <span class="quick-module-desc">Esci dall'applicazione</span>
      </button>
    </div>
  </div>

  <!-- ═══ Colonna 2: Moduli aperti ═══ -->
  <div class="library-col library-col--open">
    <div class="library-col-title">
      <i class="hgi-stroke hgi-layers-01"></i>&nbsp; Aperti
    </div>
    <div class="library-list" id="library-list">
      <!-- Popolato dinamicamente da renderLibraryList() -->
    </div>
  </div>

  <!-- ═══ Colonna 3: Albero nodi ═══ -->
  <div class="library-col library-col--tree">
    <div class="library-col-title">
      <i class="hgi-stroke hgi-hierarchy-square-01"></i>&nbsp; Struttura
    </div>
    <div class="library-tree" id="library-tree">
      <!-- Popolato dinamicamente da renderLibraryTree() -->
    </div>
  </div>

</div>
```

---

## 2. CSS completo (lumia-library-shell.css)

```css
/* ── Layout shell ── */
.library-shell {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: row;
  gap: 0;
  background: var(--bg);
  animation: shellSlideIn 200ms ease;
}
.library-shell.hidden { display: none !important; }

/* ── Colonne ── */
.library-col {
  padding: 3rem;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.library-col--launch { background: #fff;    flex: 2; }
.library-col--open   { background: #f3f5f7; flex: 1; }
.library-col--tree   { background: #fff;    flex: 1; border-left: 1px solid var(--line); }

/* ── Titoli colonne ── */
.library-col-title {
  margin: 0 0 1rem;
  font-size: .95rem;
  display: flex;
  align-items: center;
  color: var(--muted);
}
.library-col-title i { font-size: 18px; }

/* ── Quick Launch Grid (3×2) ── */
.quick-launch-grid {
  display: grid;
  grid-template-columns: repeat(3, 180px);
  gap: 2.4rem;
  flex: 1;
  align-content: center;
  margin: auto;
  justify-content: center;
}

/* ── Module Buttons (160×160) ── */
.quick-module-button {
  border: none;
  background: var(--gray-50);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  width: 160px;
  height: 160px;
  text-align: left;
  font-size: .75rem;
  padding: .5rem;
  transition: background 120ms ease;
  font-family: inherit;
  box-sizing: content-box;
}
.quick-module-button:hover   { background: #f5f5f5; }
.quick-module-button:active  { background: #eee; }
.quick-module-button.is-open { opacity: .5; }

/* ── Logout special ── */
.quick-module-button--logout:hover { background: #fef2f2; }
.quick-module-button--logout .quick-module-icon { color: #dc2626; }

/* ── Button internals ── */
.quick-module-header {
  display: flex;
  align-items: baseline;
  gap: .35rem;
  width: 100%;
}
.quick-module-num {
  font-size: .65rem;
  color: var(--muted);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.quick-module-name {
  font-size: .75rem;
  font-weight: 600;
  color: var(--fg);
}
.quick-module-icon {
  font-size: 1.5rem;
  color: var(--muted);
  margin: auto 0;
}
.quick-module-desc {
  font-size: .62rem;
  color: var(--muted);
  line-height: 1.3;
}
```

---

## 3. Colonna 2: Lista moduli aperti

Renderizzata da `renderLibraryList()` in `shell-navigation.js`. Per ogni modulo aperto genera un bottone `.library-item-row`.

### HTML generato per ogni item

```html
<button class="library-item-row" data-module="admin" data-node-id="ln-abc123...">
  <span class="lib-item-icon">
    <i class="hgi-stroke hgi-settings-02"></i>
  </span>
  <span class="lib-item-name">Admin</span>
  <span class="lib-item-close" data-close-module="admin" title="Chiudi">
    <i class="hgi-stroke hgi-cancel-01"></i>
  </span>
</button>
```

### CSS

```css
.library-list {
  display: flex;
  flex-direction: column;
  gap: .45rem;
  flex: 1;
  margin-top: 40px;
}
.library-item-row {
  border: none;
  background: transparent;
  border-radius: 10px;
  padding: .55rem .7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: .6rem;
  transition: background 120ms ease;
  font-family: inherit;
  text-align: left;
  width: 100%;
}
.library-item-row:hover { background: #edf1f5; }

.lib-item-icon {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e5e5;
  color: #666;
  flex-shrink: 0;
  font-size: 16px;
}
.lib-item-name {
  font-size: .82rem;
  font-weight: 600;
  color: var(--fg);
}

/* Bottone close: invisibile fino a hover */
.lib-item-close {
  margin-left: auto;
  border: none;
  background: none;
  color: #bbb;
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity .12s ease;
}
.library-item-row:hover .lib-item-close { opacity: 1; }
.lib-item-close:hover { color: #e53e3e; }
```

---

## 4. Colonna 3: Albero nodi (Tree View)

Renderizzata da `renderLibraryTree()`. Produce un albero ricorsivo con connettori CSS-only. Ogni nodo ha modulo padre (teal) e figli (grigio).

### HTML generato

```html
<ul class="tree-view">
  <li>
    <div class="tree-card tree-card-module tree-card-active"
         data-tree-node="ln-abc123">
      <span class="tree-icon">
        <i class="hgi-stroke hgi-settings-02"></i>
      </span>
      <span class="tree-label">Admin</span>
    </div>
    <ul>
      <li>
        <div class="tree-card tree-card-child" data-tree-node="ln-def456">
          <span class="tree-icon tree-icon-child">
            <i class="hgi-stroke hgi-user"></i>
          </span>
          <span class="tree-label">Utenti</span>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

### CSS (connettori)

```css
.tree-view {
  --tree-indent: 1.1rem;
  --tree-line-w: 1px;
  --tree-line-color: #ddd;
  --tree-radius: 6px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.tree-view ul {
  list-style: none;
  padding-left: var(--tree-indent);
  margin: 0;
  position: relative;
}
.tree-view li {
  position: relative;
  padding-left: var(--tree-indent);
}
/* Linea verticale a sinistra */
.tree-view ul > li {
  border-left: var(--tree-line-w) solid var(--tree-line-color);
}
.tree-view ul > li:last-child {
  border-left-color: transparent;
}
/* Linea orizzontale verso il nodo */
.tree-view ul > li::before {
  content: '';
  position: absolute;
  left: 0;
  top: .85rem;
  width: var(--tree-indent);
  height: 0;
  border-top: var(--tree-line-w) solid var(--tree-line-color);
}
/* Ultimo figlio: angolo curvo */
.tree-view ul > li:last-child::before {
  border-top: none;
  border-left: var(--tree-line-w) solid var(--tree-line-color);
  border-bottom: var(--tree-line-w) solid var(--tree-line-color);
  border-bottom-left-radius: var(--tree-radius);
  height: .85rem;
  top: 0;
}

/* ── Card nodi ── */
.tree-card {
  display: flex;
  align-items: center;
  gap: .4rem;
  border: none;
  border-radius: 6px;
  padding: .35rem .5rem;
  margin-bottom: .35rem;
  cursor: pointer;
  transition: background 100ms ease;
  font-size: .8rem;
}
.tree-card:hover { background: #f3f5f7; }
.tree-card-active { background: #e8ecef; }
.tree-card-module.tree-card-active { background: #e0f0f1; }

/* ── Icona nel nodo ── */
.tree-icon {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 5px;
  background: #f0f0f0;
  color: #888;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: .7rem;
  flex-shrink: 0;
}
.tree-card-module .tree-icon { background: #6BAAAE; color: #fff; }
.tree-icon-child { background: #e0e0e0; color: #666; }
.tree-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
```

---

## 5. Library Chooser (contenuto del modulo Tools)

Quando si apre il modulo "Tools", il content provider `tools-module` renderizza un **lib-chooser** — una UI 2-colonne con sidebar categorie e pannello con lista strumenti.

```
┌──────────────────────────────────────────────────────────────┐
│  .lib-chooser (flex row, h:100%)                             │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────────────────────┐   │
│  │ .lib-sidebar     │  │ .lib-panel                       │   │
│  │ (flex:1, 180px+) │  │ (flex:2)                         │   │
│  │ bg:#fafafa       │  │                                  │   │
│  │                  │  │ ┌──────────────────────────────┐ │   │
│  │ CATEGORIE        │  │ │ 🔍 Cerca...                  │ │   │
│  │                  │  │ └──────────────────────────────┘ │   │
│  │ ▸ Diagnostica    │  │                                  │   │
│  │   Terapia CLL    │  │ DIAGNOSTICA (3)                  │   │
│  │   Terapia DLBCL  │  │                                  │   │
│  │   Scores         │  │ ┌──────────────────────────────┐ │   │
│  │                  │  │ │ 01 [🔬] FIL Fitness   ➤      │ │   │
│  │                  │  │ │ 02 [🧪] CD B-LPD      ➤      │ │   │
│  │                  │  │ │ 03 [💉] MM Helper     ➤      │ │   │
│  │                  │  │ └──────────────────────────────┘ │   │
│  └─────────────────┘  └──────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### HTML struttura

```html
<div class="lib-chooser">
  <div class="lib-sidebar">
    <div class="lib-sidebar-title">CATEGORIE</div>
    <button class="lib-cat-btn is-active">
      <span class="lib-cat-icon"><i class="hgi-stroke hgi-test-tube-01"></i></span>
      <span class="lib-cat-text">
        <span class="lib-cat-name">Diagnostica</span>
        <span class="lib-cat-desc">Strumenti diagnostici CD</span>
      </span>
      <span class="lib-cat-count">3</span>
    </button>
    <!-- ... altre categorie ... -->
  </div>

  <div class="lib-panel">
    <div class="lib-panel-search">
      <i class="hgi-stroke hgi-search-01"></i>
      <input type="text" placeholder="Cerca..." />
    </div>

    <div class="lib-panel-heading">
      <i class="hgi-stroke hgi-test-tube-01"></i>
      Diagnostica
    </div>

    <div class="lib-panel-list">
      <button class="library-item">
        <span class="library-item-num">01</span>
        <span class="library-item-icon">
          <i class="hgi-stroke hgi-dumbbell-01"></i>
        </span>
        <span class="library-item-text">
          <span class="library-item-name">FIL Fitness</span>
          <span class="library-item-sub">Valutazione fitness pazienti</span>
        </span>
        <span class="library-item-badge">Fitness</span>
        <span class="library-item-arrow">
          <i class="hgi-stroke hgi-arrow-right-01"></i>
        </span>
      </button>
      <!-- ... altri items ... -->
    </div>
  </div>
</div>
```

### CSS lib-chooser

```css
.lib-chooser {
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: hidden;
}
.lib-sidebar {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 10px;
  border-right: 1px solid var(--line);
  background: #fafafa;
  overflow-y: auto;
}
.lib-sidebar-title {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--muted);
  font-weight: 600;
  padding: 4px 8px 10px;
}
.lib-cat-btn {
  border: none;
  background: transparent;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: inherit;
  text-align: left;
  width: 100%;
  transition: background 120ms ease;
}
.lib-cat-btn:hover { background: #eee; }
.lib-cat-btn.is-active { background: #e8ecef; }
.lib-cat-icon {
  width: 2rem; height: 2rem; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  background: #e5e5e5; color: #666; flex-shrink: 0; font-size: 15px;
}
.lib-cat-btn.is-active .lib-cat-icon {
  background: #6BAAAE; color: #fff;
}
.lib-cat-count {
  margin-left: auto; font-size: .65rem; font-weight: 700;
  color: var(--muted); background: #e5e5e5; border-radius: 6px;
  padding: 1px 6px; flex-shrink: 0;
}

/* Panel */
.lib-panel {
  flex: 2;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lib-panel-search {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-bottom: 1px solid var(--line);
  background: #fff;
}
.lib-panel-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Library Item */
.library-item {
  border: none; background: transparent;
  border-radius: 10px; padding: 10px 12px;
  cursor: pointer; display: flex;
  align-items: center; gap: 10px;
  font-family: inherit; text-align: left; width: 100%;
  transition: background 120ms ease;
}
.library-item:hover { background: #f3f5f7; }
.library-item-icon {
  width: 2.2rem; height: 2.2rem; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: #6BAAAE; color: #fff; flex-shrink: 0; font-size: 16px;
}
.library-item-badge {
  font-size: .58rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: .06em; color: #6BAAAE; background: #e0f0f1;
  padding: 2px 7px; border-radius: 6px; flex-shrink: 0;
}
.library-item-arrow {
  font-size: 14px; color: #ccc; flex-shrink: 0;
  transition: color 120ms ease;
}
.library-item:hover .library-item-arrow { color: #999; }
```

---

## 6. Logica JavaScript

### State e Registry

```js
// shell-state.js
var state = {
  activeModule: null,     // 'tools' | 'admin' | etc.
  openModules: {},        // { 'tools': 'ln-abc123', 'admin': 'ln-def456' }
  layerManager: null      // LayerSystem manager instance
};

var MODULE_INFO = {
  'tools':  { icon: 'hgi-stethoscope',  name: 'Tools',  contentKey: 'tools-module'  },
  'admin':  { icon: 'hgi-settings-02',  name: 'Admin',  contentKey: 'admin-module'  },
  'docs':   { icon: 'hgi-book-open-01', name: 'Docs',   contentKey: 'docs-module'   },
  'agenda': { icon: 'hgi-calendar-03',  name: 'Agenda', contentKey: 'agenda-module' },
  'user':   { icon: 'hgi-user',         name: 'User',   contentKey: 'user-module'   }
};
```

### Navigazione (shell-navigation.js)

```js
function showLibrary() {
  state.activeModule = null;
  var shell = document.getElementById('library-shell');
  shell.classList.remove('hidden');

  // Tutte le finestre vanno in background
  state.layerManager.getAllNodes().forEach(function(n) {
    n.element.classList.add('is-background');
  });

  renderLibraryList();
  renderLibraryTree();
  updateCardStates();
}

function openModule(mod) {
  var existing = state.openModules[mod];
  if (existing) { focusModule(mod, existing); return; }

  var cfg = MODULE_INFO[mod];
  state.activeModule = mod;

  // Nascondi library
  document.getElementById('library-shell').classList.add('hidden');

  // Metti tutti in background
  state.layerManager.getAllNodes().forEach(function(n) {
    n.element.classList.add('is-background');
  });

  // Apri fullscreen layer
  var nodeId = state.layerManager.openNode(null, {
    kind: 'fullscreen',
    title: cfg.name,
    contentKey: cfg.contentKey
  });

  if (nodeId) {
    state.openModules[mod] = nodeId;
    updateCardStates();
  }
}

function focusModule(mod, nodeId) {
  state.activeModule = mod;
  document.getElementById('library-shell').classList.add('hidden');

  state.layerManager.getAllNodes().forEach(function(n) {
    n.element.classList.add('is-background');
  });

  revealTree(nodeId);
  state.layerManager.applyFocus(nodeId);
}
```

### Event listeners (gestiti in shell-init.js)

```js
// Click su card modulo
document.querySelectorAll('.quick-module-button[data-module]')
  .forEach(function(btn) {
    btn.addEventListener('click', function() {
      openModule(btn.dataset.module);
    });
  });

// Click su item nella lista (col 2)
document.getElementById('library-list').addEventListener('click', function(e) {
  var row = e.target.closest('.library-item-row');
  var closeBtn = e.target.closest('[data-close-module]');
  if (closeBtn) {
    var mod = closeBtn.dataset.closeModule;
    var nodeId = state.openModules[mod];
    if (nodeId) state.layerManager.closeNode(nodeId);
    delete state.openModules[mod];
    renderLibraryList();
    renderLibraryTree();
    updateCardStates();
    return;
  }
  if (row && row.dataset.module) {
    focusModule(row.dataset.module, row.dataset.nodeId);
  }
});

// Click su nodo nell'albero (col 3)
document.getElementById('library-tree').addEventListener('click', function(e) {
  var card = e.target.closest('[data-tree-node]');
  if (!card) return;
  var nodeId = card.dataset.treeNode;
  // Trova il modulo associato e focus
  var mod = Object.keys(state.openModules).find(function(m) {
    return state.openModules[m] === nodeId;
  });
  if (mod) focusModule(mod, nodeId);
  else state.layerManager.applyFocus(nodeId);
});
```

---

## 7. Responsive

```css
@media (max-width: 700px) {
  .library-shell { flex-direction: column; }
  .library-col--launch { flex: none; }
  .library-col--open,
  .library-col--tree { display: none; }
  .quick-launch-grid { grid-template-columns: 1fr; }
}
```

---

## 8. Animazione apertura

```css
@keyframes shellSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 9. Colore accent: Teal #6BAAAE

Usato per:
- `.tree-card-module .tree-icon` — sfondo icona moduli nell'albero
- `.lib-cat-btn.is-active .lib-cat-icon` — icona categoria attiva
- `.library-item-icon` — icona item nella lista
- `.library-item-badge` — badge testo/sfondo (`#6BAAAE` / `#e0f0f1`)
- `.tree-card-module.tree-card-active` — sfondo attivo (`#e0f0f1`)

---

## 10. Note per la ricreazione

- **Non ci sono route/SPA**: tutto è un singolo `index.html`, la navigazione è tutta JS vanilla
- **I moduli sono "registrati" via content provider** in `LayerSystem.registerContent()` e aperti come layer fullscreen
- **Il tasto Logout è dentro la griglia** come 6° bottone con stile speciale (rosso su hover)
- **La colonna 2 ("Aperti") mostra anche root layer non collegati a moduli** — ad es. helper aperti direttamente
- **Il tree view (col 3) è ricorsivo** e riflette la gerarchia parent→child del LayerSystem
- **L'animazione shellSlideIn** (6px translateY + fade 200ms) si applica solo alla library shell
