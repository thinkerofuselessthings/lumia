# Layout Modulo Agenda — Specifiche UI

> Documento di riferimento per struttura e layout di tutti i componenti UI del modulo Agenda LUMIA.

---

## 1. Architettura Layer

Il modulo Agenda è composto da **3 layer principali** selezionabili via sidebar tab:

```
┌──────────┬─────────────────────────────────────────────┐
│ Sidebar  │                Layer Content                │
│ (36px)   │                                             │
│ ┌──────┐ │  • Agenda (scheduler griglia oraria)        │
│ │ 📅  │ │  • Liste  (liste pazienti per flusso)       │
│ │ 📋  │ │  • Elenco (ricerca globale appuntamenti)    │
│ └──────┘ │                                             │
└──────────┴─────────────────────────────────────────────┘
```

---

## 2. Layer Agenda — Scheduler

### 2.1 Sidebar Agenda

```
┌─────────────────────┐
│  🏥 Agenda           │  ← brand
├─────────────────────┤
│  Struttura           │
│  [Flusso selezionato]│  ← struct-btn con dropdown
├─────────────────────┤
│  Mini Calendario     │  ← griglia mese con indicatori
├─────────────────────┤
│  Day Card            │  ← click → openDayConfig()
│  ┌───────────────┐   │
│  │ LUN           │   │
│  │   13          │   │
│  │ Aprile        │   │
│  └───────────────┘   │
├─────────────────────┤
│  Vista               │
│  [⚙ config btn]     │  ← click → openZoomCfg() modale
├─────────────────────┤
│  Legenda             │
│  ● Visita            │
│  ● Terapia           │
│  ● Prestazione       │
└─────────────────────┘
```

### 2.2 Area Principale — Griglia Scheduler

```
┌──────┬────────────┬────────────┬────────────┐
│ Ora  │ Postaz. 1  │ Postaz. 2  │ Postaz. N  │
├──────┼────────────┼────────────┼────────────┤
│ 8:00 │            │ ▓▓▓▓▓▓▓▓  │            │
│ 8:10 │ ▓▓▓▓▓▓▓▓  │ ▓ Appt ▓  │            │
│ 8:20 │ ▓ Appt ▓  │ ▓▓▓▓▓▓▓▓  │            │
│ 8:30 │ ▓▓▓▓▓▓▓▓  │            │ ▓▓▓▓▓▓▓▓  │
│ ...  │            │            │            │
└──────┴────────────┴────────────┴────────────┘
```

- **Slot height**: default 14px (S), configurabile via modale (14/22/32px)
- **Range selection**: mousedown + drag su slot vuoti → apre Wizard
- **Weekend/festivi**: griglia non operativa, blocco interazione

### 2.3 Zoom Config Modal

```
┌─────────────────────────┐
│  Configurazione vista   │
├─────────────────────────┤
│  [Compatto    S — 14px] │  ← attivo di default
│  [Normale     M — 22px] │
│  [Ampio       L — 32px] │
└─────────────────────────┘
```

---

## 3. Wizard Appuntamento — Layout a Due Colonne

Il wizard (creazione/modifica) usa un layout **split a due colonne**:

```
┌─────────────────────────────────────────────────────────┐
│  Header: "Nuovo appuntamento"                    [✕]    │
├──────────────────┬──────────────────────────────────────┤
│                  │  Steps: [1·Tipo] [2·Paziente]        │
│                  │         [3·Dettagli] [4·Orario]      │
│   PLACEHOLDER    │──────────────────────────────────────│
│                  │                                      │
│   ┌──────────┐   │   Contenuto step attivo:             │
│   │          │   │                                      │
│   │  🏥 / 👤 │   │   • Step 0: tipo + lista prestazioni│
│   │          │   │   • Step 1: dati paziente            │
│   │  icona   │   │   • Step 2: titolo, desc, note       │
│   │ dinamica │   │   • Step 3: data, orario, durata     │
│   │          │   │                                      │
│   └──────────┘   │                                      │
│                  │──────────────────────────────────────│
│  bg: gray-50     │  [Indietro]    [Annulla] [Avanti]   │
│  240px fisso     │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### 3.1 Colonna Placeholder (sinistra)

- **Larghezza**: 240px fisso
- **Background**: `var(--gray-50)` (grigio chiaro)
- **Contenuto**: icona centrata (verticale + orizzontale), grande (48px), colore `var(--gray-300)`
- **Icona dinamica per step**:
  - Step 0 (Tipo): `hgi-clipboard` — prestazione
  - Step 1 (Paziente): `hgi-user` — paziente
  - Step 2 (Dettagli): `hgi-file-02` — documenti
  - Step 3 (Orario): `hgi-clock-02` — orologio
- **Sotto l'icona**: label testuale del passo (font-size .7rem, color gray-400)

### 3.2 Colonna Wizard (destra)

- **Flex**: 1 (occupa lo spazio rimanente)
- **Struttura**: stepper tabs in alto → body form → footer con navigazione
- Contenuto invariato rispetto all'attuale, ma con più spazio orizzontale

---

## 4. Ricerca Anagrafica — Modale Dedicata

La ricerca paziente (**Step 1**) viene attivata da un bottone "Cerca anagrafica" che apre un **modale sovrapposto a 3 colonne**:

```
┌───────────────────────────────────────────────────────────┐
│  Cerca Anagrafica                                  [✕]   │
├───────────┬──────────────────────┬────────────────────────┤
│           │                      │                        │
│ PLACEHOLDER│   RICERCA           │   RISULTATO            │
│           │                      │                        │
│  ┌─────┐  │  [🔍 input search]  │  ┌──────────────────┐  │
│  │     │  │                      │  │                  │  │
│  │ 👤  │  │  Lista risultati:    │  │  Dettaglio pz    │  │
│  │     │  │  ┌────────────────┐  │  │                  │  │
│  └─────┘  │  │ Rossi Mario   │  │  │  Nome: Mario     │  │
│           │  │ Rossi Anna    │  │  │  Cognome: Rossi  │  │
│ bg:gray-50│  │ Russo Paolo   │  │  │  CF: RSSMRA...   │  │
│ 180px     │  └────────────────┘  │  │  Nato: 01/01/80  │  │
│           │                      │  │  Tel: 333...     │  │
│           │   max-h: 300px       │  │                  │  │
│           │   overflow scroll    │  │  [Seleziona]     │  │
│           │                      │  └──────────────────┘  │
└───────────┴──────────────────────┴────────────────────────┘
```

### 4.1 Colonna Placeholder (sinistra)
- **Larghezza**: 180px
- **Background**: `var(--gray-50)`
- **Icona**: `hgi-search-01` (48px, colore gray-300, centrata)

### 4.2 Colonna Ricerca (centrale)
- **Flex**: 1
- **Input**: campo di ricerca con debounce (300ms)
- **Lista risultati**: max-height 300px, scroll, ogni item clickabile
- **Item**: nome cognome + CF (troncato) + data nascita

### 4.3 Colonna Risultato (destra)
- **Larghezza**: 280px
- **Stato vuoto**: placeholder "Seleziona un paziente dalla lista"
- **Stato popolato**: card con tutti i dati del paziente + bottone "Seleziona"
- **Al click Seleziona**: popola i campi w_nome, w_cognome, w_codice_fiscale, w_data_nascita, w_phone, w_patient_uuid e chiude il modale

### 4.4 Flusso

1. Utente arriva allo Step 1 del wizard
2. Vede campi vuoti + bottone **"🔍 Cerca anagrafica"**
3. Click → apre modale anagrafica (z-index: 400, sopra wizard che è a 300)
4. Digita nel campo ricerca → risultati live
5. Click su risultato → colonna destra si popola
6. Click "Seleziona" → campi wizard compilati, modale si chiude
7. Utente può comunque compilare manualmente senza usare la ricerca

---

## 5. Dettaglio Appuntamento — Layout a Due Colonne

Il modale dettaglio appuntamento (click su blocco nello scheduler) segue lo **stesso pattern placeholder** del wizard:

```
┌─────────────────────────────────────────────────────────┐
│  Dettaglio appuntamento                          [✕]    │
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│   PLACEHOLDER    │   Grid 2 colonne:                    │
│                  │                                      │
│   ┌──────────┐   │   ┌─────────────┬──────────────┐    │
│   │          │   │   │ Tipo/Stato  │  Paziente    │    │
│   │   📋    │   │   │             │              │    │
│   │          │   │   │ Prestazione │  Orario      │    │
│   │  tipo    │   │   │             │  Postazione  │    │
│   │  badge   │   │   └─────────────┴──────────────┘    │
│   │          │   │                                      │
│   └──────────┘   │                                      │
│                  │                                      │
│  bg: type-color  ├──────────────────────────────────────┤
│  tint (10%)      │  [✏ Modifica]          [🗑 Elimina] │
│  240px fisso     │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### 5.1 Colonna Placeholder (sinistra)
- **Larghezza**: 240px
- **Background**: tinta del tipo appuntamento (10% opacità)
  - Visita: `var(--visita-bg)`
  - Terapia: `var(--terapia-bg)`
  - Prestazione: `var(--prestazione-bg)`
- **Contenuto**: icona tipo (grande, 48px) + badge tipo sotto

### 5.2 Colonna Dettaglio (destra)
- **Layout**: grid 2 colonne (invariato dall'attuale `appt-detail-grid`)
- **Sezioni**: Tipo/Stato, Prestazione, Paziente, Orario/Postazione

---

## 6. Day Config — Modale Fullscreen

```
┌─────────────────────────────────────────────────────────┐
│  Configurazione giorno: Lunedì 13/4/2026         [✕]   │
├──────────┬──────────────────────────────────────────────┤
│ Sidebar  │                                              │
│ ┌──────┐ │  Tab "Stato":                                │
│ │ Stato│ │    Giorno aperto/chiuso [toggle]             │
│ │Postaz│ │    Motivo chiusura                           │
│ └──────┘ │                                              │
│          │  Tab "Postazioni":                           │
│          │    Lista postazioni con toggle on/off        │
└──────────┴──────────────────────────────────────────────┘
```

---

## 7. Regole Weekend

### 7.1 Default
- Sabato (dow=6) e Domenica (dow=0) sono **non operativi** per default
- Definito in `DEFAULT_SCHEDULE`: chiavi 6 e 7 con `active: false`

### 7.2 Livelli di blocco
| Livello | Comportamento |
|---------|---------------|
| `visibleRooms()` | Usa `DEFAULT_SCHEDULE` come fallback → 0 stanze visibili nel weekend |
| Range selection | Blocca mousedown/mouseup se weekend |
| Wizard validation | Step 3 rifiuta date sab/dom |
| Backend create | Rifiuta con 400 se data è sab/dom |
| Backend move | Rifiuta con 400 se data destinazione è sab/dom |

### 7.3 Override
- Un admin può forzare l'apertura tramite la gestione sede (tab Override Postazioni)
- L'override day-room sovrascrive il check schedule per singola postazione/giorno

---

## 8. CSS Classes Reference

| Componente | Classe | Scopo |
|-----------|--------|-------|
| Wizard container | `.node-wizard` | Modale wizard (max-width 900px con placeholder) |
| Wizard layout | `.wiz-split` | Flex row: placeholder + body |
| Placeholder column | `.wiz-placeholder` | 240px, gray-50 bg, icona centrata |
| Wizard body | `.wiz-body` | flex:1, contenuto step |
| Anagrafica modal | `.ana-backdrop` | Backdrop z-index 400 |
| Anagrafica layout | `.ana-split` | Flex row: 3 colonne |
| Anagrafica placeholder | `.ana-placeholder` | 180px, gray-50 bg |
| Anagrafica search | `.ana-search` | flex:1, input + lista |
| Anagrafica result | `.ana-result` | 280px, card dettaglio |
| Detail layout | `.appt-detail-split` | Flex row: placeholder + grid |
| Detail placeholder | `.appt-detail-placeholder` | 240px, type-tint bg |

---

## 9. File coinvolti

| File | Modifiche |
|------|-----------|
| `app/agenda/ui/agenda-template.js` | Template HTML wizard, detail, anagrafica modal |
| `app/agenda/ui/agenda-wizard.js` | Logic apertura/chiusura anagrafica modal, selezione paziente |
| `app/agenda/ui/agenda-scheduler.js` | openApptDetail con nuovo layout placeholder |
| `public/css/lumia-agenda.css` | Nuove classi CSS per split layout, placeholder, anagrafica |
