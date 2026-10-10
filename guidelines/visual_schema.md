# Visual Schema — Timeline Farmaci, CTCAE e Diagnosi

> **Scopo**: Documentare la struttura CSS e JS che genera le viste timeline (Gantt) per i moduli Terapie (farmaci), CTCAE (eventi avversi) e Diagnosi all'interno del sistema paziente di Janus.  
> **Destinatario**: Agent che deve replicare o manutenere queste viste.

---

## Indice

1. [Architettura generale](#1-architettura-generale)
2. [Design tokens e palette colori](#2-design-tokens-e-palette-colori)
3. [File sorgente](#3-file-sorgente)
4. [Struttura DOM condivisa: il Gantt chart](#4-struttura-dom-condivisa-il-gantt-chart)
5. [CSS del Gantt — Classi `tp-tl-*`](#5-css-del-gantt--classi-tp-tl-)
6. [Modulo Terapie (Farmaci)](#6-modulo-terapie-farmaci)
7. [Modulo CTCAE (Eventi avversi)](#7-modulo-ctcae-eventi-avversi)
8. [Modulo Diagnosi](#8-modulo-diagnosi)
9. [Logica temporale e scroll](#9-logica-temporale-e-scroll)
10. [Controlli condivisi: periodo, zoom, range](#10-controlli-condivisi-periodo-zoom-range)
11. [Vista Daily (solo Terapie)](#11-vista-daily-solo-terapie)
12. [Vista Lista](#12-vista-lista)
13. [Top bar e switching viste](#13-top-bar-e-switching-viste)
14. [Colori stato e badge](#14-colori-stato-e-badge)
15. [Pattern di replica](#15-pattern-di-replica)

---

## 1. Architettura generale

Tutti e tre i moduli (Terapie, CTCAE, Diagnosi) condividono lo **stesso pattern di rendering Gantt** con classi CSS identiche prefissate `tp-tl-*`. La differenza sta nei:

- **Data attributes** usati per il routing eventi (prefisso `data-tp-*`, `data-ct-*`, `data-dx-*`)
- **Campi dati** letti da ciascun record (date di inizio/fine, stato, etichette)
- **Periodi default** e granularità zoom
- **Colori delle barre** (per stato in Terapie, per grade in CTCAE, per stato in Diagnosi)

```
┌──────────────────────────────────────────────────────────┐
│  tp-topbar  (nav icone: Timeline · Daily · Lista)        │
├──────────────────────────────────────────────────────────┤
│  tp-tl-controls  (periodo · zoom · range date)           │
├───────────────┬──────────────────────────────────────────┤
│  tp-tl-labels │  tp-tl-scroll                            │
│  (overlay     │  ┌──────────────────────────────────┐   │
│   fixed left) │  │ tp-tl-scroll-inner  (width: N px)│   │
│               │  │ ┌ tp-tl-axis-row (month/day lbl) │   │
│               │  │ ├ tp-tl-row  →  tp-tl-track      │   │
│               │  │ │   ├ month-bg bands              │   │
│               │  │ │   ├ day-grid lines              │   │
│               │  │ │   ├ tp-tl-bar  (la barra Gantt) │   │
│               │  │ │   └ tp-tl-today-line            │   │
│               │  │ ├ ...                             │   │
│               │  │ └────────────────────────────────┐│   │
│               │  └──────────────────────────────────┘   │
└───────────────┴──────────────────────────────────────────┘
```

---

## 2. Design tokens e palette colori

Definiti in `public/css/base.css` `:root`:

| Token | Valore | Uso |
|-------|--------|-----|
| `--gray-50` | `#FAFAFA` | Background track |
| `--gray-100` | `#F5F5F5` | Border row, separator |
| `--gray-200` | `#EEEEEE` | line base |
| `--gray-300` | `#E0E0E0` | Grid month line |
| `--gray-400` | `#BDBDBD` | Label muted |
| `--gray-500` | `#9E9E9E` | Day labels |
| `--card` | `#fff` | Background labels overlay |
| `--line` | (alias `--border-color`) | Border generici |
| `--acqua-sea` | `#6BAAAE` | Colore primario Janus (barre attive, accenti) |
| `--truffle-trouble` | `#A35139` | "Oggi" line + label |
| `--palladian` | `#f9f8f6` | Hover row |
| `--font-size-xs` | `0.75rem` | Testo base tabelle |

---

## 3. File sorgente

### JavaScript (providers)

| File | Linee | Entry point | Modulo |
|------|-------|-------------|--------|
| `public/js/layers/providers/paziente-terapie.js` | 1606 | `__renderTerapie(container, nodeId)` | Farmaci |
| `public/js/layers/providers/paziente-ctcae.js` | 1492 | `__renderCtcae(container, nodeId)` | CTCAE |
| `public/js/layers/providers/paziente-diagnosi.js` | 1766 | `__renderDiagnosi(container, nodeId)` | Diagnosi |

### CSS

| File | Sezione | Linee circa |
|------|---------|------------|
| `public/css/landing.css` | `TERAPIE — TIMELINE VIEW` | 7069–7200 |
| `public/css/landing.css` | `TERAPIE — DAILY VIEW` | 7340–7430 |
| `public/css/landing.css` | `TERAPIE — LIST VIEW` | 7430–7540 |
| `public/css/landing.css` | Timeline controls | 7292–7340 |
| `public/css/landing.css` | `CTCAE — LIST TABLE` | 6270–6400 |
| `public/css/landing.css` | CTCAE badges/legend | 5600–5730 |
| `public/css/landing.css` | `DIAGNOSI MODULE` | 7650–7750 |
| `public/css/base.css` | Design tokens `:root` | 1–80 |

---

## 4. Struttura DOM condivisa: il Gantt chart

Ogni modulo genera un albero DOM identico. Di seguito la struttura completa con nomi di classe:

```html
<!-- Layout wrapper (varia: tp-layout | ct-layout | dx-layout) -->
<div class="tp-layout" data-tp-node="NODE_ID" data-tp-uuid="UUID">

  <!-- ── Top bar con tab di switching ── -->
  <div class="tp-topbar">
    <div class="tp-topbar-left">
      <button class="tp-filter-toggle"><!-- filtro storico --></button>
    </div>
    <nav class="tp-topbar-nav">
      <button class="tp-topbar-tab tp-topbar-tab--active"><!-- icona vista --></button>
      <!-- ... ulteriori tab ... -->
    </nav>
    <div class="tp-topbar-actions">
      <button class="tp-topbar-add"><!-- + --></button>
    </div>
  </div>

  <!-- ── Content area ── -->
  <div class="tp-content-area" data-tp-content-area>

    <!-- ── Pannello controlli timeline ── -->
    <div class="tp-tl-controls">
      <div class="tp-ctrl-group">
        <span class="tp-ctrl-label">Periodo</span>
        <div class="tp-period-selector">
          <button class="tp-period-btn tp-period-active">1m</button>
          <button class="tp-period-btn">3m</button>
          <!-- ... -->
        </div>
      </div>
      <div class="tp-ctrl-group">
        <span class="tp-ctrl-label">Zoom</span>
        <button class="tp-zoom-btn"><!-- zoom out --></button>
        <button class="tp-zoom-btn"><!-- zoom in --></button>
      </div>
      <div class="tp-ctrl-group">
        <span class="tp-ctrl-label">Range</span>
        <input type="date" class="tp-range-input" />
        <span class="tp-range-sep">—</span>
        <input type="date" class="tp-range-input" />
      </div>
    </div>

    <!-- ── Container Gantt con scroll ── -->
    <div class="tp-tl-container">

      <!-- LABELS OVERLAY (posizionato absolute, z-index 10) -->
      <div class="tp-tl-labels">
        <div class="tp-tl-label-row tp-tl-label-axis"></div>
        <div class="tp-tl-group-label">Attive / Sospese</div>
        <div class="tp-tl-label-row">
          <div class="tp-tl-label">
            <div class="tp-tl-drug-name">Rituximab</div>
            <div class="tp-tl-drug-poso">375 mg/m² · IV</div>
          </div>
          <div class="tp-tl-actions">
            <button class="bg-item-btn"><!-- edit --></button>
            <button class="bg-item-btn"><!-- stop --></button>
            <button class="bg-item-btn"><!-- history --></button>
          </div>
        </div>
        <!-- ... altre righe ... -->
      </div>

      <!-- SCROLLABLE TRACK AREA -->
      <div class="tp-tl-scroll">
        <div class="tp-tl-scroll-inner" style="width: 660px;">

          <!-- Axis row (labels mesi/giorni) -->
          <div class="tp-tl-row tp-tl-axis-row" style="width: 660px;">
            <div class="tp-tl-track" style="width: 660px; height: 22px;">
              <div class="tp-tl-month-bg tp-tl-month-even" style="left:0;width:132px"></div>
              <div class="tp-tl-day-grid" style="left: 0px"></div>
              <div class="tp-tl-day-grid tp-tl-day-grid-sun" style="left: 44px"></div>
              <div class="tp-tl-day-grid tp-tl-day-grid-month" style="left: 132px"></div>
              <span class="tp-tl-day-lbl" style="left: 0px">1</span>
              <span class="tp-tl-month" style="left: 0px">Gen '26</span>
              <span class="tp-tl-today-lbl" style="left: 506px">Oggi</span>
            </div>
          </div>

          <!-- Data row (una per record) -->
          <div class="tp-tl-row" style="width: 660px;">
            <div class="tp-tl-track" style="width: 660px;">
              <!-- sfondo bande mesi (pari/dispari) -->
              <div class="tp-tl-month-bg tp-tl-month-even" ...></div>
              <!-- gridline verticali -->
              <div class="tp-tl-day-grid" style="left: 22px"></div>
              <!-- BARRA GANTT -->
              <div class="tp-tl-bar tp-tl-bar-attiva"
                   style="left: 110px; width: 396px"
                   title="Rituximab · 15/01/2026 – in corso · Attiva">
                <span class="tp-tl-bar-text">Rituximab</span>
              </div>
              <!-- linea "oggi" -->
              <div class="tp-tl-today-line" style="left: 506px"></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</div>
```

---

## 5. CSS del Gantt — Classi `tp-tl-*`

### Container e scroll

```css
.tp-tl-container {
  display: flex;
  position: relative;
  min-height: 0;
  flex: 1;
}

.tp-tl-scroll {
  margin-left: 230px;     /* spazio per labels overlay */
  flex: 1;
  overflow-x: auto;       /* scroll orizzontale */
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.tp-tl-scroll-inner {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  /* width inline: totalDays × dayPx */
}
```

### Labels overlay (fixed left panel)

```css
.tp-tl-labels {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 230px;
  z-index: 10;
  background: var(--card, #fff);
  border-right: 1px solid var(--line);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tp-tl-label-row {
  display: flex;
  align-items: center;
  min-height: 60px;
  border-bottom: 1px solid var(--gray-100);
}

.tp-tl-drug-name {
  font-size: .7rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tp-tl-drug-poso {
  font-size: .58rem;
  color: var(--gray-400);
}
```

### Righe e track

```css
.tp-tl-row {
  display: flex;
  align-items: center;
  min-height: 60px;
  border-bottom: 1px solid var(--gray-100);
}

.tp-tl-track {
  position: relative;
  height: 60px;
  background: var(--gray-50);
  overflow: visible;
}
```

### Barra Gantt

```css
.tp-tl-bar {
  position: absolute;
  top: 8px;
  height: 28px;
  display: flex;
  align-items: center;
  padding: 0 6px;
  min-width: 18px;
  transition: opacity .15s;
  z-index: 2;
}

.tp-tl-bar-text {
  font-size: .52rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Colori per stato (Terapie) */
.tp-tl-bar-attiva     { background: rgba(107,170,174,.65); }
.tp-tl-bar-sospesa    { background: rgba(255,177,98,.5); }
.tp-tl-bar-terminata  { background: var(--gray-200); }
.tp-tl-bar-sostituita { background: rgba(99,102,241,.25); }

.tp-tl-bar:hover { opacity: .85; cursor: pointer; }
```

### Linea "Oggi"

```css
.tp-tl-today-line {
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--truffle-trouble, #A35139);
  opacity: .7;
  z-index: 3;
}

.tp-tl-today-lbl {
  position: absolute;
  top: 2px;
  font-size: .5rem;
  font-weight: 700;
  color: var(--truffle-trouble, #A35139);
  transform: translateX(-50%);
  z-index: 4;
}
```

### Griglia giorni / mesi

```css
/* Linee verticali giornaliere */
.tp-tl-day-grid {
  position: absolute;
  top: 0; bottom: 0;
  width: 1px;
  background: var(--gray-100);
  z-index: 0;
}
.tp-tl-day-grid-sun   { background: rgba(255,177,98,.15); }  /* domenica */
.tp-tl-day-grid-month { background: var(--gray-300); }        /* primo del mese */

/* Label giorno (numero) */
.tp-tl-day-lbl {
  position: absolute;
  bottom: 2px;
  font-size: .46rem;
  font-weight: 600;
  color: var(--gray-500);
  transform: translateX(-50%);
}

/* Label mese (sopra) */
.tp-tl-month {
  position: absolute;
  top: 2px;
  font-size: .52rem;
  font-weight: 700;
  color: var(--foreground);
  transform: translateX(-50%);
}

/* Bande alternate mesi (zebra) */
.tp-tl-month-bg { position: absolute; top: 0; bottom: 0; z-index: 0; }
.tp-tl-month-even { background: rgba(107, 170, 174, .045); }
```

---

## 6. Modulo Terapie (Farmaci)

**File**: `paziente-terapie.js`  
**Prefisso data-attr**: `data-tp-*`  
**Layout wrapper**: `.tp-layout`  

### View state

```javascript
viewStates = new Map();
// nodeId → {
//   view: 'timeline' | 'daily' | 'list',
//   showHistory: boolean,
//   tlDays: 14 | 30 | 90 | 180 | 365,
//   tlDayPx: numero (default 22),
//   tlCustomStart: 'YYYY-MM-DD' | null,
//   tlCustomEnd: 'YYYY-MM-DD' | null
// }
```

### Viste disponibili

| Vista | ID | Default | Descrizione |
|-------|----|---------|-------------|
| Timeline (Gantt) | `timeline` | ✅ | Barre orizzontali scrollabili |
| Giornaliero | `daily` | | Asse orario 06:00–23:00, pill somministrazioni |
| Lista | `list` | | Tabella flex con colonne drug/poso/via/date/stato |

### Colori barre per stato

| Stato | Classe CSS | Colore |
|-------|-----------|--------|
| Attiva | `.tp-tl-bar-attiva` | `rgba(107,170,174,.65)` — acqua-sea |
| Sospesa | `.tp-tl-bar-sospesa` | `rgba(255,177,98,.5)` — arancio |
| Terminata | `.tp-tl-bar-terminata` | `var(--gray-200)` — grigio |
| Sostituita | `.tp-tl-bar-sostituita` | `rgba(99,102,241,.25)` — indaco |

### Date delle barre

```javascript
// data_inizio → left della barra
// data_fine   → right della barra
// Se data_fine assente e stato attiva/sospesa → barra arriva a "oggi"
var s = parseISODate(r.data_inizio) || today;
var e = parseISODate(r.data_fine) || (stato === 'attiva' || stato === 'sospesa' ? today : s);
var barW = Math.max(barR - barL, dayPx);  // min 1 giorno
```

### Periodi disponibili

`[14, 30, 90, 180, 365]` → label: `2s, 1m, 3m, 6m, 1a`

### Labels overlay

Mostra per ogni terapia:
- **Drug name** (`.tp-tl-drug-name`) — `r.denominazione`
- **Posologia** (`.tp-tl-drug-poso`) — `dosaggio_quantita + dosaggio_unita · via_somministrazione`
- **Azioni**: Modifica, Chiudi/Sospendi, Storico

### Raggruppamento

- **Attive / Sospese** → Gruppo superiore (`.tp-tl-group-label`)
- **Storico** (terminata/sostituita) → Gruppo inferiore (`.tp-tl-group-label.tp-tl-group-hist`), visibile solo con filtro storico attivo

---

## 7. Modulo CTCAE (Eventi avversi)

**File**: `paziente-ctcae.js`  
**Prefisso data-attr**: `data-ct-*`  
**Layout wrapper**: `.ct-layout`  

### View state

```javascript
viewStates = new Map();
// nodeId → {
//   view: 'list' | 'timeline',
//   showClosed: boolean,
//   tlDays: 30 | 90 | 180 | 365,
//   tlDayPx: numero (default 8),
//   tlCustomStart, tlCustomEnd
// }
```

### Viste disponibili

| Vista | ID | Default | Descrizione |
|-------|----|---------|-------------|
| Lista | `list` | ✅ | Tabella flex con grado, termine, SOC, correlazione |
| Timeline (Gantt) | `timeline` | | Barre colorate per grade |

### Colori barre — per Grade (non per stato!)

```javascript
var GRADE_COLORS = {
  1: "#81C784",   // verde   — Lieve
  2: "#FFD54F",   // giallo  — Moderato
  3: "#FFB74D",   // arancio — Severo
  4: "#E57373",   // rosso   — Pericolo di vita
  5: "#B71C1C",   // rosso scuro — Fatale
};
```

Le barre usano **inline style** anziché classi stato:

```javascript
rh += '<div class="tp-tl-bar" style="left:' + barL + 'px;width:' + barW +
      'px;background:' + GRADE_COLORS[ev.grade] + ';opacity:0.8">';
```

### Date delle barre

```javascript
var s = parseISODate(ev.data_insorgenza) || today;
var e = (ev.stato !== "in_corso" && ev.data_risoluzione)
        ? parseISODate(ev.data_risoluzione) : today;
var barW = Math.max(barR - barL, dayPx);
```

### Periodi disponibili

`[30, 90, 180, 365]` → label: `1m, 3m, 6m, 1a`

### Labels overlay

- **Grade badge** (inline styled con `GRADE_COLORS[ev.grade]`)
- **AE term** (`.tp-tl-drug-name`)
- **Azioni**: Modifica, Chiudi

### Raggruppamento

- **In corso** → Gruppo superiore
- **Chiusi** → Gruppo inferiore, visibile con filtro

### Footer legend

```html
<div class="ct-footer-legend">
  <span class="ct-legend-item">
    <span class="ct-legend-dot" style="background:#81C784"></span>
    <span>G1 — Lieve</span>
  </span>
  <!-- G2…G5 -->
</div>
```

CSS:
```css
.ct-footer-legend {
  display: flex;
  gap: var(--space-md);
  flex-wrap: wrap;
  font-size: var(--font-size-xs);
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
```

---

## 8. Modulo Diagnosi

**File**: `paziente-diagnosi.js`  
**Prefisso data-attr**: `data-dx-*`  
**Layout wrapper**: `.dx-layout`  

### View state

```javascript
viewStates = new Map();
// nodeId → {
//   view: 'list' | 'timeline',
//   showInactive: boolean,
//   tlDays: 90 | 180 | 365 | 730,
//   tlDayPx: numero (default 4),
//   tlCustomStart, tlCustomEnd
// }
```

### Viste disponibili

| Vista | ID | Default |
|-------|----|---------|
| Lista | `list` | ✅ |
| Timeline (Gantt) | `timeline` | |

### Colori barre — per Stato diagnosi

```javascript
var STATO_COLORS = {
  attiva:   "#F44336",  // rosso
  risolta:  "#4CAF50",  // verde
  cronica:  "#FF9800",  // arancio
  sospetta: "#9E9E9E",  // grigio
};
```

Applicate via inline style:

```javascript
rh += '<div class="tp-tl-bar" style="left:' + barL + 'px;width:' + barW +
      'px;background:' + STATO_COLORS[diag.stato] + ';opacity:0.85">';
```

### Date delle barre

```javascript
var s = parseISODate(diag.data_diagnosi) || today;
var e = diag.data_risoluzione
        ? parseISODate(diag.data_risoluzione)
        : (diag.stato === "risolta" ? s : today);
var barW = Math.max(barR - barL, dayPx * 2);  // min 2 giorni
```

### Periodi disponibili

`[90, 180, 365, 730]` → label: `3m, 6m, 1a, 2a`

### Labels overlay

- **Stato badge** (lettera iniziale, es. "A" per Attiva)
- **Codice ICD** (ICD-11 o ICD-10)
- **Titolo diagnosi** (troncato a 35 char)
- **Azioni**: Modifica, Elimina, Chevron (open-detail)

### Raggruppamento

- **Attive** (attiva / cronica / sospetta) → Gruppo superiore
- **Risolte** → Gruppo inferiore, con filtro

### CSS specifico diagnosi

```css
/* Layout */
.dx-layout { display: flex; flex-direction: column; height: 100%; }
.dx-content-area { flex: 1; overflow-y: auto; padding: var(--space-sm) var(--space-md); }

/* Fix z-index today line */
.dx-layout .tp-tl-today-line { z-index: 2; }
```

---

## 9. Logica temporale e scroll

### Calcolo range date

Tutti i moduli usano lo stesso algoritmo:

```javascript
var today = new Date(); today.setHours(0,0,0,0);
var minDate, maxDate;

if (vs.tlCustomStart && vs.tlCustomEnd) {
  // Range personalizzato
  minDate = parseISODate(vs.tlCustomStart);
  maxDate = parseISODate(vs.tlCustomEnd);
} else {
  // Default: oggi + 7 giorni per il margine destro
  maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 7);
  minDate = new Date(maxDate);
  minDate.setDate(minDate.getDate() - vs.tlDays);
}

var totalDays = daysBetween(minDate, maxDate);
var trackW = totalDays * dayPx;  // larghezza totale in px
```

### Funzione posizionamento

```javascript
var px = function (dateObj) {
  return Math.round(daysBetween(minDate, dateObj) * dayPx);
};
```

### Auto-scroll a "Oggi"

Dopo render, `requestAnimationFrame` chiama `scrollTimelineToToday`:

```javascript
var scrollTimelineToToday = function (nodeId) {
  var scrollEl = document.querySelector('[data-XX-tl-scroll="' + nodeId + '"]');
  var todayPx = daysBetween(minDate, today) * dayPx;
  var viewW = scrollEl.clientWidth;
  // Oggi viene posizionato 7 giorni prima del bordo destro
  scrollEl.scrollLeft = Math.max(0, todayPx - viewW + 7 * dayPx);
};
```

### Griglia giorni

```javascript
var buildDayGrid = function (showLabels) {
  // Itera giorno per giorno da minDate a maxDate
  // Se dayPx >= 8: mostra ogni giorno
  // Se dayPx < 8: mostra solo lunedì e primo del mese
  // Se showLabels && dayPx >= 16: mostra numeri giorno
  // Se showLabels && dayPx >= 26: mostra tutti i numeri, altrimenti solo lun + 1°
  // Primo del mese: linea .tp-tl-day-grid-month + label mese
  // Domenica: linea .tp-tl-day-grid-sun
};
```

### Bande mesi alternate

```javascript
// Mesi pari (0, 2, 4...) hanno sfondo acqua-sea leggero
if (m.getMonth() % 2 === 0) {
  mb += '<div class="tp-tl-month-bg tp-tl-month-even" ...></div>';
}
```

---

## 10. Controlli condivisi: periodo, zoom, range

### Struttura HTML

```html
<div class="tp-tl-controls">
  <!-- Periodo -->
  <div class="tp-ctrl-group">
    <span class="tp-ctrl-label">Periodo</span>
    <div class="tp-period-selector">
      <button class="tp-period-btn tp-period-active">1m</button>
      ...
    </div>
  </div>
  <!-- Zoom -->
  <div class="tp-ctrl-group">
    <span class="tp-ctrl-label">Zoom</span>
    <button class="tp-zoom-btn">−</button>
    <button class="tp-zoom-btn">+</button>
  </div>
  <!-- Range -->
  <div class="tp-ctrl-group">
    <span class="tp-ctrl-label">Range</span>
    <input type="date" class="tp-range-input" />
    <span class="tp-range-sep">—</span>
    <input type="date" class="tp-range-input" />
  </div>
</div>
```

### CSS

```css
.tp-tl-controls {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-xs) var(--space-sm);
  background: var(--gray-50);
  border: 1px solid var(--line);
  border-radius: var(--border-radius-sm);
  margin-bottom: var(--space-sm);
  flex-wrap: wrap;
}

.tp-period-selector {
  display: flex;
  gap: 1px;
  background: var(--gray-100);
  border-radius: 6px;
  padding: 2px;
}

.tp-period-btn {
  padding: 3px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  font-size: .6rem;
  font-weight: 500;
  color: var(--gray-500);
  cursor: pointer;
}

.tp-period-btn.tp-period-active {
  background: var(--card, #fff);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0,0,0,.08);
}
```

### Valori default per modulo

| Modulo | dayPx default | tlDays default | Periodi |
|--------|--------------|----------------|---------|
| Terapie | 22 | 30 | 2s, 1m, 3m, 6m, 1a |
| CTCAE | 8 | 90 | 1m, 3m, 6m, 1a |
| Diagnosi | 4 | 180 | 3m, 6m, 1a, 2a |

> **Nota**: il `dayPx` più basso nei moduli CTCAE e Diagnosi permette di visualizzare periodi più lunghi in meno spazio.

---

## 11. Vista Daily (solo Terapie)

La vista giornaliera è esclusiva di `paziente-terapie.js`.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Piano Giornaliero" · data · N farmaci attivi   │
├──────────┬───────────────────────────────────────────────┤
│ Drug name│ asse 06:00 ─────────────── 23:00 ─── 00:00   │
│          │    ●08:00    ●12:00         ●20:00            │
│          │                                               │
│ Drug name│    "Nessuna schedulazione"                    │
├──────────┴───────────────────────────────────────────────┤
│  NOW (red line at current time)                          │
└──────────────────────────────────────────────────────────┘
```

### CSS specifiche

```css
.tp-day-container { display: flex; flex-direction: column; gap: 0; }

.tp-day-pill {
  position: absolute;
  top: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  z-index: 3;
  margin-top: -16px;
}

.tp-day-pill-dot {
  width: 10px;
  height: 10px;
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

.tp-day-now {
  position: absolute;
  top: 0; bottom: 0;
  width: 2px;
  background: var(--truffle-trouble);
  opacity: .5;
  z-index: 2;
}
```

### JS — Asse orario

```javascript
var HOURS = ['06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','00'];
// 19 slot, ciascuno = 100/19 % della larghezza
var hPct = function (i) { return (i / HC * 100).toFixed(2); };
```

---

## 12. Vista Lista

Tutti e tre i moduli offrono una vista lista a tabella compatta con classi condivise.

### Terapie — Lista

```css
.tp-list-table     { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 8px; }
.tp-list-hdr       { display: flex; padding: 6px 10px; background: var(--gray-50); }
.tp-list-row       { display: flex; padding: 6px 10px; }
.tp-list-row:hover { background: var(--gray-50); }
.tp-list-row-hist  { opacity: .55; }

/* Colonne flex */
.tp-list-col-drug  { flex: 2; font-weight: 600; }
.tp-list-col-poso  { flex: 2; color: var(--gray-500); }
.tp-list-col-via   { flex: 1; }
.tp-list-col-date  { flex: 1.5; font-size: .62rem; }
.tp-list-col-stato { width: 70px; }
.tp-list-col-act   { width: 90px; display: flex; justify-content: flex-end; }
```

### CTCAE / Diagnosi — Lista (condiviso)

```css
.ct-list-table { display: flex; flex-direction: column; font-size: var(--font-size-xs); }
.ct-list-hdr   { display: flex; padding: 6px var(--space-sm); border-bottom: 1px solid var(--line); }
.ct-list-row   { display: flex; padding: 7px var(--space-sm); border-bottom: 1px solid var(--line); }

/* CTCAE columns */
.ct-col-grade  { width: 40px; text-align: center; }
.ct-col-term   { flex: 2; }
.ct-col-soc    { flex: 1; }
.ct-col-corr   { width: 130px; }
.ct-col-date   { width: 90px; }
.ct-col-stato  { width: 100px; }
.ct-col-act    { width: 90px; display: flex; justify-content: flex-end; }

/* Diagnosi override columns */
.dx-col-stato  { flex: 0 0 80px; text-align: center; }
.dx-col-icd    { flex: 0 0 90px; }
.dx-col-desc   { flex: 1 1 0; }
.dx-col-date   { flex: 0 0 80px; }
```

---

## 13. Top bar e switching viste

Tutti i moduli riutilizzano le stesse classi CSS per la top bar:

```css
.tp-topbar {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: var(--space-xs) var(--space-lg);
  border-bottom: 1px solid var(--line);
  min-height: 48px;
  flex-shrink: 0;
}

.tp-topbar-nav {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tp-topbar-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: transparent;
  color: var(--gray-400);
  cursor: pointer;
}

.tp-topbar-tab--active { color: var(--gray-900); }

.tp-topbar-add {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--border-radius-sm);
  background: var(--acqua-sea);
  color: #fff;
}
```

### Switching logic (JS)

Il cambio vista segue lo stesso pattern in tutti i moduli:

```javascript
// 1. Aggiorna viewState
vs.view = newView;
viewStates.set(nodeId, vs);

// 2. Re-render completo dell'intero provider
var container = layout.parentElement;
renderXxx(container, nodeId);  // renderTerapie | renderCtcae | renderDiagnosi
```

Non c'è routing DOM parziale: ogni switch re-renderizza l'intero HTML del modulo.

---

## 14. Colori stato e badge

### Badge stato condiviso

```css
.ct-stato-badge {
  padding: 1px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
}

/* Per evento CTCAE */
.ct-stato-in_corso         { background: #dbeafe; color: #1d4ed8; }
.ct-stato-risolto          { background: #dcfce7; color: #15803d; }
.ct-stato-risolto_con_sequele { background: #fef3c7; color: #92400e; }
```

### Badge grade CTCAE

```css
.ct-grade-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 6px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}
/* Colore applicato inline via GRADE_COLORS[grade] */
```

### Status pill (Terapie)

```javascript
var STATO_LABELS = {
  attiva: "Attiva", sospesa: "Sospesa",
  terminata: "Terminata", sostituita: "Sostituita"
};
```

### Mappa completa colori Chains (comuni a moduli interconnessi)

```javascript
// Usata in paziente-chains.js per badge stato cross-modulo
var STATO_COLORS = {
  // Diagnosi
  attiva: "#F44336", risolta: "#4CAF50", cronica: "#FF9800", sospetta: "#9E9E9E",
  // CTCAE
  in_corso: "#F44336", risolto: "#4CAF50", risolto_con_sequele: "#FF9800", fatale: "#B71C1C",
  // Terapie
  sostituita: "#9E9E9E", sospesa: "#FFA726", terminata: "#78909C",
};
```

---

## 15. Pattern di replica

Per replicare il sistema timeline Gantt in un nuovo modulo:

### 1. Preparazioni

- Includere `landing.css` (contiene tutte le classi `tp-tl-*`, `tp-topbar-*`, `ct-list-*`, `ct-stato-*`)
- Includere `base.css` (design tokens)

### 2. Creare il JS provider

```javascript
(function registerMyModule(global) {
  "use strict";

  var registry = global.contentRegistry;
  // ... helper identici (parseISODate, daysBetween, shortMonth, esc) ...

  // 1. viewStates Map
  var viewStates = new Map();

  // 2. Main render
  var renderMyModule = async function (container, nodeId) {
    var rows = await safeFetch("/api/my-endpoint/" + stemUuid);
    if (!viewStates.has(nodeId)) viewStates.set(nodeId, {
      view: 'timeline', showHistory: false,
      tlDays: 90, tlDayPx: 10
    });
    var vs = viewStates.get(nodeId);
    var html = '<div class="tp-layout" data-my-node="' + nodeId + '">';
    html += buildTopBar(nodeId, vs);
    html += '<div class="tp-content-area">';
    html += renderTimelineView(rows, nodeId, vs);
    html += '</div></div>';
    container.innerHTML = html;
    if (vs.view === 'timeline') {
      requestAnimationFrame(function() { scrollTimelineToToday(nodeId); });
    }
  };

  // 3. renderTimelineView — copiate dalla struttura sopra
  //    - Calcolo minDate/maxDate
  //    - trackW = totalDays * dayPx
  //    - buildDayGrid(), monthBandsHtml
  //    - axis-row + data rows con tp-tl-bar
  //    - labels overlay con tp-tl-labels

  // 4. Event delegation per interazioni

  // 5. Registrare nel contentRegistry
  registry.register("my-module", {
    render: function(container, nodeId) { renderMyModule(container, nodeId); }
  });
})(window);
```

### 3. Checklist classi CSS da riutilizzare

- [ ] `.tp-topbar` / `.tp-topbar-nav` / `.tp-topbar-tab` / `.tp-topbar-tab--active`
- [ ] `.tp-topbar-add` / `.tp-filter-toggle`
- [ ] `.tp-tl-controls` / `.tp-ctrl-group` / `.tp-ctrl-label`
- [ ] `.tp-period-selector` / `.tp-period-btn` / `.tp-period-active`
- [ ] `.tp-zoom-btn` / `.tp-range-input`
- [ ] `.tp-tl-container` / `.tp-tl-scroll` / `.tp-tl-scroll-inner`
- [ ] `.tp-tl-labels` / `.tp-tl-label-row` / `.tp-tl-drug-name`
- [ ] `.tp-tl-row` / `.tp-tl-track` / `.tp-tl-axis-row`
- [ ] `.tp-tl-bar` / `.tp-tl-bar-text`
- [ ] `.tp-tl-day-grid` / `.tp-tl-day-lbl` / `.tp-tl-month`
- [ ] `.tp-tl-today-line` / `.tp-tl-today-lbl`
- [ ] `.tp-tl-month-bg` / `.tp-tl-month-even`
- [ ] `.tp-tl-group-label` / `.tp-tl-group-spacer`

### 4. Differenze chiave tra moduli

| Aspetto | Terapie | CTCAE | Diagnosi |
|---------|---------|-------|----------|
| Data inizio barra | `data_inizio` | `data_insorgenza` | `data_diagnosi` |
| Data fine barra | `data_fine` | `data_risoluzione` | `data_risoluzione` |
| Colore barra da | Stato (classe CSS) | Grade (inline) | Stato (inline) |
| Min bar width | `dayPx` (1 giorno) | `dayPx` (1 giorno) | `dayPx * 2` (2 giorni) |
| Default dayPx | 22 | 8 | 4 |
| Default tlDays | 30 | 90 | 180 |
| Vista daily | ✅ | ❌ | ❌ |
| Footer legend | ❌ | ✅ (gradi G1-G5) | ❌ |
| Label overflow | Nome farmaco + poso | Grade badge + AE term | Stato badge + ICD + titolo |

---

> **Ultimo aggiornamento**: generato automaticamente dall'analisi del codice sorgente Janus.
