/*! fil-fitness-ui.js â€” FIL Fitness IDE-style panel UI
 *
 *  Reference: Merli F. et al., JCO 2021;39(11):1214-1222
 *
 *  Espone: window.FILFitnessUI
 *  Dipendenze: fil-fitness-data.js, fil-fitness-core.js,
 *              lumia-events.js (opt)
 *  Pattern: IIFE su window
 *
 *  Layout (IDE-style):
 *    sidebar score-list | editor area (form / results)
 *    Complex sub-scores (ADL, IADL, CIRS-G) open in modal.
 */
(function (global) {
  'use strict';

  var Data = global.FILFitnessData;
  var Core = global.FILFitnessCore;
  if (!Data) { console.error('[FILFitnessUI] FILFitnessData not loaded'); return; }
  if (!Core) { console.error('[FILFitnessUI] FILFitnessCore not loaded'); return; }

  /* â”€â”€ DOM helpers â”€â”€ */
  function cel(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function _emit(type, detail) {
    if (global.LumiaEvents && typeof global.LumiaEvents.emit === 'function') {
      global.LumiaEvents.emit(type, detail);
    }
    try { global.dispatchEvent(new CustomEvent(type, { detail: detail })); } catch (_) {}
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Score definitions â€” sidebar items
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  var SCORES = [
    { id: 'anagrafica', label: 'Anagrafica',    icon: 'hgi-user',              complex: false },
    { id: 'adl',        label: 'ADL (Katz)',     icon: 'hgi-checkmark-badge-01', complex: true  },
    { id: 'iadl',       label: 'IADL (Lawton)',  icon: 'hgi-checkmark-badge-02', complex: true  },
    { id: 'cirs',       label: 'CIRS-G',        icon: 'hgi-body-part-muscle',   complex: true  },
    { id: 'epi',        label: 'EPI',           icon: 'hgi-chart-line-data-01', complex: false },
    { id: 'results',    label: 'Risultati',      icon: 'hgi-analytics-01',       complex: false }
  ];

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  State
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  var state = {};
  var activeId = null;
  var rootEl = null;
  var editorEl = null;
  var statusEl = null;
  var sidebarItems = {};
  var modalEl = null;

  function resetState() {
    state = {
      age: null, gender: null, ecog: null,
      adl: {}, adlScore: null,
      iadl: {}, iadlScore: null,
      cirsGrades: null,
      ipi: null, hb: null,
      _result: null
    };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Sidebar badge helpers
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function getSidebarStatus(id) {
    switch (id) {
      case 'anagrafica':
        if (state.age && state.gender) return { done: true, text: state.age + 'a ' + state.gender };
        return { done: false, text: '' };
      case 'adl':
        if (state.adlScore != null) {
          var ds = Data.adlDomainScore(state.adlScore);
          return { done: true, text: state.adlScore + '/6', cls: ds === 0 ? 'fit' : ds === 1 ? 'unfit' : 'frail' };
        }
        return { done: false, text: '' };
      case 'iadl':
        if (state.iadlScore != null) {
          var max = (state.gender === 'M') ? 5 : 8;
          var ds2 = Data.iadlDomainScore(state.iadlScore, state.gender || 'F');
          return { done: true, text: state.iadlScore + '/' + max, cls: ds2 === 0 ? 'fit' : ds2 === 1 ? 'unfit' : 'frail' };
        }
        return { done: false, text: '' };
      case 'cirs':
        if (state.cirsGrades) {
          var m = Data.cirsMetrics(state.cirsGrades);
          var ds3 = Data.cirsDomainScore(m.nSevere);
          return { done: true, text: m.nSevere + ' sev', cls: ds3 === 0 ? 'fit' : ds3 === 1 ? 'unfit' : 'frail' };
        }
        return { done: false, text: '' };
      case 'epi':
        if (state.ipi != null && state.hb) return { done: true, text: 'IPI ' + state.ipi };
        return { done: false, text: '' };
      case 'results':
        if (state._result) return { done: true, text: state._result.sga.sgaClass.label };
        return { done: false, text: '' };
      default:
        return { done: false, text: '' };
    }
  }

  function refreshSidebar() {
    SCORES.forEach(function (s) {
      var el = sidebarItems[s.id];
      if (!el) return;
      var st = getSidebarStatus(s.id);
      var badge = el.querySelector('.fil-ide-badge');
      if (badge) {
        if (st.done) {
          badge.textContent = st.text;
          badge.className = 'fil-ide-badge' + (st.cls ? ' fil-ide-badge--' + st.cls : ' fil-ide-badge--done');
          badge.style.display = '';
        } else {
          badge.style.display = 'none';
        }
      }
    });
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Modal system (for complex sub-scores)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function openModal(title, renderFn, onConfirm) {
    if (modalEl) modalEl.remove();

    modalEl = cel('div', 'fil-ide-modal-overlay');
    var dialog = cel('div', 'fil-ide-modal');

    var header = cel('div', 'fil-ide-modal-header');
    header.innerHTML = '<span class="fil-ide-modal-title">' + esc(title) + '</span>';
    var closeBtn = cel('button', 'fil-ide-modal-close', '&times;');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', function () { closeModal(); });
    header.appendChild(closeBtn);
    dialog.appendChild(header);

    var body = cel('div', 'fil-ide-modal-body');
    renderFn(body);
    dialog.appendChild(body);

    var footer = cel('div', 'fil-ide-modal-footer');
    var cancelBtn = cel('button', 'btn fil-ide-modal-btn', 'Annulla');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', function () { closeModal(); });
    var confirmBtn = cel('button', 'btn btn-primary fil-ide-modal-btn', 'Conferma');
    confirmBtn.type = 'button';
    confirmBtn.addEventListener('click', function () {
      if (onConfirm) onConfirm();
      closeModal();
      refreshSidebar();
      navigate(activeId);
    });
    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);
    dialog.appendChild(footer);

    modalEl.appendChild(dialog);
    rootEl.appendChild(modalEl);
    requestAnimationFrame(function () { modalEl.classList.add('is-open'); });
  }

  function closeModal() {
    if (modalEl) {
      modalEl.classList.remove('is-open');
      setTimeout(function () { if (modalEl) { modalEl.remove(); modalEl = null; } }, 200);
    }
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Modal renderers for complex sub-scores
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  /* ADL modal */
  function renderADLModal(body) {
    if (!state.adl) state.adl = {};
    var wrap = cel('div', 'fil-step-form');
    wrap.innerHTML = '<p class="fil-step-desc">Indice di Katz: selezionare le attivit\u00e0 svolte <strong>in modo indipendente</strong>.</p>';

    var list = cel('div', 'fil-check-list');
    Data.ADL_ITEMS.forEach(function (it) {
      var checked = state.adl[it.id] === true;
      var item = cel('label', 'fil-check-item');
      item.innerHTML =
        '<input type="checkbox" data-key="' + it.id + '"' + (checked ? ' checked' : '') + '>' +
        '<div class="fil-check-text">' +
          '<span class="fil-check-label">' + esc(it.label) + '</span>' +
          '<span class="fil-check-desc">' + esc(it.desc) + '</span>' +
        '</div>';
      list.appendChild(item);
    });
    wrap.appendChild(list);

    var scoreBar = cel('div', 'fil-live-score');
    wrap.appendChild(scoreBar);
    body.appendChild(wrap);

    function updateScore() {
      var total = 0;
      for (var k in state.adl) { if (state.adl[k]) total++; }
      state.adlScore = total;
      var ds = Data.adlDomainScore(total);
      var cls = ds === 0 ? 'fit' : ds === 1 ? 'unfit' : 'frail';
      scoreBar.innerHTML =
        'ADL score: <strong>' + total + '/6</strong> \u2192 dominio <span class="fil-badge fil-badge-' + cls + '">' + ds + '</span>';
    }
    list.addEventListener('change', function (e) {
      if (e.target.type === 'checkbox' && e.target.dataset.key) {
        state.adl[e.target.dataset.key] = e.target.checked;
        updateScore();
      }
    });
    updateScore();
  }

  /* IADL modal */
  function renderIADLModal(body) {
    if (!state.iadl) state.iadl = {};
    var items = Data.iadlItemsForGender(state.gender || 'F');
    var maxScore = items.length;

    var wrap = cel('div', 'fil-step-form');
    wrap.innerHTML =
      '<p class="fil-step-desc">Scala di Lawton: selezionare le attivit\u00e0 svolte <strong>in modo indipendente</strong>.' +
      (state.gender === 'M' ? ' <em>(Uomo: 5 item)</em>' : ' <em>(Donna: 8 item)</em>') + '</p>';

    var list = cel('div', 'fil-check-list');
    items.forEach(function (it) {
      var checked = state.iadl[it.id] === true;
      var item = cel('label', 'fil-check-item');
      item.innerHTML =
        '<input type="checkbox" data-key="' + it.id + '"' + (checked ? ' checked' : '') + '>' +
        '<div class="fil-check-text">' +
          '<span class="fil-check-label">' + esc(it.label) + '</span>' +
          '<span class="fil-check-desc">' + esc(it.desc) + '</span>' +
        '</div>';
      list.appendChild(item);
    });
    wrap.appendChild(list);

    var scoreBar = cel('div', 'fil-live-score');
    wrap.appendChild(scoreBar);
    body.appendChild(wrap);

    function updateScore() {
      var total = 0;
      items.forEach(function (it) { if (state.iadl[it.id]) total++; });
      state.iadlScore = total;
      var ds = Data.iadlDomainScore(total, state.gender || 'F');
      var cls = ds === 0 ? 'fit' : ds === 1 ? 'unfit' : 'frail';
      scoreBar.innerHTML =
        'IADL score: <strong>' + total + '/' + maxScore + '</strong> \u2192 dominio <span class="fil-badge fil-badge-' + cls + '">' + ds + '</span>';
    }
    list.addEventListener('change', function (e) {
      if (e.target.type === 'checkbox' && e.target.dataset.key) {
        state.iadl[e.target.dataset.key] = e.target.checked;
        updateScore();
      }
    });
    updateScore();
  }

  /* CIRS-G modal */
  function renderCIRSModal(body) {
    if (!state.cirsGrades) state.cirsGrades = new Array(Data.CIRS_CATEGORIES.length);
    for (var k = 0; k < state.cirsGrades.length; k++) {
      if (state.cirsGrades[k] == null) state.cirsGrades[k] = 0;
    }

    var wrap = cel('div', 'fil-step-form');
    wrap.innerHTML = '<p class="fil-step-desc">Assegnare un grado (0\u20134) a ciascuna categoria organo.</p>';

    var grid = cel('div', 'fil-cirs-grid');
    Data.CIRS_CATEGORIES.forEach(function (cat, i) {
      var row = cel('div', 'fil-cirs-row');
      var gradeOpts = '';
      Data.CIRS_GRADES.forEach(function (gr) {
        gradeOpts += '<option value="' + gr.value + '"' +
          (state.cirsGrades[i] === gr.value ? ' selected' : '') + '>' +
          gr.value + ' \u2014 ' + esc(gr.label) + '</option>';
      });
      row.innerHTML =
        '<div class="fil-cirs-label">' +
          '<span class="fil-cirs-name">' + esc(cat.label) + '</span>' +
          '<span class="fil-cirs-example">' + esc(cat.example) + '</span>' +
        '</div>' +
        '<select class="fil-select fil-cirs-select" data-idx="' + i + '">' + gradeOpts + '</select>';
      grid.appendChild(row);
    });
    wrap.appendChild(grid);

    var summaryBar = cel('div', 'fil-live-score');
    wrap.appendChild(summaryBar);
    body.appendChild(wrap);

    function updateSummary() {
      var m = Data.cirsMetrics(state.cirsGrades);
      var ds = Data.cirsDomainScore(m.nSevere);
      var cls = ds === 0 ? 'fit' : ds === 1 ? 'unfit' : 'frail';
      summaryBar.innerHTML =
        'Comorbidit\u00e0 grado \u22653: <strong>' + m.nSevere + '</strong> | ' +
        'Score totale: ' + m.totalScore + ' | ' +
        'Severity index: ' + m.severityIndex + ' \u2192 ' +
        'dominio <span class="fil-badge fil-badge-' + cls + '">' + ds + '</span>';
    }
    grid.addEventListener('change', function (e) {
      if (e.target.dataset.idx != null) {
        state.cirsGrades[parseInt(e.target.dataset.idx, 10)] = parseInt(e.target.value, 10);
        updateSummary();
      }
    });
    updateSummary();
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Editor panel renderers (main area)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  function renderAnagrafica(ed) {
    ed.innerHTML = '';
    var wrap = cel('div', 'fil-ide-editor-form');

    var ageRow = cel('div', 'fil-field');
    ageRow.innerHTML =
      '<label class="fil-label">Et\u00e0 del paziente</label>' +
      '<input type="number" class="fil-input" id="fil-age" min="18" max="110" ' +
        'value="' + (state.age || '') + '" placeholder="Es: 76">';
    wrap.appendChild(ageRow);

    var sexRow = cel('div', 'fil-field');
    sexRow.innerHTML =
      '<label class="fil-label">Sesso</label>' +
      '<div class="fil-radio-group">' +
        '<label class="fil-radio"><input type="radio" name="fil-sex" value="M"' +
          (state.gender === 'M' ? ' checked' : '') + '> Maschio</label>' +
        '<label class="fil-radio"><input type="radio" name="fil-sex" value="F"' +
          (state.gender === 'F' ? ' checked' : '') + '> Femmina</label>' +
      '</div>';
    wrap.appendChild(sexRow);

    var ecogRow = cel('div', 'fil-field');
    var ecogOpts = '';
    Data.ECOG_OPTIONS.forEach(function (eo) {
      ecogOpts += '<option value="' + eo.value + '"' +
        (state.ecog === eo.value ? ' selected' : '') + '>' + esc(eo.label) + '</option>';
    });
    ecogRow.innerHTML =
      '<label class="fil-label">ECOG Performance Status <span class="fil-info-tag">informativo</span></label>' +
      '<select class="fil-select" id="fil-ecog">' + ecogOpts + '</select>' +
      '<span class="fil-hint">Non entra nel calcolo sGA, registrato a fini clinici.</span>';
    wrap.appendChild(ecogRow);

    ed.appendChild(wrap);

    var ageInput = ed.querySelector('#fil-age');
    var ecogSel  = ed.querySelector('#fil-ecog');
    var radios   = ed.querySelectorAll('input[name="fil-sex"]');

    if (ageInput) ageInput.addEventListener('input', function () {
      state.age = parseInt(this.value, 10) || 0;
      refreshSidebar();
      setStatus('Et\u00e0: ' + state.age + ' anni');
    });
    if (ecogSel) ecogSel.addEventListener('change', function () {
      state.ecog = parseInt(this.value, 10);
    });
    for (var r = 0; r < radios.length; r++) {
      radios[r].addEventListener('change', function () {
        state.gender = this.value;
        refreshSidebar();
        setStatus('Sesso: ' + state.gender);
      });
    }
  }

  /* â”€â”€ ADL panel (summary + open modal button) â”€â”€ */
  function renderADLPanel(ed) {
    ed.innerHTML = '';
    var wrap = cel('div', 'fil-ide-editor-form');
    var st = getSidebarStatus('adl');

    if (st.done) {
      var ds = Data.adlDomainScore(state.adlScore);
      var cls = ds === 0 ? 'fit' : ds === 1 ? 'unfit' : 'frail';
      var detailHtml = '';
      Data.ADL_ITEMS.forEach(function (it) {
        var ok = state.adl[it.id] === true;
        detailHtml += '<div class="fil-ide-score-item ' + (ok ? 'fil-ide-score-item--ok' : '') + '">' +
          '<span>' + (ok ? '\u2713' : '\u2717') + '</span> ' + esc(it.label) + '</div>';
      });
      wrap.innerHTML =
        '<div class="fil-ide-score-summary">' +
          '<div class="fil-ide-score-big">' +
            '<span class="fil-ide-score-value">' + state.adlScore + '/6</span>' +
            '<span class="fil-badge fil-badge-' + cls + '">dominio ' + ds + '</span>' +
          '</div>' +
          '<p class="fil-ide-score-desc">Indice di Katz \u2014 Activities of Daily Living</p>' +
          '<div class="fil-ide-score-detail">' + detailHtml + '</div>' +
        '</div>';
    } else {
      wrap.innerHTML = '<div class="fil-ide-empty"><p>Score ADL (Katz) non ancora compilato.</p></div>';
    }

    var btnRow = cel('div', 'fil-ide-btn-row');
    var openBtn = cel('button', 'btn btn-primary', '<i class="hgi-stroke hgi-edit-01"></i> ' + (st.done ? 'Modifica ADL' : 'Compila ADL'));
    openBtn.type = 'button';
    openBtn.addEventListener('click', function () {
      openModal('ADL \u2014 Indice di Katz', renderADLModal, function () {
        setStatus('ADL completato: ' + state.adlScore + '/6');
      });
    });
    btnRow.appendChild(openBtn);
    wrap.appendChild(btnRow);
    ed.appendChild(wrap);
  }

  /* â”€â”€ IADL panel â”€â”€ */
  function renderIADLPanel(ed) {
    ed.innerHTML = '';
    var wrap = cel('div', 'fil-ide-editor-form');
    var st = getSidebarStatus('iadl');

    if (st.done) {
      var maxS = (state.gender === 'M') ? 5 : 8;
      var ds = Data.iadlDomainScore(state.iadlScore, state.gender || 'F');
      var cls = ds === 0 ? 'fit' : ds === 1 ? 'unfit' : 'frail';
      var items = Data.iadlItemsForGender(state.gender || 'F');
      var detailHtml = '';
      items.forEach(function (it) {
        var ok = state.iadl[it.id] === true;
        detailHtml += '<div class="fil-ide-score-item ' + (ok ? 'fil-ide-score-item--ok' : '') + '">' +
          '<span>' + (ok ? '\u2713' : '\u2717') + '</span> ' + esc(it.label) + '</div>';
      });
      wrap.innerHTML =
        '<div class="fil-ide-score-summary">' +
          '<div class="fil-ide-score-big">' +
            '<span class="fil-ide-score-value">' + state.iadlScore + '/' + maxS + '</span>' +
            '<span class="fil-badge fil-badge-' + cls + '">dominio ' + ds + '</span>' +
          '</div>' +
          '<p class="fil-ide-score-desc">Scala di Lawton \u2014 Instrumental Activities of Daily Living</p>' +
          '<div class="fil-ide-score-detail">' + detailHtml + '</div>' +
        '</div>';
    } else {
      wrap.innerHTML =
        '<div class="fil-ide-empty"><p>Score IADL (Lawton) non ancora compilato.</p>' +
        (!state.gender ? '<p class="fil-hint">Compilare prima l\'anagrafica (necessario il sesso).</p>' : '') +
        '</div>';
    }

    var btnRow = cel('div', 'fil-ide-btn-row');
    var openBtn = cel('button', 'btn btn-primary', '<i class="hgi-stroke hgi-edit-01"></i> ' + (st.done ? 'Modifica IADL' : 'Compila IADL'));
    openBtn.type = 'button';
    if (!state.gender) openBtn.disabled = true;
    openBtn.addEventListener('click', function () {
      openModal('IADL \u2014 Scala di Lawton', renderIADLModal, function () {
        var maxS2 = (state.gender === 'M') ? 5 : 8;
        setStatus('IADL completato: ' + state.iadlScore + '/' + maxS2);
      });
    });
    btnRow.appendChild(openBtn);
    wrap.appendChild(btnRow);
    ed.appendChild(wrap);
  }

  /* â”€â”€ CIRS-G panel â”€â”€ */
  function renderCIRSPanel(ed) {
    ed.innerHTML = '';
    var wrap = cel('div', 'fil-ide-editor-form');
    var st = getSidebarStatus('cirs');

    if (st.done) {
      var m = Data.cirsMetrics(state.cirsGrades);
      var ds = Data.cirsDomainScore(m.nSevere);
      var cls = ds === 0 ? 'fit' : ds === 1 ? 'unfit' : 'frail';
      wrap.innerHTML =
        '<div class="fil-ide-score-summary">' +
          '<div class="fil-ide-score-big">' +
            '<span class="fil-ide-score-value">' + m.nSevere + ' sev</span>' +
            '<span class="fil-badge fil-badge-' + cls + '">dominio ' + ds + '</span>' +
          '</div>' +
          '<p class="fil-ide-score-desc">CIRS-G \u2014 Cumulative Illness Rating Scale for Geriatrics</p>' +
          '<div class="fil-result-stats">' +
            '<div class="fil-stat"><span class="fil-stat-num">' + m.totalScore + '</span><span class="fil-stat-label">Score totale</span></div>' +
            '<div class="fil-stat"><span class="fil-stat-num">' + m.severityIndex + '</span><span class="fil-stat-label">Severity index</span></div>' +
            '<div class="fil-stat"><span class="fil-stat-num">' + m.nSevere + '</span><span class="fil-stat-label">Comorbidit\u00e0 \u22653</span></div>' +
          '</div>' +
        '</div>';
    } else {
      wrap.innerHTML = '<div class="fil-ide-empty"><p>CIRS-G non ancora compilato.</p></div>';
    }

    var btnRow = cel('div', 'fil-ide-btn-row');
    var openBtn = cel('button', 'btn btn-primary', '<i class="hgi-stroke hgi-edit-01"></i> ' + (st.done ? 'Modifica CIRS-G' : 'Compila CIRS-G'));
    openBtn.type = 'button';
    openBtn.addEventListener('click', function () {
      openModal('CIRS-G \u2014 14 Categorie', renderCIRSModal, function () {
        var m2 = Data.cirsMetrics(state.cirsGrades);
        setStatus('CIRS-G completato: ' + m2.nSevere + ' comorbidit\u00e0 grado \u22653');
      });
    });
    btnRow.appendChild(openBtn);
    wrap.appendChild(btnRow);
    ed.appendChild(wrap);
  }

  /* â”€â”€ EPI panel (inline form) â”€â”€ */
  function renderEPIPanel(ed) {
    ed.innerHTML = '';
    var wrap = cel('div', 'fil-ide-editor-form');
    wrap.innerHTML = '<p class="fil-step-desc">Dati aggiuntivi per il calcolo dell\u2019Elderly Prognostic Index (EPI).</p>';

    var ipiRow = cel('div', 'fil-field');
    var ipiOpts = '';
    for (var i = 0; i <= 5; i++) {
      ipiOpts += '<option value="' + i + '"' + (state.ipi === i ? ' selected' : '') + '>' + i + '</option>';
    }
    ipiRow.innerHTML =
      '<label class="fil-label">IPI score (0\u20135)</label>' +
      '<select class="fil-select" id="fil-ipi">' + ipiOpts + '</select>' +
      '<span class="fil-hint">International Prognostic Index: 0\u20132 \u2192 0 | 3 \u2192 1 | 4\u20135 \u2192 2</span>';
    wrap.appendChild(ipiRow);

    var hbRow = cel('div', 'fil-field');
    hbRow.innerHTML =
      '<label class="fil-label">Emoglobina (g/dL)</label>' +
      '<input type="number" class="fil-input" id="fil-hb" min="3" max="20" step="0.1" ' +
        'value="' + (state.hb || '') + '" placeholder="Es: 11.5">' +
      '<span class="fil-hint">Soglia: &lt;12 g/dL \u2192 1 punto EPI</span>';
    wrap.appendChild(hbRow);

    ed.appendChild(wrap);

    var ipiSel = ed.querySelector('#fil-ipi');
    var hbInput = ed.querySelector('#fil-hb');
    if (ipiSel) ipiSel.addEventListener('change', function () {
      state.ipi = parseInt(this.value, 10);
      refreshSidebar();
      setStatus('IPI: ' + state.ipi);
    });
    if (hbInput) hbInput.addEventListener('input', function () {
      state.hb = parseFloat(this.value) || 0;
      refreshSidebar();
      setStatus('Hb: ' + state.hb + ' g/dL');
    });
  }

  /* â”€â”€ Results panel â”€â”€ */
  function renderResultsPanel(ed) {
    ed.innerHTML = '';
    var wrap = cel('div', 'fil-ide-editor-form');

    var missing = [];
    if (!state.age || !state.gender) missing.push('Anagrafica');
    if (state.adlScore == null) missing.push('ADL');
    if (state.iadlScore == null) missing.push('IADL');
    if (!state.cirsGrades) missing.push('CIRS-G');
    if (state.ipi == null || !state.hb) missing.push('EPI');

    if (missing.length > 0) {
      wrap.innerHTML =
        '<div class="fil-ide-empty">' +
          '<p>Compilare le sezioni mancanti per calcolare i risultati:</p>' +
          '<ul class="fil-ide-missing-list">' +
            missing.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') +
          '</ul>' +
        '</div>';
      ed.appendChild(wrap);
      return;
    }

    var result = Core.computeAll({
      age: state.age, gender: state.gender,
      adlScore: state.adlScore || 0, iadlScore: state.iadlScore || 0,
      cirsGrades: state.cirsGrades || [], ipi: state.ipi || 0, hb: state.hb || 0
    });
    state._result = result;
    refreshSidebar();

    /* sGA card */
    var sgaCls = result.sga.sgaClass;
    var domainsHtml = '';
    result.sga.domains.forEach(function (dm) {
      var dCls = dm.score === 0 ? 'fit' : dm.score === 1 ? 'unfit' : 'frail';
      domainsHtml +=
        '<tr><td>' + esc(dm.label) + '</td><td>' + esc(dm.raw) + '</td>' +
        '<td><span class="fil-badge fil-badge-' + dCls + '">' + dm.score + '</span></td></tr>';
    });
    var sgaCard = cel('div', 'fil-result-card');
    sgaCard.innerHTML =
      '<div class="fil-result-header">' +
        '<span class="fil-result-title">Simplified Geriatric Assessment (sGA)</span>' +
        '<span class="fil-result-class" style="background:' + sgaCls.color + '20;color:' + sgaCls.color + '">' +
          esc(sgaCls.label) + '</span>' +
      '</div>' +
      '<table class="fil-result-table">' +
        '<thead><tr><th>Dominio</th><th>Valore</th><th>Score</th></tr></thead>' +
        '<tbody>' + domainsHtml + '</tbody>' +
      '</table>' +
      '<p class="fil-result-note">Classificazione basata sul <strong>peggior dominio</strong>: ' +
        esc(result.sga.worstDomain) + '</p>';
    wrap.appendChild(sgaCard);

    /* EPI card */
    var epi = result.epi;
    var epiRisk = epi.epiRisk;
    var epiCard = cel('div', 'fil-result-card');
    epiCard.innerHTML =
      '<div class="fil-result-header">' +
        '<span class="fil-result-title">Elderly Prognostic Index (EPI)</span>' +
        '<span class="fil-result-class" style="background:' + epiRisk.color + '20;color:' + epiRisk.color + '">' +
          esc(epiRisk.label) + '</span>' +
      '</div>' +
      '<table class="fil-result-table">' +
        '<thead><tr><th>Componente</th><th>Sub-score</th></tr></thead>' +
        '<tbody>' +
          '<tr><td>sGA (' + esc(sgaCls.label) + ')</td><td>' + epi.sgaSub + '</td></tr>' +
          '<tr><td>IPI (' + (state.ipi || 0) + ')</td><td>' + epi.ipiSub + '</td></tr>' +
          '<tr><td>Hb (' + (state.hb || 0) + ' g/dL)</td><td>' + epi.hbSub + '</td></tr>' +
          '<tr class="fil-result-total"><td><strong>Totale EPI</strong></td><td><strong>' + epi.epiScore + '/5</strong></td></tr>' +
        '</tbody>' +
      '</table>' +
      '<p class="fil-result-note">Low (0\u20131) | Intermediate (2\u20133) | High (4\u20135)</p>';
    wrap.appendChild(epiCard);

    /* CIRS summary */
    var cirsM = result.cirsMetrics;
    var cirsCard = cel('div', 'fil-result-card');
    cirsCard.innerHTML =
      '<div class="fil-result-header"><span class="fil-result-title">CIRS-G Riepilogo</span></div>' +
      '<div class="fil-result-stats">' +
        '<div class="fil-stat"><span class="fil-stat-num">' + cirsM.totalScore + '</span><span class="fil-stat-label">Score totale</span></div>' +
        '<div class="fil-stat"><span class="fil-stat-num">' + cirsM.severityIndex + '</span><span class="fil-stat-label">Severity index</span></div>' +
        '<div class="fil-stat"><span class="fil-stat-num">' + cirsM.nSevere + '</span><span class="fil-stat-label">Comorbidit\u00e0 \u22653</span></div>' +
      '</div>';
    wrap.appendChild(cirsCard);

    /* ECOG */
    if (state.ecog != null) {
      var ecogLabel = '';
      Data.ECOG_OPTIONS.forEach(function (eo) { if (eo.value === state.ecog) ecogLabel = eo.label; });
      var ecogCard = cel('div', 'fil-result-card');
      ecogCard.innerHTML =
        '<div class="fil-result-header">' +
          '<span class="fil-result-title">ECOG Performance Status</span>' +
          '<span class="fil-info-tag">informativo</span>' +
        '</div>' +
        '<p class="fil-result-ecog-value">' + esc(ecogLabel) + '</p>';
      wrap.appendChild(ecogCard);
    }

    /* Actions */
    var actions = cel('div', 'fil-result-actions');
    actions.innerHTML =
      '<button type="button" class="btn" id="fil-copy"><i class="hgi-stroke hgi-copy-01"></i> Copia referto</button>' +
      '<button type="button" class="btn" id="fil-print"><i class="hgi-stroke hgi-printer"></i> Stampa</button>';
    wrap.appendChild(actions);
    ed.appendChild(wrap);

    var copyBtn = ed.querySelector('#fil-copy');
    var printBtn = ed.querySelector('#fil-print');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var text = buildClipboardText(state, result);
      if (global.LumiaExport && typeof global.LumiaExport.clipboard === 'function') {
        global.LumiaExport.clipboard({ text: text, html: '' });
      } else {
        try { navigator.clipboard.writeText(text); } catch (_) {}
      }
      if (global.LumiaToast) global.LumiaToast.success('Referto copiato negli appunti.');
    });
    if (printBtn) printBtn.addEventListener('click', function () {
      var printDiv = buildPrintReport(state, result);
      document.body.appendChild(printDiv);
      global.print();
      document.body.removeChild(printDiv);
    });

    setStatus('sGA: ' + sgaCls.label + ' | EPI: ' + epiRisk.label + ' (' + epi.epiScore + '/5)');
    _emit('lumia:fitness:computed', { type: 'fil-sga', result: result });
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Navigation
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  var RENDERERS = {
    anagrafica: renderAnagrafica,
    adl:        renderADLPanel,
    iadl:       renderIADLPanel,
    cirs:       renderCIRSPanel,
    epi:        renderEPIPanel,
    results:    renderResultsPanel
  };

  function navigate(id) {
    if (!RENDERERS[id]) return;
    activeId = id;
    Object.keys(sidebarItems).forEach(function (k) {
      sidebarItems[k].classList.toggle('is-active', k === id);
    });
    RENDERERS[id](editorEl);
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Clipboard text builder
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function buildClipboardText(data, result) {
    var lines = [];
    lines.push('=== FIL Fitness \u2014 Simplified Geriatric Assessment ===');
    lines.push('Paziente: ' + data.age + ' anni, sesso ' + data.gender);
    lines.push('');
    lines.push('--- sGA ---');
    result.sga.domains.forEach(function (d) {
      lines.push(d.label + ': ' + d.raw + ' (dominio ' + d.score + ')');
    });
    lines.push('Classificazione sGA: ' + result.sga.sgaClass.label +
      ' (dominio peggiore: ' + result.sga.worstDomain + ')');
    lines.push('');
    lines.push('--- EPI ---');
    lines.push('sGA sub-score: ' + result.epi.sgaSub);
    lines.push('IPI (' + (data.ipi || 0) + ') sub-score: ' + result.epi.ipiSub);
    lines.push('Hb (' + (data.hb || 0) + ' g/dL) sub-score: ' + result.epi.hbSub);
    lines.push('EPI totale: ' + result.epi.epiScore + '/5 \u2192 ' + result.epi.epiRisk.label);
    lines.push('');
    lines.push('--- CIRS-G ---');
    lines.push('Score totale: ' + result.cirsMetrics.totalScore);
    lines.push('Severity index: ' + result.cirsMetrics.severityIndex);
    lines.push('Comorbidit\u00e0 grado \u22653: ' + result.cirsMetrics.nSevere);
    if (data.ecog != null) {
      lines.push('');
      lines.push('ECOG PS: ' + data.ecog + ' (informativo)');
    }
    lines.push('');
    lines.push('Ref: Merli F. et al., JCO 2021;39(11):1214-1222');
    return lines.join('\n');
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Print report builder
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function buildPrintReport(data, result) {
    var wrap = cel('div', 'fil-print-report');
    var now = new Date();
    var dateStr = now.toLocaleDateString('it-IT') + ' ' +
      now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    var sga = result.sga;
    var epi = result.epi;
    var cirsM = result.cirsMetrics;

    var html = '<div class="fil-print-header">' +
      '<h2>FIL Fitness \u2014 Simplified Geriatric Assessment</h2>' +
      '<span class="fil-print-date">' + esc(dateStr) + '</span></div>';

    html += '<div class="fil-print-section"><h3>Anagrafica</h3>' +
      '<p>Et\u00e0: ' + data.age + ' anni | Sesso: ' + data.gender;
    if (data.ecog != null) html += ' | ECOG PS: ' + data.ecog + ' (informativo)';
    html += '</p></div>';

    html += '<div class="fil-print-section"><h3>sGA \u2014 ' + esc(sga.sgaClass.label) + '</h3>' +
      '<table class="fil-print-table"><thead><tr><th>Dominio</th><th>Valore</th><th>Score</th></tr></thead><tbody>';
    sga.domains.forEach(function (dm) {
      html += '<tr><td>' + esc(dm.label) + '</td><td>' + esc(dm.raw) + '</td><td>' + dm.score + '</td></tr>';
    });
    html += '</tbody></table><p>Dominio peggiore: ' + esc(sga.worstDomain) + '</p></div>';

    html += '<div class="fil-print-section"><h3>EPI \u2014 ' + esc(epi.epiRisk.label) +
      ' (score ' + epi.epiScore + '/5)</h3>' +
      '<table class="fil-print-table"><thead><tr><th>Componente</th><th>Sub-score</th></tr></thead><tbody>' +
      '<tr><td>sGA</td><td>' + epi.sgaSub + '</td></tr>' +
      '<tr><td>IPI (' + (data.ipi || 0) + ')</td><td>' + epi.ipiSub + '</td></tr>' +
      '<tr><td>Hb (' + (data.hb || 0) + ' g/dL)</td><td>' + epi.hbSub + '</td></tr>' +
      '<tr><td><strong>Totale</strong></td><td><strong>' + epi.epiScore + '</strong></td></tr>' +
      '</tbody></table></div>';

    html += '<div class="fil-print-section"><h3>CIRS-G Dettaglio</h3>' +
      '<table class="fil-print-table"><thead><tr><th>Categoria</th><th>Grado</th></tr></thead><tbody>';
    Data.CIRS_CATEGORIES.forEach(function (cat, c) {
      var grade = (data.cirsGrades && data.cirsGrades[c]) || 0;
      html += '<tr><td>' + esc(cat.label) + '</td><td>' + grade + '</td></tr>';
    });
    html += '</tbody></table><p>Score totale: ' + cirsM.totalScore + ' | Severity index: ' + cirsM.severityIndex +
      ' | Comorbidit\u00e0 grado \u22653: ' + cirsM.nSevere + '</p></div>';

    html += '<div class="fil-print-section fil-print-ref">' +
      '<p>Ref: Merli F. et al., JCO 2021;39(11):1214-1222. DOI: 10.1200/JCO.20.02465</p></div>';

    wrap.innerHTML = html;
    return wrap;
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  mount â€” builds the IDE layout
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function mount(el) {
    if (!el) return;
    resetState();
    sidebarItems = {};
    activeId = null;

    rootEl = cel('div', 'fil-ide');
    el.innerHTML = '';

    /* Sidebar */
    var sidebar = cel('div', 'fil-ide-sidebar');
    var sideTitle = cel('div', 'fil-ide-sidebar-title', 'FIL FITNESS');
    sidebar.appendChild(sideTitle);

    var nav = cel('nav', 'fil-ide-nav');
    SCORES.forEach(function (s) {
      var row = cel('button', 'fil-ide-nav-item');
      row.type = 'button';
      row.dataset.id = s.id;
      row.innerHTML =
        '<i class="hgi-stroke ' + s.icon + '"></i>' +
        '<span class="fil-ide-nav-label">' + esc(s.label) + '</span>' +
        '<span class="fil-ide-badge" style="display:none"></span>';
      row.addEventListener('click', function () { navigate(s.id); });
      nav.appendChild(row);
      sidebarItems[s.id] = row;
    });
    sidebar.appendChild(nav);

    var ref = cel('div', 'fil-ide-sidebar-ref');
    ref.innerHTML = '<span class="fil-hint">Merli et al., JCO 2021</span>';
    sidebar.appendChild(ref);

    rootEl.appendChild(sidebar);

    /* Editor area */
    var editorWrap = cel('div', 'fil-ide-editor-wrap');
    editorEl = cel('div', 'fil-ide-editor');
    editorWrap.appendChild(editorEl);

    statusEl = cel('div', 'fil-ide-status');
    statusEl.textContent = 'Seleziona una sezione dalla sidebar per iniziare.';
    editorWrap.appendChild(statusEl);

    rootEl.appendChild(editorWrap);
    el.appendChild(rootEl);

    navigate('anagrafica');
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Public API
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  global.FILFitnessUI = {
    mount: mount,
    getState: function () { return JSON.parse(JSON.stringify(state)); },
    setState: function (s) { Object.assign(state, s); refreshSidebar(); }
  };

})(window);
