# ChemERA — Style Guide

> Documento di riferimento completo per lo stile CSS dell'applicazione ChemERA (Janus).
> Copre design tokens, tipografia, palette colori, icone, componenti, formattazione testo e convenzioni visive.

---

## Indice

1. [Filosofia di Design](#1-filosofia-di-design)
2. [File CSS e Architettura](#2-file-css-e-architettura)
3. [Design Tokens](#3-design-tokens)
4. [Tipografia](#4-tipografia)
5. [Palette Colori](#5-palette-colori)
6. [Icone](#6-icone)
7. [Bottoni](#7-bottoni)
8. [Form e Input](#8-form-e-input)
9. [Badge e Pill](#9-badge-e-pill)
10. [Card e Contenitori](#10-card-e-contenitori)
11. [Tabelle](#11-tabelle)
12. [Layout e Griglie](#12-layout-e-griglie)
13. [Modali e Overlay](#13-modali-e-overlay)
14. [Sidebar e Navigazione](#14-sidebar-e-navigazione)
15. [Formattazione Testo — Convenzioni](#15-formattazione-testo--convenzioni)
16. [Animazioni e Transizioni](#16-animazioni-e-transizioni)
17. [Responsive](#17-responsive)
18. [Colori Semantici per Modulo](#18-colori-semantici-per-modulo)
19. [Riferimenti Rapidi](#19-riferimenti-rapidi)

---

## 1. Filosofia di Design

ChemERA segue un approccio **"Flat White Minimalist"**:

- **Bianco dominante** — sfondo `#F9FAFB` (gray-50), card bianche, separatori sottili
- **Grigio scala** — la comunicazione visiva passa per pesi di grigio, non per colori saturi
- **Accento nero** — il colore primario d'azione è `#1A1A1A` (accento quasi-nero)
- **Bordi minimi** — `1px solid var(--border-color)` (gray-200), mai ombre pesanti
- **Tipografia come gerarchia** — la differenziazione avviene tramite font-size, font-weight e text-transform
- **Colore con scopo** — i colori saturi sono riservati a significati semantici: errore, successo, gradi clinici

---

## 2. File CSS e Architettura

| File | Righe | Ruolo |
|------|-------|-------|
| `public/css/base.css` | ~258 | Design tokens (`:root`), reset, elementi base, bottoni base, utility |
| `public/css/landing.css` | ~9410 | Tutti i componenti applicativi: shell, feed, moduli clinici, dashboard |
| `public/css/layers.css` | ~1194 | Sistema layer/modale (nesting, node-kinds, panel/drawer/sheet) |
| `public/css/login.css` | ~248 | Pagina di login |

### Ordine di caricamento

```
base.css → layers.css → landing.css → login.css (solo /login)
```

Le variabili CSS (custom properties) sono definite in `:root` dentro `base.css` e consumate ovunque.

---

## 3. Design Tokens

Tutti i token vivono nel blocco `:root` di `base.css`.

### 3.1 Spaziatura

| Token | Valore | Uso tipico |
|-------|--------|------------|
| `--space-xs` | `4px` | Gap minimi, padding interni chip/badge |
| `--space-sm` | `8px` | Padding input, gap tra elementi inline |
| `--space-md` | `16px` | Padding card, gap colonne |
| `--space-lg` | `24px` | Margini sezioni, padding modali |
| `--space-xl` | `32px` | Spaziatura tra sezioni maggiori |
| `--space-2xl` | `48px` | Padding breadcrumb, hero |
| `--space-3xl` | `64px` | Spaziatura extra-large (empty state) |

### 3.2 Bordi

| Token | Valore |
|-------|--------|
| `--border-width` | `1px` |
| `--border-color` | `var(--gray-200)` → `#E5E7EB` |
| `--border-radius-sm` | `4px` |
| `--border-radius-md` | `6px` |
| `--border-radius-lg` | `8px` |

> Nota: molti componenti nei moduli clinici usano `border-radius: 8px` o `10px` inline, leggermente sopra il token `--border-radius-lg`.

### 3.3 Ombre

| Token | Valore |
|-------|--------|
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` |
| `--shadow-md` | `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` |

Le ombre sono usate **con parsimonia**. La maggior parte dei componenti si affida a bordi. Ombre più forti compaiono solo sulle modali/layer:

```css
/* Layer/modale overlay */
box-shadow: 0 25px 80px rgba(0,0,0,.35), 0 10px 30px rgba(0,0,0,.20);

/* Sidebar active item */
box-shadow: rgba(0,0,0,.16) 0 3px 6px, rgba(0,0,0,.23) 0 3px 6px;
```

### 3.4 Transizioni

| Token | Valore | Uso |
|-------|--------|-----|
| `--transition-fast` | `150ms ease` | Hover, focus, toggle |
| `--transition-base` | `200ms ease` | Apertura/chiusura elementi |
| `--transition-slow` | `300ms ease` | Animazioni più elaborate |

---

## 4. Tipografia

### 4.1 Font Family

```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Font feature settings** attive:

```css
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
```

Queste varianti OpenType di Inter attivano forme alternative per lettere specifiche (`a`, `l`, `G`, single-story `a`), dando un aspetto più tecnico/clinico.

### 4.2 Rendering

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
```

### 4.3 Scala Tipografica

| Token | Valore | rem | Uso |
|-------|--------|----|-----|
| `--font-size-3xs` | `0.5rem` | 8px | Micro-label: timestamp timeline |
| `--font-size-2xs` | `0.65rem` | 10.4px | Badge, chip, legend, section-label |
| `--font-size-xs` | `0.75rem` | 12px | Body compatto, label form, dettagli secondari |
| `--font-size-sm` | `0.85rem` | 13.6px | Body primario in card/tabelle, input text |
| `--font-size-base` | `1rem` | 16px | Body principale (root) |
| `--font-size-md` | `1rem` | 16px | Alias di base |
| `--font-size-lg` | `1.15rem` | 18.4px | Titoli sezione, heading modali |
| `--font-size-xl` | `1.25rem` | 20px | Heading principali |
| `--font-size-2xl` | `1.5rem` | 24px | Card value gigante (dashboard) |
| `--font-size-3xl` | `2rem` | 32px | h1 (raramente usato) |

### 4.4 Heading

```css
h1 { font-size: 2rem;   font-weight: 600; color: var(--gray-900); margin-bottom: 8px; }
h2 { font-size: 1.5rem; font-weight: 600; color: var(--gray-900); margin-bottom: 8px; }
h3 { font-size: 1.25rem; font-weight: 600; color: var(--gray-900); margin-bottom: 8px; }
```

### 4.5 Paragrafi

```css
p  { color: var(--gray-700); line-height: 1.6; margin-bottom: 16px; }
```

### 4.6 Font secondario — Monospace

Usato per codici ICD-11, UUID, codici ATC, titoli scientifici:

```css
font-family: 'SF Mono', 'Fira Code', monospace;
/* oppure */
font-family: var(--font-mono, "SFMono-Regular", "Consolas", monospace);
```

Dimensione tipica: `0.68rem`–`0.72rem`, con `letter-spacing: 0.02em`.

---

## 5. Palette Colori

### 5.1 Scala di Grigi

| Token | Hex | Uso |
|-------|-----|-----|
| `--gray-50` | `#F9FAFB` | Background body, table header bg, hover leggero |
| `--gray-100` | `#F3F4F6` | Background aside modali, toggle inattivi, righe alternate |
| `--gray-200` | `#E5E7EB` | Border color standard, separatori |
| `--gray-300` | `#D1D5DB` | Border hover, separatori aside, border input focus |
| `--gray-400` | `#9CA3AF` | Testo muted, placeholder, icone disabilitate |
| `--gray-500` | `#6B7280` | Label, section header, testo secondario |
| `--gray-600` | `#4B5563` | Testo label form, testo dettagli |
| `--gray-700` | `#374151` | Testo paragrafi, valori secondari |
| `--gray-800` | `#1F2937` | Testo importante, heading secondari |
| `--gray-900` | `#111827` | Testo primario, heading, accento forte |

### 5.2 Colori Strutturali

| Token | Hex | Ruolo |
|-------|-----|-------|
| `--accent` | `#1A1A1A` | Bottone primario background |
| `--accent-light` | `#333333` | Bottone primario hover |
| `--white` | `#FFFFFF` | Card bg, body bg overlay |
| `--charcoal` | `#1F1F1D` | Testo brand, sidebar active bg |
| `--cream` | `#E6E7D7` | Accento caldo, sidebar brand |

### 5.3 Colori Semantici

| Token | Hex | Significato |
|-------|-----|-------------|
| `--error` | `#DC2626` | Errore, eliminazione, pericolo |
| `--success` | `#16A34A` | Successo, conferma, positivo |
| `--yellow` | `#FFAF20` | Warning, alert, reset |
| `--orange` | `#F29337` | Focus accent (input), state-based |
| `--orange-dark` | `#ED642D` | Elemento variante, alert secondario |

### 5.4 Colori di Brand / Progetto

| Token | Hex | Uso |
|-------|-----|-----|
| `--blue-primary` | `#287094` | CTA secondaria (`.btn-action`), link azione, focus ring |
| `--blue-dark` | `#023246` | Header brand text, variante scura |
| `--blue-light` | `#6DB5CA` | Badge test, accento chiaro |
| `--acqua-sea` | `#6BAAAE` | Colore primario moduli clinici (CTCAE, terapie, chains) |
| `--truffle-trouble` | `#A35139` | Today-line (timeline), motivo chiusura terapia |
| `--blue-fantastic` | `#2C3B4D` | Chip/badge scuri (stepper completato, ATC badge) |
| `--burning-flame` | `#FFB162` | Badge farmaci (tp-badge) |
| `--palladian` | `#F9F8F6` | Hover card soft, background warm |
| `--rosso-bright` | `#EA2E00` | Bottone chiudi/cancella in modali edit |

### 5.5 Colori ABO (Gruppo Sanguigno)

| Tipo | Background | Testo |
|------|-----------|-------|
| A | `#E3F2FD` | `#1565C0` |
| B | `#FCE4EC` | `#C62828` |
| AB | `#F3E5F5` | `#6A1B9A` |
| O | `#E8F5E9` | `#2E7D32` |

### 5.6 Colori Positivo/Negativo (Antigeni)

| Stato | Background | Testo |
|-------|-----------|-------|
| Positivo | `#E8F5E9` | `#2E7D32` |
| Negativo | `#FCE4EC` | `#C62828` |
| Variante | `#FFF8E1` | `#E65100` |
| N.D. | `var(--gray-100)` | `var(--gray-400)` |

---

## 6. Icone

### 6.1 Dizionario Centralizzato

Tutte le icone dell'app sono registrate in `public/js/layers/core/svg-icons.js` come SVG inline.

```js
window.svgIcons.get("close")   // → stringa SVG
window.svgIcons.list()         // → array di chiavi
```

**Icone registrate** (13):

| Chiave | Descrizione |
|--------|-------------|
| `close` | ✕ chiusura |
| `library` | Libro/libreria |
| `inbox` | Esagoni (hub moduli) |
| `structure` | Diagramma struttura |
| `action-fullscreen` | Monitor fullscreen |
| `action-panel` | Rettangolo con divisione verticale destra |
| `action-modal` | Rettangolo centrato |
| `action-sheet` | Rettangolo con divisione orizzontale bassa |
| `action-drawer` | Rettangolo con divisione verticale sinistra |
| `action-wizard` | Documento con righe |
| `user` | Utente (cerchio + busto) |
| `notification` | Campana |
| `alert` | Triangolo con esclamativo |

### 6.2 Convenzioni SVG

Tutte le icone seguono lo stesso pattern:

```svg
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 24 24"
     width="24" height="24"
     fill="none"
     stroke="currentColor"
     stroke-width="1.5"
     stroke-linecap="round"
     stroke-linejoin="round">
  ...
</svg>
```

| Proprietà | Valore standard |
|-----------|----------------|
| `viewBox` | `0 0 24 24` |
| `width/height` (default) | `24` (ridimensionato via CSS) |
| `fill` | `none` (outline only) |
| `stroke` | `currentColor` (eredita dal contenitore) |
| `stroke-width` | `1.5` (standard) o `2` (per icone piccole <16px) |
| `stroke-linecap` | `round` |
| `stroke-linejoin` | `round` |

### 6.3 Icone Inline nei Provider

I moduli clinici definiscono icone locali per azioni comuni:

```js
// paziente-diagnosi.js
var EDIT_ICON  = '<svg viewBox="0 0 24 24" width="14" height="14" ...>'; // Matita
var ADD_ICON   = '<svg viewBox="0 0 24 24" width="14" height="14" ...>'; // +
var TRASH_ICON = '<svg viewBox="0 0 24 24" width="13" height="13" ...>'; // Cestino
```

Dimensioni tipiche per icone-azione inline: **13–14px**.

### 6.4 Dimensionamento Icone via CSS

| Contesto | Dimensione CSS | Classe esempio |
|----------|---------------|----------------|
| Breadcrumb | `14px` | `.breadcrumb-item svg` |
| Sidebar menu | `22px` | `.layer-menu-item svg` |
| Sidebar submenu | `16px` | `.layer-submenu-item-icon svg` |
| Card overview | `18px` | `.overview-card-icon svg` |
| Welcome screen | `48px` | `.module-welcome-icon svg` |
| Modale aside | `48px` | `.bg-modal-aside-icon svg` |
| Action button row | `14px` | `.ct-row-btn svg` (default), `11px` per `--sm` |
| Filter header | `14px` | `.filters-header svg` |

### 6.5 Stile Icon-only Button

```css
.dash-btn--icon {
  background: none;
  border: 1px solid var(--gray-300);
  border-radius: 4px;
  padding: 4px;
  color: var(--gray-600);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.dash-btn--icon svg { width: 14px; height: 14px; }
```

---

## 7. Bottoni

### 7.1 Bottone Base

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);           /* 4px */
  padding: var(--space-sm) var(--space-lg);  /* 8px 24px */
  font-size: var(--font-size-sm); /* 0.85rem */
  font-weight: 500;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);  /* 6px */
  background: var(--white);
  color: var(--gray-700);
  cursor: pointer;
  transition: all var(--transition-fast);
}
```

### 7.2 Varianti

| Classe | Background | Colore | Bordo | Uso |
|--------|-----------|--------|-------|-----|
| `.btn` | bianco | gray-700 | border-color | Default |
| `.btn-primary` | `#1A1A1A` | bianco | accent | Azione principale |
| `.btn-danger` | `#DC2626` | bianco | rosso | Eliminazione |
| `.btn-secondary` | gray-100 | gray-700 | gray-200 | Azione secondaria |
| `.btn-sm` | — | — | — | Padding ridotto (`xs` × `md`) |

### 7.3 Bottoni Modulo (`.btn-form`)

Bottoni verticali con icona + testo, usati nelle action-bar dei moduli clinici:

```css
.btn-form {
  display: flex;
  flex-direction: column; /* icona sopra, testo sotto */
  align-items: center;
  gap: 2px;
  padding: var(--space-sm) var(--space-md);
  min-width: 72px;
  font-size: var(--font-size-2xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: white;
}
```

| Variante | Background | Uso |
|----------|-----------|-----|
| `.btn-action` | `var(--blue-primary)` #287094 | Salva, conferma |
| `.btn-close` | `var(--error)` #DC2626 | Annulla, chiudi |
| `.btn-reset` | `var(--yellow)` #FFAF20 | Reset form |

### 7.4 Bottoni Moduli Clinici

| Classe | Background | Uso |
|--------|-----------|-----|
| `.tp-add-btn` | `var(--acqua-sea)` | + Nuova terapia |
| `.ct-add-btn` | bordo standard | + Nuovo evento CTCAE |
| `.ct-nav-btn.primary` | `var(--acqua-sea)` | Avanti nel stepper |
| `.dash-btn--primary` | `var(--blue-primary)` | Azione dashboard |
| `.dash-btn--danger` | `var(--error)` | Elimina utente/dato |

---

## 8. Form e Input

### 8.1 Input Standard

```css
input, select {
  width: 100%;
  padding: var(--space-sm) var(--space-md);  /* 8px 16px */
  font-size: var(--font-size-sm);            /* 0.85rem */
  font-family: inherit;
  border: 1px solid var(--border-color);     /* gray-200 */
  border-radius: var(--border-radius-sm);    /* 4px */
  background: var(--white);
  color: var(--gray-900);
  outline: none;
  transition: border-color var(--transition-fast);
}
```

### 8.2 Focus State

Due pattern coesistono:

**Pattern A — Grigio** (form standard):
```css
input:focus {
  background-color: var(--gray-50);
  border-color: var(--gray-400);
  box-shadow: 0 0 0 3px rgba(0,0,0,0.05);
}
```

**Pattern B — Arancio** (ricerca paziente, filtri):
```css
.search-input-field:focus {
  border-color: var(--orange);   /* #F29337 */
  box-shadow: none;
}
```

**Pattern C — Blu** (modali cliniche, dashboard):
```css
.anagrafica-modal-field input:focus {
  border-color: var(--blue-primary);
  box-shadow: 0 0 0 2px rgba(40,112,148,0.15);
}
```

### 8.3 Label Form

```css
.field-group label {
  font-size: var(--font-size-xs);  /* 0.75rem */
  font-weight: 600;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: var(--space-xs);
}
```

### 8.4 Form Grid

```css
.search-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-md);
}
```

### 8.5 Toggle / Switch

```css
.switch-toggle {
  width: 44px;
  height: 24px;
  background: var(--gray-300);
  border-radius: 12px;
}
.switch-toggle.active {
  background: var(--accent);  /* #1A1A1A */
}
```

### 8.6 Radio Group (Bento Grid)

```css
.radio-group-bento {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-sm);
}
```

---

## 9. Badge e Pill

### 9.1 Badge Base

```css
.badge {
  display: inline-block;
  padding: 2px var(--space-sm);      /* 2px 8px */
  font-size: var(--font-size-2xs);   /* 0.65rem */
  font-weight: 600;
  border-radius: var(--border-radius-sm);  /* 4px */
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

### 9.2 Badge Stato Pazienti

| Classe | Background | Testo |
|--------|-----------|-------|
| `.badge-active` | gray-900 | bianco |
| `.badge-archived` | gray-200 | gray-600 |
| `.badge-test` | blue-light | bianco |

### 9.3 Dashboard Badge (`.dash-badge`)

```css
.dash-badge {
  padding: 2px 8px;
  border-radius: 10px; /* pill-shape */
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
}
```

| Variante | Background | Testo | Semantica |
|----------|-----------|-------|-----------|
| `--admin` | `#EDE9FE` | `#6D28D9` | Ruolo admin |
| `--user` | `#E0F2FE` | `#0369A1` | Ruolo utente |
| `--active` | `#DCFCE7` | `#15803D` | Stato attivo |
| `--suspended` | `#FEF9C3` | `#A16207` | Sospeso |
| `--locked` | `#FEE2E2` | `#B91C1C` | Bloccato |
| `--success` | `#DCFCE7` | `#15803D` | Operazione riuscita |
| `--fail` | `#FEE2E2` | `#B91C1C` | Operazione fallita |
| `--create` | `#DCFCE7` | `#15803D` | Operazione: creazione |
| `--update` | `#DBEAFE` | `#1D4ED8` | Operazione: modifica |
| `--delete` | `#FEE2E2` | `#B91C1C` | Operazione: eliminazione |

### 9.4 Badge Contatto (`.dash-badge--tipo`)

| Tipo | Background | Testo |
|------|-----------|-------|
| `telefono` | `#DBEAFE` | `#1D4ED8` |
| `email` | `#FEF3C7` | `#92400E` |
| `pec` | `#FCE7F3` | `#9D174D` |
| `fax` | `#E0E7FF` | `#3730A3` |
| `altro` | gray-100 | gray-600 |

### 9.5 Badge Stato Terapie (`.tp-stato-badge`)

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

| Stato | Background | Testo |
|-------|-----------|-------|
| `attiva` | `#DCFCE7` | `#166534` |
| `sospesa` | `#FEF9C3` | `#854D0E` |
| `terminata` | gray-100 | gray-500 |
| `sostituita` | `#E0E7FF` | `#3730A3` |

### 9.6 Badge Stato CTCAE (`.ct-stato-*`)

| Stato | Background | Testo |
|-------|-----------|-------|
| `in_corso` | `#DBEAFE` | `#1D4ED8` |
| `risolto` | `#DCFCE7` | `#15803D` |
| `risolto_con_sequele` | `#FEF3C7` | `#92400E` |
| `fatale` | `#FEE2E2` | `#991B1B` |
| `sconosciuto` | gray-400 | bianco |

### 9.7 Grade Badge CTCAE

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

| Grado | Colore (JS) | Label |
|-------|-------------|-------|
| G1 | `#4CAF50` | Lieve |
| G2 | `#FFC107` | Moderato |
| G3 | `#FF9800` | Severo |
| G4 | `#F44336` | Potenzialmente letale |
| G5 | `#9C27B0` | Morte |

### 9.8 Badge ICD-11 / ATC

```css
/* ICD-11 */
.dx-icd11-badge {
  font-size: .55rem;
  background: #E3F2FD;
  color: #1565C0;
  border-radius: 2px;
  font-weight: 600;
}

/* ATC */
.tp-atc-badge {
  font-size: .6rem;
  background: var(--blue-fantastic); /* #2C3B4D */
  color: #fff;
  border-radius: 3px;
}
```

---

## 10. Card e Contenitori

### 10.1 Dashboard Card

```css
.dashboard-card {
  background: var(--white);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);  /* 6px */
  padding: var(--space-md);
}
```

**Header card**: `font-size: 2xs`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.04em`, `color: gray-500`.

**Value card**: `font-size: 2xl`, `font-weight: 700`, `color: gray-900`.

### 10.2 Event Card (CTCAE)

```css
.ct-event-card {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--line);
  border-radius: 10px;
  border-left: 3px solid var(--muted); /* dentro .ct-event-left */
}
```

### 10.3 Therapy Card

```css
.tp-card {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--line);
  border-radius: 8px;
}
.tp-card:hover { border-color: var(--acqua-sea); }
```

### 10.4 Library Card (`.lib-card`)

Grid 3 colonne, card con `background-image: linear-gradient(135deg, ...)`, `padding: var(--space-lg)`, bordi arrotondati `12px`.

### 10.5 Bento Cell (Diagnosi Detail)

```css
.ddl-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}
.ddl-bento-cell {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: var(--space-sm) var(--space-md);
}
```

Varianti speciali:
- `.ddl-bento-hero` → `grid-column: 1 / -1` (full width), gradient background
- `.ddl-bento-note` → `grid-column: 1 / -1`, bordo sinistro 3px
- `.ddl-bento-code` → valore font grande, colore `var(--primary)`
- `.ddl-bento-path` → `grid-column: span 2`

---

## 11. Tabelle

### 11.1 Tabella Base (`.data-table`)

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th {
  padding: var(--space-md);
  text-align: left;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--gray-700);
  background: var(--gray-50);
  border-bottom: 1px solid var(--border-color);
}
.data-table td {
  padding: var(--space-md);
  font-size: var(--font-size-sm);
  border-bottom: 1px solid var(--border-color);
}
.data-table tbody tr:hover { background: var(--gray-50); }
```

### 11.2 Tabella Dashboard (`.dash-table`)

```css
.dash-table th {
  background: var(--gray-50);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  position: sticky; top: 0; z-index: 1;
}
```

### 11.3 List Table (CTCAE/Terapie)

Pattern senza `<table>`, usa **flex rows**:

```css
.ct-list-hdr {
  display: flex;
  padding: 6px var(--space-sm);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}
.ct-list-row {
  display: flex;
  padding: 7px var(--space-sm);
  border-bottom: 1px solid var(--line);
}
```

### 11.4 Griglia Matrice Esami

```css
.pe-grid-table {
  border-collapse: collapse;
  font-size: 0.8rem;
}
.pe-grid-th-nome {
  position: sticky; left: 0;  /* colonna fissa */
  background: var(--white);
  z-index: 2;
}
```

Celle con codifica colore:
- `.pe-grid-cell--ok` → verde (valore nel range)
- `.pe-grid-cell--oor` → rosso (fuori range)
- `.pe-grid-cell--ric` → arancio (richiesto, non refertato)

---

## 12. Layout e Griglie

### 12.1 App Shell

```
┌──────────────────────────────────────────┐
│ Sidebar (60px)  │  Main Body (flex: 1)   │
│                 │                        │
│  Brand          │  Header Rail (48px)    │
│  Avatar         │  + Content area        │
│  Nav buttons    │                        │
│                 │                        │
└──────────────────────────────────────────┘
```

```css
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar { width: 60px; }
.main-body { flex: 1; display: flex; flex-direction: column; }
```

### 12.2 Layer (Fullpage Module)

```
┌──────────────────────────────────────────┐
│ Menu (60px) │ Submenu (240px) │ Body      │
│  icon nav   │  items list     │  Breadcrumb│
│             │                 │  Content   │
└──────────────────────────────────────────┘
```

```css
.layer-fullpage { display: flex; }
.layer-menu { width: 60px; }
.layer-submenu { width: 240px; }
.layer-body { flex: 1; }
```

### 12.3 Semi-Layer (90vw × 90vh overlay)

```css
.semi-layer {
  width: 90vw;
  height: 90vh;
  display: flex;
  border-radius: 8px;
  box-shadow: 0 25px 80px rgba(0,0,0,.35);
}
.semi-layer-sidebar { width: 220px; }
.semi-layer-body { flex: 1; }
```

### 12.4 Feed Layout (Due Colonne)

```css
.feed-layout { display: flex; gap: var(--space-md); }
.feed-col-left { flex: 2; }  /* feed items */
.feed-col-right { flex: 1; } /* alerts */
```

### 12.5 Search Split Layout

```css
.search-split-container { display: flex; }
.search-panel-left { flex: 1; }  /* input/form */
.search-panel-right { flex: 2; } /* risultati */
```

### 12.6 Dashboard Bento Grid

```css
.dash-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-md);
}
```

---

## 13. Modali e Overlay

### 13.1 Modale Standard

```css
.modal-overlay { background: rgba(0,0,0,0.5); z-index: 10000; }
.modal {
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  border-radius: var(--border-radius-lg);
  animation: modalIn 200ms ease forwards;
}
```

### 13.2 Modale 2-Colonne (Pattern STEM)

```
┌─────────────────────────────────┐
│ Aside (170px)  │  Main (flex:1)  │
│  icona 48px    │  header + close │
│  label UPPER   │  body scroll    │
│  (var. colore) │  actions        │
└─────────────────────────────────┘
```

Varianti sidebar colore (STEM modal):
- **Create**: verde `#dcfce7 / #166534`
- **Update**: blu `#dbeafe / #1e40af`
- **Delete**: rosso `#fee2e2 / #991b1b`
- **Esami**: viola `#f3e8ff / #6b21a8`

### 13.3 Modale 3-Colonne (Refertazione Esami)

```
┌───────────────────────────────────────────┐
│ Aside (160px) │ Center (flex:1) │ Right (260px) │
│  icon + label │  header + body  │  info + actions│
└───────────────────────────────────────────┘
```

### 13.4 Confirm Dialog

```css
.dash-confirm-dialog {
  width: 520px;
  display: flex;
  flex-direction: row;  /* aside + main */
  border-radius: 8px;
}
```

---

## 14. Sidebar e Navigazione

### 14.1 Sidebar Principale (60px)

```css
.sidebar {
  width: 60px;
  background: var(--white);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
}
```

- **Brand**: `sidebar-brand` — icona/logo piccola
- **Avatar**: Ring colorato per indicare sessione attiva
- **Bottoni**: `sidebar-btn` — 40×40, icona 20px, bordi arrotondati 6px

### 14.2 Layer Menu (60px icon-only)

```css
.layer-menu-item {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  background: transparent;
  color: var(--gray-400);
}
.layer-menu-item.active {
  background: var(--charcoal); /* #1F1F1D */
  color: var(--white);
  box-shadow: rgba(0,0,0,.16) 0 3px 6px;
}
```

### 14.3 Layer Submenu (240px)

```css
.layer-submenu-item {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-xs);
  font-weight: 500;
}
.layer-submenu-item.active {
  background: var(--gray-900);
  color: var(--white);
}
```

### 14.4 Breadcrumb

```css
.breadcrumb-item {
  font-size: var(--font-size-2xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--gray-500);
}
.breadcrumb-item.active {
  color: var(--charcoal);
  font-weight: 600;
}
```

### 14.5 Tab Bar (Terapie TopBar)

```css
.tp-topbar-tab {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  color: var(--gray-400);
}
.tp-topbar-tab--active {
  color: var(--gray-900);
}
```

### 14.6 Dashboard Tabs

```css
.dash-tab {
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--gray-500);
  border-bottom: 2px solid transparent;
}
.dash-tab--active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
```

---

## 15. Formattazione Testo — Convenzioni

Questa è la sezione centrale: descrive **come il testo è formattato** in ogni contesto.

### 15.1 Regola Generale

Il testo in ChemERA segue una gerarchia a 4 livelli:

| Livello | Font-size | Font-weight | Color | text-transform |
|---------|-----------|-------------|-------|----------------|
| **Titolo** | `lg`–`xl` (1.15–1.25rem) | 600–700 | gray-900 | nessuno |
| **Label/Section** | `2xs`–`xs` (0.65–0.75rem) | 600–700 | gray-500/600 | UPPERCASE |
| **Body** | `sm` (0.85rem) | 400–500 | gray-700/800 | nessuno |
| **Meta/Muted** | `2xs`–`xs` (0.65–0.75rem) | 400–500 | gray-400 | nessuno |

### 15.2 Label / Section Header

```css
/* Pattern universale per label di sezione */
font-size: var(--font-size-2xs);   /* 0.65rem */
font-weight: 600–700;
text-transform: uppercase;
letter-spacing: 0.04em–0.06em;
color: var(--gray-500);
```

Questo pattern ricorre in:
- `.dashboard-card .card-header`
- `.bg-section-label`
- `.bg-col-title`
- `.ct-list-hdr`
- `.tp-section-label`
- `.ddl-bento-cell-label`
- `.filters-header`
- `.anagrafica-label`
- `.breadcrumb-item`

### 15.3 Valore Primario

```css
/* Pattern per valori prominenti */
font-size: var(--font-size-sm)–var(--font-size-2xl);
font-weight: 600–700;
color: var(--gray-900) o var(--foreground);
```

Esempi:
- `.dashboard-card .card-value` → `2xl`, `700`
- `.anagrafica-value` → `sm`, `400`, gray-900
- `.ddl-bento-date` → `0.95rem`, `600`, `font-variant-numeric: tabular-nums`
- `.ddl-bento-code-value` → `0.95rem`, `700`, `color: var(--primary)`

### 15.4 Testo Muted / Meta

```css
color: var(--gray-400);
font-size: var(--font-size-2xs) o var(--font-size-xs);
/* a volte: */
font-style: italic;
```

Usato per:
- Date secondarie (`.bg-coombs-date`, `.tp-date-row`)
- Note ausiliarie (`.tp-note-row`, `.ct-event-note`)
- Descrizioni subordinate (`.ct-soc-tag`, `.tp-atc-desc`)
- Placeholder/hint (`.search-input-hint`)

### 15.5 Testo Monospace

```css
font-family: 'SF Mono', 'Fira Code', monospace;
font-size: 0.68rem–0.72rem;
```

Usato per:
- Codici ICD-11 (`.dx-col-icd code`)
- UUID (`.dash-uuid`)
- Fenotipo gruppo sanguigno (`.bg-fenotipo-value`)
- Codici ATC
- Event codes (`.ddl-bento-mono`)
- Classi `.text-mono`

### 15.6 Testo Troncato

```css
/* Pattern standard per truncation */
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

Applicato a:
- Nomi farmaco nella timeline (`.tp-tl-drug-name`)
- Titoli card mini chains (`.ch-mini-title`)
- SOC tag (`.ct-soc-tag` con `max-width: 260px`)
- Nomi in sidebar (`.semi-layer-sidebar-title`)

### 15.7 Testo Multi-linea Limitato

```css
/* Line-clamp per stringhe lunghe */
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
```

Usato in `.ct-term-grade-def` per le definizioni dei gradi CTCAE.

### 15.8 Testo Pre-wrap (Note Cliniche)

```css
white-space: pre-wrap;
line-height: 1.5;
```

Usato in `.bg-note-item-text`, `.bg-note-text`, `.ddl-bento-note-text` per preservare i ritorno a capo nelle note cliniche.

### 15.9 Link e Azioni Testuali

Non ci sono `<a>` stilizzati tradizionali. Le azioni sono:
- **Bottoni ghost** con hover su background
- **Testo underline** per free-entry: `.tp-free-entry-btn { text-decoration: underline; color: var(--acqua-sea); }`
- **Hover color** per celle cliccabili: `.pe-grid-nome-cell:hover { color: var(--primary); }`

### 15.10 Testo con Bordo Sinistro (Accento)

```css
/* Note con bordo laterale */
border-left: 3px solid var(--line);
/* Variante warning */
border-left-color: var(--warning, #FF9800);
background: #FFF8E1;

/* Event card sinistra */
.ct-event-left { border-left: 3px solid var(--muted); }

/* Refertazione pending */
.pe-pending-banner { border-left: 3px solid #FF9800; }
```

### 15.11 Formattazione Numerica

```css
/* Numeri allineati (date, valori) */
font-variant-numeric: tabular-nums;
```

Usato in `.ddl-bento-date` per allineare le cifre nelle colonne data.

### 15.12 Placeholder

```css
input::placeholder {
  color: var(--gray-400);
}
/* Focus variant */
input:focus::placeholder {
  color: var(--gray-400); /* rimane visibile */
}
```

---

## 16. Animazioni e Transizioni

### 16.1 Keyframes

| Nome | Tipo | Durata |
|------|------|--------|
| `fadeIn` | Opacità 0→1 | `var(--transition-base)` (200ms) |
| `layerIn` | Scala 0.98→1 + opacità | 200ms |
| `modalIn` | Scala 0.95→1 + opacità (con translate-center) | 200ms |
| `semiLayerIn` | Scala 0.97→1 + translateY(8px→0) | 200ms |
| `cardCopiedFade` | Apparizione → permanenza → scomparsa | 1.2s |

### 16.2 Transizioni Micro

Hover su card e righe: `transition: background 120ms ease` — usato nei moduli clinici.

---

## 17. Responsive

### 17.1 Breakpoint

| Breakpoint | Descrizione |
|------------|-------------|
| `≤ 1100px` | Blood group 3-col → wrap |
| `≤ 768px` | Tablet — sidebar compressa, grid 2-col, modal 95% width |
| `≤ 640px` | Dashboard — grid 1-col, semi-layer sidebar 56px icon-only |
| `≤ 480px` | Mobile — grid 1-col, nasconde info utente, submenu nascosto |

### 17.2 Pattern Responsive

```css
/* Tablet */
@media (max-width: 768px) {
  .layer-menu { width: 48px; }
  .layer-submenu { width: 180px; }
  .modal { width: 95%; max-height: 90vh; }
}

/* Mobile */
@media (max-width: 480px) {
  .layer-submenu { display: none; }
  .layer-menu { width: 44px; }
  .modal { width: 98%; border-radius: var(--border-radius-sm); }
}
```

---

## 18. Colori Semantici per Modulo

### 18.1 CTCAE — Gradi (JS constants)

```js
GRADE_COLORS = {
  1: "#4CAF50",  // Verde — Lieve
  2: "#FFC107",  // Giallo — Moderato
  3: "#FF9800",  // Arancio — Severo
  4: "#F44336",  // Rosso — Potenzialmente letale
  5: "#9C27B0",  // Viola — Morte
};
```

### 18.2 Diagnosi — Stati

```js
STATO_COLORS = {
  attiva:   "#F44336",  // Rosso
  risolta:  "#4CAF50",  // Verde
  cronica:  "#FF9800",  // Arancio
  sospetta: "#9E9E9E",  // Grigio
};
```

### 18.3 Terapie — Stati (CSS)

| Stato | Bar Timeline | Badge |
|-------|-------------|-------|
| Attiva | `rgba(107,170,174,.65)` | `#DCFCE7 / #166534` |
| Sospesa | `rgba(255,177,98,.5)` | `#FEF9C3 / #854D0E` |
| Terminata | `var(--gray-200)` | gray-100 / gray-500 |
| Sostituita | `rgba(99,102,241,.25)` | `#E0E7FF / #3730A3` |

### 18.4 Esami — Valori

```js
STATO_COLORS = { richiesto: "#FF9800", refertato: "#4CAF50" };
```

Griglia matrice:
| Stato cella | Background | Testo |
|-------------|-----------|-------|
| OK (in range) | `rgba(76,175,80,.08)` | `#2E7D32` |
| OOR (fuori range) | `rgba(244,67,54,.08)` | `#C62828`, `font-weight: 600` |
| Richiesto | `rgba(255,152,0,.08)` | `#E65100` |

### 18.5 Chains — Mini Card

| Tipo | Background card |
|------|----------------|
| Diagnosi | `#E8F5F5` |
| Terapia | `#E8EDF2` |
| CTCAE | `#FCE8E8` |

### 18.6 ICD-11 Tree (Diagnosi Detail)

| Kind | Badge bg | Badge text |
|------|---------|------------|
| Chapter | `#E8EAF6` | `#283593` |
| Block | `#E0F2F1` | `#00695C` |
| Category | `#FFF3E0` | `#E65100` |

### 18.7 Operazioni Feed

Le operazioni nel feed usano classi colorate per la sidebar del STEM modal:

| Operazione | Classe aside | Colore sidebar |
|------------|-------------|----------------|
| Create | `.stem-aside-create` | Verde |
| Update | `.stem-aside-update` | Blu |
| Delete | `.stem-aside-delete` | Rosso |
| Esami | `.stem-aside-esami` | Viola |

---

## 19. Riferimenti Rapidi

### Checklist Stile per Nuovo Componente

1. **Contenitore**: `background: #fff`, `border: 1px solid var(--border-color)`, `border-radius: var(--border-radius-md)`, `padding: var(--space-md)`
2. **Titolo sezione**: `font-size: var(--font-size-2xs)`, `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.04em`, `color: var(--gray-500)`
3. **Testo body**: `font-size: var(--font-size-sm)`, `color: var(--gray-700)`, `line-height: 1.5`
4. **Testo muted**: `font-size: var(--font-size-xs)`, `color: var(--gray-400)`
5. **Badge**: `padding: 2px 8px`, `font-size: var(--font-size-2xs)`, `font-weight: 600`, `border-radius: var(--border-radius-sm)`, `text-transform: uppercase`
6. **Hover row**: `background: var(--gray-50)` oppure `var(--palladian)` per moduli clinici
7. **Icona**: inline SVG, `stroke: currentColor`, `stroke-width: 1.5`, size 14–20px via CSS
8. **Focus input**: `border-color: var(--blue-primary)`, `box-shadow: 0 0 0 2px rgba(40,112,148,0.15)`
9. **Bottone primario clinico**: `background: var(--acqua-sea)`, `color: #fff`, `border-radius: 6–8px`
10. **Animazione ingresso**: `animation: fadeIn .15s ease` o variant `scale(0.97) → scale(1)`

### Convenzioni di Naming CSS

| Prefisso | Modulo |
|----------|--------|
| `ct-` | CTCAE (adverse events) |
| `tp-` | Terapie (treatments) |
| `dx-` | Diagnosi |
| `ch-` | Chains (collegamenti) |
| `bg-` | Gruppo Sanguigno (blood group) |
| `pe-` | Paziente Esami |
| `ddl-` | Diagnosi Detail Layer |
| `dash-` | Dashboard / Account |
| `fi-` | Feed Item |
| `fpc-` | Feed Post Card |
| `ac-` | Alert Card |
| `lib-` | Library |

---

*Ultima revisione: giugno 2025*
