# Layer Menu System — Specifica Tecnica

> Documento di riferimento per riprodurre fedelmente il sistema di navigazione a layer di Lumia.
> Stack: vanilla HTML + CSS + JS (zero dipendenze). Desktop only.

---

## 1. Architettura Generale

Il layer è un **SPA chromeless**: nessun sidebar, nessun dock. La navigazione si basa su **due soli elementi persistenti**:

1. **Tab Strip** — barra orizzontale in alto con tab Chrome-style
2. **Launcher Modal** — griglia visuale di card che si apre on-demand

```
┌──────────────────────────────────────────────────────┐
│ [▼] [Tab1] [Tab2] [Tab3] [+]          [×]           │  ← Tab Strip
├──────────────────────────────────────────────────────┤
│                                                      │
│                  Content Area                        │  ← Pannello sezione attiva
│                  (o Empty State)                     │
│                                                      │
└──────────────────────────────────────────────────────┘
```

Quando il launcher è aperto:

```
┌──────────────────────────────────────────────────────┐
│              backdrop blur + overlay                 │
│     ┌─────────────┬──────────────────────────┐       │
│     │   Preview   │  [01] [02] [03] [04]     │       │
│     │    Column    │  [05] [06] [07] [08]     │       │
│     │  (icon +    │  [09] [10] [11] [12]     │       │
│     │  "Sections")│  ─────────────────────   │       │
│     │             │  [Close Layer] [Library]  │       │
│     └─────────────┴──────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

---

## 2. Design Token (CSS Custom Properties)

```css
:root {
  --bg: #ffffff;
  --bg-subtle: #fafafa;        /* content area, active tab, preview col */
  --bg-hover: #f3f3f3;         /* tab strip background, hover states */
  --bg-active: #eeeeee;        /* pressed/selected states */
  --border: #e8e8e8;
  --text: #1a1a1a;
  --text-secondary: #888888;
  --text-tertiary: #b0b0b0;
  --accent: #1a1a1a;           /* bordo selezione card, tab attiva */
  --radius: 8px;
  --radius-sm: 5px;
  --tab-height: 42px;
  --transition: 150ms ease;
}
```

Font stack: `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif` a `13px`.

---

## 3. Tab Strip

### 3.1 Struttura HTML

```
.tab-strip
  ├── button.tab-strip-btn.tab-strip-dropdown   ← chevron ▼, apre launcher
  ├── .tab-strip-tabs                            ← container scrollabile
  │     ├── button.tab  (× N, generati da JS)
  │     │     ├── span.tab-icon                  ← SVG icona sezione (14×14)
  │     │     ├── span.tab-label                 ← testo nome sezione
  │     │     └── button.tab-close               ← "×" chiudi tab
  │     └── ...
  ├── button.tab-strip-btn.tab-strip-add         ← "+" apre launcher
  ├── .tab-strip-spacer                          ← flex:1, spinge il close a destra
  └── button.tab-strip-btn.tab-strip-close       ← "×" chiude modulo attivo
```

### 3.2 Comportamento Tab

| Aspetto | Dettaglio |
|---|---|
| **Stile inattivo** | `background: transparent`, `color: --text-secondary`, `border-radius: 8px 8px 0 0` |
| **Stile hover** | `background: --bg-active`, `color: --text` |
| **Stile attivo** | `background: --bg-subtle` (blends con content), `color: --text`, `z-index: 10` |
| **Curve attive** | `::before` e `::after` con `radial-gradient` (cerchio 8px) che creano l'effetto curva alla base. Il gradiente va da `transparent` a `--bg-subtle` |
| **Dimensioni** | `height: calc(100% - 4px)`, `max-width: 200px`, `padding: 0 16px` (right 8px) |
| **Gap** | `gap: 4px` tra le tab nel container `.tab-strip-tabs` |
| **Overflow** | scroll orizzontale nascosto (scrollbar-width: none) |
| **Icona sezione** | 14×14 SVG stroke, colore `--text-tertiary` → `--text-secondary` su hover/active |
| **Close button** | 18×18, `border-radius: 50%`, `opacity: 0` → `1` su hover/active della tab. Hover del bottone: `background: rgba(0,0,0,0.08)` |

### 3.3 Bottoni Strip

Tutti i bottoni strip (`tab-strip-btn`) condividono:
- `width: 32px`, `height: 28px`
- `border-radius: 6px`
- `color: --text-tertiary` → `--text` su hover
- `background: none` → `--bg-active` su hover
- `align-self: center`

Varianti specifiche:
- `.tab-strip-dropdown`: `margin-left: 8px`
- `.tab-strip-add`: `margin-left: 2px`
- `.tab-strip-close`: `margin-right: 8px`, hover diventa `color: #b81e1e` (rosso)

### 3.4 Icone SVG nei bottoni strip

| Bottone | SVG |
|---|---|
| Dropdown (▼) | `<path d="m6 9 6 6 6-6"/>` |
| Add (+) | `<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>` |
| Close (×) | `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>` |

Tutti: `width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`.

### 3.5 Tab Strip Background

La strip ha `background: var(--bg-hover)` (#f3f3f3), più scura del content area (`--bg-subtle` #fafafa). La tab attiva ha lo stesso colore del content → effetto "emerge" dalla strip come in Chrome.

---

## 4. Launcher Modal

### 4.1 Struttura HTML

```
.launcher-overlay                     ← fixed inset, backdrop
  └── .launcher                       ← container flex a 2 colonne
        ├── .launcher-preview         ← colonna sinistra
        │     └── .launcher-preview-content
        │           ├── svg.launcher-preview-icon    ← icona placeholder (32×32)
        │           └── span.launcher-preview-title  ← "Sections"
        └── .launcher-menu            ← colonna destra
              └── .launcher-grid      ← CSS grid 4 colonne
                    ├── .launcher-card [×12]          ← sezioni modulo
                    ├── .launcher-separator           ← linea orizzontale
                    ├── .launcher-card.launcher-card--action [×2]  ← azioni default
```

### 4.2 Overlay

```css
position: fixed; inset: 0;
background: rgba(0, 0, 0, 0.06);
backdrop-filter: blur(3px);
padding-top: 12vh;                    /* centrato alto */
display: flex; align-items: flex-start; justify-content: center;
z-index: 1000;
```

Transizione apertura: `opacity 120ms ease`. Il `.launcher` interno ha `transform: translateY(-10px) scale(0.98)` → `translateY(0) scale(1)` su `.is-open`.

### 4.3 Layout a Due Colonne

| Colonna | Larghezza | Background | Contenuto |
|---|---|---|---|
| **Preview (sx)** | `260px` fissi | `--bg-subtle` | Icona layout 32×32 (opacity 0.4) + titolo "Sections" uppercase |
| **Menu (dx)** | `flex: 1` | `--bg` (bianco) | Grid di card |

Il bordo destro della preview è `1px solid --border`. Il `.launcher` container: `border-radius: 12px`, `box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.03)`.

### 4.4 Preview Column

```css
.launcher-preview-content {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}
.launcher-preview-icon { color: --text-tertiary; opacity: 0.4; }
.launcher-preview-title {
  font-size: 12px; font-weight: 600;
  letter-spacing: 0.6px; text-transform: uppercase;
  color: --text-tertiary;
}
```

L'icona SVG placeholder rappresenta un layout con sidebar: `<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>`.

### 4.5 Grid di Card

```css
.launcher-grid {
  display: grid;
  grid-template-columns: repeat(4, 150px);
  gap: 10px;
  padding: 16px;
}
```

### 4.6 Card Sezione

Ogni card rappresenta una sezione del modulo (12 totali).

```
.launcher-card
  ├── .launcher-card-head           ← flex row, space-between
  │     ├── .launcher-card-num      ← "01"..."12"
  │     └── .launcher-card-icon     ← SVG icona sezione
  ├── .launcher-card-name           ← nome sezione
  └── .launcher-card-desc           ← descrizione breve
```

| Proprietà | Valore |
|---|---|
| Dimensioni | `min-height: 130px`, `padding: 16px` |
| Background default | `--bg-subtle` |
| Background hover | `--bg-hover`, `border-color: --border` |
| Background selected (keyboard) | `--bg-hover`, `border-color: --accent`, `box-shadow: 0 0 0 1px --accent` |
| Border | `1px solid transparent` → visible on hover/select |
| Border-radius | `--radius` (8px) |
| Numero | `font-size: 10px`, `font-weight: 500`, `color: --text-tertiary`, `letter-spacing: 0.5px` |
| Nome | `font-size: 13px`, `font-weight: 550`, `color: --text` |
| Descrizione | `font-size: 11px`, `color: --text-tertiary`, `line-height: 1.4`, `margin-top: auto` |
| Icona | `color: --text-secondary` |
| Stato `.is-open` | `opacity: 0.45` (hover: 0.7) — indica sezione già aperta in una tab |

### 4.7 Separator

```css
.launcher-separator {
  grid-column: 1 / -1;
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}
```

### 4.8 Card Azione Default

Dopo il separator, 2 card di azione sempre presenti:

1. **Close Layer** — `_close_layer` — chiude la tab attiva
2. **Library** — `_library` — placeholder per apertura libreria moduli

Stile diversificato rispetto alle card sezione:

```css
.launcher-card--action {
  background: transparent;
  border: 1px dashed var(--border);   /* bordo tratteggiato */
  min-height: 100px;                  /* più basse */
}
.launcher-card--action:hover {
  background: var(--bg-hover);
  border-style: solid;               /* diventa solido su hover */
}
.launcher-card--action.is-selected {
  border-style: solid;
}
```

Le card azione **non hanno numero** (`.launcher-card-num` assente), solo icona + nome + descrizione.

---

## 5. Dati Sezioni

12 sezioni con struttura `{ id, label, icon, desc }`:

| # | ID | Label | Icon Key | Descrizione |
|---|---|---|---|---|
| 01 | dashboard | Dashboard | grid | Overview and key metrics |
| 02 | analytics | Analytics | chart | Traffic, funnels, insights |
| 03 | users | Users | user | Accounts and permissions |
| 04 | products | Products | box | Catalog and inventory |
| 05 | orders | Orders | list | Processing and fulfillment |
| 06 | messages | Messages | chat | Inbox and conversations |
| 07 | calendar | Calendar | cal | Events and scheduling |
| 08 | documents | Documents | file | Files, folders, sharing |
| 09 | reports | Reports | doc | Generated reports and exports |
| 10 | integrations | Integrations | plug | Third-party connections |
| 11 | billing | Billing | card | Plans, invoices, payments |
| 12 | settings | Settings | gear | Configuration and preferences |

Azioni default: `{ id: '_close_layer', icon: 'close' }`, `{ id: '_library', icon: 'lib' }`.

---

## 6. Icone SVG

Tutte le icone della grid e delle tab sono **stroke-based**, 14×14 con viewBox 0 0 24 24, `stroke-width: 1.5`, `fill: none`, `stroke: currentColor`, `stroke-linecap: round`, `stroke-linejoin: round`.

| Key | Path |
|---|---|
| `grid` | 4 rettangoli 7×7 in griglia 2×2 (con rx=1) |
| `chart` | Assi L + linea spezzata trend |
| `user` | Cerchio testa + arco corpo |
| `box` | Esagono 3D con diagonali |
| `list` | Rettangolo con 3 linee interne |
| `chat` | Bolla messaggio con coda |
| `cal` | Rettangolo con 2 pin e linea orizzontale |
| `file` | Documento con angolo piegato |
| `doc` | Documento con angolo + 2 linee testo |
| `plug` | Cerchio centrale + 4 raggi cardinali |
| `card` | Rettangolo carta credito + linea |
| `gear` | Ingranaggio con cerchio centrale |
| `close` | Due linee diagonali incrociate (×) |
| `lib` | Libro aperto con linea testo |

---

## 7. State Management

```javascript
const state = {
  openTabs: [],      // array ordinato di section id
  activeTab: null,   // id della sezione visibile
  paletteOpen: false, // launcher aperto/chiuso
  paletteIndex: 0,   // indice selezione keyboard nella grid
};
```

### 7.1 Tab Lifecycle

| Azione | Effetto |
|---|---|
| `openSection(id)` | Se non già in `openTabs`, aggiunge + crea pannello DOM. Poi `activateTab(id)`. |
| `activateTab(id)` | Imposta `activeTab`, togla `.is-active` su pannelli e tab, nasconde empty state se ci sono tab. |
| `closeTab(id)` | Rimuove da `openTabs`, rimuove pannello DOM. Se era attiva, attiva la vicina (o mostra empty state). |
| `renderTabs()` | Rigenera l'intera strip DOM dai dati `openTabs`. Chiamata dopo ogni cambio. |

### 7.2 Launcher Lifecycle

| Azione | Effetto |
|---|---|
| `openLauncher()` | `paletteOpen = true`, `paletteIndex = 0`, render grid, aggiunge `.is-open` all'overlay. |
| `closeLauncher()` | `paletteOpen = false`, rimuove `.is-open`. |
| `renderLauncherGrid()` | Genera HTML delle 12 card sezione + separator + 2 card azione. Marca `.is-open` sulle sezioni già aperte. Marca `.is-selected` sull'indice corrente. Bind click + mouseenter. |

---

## 8. Navigazione Keyboard

### 8.1 Scorciatoie Globali

| Shortcut | Azione |
|---|---|
| `Ctrl+K` | Toggle launcher (apri/chiudi) |
| `Escape` | Chiudi launcher (se aperto) |
| `Ctrl+W` | Chiudi tab attiva |
| `Ctrl+Tab` | Tab successiva |
| `Ctrl+Shift+Tab` | Tab precedente |
| `Ctrl+1`...`Ctrl+9` | Attiva tab per posizione |

### 8.2 Navigazione Grid (quando launcher è aperto)

La grid è 4 colonne (`GRID_COLS = 4`). Il conteggio totale è `SECTIONS.length + LAUNCHER_ACTIONS.length` = 14.

| Tasto | Comportamento |
|---|---|
| `→` | Indice +1 (wrap circolare) |
| `←` | Indice -1 (wrap circolare) |
| `↓` | Indice +4 (clamp a max, no wrap) |
| `↑` | Indice -4 (clamp a 0, no wrap) |
| `Enter` | Se card sezione → `openSection()` + chiudi launcher. Se card azione → `handleLauncherAction()`. |
| `Escape` | Chiudi launcher |

### 8.3 Mouse nel Launcher

- **Mouseenter** su card: aggiorna `paletteIndex` e selezione visuale.
- **Click** su card sezione: apre sezione + chiude launcher.
- **Click** su card azione: esegue azione corrispondente.
- **Click** sull'overlay (fuori dal modal): chiude launcher.

---

## 9. Trigger Apertura Launcher

| Trigger | Elemento |
|---|---|
| Bottone dropdown (▼) nella strip | `#tabDropdownBtn` click |
| Bottone "+" nella strip | `#openPaletteBtn` click |
| Input finto nell'empty state | `#emptyStateTrigger` click |
| Keyboard | `Ctrl+K` |
| Right-click ovunque | `contextmenu` event (previene menu nativo) |

---

## 10. Empty State

Quando nessuna tab è aperta, il content area mostra:

```
.empty-state (centered absolute)
  ├── .empty-state-badge         → "Lumia" uppercase, letter-spacing 2px
  ├── .empty-state-shortcut      → [🔍 Open a section...  Ctrl K] (clickable)
  └── .empty-state-hint          → "Open the launcher to navigate anywhere"
```

L'empty state è nascosto (`display: none`) quando c'è almeno una tab aperta.

---

## 11. Content Panel (demo)

Ogni sezione genera un pannello `.section-panel` con:
- Titolo `<h1>` (24px, weight 600)
- Paragrafo descrittivo
- Griglia di 4 card statistiche (`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`)

I pannelli sono creati on-demand e rimangono nel DOM finché la tab non viene chiusa. Solo il pannello attivo ha `.is-active` (`display: block`). Animazione ingresso: `fadeIn 200ms` (opacity 0→1, translateY 6px→0).

---

## 12. Azioni Default del Launcher

| ID | Label | Icona | Comportamento |
|---|---|---|---|
| `_close_layer` | Close Layer | `close` (×) | Chiude launcher, poi chiude la tab attiva |
| `_library` | Library | `lib` (libro) | Chiude launcher. **TODO**: aprirà la libreria moduli quando disponibile |

Queste card appaiono **sempre** in fondo alla grid, dopo un separator, indipendentemente dalle sezioni del modulo. Sono visualmente distinte con bordo tratteggiato.

---

## 13. Annotazioni Implementative

1. **Zero dipendenze**: nessun framework, nessuna libreria CSS/JS.
2. **Tutto è inline SVG**: nessun icon font, nessun sprite. Le SVG sono stringhe in un oggetto `ICONS`.
3. **DOM generato da JS**: tab strip e launcher grid sono interamente generati/rigenerati via `innerHTML` + event binding.
4. **CSS transitions** ovunque (150ms ease), nessuna animazione complessa.
5. **Radial gradient** per le curve delle tab attive: tecnica Chrome-style, non border-radius puri.
6. **Tab persistenti**: i pannelli restano nel DOM (non vengono distrutti al cambio tab), solo nascosti.
7. **Responsive**: non previsto. Desktop only, dimensioni fisse per grid card (150px) e tab (max 200px).
8. **Scrollbar custom**: webkit scrollbar 6px con thumb `--border` color.
