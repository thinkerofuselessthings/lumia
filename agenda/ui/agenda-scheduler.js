/**
 * agenda-scheduler.js — Scheduler grid, appointment display, day config, drag/drop
 * Exposes: Ag.Scheduler + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;
  var _slotH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--slot-h')) || 14;
  var _detailSection = 'stato'; // active section in detail sidebar

  /* ── Detail HTML builder (sidebar-nav layout) ───────────── */
  var DETAIL_SECTIONS = [
    { key: 'stato',       label: 'Stato',       icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12L11 15L16 9"/></svg>' },
    { key: 'prestazione', label: 'Prestazione', icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3V2C9 1.45 9.45 1 10 1H14C14.55 1 15 1.45 15 2V3"/><path d="M9 11H15M9 15H13"/></svg>' },
    { key: 'paziente',    label: 'Paziente',    icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20C5 16.13 8.13 13 12 13C15.87 13 19 16.13 19 20"/></svg>' },
    { key: 'orario',      label: 'Orario',      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6V12L16 14"/></svg>' },
    { key: 'azioni',      label: 'Azioni',      icon: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>' }
  ];

  function buildDetailHtml(a, t, stLb, dateStr, roomName) {
    var navH = '<div class="adg-nav">' + DETAIL_SECTIONS.map(function(sec) {
      return '<button class="adg-nav-btn' + (sec.key === _detailSection ? ' is-active' : '') + '" onclick="switchDetailSection(\'' + sec.key + '\',' + a.id + ')">' + sec.icon + '<span>' + sec.label + '</span></button>';
    }).join('') + '</div>';

    var sH = '';
    switch (_detailSection) {
      case 'stato':
        sH = '<div class="adg-section"><div class="adg-section-title">Tipo</div><div class="adg-field"><div><span class="adg-type-badge" data-type="' + t + '">' + (C.TYPE_SVG[a.type] || '') + ' ' + (C.TYPE_LABELS_IT[a.type] || a.type || '\u2014') + '</span></div></div><div class="adg-section-title" style="margin-top:var(--sp-md)">Stato corrente</div><div class="adg-status-row">' + ['scheduled','confirmed','completed','cancelled','no_show'].map(function(s) { return '<button class="adg-status-btn' + (s === a.status ? ' current' : '') + '" onclick="apptDetailSetStatus(' + a.id + ',\'' + s + '\')" ' + (s === a.status ? 'disabled' : '') + '>' + C.STATUS_SVG[s] + ' ' + stLb[s] + '</button>'; }).join('') + '</div></div>';
        break;
      case 'prestazione':
        sH = '<div class="adg-section"><div class="adg-section-title">Prestazione</div>' +
          '<div class="adg-field"><div class="adg-field-label">' + C.SVG_TITLE + ' Titolo</div><div class="adg-field-value">' + (C.esc(a.title) || '\u2014') + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">Codice</div><div class="adg-field-value mono">' + (C.esc(a.prestazione_code) || '\u2014') + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">Descrizione</div><div class="adg-field-value">' + (C.esc(a.description) || '\u2014') + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">Note</div><div class="adg-field-value">' + (C.esc(a.notes) || '\u2014') + '</div></div>' +
          '</div>';
        break;
      case 'paziente':
        sH = '<div class="adg-section"><div class="adg-section-title">Paziente</div>' +
          '<div class="adg-field"><div class="adg-field-label">' + C.SVG_PATIENT + ' Nome</div><div class="adg-field-value">' + (C.esc(a.patient_name) || '\u2014') + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">' + C.SVG_CF + ' Codice Fiscale</div><div class="adg-field-value mono">' + (C.esc(a.patient_id) || '\u2014') + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">Data di nascita</div><div class="adg-field-value">' + (C.esc(a.birth_date) || '\u2014') + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">Telefono</div><div class="adg-field-value">' + (C.esc(a.phone) || '\u2014') + '</div></div>' +
          '</div>';
        break;
      case 'orario':
        sH = '<div class="adg-section"><div class="adg-section-title">Orario e Postazione</div>' +
          '<div class="adg-field"><div class="adg-field-label">' + C.SVG_CLOCK + ' Data</div><div class="adg-field-value">' + dateStr + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">' + C.SVG_CLOCK + ' Orario</div><div class="adg-field-value">' + C.esc(a.start_time) + ' \u2013 ' + C.esc(a.end_time) + '</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">' + C.SVG_DURATION + ' Durata</div><div class="adg-field-value">' + (a.duration_min || '\u2014') + ' min</div></div>' +
          '<div class="adg-field"><div class="adg-field-label">Postazione</div><div class="adg-field-value">' + C.esc(roomName) + '</div></div>' +
          '</div>';
        break;
      case 'azioni':
        sH = '<div class="adg-section"><div class="adg-section-title">Azioni</div>' +
          '<div class="adg-actions-grid">' +
          '<button class="btn btn-sm" onclick="editApptFromDetail()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16.03 3.97L20.03 7.97M2 22L5.7 21.07C6.09 20.97 6.29 20.92 6.47 20.84C6.63 20.77 6.79 20.69 6.93 20.58C7.09 20.47 7.23 20.33 7.5 20.06L19 8.56C19.55 8.01 19.83 7.73 19.94 7.42C20.03 7.14 20.03 6.85 19.94 6.57C19.83 6.26 19.55 5.98 19 5.44L18.57 5C18.02 4.45 17.74 4.17 17.43 4.06C17.15 3.97 16.86 3.97 16.58 4.06C16.27 4.17 15.99 4.45 15.44 5L3.94 16.5C3.67 16.77 3.53 16.91 3.42 17.07C3.31 17.21 3.23 17.37 3.16 17.53C3.08 17.71 3.03 17.91 2.93 18.3L2 22Z"/></svg> Modifica</button>' +
          '<div id="prestModuleButtons" class="appt-detail-prest-btns"></div>' +
          '<button class="btn btn-sm btn-danger" onclick="delApptFromDetail()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 5.5L18.87 15.39C18.7 18.05 18.61 19.38 18.03 20.37C17.52 21.24 16.74 21.91 15.82 22.26C14.78 22.66 13.45 22.66 10.79 22.66H10.21C7.55 22.66 6.22 22.66 5.18 22.26C4.26 21.91 3.48 21.24 2.97 20.37C2.39 19.38 2.3 18.05 2.13 15.39L1.5 5.5"/><path d="M21 5.5H0"/><path d="M7.61 5.5V4.17C7.61 2.97 8.56 2 9.72 2H11.28C12.44 2 13.39 2.97 13.39 4.17V5.5"/></svg> Elimina</button>' +
          '</div></div>';
        break;
    }

    return '<div class="adg-split">' + navH + '<div class="adg-panel">' + sH + '</div></div>';
  }

  function visibleRooms() {
    var jsDow = new Date(S.selDate).getDay(), schedDow = jsDow === 0 ? 7 : jsDow;
    // Rooms that have appointments today must always be shown (even on closed days)
    var roomsWithAppts = {};
    S.appointments.forEach(function(a) { if (a.room_id) roomsWithAppts[a.room_id] = true; });
    return S.postazioni.filter(function(p) {
      if (roomsWithAppts[p.id]) return true;
      if (S.dayOverrides[p.id] !== undefined) return !!S.dayOverrides[p.id];
      var raw = p.schedule || C.DEFAULT_SCHEDULE;
      try { var sc = JSON.parse(raw); var day = sc[schedDow]; if (!day || !day.active) return false; } catch(e) {}
      return true;
    });
  }

  function setSlotZoom(px) {
    _slotH = px;
    document.documentElement.style.setProperty('--slot-h', px + 'px');
    document.querySelectorAll('.zoom-opt').forEach(function(b) { b.classList.toggle('active', +b.dataset.px === px); });
    renderScheduler();
  }

  function openZoomCfg() {
    document.querySelectorAll('.zoom-opt').forEach(function(b) { b.classList.toggle('active', +b.dataset.px === _slotH); });
    C.$('zoomCfgBackdrop').classList.add('active');
  }
  function closeZoomCfg() { C.$('zoomCfgBackdrop').classList.remove('active'); }

  function prevDay() { var d = new Date(S.selDate); d.setDate(d.getDate() - 1); S.selDate = C.fmtDate(d); if (Ag.Main) Ag.Main.loadAll(); }
  function nextDay() { var d = new Date(S.selDate); d.setDate(d.getDate() + 1); S.selDate = C.fmtDate(d); if (Ag.Main) Ag.Main.loadAll(); }
  function goToday() { S.selDate = C.fmtDate(new Date()); if (Ag.Main) Ag.Main.loadAll(); Ag.Calendar.syncCal(); }

  /* ── Overlap computation ───────────────────────────────────── */
  function computeOverlapColumns(appts) {
    var result = new Map();
    if (!appts.length) return result;
    var sorted = appts.slice().sort(function(a, b) { return C.toMin(a.start_time) - C.toMin(b.start_time) || C.toMin(a.end_time) - C.toMin(b.end_time); });
    var cols = [], assigned = new Map();
    for (var ai = 0; ai < sorted.length; ai++) {
      var a = sorted[ai], s = C.toMin(a.start_time), e = C.toMin(a.end_time);
      var placed = -1;
      for (var ci = 0; ci < cols.length; ci++) { if (cols[ci] <= s) { placed = ci; break; } }
      if (placed === -1) { placed = cols.length; cols.push(0); }
      cols[placed] = e; assigned.set(a.id, placed);
    }
    var groups = [], visited = new Set();
    for (var i = 0; i < sorted.length; i++) {
      if (visited.has(i)) continue;
      var group = [i]; visited.add(i);
      var maxEnd = C.toMin(sorted[i].end_time);
      for (var j = i + 1; j < sorted.length; j++) {
        if (visited.has(j)) continue;
        if (C.toMin(sorted[j].start_time) < maxEnd) { group.push(j); visited.add(j); maxEnd = Math.max(maxEnd, C.toMin(sorted[j].end_time)); }
      }
      var usedCols = new Set(group.map(function(gi) { return assigned.get(sorted[gi].id); }));
      var total = usedCols.size;
      for (var gi2 = 0; gi2 < group.length; gi2++) result.set(sorted[group[gi2]].id, { col: assigned.get(sorted[group[gi2]].id), total: total });
    }
    return result;
  }

  /* ── Render ────────────────────────────────────────────────── */
  function renderScheduler() {
    var vr = visibleRooms(), totalSlots = (C.DAY_END - C.DAY_START) / C.SLOT_MIN, totalH = totalSlots * _slotH;
    var grid = C.$('scheduler');
    if (!grid) return;
    initSchedulerDelegation();
    grid.innerHTML = '';
    if (vr.length === 0) {
      grid.style.gridTemplateColumns = '1fr';
      grid.innerHTML = '<div class="scheduler-empty">' + C.SVG_CALENDAR_REMOVE + '<div class="se-title">Nessuna postazione attiva</div><div class="se-sub">' + (S.postazioni.length ? 'Tutte le postazioni sono chiuse per questo giorno' : 'Seleziona un flusso con postazioni attive') + '</div></div>';
      return;
    }
    grid.style.gridTemplateColumns = 'var(--time-col) repeat(' + vr.length + ',minmax(200px,1fr))';
    // Header
    var corner = document.createElement('div'); corner.className = 'col-header time-gutter'; grid.appendChild(corner);
    vr.forEach(function(room) {
      var h = document.createElement('div'); h.className = 'col-header';
      var cnt = S.appointments.filter(function(a) { return a.room_id === room.id; }).length;
      var stIco = room.station_type ? C.STATION_ICONS[room.station_type] + ' ' : '';
      h.innerHTML = stIco + C.esc(room.name) + (cnt ? ' <span class="room-count">' + cnt + '</span>' : '');
      grid.appendChild(h);
    });
    // Time gutter
    var gutter = document.createElement('div'); gutter.className = 'time-gutter';
    gutter.style.height = totalH + 'px'; gutter.style.position = 'relative';
    for (var m = C.DAY_START + 30; m < C.DAY_END; m += 30) {
      var lbl = document.createElement('div'); lbl.className = 'time-label';
      lbl.style.top = ((m - C.DAY_START) / C.SLOT_MIN * _slotH) + 'px';
      lbl.textContent = C.toTime(m); gutter.appendChild(lbl);
    }
    grid.appendChild(gutter);
    // Columns
    vr.forEach(function(room) {
      var col = document.createElement('div'); col.className = 'grid-col';
      col.style.height = totalH + 'px'; col.dataset.roomId = room.id;
      for (var m2 = C.DAY_START; m2 < C.DAY_END; m2 += 60) {
        var l = document.createElement('div'); l.className = 'hour-line';
        l.style.top = ((m2 - C.DAY_START) / C.SLOT_MIN * _slotH) + 'px'; col.appendChild(l);
      }
      for (var m3 = C.DAY_START + 30; m3 < C.DAY_END; m3 += 60) {
        var l2 = document.createElement('div'); l2.className = 'half-line';
        l2.style.top = ((m3 - C.DAY_START) / C.SLOT_MIN * _slotH) + 'px'; col.appendChild(l2);
      }
      for (var m4 = C.DAY_START; m4 < C.DAY_END; m4 += C.SLOT_MIN) {
        var s = document.createElement('div'); s.className = 'slot-target';
        s.style.top = ((m4 - C.DAY_START) / C.SLOT_MIN * _slotH) + 'px';
        s.dataset.time = C.toTime(m4); s.dataset.roomId = room.id; s.dataset.min = m4;
        col.appendChild(s);
      }
      var roomAppts = S.appointments.filter(function(a) { return a.room_id === room.id; }).filter(function(a) { var sm = C.toMin(a.start_time); return sm >= C.DAY_START && sm < C.DAY_END; });
      var overlapCols = computeOverlapColumns(roomAppts);
      roomAppts.forEach(function(a) {
        var sm = C.toMin(a.start_time), em = C.toMin(a.end_time);
        var top = (sm - C.DAY_START) / C.SLOT_MIN * _slotH, height = Math.max((em - sm) / C.SLOT_MIN * _slotH, _slotH);
        var oc = overlapCols.get(a.id) || { col: 0, total: 1 }, colW = 100 / oc.total;
        var b = document.createElement('div'); b.className = 'appt-block';
        b.dataset.type = a.type; b.dataset.id = a.id; b.dataset.status = a.status || 'scheduled';
        b.style.top = top + 'px'; b.style.height = height + 'px';
        b.style.left = (oc.col * colW) + '%'; b.style.width = Math.max(colW - 8, colW * 0.82) + '%';
        b.draggable = true;
        var sP = height >= _slotH * 2.5, sT = height >= _slotH * 2, sSt = height >= _slotH * 3.5;
        var stLb = { scheduled: 'Pianificato', confirmed: 'Confermato', completed: 'Completato', cancelled: 'Annullato', no_show: 'Non presentato' };
        var stSvg = C.STATUS_SVG[a.status || 'scheduled'] || C.STATUS_SVG.scheduled;
        var titleLabel = a.title && a.title !== (C.TYPE_LABELS_IT[a.type] || '') ? C.esc(a.title) : (C.TYPE_LABELS_IT[a.type] || '');
        b.innerHTML = '<div class="appt-ico"><div class="appt-ico-box">' + (C.TYPE_SVG[a.type] || '') + '</div><span class="appt-type-label">' + titleLabel + '</span></div><div class="appt-info">' + (sP ? '<div class="appt-patient">' + C.SVG_PATIENT + ' ' + C.esc(a.patient_name) + '</div>' : '') + (sT ? '<div class="appt-time">' + C.SVG_CLOCK + ' ' + C.esc(a.start_time) + '–' + C.esc(a.end_time) + '</div>' : '') + (sSt ? '<div class="appt-status">' + stSvg + ' ' + stLb[a.status || 'scheduled'] + '</div>' : '') + '</div>';
        col.appendChild(b);
      });
      if (roomAppts.length === 0) {
        var ph = document.createElement('div'); ph.className = 'room-placeholder';
        ph.innerHTML = C.SVG_CALENDAR_EMPTY + '<div class="rp-text">Nessun appuntamento</div>';
        col.appendChild(ph);
      }
      grid.appendChild(col);
    });
  }

  /* ── Range selection ───────────────────────────────────────── */
  function hlRange(col) {
    var mn = Math.min(S.rangeS, S.rangeE), mx = Math.max(S.rangeS, S.rangeE);
    col.querySelectorAll('.slot-target').forEach(function(s) {
      var m = parseInt(s.dataset.min);
      s.classList.toggle('range-sel', m >= mn && m <= mx);
    });
  }
  function clrRange() { document.querySelectorAll('.slot-target.range-sel').forEach(function(s) { s.classList.remove('range-sel'); }); }

  function _isWeekendBlocked() {
    var jsDow = new Date(S.selDate).getDay(), schedDow = jsDow === 0 ? 7 : jsDow;
    var defSch = JSON.parse(C.DEFAULT_SCHEDULE);
    return !defSch[schedDow] || !defSch[schedDow].active;
  }

  document.addEventListener('mouseup', function() {
    if (!S.rangeSel) return;
    S.rangeSel = false;
    var s = Math.min(S.rangeS, S.rangeE), e = Math.max(S.rangeS, S.rangeE) + C.SLOT_MIN;
    clrRange();
    if (!S.closedDays[S.selDate] && !_isWeekendBlocked()) Ag.Wizard.open(null, S.rangeRoom, C.toTime(s), C.toTime(e));
    S.rangeRoom = null;
  });

  /* ── Event delegation ──────────────────────────────────────── */
  function initSchedulerDelegation() {
    var grid = C.$('scheduler');
    if (!grid) return;
    // Bind per-element so that remount after destroy re-wires correctly.
    if (grid._schedulerDelegationBound) return;
    grid._schedulerDelegationBound = true;
    grid.addEventListener('dragover', function(e) { var s = e.target.closest('.slot-target'); if (s) { e.preventDefault(); s.classList.add('drag-over'); } });
    grid.addEventListener('dragleave', function(e) { var s = e.target.closest('.slot-target'); if (s) s.classList.remove('drag-over'); });
    grid.addEventListener('drop', function(e) { var s = e.target.closest('.slot-target'); if (!s) return; e.preventDefault(); s.classList.remove('drag-over'); handleDrop(+s.dataset.roomId, s.dataset.time); });
    grid.addEventListener('mousedown', function(e) {
      var appt = e.target.closest('.appt-block');
      if (appt) { e.stopPropagation(); return; }
      var s = e.target.closest('.slot-target');
      if (!s || e.button !== 0 || S.closedDays[S.selDate] || _isWeekendBlocked()) return;
      S.rangeSel = true; S.rangeRoom = +s.dataset.roomId; S.rangeS = +s.dataset.min; S.rangeE = +s.dataset.min;
      s.classList.add('range-sel');
    });
    grid.addEventListener('mouseenter', function(e) {
      var s = e.target.closest('.slot-target');
      if (!s || !S.rangeSel || S.rangeRoom !== +s.dataset.roomId) return;
      S.rangeE = +s.dataset.min; hlRange(s.closest('.grid-col'));
    }, true);
    grid.addEventListener('dragstart', function(e) { var b = e.target.closest('.appt-block'); if (!b) return; S.dragApptId = +b.dataset.id; b.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
    grid.addEventListener('dragend', function(e) { var b = e.target.closest('.appt-block'); if (b) b.classList.remove('dragging'); });
    grid.addEventListener('click', function(e) { var b = e.target.closest('.appt-block'); if (!b) return; e.stopPropagation(); openApptDetail(+b.dataset.id); });
    grid.addEventListener('contextmenu', function(e) { var b = e.target.closest('.appt-block'); if (b) { e.preventDefault(); } });
  }

  /* ── Drop ──────────────────────────────────────────────────── */
  function handleDrop(roomId, startTime) {
    if (!S.dragApptId) return;
    var a = S.appointments.find(function(a2) { return a2.id === S.dragApptId; });
    if (!a) return;
    var dur = a.duration_min || 30;
    Ag.Api.fetch('/appointments/' + S.dragApptId + '/move', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: S.selDate, start_time: startTime, end_time: C.toTime(C.toMin(startTime) + dur), room_id: roomId })
    }).then(function(j) {
      S.dragApptId = null;
      if (!j) return;
      loadAppts().then(function() { renderScheduler(); Ag.Calendar.loadCounts().then(function() { Ag.Calendar.renderMiniCal(); }); });
    });
  }

  /* ── (context menu removed — all actions in detail modal) ── */
  function findA(id) { return S.appointments.find(function(a) { return a.id === id; }); }

  function setStatus(id, st) {
    Ag.Api.fetch('/appointments/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: st }) }).then(function(j) {
      if (!j) return;
      loadAppts().then(function() { renderScheduler(); });
    });
  }

  function delAppt(id) {
    Ag.Wizard.showConfirm('Eliminare questo appuntamento?').then(function(ok) {
      if (!ok) return;
      Ag.Api.fetch('/appointments/' + id, { method: 'DELETE' }).then(function(j) {
        if (!j) return;
        loadAppts().then(function() { renderScheduler(); Ag.Calendar.loadCounts().then(function() { Ag.Calendar.renderMiniCal(); }); });
      });
    });
  }

  /* ── Appointment detail ────────────────────────────────────── */
  var TYPE_PH_BG = { visita: 'var(--visita-bg)', terapia: 'var(--terapia-bg)', prestazione: 'var(--prestazione-bg)' };
  var TYPE_PH_COLOR = { visita: 'var(--visita-text)', terapia: 'var(--terapia-text)', prestazione: 'var(--prestazione-text)' };
  var TYPE_PH_ICON = { visita: 'hgi-stethoscope', terapia: 'hgi-injection', prestazione: 'hgi-clipboard' };
  var TYPE_PH_SVG = { visita: C.SVG_STETHOSCOPE, terapia: C.SVG_INJECTION, prestazione: C.SVG_CLIPBOARD };

  function openApptDetail(id) {
    S._detailApptId = id;
    var a = S.appointments.find(function(x) { return x.id === id; });
    if (!a) return;
    var t = a.type || 'visita';
    var stLb = { scheduled: 'Pianificato', confirmed: 'Confermato', completed: 'Completato', cancelled: 'Annullato', no_show: 'Non presentato' };
    var dn = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    var mn = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    var dt = new Date(a.date);
    var dateStr = dn[dt.getDay()] + ' ' + dt.getDate() + ' ' + mn[dt.getMonth()] + ' ' + dt.getFullYear();
    var room = S.nodeMap[a.room_id];
    var roomName = room ? room.name : 'Postazione #' + a.room_id;
    C.$('apptDetailTitle').textContent = a.title || 'Appuntamento';
    // Placeholder
    var ph = C.$('apptDetailPh');
    if (ph) {
      ph.style.background = TYPE_PH_BG[t] || 'var(--gray-50)';
      var phIcon = C.$('apptPhIcon');
      if (phIcon) { phIcon.innerHTML = TYPE_PH_SVG[t] || C.SVG_STETHOSCOPE; phIcon.className = 'appt-ph-icon'; phIcon.style.color = TYPE_PH_COLOR[t] || 'var(--gray-400)'; }
      var phBadge = C.$('apptPhBadge');
      if (phBadge) { phBadge.textContent = C.TYPE_LABELS_IT[t] || t; phBadge.style.background = TYPE_PH_BG[t] || 'var(--gray-100)'; phBadge.style.color = TYPE_PH_COLOR[t] || 'var(--gray-600)'; }
    }
    var body = C.$('apptDetailBody');
    body.innerHTML = buildDetailHtml(a, t, stLb, dateStr, roomName);
    C.$('apptDetailBackdrop').classList.add('active');
    // Show prestazione module buttons if applicable
    var btnC = C.$('prestModuleButtons');
    if (btnC) {
      var mods = (typeof PrestModules !== 'undefined') ? PrestModules.findFor(a) : [];
      btnC.innerHTML = mods.map(function(m) {
        return '<button class="btn btn-sm btn-accent" onclick="prestOpen(\'' + m.id + '\')"><i class="hgi-stroke ' + m.icon + '" style="font-size:13px"></i> ' + m.label + '</button>';
      }).join('');
    }
  }
  function closeApptDetail() { C.$('apptDetailBackdrop').classList.remove('active'); S._detailApptId = null; }
  function apptDetailSetStatus(id, st) {
    Ag.Api.fetch('/appointments/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: st }) }).then(function(j) {
      if (!j) return;
      loadAppts().then(function() { renderScheduler(); openApptDetail(id); });
    });
  }
  function editApptFromDetail() { var a = findA(S._detailApptId); closeApptDetail(); if (a) Ag.Wizard.open(a); }
  function delApptFromDetail() { var id = S._detailApptId; closeApptDetail(); if (id) delAppt(id); }
  function switchDetailSection(key, id) { _detailSection = key; openApptDetail(id); }

  /* ── Day config ────────────────────────────────────────────── */
  var dayCfgTab = 'status';
  function openDayConfig() {
    dayCfgTab = 'status';
    var d = new Date(S.selDate);
    var dn = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    C.$('dayCfgTitle').textContent = dn[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    renderDayCfgNav(); renderDayCfgContent();
    C.$('dayBackdrop').classList.add('active');
  }
  function closeDayConfig() { C.$('dayBackdrop').classList.remove('active'); if (Ag.Main) Ag.Main.loadAll(); }
  function switchDayCfg(tab) { dayCfgTab = tab; renderDayCfgNav(); renderDayCfgContent(); }
  function renderDayCfgNav() {
    C.$('dayCfgNav').innerHTML = C.DAY_CFG_TABS.map(function(s) {
      return '<button class="layer-sidebar-icon' + (s.key === dayCfgTab ? ' is-active' : '') + '" onclick="switchDayCfg(\'' + s.key + '\')"><span class="icon">' + C.tpl(s.icon) + '</span><span>' + s.label + '</span></button>';
    }).join('');
  }
  function renderDayCfgContent() {
    var el = C.$('dayCfgContent'), cd = S.closedDays[S.selDate];
    if (dayCfgTab === 'status') {
      el.innerHTML = '<div class="form-section"><div class="form-section-title">Stato giorno</div><div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-sm)"><span style="font-size:.75rem;font-weight:500">' + (cd ? 'Giorno chiuso' : 'Giorno aperto') + '</span><div class="toggle' + (cd ? '' : ' on') + '" onclick="toggleClosed()"></div></div>' + (!cd ? '<input id="closeReason" placeholder="Motivo chiusura (opzionale)" style="width:100%;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:var(--sp-xs) var(--sp-sm);font-size:.7rem;font-family:inherit;">' : '<div style="font-size:.7rem;color:#991b1b;padding:var(--sp-xs);background:#FEE2E2;border-radius:var(--radius-sm)">' + (cd.reason || 'Nessun motivo indicato') + '</div>') + '</div>';
    } else {
      var siteRooms = S.postazioni;
      var jsDow = new Date(S.selDate).getDay(), schedDow = jsDow === 0 ? 7 : jsDow;
      el.innerHTML = '<div class="form-section"><div class="form-section-title">Postazioni attive per questo giorno</div>' + (siteRooms.length ? siteRooms.map(function(rm) {
        var schedOpen = true;
        if (rm.schedule) { try { var sc = JSON.parse(rm.schedule); var day = sc[schedDow]; if (!day || !day.active) schedOpen = false; } catch(e) {} }
        var isOpen = S.dayOverrides[rm.id] !== undefined ? !!S.dayOverrides[rm.id] : schedOpen;
        return '<div class="day-cfg-item' + (isOpen ? '' : ' off') + '"><span>' + (rm.station_type ? C.STATION_ICONS[rm.station_type] + ' ' : '') + C.esc(rm.name) + (!schedOpen && S.dayOverrides[rm.id] === undefined ? ' <span style="font-size:.6rem;color:var(--gray-400)">(schedule: chiuso)</span>' : '') + '</span><div class="toggle' + (isOpen ? ' on' : '') + '" onclick="toggleRoomDay(' + rm.id + ',' + (isOpen ? 0 : 1) + ')"></div></div>';
      }).join('') : '<div style="font-size:.7rem;color:var(--gray-400)">Nessuna postazione</div>') + '</div>';
    }
  }

  function toggleClosed() {
    var prom;
    if (S.closedDays[S.selDate]) {
      prom = Ag.Api.fetch('/closed-days/' + S.selDate, { method: 'DELETE' });
    } else {
      var reason = C.$('closeReason')?.value?.trim() || null;
      prom = Ag.Api.fetch('/closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: S.selDate, reason: reason }) });
    }
    prom.then(function() {
      Ag.Calendar.loadClosed().then(function() { Ag.Calendar.renderMiniCal(); updateBanner(); renderDayCfgContent(); });
    });
  }

  function toggleRoomDay(rid, isOpen) {
    Ag.Api.fetch('/day-room-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: S.selDate, room_id: rid, is_open: isOpen }) }).then(function() {
      loadOverrides().then(function() { renderDayCfgContent(); renderScheduler(); });
    });
  }

  /* ── Data loaders ──────────────────────────────────────────── */
  function loadAppts() {
    return Ag.Api.fetch('/appointments?date=' + S.selDate).then(function(j) { S.appointments = (j && j.data) || []; });
  }
  function loadOverrides() {
    return Ag.Api.fetch('/day-room-overrides?date=' + S.selDate).then(function(j) {
      S.dayOverrides = {};
      for (var o of ((j && j.data) || [])) S.dayOverrides[o.room_id] = o.is_open;
    });
  }

  /* ── Date/banner ───────────────────────────────────────────── */
  function updateDateLabel() {
    var d = new Date(S.selDate);
    var dn = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    var mn = C.MESI;
    var el = C.$('dayCardDow'); if (el) el.textContent = dn[d.getDay()];
    var el2 = C.$('dayCardNum'); if (el2) el2.textContent = d.getDate();
    var el3 = C.$('dayCardMonth'); if (el3) el3.textContent = mn[d.getMonth()] + ' ' + d.getFullYear();
    var card = C.$('dayCard'); if (card) card.classList.toggle('is-closed', !!S.closedDays[S.selDate]);
  }
  function updateBanner() {
    var cd = S.closedDays[S.selDate], b = C.$('closedBanner');
    if (!b) return;
    if (cd) { b.textContent = 'Giorno chiuso' + (cd.reason ? ' — ' + cd.reason : ''); b.classList.add('show'); }
    else b.classList.remove('show');
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Scheduler = Object.freeze({
    render: renderScheduler, visibleRooms: visibleRooms,
    setSlotZoom: setSlotZoom, prevDay: prevDay, nextDay: nextDay, goToday: goToday,
    loadAppts: loadAppts, loadOverrides: loadOverrides,
    updateDateLabel: updateDateLabel, updateBanner: updateBanner,
    openDayConfig: openDayConfig, closeDayConfig: closeDayConfig,
    openApptDetail: openApptDetail, closeApptDetail: closeApptDetail,
    openZoomCfg: openZoomCfg, closeZoomCfg: closeZoomCfg,
    findA: findA
  });

  /* ── Globals for HTML onclick ──────────────────────────────── */
  global.setSlotZoom = setSlotZoom;
  global.openZoomCfg = openZoomCfg;
  global.closeZoomCfg = closeZoomCfg;
  global.prevDay = prevDay;
  global.nextDay = nextDay;
  global.goToday = goToday;
  global.openDayConfig = openDayConfig;
  global.closeDayConfig = closeDayConfig;
  global.switchDayCfg = switchDayCfg;
  global.toggleClosed = toggleClosed;
  global.toggleRoomDay = toggleRoomDay;
  global.openApptDetail = openApptDetail;
  global.closeApptDetail = closeApptDetail;
  global.apptDetailSetStatus = apptDetailSetStatus;
  global.editApptFromDetail = editApptFromDetail;
  global.delApptFromDetail = delApptFromDetail;
  global.switchDetailSection = switchDetailSection;
  global.findA = findA;
  global.setStatus = setStatus;
  global.delAppt = delAppt;

})(window);
