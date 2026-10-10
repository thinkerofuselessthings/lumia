# Lumia UI — Analisi Pattern di Navigazione

> Ricerca e decisioni architetturali per il layer navigation della SPA.  
> Data: 13 Aprile 2026

---

## Contesto

- **App**: Single Page Application multi-layer
- **Sezioni**: 10+ (navigazione piatta, primo livello)
- **Utente target**: Power user quotidiano
- **Stile**: Flat white minimalist
- **Target**: Desktop only
- **Tab**: Persistenti (multi-tab, stile browser)

---

## Il Problema del Sidebar Classico

Il sidebar sinistro è il pattern dominante dal ~2013 (era Material Design). È diventato il **"default pigro"**:

- Occupa **220-280px costanti** di spazio orizzontale
- Crea una gerarchia visiva pesante a sinistra
- Non scala bene oltre 8-10 voci senza scroll o collapsing
- Il power user conosce già le sezioni a memoria — il sidebar diventa rumore visivo
- Su desktop widescreen, il sidebar genera un layout asimmetrico

---

## 5 Pattern Alternativi Identificati

### 1. Command-First / Keyboard-Driven
**Esempi**: Superhuman, Raycast, Linear

- Zero navigazione visibile persistente. Tutto passa da `⌘K` / `Ctrl+K`
- Superhuman ha costruito l'intera UX attorno alla tastiera: nessun menu, nessun sidebar, solo shortcut + command palette
- Raycast è letteralmente un'interfaccia che è solo command palette come OS layer

| Pro | Contro |
|-----|--------|
| Massima densità di contenuto | Richiede onboarding |
| Velocissimo per power user | Zero discoverability al day-1 |
| Scala a 100+ voci senza problemi | Utenti mouse-first possono sentirsi persi |

### 2. Tab/Space-Centric con Chrome minimo
**Esempi**: Arc Browser

- Sidebar verticale collassabile che contiene **tab attive**, non menu statici
- La navigazione *è* il contenuto aperto
- **Spaces** per raggruppare contesti (lavoro, personale, progetto X)
- Nessun menu "di sezioni": apri qualcosa → diventa un tab → lo organizzi

| Pro | Contro |
|-----|--------|
| Navigation state = working state | Richiede organizzazione attiva dell'utente |
| Niente dualità menu/contenuto | Può disorientare senza anchor visivo |

### 3. Contextual / Inline Navigation
**Esempi**: Notion, Craft

- Nessun menu globale fisso. La navigazione emerge dal contenuto stesso
- Ogni pagina può linkare ad altre. Breadcrumb in alto come unico orientamento
- L'utente naviga "in profondità", non selezionando da una lista

| Pro | Contro |
|-----|--------|
| Contenuto = navigazione | Funziona per app document-centric |
| Massima aderenza al modello mentale utente | Meno adatto a dashboard/dati |

### 4. Top Bar Segmented / Zoned
**Esempi**: Figma, GitHub (new nav)

- Barra orizzontale in alto divide l'app in 2-4 macro-zone
- All'interno di ogni zona, navigazione locale (tab, breadcrumb)

| Pro | Contro |
|-----|--------|
| Layout 100% width, zero ingombro laterale | Non scala oltre 6-7 voci top-level |
| Familiare, bassa curva di apprendimento | Diventa affollata con molte sezioni |

### 5. Spatial / Canvas
**Esempi**: Miro, Figma FigJam, Apple Freeform

- Nessuna navigazione lineare. L'utente si muove in uno spazio 2D
- Le "sezioni" diventano zone su una tela

| Pro | Contro |
|-----|--------|
| Estrema libertà, immersivo | Non adatto a workflow strutturati |
| Visivamente memorabile | Richiede apprendimento spaziale |

---

## Pattern Ibridi Emergenti

| Combo | Esempio | Idea |
|-------|---------|------|
| Command Palette + Tab Strip | Linear, VS Code | Apri sezioni da `⌘K`, le tab sono l'unica nav visibile |
| Top Bar + Palette | GitHub Copilot Chat | Switch macro-contesto in top, drill-down via search |
| Docking bottom | macOS Dock | Dock orizzontale in basso, stile app launcher |
| Floating Action Hub | — | Bottone floating che apre radial/panel di sezioni |

---

## Decisione: Approccio "Chromeless"

### Scelta: **Command Palette + Tab Strip** (niente altro)

Combinazione di Pattern 1 (Command-First) e Pattern 2 (Tab-Centric).

### Principi

1. **Nessun menu visibile persistente** — zero sidebar, zero dock, zero top nav
2. **Le tab sono l'unica navigazione visibile** — inline, sopra il contenuto
3. **`Ctrl+K` è il punto di ingresso primario** — command palette fuzzy search
4. **Empty state come onboarding** — al primo avvio, hint chiaro su come navigare
5. **Il working state è il navigation state** — quello che hai aperto è quello che vedi

### Perché funziona per Lumia

- **Power user**: conosce le sezioni, vuole velocità → `Ctrl+K` è istantaneo
- **10+ sezioni**: la palette scala senza limiti, un sidebar no
- **Flat white minimalist**: nessun chrome = coerente con lo stile
- **Desktop only**: la tastiera è il dispositivo primario
- **Multi-tab persistente**: le tab in alto danno orientamento senza menu

### Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Zero discoverability day-1 | Empty state con hint `Ctrl+K` + primo avvio guidato |
| Utente perde orientamento | Tab strip sempre visibile + breadcrumb opzionale |
| Troppe tab aperte | Tab scrollable + close button + `Ctrl+W` |
| Manca un "home" | Prima tab può essere dashboard default |

---

## Riferimenti

- **Superhuman** — keyboard-driven email, zero visible navigation
- **Linear** — project management con command palette prominente
- **Arc Browser** — sidebar = tab attive, spaces per contesto
- **Raycast** — OS-level command palette, zero chrome
- **VS Code** — `Ctrl+P` per file, `Ctrl+Shift+P` per comandi, tab-centric
- **Notion** — inline/contextual navigation, breadcrumb
- **Figma** — top bar segmented + canvas spatial

---

*Questo documento guida l'implementazione del prototipo UI Lumia v2 "Chromeless".*
