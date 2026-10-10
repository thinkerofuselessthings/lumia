# Library Style — Stili della Libreria

> Sistema di stili per la libreria clinica dell'applicazione Janus/ChemERA.
> Comprende la libreria integrata (landing) e il sandbox standalone.
> File sorgente: `public/css/landing.css` (righe ~1980–2100), `apps/libreria/styles.css` (958 righe).

---

## Indice

1. [Panoramica](#1-panoramica)
2. [Library grid — Vista integrata](#2-library-grid--vista-integrata)
3. [Library card](#3-library-card)
4. [Library overlay — Sandbox standalone](#4-library-overlay--sandbox-standalone)
5. [Quick launch grid](#5-quick-launch-grid)
6. [Library list (moduli aperti)](#6-library-list-moduli-aperti)
7. [Library tree (albero nodi)](#7-library-tree-albero-nodi)
8. [Node layers e modali](#8-node-layers-e-modali)
9. [Token semantici tree](#9-token-semantici-tree)
10. [Colori identità modulo](#10-colori-identità-modulo)
11. [Toast notifications](#11-toast-notifications)
12. [Animazioni](#12-animazioni)
13. [Responsive](#13-responsive)

---

## 1. Panoramica

La libreria ha **due incarnazioni**:

| Contesto | File CSS | Descrizione |
|---|---|---|
| **Integrata** | `landing.css` → `.library-grid` + `.lib-card-*` | Griglia 3 colonne nel body dell'app, stile flat white |
| **Standalone (sandbox)** | `apps/libreria/styles.css` | Overlay fullscreen a 3 colonne: quick-launch, moduli aperti, albero nodi |

Entrambe condividono la font Inter e la filosofia flat white minimalist. Il sandbox definisce un `:root` autonomo con palette estesa e token semantici per l'albero.

---

## 2. Library grid — Vista integrata

Griglia 3 colonne usata come landing view per i moduli nell'app principale.

```css
.library-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);      /* 16px */
}
```

---

## 3. Library card

Card cliccabile che rappresenta un modulo.

### 3.1 Struttura base

```css
.lib-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-sm);           /* 8px */
  padding: var(--space-lg);       /* 24px */
  background: var(--white);
  border: none;
  border-radius: var(--border-radius-sm);  /* 4px */
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: inherit;
  text-align: left;
  position: relative;
}
```

### 3.2 Stati interattivi

```css
.lib-card:hover {
  background: var(--gray-50);
  box-shadow: none;
  transform: none;
}
.lib-card:active {
  background: var(--gray-100);
}
.lib-card--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.lib-card--disabled:hover {
  background: var(--white);
}
```

> Design minimale: nessun box-shadow o transform su hover. Feedback solo via cambio background.

### 3.3 Elementi interni

| Classe | Ruolo | Stile |
|---|---|---|
| `.lib-card-head` | Riga superiore (num + titolo) | `display: flex; align-items: baseline; gap: var(--space-sm)` |
| `.lib-card-num` | Numerazione | `font-size: 0.625rem (2xs)`, `font-weight: 700`, `color: var(--gray-300)`, `tabular-nums` |
| `.lib-card-title` | Nome modulo | `font-size: 0.875rem (sm)`, `font-weight: 600`, `color: var(--black)` |
| `.lib-card-icon` | Icona quadrata | `44px × 44px`, `background: var(--gray-50)`, bordo, `border-radius: md`, `color: var(--gray-600)` |
| `.lib-card-desc` | Descrizione | `font-size: 0.75rem (xs)`, `font-weight: 500`, `color: var(--gray-600)`, `line-height: 1.4` |
| `.lib-card-badge` | Badge stato (assoluto top-right) | `font-size: 8px`, `uppercase`, `letter-spacing: 0.06em`, `background: var(--gray-100)`, `color: var(--gray-400)` |

```css
.lib-card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gray-50);
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--border-radius-md);
  color: var(--gray-600);
}

.lib-card-badge {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  font-size: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--gray-400);
  background: var(--gray-100);
  padding: 2px 6px;
  border-radius: var(--border-radius-sm);
}
```

---

## 4. Library overlay — Sandbox standalone

Il sandbox libreria (`apps/libreria/`) implementa un overlay fullscreen a 3 colonne.

### 4.1 Overlay

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
```

### 4.2 Shell 3 colonne

```css
.library-shell {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(750px, 1fr) 1fr 1fr;
  gap: 0;
  animation: shellSlideIn 200ms ease;
}
.library-col {
  padding: 4rem;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
}
.library-col:nth-child(2) {
  background: #f5f5f5;
}
```

| Colonna | Contenuto | Sfondo |
|---|---|---|
| 1 (minmax 750px) | Quick launch grid | `#fff` |
| 2 | Moduli aperti (lista) | `#f5f5f5` |
| 3 | Albero nodi (tree) | `#fff` |

**Titolo colonna** — solo icona SVG:

```css
.library-col-title {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
}
.library-col-title svg {
  width: 1.15rem;
  height: 1.15rem;
  color: var(--muted);
}
```

---

## 5. Quick launch grid

Griglia 3×N di bottoni quadrati per accesso rapido ai moduli.

```css
.quick-launch-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  flex: 1;
  align-content: center;
}
```

### 5.1 Quick module button

```css
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
}
.quick-module-button:hover { background: #f0f0f0; }
```

Elementi interni:
- `.quick-module-header` — flex row con numero + nome
- `.quick-module-num` — `font-size: 0.72rem`, `color: var(--muted)`
- `.quick-module-name` — `font-size: 0.82rem`, `font-weight: 600`
- `.quick-module-icon` — icona SVG centrata, `2.4rem × 2.4rem`, `color: var(--muted)`
- `.quick-module-desc` — `font-size: 0.68rem`, `color: var(--muted)`

### 5.2 Stati

```css
/* Modulo già aperto */
.quick-module-button.is-open {
  opacity: 0.45;
  cursor: not-allowed;
}
.quick-module-button.is-open .quick-module-icon svg {
  color: var(--danger);
}

/* Bottone "chiudi" */
.quick-module-button.quick-module-close:hover {
  background: #fde8e8;
  color: var(--danger);
}
```

---

## 6. Library list (moduli aperti)

Lista verticale nella 2ª colonna.

```css
.library-list {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1;
  margin-top: 70px;
}
```

### 6.1 Library item

```css
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
}
```

**Icona modulo** — badge quadrato colorato:

```css
.library-item .library-item-icon {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 8px;
  background: var(--tree-icon-module-bg);   /* acqua-sea */
  color: var(--tree-icon-color);             /* palladian */
}
```

**Testo:**

```css
.library-item .library-item-name {
  font-size: 0.82rem;
  font-weight: 600;
}
.library-item .library-item-sub {
  font-size: 0.7rem;
  color: var(--muted);
}
```

### 6.2 Stati

```css
/* Selezionato */
.library-item.is-selected {
  background: var(--blue-fantastic);   /* #2C3B4D */
  color: #fff;
}
.library-item.is-selected .library-item-icon {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}
.library-item.is-selected .library-item-sub {
  color: rgba(255, 255, 255, 0.6);
}

/* Hover (non selezionato) */
.library-item:not(.is-selected):hover {
  background: var(--palladian);   /* #EEE9DF */
}
```

---

## 7. Library tree (albero nodi)

Albero gerarchico nella 3ª colonna, con connettori UL/LI arrotondati.

### 7.1 Token tree

```css
.tree-view {
  --tree-indent: 1.1rem;
  --tree-line-w: 1px;
  --tree-line-color: #dcdce0;
  --tree-radius: 6px;
}
```

### 7.2 Connettori

- **Verticale** — `li { border-left: var(--tree-line-w) solid var(--tree-line-color) }`
- **Orizzontale (├)** — `li::before { border-top: ... }`
- **Ultimo figlio (└)** — `li:last-child::before` con `border-left` + `border-bottom` + `border-bottom-left-radius: var(--tree-radius)`
- **Root** — nessun connettore

### 7.3 Tree card

```css
.tree-card {
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  margin-bottom: 0.35rem;
  cursor: pointer;
  transition: background 100ms ease;
}
.tree-card:hover { background: var(--tree-card-hover); }
.tree-card.tree-card-active { background: var(--tree-card-active); }
.tree-card-module.tree-card-active { background: var(--tree-module-active); }
```

### 7.4 Tree icon badge

Badge quadrato con sfondo pieno per tipo nodo:

```css
.tree-icon {
  width: 1.55rem; height: 1.55rem;
  border-radius: 5px;
  background: var(--tree-icon-bg);        /* oatmeal */
  color: var(--tree-icon-color);           /* palladian */
}
```

Varianti per tipo:

| Tipo nodo | Classe | Background token |
|---|---|---|
| Modulo | `.tree-card-module .tree-icon` | `--tree-icon-module-bg` → `--acqua-sea` (#6BAAAE) |
| Child | `.tree-card-child .tree-icon` | `--tree-icon-child-bg` → `--rosso-bright` (#EA2E00) |
| FM open | `.tree-icon-fm-open` | `--tree-icon-fm-open-bg` → `--blue-fantastic` (#2C3B4D) |
| Active | `.tree-icon-active` | `--tree-icon-active-bg` → `--burning-flame` (#FFB162) |
| Focused | `.tree-icon-focus` | `--tree-icon-focus-bg` → `--acqua-sea` (#6BAAAE) |

---

## 8. Node layers e modali

Il sandbox libreria definisce 6 tipi di nodo visivo:

### 8.1 Layer

```css
.node-layer {
  position: fixed; inset: 0;
  background: #fff;
  padding: 1rem;
  animation: layerFadeIn 150ms ease;
}
.node-layer.is-active-layer {
  box-shadow: inset 4px 0 0 0 var(--accent);
}
.node-layer:not(.is-active-layer) {
  opacity: 0.55;
}
```

### 8.2 Modal

```css
.node-modal {
  background: rgba(17, 17, 17, 0.35);
  display: grid;
  place-items: center;
}
.node-modal .node-content {
  width: min(520px, 100%);
  animation: modalContentIn 200ms ease;
}
```

### 8.3 Panel (side panel destro)

```css
.node-panel {
  inset: 0 0 0 auto;
  width: min(480px, 85%);
  border-left: 1px solid var(--line);
  animation: panelSlideIn 200ms ease;
}
```

### 8.4 Sheet (bottom sheet)

```css
.node-sheet {
  inset: auto 0 0 0;
  top: 30%;
}
.node-sheet .node-content {
  border-radius: 12px 12px 0 0;
  max-height: 70vh;
}
```

### 8.5 Drawer (pannello sinistro)

```css
.node-drawer {
  inset: 0 auto 0 0;
  width: min(360px, 80%);
  border-right: 1px solid var(--line);
  animation: drawerSlideIn 200ms ease;
}
```

### 8.6 Wizard (modale centrato largo)

```css
.node-wizard .node-content {
  width: min(720px, 95%);
  min-height: 400px;
}
```

### 8.7 Contenuto nodo

```css
.node-content {
  width: min(900px, 100%);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1rem;
  background: #fff;
}
.node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.node-title { font-size: 1rem; }
.node-body {
  margin-top: 1rem;
  border-top: 1px solid var(--line);
  padding-top: 1rem;
}
```

---

## 9. Token semantici tree

Definiti nel `:root` di `apps/libreria/styles.css`:

```css
/* Sfondo card */
--tree-card-hover: var(--palladian);     /* #EEE9DF */
--tree-card-active: var(--palladian);
--tree-card-focused: var(--palladian);
--tree-module-active: var(--grey-green-light);  /* #9DBDB8 */

/* Sfondo icone */
--tree-icon-color: var(--palladian);     /* #EEE9DF — testo su sfondo scuro */
--tree-icon-bg: var(--oatmeal);          /* #C9C1B1 — default */
--tree-icon-module-bg: var(--acqua-sea); /* #6BAAAE */
--tree-icon-child-bg: var(--rosso-bright); /* #EA2E00 */
--tree-icon-fm-open-bg: var(--blue-fantastic); /* #2C3B4D */
--tree-icon-active-bg: var(--burning-flame);   /* #FFB162 */
--tree-icon-focus-bg: var(--acqua-sea);        /* #6BAAAE */
```

---

## 10. Colori identità modulo

Ogni modulo applicativo ha un colore identitario:

| Token | Hex | Modulo |
|---|---|---|
| `--mod-pazienti` | `#2C6E8A` | Pazienti |
| `--mod-ambulatorio` | `#6BAAAE` | Ambulatorio |
| `--mod-documenti` | `#8B6F4E` | Documenti |
| `--mod-reports` | `#5B7A5E` | Reports |
| `--mod-trattamenti` | `#A35139` | Trattamenti |
| `--mod-laboratorio` | `#7E5BAE` | Laboratorio |
| `--mod-agenda` | `#C4873B` | Agenda |
| `--mod-impostazioni` | `#6B6B6B` | Impostazioni |
| `--mod-dashboard-utente` | `#2C3B4D` | Dashboard Utente |

Usati come sfondo dei badge icona nei quick-module buttons e come accento negli item della libreria.

---

## 11. Toast notifications

Sistema di notifiche toast in basso a destra:

```css
.toast-container {
  position: fixed;
  bottom: 1.2rem;
  right: 1.2rem;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.toast {
  background: #1e293b;
  color: #f8fafc;
  padding: 0.65rem 1.1rem;
  border-radius: 10px;
  font-size: 0.88rem;
  max-width: 360px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  animation: toastIn 200ms ease;
}
```

Varianti:

| Classe | Background | Testo |
|---|---|---|
| `.toast` (default) | `#1e293b` | `#f8fafc` |
| `.toast-warning` | `#92400e` | `#fef3c7` |
| `.toast-error` | `var(--danger)` (#dc2626) | `#fff` |
| `.toast-success` | `var(--success)` (#16a34a) | `#fff` |

---

## 12. Animazioni

| Keyframe | Tipo | Durata | Uso |
|---|---|---|---|
| `layerFadeIn` | Fade in | 150ms | Apertura layer |
| `modalScaleIn` | Fade in | 200ms | Overlay modal/wizard |
| `modalContentIn` | Scale + translateY | 200ms | Contenuto modal |
| `panelSlideIn` | TranslateX(24px→0) | 200ms | Panel destro |
| `sheetSlideUp` | Fade in | 250ms | Overlay sheet |
| `sheetContentUp` | TranslateY(30px→0) | 250ms | Contenuto sheet |
| `drawerSlideIn` | TranslateX(-24px→0) | 200ms | Drawer sinistro |
| `shellSlideIn` | TranslateY(-8px→0) | 200ms | Apertura shell libreria |
| `toastIn` | TranslateY(8px→0) | 200ms | Ingresso toast |
| `toastOut` | TranslateY(0→8px) | 200ms | Uscita toast |

---

## 13. Responsive

```css
@media (max-width: 980px) {
  .library-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr 1fr;
  }
}
```

Da 3 colonne affiancate a stack verticale sotto 980px.

---

## Appendice — Mappa file

| File | Contenuto | Righe |
|---|---|---|
| `public/css/landing.css` (righe ~1980–2100) | `.library-grid`, `.lib-card-*` — card integrata | ~120 |
| `apps/libreria/styles.css` | Sandbox completo: overlay, shell, quick-launch, tree, layers, toast, animazioni | 958 |
| `apps/libreria/index.html` | HTML scaffold con script `public/js/layers/` | 86 |
