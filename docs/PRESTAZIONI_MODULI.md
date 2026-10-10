# Prestazioni–Modulo: Architettura e Piano

## 1. Concetto

Le prestazioni con dati/funzioni uniche (trasfusione, chemioterapia, aferesi, biopsia midollare, ecc.) diventano **moduli autonomi** sotto `app/prestazioni/`. Ogni modulo incapsula template, logica, CSS e schema DB.

MDG: al momento implementiamo realmente solo trasfusione, il resto non ancora. Inoltre le Prestazioni con modulo non sono eliminabili nel gestionale agenda.

Il sistema Agenda non sa nulla delle logiche specifiche — chiede a un **registry** se per un dato appuntamento esistono moduli disponibili.

---

## 2. Struttura filesystem

```
app/prestazioni/
  registry.js                         ← registro centrale, API standard
  prestazioni-container.js            ← backdrop/modale condiviso 
  trasfusione/
    trasfusione-template.js           ← getHTML() del form
    trasfusione-logic.js              ← open(), close(), print(), _emoItems state
    trasfusione.css                   ← stili specifici trasfusione
  [futuro] chemioterapia/
    chemioterapia-template.js
    chemioterapia-logic.js
    chemioterapia.css

public/css/
  lumia-prestazioni.css               ← CSS condiviso (container, fieldset, row, field)
```

## 3. Interfaccia modulo standard

Ogni modulo esporta un oggetto conforme a:

```js
{
  id:          'trasfusione',                         // identificativo unico
  label:       'Richiesta Trasfusionale',             // label bottone
  icon:        'hgi-injection',                       // icona HugeIcons
  match:       function(appt) { return boolean; },    // "questo appt è mio?"
  getHTML:     function() { return '<fieldset>...'; },// body del form
  open:        function(appt) {},                     // pre-compila, mostra
  close:       function() {},                         // pulisce
  print:       function() {},                         // genera stampa
  save:        function(appt) {},                     // salva su DB (opzionale)
  load:        function(apptId) {}                    // carica da DB (opzionale)
}
```

## 4. Registry (`registry.js`)

```js
var PrestModules = (function() {
  var _mods = [];
  function register(mod)   { _mods.push(mod); }
  function findFor(appt)   { return _mods.filter(function(m) { return m.match(appt); }); }
  function getById(id)     { return _mods.find(function(m) { return m.id === id; }); }
  function getAll()        { return _mods.slice(); }
  return { register: register, findFor: findFor, getById: getById, getAll: getAll };
})();
```

## 5. Container condiviso (`prestazioni-container.js`)

Un singolo backdrop + modale generico iniettato nel DOM dall'agenda-template:

```html
<div class="prest-backdrop" id="prestBackdrop">
  <div class="prest-modal">
    <div class="prest-header">
      <h2 id="prestTitle">—</h2>
      <div class="prest-header-actions">
        <button class="btn btn-sm" id="prestBtnSave" onclick="prestSave()">Salva</button>
        <button class="btn btn-sm btn-accent" id="prestBtnPrint" onclick="prestPrint()">Stampa</button>
        <button class="node-close" onclick="prestClose()">✕</button>
      </div>
    </div>
    <div class="prest-body" id="prestBody"></div>   ← qui il modulo inietta il suo HTML
  </div>
</div>
```

Funzioni container:

```js
function prestOpen(moduleId, appt) {
  var mod = PrestModules.getById(moduleId);
  if (!mod) return;
  _activeMod = mod;
  prestTitle.textContent = mod.label;
  prestBody.innerHTML = mod.getHTML();
  mod.open(appt);
  prestBackdrop.classList.add('active');
}
function prestClose() { if (_activeMod) _activeMod.close(); prestBackdrop.classList.remove('active'); _activeMod = null; }
function prestPrint() { if (_activeMod) _activeMod.print(); }
function prestSave()  { if (_activeMod && _activeMod.save) _activeMod.save(_currentAppt); }
```

## 6. Integrazione con agenda-scheduler

Il footer del dettaglio appuntamento ha un container generico:

```html
<div id="prestModuleButtons" class="appt-detail-prest-btns"></div>
```

In `openApptDetail(id)`:

```js
var mods = PrestModules.findFor(a);
var btnContainer = C.$('prestModuleButtons');
btnContainer.innerHTML = mods.map(function(m) {
  return '<button class="btn btn-sm btn-accent" onclick="prestOpen(\'' + m.id + '\')">'+
    '<i class="hgi-stroke ' + m.icon + '"></i> ' + m.label + '</button>';
}).join('');
```

**Lo scheduler non conosce più la trasfusione** — il bottone appare automaticamente perché `trasfusione-logic.js` si è registrato nel registry con `match: /trasfusion/i.test(a.title)`.

## 7. Caricamento

### CSS (in `index.html <head>`)

```html
<link href="./public/css/lumia-prestazioni.css" rel="stylesheet">     <!-- condiviso -->
<link href="./app/prestazioni/trasfusione/trasfusione.css" rel="stylesheet">
```

### JS (in `index.html`, dopo agenda-main.js, prima di shell)

```html
<!-- Prestazioni moduli -->
<script defer src="./app/prestazioni/registry.js"></script>
<script defer src="./app/prestazioni/prestazioni-container.js"></script>
<script defer src="./app/prestazioni/trasfusione/trasfusione-template.js"></script>
<script defer src="./app/prestazioni/trasfusione/trasfusione-logic.js"></script>
```

### Ordine di inizializzazione

1. `registry.js` crea `window.PrestModules`
2. `prestazioni-container.js` definisce prestOpen/prestClose/prestPrint globali
3. `trasfusione-template.js` espone `TrasfusioneTemplate.getHTML()`
4. `trasfusione-logic.js` crea il modulo e chiama `PrestModules.register({...})`
5. L'agenda-scheduler chiama `PrestModules.findFor(appt)` quando serve

---

## 8. Schema DB — Trasfusione

Due tabelle nel DB agenda (`agenda-service/src/db.js`):

### `transfusion_requests` — dati generali della richiesta

| Colonna            | Tipo     | Descrizione                                    |
|--------------------|----------|------------------------------------------------|
| id                 | INTEGER PK | Auto-increment                              |
| appointment_id     | INTEGER FK | → appointments.id                            |
| patient_uuid       | TEXT FK    | → patients.uuid                              |
| reparto            | TEXT     | Reparto / U.O. richiedente                     |
| nosologico         | TEXT     | N. nosologico                                  |
| diagnosi           | TEXT     | Diagnosi                                        |
| indicazione        | TEXT     | Indicazione alla trasfusione                    |
| gruppo_sanguigno   | TEXT     | A/B/AB/0                                        |
| rh                 | TEXT     | Positivo/Negativo                               |
| hb                 | REAL     | Emoglobina (g/dL)                               |
| hct                | REAL     | Ematocrito (%)                                  |
| plt                | INTEGER  | Piastrine (x10³/µL)                             |
| pt_inr             | REAL     | PT / INR                                        |
| aptt               | REAL     | aPTT (sec)                                      |
| fibrinogeno        | INTEGER  | Fibrinogeno (mg/dL)                             |
| urgenza            | TEXT     | ordinaria/urgente/urgentissima                  |
| prev_trasfusioni   | INTEGER  | 0/1                                             |
| reazioni_note      | TEXT     | Note su reazioni precedenti                     |
| medico             | TEXT     | Medico richiedente                              |
| data_richiesta     | TEXT     | ISO datetime                                    |
| note               | TEXT     | Note aggiuntive                                 |
| status             | TEXT     | draft/completed/cancelled                       |
| created_at         | TEXT     | Auto                                            |
| updated_at         | TEXT     | Auto (trigger)                                  |

### `transfusion_emocomponents` — emocomponenti richiesti (1:N)

| Colonna            | Tipo     | Descrizione                                    |
|--------------------|----------|------------------------------------------------|
| id                 | INTEGER PK | Auto-increment                              |
| request_id         | INTEGER FK | → transfusion_requests.id ON DELETE CASCADE  |
| emo_type           | TEXT     | Es. "Emazie concentrate (EC)"                  |
| units              | INTEGER  | N° unità                                        |
| irradiato          | INTEGER  | 0/1                                             |
| filtrato           | INTEGER  | 0/1                                             |
| lavato             | INTEGER  | 0/1                                             |
| fenotipizzato      | INTEGER  | 0/1                                             |
| created_at         | TEXT     | Auto                                            |

### API REST

| Endpoint                                         | Metodo | Descrizione                  |
|--------------------------------------------------|--------|------------------------------|
| `/appointments/:id/transfusion`                  | GET    | Carica richiesta + emocomp.  |
| `/appointments/:id/transfusion`                  | POST   | Crea/aggiorna richiesta      |
| `/appointments/:id/transfusion`                  | DELETE | Cancella richiesta           |

Il POST accetta un unico JSON con la richiesta + array di emocomponenti (upsert atomico via transaction).

---

## 9. Modulo Laboratorio (Library)

Nuovo modulo di libreria **"Laboratorio"** (position 02, tra Agenda e Tools) per il personale del laboratorio analisi/trasfusionale.

### Card Library

```
01 Agenda   →  02 Laboratorio  →  03 Tools  →  04 Docs  →  05 User  →  Logout  →  Admin
```

### Struttura layer

Layer fullscreen (come Agenda) con sidebar:

```
Sidebar:
  📋 Richieste       ← vista giornaliera di tutte le richieste
  🔬 Trasfusionali   ← richieste trasfusionali filtrate
  📦 Referti          ← futuro: gestione referti
```

### Vista "Richieste Giornaliere"

| Funzione                                      | Descrizione                                            |
|-----------------------------------------------|--------------------------------------------------------|
| Selezione data                                | Mini-calendario come in Agenda                          |
| Tabella richieste                             | Lista appuntamenti del giorno con `type=prestazione`    |
| Filtro per tipo prestazione                   | Select: Tutte / Trasfusione / Emocromo / ecc.          |
| Stato richiesta                               | draft → completed → cancelled                           |
| Azioni per riga                               | Visualizza form compilato, Stampa, Cambia stato         |
| Stampa batch                                  | Seleziona multiple → stampa tutte le richieste          |

### Dati

Il modulo Laboratorio **legge le stesse tabelle** dell'agenda (appointments + transfusion_requests + transfusion_emocomponents) con API dedicate:

| Endpoint                                      | Metodo | Descrizione                           |
|-----------------------------------------------|--------|---------------------------------------|
| `/lab/requests?date=YYYY-MM-DD`               | GET    | Tutte le richieste per data           |
| `/lab/requests?date=...&type=trasfusione`     | GET    | Filtrate per tipo                     |
| `/lab/requests/:id`                           | GET    | Dettaglio singola richiesta           |
| `/lab/requests/:id/status`                    | PATCH  | Aggiorna stato (completed/cancelled)  |

### Filesystem

```
app/laboratorio/
  ui/
    lab-template.js        ← HTML layer fullscreen
    lab-config.js          ← costanti, labels
    lab-api.js             ← fetch wrapper
    lab-requests.js        ← vista richieste giornaliere
    lab-main.js            ← init, LayerSystem.registerContent
  laboratorio.css          ← stili dedicati (o in public/css/)
```

### Registrazione

```js
// shell-state.js MODULE_INFO
'laboratorio': { icon: 'hgi-test-tube-01', name: 'Laboratorio', contentKey: 'lab-module' }

// lab-main.js
LayerSystem.registerContent('lab-module', { render: ..., destroy: ... });
```

---

## 10. Piano di implementazione

### Fase 1 — Infrastruttura prestazioni
1. Creare `app/prestazioni/registry.js`
2. Creare `app/prestazioni/prestazioni-container.js` (backdrop condiviso)
3. Creare `public/css/lumia-prestazioni.css` (stili condivisi: fieldset, row, field, etc.)
4. Aggiungere container generico `#prestBackdrop` in agenda-template.js
5. Aggiungere `#prestModuleButtons` nel footer dettaglio appuntamento
6. Modificare `openApptDetail()` per interrogare il registry

### Fase 2 — Migrazione trasfusione
7. Estrarre template → `app/prestazioni/trasfusione/trasfusione-template.js`
8. Estrarre logica → `app/prestazioni/trasfusione/trasfusione-logic.js`
9. Estrarre CSS → `app/prestazioni/trasfusione/trasfusione.css`
10. Rimuovere codice trasfusione da agenda-scheduler.js e agenda-template.js
11. Registrare modulo: `PrestModules.register(TrasfusioneModule)`

### Fase 3 — DB + persistenza
12. Creare tabelle `transfusion_requests` + `transfusion_emocomponents` in db.js
13. API REST: GET/POST/DELETE `/appointments/:id/transfusion`
14. Controller `transfusion.js` in agenda-service
15. Collegare `save()` e `load()` nel modulo trasfusione

### Fase 4 — Modulo Laboratorio
16. Creare `app/laboratorio/ui/` con template, config, api, requests, main
17. Aggiungere card "Laboratorio" in index.html (posizione 02)
18. Registrare in shell-state.js
19. API `/lab/requests` con filtri data/tipo
20. Vista tabellare con azioni stampa/stato

### Fase 5 — Seed trasfusione nel catalogo servizi
21. Aggiungere "Trasfusione" al seed di services in db.js con code `99.05` (cod. SSN)
22. Flag `has_module: 1` su services per indicare prestazioni con modulo associato

---

## 11. Domande aperte

1. **Accesso Laboratorio** — Visibile a tutti o solo a ruoli specifici? (come Admin)
2. **Referti** — Il tab "Referti" del laboratorio è un placeholder per post-MVP o vuoi una struttura base?
3. **Più moduli per appuntamento** — Un appuntamento può attivare più di un modulo simultaneamente? (es. trasfusione + emocromo)
4. **Seed trasfusione** — Il servizio "Trasfusione" è già nel seed attuale? Se no, aggiungiamo `99.05 Trasfusione` e opzionalmente `99.05.1 Trasfusione EC`, `99.05.2 Trasfusione CP` ecc.?
