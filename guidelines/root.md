# Root — Stili Principali e Palette

> Design tokens, palette colori, tipografia, spaziature e stili base del sistema Janus/ChemERA.
> File sorgente: `public/css/base.css` (258 righe).

---

## Indice

1. [Filosofia di design](#1-filosofia-di-design)
2. [Palette grigia](#2-palette-grigia)
3. [Colori semantici](#3-colori-semantici)
4. [Palette brand estesa](#4-palette-brand-estesa)
5. [Spaziature](#5-spaziature)
6. [Tipografia](#6-tipografia)
7. [Bordi](#7-bordi)
8. [Ombre](#8-ombre)
9. [Transizioni](#9-transizioni)
10. [Reset e base](#10-reset-e-base)
11. [Sistema bottoni](#11-sistema-bottoni)
12. [Sistema input/form](#12-sistema-inputform)
13. [Classi utility](#13-classi-utility)
14. [Colori modulo (sandbox libreria)](#14-colori-modulo-sandbox-libreria)

---

## 1. Filosofia di design

**Flat White Minimalist** — interfaccia bianca e pulita, tipografia Inter con feature OpenType, scala di grigi come linguaggio primario, colore usato con parsimonia per segnalare stato o identità.

Principi chiave:
- **Bianco come sfondo dominante** — `--white: #FFFFFF`, body `background: var(--gray-50)`
- **Grigi per gerarchia** — dal `--gray-50` (sfondo sottile) al `--gray-900` (testo primario)
- **Colore = segnale** — rosso per errore/pericolo, verde per successo, brand colors per identità modulo
- **Tipo scala ordinata** — da `3xs` (0.5rem) a `3xl` (2rem), nessun valore arbitrario

---

## 2. Palette grigia

| Token | Hex | Uso tipico |
|---|---|---|
| `--white` | `#FFFFFF` | Sfondo card, input |
| `--gray-50` | `#FAFAFA` | Sfondo body, hover sottile |
| `--gray-100` | `#F5F5F5` | Sfondo badge, sfondo testata tabella |
| `--gray-200` | `#EEEEEE` | Bordi default (`--border-color`) |
| `--gray-300` | `#E0E0E0` | Bordi hover, numerazione card |
| `--gray-400` | `#BDBDBD` | Testo muted, placeholder |
| `--gray-500` | `#9E9E9E` | Testo secondario, `.text-muted` |
| `--gray-600` | `#757575` | Testo descrizione, label |
| `--gray-700` | `#616161` | Testo paragrafi |
| `--gray-800` | `#424242` | Testo forte |
| `--gray-900` | `#212121` | Testo primario, color body |
| `--black` | `#000000` | Sfondo `.btn-primary` |

```css
:root {
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
  --black: #000000;
}
```

---

## 3. Colori semantici

| Token | Hex | Significato |
|---|---|---|
| `--accent` | `#1A1A1A` | Accento generale (quasi nero) |
| `--accent-light` | `#404040` | Hover `.btn-primary` |
| `--error` | `#DC2626` | Errore, `.text-error`, `.btn-danger` |
| `--success` | `#16A34A` | Successo, `.text-success` |

```css
--accent: #1A1A1A;
--accent-light: #404040;
--error: #DC2626;
--success: #16A34A;
```

---

## 4. Palette brand estesa

Colori con identità propria, usati nei moduli clinici, layer e accenti decorativi.

| Token | Hex | Nome | Uso |
|---|---|---|---|
| `--blue-primary` | `#287094` | Blue Primary | `.btn-action`, link, accenti principali |
| `--blue-dark` | `#023246` | Blue Dark | Header scuri, gradients |
| `--blue-medium` | `#10455B` | Blue Medium | Toni intermedi |
| `--blue-light` | `#6db5ca` | Blue Light | Accenti leggeri |
| `--acqua-sea` | `#6BAAAE` | Acqua Sea | CTA principali, stepper active, terapie |
| `--blue-fantastic` | `#2C3B4D` | Blue Fantastic | Chip selezionati, toggle active, tree icon |
| `--charcoal` | `#1f1f1d` | Charcoal | Testi scuri alternativi |
| `--cream` | `#e6e7d7` | Cream | Fondi decorativi |
| `--orange` | `#f29337` | Orange | Badge, warning leggeri |
| `--orange-dark` | `#ed642d` | Orange Dark | Accenti intensi |
| `--yellow` | `#ffaf20` | Yellow | `.btn-reset`, alert |
| `--truffle-trouble` | `#A35139` | Truffle Trouble | Today-line timeline, motivo chiusura |
| `--burning-flame` | `#FFB162` | Burning Flame | Badge AIFA, tree icon active |
| `--palladian` | `#F9F8F6` | Palladian | Hover card, sfondo warm |
| `--rosso-bright` | `#EA2E00` | Rosso Bright | Tree icon child, alert critici |

```css
--blue-primary: #287094;
--blue-dark: #023246;
--blue-medium: #10455B;
--blue-light: #6db5ca;
--charcoal: #1f1f1d;
--cream: #e6e7d7;
--orange: #f29337;
--orange-dark: #ed642d;
--yellow: #ffaf20;
```

> **Nota**: `--acqua-sea`, `--blue-fantastic`, `--truffle-trouble`, `--burning-flame`, `--palladian`, `--rosso-bright` non sono definiti in `base.css` ma vengono usati inline via fallback CSS in `landing.css` con la sintassi `var(--acqua-sea, #6BAAAE)`. Il sandbox libreria (`apps/libreria/styles.css`) li definisce esplicitamente nel `:root`.

---

## 5. Spaziature

Scala lineare a 7 step. Usata ovunque per padding, gap, margin.

| Token | Valore | px |
|---|---|---|
| `--space-xs` | `4px` | 4 |
| `--space-sm` | `8px` | 8 |
| `--space-md` | `16px` | 16 |
| `--space-lg` | `24px` | 24 |
| `--space-xl` | `32px` | 32 |
| `--space-2xl` | `48px` | 48 |
| `--space-3xl` | `64px` | 64 |

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
--space-2xl: 48px;
--space-3xl: 64px;
```

### Uso nei componenti

| Contesto | Spaziatura tipica |
|---|---|
| Gap interno form/card | `--space-sm` (8px) |
| Padding card | `--space-lg` (24px) |
| Gap griglia | `--space-md` (16px) |
| Padding sezione | `--space-lg` / `--space-2xl` |
| Margin heading | `--space-sm` / `--space-md` |

---

## 6. Tipografia

### 6.1 Font family

```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

Feature OpenType attive:

```css
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
```

| Feature | Effetto |
|---|---|
| `cv02` | Variante cifra 1 |
| `cv03` | Variante cifra 6/9 |
| `cv04` | Variante cifra 4 aperta |
| `cv11` | l minuscola con serif basso |

### 6.2 Scala tipografica

| Token | Rem | px equiv. | Uso tipico |
|---|---|---|---|
| `--font-size-3xs` | `0.5rem` | 8 | Micro label, timeline |
| `--font-size-2xs` | `0.625rem` | 10 | Badge, numerazione, meta |
| `--font-size-xs` | `0.75rem` | 12 | Label, testo secondario |
| `--font-size-sm` | `0.875rem` | 14 | Testo base UI, input, bottoni |
| `--font-size-base` | `1rem` | 16 | Body, paragrafi |
| `--font-size-lg` | `1.125rem` | 18 | Titoli sezione piccoli |
| `--font-size-xl` | `1.25rem` | 20 | h3, view-bar title |
| `--font-size-2xl` | `1.5rem` | 24 | h2 |
| `--font-size-3xl` | `2rem` | 32 | h1 |

### 6.3 Heading

```css
h1 { font-size: var(--font-size-3xl); margin-bottom: var(--space-sm); }
h2 { font-size: var(--font-size-2xl); margin-bottom: var(--space-md); }
h3 { font-size: var(--font-size-xl);  margin-bottom: var(--space-md); }
```

### 6.4 Paragrafi

```css
p {
  color: var(--gray-700);
  line-height: 1.6;
  margin-bottom: var(--space-md);
}
```

### 6.5 Body

```css
body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--gray-900);
  background: var(--gray-50);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
```

---

## 7. Bordi

| Token | Valore | Uso |
|---|---|---|
| `--border-width` | `1px` | Bordo standard universale |
| `--border-color` | `var(--gray-200)` | Colore bordo di default |
| `--border-radius-sm` | `4px` | Badge, chip, bottoni piccoli |
| `--border-radius-md` | `6px` | Input, bottoni, card interne |
| `--border-radius-lg` | `8px` | Card, panel, modal content |

```css
--border-width: 1px;
--border-color: var(--gray-200);
--border-radius-sm: 4px;
--border-radius-md: 6px;
--border-radius-lg: 8px;
```

> I componenti usano anche `border-radius: 10px` e `12px` inline per card e modal più grandi.

---

## 8. Ombre

Solo due livelli, minimalisti:

| Token | Valore | Quando |
|---|---|---|
| `--shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | Hover bottoni, badge |
| `--shadow-md` | `0 1px 3px 0 rgba(0,0,0,0.1)` | Card elevate, dropdown |

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
```

> I modal usano ombre più pesanti inline: `box-shadow: 0 8px 32px rgba(0,0,0,0.18)`.

---

## 9. Transizioni

| Token | Valore | Uso |
|---|---|---|
| `--transition-fast` | `150ms ease` | Focus input, hover micro |
| `--transition-base` | `200ms ease` | Hover card, toggle, layer |
| `--transition-slow` | `300ms ease` | Apertura overlay, slide |

```css
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

---

## 10. Reset e base

### 10.1 Reset universale

```css
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

### 10.2 Body

- Layout: `100vw × 100vh`, `overflow: hidden` (nessuno scroll globale)
- Font rendering: antialiased su entrambi i motori
- Sfondo: `var(--gray-50)` (#FAFAFA)

---

## 11. Sistema bottoni

### 11.1 Bottone base

```css
button, .btn {
  font-family: var(--font-family);
  font-size: var(--font-size-sm);          /* 14px */
  font-weight: 500;
  padding: var(--space-sm) var(--space-lg); /* 8px 24px */
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--border-radius-md);  /* 6px */
  background: var(--white);
  color: var(--gray-900);
  cursor: pointer;
  transition: all var(--transition-base);
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
}
```

Stati interattivi:
- **hover** → `border-color: var(--gray-400)`, `box-shadow: var(--shadow-sm)`
- **active** → `transform: translateY(1px)`
- **disabled** → `opacity: 0.5`, `cursor: not-allowed`

### 11.2 Varianti colore

| Classe | Background | Testo | Bordo | Hover bg |
|---|---|---|---|---|
| `.btn-primary` | `--black` | `--white` | `--black` | `--accent-light` (#404040) |
| `.btn-danger` | `--error` (#DC2626) | `--white` | `--error` | `#B91C1C` |

### 11.3 Bottoni form (`.btn-form`)

Layout **colonna**: icona SVG sopra + testo `xs` uppercase sotto. Usati nelle toolbar delle schede.

```css
.btn-form {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  border: var(--border-width) solid transparent;
  border-radius: var(--border-radius-md);
  min-width: 56px;
}
.btn-form svg { width: 18px; height: 18px; }
.btn-form span {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.04em;
}
```

### 11.4 Varianti form-button

| Classe | Background | Testo |
|---|---|---|
| `.btn-action` | `--blue-primary` (#287094) | `--white` |
| `.btn-close` | `--error` (#DC2626) | `--white` |
| `.btn-reset` | `--yellow` (#FFAF20) | `--gray-900` |

---

## 12. Sistema input/form

### 12.1 Input base

```css
input, textarea, select {
  font-family: var(--font-family);
  font-size: var(--font-size-sm);     /* 14px */
  padding: var(--space-sm) var(--space-md); /* 8px 16px */
  border: var(--border-width) solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: var(--white);
  color: var(--gray-900);
  transition: all var(--transition-fast);
  width: 100%;
}
```

### 12.2 Focus

```css
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--gray-400);
  background-color: var(--gray-50);
  color: var(--gray-900);
}
```

> Nessun `box-shadow` su focus dei base input. Nel modulo esami i focus usano `box-shadow: 0 0 0 2px rgba(59,130,246,0.15)`.

### 12.3 Placeholder

```css
input::placeholder { color: var(--gray-400); }
input:focus::placeholder { color: var(--gray-400); }
```

### 12.4 Form group

```css
.form-group {
  margin-bottom: var(--space-lg); /* 24px */
}
.form-group label {
  display: block;
  margin-bottom: var(--space-xs);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--gray-700);
}
```

---

## 13. Classi utility

| Classe | Proprietà |
|---|---|
| `.text-error` | `color: var(--error)` — #DC2626 |
| `.text-success` | `color: var(--success)` — #16A34A |
| `.text-muted` | `color: var(--gray-500)` — #9E9E9E |

---

## 14. Colori modulo (sandbox libreria)

Definiti in `apps/libreria/styles.css` — colori identitari per ciascun modulo clinico.

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

Questi colori vengono applicati come sfondo degli icon-badge nel tree e nel quick-launch grid della libreria.

---

## Appendice — Mappa file

| File | Contenuto |
|---|---|
| `public/css/base.css` | Tutti i token `:root`, reset, heading, button, input, utility |
| `public/css/landing.css` | Componenti UI (usano i token di base.css) |
| `public/css/layers.css` | Variante layer/modal nesting |
| `public/css/login.css` | Pagina login (indipendente) |
| `apps/libreria/styles.css` | Sandbox standalone con `:root` esteso |
