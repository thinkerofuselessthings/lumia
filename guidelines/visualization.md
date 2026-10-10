# Visualization — Sistema di Visualizzazione Terapie, CTCAE e Diagnosi

> Architettura CSS e pattern di rendering per i tre moduli clinici principali:
> Terapie (timeline Gantt, vista giornaliera, lista), CTCAE (eventi avversi, stepper, timeline follow-up), Diagnosi (bento grid, albero ICD-11).
> File sorgente: `public/css/landing.css`, righe ~5500–8800.

---

## Indice

1. [Panoramica architettura](#1-panoramica-architettura)
2. [CTCAE — Eventi Avversi](#2-ctcae--eventi-avversi)
   - 2.1 [Layout sezione](#21-layout-sezione)
   - 2.2 [Event card](#22-event-card)
   - 2.3 [Grade badge e colori](#23-grade-badge-e-colori)
   - 2.4 [Stato badge](#24-stato-badge)
   - 2.5 [Stepper modale](#25-stepper-modale)
   - 2.6 [Lista tabellare](#26-lista-tabellare)
   - 2.7 [Timeline follow-up](#27-timeline-follow-up)
3. [Terapie](#3-terapie)
   - 3.1 [Layout con topbar](#31-layout-con-topbar)
   - 3.2 [Therapy card](#32-therapy-card)
   - 3.3 [Stato badge terapie](#33-stato-badge-terapie)
   - 3.4 [Vista Timeline (Gantt)](#34-vista-timeline-gantt)
   - 3.5 [Vista giornaliera](#35-vista-giornaliera)
   - 3.6 [Vista lista](#36-vista-lista)
   - 3.7 [Stepper modale farmaco](#37-stepper-modale-farmaco)
4. [Diagnosi](#4-diagnosi)
   - 4.1 [Layout e lista](#41-layout-e-lista)
   - 4.2 [Bento grid dettaglio](#42-bento-grid-dettaglio)
   - 4.3 [Albero ICD-11](#43-albero-icd-11)
   - 4.4 [Stato badge diagnosi](#44-stato-badge-diagnosi)
5. [Chains — Connessioni cliniche](#5-chains--connessioni-cliniche)
6. [Pattern condivisi](#6-pattern-condivisi)

---

## 1. Panoramica architettura

Tutti i moduli clinici condividono:
- **Layout fullpage** — `display: flex; flex-direction: column; height: 100%`
- **Content area scrollabile** — `flex: 1; overflow-y: auto`
- **Token condivisi** da `base.css` (grigi, spaziature, font)
- **Colore accento clinico** — `--acqua-sea` (#6BAAAE) come primario per CTA e selezioni
- **Colore secondario** — `--blue-fantastic` (#2C3B4D) per chip/toggle selezionati
- **Sfondo hover card** — `--palladian` (#F9F8F6)

Pattern modali: dimensioni forzate tramite selettore `:has()` per stabilità:

```css
.node-modal .node-content:has([data-XX-edit-node]) {
  width: min(960px, 95%);
  height: min(780px, 90vh);
}
```

---

## 2. CTCAE — Eventi Avversi

Prefisso classi: `ct-`

### 2.1 Layout sezione

```css
.ct-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  height: 100%;
}
.ct-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.ct-content-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

Header con titolo a sinistra + bottone "Aggiungi" a destra:

```css
.ct-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.ct-add-btn {
  font-size: var(--font-size-xs);
  padding: 6px 12px;
  border-radius: 8px;
}
```

### 2.2 Event card

Struttura: riga orizzontale con `border-left: 3px solid var(--muted)` per accento cromatico del grado.

```css
.ct-event-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--line);
  border-radius: 10px;
  transition: background 120ms ease;
}
.ct-event-card:hover {
  background: var(--palladian, #f9f8f6);
}
.ct-event-left {
  flex: 1;
  border-left: 3px solid var(--muted);
  padding-left: var(--space-sm);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
```

Elementi interni:
- `.ct-grade-badge` — badge numerico grado (G1–G5), colore sfondo da JS `GRADE_COLORS`
- `.ct-ae-term` — nome evento avverso, `font-weight: 600`
- `.ct-soc-tag` — classificazione SOC, badge piccolo grigio `background: var(--gray-100)`
- `.ct-event-details` — riga dettagli (data, frequenza)
- `.ct-event-corr` — correlazione farmaco

### 2.3 Grade badge e colori

```css
.ct-grade-badge {
  min-width: 28px;
  height: 22px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}
```

Colori per grado (definiti in JS `paziente-ctcae.js` via `GRADE_COLORS`):

| Grado | Colore | Hex |
|---|---|---|
| G1 | Verde | `#4CAF50` |
| G2 | Giallo | `#FFC107` |
| G3 | Arancione | `#FF9800` |
| G4 | Rosso | `#F44336` |
| G5 | Viola | `#9C27B0` |

Legenda visiva in testa alla sezione:

```css
.ct-grade-legend {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  font-size: var(--font-size-xs);
}
.ct-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
```

### 2.4 Stato badge

Badge inline per lo stato dell'evento avverso:

```css
.ct-stato-badge {
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
}
```

| Classe | Background | Testo |
|---|---|---|
| `.ct-stato-in_corso` | `#dbeafe` | `#1d4ed8` (blu) |
| `.ct-stato-risolto` | `#dcfce7` | `#15803d` (verde) |
| `.ct-stato-risolto_con_sequele` | `#fef3c7` | `#92400e` (ambra) |
| `.ct-stato-fatale` | `#fee2e2` | `#991b1b` (rosso scuro) |
| `.ct-stato-sconosciuto` | `var(--gray-400)` | `#fff` |

### 2.5 Stepper modale

Wizard 4 step: SOC → Termine → Grado → Dettagli. Dimensioni forzate `960px × 780px`.

**Barra step indicator:**

```css
.ct-stepper-bar {
  display: flex;
  align-items: center;
  padding: 0 0 var(--space-md) 0;
  border-bottom: 1px solid var(--line);
}
.ct-step-num {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 1.5px solid var(--line);
  font-size: 0.68rem;
  font-weight: 700;
}
```

Stati step:
- **active** → `.ct-step-num` con `background: var(--acqua-sea)`, `color: #fff`
- **completed** → `.ct-step-num` con `background: var(--blue-fantastic)`, `color: #fff`
- **default** → bordo grigio, testo muted

**Panel step:**

```css
.ct-step-panel {
  display: none;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.ct-step-panel.active { display: flex; }
```

**Step 1 — SOC list:** opzioni con bordo, hover `--palladian`, selected `background: var(--acqua-sea), color: #fff`

**Step 2 — Term list:** search input + opzioni cliccabili, stessa semantica colori

**Step 3 — Grade selection:** card con accento cromatico per grado:

```css
.ct-grade-card {
  border: 2px solid var(--line);
  border-radius: 10px;
}
.ct-grade-card.selected {
  border-color: var(--grade-color);
  background: color-mix(in srgb, var(--grade-color) 8%, #fff);
}
```

**Step 4 — Dettagli:** form con layout `label-left / input-right`:

```css
.ct-detail-field {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 6px 0;
  border-bottom: 1px solid var(--line);
}
.ct-detail-label { flex: 0 0 140px; font-weight: 600; }
.ct-detail-input { flex: 1; }
```

Toggle button e correlazione:

```css
.ct-toggle-btn.selected {
  background: var(--blue-fantastic);
  color: #fff;
}
.ct-corr-item.selected {
  background: var(--acqua-sea);
  color: #fff;
}
```

**Navigazione:**

```css
.ct-stepper-nav {
  display: flex;
  justify-content: space-between;
  padding-top: var(--space-md);
  border-top: 1px solid var(--line);
  margin-top: auto;
}
.ct-nav-btn.primary {
  background: var(--acqua-sea);
  color: #fff;
}
```

**Selection summary chips:**

```css
.ct-summary-chip {
  padding: 2px 8px;
  background: var(--blue-fantastic);
  color: #fff;
  border-radius: 4px;
  font-size: 0.65rem;
}
```

### 2.6 Lista tabellare

Righe flex con colonne a larghezza fissa:

```css
.ct-list-table { display: flex; flex-direction: column; }
.ct-list-row {
  display: flex;
  align-items: center;
  padding: 7px var(--space-sm);
  border-bottom: 1px solid var(--line);
}
.ct-list-row:hover { background: var(--palladian); }
.ct-list-row-closed { opacity: 0.6; }
```

Colonne:

| Classe | Larghezza | Contenuto |
|---|---|---|
| `.ct-col-grade` | `40px` fisso | Badge grado |
| `.ct-col-term` | `flex: 2` | Nome + definizione |
| `.ct-col-soc` | `flex: 1` | Classificazione SOC |
| `.ct-col-corr` | `130px` fisso | Correlazione |
| `.ct-col-date` | `90px` fisso | Data |
| `.ct-col-stato` | `100px` fisso | Badge stato |
| `.ct-col-act` | `90px` fisso | Azioni (edit/delete) |

Azioni riga visibili solo su hover:

```css
.ct-row-btn { opacity: 0; }
.ct-list-row:hover .ct-row-btn { opacity: 1; }
.ct-row-btn--danger:hover { background: #fce4ec; color: #d32f2f; }
```

### 2.7 Timeline follow-up

Cronologia verticale con linea connettrice e marker colorati:

```css
.ct-followup-timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 20px;
}
.ct-followup-timeline::before {
  content: "";
  position: absolute;
  left: 9px;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--line);
}
.ct-followup-marker {
  width: 20px; height: 20px;
  border-radius: 50%;
  font-size: 0.58rem;
  font-weight: 700;
  color: #fff;
  z-index: 1;
  margin-left: -20px;
}
```

Colore marker = colore del grado al momento del follow-up.

---

## 3. Terapie

Prefisso classi: `tp-`

### 3.1 Layout con topbar

Layout globale: topbar fissa + area contenuto scrollabile.

```css
.tp-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.tp-topbar {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  height: 40px;
  border-bottom: 1px solid var(--line);
  background: var(--white);
}
.tp-content-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md) var(--space-lg);
}
```

Topbar con navigazione centrata (icon-only tab) e azioni posizionate absolute:

```css
.tp-topbar-tab {
  width: 36px; height: 36px;
  border-radius: var(--border-radius-sm);
  color: var(--gray-400);
}
.tp-topbar-tab--active { color: var(--gray-900); }
.tp-topbar-tab:hover { color: var(--gray-700); background: var(--gray-100); }
```

**Period selector** (per timeline):

```css
.tp-period-selector {
  display: flex;
  background: var(--gray-100);
  border-radius: 6px;
  padding: 2px;
}
.tp-period-btn.tp-period-active {
  background: var(--card, #fff);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}
```

### 3.2 Therapy card

Card per singola terapia nella vista card:

```css
.tp-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.tp-card:hover { border-color: var(--acqua-sea); }
.tp-card-history { opacity: .7; }
```

Elementi interni:
- `.tp-drug-icon` — icona farmaco, colore `--acqua-sea`
- `.tp-drug-name` — `font-weight: 600`, `font-size: var(--font-size-sm)`
- `.tp-atc-badge` — codice ATC, `background: var(--blue-fantastic)`, `color: #fff`, font `0.6rem`
- `.tp-poso-row` — posologia, `font-size: var(--font-size-xs)`
- `.tp-date-row` — date, `font-size: 0.65rem`, `color: var(--gray-400)`
- `.tp-indication-row` — indicazione, `color: var(--acqua-sea)`, corsivo
- `.tp-motivo-row` — motivo chiusura, `color: var(--truffle-trouble)` (#A35139)

### 3.3 Stato badge terapie

```css
.tp-stato-badge {
  font-size: .55rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: .04em;
}
```

| Classe | Background | Testo |
|---|---|---|
| `.tp-stato-attiva` | `#dcfce7` | `#166534` (verde scuro) |
| `.tp-stato-sospesa` | `#fef9c3` | `#854d0e` (ambra) |
| `.tp-stato-terminata` | `var(--gray-100)` | `var(--gray-500)` |
| `.tp-stato-sostituita` | `#e0e7ff` | `#3730a3` (indaco) |

### 3.4 Vista Timeline (Gantt)

Il cuore della visualizzazione terapie: un diagramma Gantt scrollabile orizzontalmente.

**Struttura:**

```
.tp-tl-container (flex)
  ├── .tp-tl-labels (fixed left, 230px, z-index: 10)
  │     ├── .tp-tl-label-row × N (drug name + posologia + actions)
  │     └── .tp-tl-group-label (separatore "Attive" / "Storico")
  └── .tp-tl-scroll (margin-left: 230px, overflow-x: auto)
        └── .tp-tl-scroll-inner
              ├── .tp-tl-row × N
              │     └── .tp-tl-track (position: relative)
              │           ├── .tp-tl-bar (absolute, Gantt bar)
              │           ├── .tp-tl-day-grid (gridlines verticali)
              │           ├── .tp-tl-month (label mese)
              │           └── .tp-tl-today-line (linea "oggi")
              └── .tp-tl-group-spacer
```

**Labels panel (fisso a sinistra):**

```css
.tp-tl-labels {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 230px;
  z-index: 10;
  background: var(--card, #fff);
  border-right: 1px solid var(--line);
}
.tp-tl-label-row {
  min-height: 60px;
  border-bottom: 1px solid var(--gray-100);
}
.tp-tl-drug-name { font-size: .7rem; font-weight: 600; }
.tp-tl-drug-poso { font-size: .58rem; color: var(--gray-400); }
```

**Barre Gantt:**

```css
.tp-tl-bar {
  position: absolute;
  top: 8px;
  height: 28px;
  min-width: 18px;
  z-index: 2;
}
```

Colori barra per stato:

| Classe | Colore sfondo |
|---|---|
| `.tp-tl-bar-attiva` | `rgba(107,170,174,.65)` (acqua-sea semitrasparente) |
| `.tp-tl-bar-sospesa` | `rgba(255,177,98,.5)` (burning-flame semitrasparente) |
| `.tp-tl-bar-terminata` | `var(--gray-200)` |
| `.tp-tl-bar-sostituita` | `rgba(99,102,241,.25)` (indaco semitrasparente) |

**Linea "oggi":**

```css
.tp-tl-today-line {
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--truffle-trouble, #A35139);
  opacity: .7;
  z-index: 3;
}
```

**Gridlines giornaliere:**

```css
.tp-tl-day-grid {
  position: absolute;
  top: 0; bottom: 0;
  width: 1px;
  background: var(--gray-100);
  z-index: 0;
}
.tp-tl-day-grid-sun { background: rgba(255,177,98,.15); }  /* Domenica */
.tp-tl-day-grid-month { background: var(--gray-300); }     /* Primo del mese */
```

**Bande mese alternate:**

```css
.tp-tl-month-even { background: rgba(107,170,174,.045); }
```

**Controlli zoom:**

```css
.tp-zoom-btn {
  width: 28px; height: 28px;
  border: 1px solid var(--line);
  border-radius: var(--border-radius-sm);
}
.tp-range-input { width: 100px; font-size: .6rem; }
```

### 3.5 Vista giornaliera

Mostra le somministrazioni di una singola giornata su una linea oraria (0–24h).

```css
.tp-day-container { display: flex; flex-direction: column; }
```

Ogni riga farmaco ha un track con pill dots per ogni orario:

```css
.tp-day-pill {
  position: absolute;
  top: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 3;
}
.tp-day-pill-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--acqua-sea);
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px var(--acqua-sea);
}
.tp-day-pill-time {
  font-size: .48rem;
  font-weight: 700;
  color: var(--acqua-sea);
}
```

Linea "adesso":

```css
.tp-day-now {
  width: 2px;
  background: var(--truffle-trouble);
  opacity: .5;
  z-index: 2;
}
```

### 3.6 Vista lista

Tabella flex compatta con colonne:

```css
.tp-list-table {
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.tp-list-hdr {
  background: var(--gray-50);
  border-bottom: 1px solid var(--line);
}
.tp-list-row:hover { background: var(--gray-50); }
.tp-list-row-hist { opacity: .55; }
```

Colonne:

| Classe | Larghezza | Contenuto |
|---|---|---|
| `.tp-list-col-drug` | `flex: 2` | Nome farmaco |
| `.tp-list-col-poso` | `flex: 2` | Posologia |
| `.tp-list-col-via` | `flex: 1` | Via di somministrazione |
| `.tp-list-col-date` | `flex: 1.5` | Date inizio/fine |
| `.tp-list-col-stato` | `70px` fisso | Badge stato |
| `.tp-list-col-act` | `90px` fisso | Azioni |

### 3.7 Stepper modale farmaco

Dimensioni forzate `900px × 720px`. Riuso dei componenti stepper CTCAE (`ct-step-panel`, `ct-stepper-nav`).

**Step 1 — Ricerca farmaco:**

```css
.tp-search-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.tp-search-input-row:focus-within { border-color: var(--acqua-sea); }
```

Drug selected chip su sfondo verde:

```css
.tp-drug-selected {
  background: #dcfce7;
  border-radius: 8px;
  padding: var(--space-sm) var(--space-md);
}
```

**Step 2 — Posologia:**

Griglia orari multi-select:

```css
.tp-orario-chip {
  padding: 4px 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: 0.7rem;
}
.tp-orario-chip.tp-orario-active {
  background: var(--acqua-sea);
  color: #fff;
}
```

Preset giorni:

```css
.tp-preset-btn.tp-preset-active {
  background: var(--acqua-sea);
  color: #fff;
}
```

---

## 4. Diagnosi

Prefisso classi: `dx-` (lista), `ddl-` (dettaglio)

### 4.1 Layout e lista

```css
.dx-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.dx-content-area {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-sm) var(--space-md);
}
```

Colonne lista:

| Classe | Larghezza | Contenuto |
|---|---|---|
| `.dx-col-stato` | `80px` fisso | Badge stato |
| `.dx-col-icd` | `90px` fisso | Codice ICD-11 (monospace) |
| `.dx-col-desc` | `flex: 1` | Descrizione |
| `.dx-col-tipo` | `90px` fisso | Tipo diagnosi |
| `.dx-col-stadio` | `80px` fisso | Stadio |
| `.dx-col-date` | `80px` fisso | Data |

Codice ICD-11 in monospace:

```css
.dx-col-icd code {
  font-family: var(--font-mono, "SFMono-Regular", "Consolas", monospace);
  font-size: .72rem;
  background: var(--gray-100);
  padding: 1px 5px;
  border-radius: 3px;
}
```

### 4.2 Bento grid dettaglio

La scheda di dettaglio diagnosi usa un layout grid 3 colonne ("bento") con celle specializzate.

```css
.ddl-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
  padding: var(--space-md) 0;
}
```

**Cella base:**

```css
.ddl-bento-cell {
  background: var(--card-bg, #fff);
  border: 1px solid var(--line);
  border-radius: var(--radius-md, 8px);
  padding: var(--space-sm) var(--space-md);
}
.ddl-bento-cell:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,.06);
}
```

**Cella label + value:**

```css
.ddl-bento-cell-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.ddl-bento-cell-value {
  font-size: var(--font-size-sm);
  color: var(--text);
}
```

**Varianti cella:**

| Classe | Grid span | Caratteristica |
|---|---|---|
| `.ddl-bento-hero` | `grid-column: 1 / -1` | Full width, gradient `linear-gradient(135deg, card-bg → palladian)` |
| `.ddl-bento-code` | `span 1` | Valore code grande `0.95rem`, colore `--primary` (#1565C0) |
| `.ddl-bento-path` | `span 2` | Percorso ICD-11, `font-size: 0.72rem` |
| `.ddl-bento-note` | `grid-column: 1 / -1` | Full width, `border-left: 3px solid var(--line)` |
| `.ddl-bento-note--chiusura` | 1/-1 | `border-left-color: #FF9800`, `background: #fff8e1` |
| `.ddl-bento-sm` | `span 1` | Cella piccola con icona |

**Hero cell (titolo diagnosi):**

```css
.ddl-bento-hero {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, var(--card-bg) 0%, var(--palladian) 100%);
  padding: var(--space-md) var(--space-lg);
}
.ddl-bento-hero-title {
  font-size: 1.15rem;
  font-weight: 700;
}
.ddl-bento-stato {
  font-size: 0.7rem;
  padding: 4px 14px;
  border-radius: 20px;
  font-weight: 600;
}
```

### 4.3 Albero ICD-11

Tree gerarchico con connettori arrotondati, usato sia nel dettaglio diagnosi che nel browser ICD-11 dello stepper.

```css
.ddl-icd-tree {
  --tree-indent: 1rem;
  --tree-line-w: 1px;
  --tree-line-color: #d0d0d4;
  --tree-radius: 6px;
}
```

Connettori:
- **Verticale** — `border-left` su ogni `li`
- **Orizzontale** — `::before` con `border-top`
- **Ultimo figlio** — `::before` senza `border-top`, con `border-left` + `border-bottom` + `border-bottom-left-radius: 6px` per effetto └ arrotondato
- **Root** — nessun connettore

**Kind badge** (icona tipo nodo):

```css
.ddl-icd-tree-icon {
  width: 1.55rem; height: 1.2rem;
  border-radius: 4px;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
}
```

| Classe | Background | Testo | Label |
|---|---|---|---|
| `.ddl-icd-tree-icon--chapter` | `#e8eaf6` | `#283593` | CH |
| `.ddl-icd-tree-icon--block` | `#e0f2f1` | `#00695c` | BK |
| `.ddl-icd-tree-icon--cat` | `#fff3e0` | `#e65100` | CT |

**Badge ICD-11 nella lista:**

```css
.dx-icd11-badge {
  font-size: .55rem;
  background: #e3f2fd;
  color: #1565C0;
  border-radius: 2px;
  font-weight: 600;
}
```

### 4.4 Stato badge diagnosi

Colori definiti in JS (`paziente-diagnosi.js` → `STATO_COLORS`):

| Stato | Background | Testo |
|---|---|---|
| Attiva | rosso chiaro | rosso |
| Risolta | verde chiaro | verde |
| Cronica | arancione chiaro | arancione |
| Sospetta | grigio chiaro | grigio |

I valori sono applicati inline via JS; le classi CSS usano il pattern `.ddl-bento-stato` con border-radius `20px` (pill).

---

## 5. Chains — Connessioni cliniche

Prefisso classi: `ch-`

Modulo che collega diagnosi ↔ terapie ↔ CTCAE.

### 5.1 Layout

```css
.ch-layout { display: flex; flex-direction: column; height: 100%; }
.ch-canvas { flex: 1; overflow: auto; padding: var(--space-md); }
```

### 5.2 Pairs grid

Coppie di mini-card connesse:

```css
.ch-pair {
  display: flex;
  align-items: center;
  border: 1px solid var(--gray-200);
  border-radius: 10px;
  padding: 10px 12px;
}
.ch-pair:hover { box-shadow: 0 2px 10px rgba(0,0,0,.06); }
```

**Mini card:**

```css
.ch-mini {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--gray-200);
  border-radius: 6px;
  min-width: 150px;
  max-width: 210px;
}
```

Colori sfondo per tipo:

| Classe | Background |
|---|---|
| `.ch-mini-diagnosi` | `#e8f5f5` |
| `.ch-mini-terapia` | `#e8edf2` |
| `.ch-mini-ctcae` | `#fce8e8` |

Icone colore:
- `.ch-icon-diagnosi` → `var(--acqua-sea)` (#6BAAAE)
- `.ch-icon-terapia` → `var(--blue-fantastic)` (#2C3B4D)
- `.ch-icon-ctcae` → `#E57373`

### 5.3 Wizard 3 colonne

Dimensioni forzate `1300px × 700px`. Layout:

```css
.ch-wiz-columns {
  display: flex;
  gap: 12px;
  flex: 1;
}
.ch-wiz-col { flex: 1; border: 1px solid var(--gray-200); border-radius: 8px; }
.ch-wiz-col-actions { flex: 0 0 260px; }
```

Selezione con `accent-color: var(--acqua-sea)`. Tab filtro tipo:

```css
.ch-wiz-tab-active {
  background: var(--acqua-sea);
  color: #fff;
}
```

---

## 6. Pattern condivisi

### 6.1 Colore selezione

In tutti i moduli:
- **Selezione primaria** → `background: var(--acqua-sea)`, `color: #fff`
- **Chip selezionato** → `background: var(--blue-fantastic)`, `color: #fff`
- **Hover card** → `background: var(--palladian)` (#F9F8F6)

### 6.2 Modal sizing pattern

```css
.node-modal .node-content:has([data-XX-edit-node]) {
  width: min(Wpx, Wvw);
  height: min(Hpx, Hvh);
}
```

| Modulo | Width | Height |
|---|---|---|
| CTCAE edit | `960px / 95%` | `780px / 90vh` |
| CTCAE view | `720px / 90%` | auto |
| CTCAE follow-up | `820px / 95%` | `700px / 85vh` |
| Terapie edit | `900px / 80vw` | `720px / 80vh` |
| Diagnosi edit | `960px / 95%` | `780px / 90vh` |
| Chains wizard | `1300px / 92%` | `700px / 85vh` |

### 6.3 Stepper riuso

CTCAE e Terapie condividono le stesse classi stepper:
- `.ct-stepper-bar`, `.ct-step-indicator`, `.ct-step-panel`
- `.ct-stepper-nav`, `.ct-nav-btn`
- `.ct-selection-summary`, `.ct-summary-chip`

Diagnosi usa `[data-dx-stepper-body]` con gli stessi panel.

### 6.4 Azioni riga hover

Pattern "reveal on hover" usato in CTCAE list e Terapie timeline:

```css
.ct-row-btn { opacity: 0; transition: opacity 120ms; }
.ct-list-row:hover .ct-row-btn,
.tp-tl-label-row:hover .ct-row-btn { opacity: 1; }
```

### 6.5 Linea "oggi"

Usata in terapie timeline e diagnosi timeline:

```css
.tp-tl-today-line {
  width: 2px;
  background: var(--truffle-trouble, #A35139);
  opacity: .7;
  z-index: 3;
}
```
