/**
 * agenda-panoramica.js — Panoramica layer: cross-tree kanban board view
 * Shows all appointments for a date, grouped by flusso→postazione.
 * Supports drag & drop to move appointments between rooms.
 * Exposes: Ag.Panoramica + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  /* ── Panoramica mini-calendar state ─────────────────────────── */
  var _pCalY = new Date().getFullYear(), _pCalM = new Date().getMonth();
  var _panDate = C.fmtDate(new Date());
  var _panData = [];
  var _dragApptId = null;
  var _panView = 'kanban'; // 'kanban' | 'vertical'
  var _panFlussi = {};     // built by buildGroups(), shared across views
  var _panUnassigned = [];

  /* Vertical-view layout constants (px per minute for time axis) */
  var VERT_PX_PER_MIN = 1.2; // 1.2 px × (20h−8h)*60 = 864 px
  var VERT_HOUR_H = VERT_PX_PER_MIN * 60;

  /* ── Init ────────────────────────────────────────────────────── */
  function initPanoramicaLayer() {
    C.injectIcon('icoPanBrand', 'ico-eye');
    C.injectIcon('icoPanBack', 'ico-chevron-left');
    C.injectIcon('icoPanRoomClose', 'ico-close');
    _panDate = S.selDate;
    var d = new Date(_panDate);
    _pCalY = d.getFullYear();
    _pCalM = d.getMonth();
    renderPanMiniCal();
    loadPanoramica().then(function() {
      if (Ag.Main.hideLoader) Ag.Main.hideLoader();
    });
  }

  /* ── Mini calendar ──────────────────────────────────────────── */
  function renderPanMiniCal() {
    var today = C.fmtDate(new Date()), sel = _panDate;
    var dim = new Date(_pCalY, _pCalM + 1, 0).getDate();
    var fd = (new Date(_pCalY, _pCalM, 1).getDay() + 6) % 7;
    var pmd = new Date(_pCalY, _pCalM, 0).getDate();
    var mn = C.MESI;
    var h = '<div class="mcal-header"><button onclick="panCalPrev()">' + C.SVG_NAV_LEFT + '</button><span class="mcal-title">' + mn[_pCalM] + ' ' + _pCalY + '</span><button onclick="panCalNext()">' + C.SVG_NAV_RIGHT + '</button></div><div class="mcal-grid">';
    ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(function(d) { h += '<div class="mcal-dow">' + d + '</div>'; });
    for (var i = fd - 1; i >= 0; i--) {
      var day = pmd - i;
      var pm = _pCalM === 0 ? 11 : _pCalM - 1, py = _pCalM === 0 ? _pCalY - 1 : _pCalY;
      var ds = py + '-' + String(pm + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      h += '<div class="mcal-day other-month" onclick="pickPanDay(\'' + ds + '\')">' + day + '</div>';
    }
    for (var d2 = 1; d2 <= dim; d2++) {
      var ds2 = _pCalY + '-' + String(_pCalM + 1).padStart(2, '0') + '-' + String(d2).padStart(2, '0');
      var cls = ['mcal-day', ds2 === today ? 'today' : '', ds2 === sel ? 'selected' : ''].filter(Boolean).join(' ');
      h += '<div class="' + cls + '" onclick="pickPanDay(\'' + ds2 + '\')">' + d2 + '</div>';
    }
    var rem = (7 - ((fd + dim) % 7)) % 7;
    for (var d3 = 1; d3 <= rem; d3++) {
      var nm = _pCalM === 11 ? 0 : _pCalM + 1, ny = _pCalM === 11 ? _pCalY + 1 : _pCalY;
      var ds3 = ny + '-' + String(nm + 1).padStart(2, '0') + '-' + String(d3).padStart(2, '0');
      h += '<div class="mcal-day other-month" onclick="pickPanDay(\'' + ds3 + '\')">' + d3 + '</div>';
    }
    h += '</div>';
    var el = C.$('panMiniCal');
    if (el) el.innerHTML = h;
  }

  function pickPanDay(ds) {
    _panDate = ds;
    var d = new Date(ds);
    if (d.getFullYear() !== _pCalY || d.getMonth() !== _pCalM) {
      _pCalY = d.getFullYear(); _pCalM = d.getMonth();
    }
    renderPanMiniCal();
    loadPanoramica();
  }

  function panCalPrev() {
    _pCalM--; if (_pCalM < 0) { _pCalM = 11; _pCalY--; }
    renderPanMiniCal();
  }

  function panCalNext() {
    _pCalM++; if (_pCalM > 11) { _pCalM = 0; _pCalY++; }
    renderPanMiniCal();
  }

  /* ── Data loading ───────────────────────────────────────────── */
  function loadPanoramica() {
    var dateLabel = C.$('panDateLabel');
    if (dateLabel) {
      var dd = new Date(_panDate);
      dateLabel.textContent = C.DOW_SHORT[(dd.getDay() + 6) % 7] + ' ' + dd.getDate() + ' ' + C.MESI[dd.getMonth()] + ' ' + dd.getFullYear();
    }
    return Ag.Api.fetch('/appointments/panoramica?date=' + _panDate).then(function(j) {
      if (!j) return;
      _panData = j.data || [];
      renderBoard();
    });
  }

  /* ── Render board (dispatcher) ──────────────────────────────── */
  function renderBoard() {
    var board = C.$('panBoard');
    if (!board) return;

    // Build shared groups: flusso → rooms → appts
    var flussi = {};
    var unassigned = [];

    for (var i = 0; i < _panData.length; i++) {
      var a = _panData[i];
      if (!a.room_id || !a.flusso_id) { unassigned.push(a); continue; }
      if (!flussi[a.flusso_id]) {
        flussi[a.flusso_id] = { id: a.flusso_id, name: a.flusso_name || 'Flusso #' + a.flusso_id, sede_name: a.sede_name || '', area_name: a.area_name || '', macro_name: a.macro_name || '', rooms: {} };
      }
      if (!flussi[a.flusso_id].rooms[a.room_id]) {
        flussi[a.flusso_id].rooms[a.room_id] = { id: a.room_id, name: a.room_name || 'Postazione #' + a.room_id, station_type: a.station_type, appts: [] };
      }
      flussi[a.flusso_id].rooms[a.room_id].appts.push(a);
    }

    // Include empty postazioni from tree
    if (S.treeNodes) {
      for (var ti = 0; ti < S.treeNodes.length; ti++) {
        var tn = S.treeNodes[ti];
        if (tn.type !== 'postazione' || !tn.active) continue;
        var parentFl = S.nodeMap[tn.parent_id];
        if (!parentFl) continue;
        var flId = parentFl.id;
        if (!flussi[flId]) {
          var parentSede = S.nodeMap[parentFl.parent_id];
          var parentArea = parentSede ? S.nodeMap[parentSede.parent_id] : null;
          var parentMacro = parentArea ? S.nodeMap[parentArea.parent_id] : null;
          flussi[flId] = { id: flId, name: parentFl.name, sede_name: parentSede ? parentSede.name : '', area_name: parentArea ? parentArea.name : '', macro_name: parentMacro ? parentMacro.name : '', rooms: {} };
        }
        if (!flussi[flId].rooms[tn.id]) {
          flussi[flId].rooms[tn.id] = { id: tn.id, name: tn.name, station_type: tn.station_type, appts: [] };
        }
      }
    }

    _panFlussi = flussi;
    _panUnassigned = unassigned;

    board.setAttribute('data-view', _panView);
    var hint = C.$('panToolbarHint');
    if (hint) {
      hint.textContent = _panView === 'vertical'
        ? 'Trascina le card sulle altre colonne per cambiare postazione'
        : 'Trascina le card per spostare gli appuntamenti tra postazioni';
    }

    if (_panView === 'vertical') {
      board.innerHTML = renderVerticalBoard(flussi, unassigned);
    } else {
      board.innerHTML = renderKanbanBoard(flussi, unassigned);
    }
  }

  /* ── View: Kanban ───────────────────────────────────────────── */
  function renderKanbanBoard(flussi, unassigned) {
    var flussoIds = Object.keys(flussi);
    if (!flussoIds.length && !unassigned.length) {
      return '<div class="pan-empty">' + C.SVG_CALENDAR_REMOVE + '<p>Nessun appuntamento per questa data</p></div>';
    }

    var h = '';
    for (var fi = 0; fi < flussoIds.length; fi++) {
      var fId = flussoIds[fi];
      var fl = flussi[fId];
      var breadcrumb = [fl.macro_name, fl.area_name, fl.sede_name].filter(Boolean).join(' \u203A ');
      var totalAppts = 0;
      var roomIds = Object.keys(fl.rooms);
      for (var ri = 0; ri < roomIds.length; ri++) totalAppts += fl.rooms[roomIds[ri]].appts.length;

      h += '<div class="pan-flusso">';
      h += '<div class="pan-flusso-header"><div class="pan-flusso-title">' + C.esc(fl.name) + '</div><div class="pan-flusso-breadcrumb">' + C.esc(breadcrumb) + '</div><span class="pan-flusso-count">' + totalAppts + '</span></div>';
      h += '<div class="pan-columns">';

      for (var ci = 0; ci < roomIds.length; ci++) {
        var rId = roomIds[ci];
        var room = fl.rooms[rId];
        var stIcon = room.station_type && C.STATION_ICONS[room.station_type] ? C.STATION_ICONS[room.station_type] : '';
        h += '<div class="pan-column" data-room-id="' + C.esc(rId) + '">';
        h += '<div class="pan-col-header">' + stIcon + '<span class="pan-col-name">' + C.esc(room.name) + '</span><span class="pan-col-count">' + room.appts.length + '</span>' + renderColAction(fId, rId) + '</div>';
        h += '<div class="pan-col-body" data-room-id="' + C.esc(rId) + '" ondragover="panDragOver(event)" ondrop="panDrop(event)">';

        room.appts.sort(function(a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); });
        for (var ai = 0; ai < room.appts.length; ai++) h += renderCard(room.appts[ai]);
        if (!room.appts.length) h += '<div class="pan-card-empty">Nessun appuntamento</div>';

        h += '</div></div>';
      }

      h += '</div></div>';
    }

    if (unassigned.length) {
      h += '<div class="pan-flusso pan-unassigned">';
      h += '<div class="pan-flusso-header"><div class="pan-flusso-title">Non assegnati</div><div class="pan-flusso-breadcrumb">Appuntamenti senza postazione</div><span class="pan-flusso-count">' + unassigned.length + '</span></div>';
      h += '<div class="pan-columns"><div class="pan-column pan-column-wide">';
      h += '<div class="pan-col-body pan-col-unassigned">';
      unassigned.sort(function(a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); });
      for (var ui = 0; ui < unassigned.length; ui++) h += renderCard(unassigned[ui]);
      h += '</div></div></div></div>';
    }
    return h;
  }

  /* ── View: Vertical (time-axis columns side-by-side) ────────── */
  function renderVerticalBoard(flussi, unassigned) {
    var flussoIds = Object.keys(flussi);
    if (!flussoIds.length && !unassigned.length) {
      return '<div class="pan-empty">' + C.SVG_CALENDAR_REMOVE + '<p>Nessun appuntamento per questa data</p></div>';
    }

    var bodyH = Math.round((C.DAY_END - C.DAY_START) * VERT_PX_PER_MIN);

    // Time axis column (hours)
    var axis = '<div class="pan-vert-axis" style="height:' + bodyH + 'px">';
    for (var m = C.DAY_START; m <= C.DAY_END; m += 60) {
      var top = Math.round((m - C.DAY_START) * VERT_PX_PER_MIN);
      axis += '<div class="pan-vert-hour" style="top:' + top + 'px">' + C.toTime(m) + '</div>';
    }
    axis += '</div>';

    var h = '<div class="pan-vertical">';
    h += '<div class="pan-vert-axis-wrap">';
    h += '<div class="pan-vert-axis-header">Ora</div>';
    h += axis;
    h += '</div>';
    h += '<div class="pan-vert-scroll">';

    for (var fi = 0; fi < flussoIds.length; fi++) {
      var fId = flussoIds[fi];
      var fl = flussi[fId];
      var breadcrumb = [fl.macro_name, fl.area_name, fl.sede_name].filter(Boolean).join(' \u203A ');
      var roomIds = Object.keys(fl.rooms);
      if (!roomIds.length) continue;

      h += '<div class="pan-vert-flusso" style="--col-count:' + roomIds.length + '">';
      h += '<div class="pan-vert-flusso-header" title="' + C.esc(breadcrumb) + '"><span class="pan-vert-flusso-title">' + C.esc(fl.name) + '</span><span class="pan-vert-flusso-sub">' + C.esc(breadcrumb) + '</span></div>';
      h += '<div class="pan-vert-cols">';

      for (var ci = 0; ci < roomIds.length; ci++) {
        var rId = roomIds[ci];
        var room = fl.rooms[rId];
        var stIcon = room.station_type && C.STATION_ICONS[room.station_type] ? C.STATION_ICONS[room.station_type] : '';
        h += '<div class="pan-vert-col" data-room-id="' + C.esc(rId) + '">';
        h += '<div class="pan-vert-col-header">' + stIcon + '<span class="pan-vert-col-name">' + C.esc(room.name) + '</span><span class="pan-col-count">' + room.appts.length + '</span>' + renderColAction(fId, rId) + '</div>';
        h += '<div class="pan-col-body pan-vert-col-body" data-room-id="' + C.esc(rId) + '" style="height:' + bodyH + 'px" ondragover="panDragOver(event)" ondrop="panDrop(event)">';

        // Hour grid lines
        for (var gm = C.DAY_START + 60; gm < C.DAY_END; gm += 60) {
          var gt = Math.round((gm - C.DAY_START) * VERT_PX_PER_MIN);
          h += '<div class="pan-vert-grid" style="top:' + gt + 'px"></div>';
        }

        for (var ai = 0; ai < room.appts.length; ai++) h += renderVertAppt(room.appts[ai]);

        h += '</div></div>';
      }

      h += '</div></div>';
    }

    h += '</div>'; // pan-vert-scroll

    if (unassigned.length) {
      h += '<div class="pan-vert-unassigned">';
      h += '<div class="pan-flusso-header"><div class="pan-flusso-title">Non assegnati</div><div class="pan-flusso-breadcrumb">Appuntamenti senza postazione</div><span class="pan-flusso-count">' + unassigned.length + '</span></div>';
      h += '<div class="pan-col-body pan-col-unassigned">';
      unassigned.sort(function(a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); });
      for (var ui = 0; ui < unassigned.length; ui++) h += renderCard(unassigned[ui]);
      h += '</div></div>';
    }

    h += '</div>'; // pan-vertical
    return h;
  }

  function renderVertAppt(a) {
    if (!a.start_time || !a.end_time) return '';
    var sm = C.toMin(a.start_time.slice(0, 5));
    var em = C.toMin(a.end_time.slice(0, 5));
    var top = Math.round((sm - C.DAY_START) * VERT_PX_PER_MIN);
    var hgt = Math.max(18, Math.round((em - sm) * VERT_PX_PER_MIN));
    var typeClass = 'type-' + (a.type || 'visita');
    var stSvg = C.STATUS_SVG[a.status] || '';
    var timeStr = a.start_time.slice(0, 5) + '\u2013' + a.end_time.slice(0, 5);
    return '<div class="pan-vert-appt ' + typeClass + '" draggable="true" data-appt-id="' + a.id + '" style="top:' + top + 'px;height:' + hgt + 'px" ondragstart="panDragStart(event)" ondragend="panDragEnd(event)" title="' + C.esc((a.patient_name || '—') + ' · ' + (a.title || '')) + '">' +
      '<div class="pan-vert-appt-time">' + C.esc(timeStr) + '</div>' +
      '<div class="pan-vert-appt-patient">' + C.esc(a.patient_name || '—') + '</div>' +
      (hgt >= 38 ? '<div class="pan-vert-appt-title">' + C.esc(a.title || '') + '</div>' : '') +
      '<div class="pan-vert-appt-status">' + stSvg + '</div>' +
    '</div>';
  }

  function renderColAction(flussoId, roomId) {
    return '<button type="button" class="pan-col-action" onclick="panOpenRoom(' + flussoId + ',' + roomId + ')" aria-label="Apri postazione in modale" title="Apri postazione"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3H21V9"/><path d="M9 21H3V15"/><path d="M21 3L14 10"/><path d="M3 21L10 14"/></svg></button>';
  }

  /* ── View switch ────────────────────────────────────────────── */
  function setView(mode) {
    if (mode !== 'kanban' && mode !== 'vertical') return;
    if (_panView === mode) return;
    _panView = mode;
    var btns = document.querySelectorAll('.pan-view-btn');
    for (var i = 0; i < btns.length; i++) {
      var on = btns[i].getAttribute('data-view') === mode;
      btns[i].classList.toggle('is-active', on);
      btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    renderBoard();
  }

  /* ── Postazione detail modal ────────────────────────────────── */
  function openRoomModal(flussoId, roomId) {
    var bd = C.$('panRoomBackdrop');
    if (!bd) return;
    var fl = _panFlussi[flussoId];
    var room = fl && fl.rooms[roomId];
    if (!fl || !room) return;

    var title = C.$('panRoomTitle');
    var bc = C.$('panRoomBreadcrumb');
    var dateEl = C.$('panRoomDate');
    var body = C.$('panRoomBody');
    var breadcrumb = [fl.macro_name, fl.area_name, fl.sede_name, fl.name].filter(Boolean).join(' \u203A ');
    var stIcon = room.station_type && C.STATION_ICONS[room.station_type] ? C.STATION_ICONS[room.station_type] : '';

    if (title) title.innerHTML = stIcon + '<span>' + C.esc(room.name) + '</span>';
    if (bc) bc.textContent = breadcrumb;
    if (dateEl) {
      var dd = new Date(_panDate);
      dateEl.textContent = C.DOW_SHORT[(dd.getDay() + 6) % 7] + ' ' + dd.getDate() + ' ' + C.MESI[dd.getMonth()] + ' ' + dd.getFullYear();
    }
    if (body) body.innerHTML = renderRoomModalBody(room);
    bd.classList.add('active');
  }

  function renderRoomModalBody(room) {
    var bodyH = Math.round((C.DAY_END - C.DAY_START) * VERT_PX_PER_MIN);
    var axis = '<div class="pan-vert-axis" style="height:' + bodyH + 'px">';
    for (var m = C.DAY_START; m <= C.DAY_END; m += 60) {
      var top = Math.round((m - C.DAY_START) * VERT_PX_PER_MIN);
      axis += '<div class="pan-vert-hour" style="top:' + top + 'px">' + C.toTime(m) + '</div>';
    }
    axis += '</div>';

    var h = '<div class="pan-room-grid">';
    h += '<div class="pan-vert-axis-wrap">';
    h += '<div class="pan-vert-axis-header">Ora</div>';
    h += axis;
    h += '</div>';
    h += '<div class="pan-room-col">';
    h += '<div class="pan-col-body pan-vert-col-body pan-room-body-col" data-room-id="' + C.esc(room.id) + '" style="height:' + bodyH + 'px" ondragover="panDragOver(event)" ondrop="panDrop(event)">';
    for (var gm = C.DAY_START + 60; gm < C.DAY_END; gm += 60) {
      var gt = Math.round((gm - C.DAY_START) * VERT_PX_PER_MIN);
      h += '<div class="pan-vert-grid" style="top:' + gt + 'px"></div>';
    }
    room.appts.sort(function(a, b) { return (a.start_time || '').localeCompare(b.start_time || ''); });
    for (var ai = 0; ai < room.appts.length; ai++) h += renderVertAppt(room.appts[ai]);
    if (!room.appts.length) h += '<div class="pan-card-empty" style="margin:var(--sp-md)">Nessun appuntamento</div>';
    h += '</div>';
    h += '</div></div>';

    var listH = '<div class="pan-room-list"><div class="pan-room-list-title">Elenco appuntamenti (' + room.appts.length + ')</div>';
    if (room.appts.length) {
      for (var li = 0; li < room.appts.length; li++) listH += renderCard(room.appts[li]);
    } else {
      listH += '<div class="pan-card-empty">Nessun appuntamento</div>';
    }
    listH += '</div>';

    return h + listH;
  }

  function closeRoomModal() {
    var bd = C.$('panRoomBackdrop');
    if (bd) bd.classList.remove('active');
  }


  function renderCard(a) {
    var typeClass = 'type-' + (a.type || 'visita');
    var stSvg = C.STATUS_SVG[a.status] || '';
    var time = a.start_time ? a.start_time.slice(0, 5) : '';
    var endTime = a.end_time ? a.end_time.slice(0, 5) : '';
    var timeStr = time + (endTime ? '\u2013' + endTime : '');
    return '<div class="pan-card ' + typeClass + '" draggable="true" data-appt-id="' + a.id + '" ondragstart="panDragStart(event)" ondragend="panDragEnd(event)">' +
      '<div class="pan-card-time">' + C.esc(timeStr) + '</div>' +
      '<div class="pan-card-info">' +
        '<div class="pan-card-patient">' + C.esc(a.patient_name || '—') + '</div>' +
        '<div class="pan-card-title">' + C.esc(a.title || '') + '</div>' +
      '</div>' +
      '<div class="pan-card-status">' + stSvg + '</div>' +
    '</div>';
  }

  /* ── Drag & Drop ────────────────────────────────────────────── */
  function panDragStart(e) {
    var card = e.target.closest('.pan-card');
    if (!card) return;
    _dragApptId = card.dataset.apptId;
    card.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _dragApptId);
  }

  function panDragEnd(e) {
    var card = e.target.closest('.pan-card');
    if (card) card.classList.remove('is-dragging');
    _dragApptId = null;
    // Remove all drop-target highlights
    var cols = document.querySelectorAll('.pan-col-body.drop-target');
    for (var i = 0; i < cols.length; i++) cols[i].classList.remove('drop-target');
  }

  function panDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    var col = e.target.closest('.pan-col-body');
    if (col) col.classList.add('drop-target');
  }

  function panDrop(e) {
    e.preventDefault();
    var col = e.target.closest('.pan-col-body');
    if (!col) return;
    col.classList.remove('drop-target');
    var apptId = e.dataTransfer.getData('text/plain');
    var newRoomId = parseInt(col.dataset.roomId, 10);
    if (!apptId || isNaN(newRoomId)) return;

    // Find the appointment in _panData to get current details
    var appt = null;
    for (var i = 0; i < _panData.length; i++) {
      if (String(_panData[i].id) === String(apptId)) { appt = _panData[i]; break; }
    }
    if (!appt) return;
    if (appt.room_id === newRoomId) return; // same room — no-op

    // Call move endpoint
    Ag.Api.fetch('/appointments/' + apptId + '/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: appt.date,
        start_time: appt.start_time,
        end_time: appt.end_time,
        room_id: newRoomId
      })
    }).then(function(j) {
      if (!j) return;
      Ag.Toast.show('Appuntamento spostato');
      var bd = C.$('panRoomBackdrop');
      var modalOpen = bd && bd.classList.contains('active');
      loadPanoramica().then(function() {
        if (modalOpen) {
          // Re-open modal on the new room so the user sees where the appt landed
          var fl = null, flId = null;
          var keys = Object.keys(_panFlussi);
          for (var k = 0; k < keys.length; k++) {
            if (_panFlussi[keys[k]].rooms[newRoomId]) { fl = _panFlussi[keys[k]]; flId = keys[k]; break; }
          }
          if (fl) openRoomModal(flId, newRoomId);
          else closeRoomModal();
        }
      });
    });
  }

  /* ── Public API ─────────────────────────────────────────────── */
  Ag.Panoramica = Object.freeze({
    init: initPanoramicaLayer,
    load: loadPanoramica,
    setView: setView,
    openRoom: openRoomModal,
    closeRoom: closeRoomModal
  });

  /* ── Globals for HTML onclick ───────────────────────────────── */
  global.pickPanDay = pickPanDay;
  global.panCalPrev = panCalPrev;
  global.panCalNext = panCalNext;
  global.panDragStart = panDragStart;
  global.panDragEnd = panDragEnd;
  global.panDragOver = panDragOver;
  global.panDrop = panDrop;
  global.panSetView = setView;
  global.panOpenRoom = openRoomModal;
  global.closePanRoom = closeRoomModal;

})(window);
