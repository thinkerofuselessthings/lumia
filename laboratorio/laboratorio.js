/**
 * laboratorio.js — Laboratorio module content provider
 * Registers 'laboratorio-module' with LayerSystem.
 * Tab: Trasfusioni del giorno (lista richieste trasfusionali per data).
 */
(function(global) {
  'use strict';

  var API_BASE = '/api/agenda';
  var API_TIMEOUT = 10000;
  var _container = null;
  var _selDate = new Date().toISOString().slice(0, 10);
  var _data = [];

  /* ── API helper ────────────────────────────────────────── */
  function apiFetch(url) {
    var headers = {};
    if (global.csrfToken) headers['X-CSRF-Token'] = global.csrfToken;
    var ac = new AbortController();
    var tid = setTimeout(function() { ac.abort(); }, API_TIMEOUT);
    return fetch(API_BASE + url, { headers: headers, signal: ac.signal, credentials: 'same-origin' })
      .then(function(r) { if (r.ok) window.dispatchEvent(new Event('session-api-activity')); return r; })
      .then(function(r) { clearTimeout(tid); return r.ok ? r.json() : null; })
      .catch(function() { clearTimeout(tid); return null; });
  }

  /* ── Helpers ────────────────────────────────────────────── */
  function esc(s) { if (s == null) return ''; var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
  function fmtDate(d) { var p = d.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function statusLabel(s) {
    return { draft: 'Bozza', completed: 'Completata', cancelled: 'Annullata' }[s] || s || '—';
  }
  function statusClass(s) {
    return { draft: 'lab-st-draft', completed: 'lab-st-completed', cancelled: 'lab-st-cancelled' }[s] || '';
  }

  /* ── Load data ──────────────────────────────────────────── */
  function loadTransfusions() {
    var listEl = _container && _container.querySelector('#labTrasfList');
    if (listEl) listEl.innerHTML = '<div class="lab-loading"><i class="hgi-stroke hgi-loading-03 lab-spin"></i> Caricamento…</div>';
    return apiFetch('/transfusions?date=' + _selDate).then(function(res) {
      _data = (res && res.data) || [];
      renderList();
    });
  }

  /* ── Render ─────────────────────────────────────────────── */
  function renderList() {
    var el = _container && _container.querySelector('#labTrasfList');
    if (!el) return;
    if (!_data.length) {
      el.innerHTML = '<div class="lab-empty"><i class="hgi-stroke hgi-test-tube-01" style="font-size:28px;opacity:.3"></i><p>Nessuna richiesta trasfusionale per il ' + fmtDate(_selDate) + '</p></div>';
      return;
    }
    var html = '<table class="lab-table"><thead><tr>' +
      '<th>Orario</th><th>Paziente</th><th>Postazione</th><th>Urgenza</th><th>Emocomponenti</th><th>Stato</th>' +
      '</tr></thead><tbody>';
    _data.forEach(function(r) {
      var emos = (r.emocomponents || []).map(function(e) {
        var traits = [];
        if (e.irradiato) traits.push('Irr');
        if (e.filtrato) traits.push('Fil');
        if (e.lavato) traits.push('Lav');
        if (e.fenotipizzato) traits.push('Fen');
        return esc(e.emo_type) + ' ×' + e.units + (traits.length ? ' <span class="lab-traits">(' + traits.join(', ') + ')</span>' : '');
      }).join('<br>');
      html += '<tr>' +
        '<td>' + esc(r.start_time || '') + (r.end_time ? '–' + esc(r.end_time) : '') + '</td>' +
        '<td class="lab-patient">' + esc(r.paziente || r.patient_name || '—') + '</td>' +
        '<td>' + esc(r.room_name || '—') + '</td>' +
        '<td>' + esc(r.urgenza || 'Ordinaria') + '</td>' +
        '<td class="lab-emo-cell">' + (emos || '—') + '</td>' +
        '<td><span class="lab-status ' + statusClass(r.status) + '">' + statusLabel(r.status) + '</span></td>' +
        '</tr>';
    });
    html += '</tbody></table>';
    el.innerHTML = html;
  }

  function renderTrasfusioni(contentArea) {
    contentArea.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;';
    contentArea.innerHTML = '';

    /* ── Toolbar ── */
    var toolbar = document.createElement('div');
    toolbar.className = 'lab-toolbar';
    toolbar.innerHTML =
      '<div class="lab-toolbar-left">' +
        '<h3 class="lab-section-title"><i class="hgi-stroke hgi-injection"></i> Richieste Trasfusionali</h3>' +
      '</div>' +
      '<div class="lab-toolbar-right">' +
        '<input type="date" id="labDatePicker" value="' + _selDate + '" />' +
        '<button class="btn btn-sm" id="labRefresh" title="Aggiorna"><i class="hgi-stroke hgi-refresh"></i></button>' +
      '</div>';
    contentArea.appendChild(toolbar);

    /* ── List area ── */
    var listWrap = document.createElement('div');
    listWrap.id = 'labTrasfList';
    listWrap.className = 'lab-list-area';
    contentArea.appendChild(listWrap);

    /* ── Events ── */
    var datePicker = contentArea.querySelector('#labDatePicker');
    if (datePicker) datePicker.addEventListener('change', function() {
      _selDate = this.value;
      loadTransfusions();
    });
    var refreshBtn = contentArea.querySelector('#labRefresh');
    if (refreshBtn) refreshBtn.addEventListener('click', function() { loadTransfusions(); });

    /* initial load */
    loadTransfusions();
  }

  /* ── V2 Config ──────────────────────────────────────────── */
  var LAB_V2_CONFIG = {
    module: {
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v7.31"/><path d="M15 2v7.31"/><path d="M8 2h8"/><path d="M7.5 17.5 9 16l1.5 1.5L12 16l1.5 1.5L15 16l1.5 1.5"/><path d="M9 9.31 5.79 14.5a2.45 2.45 0 0 0 0 2.54 3.19 3.19 0 0 0 3 1.46h6.42a3.19 3.19 0 0 0 3-1.46 2.45 2.45 0 0 0 0-2.54L15 9.31"/></svg>',
      title: 'Laboratorio'
    },
    icons: {
      transfusion: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"/><path d="M8 6h8"/><path d="M6 10h12l-2 11H8z"/></svg>',
      close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      lib: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15H15C15.93 15 16.4 15 16.77 15.15C17.26 15.36 17.64 15.74 17.85 16.23C18 16.6 18 17.07 18 18C18 18.93 18 19.4 17.85 19.77C17.64 20.26 17.26 20.64 16.77 20.85C16.4 21 15.93 21 15 21H2"/><path d="M2 3H15C15.93 3 16.4 3 16.77 3.15C17.26 3.36 17.64 3.74 17.85 4.23C18 4.6 18 5.07 18 6C18 6.93 18 7.4 17.85 7.77C17.64 8.26 17.26 8.64 16.77 8.85C16.4 9 15.93 9 15 9H2"/><path d="M22 9H9C8.07 9 7.6 9 7.23 9.15C6.74 9.36 6.36 9.74 6.15 10.23C6 10.6 6 11.07 6 12C6 12.93 6 13.4 6.15 13.77C6.36 14.26 6.74 14.64 7.23 14.85C7.6 15 8.07 15 9 15H22"/></svg>',
      chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
    },
    sections: [
      { id: 'trasfusioni', label: 'Trasfusioni', icon: 'transfusion', desc: 'Richieste trasfusionali del giorno', color: '#CE2626', render: renderTrasfusioni }
    ],
    actions: [
      { id: '_close_layer', label: 'Chiudi Modulo', icon: 'close', desc: 'Chiudi il layer corrente', color: '#CE2626' },
      { id: '_library',     label: 'Libreria',      icon: 'lib',   desc: 'Torna alla libreria moduli', color: '#7DAACB' }
    ]
  };

  function renderModule(container, context) {
    _container = container;
    container.innerHTML = buildLayerLayoutV2({
      nodeId: context.nodeId,
      module: LAB_V2_CONFIG.module
    });
    setupLayerV2(container, LAB_V2_CONFIG, context.manager, context.nodeId);
    if (container._launcher) container._launcher.open();
  }

  function destroyModule(container) {
    var layoutEl = container && container.querySelector('.layer-layout-v2');
    if (layoutEl && layoutEl._tabStrip) layoutEl._tabStrip.destroy();
    _container = null;
    _data = [];
  }

  /* ── Register ─────────────────────────────────────────── */
  if (global.LayerSystem && global.LayerSystem.registerContent) {
    global.LayerSystem.registerContent('laboratorio-module', {
      label: 'Laboratorio',
      render: renderModule,
      destroy: destroyModule
    });
  }

})(window);
