/* =======================================================================
 *  LumiaLibrary â€” Library overlay (sidebar categories + list panel)
 *
 *  Layout:
 *    Sinistra  â†’ bottoni macro-categorie (helper, percorsi, â€¦)
 *    Destra    â†’ barra search + elenco helper della categoria attiva
 *
 *  Espone: window.LumiaLibrary
 *  Dipendenze: lumia-registry.js, lumia-helpers.css, HugeIcons CDN
 * ======================================================================= */
(function (global) {
  'use strict';

  /* â”€â”€â”€ Icon map (helper-id â†’ HugeIcons class) â”€â”€â”€ */
  var ICON_MAP = {
    'fil-fitness-helper': 'hgi-dumbbell-01',
    'cd-b-lpd':           'hgi-test-tube-01',
    'mm-helper':          'hgi-blood',
    'mds-helper':         'hgi-file-01',
    'cmml-helper':        'hgi-dna',
    'aml-helper':         'hgi-blood',
    'cll':                'hgi-pill',
    'dlbcl':              'hgi-shield-01',
    'fl':                 'hgi-leaf-01',
    'mcl':                'hgi-cell-01'
  };

  /* â”€â”€â”€ Helper definitions â”€â”€â”€ */
  var HELPERS = [
    { id: 'cd-b-lpd',           title: 'CD\u2011Based B\u2011LPD Diagnostic', desc: 'Helper diagnostico immunofenotipico',            group: 'helper',   badge: 'diagnostica' },
    { id: 'fil-fitness-helper', title: 'FIL \u00b7 Fitness',                  desc: 'Fit \u00b7 Unfit \u00b7 Frail (mini-calcolatore)',group: 'helper' },
    { id: 'cll',                title: 'CLL \u00b7 Assistente terapeutico',    desc: 'Rischio \u00b7 genetica \u00b7 raccomandazioni',  group: 'percorso' },
    { id: 'dlbcl',              title: 'DLBCL \u00b7 Assistente terapeutico',  desc: 'Rischio \u00b7 contesto \u00b7 1L/RR',            group: 'percorso' },
    { id: 'fl',                 title: 'FL \u00b7 Assistente terapeutico',     desc: 'GELF \u00b7 score \u00b7 linee',                  group: 'percorso' },
    { id: 'mcl',                title: 'MCL \u00b7 Assistente terapeutico',    desc: 'Score \u00b7 regimi',                             group: 'percorso' },
    { id: 'mm-helper',          title: 'Multiple Myeloma',                     desc: 'Rischio \u00b7 1L/RR \u00b7 tossicit\u00e0',      group: 'percorso' },
    { id: 'mds-helper',         title: 'Myelodysplastic Syndromes',            desc: 'Rischio IPSS-R/M \u00b7 strategie',               group: 'percorso' },
    { id: 'cmml-helper',        title: 'Chronic Myelomonocytic Leukemia',      desc: 'Classificazione \u00b7 scelte terapeutiche',       group: 'percorso' },
    { id: 'aml-helper',         title: 'Acute Myeloid Leukemia',               desc: 'ELN risk \u00b7 induzione \u00b7 HMA+VEN',        group: 'percorso' }
  ];

  var GROUPS = [
    { key: 'helper',   title: 'Helper & Strumenti',    icon: 'hgi-stethoscope',  desc: 'Strumenti diagnostici e calcolatori' },
    { key: 'percorso', title: 'Percorsi Terapeutici',   icon: 'hgi-clipboard',    desc: 'Assistenti per patologia' }
  ];

  /* â”€â”€â”€ State â”€â”€â”€ */
  var activeGroup = GROUPS[0].key;   // default to first category

  /* â”€â”€â”€ Utilities â”€â”€â”€ */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m; }); }
  function iconFor(h) { return ICON_MAP[h.id] || (h.group === 'helper' ? 'hgi-stethoscope' : 'hgi-clipboard'); }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  renderShell(shellEl, filter)
   *  Layout:
   *    Left sidebar  â†’ macro-category buttons
   *    Right panel   â†’ search bar + helper items for active category
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function renderShell(shellEl, filter) {
    if (!shellEl) return;

    /* â”€â”€ Left: Category sidebar â”€â”€ */
    var sidebar = '<aside class="lib-sidebar">';
    sidebar += '<div class="lib-sidebar-title">Categorie</div>';
    GROUPS.forEach(function (g) {
      var cls = 'lib-cat-btn' + (g.key === activeGroup ? ' is-active' : '');
      var count = HELPERS.filter(function (h) { return h.group === g.key; }).length;
      sidebar += '<button type="button" class="' + cls + '" data-lib-cat="' + g.key + '">' +
        '<span class="lib-cat-icon"><i class="hgi-stroke ' + g.icon + '"></i></span>' +
        '<span class="lib-cat-text">' +
          '<span class="lib-cat-name">' + esc(g.title) + '</span>' +
          '<span class="lib-cat-desc">' + esc(g.desc) + '</span>' +
        '</span>' +
        '<span class="lib-cat-count">' + count + '</span>' +
      '</button>';
    });
    sidebar += '</aside>';

    /* â”€â”€ Right: Search + list â”€â”€ */
    var q = (filter || '').toLowerCase();
    var items = HELPERS.filter(function (h) {
      return h.group === activeGroup &&
             (h.title + ' ' + h.desc).toLowerCase().indexOf(q) !== -1;
    });

    var panel = '<div class="lib-panel">';
    /* search bar */
    panel += '<div class="lib-panel-search">' +
      '<i class="hgi-stroke hgi-search-01"></i>' +
      '<input id="gl-search" type="search" placeholder="Cerca helper\u2026" autocomplete="off"' +
        (filter ? ' value="' + esc(filter) + '"' : '') + '>' +
    '</div>';
    /* group heading */
    var grp = GROUPS.find(function (g) { return g.key === activeGroup; });
    panel += '<div class="lib-panel-heading"><i class="hgi-stroke ' + (grp ? grp.icon : 'hgi-list-view') + '"></i> ' + esc(grp ? grp.title : '') + '</div>';
    /* items list */
    panel += '<div class="lib-panel-list">';
    if (items.length) {
      items.forEach(function (h, i) {
        panel += '<button type="button" class="library-item" data-helper-id="' + h.id + '">' +
          '<span class="library-item-num">' + String(i + 1).padStart(2, '0') + '</span>' +
          '<span class="library-item-icon"><i class="hgi-stroke ' + iconFor(h) + '"></i></span>' +
          '<span class="library-item-text">' +
            '<span class="library-item-name">' + esc(h.title) + '</span>' +
            '<span class="library-item-sub">' + esc(h.desc) + '</span>' +
          '</span>' +
          (h.badge ? '<span class="library-item-badge">' + esc(h.badge) + '</span>' : '') +
          '<span class="library-item-arrow"><i class="hgi-stroke hgi-arrow-right-01"></i></span>' +
        '</button>';
      });
    } else {
      panel += '<div class="lib-empty">Nessun helper trovato.</div>';
    }
    panel += '</div></div>';

    shellEl.innerHTML = sidebar + panel;

    /* Re-bind search input after render */
    var searchInput = shellEl.querySelector('#gl-search');
    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        renderShell(shellEl, e.target.value);
        /* Re-focus and restore cursor */
        var inp = shellEl.querySelector('#gl-search');
        if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
      });
    }
  }

  /* â”€â”€â”€ Switch category â”€â”€â”€ */
  function selectCategory(key) {
    var found = GROUPS.find(function (g) { return g.key === key; });
    if (!found) return;
    activeGroup = key;
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  launchById(id)
   *  Always routes through openRegistryHelper for multi-layer support
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function launchById(id) {
    var h = HELPERS.find(function (x) { return x.id === id; });
    if (!h) return;

    if (typeof global.openRegistryHelper === 'function') {
      global.openRegistryHelper(id);
    } else if (global.LumiaEvents) {
      global.LumiaEvents.emit('openRegistryHelper', { id: id });
    }

    if (global.LumiaToast) global.LumiaToast.info(h.title);
  }

  /* â”€â”€â”€ Click delegation â”€â”€â”€ */
  document.addEventListener('click', function (e) {
    /* Category button */
    var catBtn = e.target.closest('[data-lib-cat]');
    if (catBtn) {
      selectCategory(catBtn.dataset.libCat);
      var shell = catBtn.closest('.lib-chooser') || catBtn.closest('.library-shell');
      if (shell) {
        var searchVal = '';
        var inp = shell.querySelector('#gl-search');
        if (inp) searchVal = inp.value;
        renderShell(shell, searchVal);
      }
      return;
    }
    /* Helper item */
    var card = e.target.closest('[data-helper-id]');
    if (card) launchById(card.getAttribute('data-helper-id'));
  });

  /* â”€â”€â”€ Public API â”€â”€â”€ */
  global.LumiaLibrary = Object.freeze({
    HELPERS:        HELPERS,
    GROUPS:         GROUPS,
    ICON_MAP:       ICON_MAP,
    renderShell:    renderShell,
    launchById:     launchById,
    selectCategory: selectCategory
  });

})(window);
