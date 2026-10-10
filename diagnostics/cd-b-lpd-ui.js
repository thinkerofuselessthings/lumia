/*! cd-b-lpd-ui.js â€” CD-Based B-LPD Diagnostic UI v5 (3-col + modal picker)
 *  Dipendenze: cd-b-lpd-data.js (CDBLPDData), cd-b-lpd-core.js (CDBLPDCore),
 *              lumia-helpers.css, HugeIcons CDN
 *  Espone: window.CDDiagnosticHelper  { open(), close(), mount(el), getSelection(), setSelection(arr), reset() }
 *
 *  Layout (no header):
 *    Col 1 â€” Titolo + lista CD selezionati (library-item rows) + bottone Â«AggiungiÂ»
 *    Col 2 â€” ProbabilitÃ  diagnostica + interpretazione
 *    Col 3 â€” Confronto profilo standard vs inserito (su click diagnosi)
 *
 *  Modal picker (dialog 2 colonne):
 *    Sinistra â€” Griglia marker per categoria + selettore stato
 *    Destra  â€” Lista CD scelti (staging) + Applica/Annulla
 *
 *  Pattern: IIFE su window
 */
(function attachCDBLPDUI(global) {
  'use strict';

  var Core = global.CDBLPDCore;
  var Data = global.CDBLPDData;
  if (!Core) { console.error('[cd-b-lpd-ui] CDBLPDCore non caricato'); return; }
  if (!Data) { console.error('[cd-b-lpd-ui] CDBLPDData non caricato'); return; }

  /* â”€â”€ State â”€â”€ */
  var selections = [];
  var lastResult = null;
  var selectedDiagnosis = null;
  var mountEl = null;
  var colRefs = { markers: null, results: null, compare: null };
  var radarChart = null;
  var radarLayers = { matches: true, conflicts: true };

  /* â”€â”€ DOM helpers â”€â”€ */
  function qs(s, r) { return (r || document).querySelector(s); }
  function qsa(s, r) { return (r || document).querySelectorAll(s); }
  function cel(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(s) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s] || s;
    });
  }

  /* â”€â”€ State labels & chips â”€â”€ */
  var STATE_LABELS = { pos:'Pos', neg:'Neg', dim:'Dim', br:'Bright' };
  var STATE_FULL   = { pos:'Positivo', neg:'Negativo', dim:'Dim', br:'Bright' };
  function chip(state) {
    return '<span class="cd-chip cd-chip-' + state + '">' + (STATE_LABELS[state] || state) + '</span>';
  }


  /* Marker knowledge base — loaded from cd-b-lpd-knowledge.js */
  var MARKER_KNOWLEDGE = global.CDBLPDKnowledge || {};

  /* â”€â”€ Selection helpers â”€â”€ */
  function buildSelMap() {
    var m = {};
    for (var i = 0; i < selections.length; i++) m[selections[i].marker] = selections[i];
    return m;
  }
  function cloneSelections(arr) {
    return JSON.parse(JSON.stringify(arr));
  }

  /* â”€â”€ Refresh all columns â”€â”€ */
  function refreshAll() {
    if (colRefs.markers) renderCol1(colRefs.markers);
    if (colRefs.results) renderResults(colRefs.results);
    if (colRefs.compare) renderComparison(colRefs.compare);
  }

  /* â”€â”€ Event emitter â”€â”€ */
  function _emit(type, detail) {
    if (global.LumiaEvents && typeof global.LumiaEvents.emit === 'function') {
      global.LumiaEvents.emit(type, detail);
    }
    try { global.dispatchEvent(new CustomEvent(type, { detail: detail })); } catch (_) {}
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  MODAL PICKER (dialog 2 colonne)
   *  Left: lista verticale CD con barra filtro + sub-modal bento per intensitÃ 
   *  Right: lista staging dei CD scelti
   *  Â«ApplicaÂ» â†’ copia staging â†’ selections, chiude
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function openPickerModal() {
    /* Staging: copia indipendente */
    var staging = cloneSelections(selections);

    function stgMap() {
      var m = {};
      for (var i = 0; i < staging.length; i++) m[staging[i].marker] = staging[i];
      return m;
    }

    /* â”€â”€ Build flat marker list with category info â”€â”€ */
    var allMarkers = [];
    var categories = Data.markersByCategory();
    var catLabels = {
      'pan-B': 'Pan-B', 'CLL': 'CLL / SLL', 'MCL': 'Mantle Cell',
      'HCL': 'Hairy Cell', 'sIg': 'Ig di superficie',
      'GC': 'Centro Germinativo', 'misc': 'Proliferazione / Accessori'
    };
    var tbl = Data.table();
    var catKeys = Object.keys(categories);
    for (var c = 0; c < catKeys.length; c++) {
      var markers = categories[catKeys[c]];
      if (!markers) continue;
      for (var m = 0; m < markers.length; m++) {
        var mk = markers[m];
        var full = (tbl[mk] && tbl[mk].fullName) ? tbl[mk].fullName : '';
        allMarkers.push({ key: mk, fullName: full, cat: catKeys[c], catLabel: catLabels[catKeys[c]] || catKeys[c] });
      }
    }

    /* Create dialog */
    var dlg = cel('dialog', 'cd-picker-dialog');
    dlg.innerHTML =
      '<div class="cd-picker-shell">' +
        '<div class="cd-picker-left">' +
          '<div class="cd-picker-search-bar">' +
            '<i class="hgi-stroke hgi-search-01 cd-picker-search-icon"></i>' +
            '<input type="text" class="cd-picker-search" id="cdp-search" placeholder="Filtra marker\u2026" autocomplete="off" />' +
          '</div>' +
          '<div class="cd-picker-cd-list" id="cdp-cd-list"></div>' +
        '</div>' +
        '<div class="cd-picker-right">' +
          '<div class="cd-picker-right-head">' +
            '<span class="cd-picker-right-title">Selezione corrente</span>' +
            '<span class="cd-picker-right-count" id="cdp-count">0</span>' +
          '</div>' +
          '<div class="cd-picker-list" id="cdp-list"></div>' +
          '<div class="cd-picker-foot">' +
            '<button type="button" class="btn btn-sm" id="cdp-cancel">Annulla</button>' +
            '<button type="button" class="btn btn-primary btn-sm" id="cdp-apply">' +
              '<i class="hgi-stroke hgi-checkmark-circle-01"></i> Applica</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(dlg);

    var cdListEl = qs('#cdp-cd-list', dlg);
    var searchEl = qs('#cdp-search', dlg);
    var listEl   = qs('#cdp-list', dlg);
    var countEl  = qs('#cdp-count', dlg);

    /* â”€â”€ Render left: flat vertical CD list (no category separators) â”€â”€ */
    function renderLeft(filter) {
      cdListEl.innerHTML = '';
      var sm = stgMap();
      var q = (filter || '').toLowerCase();

      for (var i = 0; i < allMarkers.length; i++) {
        var info = allMarkers[i];
        /* Filter */
        if (q && info.key.toLowerCase().indexOf(q) === -1 &&
            info.fullName.toLowerCase().indexOf(q) === -1 &&
            info.catLabel.toLowerCase().indexOf(q) === -1) continue;

        var sel = sm[info.key];
        var row = cel('button', 'cd-picker-cd-row' + (sel ? ' selected' : ''));
        row.type = 'button';
        row.dataset.marker = info.key;
        row.innerHTML =
          '<span class="cd-picker-cd-name">' + escapeHtml(info.key) +
            (info.fullName ? ' <small>' + escapeHtml(info.fullName) + '</small>' : '') +
          '</span>' +
          (sel ? '<span class="cd-picker-cd-state">' + chip(sel.state) + '</span>' : '');
        cdListEl.appendChild(row);
      }

      if (!cdListEl.firstChild) {
        cdListEl.innerHTML = '<div class="cd-picker-empty">Nessun marker trovato.</div>';
      }
    }

    /* â”€â”€ Render right: staging list â”€â”€ */
    function renderRight() {
      listEl.innerHTML = '';
      countEl.textContent = staging.length;
      if (staging.length === 0) {
        listEl.innerHTML = '<div class="cd-picker-empty">Nessun marker selezionato.<br>Clicca un marker a sinistra.</div>';
        return;
      }
      for (var i = 0; i < staging.length; i++) {
        var s = staging[i];
        var item = cel('div', 'cd-picker-item');
        item.innerHTML =
          '<div class="cd-picker-item-info">' +
            '<span class="cd-picker-item-name">' + escapeHtml(s.marker) + '</span>' +
            chip(s.state) +
          '</div>' +
          '<button type="button" class="cd-picker-item-del" data-idx="' + i + '" title="Rimuovi">&times;</button>';
        listEl.appendChild(item);
      }
    }

    /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
     *  Sub-modal: Bento-style intensity selector
     *  Shown as a centered overlay inside the dialog
     * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
    function openBentoSelector(markerKey) {
      /* Guard: rimuovi overlay precedente se presente */
      var prev = qs('.cd-bento-overlay', dlg);
      if (prev) prev.remove();

      var info = null;
      for (var i = 0; i < allMarkers.length; i++) {
        if (allMarkers[i].key === markerKey) { info = allMarkers[i]; break; }
      }
      if (!info) return;

      var sm = stgMap();
      var existing = sm[markerKey];
      var activeState = existing ? existing.state : null;

      var overlay = cel('div', 'cd-bento-overlay');
      overlay.innerHTML =
        '<div class="cd-bento-card">' +
          '<div class="cd-bento-header">' +
            '<div class="cd-bento-title">' + escapeHtml(markerKey) +
              (info.fullName ? '<small>' + escapeHtml(info.fullName) + '</small>' : '') +
            '</div>' +
            '<button type="button" class="cd-bento-close" id="cdb-close">&times;</button>' +
          '</div>' +
          '<div class="cd-bento-grid" id="cdb-grid"></div>' +
          (existing ? '<button type="button" class="cd-bento-remove" id="cdb-remove">' +
            '<i class="hgi-stroke hgi-delete-02"></i> Rimuovi marker</button>' : '') +
        '</div>';

      var gridEl = qs('#cdb-grid', overlay);
      var states = Core.states();
      for (var s = 0; s < states.length; s++) {
        var st = states[s];
        if (st.key === 'nt') continue;
        var tile = cel('button', 'cd-bento-tile' + (st.key === activeState ? ' active' : ''));
        tile.type = 'button';
        tile.dataset.stateKey = st.key;
        tile.innerHTML =
          '<span class="cd-bento-tile-icon">' + chip(st.key) + '</span>' +
          '<span class="cd-bento-tile-label">' + escapeHtml(st.label) + '</span>';
        gridEl.appendChild(tile);
      }

      /* Info tile â€” spans 2 rows in 3rd column */
      var infoTile = cel('button', 'cd-bento-tile cd-bento-tile-info');
      infoTile.type = 'button';
      infoTile.id = 'cdb-info';
      infoTile.title = 'Informazioni su ' + markerKey;
      infoTile.innerHTML =
        '<i class="hgi-stroke hgi-information-circle"></i>' +
        '<span class="cd-bento-tile-label">Info</span>';
      gridEl.appendChild(infoTile);

      dlg.appendChild(overlay);

      /* â”€â”€ Fullpage info layer (NordiQC / PubMed style) â”€â”€ */
      function openInfoLayer() {
        var tbl = Data.table();
        var mData = tbl[markerKey];
        if (!mData) return;

        /* Remove previous info layer */
        var prevLayer = qs('.cd-info-layer', dlg);
        if (prevLayer) prevLayer.remove();

        var kb = MARKER_KNOWLEDGE[markerKey];
        var infoLayer = cel('div', 'cd-info-layer');
        var html =
          '<div class="cd-info-layer-header">' +
            '<button type="button" class="cd-info-layer-back" id="cdinfo-back">' +
              '<i class="hgi-stroke hgi-arrow-left-01"></i></button>' +
            '<div class="cd-info-layer-title">' + escapeHtml(markerKey) + '</div>' +
          '</div>' +
          '<div class="cd-info-layer-body">' +
            /* Hero */
            '<div class="cd-info-hero">' +
              '<h2 class="cd-info-hero-name">' + escapeHtml(markerKey) + '</h2>' +
              '<p class="cd-info-hero-full">' + escapeHtml(mData.fullName || '') + '</p>' +
              '<span class="cd-info-hero-cat">' + escapeHtml(info.catLabel) + '</span>' +
            '</div>';

        if (kb) {
          /* Description card */
          if (kb.fn) {
            html += '<div class="cd-info-card">' +
              '<div class="cd-info-card-title"><i class="hgi-stroke hgi-note-01"></i> Descrizione</div>' +
              '<p class="cd-info-card-text">' + escapeHtml(kb.fn) + '</p>' +
            '</div>';
          }

          /* Molecular profile card */
          html += '<div class="cd-info-card">' +
            '<div class="cd-info-card-title"><i class="hgi-stroke hgi-atom-01"></i> Profilo Molecolare</div>' +
            '<div class="cd-info-card-grid">';
          if (kb.gene) html += '<div class="cd-info-field"><span class="cd-info-field-label">Gene</span><span class="cd-info-field-value">' + escapeHtml(kb.gene) + '</span></div>';
          if (kb.mw) html += '<div class="cd-info-field"><span class="cd-info-field-label">Peso molecolare</span><span class="cd-info-field-value">' + escapeHtml(kb.mw) + '</span></div>';
          if (kb.structure) html += '<div class="cd-info-field"><span class="cd-info-field-label">Struttura</span><span class="cd-info-field-value">' + escapeHtml(kb.structure) + '</span></div>';
          if (kb.aliases) html += '<div class="cd-info-field"><span class="cd-info-field-label">Alias</span><span class="cd-info-field-value">' + escapeHtml(kb.aliases) + '</span></div>';
          if (kb.clones) html += '<div class="cd-info-field"><span class="cd-info-field-label">Cloni anticorpali</span><span class="cd-info-field-value">' + escapeHtml(kb.clones) + '</span></div>';
          html += '</div></div>';

          /* Distribution card */
          if (kb.distribution) {
            html += '<div class="cd-info-card">' +
              '<div class="cd-info-card-title"><i class="hgi-stroke hgi-share-location-01"></i> Distribuzione Tessutale</div>' +
              '<p class="cd-info-card-text">' + escapeHtml(kb.distribution) + '</p>' +
            '</div>';
          }

          /* Clinical significance card */
          if (kb.clinical) {
            html += '<div class="cd-info-card">' +
              '<div class="cd-info-card-title"><i class="hgi-stroke hgi-stethoscope-02"></i> Significato Clinico</div>' +
              '<p class="cd-info-card-text">' + escapeHtml(kb.clinical) + '</p>' +
            '</div>';
          }
        }

        /* Expression table card */
        html += '<div class="cd-info-card">' +
          '<div class="cd-info-card-title"><i class="hgi-stroke hgi-analytics-01"></i> Espressione nelle B-LPD</div>' +
          '<div class="cd-info-expr-table">' +
            '<div class="cd-info-expr-header">' +
              '<span>Patologia</span><span>Tipica</span><span>Possibili</span><span>Peso</span>' +
            '</div>';

        var diseases = Data.diseases();
        for (var d = 0; d < diseases.length; d++) {
          var dk = diseases[d];
          var entry = mData.diseases[dk];
          if (!entry) continue;
          var wCls = entry.weight >= 2 ? ' cd-info-w-high' : (entry.weight <= -2 ? ' cd-info-w-neg' : '');
          html +=
            '<div class="cd-info-expr-row">' +
              '<span class="cd-info-expr-disease">' + escapeHtml(dk) + '</span>' +
              '<span class="cd-info-expr-typical">' + chip(entry.typical) + '</span>' +
              '<span class="cd-info-expr-all">' + entry.expr.map(function(e) { return chip(e); }).join(' ') + '</span>' +
              '<span class="cd-info-expr-weight' + wCls + '">' + (entry.weight > 0 ? '+' : '') + entry.weight + '</span>' +
            '</div>';
          if (entry.note) {
            html += '<div class="cd-info-expr-note">' + escapeHtml(entry.note) + '</div>';
          }
        }

        html += '</div></div>';

        /* References card */
        html += '<div class="cd-info-card cd-info-card-refs">' +
          '<div class="cd-info-card-title"><i class="hgi-stroke hgi-book-02"></i> Riferimenti</div>' +
          '<ul class="cd-info-refs-list">' +
            '<li>WHO Classification of Haematolymphoid Tumours, 5th ed. (2022)</li>' +
            '<li>ICC â€” International Consensus Classification (2022)</li>' +
            '<li>Swerdlow SH et al., WHO Classification, revised 4th ed. (2017)</li>' +
            '<li>EuroFlow Consortium â€” consensus panels</li>' +
            '<li>NCCN Guidelines: B-Cell Lymphomas, CLL/SLL</li>' +
            '<li>NordiQC â€” Nordic Immunohistochemical Quality Control</li>' +
          '</ul>' +
        '</div>';

        html += '</div>'; /* close body */
        infoLayer.innerHTML = html;
        dlg.appendChild(infoLayer);

        infoLayer.addEventListener('click', function(ev) {
          ev.stopPropagation();
          if (ev.target.closest('#cdinfo-back')) {
            infoLayer.remove();
          }
        });
      }

      overlay.addEventListener('click', function(ev) {
        ev.stopPropagation();
        /* Info button */
        if (ev.target.closest('#cdb-info')) {
          openInfoLayer();
          return;
        }
        var tile = ev.target.closest('.cd-bento-tile');
        if (tile && tile.dataset.stateKey) {
          var stKey = tile.dataset.stateKey;
          var found = false;
          for (var i = 0; i < staging.length; i++) {
            if (staging[i].marker === markerKey) {
              staging[i].state = stKey;
              found = true;
              break;
            }
          }
          if (!found) staging.push({ marker: markerKey, state: stKey, note: '' });
          overlay.remove();
          renderLeft(searchEl.value);
          renderRight();
          return;
        }
        if (ev.target.closest('#cdb-remove')) {
          for (var j = 0; j < staging.length; j++) {
            if (staging[j].marker === markerKey) { staging.splice(j, 1); break; }
          }
          overlay.remove();
          renderLeft(searchEl.value);
          renderRight();
          return;
        }
        if (ev.target.closest('#cdb-close') || ev.target === overlay) {
          overlay.remove();
        }
      });
    }

    /* â”€â”€ Events â”€â”€ */
    searchEl.addEventListener('input', function() { renderLeft(searchEl.value); });

    dlg.addEventListener('click', function(e) {
      /* CD row in left list â†’ open bento selector */
      var cdRow = e.target.closest('.cd-picker-cd-row');
      if (cdRow && cdRow.dataset.marker) {
        openBentoSelector(cdRow.dataset.marker);
        return;
      }
      /* Delete in right list */
      var del = e.target.closest('.cd-picker-item-del');
      if (del) {
        var idx = parseInt(del.dataset.idx, 10);
        staging.splice(idx, 1);
        renderLeft(searchEl.value);
        renderRight();
        return;
      }
      /* Cancel */
      if (e.target.closest('#cdp-cancel')) { dlg.close(); dlg.remove(); return; }
      /* Apply */
      if (e.target.closest('#cdp-apply')) {
        selections = cloneSelections(staging);
        dlg.close();
        dlg.remove();
        refreshAll();
        return;
      }
    });

    dlg.addEventListener('cancel', function(ev) { ev.preventDefault(); });

    renderLeft('');
    renderRight();
    dlg.showModal();
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Column 1 â€” Marker selezionati (library-item pattern)
   *  Title + summary + lista + bottone Â«Aggiungi markerÂ»
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function renderCol1(col) {
    col.innerHTML = '';

    /* Title (no header bar â€” titolo nella colonna) */
    var title = cel('div', 'cd-col1-title');
    title.innerHTML = '<i class="hgi-stroke hgi-test-tube-01"></i> <span>CD-Based B-LPD Diagnostic</span>';
    col.appendChild(title);

    /* Summary */
    var summary = cel('div', 'cd-summary');
    summary.innerHTML = '<strong>' + selections.length + '</strong> marker selezionati su ' + Data.markers().length;
    col.appendChild(summary);

    /* Action bar */
    var actions = cel('div', 'cd-col1-actions');
    actions.innerHTML =
      '<button type="button" class="btn btn-sm btn-primary" id="cd-add-markers">' +
        '<i class="hgi-stroke hgi-add-circle-half-dot"></i> Aggiungi marker</button>' +
      (selections.length > 0
        ? '<button type="button" class="btn btn-sm" id="cd-clear-all" style="color:var(--danger);">' +
            '<i class="hgi-stroke hgi-delete-02"></i> Reset</button>'
        : '');
    col.appendChild(actions);

    /* Marker list (library-item style) */
    if (selections.length === 0) {
      col.appendChild(cel('p', 'cd-empty-msg', 'Nessun marker inserito.<br>Clicca Â«Aggiungi markerÂ» per iniziare.'));
    } else {
      var list = cel('div', 'cd-marker-list');
      for (var i = 0; i < selections.length; i++) {
        var s = selections[i];
        var item = cel('div', 'cd-marker-item');
        item.innerHTML =
          '<div class="cd-marker-item-icon">' + chip(s.state) + '</div>' +
          '<div class="cd-marker-item-text">' +
            '<span class="cd-marker-item-name">' + escapeHtml(s.marker) + '</span>' +
            '<span class="cd-marker-item-sub">' + (STATE_FULL[s.state] || s.state) +
              (s.note ? ' \u2014 ' + escapeHtml(s.note) : '') + '</span>' +
          '</div>' +
          '<button type="button" class="cd-marker-item-del" data-idx="' + i + '" title="Rimuovi">&times;</button>';
        list.appendChild(item);
      }
      col.appendChild(list);
    }

  }

  /* â”€â”€ Col 1 event handler (registered once in mount) â”€â”€ */
  function handleCol1Click(e) {
    if (e.target.closest('#cd-add-markers')) { openPickerModal(); return; }
    if (e.target.closest('#cd-clear-all')) {
      selections = [];
      lastResult = null;
      selectedDiagnosis = null;
      refreshAll();
      return;
    }
    var del = e.target.closest('.cd-marker-item-del');
    if (del) {
      var idx = parseInt(del.dataset.idx, 10);
      selections.splice(idx, 1);
      refreshAll();
    }
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Column 2 â€” Radar chart diagnostico (Chart.js)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  /* Shorten long disease labels for radar readability */
  function shortLabel(d) {
    var map = {
      'MCL (classical)': 'MCL class.',
      'MCL (leukemic non-nodal)': 'MCL leuk.',
      'MCL (blastoid/pleomorphic)': 'MCL blast.',
      'HCL-variant': 'HCL-v',
      'EMZL/MALT': 'MALT',
      'LPL/WM': 'LPL/WM',
      'DLBCL-GCB': 'DLBCL GCB',
      'DLBCL-ABC': 'DLBCL ABC',
      'DLBCL-DE': 'DLBCL DE'
    };
    return map[d] || d;
  }

  function renderResults(col) {
    col.innerHTML = '';

    /* Destroy previous chart instance */
    if (radarChart) { radarChart.destroy(); radarChart = null; }

    if (selections.length < 2) {
      col.appendChild(cel('p', 'cd-empty-msg', 'Seleziona almeno 2 marker per calcolare la probabilit\u00e0.'));
      return;
    }

    var result = Core.compute(selections);
    lastResult = result;
    _emit('lumia:diagnostic:computed', { type: 'bLPD', result: result });

    if (!result || result.entries.length === 0) {
      col.appendChild(cel('p', 'cd-empty-msg', 'Nessuna diagnosi con score &gt; 0 in base ai marker inseriti.'));
      return;
    }

    var entries = result.entries;
    var labels = [];
    var pctData = [];
    var matchData = [];
    var conflictData = [];
    for (var i = 0; i < entries.length; i++) {
      labels.push(shortLabel(entries[i].diagnosis));
      pctData.push(entries[i].pct);
      matchData.push(entries[i].matches.length);
      conflictData.push(entries[i].conflicts.length);
    }

    /* Normalize match/conflict counts to 0â€“100 for overlay */
    var maxM = Math.max.apply(null, matchData) || 1;
    var maxC = Math.max.apply(null, conflictData) || 1;
    var matchNorm = matchData.map(function(v) { return Math.round((v / maxM) * 100); });
    var conflictNorm = conflictData.map(function(v) { return Math.round((v / maxC) * 100); });

    /* â”€â”€ Actions bar â”€â”€ */
    var actions = cel('div', 'cd-result-actions');
    actions.innerHTML =
      '<button type="button" class="btn btn-sm" id="cd-exportClip">' +
        '<i class="hgi-stroke hgi-copy-01"></i> Copia</button>' +
      '<button type="button" class="btn btn-sm" id="cd-print">' +
        '<i class="hgi-stroke hgi-printer"></i> Stampa</button>';
    col.appendChild(actions);

    /* â”€â”€ Layer toggles â”€â”€ */
    var toggles = cel('div', 'cd-radar-toggles');
    toggles.innerHTML =
      '<label class="cd-radar-toggle">' +
        '<span class="cd-radar-dot cd-radar-dot-pct"></span>' +
        '<span>Probabilit\u00e0</span>' +
      '</label>' +
      '<label class="cd-radar-toggle">' +
        '<input type="checkbox" id="cd-toggle-matches"' + (radarLayers.matches ? ' checked' : '') + '>' +
        '<span class="cd-radar-dot cd-radar-dot-match"></span>' +
        '<span>Match</span>' +
      '</label>' +
      '<label class="cd-radar-toggle">' +
        '<input type="checkbox" id="cd-toggle-conflicts"' + (radarLayers.conflicts ? ' checked' : '') + '>' +
        '<span class="cd-radar-dot cd-radar-dot-conflict"></span>' +
        '<span>Conflitti</span>' +
      '</label>';
    col.appendChild(toggles);

    /* â”€â”€ Canvas wrapper (centered, square aspect) â”€â”€ */
    var wrap = cel('div', 'cd-radar-wrap');
    var canvas = document.createElement('canvas');
    canvas.id = 'cd-radar-canvas';
    wrap.appendChild(canvas);
    col.appendChild(wrap);

    /* â”€â”€ Selected diagnosis detail card (below radar) â”€â”€ */
    var detailCard = cel('div', 'cd-radar-detail');
    detailCard.id = 'cd-radar-detail';
    if (selectedDiagnosis) {
      detailCard.innerHTML = buildRadarDetail(entries);
    } else {
      detailCard.innerHTML = '<p class="cd-radar-detail-hint">Clicca un punto del radar per visualizzare i dettagli</p>';
    }
    col.appendChild(detailCard);

    /* â”€â”€ Build Chart.js radar â”€â”€ */
    var datasets = [
      {
        label: 'Probabilit\u00e0 %',
        data: pctData,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: buildPointColors(entries),
        pointBorderColor: buildPointColors(entries),
        pointRadius: buildPointSizes(entries),
        pointHoverRadius: 8,
        pointHitRadius: 16,
        fill: true
      }
    ];

    if (radarLayers.matches) {
      datasets.push({
        label: 'Match (normalizzati)',
        data: matchNorm,
        backgroundColor: 'rgba(22, 163, 74, 0.08)',
        borderColor: 'rgba(22, 163, 74, 0.5)',
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 0,
        pointHitRadius: 0,
        fill: true
      });
    }

    if (radarLayers.conflicts && conflictData.some(function(v) { return v > 0; })) {
      datasets.push({
        label: 'Conflitti (normalizzati)',
        data: conflictNorm,
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        borderWidth: 1.5,
        borderDash: [2, 2],
        pointRadius: 0,
        pointHitRadius: 0,
        fill: true
      });
    }

    var Chart = global.Chart;
    if (!Chart) {
      col.appendChild(cel('p', 'cd-empty-msg', 'Chart.js non disponibile.'));
      return;
    }

    radarChart = new Chart(canvas, {
      type: 'radar',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 400, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              title: function(items) {
                if (!items.length) return '';
                var idx = items[0].dataIndex;
                return entries[idx].diagnosis;
              },
              label: function(item) {
                if (item.datasetIndex === 0) {
                  var e = entries[item.dataIndex];
                  return [
                    'Score: ' + e.pct + '%',
                    'Match: ' + e.matches.length,
                    'Conflitti: ' + e.conflicts.length
                  ];
                }
                return item.dataset.label + ': ' + item.raw;
              }
            },
            backgroundColor: 'rgba(0,0,0,0.82)',
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 12 },
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 25,
              font: { size: 10 },
              color: 'rgba(0,0,0,0.25)',
              backdropColor: 'transparent'
            },
            grid: {
              color: 'rgba(0,0,0,0.06)',
              circular: true
            },
            angleLines: { color: 'rgba(0,0,0,0.06)' },
            pointLabels: {
              font: { size: 11, weight: '500' },
              color: function(ctx) {
                var diag = entries[ctx.index] ? entries[ctx.index].diagnosis : '';
                return diag === selectedDiagnosis ? 'rgba(59,130,246,1)' : 'rgba(0,0,0,0.55)';
              }
            }
          }
        },
        onClick: function(_evt, elems) {
          if (!elems || !elems.length) return;
          var idx = elems[0].index;
          if (idx != null && entries[idx]) {
            selectedDiagnosis = entries[idx].diagnosis;
            updateRadarDetail(entries);
            renderComparison(colRefs.compare);
            /* Highlight selected label */
            radarChart.options.scales.r.pointLabels.color = function(ctx) {
              var diag = entries[ctx.index] ? entries[ctx.index].diagnosis : '';
              return diag === selectedDiagnosis ? 'rgba(59,130,246,1)' : 'rgba(0,0,0,0.55)';
            };
            radarChart.update();
          }
        }
      }
    });

    /* â”€â”€ Layer toggle listeners â”€â”€ */
    var tmCb = qs('#cd-toggle-matches', col);
    var tcCb = qs('#cd-toggle-conflicts', col);
    if (tmCb) tmCb.addEventListener('change', function() {
      radarLayers.matches = this.checked;
      renderResults(col);
    });
    if (tcCb) tcCb.addEventListener('change', function() {
      radarLayers.conflicts = this.checked;
      renderResults(col);
    });
  }

  /* â”€â”€ Radar helpers â”€â”€ */
  function buildPointColors(entries) {
    return entries.map(function(e) {
      if (e.diagnosis === selectedDiagnosis) return 'rgba(59, 130, 246, 1)';
      if (e.pct >= 80) return 'rgba(22, 163, 74, 0.9)';
      if (e.pct >= 50) return 'rgba(234, 179, 8, 0.9)';
      return 'rgba(156, 163, 175, 0.7)';
    });
  }
  function buildPointSizes(entries) {
    return entries.map(function(e) {
      if (e.diagnosis === selectedDiagnosis) return 7;
      if (e.pct >= 80) return 5;
      return 4;
    });
  }

  function buildRadarDetail(entries) {
    var e = null;
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].diagnosis === selectedDiagnosis) { e = entries[i]; break; }
    }
    if (!e) return '<p class="cd-radar-detail-hint">Clicca un punto del radar per visualizzare i dettagli</p>';
    var html =
      '<div class="cd-radar-detail-head">' +
        '<span class="cd-radar-detail-name">' + escapeHtml(e.diagnosis) + '</span>' +
        '<span class="cd-radar-detail-pct">' + e.pct + '%</span>' +
      '</div>';
    if (e.matches.length) {
      html += '<div class="cd-radar-detail-section">' +
        '<span class="cd-tag cd-tag-match">\u2714 ' + e.matches.length + ' match</span> ' +
        '<span class="cd-radar-detail-items">' + escapeHtml(e.matches.join(', ')) + '</span></div>';
    }
    if (e.conflicts.length) {
      html += '<div class="cd-radar-detail-section">' +
        '<span class="cd-tag cd-tag-conflict">\u26A0 ' + e.conflicts.length + ' conflitti</span> ' +
        '<span class="cd-radar-detail-items">' + escapeHtml(e.conflicts.join(', ')) + '</span></div>';
    }
    return html;
  }

  function updateRadarDetail(entries) {
    var card = qs('#cd-radar-detail', colRefs.results);
    if (card) card.innerHTML = buildRadarDetail(entries);
  }

  /* â”€â”€ Print report builder â”€â”€ */
  function buildPrintReport() {
    var wrap = cel('div', 'cd-print-report');
    var now = new Date();
    var dateStr = now.toLocaleDateString('it-IT') + ' ' + now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    /* Header */
    wrap.innerHTML = '<div class="cd-print-header">' +
      '<h2>CD-Based B-LPD Diagnostic Report</h2>' +
      '<span class="cd-print-date">' + escapeHtml(dateStr) + '</span></div>';

    /* Section 1: Marker inseriti */
    var mkHtml = '<div class="cd-print-section"><h3>Marker inseriti (' + selections.length + ')</h3>' +
      '<table class="cd-print-table"><thead><tr><th>Marker</th><th>Stato</th><th>Note</th></tr></thead><tbody>';
    for (var i = 0; i < selections.length; i++) {
      var s = selections[i];
      mkHtml += '<tr><td>' + escapeHtml(s.marker) + '</td>' +
        '<td>' + escapeHtml(STATE_FULL[s.state] || s.state) + '</td>' +
        '<td>' + escapeHtml(s.note || '\u2014') + '</td></tr>';
    }
    mkHtml += '</tbody></table></div>';
    wrap.innerHTML += mkHtml;

    /* Section 2: Risultati diagnostici */
    if (lastResult && lastResult.entries.length) {
      var entries = lastResult.entries;
      var resHtml = '<div class="cd-print-section"><h3>Risultati diagnostici</h3>' +
        '<table class="cd-print-table"><thead><tr><th>Diagnosi</th><th>Score</th>' +
        '<th>Match</th><th>Conflitti</th></tr></thead><tbody>';
      for (var j = 0; j < entries.length; j++) {
        var e = entries[j];
        resHtml += '<tr' + (e.diagnosis === selectedDiagnosis ? ' class="cd-print-highlight"' : '') + '>' +
          '<td>' + escapeHtml(e.diagnosis) + '</td>' +
          '<td>' + e.pct + '%</td>' +
          '<td>' + escapeHtml(e.matches.join(', ') || '\u2014') + '</td>' +
          '<td>' + escapeHtml(e.conflicts.join(', ') || '\u2014') + '</td></tr>';
      }
      resHtml += '</tbody></table></div>';
      wrap.innerHTML += resHtml;
    }

    /* Section 3: Confronto (if a diagnosis is selected) */
    if (selectedDiagnosis) {
      var profile = Data.profileOf(selectedDiagnosis);
      var sm = buildSelMap();
      var relevant = {};
      var pKeys = Object.keys(profile);
      for (var p = 0; p < pKeys.length; p++) {
        if (profile[pKeys[p]].weight !== 0) relevant[pKeys[p]] = true;
      }
      for (var si = 0; si < selections.length; si++) relevant[selections[si].marker] = true;

      var markerList = Object.keys(relevant);
      markerList.sort(function(a, b) {
        var wa = profile[a] ? Math.abs(profile[a].weight) : 0;
        var wb = profile[b] ? Math.abs(profile[b].weight) : 0;
        if (wb !== wa) return wb - wa;
        return a.localeCompare(b);
      });

      var cmpHtml = '<div class="cd-print-section"><h3>Confronto: ' + escapeHtml(selectedDiagnosis) + '</h3>' +
        '<table class="cd-print-table"><thead><tr><th>Marker</th><th>Atteso</th>' +
        '<th>Inserito</th><th>Esito</th></tr></thead><tbody>';
      for (var ci = 0; ci < markerList.length; ci++) {
        var mk = markerList[ci];
        var prof = profile[mk];
        var usr = sm[mk];
        var expected = prof ? prof.typical : null;
        var inserted = usr ? usr.state : null;
        var esito;
        if (!inserted) esito = 'non testato';
        else if (!prof || prof.weight === 0) esito = 'extra';
        else if (inserted === expected) esito = '\u2713 match';
        else if (
          (inserted === 'dim' && expected === 'pos') ||
          (inserted === 'br'  && expected === 'pos') ||
          (inserted === 'pos' && expected === 'br')  ||
          (inserted === 'pos' && expected === 'dim')
        ) esito = '\u2248 parziale';
        else esito = '\u2717 conflitto';
        cmpHtml += '<tr><td>' + escapeHtml(mk) + '</td>' +
          '<td>' + escapeHtml(expected || '\u2014') + '</td>' +
          '<td>' + escapeHtml(inserted || '\u2014') + '</td>' +
          '<td>' + escapeHtml(esito) + '</td></tr>';
      }
      cmpHtml += '</tbody></table></div>';
      wrap.innerHTML += cmpHtml;
    }

    return wrap;
  }


  /* â”€â”€ Col 2 event handler â”€â”€ */
  function handleResultsClick(e) {
    if (e.target.closest('#cd-exportClip')) {
      if (global.LumiaExport && lastResult) {
        var payload = global.LumiaExport.fromDiagnostic(lastResult, selections);
        global.LumiaExport.clipboard(payload);
      } else if (global.LumiaToast) {
        global.LumiaToast.warning('Nessun risultato da esportare.');
      }
      return;
    }
    if (e.target.closest('#cd-print')) {
      var report = buildPrintReport();
      document.body.appendChild(report);
      global.print();
      document.body.removeChild(report);
    }
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Column 3 â€” Confronto profilo immunofenotipico
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function renderComparison(col) {
    col.innerHTML = '';

    if (!selectedDiagnosis) {
      col.appendChild(cel('p', 'cd-empty-msg',
        'Seleziona una diagnosi nella colonna centrale per confrontare il profilo immunofenotipico.'));
      return;
    }

    /* Header */
    var header = cel('div', 'cd-compare-header');
    header.innerHTML = '<h3>' + escapeHtml(selectedDiagnosis) + '</h3>';
    col.appendChild(header);

    /* Data */
    var profile = Data.profileOf(selectedDiagnosis);
    var sm = buildSelMap();
    var relevant = {};
    var pKeys = Object.keys(profile);
    for (var p = 0; p < pKeys.length; p++) {
      if (profile[pKeys[p]].weight !== 0) relevant[pKeys[p]] = true;
    }
    for (var s = 0; s < selections.length; s++) relevant[selections[s].marker] = true;

    var markerList = Object.keys(relevant);
    markerList.sort(function(a, b) {
      var wa = profile[a] ? Math.abs(profile[a].weight) : 0;
      var wb = profile[b] ? Math.abs(profile[b].weight) : 0;
      if (wb !== wa) return wb - wa;
      return a.localeCompare(b);
    });

    var matchCount = 0, conflictCount = 0, untestedCount = 0;

    var table = cel('table', 'cd-compare-table');
    table.innerHTML = '<thead><tr><th>Marker</th><th>Atteso</th><th>Inserito</th><th></th></tr></thead>';
    var tbody = cel('tbody');

    for (var i = 0; i < markerList.length; i++) {
      var mk = markerList[i];
      var prof = profile[mk];
      var usr = sm[mk];
      var expected = prof ? prof.typical : null;
      var inserted = usr ? usr.state : null;

      var status, statusIcon;
      if (!inserted) {
        status = 'untested';
        statusIcon = '<span class="cd-compare-icon cd-compare-untested">\u2014</span>';
        if (prof && prof.weight !== 0) untestedCount++;
      } else if (!prof || prof.weight === 0) {
        status = 'extra';
        statusIcon = '<span class="cd-compare-icon cd-compare-extra">+</span>';
      } else if (inserted === expected) {
        status = 'match';
        statusIcon = '<span class="cd-compare-icon cd-compare-match">\u2713</span>';
        matchCount++;
      } else if (
        (inserted === 'dim' && expected === 'pos') ||
        (inserted === 'br'  && expected === 'pos') ||
        (inserted === 'pos' && expected === 'br')  ||
        (inserted === 'pos' && expected === 'dim')
      ) {
        status = 'partial';
        statusIcon = '<span class="cd-compare-icon cd-compare-partial">\u2248</span>';
        matchCount++;
      } else {
        status = 'conflict';
        statusIcon = '<span class="cd-compare-icon cd-compare-conflict">\u2717</span>';
        conflictCount++;
      }

      var tr = cel('tr', 'cd-compare-row cd-compare-' + status);
      tr.innerHTML =
        '<td class="cd-compare-marker">' + escapeHtml(mk) + '</td>' +
        '<td>' + (expected ? chip(expected) : '<span class="muted">\u2014</span>') + '</td>' +
        '<td>' + (inserted ? chip(inserted) : '<span class="muted">\u2014</span>') + '</td>' +
        '<td>' + statusIcon + '</td>';
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    col.appendChild(table);

    var summaryBar = cel('div', 'cd-compare-summary');
    summaryBar.innerHTML =
      '<span class="cd-compare-stat cd-compare-stat-match">\u2713 ' + matchCount + ' concordanze</span>' +
      '<span class="cd-compare-stat cd-compare-stat-conflict">\u2717 ' + conflictCount + ' discordanze</span>' +
      '<span class="cd-compare-stat cd-compare-stat-untested">\u2014 ' + untestedCount + ' non testati</span>';
    col.appendChild(summaryBar);
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  mount(el) â€” shell 3 colonne senza header
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function mount(el) {
    if (!el) return;
    mountEl = el;
    el.innerHTML = '';

    var shell = cel('div', 'cd-shell');
    var col1 = cel('div', 'cd-col cd-col-markers');
    var col2 = cel('div', 'cd-col cd-col-results');
    var col3 = cel('div', 'cd-col cd-col-compare');

    shell.appendChild(col1);
    shell.appendChild(col2);
    shell.appendChild(col3);
    el.appendChild(shell);

    colRefs.markers = col1;
    colRefs.results = col2;
    colRefs.compare = col3;

    renderCol1(col1);
    renderResults(col2);
    renderComparison(col3);

    col1.addEventListener('click', handleCol1Click);
    col2.addEventListener('click', handleResultsClick);
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Public API
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  global.CDDiagnosticHelper = {
    mount: mount,
    open: function() {
      var bMount = qs('#bMount');
      if (bMount) {
        mount(bMount);
        var bTitle = qs('#bTitle');
        if (bTitle) bTitle.innerHTML = '<i class="hgi-stroke hgi-test-tube-01"></i> <span>CD-Based B-LPD Diagnostic</span>';
        var modB = document.getElementById('modB');
        if (modB) modB.classList.add('fullpage');
        if (typeof global.showLayer === 'function') global.showLayer('B');
      }
    },
    close: function() {
      if (typeof global.hideLayer === 'function') global.hideLayer('B');
    },
    getSelection: function() { return cloneSelections(selections); },
    setSelection: function(arr) {
      if (Array.isArray(arr)) {
        var validMarkers = {};
        Core.markers().forEach(function(m) { validMarkers[m] = true; });
        var validStates = {};
        Core.states().forEach(function(s) { validStates[s.key] = true; });
        selections = arr.filter(function(x) { return x && validMarkers[x.marker] && validStates[x.state]; });
        if (mountEl) mount(mountEl);
      }
    },
    reset: function() {
      selections = [];
      lastResult = null;
      selectedDiagnosis = null;
      if (mountEl) mount(mountEl);
    }
  };

  /* â”€â”€ Register â”€â”€ */
  document.addEventListener('DOMContentLoaded', function () {
    var reg = global.LumiaHelpersRegistry;
    if (reg && typeof reg.register === 'function') {
      reg.register({
        id: 'cd-b-lpd',
        title: 'CD-Based B-LPD Diagnostic Helper',
        version: 'v5',
        tags: ['diagnostica', 'immunofenotipo'],
        mount: mount
      });
    }
  });

})(window);
