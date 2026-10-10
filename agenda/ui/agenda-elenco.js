/**
 * agenda-elenco.js — Elenco layer: unified view of appointments + list entries
 * Exposes: Ag.Elenco + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  /* ── Elenco mini calendar state ────────────────────────────── */
  var _eCalY = new Date().getFullYear(), _eCalM = new Date().getMonth();
  var _elencoDate = C.fmtDate(new Date());

  function initElencoLayer() {
    C.injectIcon('icoElencoBrand', 'ico-eye');
    C.injectIcon('icoElencoStruct', 'ico-hospital'); C.injectIcon('icoElencoStructDD', 'ico-chevron-down');
    C.injectIcon('icoElencoBack', 'ico-chevron-left');
    _elencoDate = S.selDate;
    var d = new Date(_elencoDate); _eCalY = d.getFullYear(); _eCalM = d.getMonth();
    C.$('elencoFrom').value = S.selDate;
    C.$('elencoTo').value = S.selDate;
    renderElencoMiniCal();
    updateElencoStructLabel();
    if (S.elencoNodeId) loadElenco();
  }

  function renderElencoMiniCal() {
    var today = C.fmtDate(new Date()), sel = _elencoDate;
    var dim = new Date(_eCalY, _eCalM + 1, 0).getDate();
    var fd = (new Date(_eCalY, _eCalM, 1).getDay() + 6) % 7;
    var pmd = new Date(_eCalY, _eCalM, 0).getDate();
    var mn = C.MESI;
    var h = '<div class="mcal-header"><button onclick="elencoCalPrev()">' + C.SVG_NAV_LEFT + '</button><span class="mcal-title">' + mn[_eCalM] + ' ' + _eCalY + '</span><button onclick="elencoCalNext()">' + C.SVG_NAV_RIGHT + '</button></div><div class="mcal-grid">';
    ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(function(d) { h += '<div class="mcal-dow">' + d + '</div>'; });
    for (var i = fd - 1; i >= 0; i--) {
      var day = pmd - i;
      var pm = _eCalM === 0 ? 11 : _eCalM - 1, py = _eCalM === 0 ? _eCalY - 1 : _eCalY;
      var ds = py + '-' + String(pm + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      h += '<div class="mcal-day other-month" onclick="pickElencoDay(\'' + ds + '\')">' + day + '</div>';
    }
    for (var d2 = 1; d2 <= dim; d2++) {
      var ds2 = _eCalY + '-' + String(_eCalM + 1).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
      var cls = ['mcal-day', ds2 === today ? 'today' : '', ds2 === sel ? 'selected' : ''].filter(Boolean).join(' ');
      h += '<div class="' + cls + '" onclick="pickElencoDay(\'' + ds2 + '\')">' + d2 + '</div>';
    }
    var rem = (7 - ((fd + dim) % 7)) % 7;
    for (var d3 = 1; d3 <= rem; d3++) {
      var nm = _eCalM === 11 ? 0 : _eCalM + 1, ny = _eCalM === 11 ? _eCalY + 1 : _eCalY;
      var ds3 = ny + '-' + String(nm + 1).padStart(2, '0') + '-' + String(d3).padStart(2, '0');
      h += '<div class="mcal-day other-month" onclick="pickElencoDay(\'' + ds3 + '\')">' + d3 + '</div>';
    }
    h += '</div>';
    var el = C.$('elencoMiniCal');
    if (el) el.innerHTML = h;
  }

  function pickElencoDay(ds) {
    _elencoDate = ds;
    var d = new Date(ds);
    if (d.getFullYear() !== _eCalY || d.getMonth() !== _eCalM) {
      _eCalY = d.getFullYear(); _eCalM = d.getMonth();
    }
    renderElencoMiniCal();
    if (S.elencoNodeId) loadElenco();
  }

  function elencoCalPrev() {
    _eCalM--; if (_eCalM < 0) { _eCalM = 11; _eCalY--; }
    renderElencoMiniCal();
  }

  function elencoCalNext() {
    _eCalM++; if (_eCalM > 11) { _eCalM = 0; _eCalY++; }
    renderElencoMiniCal();
  }

  function updateElencoStructLabel() {
    if (!S.elencoNodeId) { C.$('elencoStructLabel').textContent = 'Seleziona livello…'; C.$('elencoStructSub').textContent = ''; return; }
    var nd = S.nodeMap[S.elencoNodeId];
    if (!nd) { C.$('elencoStructLabel').textContent = 'Nodo sconosciuto'; C.$('elencoStructSub').textContent = ''; return; }
    C.$('elencoStructLabel').textContent = nd.name;
    var parts = []; var cur = nd.parent_id ? S.nodeMap[nd.parent_id] : null;
    while (cur) { parts.unshift(cur.name); cur = cur.parent_id ? S.nodeMap[cur.parent_id] : null; }
    C.$('elencoStructSub').textContent = parts.join(' › ');
  }

  function setElencoMode(m) {
    S.elencoMode = m;
    C.$('elencoModDay').classList.toggle('active', m === 'day');
    C.$('elencoModRange').classList.toggle('active', m === 'range');
    C.$('elencoDateDay').style.display = m === 'day' ? '' : 'none';
    C.$('elencoDateRange').style.display = m === 'range' ? '' : 'none';
  }

  function onElencoDateChange() { if (S.elencoNodeId) loadElenco(); }

  function openElencoTreePicker() {
    C.$('treePickerTitle').textContent = 'Seleziona struttura';
    renderElencoTreePickerBody();
    C.$('treePickerBackdrop').classList.add('active');
  }

  function renderElencoTreePickerBody() {
    var body = C.$('treePickerBody');
    var roots = S.treeNodes.filter(function(n) { return n.type === 'macroarea' && n.active; });
    if (!roots.length) { body.innerHTML = '<div style="padding:var(--sp-lg);text-align:center;color:var(--gray-400);font-size:.8rem">Nessuna struttura configurata.</div>'; return; }
    var SVG_CHECK = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12L11 15L16 9"/></svg>';
    var SVG_CANCEL = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--gray-400)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9L9 15M9 9L15 15"/></svg>';
    var SVG_ARROW_R = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    var SVG_CHECK_FILL = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12L11 15L16 9"/></svg>';
    var stIco = function(n) { return n.active ? SVG_CHECK : SVG_CANCEL; };
    var typeLabel = { macroarea: 'Macroarea', area: 'Area', sede: 'Sede', flusso: 'Flusso', postazione: 'Postazione' };
    var h = '';
    function renderNode(n, depth) {
      var sel = n.id === S.elencoNodeId;
      var cls = 'tp-node' + (sel ? ' is-selected' : '');
      var color = C.TP_COLORS[n.type] || '#666';
      var badge = '<span class="tp-badge">' + (typeLabel[n.type] || n.type) + '</span>';
      h += '<div class="' + cls + '" style="padding-left:' + (8 + depth * 16) + 'px;cursor:pointer" onclick="pickElencoNode(' + n.id + ')">' + stIco(n) + '<span class="tp-dot" style="background:' + color + '"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">' + C.esc(n.name) + '</span>' + badge + (sel ? ' ' + SVG_CHECK_FILL : '<span class="tp-arrow">' + SVG_ARROW_R + '</span>') + '</div>';
      var children = S.treeNodes.filter(function(c) { return c.parent_id === n.id && c.active; });
      if (children.length) { h += '<div class="tp-group">'; children.forEach(function(c) { renderNode(c, depth + 1); }); h += '</div>'; }
    }
    roots.forEach(function(r) { renderNode(r, 0); });
    body.innerHTML = h;
  }

  function pickElencoNode(id) {
    S.elencoNodeId = id;
    updateElencoStructLabel();
    Ag.Main.closeTreePicker();
    loadElenco();
  }

  function loadElenco() {
    if (!S.elencoNodeId) return Promise.resolve();
    var url = '/elenco?node_id=' + S.elencoNodeId;
    if (S.elencoMode === 'day') { url += '&date=' + _elencoDate; }
    else { url += '&from=' + C.$('elencoFrom').value + '&to=' + C.$('elencoTo').value; }
    return Ag.Api.fetch(url).then(function(j) {
      if (!j) { C.$('elencoContent').innerHTML = '<div style="color:var(--error);padding:var(--sp-md)">Errore di rete</div>'; return; }
      S.elencoData = j.data;
      renderElencoResults();
    });
  }

  function renderElencoResults() {
    if (!S.elencoData) return;
    var d = S.elencoData;
    var meta = d.meta || {};
    C.$('elencoToolbarTitle').textContent = d.breadcrumb || d.node?.name || '';
    C.$('elencoCounts').innerHTML = '<span style="color:var(--primary)">' + (meta.appointment_count || 0) + ' appuntamenti</span> · <span style="color:var(--warning)">' + (meta.list_entry_count || 0) + ' liste</span> · ' + (meta.total || 0) + ' totale';
    var rows = [];
    for (var ai = 0; ai < (d.appointments || []).length; ai++) {
      var a = d.appointments[ai];
      rows.push({ source: 'appt', date: a.date, time: a.start_time || '', patient: a.patient_name || '—', service: a.title || '', status: a.status || '', location: a.room_name || '', notes: a.notes || '' });
    }
    for (var ei = 0; ei < (d.list_entries || []).length; ei++) {
      var e = d.list_entries[ei];
      rows.push({ source: 'list', date: e.date || '', time: e.slot_time || '', patient: e.patient_name || '—', service: e.list_name || '', status: e.status || '', location: e.flusso_name || '', notes: e.notes || '' });
    }
    rows.sort(function(a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    if (!rows.length) { C.$('elencoContent').innerHTML = '<div style="color:var(--gray-400);text-align:center;padding:var(--sp-lg)">Nessun risultato per i criteri selezionati.</div>'; return; }
    var h = '<table class="elenco-table"><thead><tr><th>Tipo</th><th>Data</th><th>Ora/Pos</th><th>Paziente</th><th>Servizio/Lista</th><th>Stato</th><th>Struttura</th><th>Note</th></tr></thead><tbody>';
    for (var ri = 0; ri < rows.length; ri++) {
      var r = rows[ri];
      var srcClass = r.source === 'appt' ? 'src-appt' : 'src-list';
      var srcLabel = r.source === 'appt' ? 'Agenda' : 'Lista';
      var stCls = 'elenco-status st-' + (r.status || 'pending');
      h += '<tr><td><span class="elenco-source ' + srcClass + '">' + srcLabel + '</span></td><td>' + C.esc(r.date) + '</td><td>' + C.esc(r.time) + '</td><td>' + C.esc(r.patient) + '</td><td>' + C.esc(r.service) + '</td><td><span class="' + stCls + '">' + C.esc(r.status) + '</span></td><td>' + C.esc(r.location) + '</td><td>' + C.esc(r.notes) + '</td></tr>';
    }
    h += '</tbody></table>';
    C.$('elencoContent').innerHTML = h;
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Elenco = Object.freeze({
    init: initElencoLayer,
    loadElenco: loadElenco
  });

  /* ── Globals for HTML onclick ──────────────────────────────── */
  global.setElencoMode = setElencoMode;
  global.onElencoDateChange = onElencoDateChange;
  global.openElencoTreePicker = openElencoTreePicker;
  global.pickElencoNode = pickElencoNode;
  global.pickElencoDay = pickElencoDay;
  global.elencoCalPrev = elencoCalPrev;
  global.elencoCalNext = elencoCalNext;
  global.loadElenco = loadElenco;

})(window);
