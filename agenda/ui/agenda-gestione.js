/**
 * agenda-gestione.js — Management layer: D3 tree, sede/flusso/station/service modals, calendar system
 * Exposes: Ag.Gestione + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  /* ══ GESTIONE LAYER ═════════════════════════════════════════ */
  function initGestioneLayer() {
    return Ag.Main.loadTree().then(function() {
      renderGestToolbar();
      return renderD3Tree(S.mgmtMacroareaId);
    });
  }

  function renderGestToolbar() {
    var macros = S.treeNodes.filter(function(n) { return n.type === 'macroarea'; });
    C.$('gestToolbar').innerHTML = '<select id="gestMaFilter" onchange="gestFilterMacroarea(this.value)"><option value="">Tutte le macroaree</option>' + macros.map(function(m) { return '<option value="' + m.id + '"' + (m.id === S.mgmtMacroareaId ? ' selected' : '') + '>' + C.esc(m.name) + '</option>'; }).join('') + '</select><div style="flex:1"></div><button class="btn btn-sm" onclick="addTreeRoot()">' + C.tpl('ico-add') + ' Macroarea</button><button class="btn btn-sm" onclick="fitTree()">' + C.tpl('ico-eye') + ' Centra</button><button class="btn btn-sm btn-primary" onclick="openGestPrestazioni()">' + C.tpl('ico-clipboard') + ' Prestazioni</button>';
  }

  function gestFilterMacroarea(val) { S.mgmtMacroareaId = val ? parseInt(val) : null; renderD3Tree(S.mgmtMacroareaId); }

  /* ══ D3 INTERACTIVE TREE ════════════════════════════════════ */
  function renderD3Tree(filterMacroareaId) {
    var container = document.getElementById('treeContainer'); if (!container) return Promise.resolve();
    if (typeof d3 === 'undefined') {
      container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--gray-500);font-size:.8rem">' +
        '<strong>D3.js non disponibile</strong><br>' +
        'Impossibile visualizzare l\u0027albero della struttura. Verifica la connessione o ricarica la pagina.' +
        '</div>';
      return Promise.resolve();
    }
    return Ag.Api.fetch('/nodes?tree=1').then(function(j) {
      var data = (j && j.data) || [];
      if (filterMacroareaId) data = data.filter(function(d) { return d.id === filterMacroareaId; });
      if (!data.length) { container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--gray-400);font-size:.8rem">Nessun nodo. Aggiungi la prima macroarea.</div>'; return; }
      var rootData = data.length === 1 ? data[0] : { id: 0, name: 'Organizzazione', type: 'root', children: data, active: 1 };
      var W = container.clientWidth || 800, H = container.clientHeight || 500;
      d3.select('#treeContainer svg').remove();
      var root = d3.hierarchy(rootData);
      var dx = 32, dy = Math.max(160, W / (root.height + 2));
      d3.tree().nodeSize([dx, dy])(root);
      var x0 = Infinity, x1 = -Infinity;
      root.each(function(d) { if (d.x > x1) x1 = d.x; if (d.x < x0) x0 = d.x; });
      S.treeSvg = d3.select('#treeContainer').append('svg').attr('width', W).attr('height', H).attr('viewBox', (-dy / 2) + ' ' + (x0 - dx) + ' ' + W + ' ' + (x1 - x0 + dx * 2)).style('font', '11px var(--font)');
      S.treeZoom = d3.zoom().scaleExtent([0.2, 4]).on('zoom', function(e) { S.treeG.attr('transform', e.transform); });
      S.treeSvg.call(S.treeZoom);
      S.treeG = S.treeSvg.append('g');
      S.treeG.append('g').selectAll('path').data(root.links()).join('path').attr('class', 'tree-link').attr('d', d3.linkHorizontal().x(function(d) { return d.y; }).y(function(d) { return d.x; }));
      var node = S.treeG.append('g').selectAll('g').data(root.descendants()).join('g').attr('transform', function(d) { return 'translate(' + d.y + ',' + d.x + ')'; }).attr('class', 'tree-node');
      node.append('circle').attr('r', function(d) { var t = d.data.type; return t === 'macroarea' ? 9 : t === 'area' ? 7 : t === 'sede' ? 6 : t === 'flusso' ? 5 : 4; }).attr('fill', function(d) { return d.data.active ? C.TYPE_COLORS[d.data.type] || '#999' : '#ddd'; }).attr('stroke', function(d) { return d.data.active ? 'none' : 'var(--gray-400)'; }).attr('stroke-dasharray', function(d) { return d.data.active ? '' : '3,2'; });
      node.append('text').attr('dy', '0.32em').attr('x', function(d) { return d.children ? -14 : 14; }).attr('text-anchor', function(d) { return d.children ? 'end' : 'start'; }).attr('fill', function(d) { return d.data.active ? 'var(--gray-800)' : 'var(--gray-400)'; }).style('font-weight', function(d) { return d.data.type === 'macroarea' ? '700' : '500'; }).style('font-size', function(d) { return d.data.type === 'macroarea' ? '13px' : '11px'; }).text(function(d) { return d.data.name; });
      node.filter(function(d) { return d.data.type !== 'root'; }).append('text').attr('dy', '1.6em').attr('x', function(d) { return d.children ? -14 : 14; }).attr('text-anchor', function(d) { return d.children ? 'end' : 'start'; }).style('font-size', '8px').style('text-transform', 'uppercase').style('letter-spacing', '.04em').attr('fill', 'var(--gray-400)').text(function(d) { var lbl = C.TYPE_LABELS[d.data.type] || ''; if (d.data.type === 'postazione' && d.data.station_type) lbl += ' · ' + d.data.station_type; return lbl; });
      node.filter(function(d) { return d.data.id; }).on('click', function(event, d) { event.stopPropagation(); showTreeAction(event, d.data); }).on('contextmenu', function(event, d) { event.preventDefault(); event.stopPropagation(); showTreeAction(event, d.data); });
    });
  }

  function fitTree() { if (!S.treeSvg || !S.treeZoom) return; S.treeSvg.transition().duration(300).call(S.treeZoom.transform, d3.zoomIdentity); }

  function showTreeAction(event, nd) {
    Ag.Scheduler.hideCtx();
    var m = C.$('ctxMenu');
    var canAdd = !!C.TYPE_CHILD[nd.type], childLabel = C.TYPE_LABELS[C.TYPE_CHILD[nd.type]] || '';
    var mgmt = '';
    if (nd.type === 'sede') mgmt = '<div style="border-top:1px solid var(--border-color);margin:4px 0"></div><button onclick="openGestSede(' + nd.id + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-settings') + '</span> Gestisci sede</button>';
    if (nd.type === 'flusso') mgmt = '<div style="border-top:1px solid var(--border-color);margin:4px 0"></div><button onclick="openGestFlusso(' + nd.id + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-settings') + '</span> Gestisci flusso</button>';
    if (nd.type === 'postazione') mgmt += '<div style="border-top:1px solid var(--border-color);margin:4px 0"></div><button onclick="openGestStation(' + nd.id + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-settings') + '</span> Gestisci postazione</button><button onclick="changeStationType(' + nd.id + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-hospital') + '</span> Cambia tipo</button>';
    m.innerHTML = '<div style="padding:6px 14px;font-weight:600;font-size:.75rem;border-bottom:1px solid var(--border-color)">' + C.esc(nd.name) + '<br><span style="font-weight:400;font-size:.6rem;color:var(--gray-400);text-transform:uppercase">' + (C.TYPE_LABELS[nd.type] || '') + '</span></div>' + (canAdd ? '<button onclick="addTreeChild(' + nd.id + ',\'' + C.TYPE_CHILD[nd.type] + '\');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-add') + '</span> Aggiungi ' + childLabel + '</button>' : '') + '<button onclick="renameTreeNode(' + nd.id + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-edit') + '</span> Rinomina</button><button onclick="toggleTreeNode(' + nd.id + ',' + (nd.active ? 0 : 1) + ');hideCtx()"><span class="icon icon-sm">' + C.tpl(nd.active ? 'ico-eye-off' : 'ico-eye') + '</span> ' + (nd.active ? 'Disattiva' : 'Attiva') + '</button>' + mgmt + '<button class="danger" onclick="deleteTreeNode(' + nd.id + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-delete') + '</span> Elimina</button>';
    m.style.display = 'block';
    m.style.left = Math.min(event.clientX || event.pageX, innerWidth - 220) + 'px';
    m.style.top = Math.min(event.clientY || event.pageY, innerHeight - 250) + 'px';
    setTimeout(function() { document.addEventListener('click', Ag.Scheduler.hideCtx, { once: true }); }, 0);
  }

  /* ── Tree CRUD ─────────────────────────────────────────────── */
  function addTreeRoot() {
    Ag.Wizard.showInputDlg('Nome macroarea').then(function(name) {
      if (!name || !name.trim()) return;
      Ag.Api.fetch('/nodes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'macroarea', name: name.trim() }) }).then(function() { refreshMgmtTree(); });
    });
  }

  function addTreeChild(pid, ctype) {
    var label = C.TYPE_LABELS[ctype] || 'nodo';
    Ag.Wizard.showInputDlg('Nome ' + label).then(function(name) {
      if (!name || !name.trim()) return;
      if (ctype === 'postazione') {
        showStationTypePicker().then(function(st) {
          if (st === null) return;
          Ag.Api.fetch('/nodes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: pid, type: ctype, name: name.trim(), station_type: st }) }).then(function() { refreshMgmtTree(); });
        });
      } else {
        Ag.Api.fetch('/nodes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ parent_id: pid, type: ctype, name: name.trim() }) }).then(function() { refreshMgmtTree(); });
      }
    });
  }

  function showStationTypePicker() {
    return new Promise(function(resolve) {
      var bd = document.createElement('div'); bd.className = 'confirm-backdrop active'; bd.style.zIndex = '520';
      bd.innerHTML = '<div class="confirm-box"><p style="font-weight:600;margin-bottom:8px">Tipo postazione</p><div style="display:flex;flex-direction:column;gap:6px">' + [['letto','Letto'],['poltrona','Poltrona'],['ambulatorio','Ambulatorio']].map(function(pair) { return '<button class="btn" style="justify-content:flex-start;gap:8px" data-st="' + pair[0] + '"><span style="font-size:14px">' + (C.STATION_ICONS[pair[0]] || '') + '</span> ' + pair[1] + '</button>'; }).join('') + '</div><div style="margin-top:8px;text-align:right"><button class="btn" data-st="__cancel">Annulla</button></div></div>';
      bd.addEventListener('click', function(e) { var btn = e.target.closest('[data-st]'); if (!btn) return; var v = btn.dataset.st; bd.remove(); resolve(v === '__cancel' ? null : v); });
      document.body.appendChild(bd);
    });
  }

  function renameTreeNode(id) {
    var nd = S.nodeMap[id];
    Ag.Wizard.showInputDlg('Nuovo nome', nd?.name || '').then(function(name) {
      if (!name || !name.trim()) return;
      Ag.Api.fetch('/nodes/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) }).then(function() { refreshMgmtTree(); });
    });
  }

  function toggleTreeNode(id, active) {
    Ag.Api.fetch('/nodes/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: active }) }).then(function() { refreshMgmtTree(); });
  }

  function deleteTreeNode(id) {
    Ag.Wizard.showConfirm('Eliminare questo nodo e tutti i figli?').then(function(ok) {
      if (!ok) return;
      Ag.Api.fetch('/nodes/' + id, { method: 'DELETE' }).then(function() { refreshMgmtTree(); });
    });
  }

  function refreshMgmtTree() {
    return Ag.Main.loadTree().then(function() { renderGestToolbar(); renderD3Tree(S.mgmtMacroareaId); });
  }

  function changeStationType(id) {
    showStationTypePicker().then(function(st) {
      if (!st) return;
      Ag.Api.fetch('/nodes/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ station_type: st }) }).then(function() { refreshMgmtTree(); });
    });
  }

  /* ══ MINI-CALENDARIO GESTIONE ═══════════════════════════════ */
  function renderGestCal(containerId, opts) {
    var el = C.$(containerId); if (!el) return;
    var y = opts.year, m = opts.month;
    var firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var todayStr = C.fmtDate(new Date());
    var markerMap = {};
    for (var mi = 0; mi < (opts.markers || []).length; mi++) { var mk = opts.markers[mi]; (markerMap[mk.date] = markerMap[mk.date] || []).push(mk); }

    var h = '<div class="gest-cal-hdr"><button onclick="window._gestCalNav(' + y + ',' + m + ',-1)">◄</button><span>' + C.MESI[m] + ' ' + y + '</span><button onclick="window._gestCalNav(' + y + ',' + m + ',1)">►</button></div>';
    h += '<div class="gest-cal-grid">';
    for (var di = 0; di < C.DOW_SHORT.length; di++) h += '<div class="dow">' + C.DOW_SHORT[di] + '</div>';
    for (var i = 0; i < firstDow; i++) h += '<div class="gest-cal-cell empty"></div>';
    for (var d = 1; d <= daysInMonth; d++) {
      var ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var isToday = ds === todayStr;
      var mks = markerMap[ds] || [];
      var dots = mks.map(function(mk2) { return '<span class="gest-cal-dot ' + mk2.type + '"></span>'; }).join('');
      h += '<div class="gest-cal-cell' + (isToday ? ' today' : '') + '" data-date="' + ds + '" onmousedown="window._gestCalMD(event,\'' + ds + '\')" onmouseenter="window._gestCalME(event,\'' + ds + '\')">' + d + '<div class="gest-cal-dots">' + dots + '</div></div>';
    }
    h += '</div>';
    el.innerHTML = h;

    global._gestCalOpts = opts;
    global._gestCalNav = function(cy, cm, dir) { var nm = cm + dir, ny = cy; if (nm < 0) { nm = 11; ny--; } if (nm > 11) { nm = 0; ny++; } opts.onNavigate(ny, nm); };
    global._gestCalDragStart = null; global._gestCalDragEnd = null;
    global._gestCalMD = function(e, ds2) { e.preventDefault(); global._gestCalDragStart = ds2; global._gestCalDragEnd = ds2; highlightRange(containerId, ds2, ds2); };
    global._gestCalME = function(e, ds2) { if (!global._gestCalDragStart) return; global._gestCalDragEnd = ds2; highlightRange(containerId, global._gestCalDragStart, ds2); };
    var upHandler = function(e) {
      if (!global._gestCalDragStart) return;
      var s2 = global._gestCalDragStart, en = global._gestCalDragEnd || s2;
      global._gestCalDragStart = null;
      clearHighlight(containerId);
      if (s2 === en) { opts.onDayClick && opts.onDayClick(s2, e, markerMap[s2] || []); }
      else { var sorted = [s2, en].sort(); opts.onRangeSelect && opts.onRangeSelect(sorted[0], sorted[1], e); }
    };
    document.removeEventListener('mouseup', global._gestCalUp);
    global._gestCalUp = upHandler;
    document.addEventListener('mouseup', global._gestCalUp);
  }

  function highlightRange(cid, s, e) {
    var sorted = [s, e].sort();
    var cells = C.$(cid).querySelectorAll('.gest-cal-cell[data-date]');
    for (var ci = 0; ci < cells.length; ci++) { var d = cells[ci].dataset.date; cells[ci].classList.toggle('range-sel', d >= sorted[0] && d <= sorted[1]); }
  }
  function clearHighlight(cid) { var el = C.$(cid); if (el) el.querySelectorAll('.range-sel').forEach(function(c) { c.classList.remove('range-sel'); }); }

  /* ── Calendar popover ──────────────────────────────────────── */
  function showCalPopover(x, y, html) {
    var pop = C.$('gestCalPopover');
    pop.innerHTML = html; pop.classList.add('active');
    pop.style.left = Math.min(x, innerWidth - 350) + 'px';
    pop.style.top = Math.min(y, innerHeight - 300) + 'px';
    setTimeout(function() { document.addEventListener('click', hideCalPopover, { once: true }); }, 10);
  }
  function hideCalPopover() { C.$('gestCalPopover').classList.remove('active'); }

  function calPopoverClose(date, apiEndpoint, refreshFn, rooms) {
    global._popRefreshFn = refreshFn;
    var catOpts = C.CLOSURE_CATS.map(function(c) { return '<option value="' + c.v + '">' + c.l + '</option>'; }).join('');
    var roomHtml = '';
    if (rooms && rooms.length) {
      roomHtml = '<div class="pop-rooms"><label style="font-weight:600">Postazioni:</label>' + rooms.map(function(r) { return '<div class="pop-room-row"><input type="checkbox" checked data-rid="' + r.id + '"> <span>' + (r.station_type ? C.STATION_ICONS[r.station_type] + ' ' : '') + C.esc(r.name) + '</span></div>'; }).join('') + '</div>';
    }
    return '<h4>\uD83D\uDCC5 ' + date + '</h4><div class="pop-row"><label>Categoria:</label><select id="popCat">' + catOpts + '</select></div><div class="pop-row"><label>Note:</label><input id="popNote" placeholder="Opzionale" style="flex:1"></div><div class="pop-row"><label><input type="checkbox" id="popRange" onchange="document.getElementById(\'popEndDate\').disabled=!this.checked"> Chiudi fino a:</label><input type="date" id="popEndDate" value="' + date + '" disabled></div>' + roomHtml + '<div class="pop-actions"><button class="btn btn-sm" onclick="hideCalPopover()">Annulla</button><button class="btn btn-sm btn-primary" onclick="popConfirmClose(\'' + date + '\',\'' + apiEndpoint + '\')">Conferma</button></div>';
  }

  function calPopoverRangeClose(start, end, apiEndpoint, refreshFn, rooms) {
    global._popRefreshFn = refreshFn;
    var catOpts = C.CLOSURE_CATS.map(function(c) { return '<option value="' + c.v + '">' + c.l + '</option>'; }).join('');
    var roomHtml = '';
    if (rooms && rooms.length) {
      roomHtml = '<div class="pop-rooms"><label style="font-weight:600">Postazioni:</label>' + rooms.map(function(r) { return '<div class="pop-room-row"><input type="checkbox" checked data-rid="' + r.id + '"> <span>' + (r.station_type ? C.STATION_ICONS[r.station_type] + ' ' : '') + C.esc(r.name) + '</span></div>'; }).join('') + '</div>';
    }
    return '<h4>\uD83D\uDCC5 ' + start + ' \u2192 ' + end + '</h4><div class="pop-row"><label>Categoria:</label><select id="popCat">' + catOpts + '</select></div><div class="pop-row"><label>Note:</label><input id="popNote" placeholder="Opzionale" style="flex:1"></div>' + roomHtml + '<div class="pop-actions"><button class="btn btn-sm" onclick="hideCalPopover()">Annulla</button><button class="btn btn-sm btn-primary" onclick="popConfirmRangeClose(\'' + start + '\',\'' + end + '\',\'' + apiEndpoint + '\')">Conferma</button></div>';
  }

  function popConfirmClose(date, apiEndpoint) {
    var cat = C.$('popCat')?.value || 'altro';
    var note = C.$('popNote')?.value?.trim() || null;
    var isRange = C.$('popRange')?.checked;
    var endDate = isRange ? (C.$('popEndDate')?.value || date) : date;
    var roomChecks = document.querySelectorAll('#gestCalPopover .pop-room-row input[data-rid]:checked');
    var roomIds = Array.from(roomChecks).map(function(c) { return parseInt(c.dataset.rid); });

    var prom = Promise.resolve();
    if (apiEndpoint === 'closed-days') {
      if (isRange) {
        var promises = [];
        for (var d = new Date(date); d <= new Date(endDate); d.setDate(d.getDate() + 1))
          promises.push(Ag.Api.fetch('/closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: C.fmtDate(d), reason: '[' + cat + '] ' + (note || '') }) }));
        prom = Promise.all(promises);
      } else {
        prom = Ag.Api.fetch('/closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: date, reason: '[' + cat + '] ' + (note || '') }) });
      }
      if (roomIds.length) prom = prom.then(function() { return Ag.Api.fetch('/station-closures/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_ids: roomIds, date_start: date, date_end: endDate, reason_category: cat, reason_note: note }) }); });
    } else if (apiEndpoint === 'list-closed-days') {
      if (isRange) {
        var promises2 = [];
        for (var d2 = new Date(date); d2 <= new Date(endDate); d2.setDate(d2.getDate() + 1))
          promises2.push(Ag.Api.fetch('/list-closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: C.fmtDate(d2), reason: '[' + cat + '] ' + (note || '') }) }));
        prom = Promise.all(promises2);
      } else {
        prom = Ag.Api.fetch('/list-closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: date, reason: '[' + cat + '] ' + (note || '') }) });
      }
    } else if (apiEndpoint === 'station-closures') {
      prom = Ag.Api.fetch('/station-closures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: parseInt(document.querySelector('#gestCalPopover').dataset.roomId), date_start: date, date_end: endDate, reason_category: cat, reason_note: note }) });
    }
    prom.then(function() { hideCalPopover(); if (typeof global._popRefreshFn === 'function') global._popRefreshFn(); });
  }

  function popConfirmRangeClose(start, end, apiEndpoint) {
    var cat = C.$('popCat')?.value || 'altro';
    var note = C.$('popNote')?.value?.trim() || null;
    var roomChecks = document.querySelectorAll('#gestCalPopover .pop-room-row input[data-rid]:checked');
    var roomIds = Array.from(roomChecks).map(function(c) { return parseInt(c.dataset.rid); });
    var prom = Promise.resolve();
    if (apiEndpoint === 'closed-days') {
      var promises = [];
      for (var d = new Date(start); d <= new Date(end); d.setDate(d.getDate() + 1))
        promises.push(Ag.Api.fetch('/closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: C.fmtDate(d), reason: '[' + cat + '] ' + (note || '') }) }));
      prom = Promise.all(promises);
      if (roomIds.length) prom = prom.then(function() { return Ag.Api.fetch('/station-closures/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_ids: roomIds, date_start: start, date_end: end, reason_category: cat, reason_note: note }) }); });
    } else if (apiEndpoint === 'list-closed-days') {
      var promises2 = [];
      for (var d2 = new Date(start); d2 <= new Date(end); d2.setDate(d2.getDate() + 1))
        promises2.push(Ag.Api.fetch('/list-closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: C.fmtDate(d2), reason: '[' + cat + '] ' + (note || '') }) }));
      prom = Promise.all(promises2);
    } else if (apiEndpoint === 'station-closures') {
      prom = Ag.Api.fetch('/station-closures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: parseInt(document.querySelector('#gestCalPopover').dataset.roomId), date_start: start, date_end: end, reason_category: cat, reason_note: note }) });
    }
    prom.then(function() { hideCalPopover(); if (typeof global._popRefreshFn === 'function') global._popRefreshFn(); });
  }

  function calDayDetailPopover(date, e, markers, apiEndpoint, delFn) {
    if (!markers.length) return false;
    var lines = markers.map(function(mk) {
      var cls = mk.type === 'closed' ? 'color:var(--error)' : mk.type === 'partial' ? 'color:var(--warning,#f59e0b)' : mk.type === 'open-exc' ? 'color:var(--success,#22c55e)' : '';
      var delBtn = '';
      if (mk.id && mk.deletable !== false) delBtn = ' <button class="btn-icon" style="font-size:.65rem" onclick="event.stopPropagation();' + delFn + '(' + (mk.id != null ? "'" + mk.id + "'" : "'" + mk.date + "'") + ');hideCalPopover()"><span class="icon icon-sm">' + C.tpl('ico-delete') + '</span></button>';
      return '<div class="pop-row" style="' + cls + '"><span>' + (mk.label || mk.type) + '</span>' + delBtn + '</div>';
    }).join('');
    showCalPopover(e.clientX || e.pageX || 200, e.clientY || e.pageY || 200, '<h4>\uD83D\uDCC5 ' + date + '</h4>' + lines);
    return true;
  }

  /* ══ GESTIONE SEDE MODAL ════════════════════════════════════ */
  function openGestSede(id) {
    S.gestSedeId = id; S.gestSedeTab = 'chiusure';
    var now = new Date(); S.gestSedeCalYear = now.getFullYear(); S.gestSedeCalMonth = now.getMonth();
    var nd = S.nodeMap[id];
    C.$('gestSedeTitle').textContent = nd ? C.esc(nd.name) : 'Sede';
    C.injectIcon('icoCloseGestSede', 'ico-cancel');
    renderGestSedeTabs(); renderGestSedeContent();
    C.$('gestSedeBackdrop').classList.add('active');
  }
  function closeGestSede() { C.$('gestSedeBackdrop').classList.remove('active'); }
  function switchGestSedeTab(t) { S.gestSedeTab = t; renderGestSedeTabs(); renderGestSedeContent(); }
  function renderGestSedeTabs() {
    var tabs = [{ key: 'chiusure', label: 'Chiusure Agenda' }, { key: 'override', label: 'Override Postazioni' }, { key: 'prestazioni', label: 'Prestazioni' }];
    C.$('gestSedeTabs').innerHTML = tabs.map(function(t) { return '<button class="' + (t.key === S.gestSedeTab ? 'active' : '') + '" onclick="switchGestSedeTab(\'' + t.key + '\')">' + t.label + '</button>'; }).join('');
  }

  function renderGestSedeContent() {
    var el = C.$('gestSedeBody');
    var delI = C.tpl('ico-delete'), addI = C.tpl('ico-add');
    if (S.gestSedeTab === 'chiusure') {
      Ag.Api.fetch('/closed-days').then(function(j) {
        var closed = (j && j.data) || [];
        var rooms = S.treeNodes.filter(function(n) { return n.type === 'postazione' && n.active && C.getAncestorIds(n).includes(S.gestSedeId); });
        var markers = closed.map(function(c) { return { date: c.date, type: 'closed', label: c.reason || 'Chiuso', id: c.date, deletable: true }; });
        el.innerHTML = '<div class="form-section-title">Chiusure Agenda — Calendario</div><div style="max-width:400px" id="sedeCalContainer"></div><div style="margin-top:var(--sp-sm);display:flex;gap:var(--sp-sm);flex-wrap:wrap;font-size:.65rem;color:var(--gray-500)"><span><span class="gest-cal-dot closed" style="display:inline-block;vertical-align:middle"></span> Chiuso</span><span><span class="gest-cal-dot open-exc" style="display:inline-block;vertical-align:middle"></span> Apertura ecc.</span></div>';
        renderGestCal('sedeCalContainer', {
          year: S.gestSedeCalYear, month: S.gestSedeCalMonth, markers: markers,
          onNavigate: function(y, m) { S.gestSedeCalYear = y; S.gestSedeCalMonth = m; renderGestSedeContent(); },
          onDayClick: function(date, e, mks) {
            if (calDayDetailPopover(date, e, mks, 'closed-days', 'gestSedeDelClosed')) return;
            showCalPopover(e.clientX || 200, e.clientY || 200, calPopoverClose(date, 'closed-days', renderGestSedeContent, rooms));
          },
          onRangeSelect: function(s, en, e) { showCalPopover(e.clientX || 200, e.clientY || 200, calPopoverRangeClose(s, en, 'closed-days', renderGestSedeContent, rooms)); }
        });
      });
    } else if (S.gestSedeTab === 'override') {
      var rooms2 = S.treeNodes.filter(function(n) { return n.type === 'postazione' && n.active && C.getAncestorIds(n).includes(S.gestSedeId); });
      var today = C.fmtDate(new Date());
      el.innerHTML = '<div class="form-section-title">Override postazioni per un giorno specifico</div><div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-md)"><input type="date" id="gestOverrideDate" value="' + today + '" onchange="renderGestOverrideRooms()" style="border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:var(--sp-xs) var(--sp-sm);font-size:.75rem;font-family:inherit"></div><div id="gestOverrideRooms"></div>';
      renderGestOverrideRooms();
    } else if (S.gestSedeTab === 'prestazioni') {
      Ag.Main.loadServices().then(function() {
        var svcs = S.servicesList.filter(function(s) { return s.site_id === S.gestSedeId || !s.site_id; });
        var tl = { visita: 'Visita', terapia: 'Terapia', prestazione: 'Prestazione' };
        var tc = { visita: 'var(--visita-bg)', terapia: 'var(--terapia-bg)', prestazione: 'var(--prestazione-bg)' };
        var tb = { visita: 'var(--visita-border)', terapia: 'var(--terapia-border)', prestazione: 'var(--prestazione-border)' };
        el.innerHTML = '<div class="form-section-title">Prestazioni per questa sede</div><div class="mgmt-list">' + svcs.map(function(sv) { return '<div class="mgmt-item svc-item" onclick="openSvcDetailOverlay(' + sv.id + ')" style="cursor:pointer"><div style="display:flex;align-items:center;gap:var(--sp-sm);flex:1;min-width:0"><span class="svc-type-dot" style="background:' + tc[sv.type] + ';border:1px solid ' + tb[sv.type] + '"></span><div style="min-width:0;flex:1"><div style="font-weight:600;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(sv.description) + '</div><div style="font-size:.65rem;color:var(--gray-500)">' + (tl[sv.type] || sv.type) + ' · ' + sv.duration_min + ' min' + (sv.site_id ? ' · Sede' : ' · Globale') + '</div></div></div><span class="mgmt-badge ' + (sv.active ? 'active' : 'inactive') + '">' + (sv.active ? 'Attiva' : 'Off') + '</span></div>'; }).join('') + '</div><button class="btn btn-sm" style="margin-top:var(--sp-sm);width:100%" onclick="gestAddSvc(' + S.gestSedeId + ')">' + addI + ' Nuova prestazione per questa sede</button>';
      });
    }
  }

  function renderGestOverrideRooms() {
    var date = C.$('gestOverrideDate')?.value; if (!date) return;
    var rooms3 = S.treeNodes.filter(function(n) { return n.type === 'postazione' && n.active && C.getAncestorIds(n).includes(S.gestSedeId); });
    Ag.Api.fetch('/day-room-overrides?date=' + date).then(function(j) {
      var ovMap = {};
      for (var o of ((j && j.data) || [])) ovMap[o.room_id] = o.is_open;
      var jsDow2 = new Date(date).getDay(), schedDow2 = jsDow2 === 0 ? 7 : jsDow2;
      C.$('gestOverrideRooms').innerHTML = rooms3.length ? rooms3.map(function(rm) {
        var schedOpen = true;
        if (rm.schedule) { try { var sc = JSON.parse(rm.schedule); var day = sc[schedDow2]; if (!day || !day.active) schedOpen = false; } catch(e) {} }
        var isOpen = ovMap[rm.id] !== undefined ? !!ovMap[rm.id] : schedOpen;
        return '<div class="day-cfg-item' + (isOpen ? '' : ' off') + '"><span>' + (rm.station_type ? C.STATION_ICONS[rm.station_type] + ' ' : '') + C.esc(rm.name) + (!schedOpen && ovMap[rm.id] === undefined ? ' <span style="font-size:.6rem;color:var(--gray-400)">(schedule: chiuso)</span>' : '') + '</span><div class="toggle' + (isOpen ? ' on' : '') + '" onclick="gestToggleRoomDay(' + rm.id + ',\'' + date + '\',' + (isOpen ? 0 : 1) + ')"></div></div>';
      }).join('') : '<div style="font-size:.7rem;color:var(--gray-400)">Nessuna postazione attiva per questa sede</div>';
    });
  }

  function gestToggleRoomDay(rid, date, isOpen) {
    Ag.Api.fetch('/day-room-overrides', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: date, room_id: rid, is_open: isOpen }) }).then(function() { renderGestOverrideRooms(); });
  }

  function gestSedeDelClosed(dateOrId) {
    Ag.Wizard.showConfirm('Rimuovere la chiusura del ' + dateOrId + '?').then(function(ok) {
      if (!ok) return;
      Ag.Api.fetch('/closed-days/' + dateOrId, { method: 'DELETE' }).then(function() { renderGestSedeContent(); });
    });
  }

  /* ══ GESTIONE FLUSSO MODAL ══════════════════════════════════ */
  function openGestFlusso(id) {
    S.gestFlussoId = id; S.gestFlussoTab = 'liste'; S.gestFlussoListId = null;
    var now = new Date(); S.gestFlussoCalYear = now.getFullYear(); S.gestFlussoCalMonth = now.getMonth();
    var nd = S.nodeMap[id];
    C.$('gestFlussoTitle').textContent = nd ? C.esc(nd.name) : 'Flusso';
    C.injectIcon('icoCloseGestFlusso', 'ico-cancel');
    renderGestFlussoTabs(); renderGestFlussoContent();
    C.$('gestFlussoBackdrop').classList.add('active');
  }
  function closeGestFlusso() { C.$('gestFlussoBackdrop').classList.remove('active'); }
  function switchGestFlussoTab(t) { S.gestFlussoTab = t; S.gestFlussoListId = null; renderGestFlussoTabs(); renderGestFlussoContent(); }
  function renderGestFlussoTabs() {
    var tabs = [{ key: 'liste', label: 'Liste' }, { key: 'chiusure', label: 'Chiusure Flusso' }];
    C.$('gestFlussoTabs').innerHTML = tabs.map(function(t) { return '<button class="' + (t.key === S.gestFlussoTab ? 'active' : '') + '" onclick="switchGestFlussoTab(\'' + t.key + '\')">' + t.label + '</button>'; }).join('');
  }

  function renderGestFlussoContent() {
    var el = C.$('gestFlussoBody');
    var delI = C.tpl('ico-delete'), addI = C.tpl('ico-add'), editI = C.tpl('ico-edit'), eyeI = C.tpl('ico-eye'), eyeOffI = C.tpl('ico-eye-off'), backI = C.tpl('ico-chevron-left');
    if (S.gestFlussoTab === 'liste' && !S.gestFlussoListId) {
      Ag.Api.fetch('/lists?flusso_id=' + S.gestFlussoId).then(function(j) {
        var lists = (j && j.data) || [];
        el.innerHTML = '<div class="form-section-title">Liste per: ' + C.esc(S.nodeMap[S.gestFlussoId]?.name || '') + '</div><div class="mgmt-list">' + (lists.length ? lists.map(function(l) { return '<div class="mgmt-item" style="cursor:pointer" onclick="gestOpenListDetail(' + l.id + ')"><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:.8rem">' + C.esc(l.name) + '</div><div style="font-size:.65rem;color:var(--gray-500)">' + l.time_start + '–' + l.time_end + ' · ogni ' + l.slot_interval_min + ' min · max ' + l.max_patients + ' paz. · ' + l.recurrence_type + '</div></div><span class="mgmt-badge ' + (l.active ? 'active' : 'inactive') + '">' + (l.active ? 'Attiva' : 'Off') + '</span><span style="color:var(--gray-400);font-size:.8rem;margin-left:var(--sp-xs)">›</span></div>'; }).join('') : '<div style="font-size:.7rem;color:var(--gray-400);padding:var(--sp-sm)">Nessuna lista</div>') + '</div><button class="btn btn-sm" style="margin-top:var(--sp-sm);width:100%" onclick="gestNewListForm()">' + addI + ' Nuova lista</button>';
      });
    } else if (S.gestFlussoTab === 'liste' && S.gestFlussoListId) {
      Ag.Api.fetch('/lists/' + S.gestFlussoListId).then(function(j) {
        if (!j || !j.success) { S.gestFlussoListId = null; renderGestFlussoContent(); return; }
        var l = j.data, pattern = JSON.parse(l.recurrence_pattern || '[]');
        var dayLabels = ['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
        var patternStr = l.recurrence_type === 'weekly' ? pattern.map(function(d) { return dayLabels[d] || d; }).join(', ') : pattern.join(', ');
        el.innerHTML = '<button class="btn btn-sm" onclick="gestFlussoListId=null;renderGestFlussoContent()" style="margin-bottom:var(--sp-sm)">' + backI + ' Tutte le liste</button><div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-md)"><div style="flex:1"><div style="font-weight:700;font-size:.9rem">' + C.esc(l.name) + '</div><div style="font-size:.65rem;color:var(--gray-500)">' + l.time_start + '–' + l.time_end + ' · ogni ' + l.slot_interval_min + ' min · max ' + l.max_patients + ' paz.</div><div style="font-size:.65rem;color:var(--gray-500)">Ricorrenza: ' + l.recurrence_type + ' · Giorni: ' + patternStr + '</div></div><span class="mgmt-badge ' + (l.active ? 'active' : 'inactive') + '">' + (l.active ? 'Attiva' : 'Off') + '</span></div><div style="display:flex;gap:var(--sp-xs);flex-wrap:wrap;margin-bottom:var(--sp-md)"><button class="btn btn-sm" onclick="gestEditListForm(' + l.id + ')">' + editI + ' Modifica</button><button class="btn btn-sm" onclick="gestToggleListActive(' + l.id + ',' + (l.active ? 0 : 1) + ')">' + (l.active ? eyeOffI : eyeI) + ' ' + (l.active ? 'Disattiva' : 'Attiva') + '</button><button class="btn btn-sm" style="color:var(--error)" onclick="gestDeleteList(' + l.id + ')">' + delI + ' Elimina</button></div><div class="form-section-title">Chiusure specifiche della lista</div><div style="max-width:400px" id="listCalContainer"></div><div style="margin-top:var(--sp-sm);display:flex;gap:var(--sp-sm);flex-wrap:wrap;font-size:.65rem;color:var(--gray-500)"><span><span class="gest-cal-dot closed" style="display:inline-block;vertical-align:middle"></span> Chiuso</span></div>';
        Ag.Api.fetch('/list-closed-days').then(function(cr) {
          var closed = (cr && cr.data) || [];
          var markers = closed.map(function(c) { return { date: c.date, type: 'closed', label: c.reason || 'Chiuso', id: c.date, deletable: true }; });
          renderGestCal('listCalContainer', {
            year: S.gestFlussoCalYear, month: S.gestFlussoCalMonth, markers: markers,
            onNavigate: function(y, m) { S.gestFlussoCalYear = y; S.gestFlussoCalMonth = m; renderGestFlussoContent(); },
            onDayClick: function(date, e, mks) {
              if (calDayDetailPopover(date, e, mks, 'list-closed-days', 'gestFlussoDelClosed')) return;
              showCalPopover(e.clientX || 200, e.clientY || 200, calPopoverClose(date, 'list-closed-days', renderGestFlussoContent));
            },
            onRangeSelect: function(s, en, e) { showCalPopover(e.clientX || 200, e.clientY || 200, calPopoverRangeClose(s, en, 'list-closed-days', renderGestFlussoContent)); }
          });
        });
      });
    } else if (S.gestFlussoTab === 'chiusure') {
      var rooms = S.treeNodes.filter(function(n) { return n.type === 'postazione' && n.active && n.parent_id === S.gestFlussoId; });
      var from = S.gestFlussoCalYear + '-' + String(S.gestFlussoCalMonth + 1).padStart(2, '0') + '-01';
      var toD = new Date(S.gestFlussoCalYear, S.gestFlussoCalMonth + 1, 0); var to = C.fmtDate(toD);
      Promise.all([
        Ag.Api.fetch('/closed-days?from=' + from + '&to=' + to),
        rooms.length ? Ag.Api.fetch('/station-closures/bulk?room_ids=' + rooms.map(function(r) { return r.id; }).join(',') + '&from=' + from + '&to=' + to) : Promise.resolve({ data: [] })
      ]).then(function(results) {
        var cdRes = results[0], lcRes = results[1];
        var closedDaysArr = (cdRes && cdRes.data) || [], stClosures = (lcRes && lcRes.data) || [];
        var markers = [];
        for (var ci = 0; ci < closedDaysArr.length; ci++) markers.push({ date: closedDaysArr[ci].date, type: 'closed', label: 'Sede: ' + (closedDaysArr[ci].reason || 'Chiuso'), id: closedDaysArr[ci].date, deletable: false });
        for (var si = 0; si < stClosures.length; si++) {
          var c = stClosures[si];
          for (var d = new Date(c.date_start); d <= new Date(c.date_end); d.setDate(d.getDate() + 1)) {
            var ds = C.fmtDate(d), rmName = S.nodeMap[c.room_id]?.name || '?';
            markers.push({ date: ds, type: c.time_start ? 'partial' : 'closed', label: rmName + ': ' + (c.reason_category || '') + (c.reason_note ? ' – ' + c.reason_note : ''), id: c.id, deletable: true });
          }
        }
        el.innerHTML = '<div class="form-section-title">Chiusure Flusso — a cascata su tutte le postazioni</div><div style="font-size:.7rem;color:var(--gray-500);margin-bottom:var(--sp-sm)">Clicca un giorno o seleziona un range per chiudere tutte le postazioni del flusso.</div><div style="max-width:400px" id="flussoCalContainer"></div><div style="margin-top:var(--sp-sm);display:flex;gap:var(--sp-sm);flex-wrap:wrap;font-size:.65rem;color:var(--gray-500)"><span><span class="gest-cal-dot closed" style="display:inline-block;vertical-align:middle"></span> Chiuso</span><span><span class="gest-cal-dot partial" style="display:inline-block;vertical-align:middle"></span> Parziale</span></div><div class="form-section-title" style="margin-top:var(--sp-md)">Postazioni coinvolte</div><div style="font-size:.7rem;color:var(--gray-500)">' + (rooms.length ? rooms.map(function(r) { return '<span style="margin-right:var(--sp-sm)">' + (r.station_type ? C.STATION_ICONS[r.station_type] + ' ' : '') + C.esc(r.name) + '</span>'; }).join('') : 'Nessuna postazione attiva') + '</div>';
        C.$('gestCalPopover').dataset.roomId = '';
        renderGestCal('flussoCalContainer', {
          year: S.gestFlussoCalYear, month: S.gestFlussoCalMonth, markers: markers,
          onNavigate: function(y, m) { S.gestFlussoCalYear = y; S.gestFlussoCalMonth = m; renderGestFlussoContent(); },
          onDayClick: function(date, e, mks) {
            if (mks.some(function(mk) { return mk.deletable; }) && calDayDetailPopover(date, e, mks.filter(function(mk) { return mk.deletable; }), 'station-closures', 'gestFlussoCascadeDel')) return;
            gestFlussoCascadePopover(date, date, e);
          },
          onRangeSelect: function(s, en, e) { gestFlussoCascadePopover(s, en, e); }
        });
      });
    }
  }

  function gestOpenListDetail(id) { S.gestFlussoListId = id; renderGestFlussoContent(); }

  function gestFlussoCascadePopover(start, end, e) {
    var rooms = S.treeNodes.filter(function(n) { return n.type === 'postazione' && n.active && n.parent_id === S.gestFlussoId; });
    var catOpts = C.CLOSURE_CATS.map(function(c) { return '<option value="' + c.v + '">' + c.l + '</option>'; }).join('');
    var isRange = start !== end;
    var roomHtml = rooms.length ? '<div class="pop-rooms"><label style="font-weight:600">Postazioni da chiudere:</label>' + rooms.map(function(r) { return '<div class="pop-room-row"><input type="checkbox" checked data-rid="' + r.id + '"> <span>' + (r.station_type ? C.STATION_ICONS[r.station_type] + ' ' : '') + C.esc(r.name) + '</span></div>'; }).join('') + '</div>' : '';
    global._popRefreshFn = renderGestFlussoContent;
    var html = '<h4>\uD83D\uDCC5 ' + (isRange ? start + ' \u2192 ' + end : start) + '</h4><div class="pop-row"><label>Categoria:</label><select id="popCat">' + catOpts + '</select></div><div class="pop-row"><label>Note:</label><input id="popNote" placeholder="Opzionale" style="flex:1"></div>' + (!isRange ? '<div class="pop-row"><label><input type="checkbox" id="popRange" onchange="document.getElementById(\'popEndDate\').disabled=!this.checked"> Chiudi fino a:</label><input type="date" id="popEndDate" value="' + start + '" disabled></div>' : '') + roomHtml + '<div class="pop-actions"><button class="btn btn-sm" onclick="hideCalPopover()">Annulla</button><button class="btn btn-sm btn-primary" onclick="gestFlussoCascadeConfirm(\'' + start + '\',\'' + end + '\')">Conferma</button></div>';
    showCalPopover(e.clientX || 200, e.clientY || 200, html);
  }

  function gestFlussoCascadeConfirm(start, end) {
    var cat = C.$('popCat')?.value || 'altro';
    var note = C.$('popNote')?.value?.trim() || null;
    var isRangeCheck = C.$('popRange')?.checked;
    var endDate = start === end && isRangeCheck ? (C.$('popEndDate')?.value || end) : end;
    var roomChecks = document.querySelectorAll('#gestCalPopover .pop-room-row input[data-rid]:checked');
    var roomIds = Array.from(roomChecks).map(function(c) { return parseInt(c.dataset.rid); });
    var prom = Promise.resolve();
    if (roomIds.length) {
      prom = Ag.Api.fetch('/station-closures/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_ids: roomIds, date_start: start, date_end: endDate, reason_category: cat, reason_note: note }) });
    }
    prom.then(function() { hideCalPopover(); renderGestFlussoContent(); });
  }

  function gestFlussoCascadeDel(id) {
    Ag.Api.fetch('/station-closures/' + id, { method: 'DELETE' }).then(function() { renderGestFlussoContent(); });
  }

  function gestFlussoDelClosed(dateOrId) {
    Ag.Wizard.showConfirm('Rimuovere la chiusura del ' + dateOrId + '?').then(function(ok) {
      if (!ok) return;
      Ag.Api.fetch('/list-closed-days/' + dateOrId, { method: 'DELETE' }).then(function() { renderGestFlussoContent(); });
    });
  }

  /* ── Liste CRUD (inside Flusso modal) ──────────────────────── */
  function gestNewListForm() {
    var el = C.$('gestFlussoBody');
    var dayLabels = ['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    el.innerHTML = '<div class="form-section-title">Nuova lista per: ' + C.esc(S.nodeMap[S.gestFlussoId]?.name || '') + '</div><div class="form-row"><div class="form-group"><label>Nome</label><input id="ml_name"></div></div><div class="form-row"><div class="form-group"><label>Descrizione</label><textarea id="ml_desc" rows="2"></textarea></div></div><div class="form-row cols-3"><div class="form-group"><label>Inizio</label><input type="time" id="ml_start" value="08:00"></div><div class="form-group"><label>Fine</label><input type="time" id="ml_end" value="13:00"></div><div class="form-group"><label>Intervallo (min)</label><input type="number" id="ml_interval" value="30" min="5" step="5"></div></div><div class="form-row cols-2"><div class="form-group"><label>Max pazienti/slot</label><input type="number" id="ml_max" value="1" min="1"></div><div class="form-group"><label>Ricorrenza</label><select id="ml_rectype"><option value="weekly">Settimanale</option><option value="monthly">Mensile</option></select></div></div><div class="form-section" id="ml_pattern_section"><div class="form-section-title">Giorni attivi</div><div class="dur-chips" id="ml_pattern_chips">' + [1,2,3,4,5,6,7].map(function(d) { return '<button type="button" class="dur-chip' + (d <= 5 ? ' selected' : '') + '" data-d="' + d + '" onclick="this.classList.toggle(\'selected\')">' + dayLabels[d] + '</button>'; }).join('') + '</div></div><div class="layer-form-footer"><button class="btn" onclick="renderGestFlussoContent()">Annulla</button><button class="btn btn-primary" onclick="gestSaveNewList()">Crea</button></div>';
    C.$('ml_rectype').addEventListener('change', updatePatternChips);
    setTimeout(function() { C.$('ml_name').focus(); }, 50);
  }

  function gestSaveNewList() {
    var body = { flusso_id: S.gestFlussoId, name: C.$('ml_name').value.trim(), description: C.$('ml_desc').value.trim() || null, time_start: C.$('ml_start').value, time_end: C.$('ml_end').value, slot_interval_min: parseInt(C.$('ml_interval').value) || 30, max_patients: parseInt(C.$('ml_max').value) || 1, recurrence_type: C.$('ml_rectype').value, recurrence_pattern: getPatternFromChips() };
    if (!body.name) { alert('Il nome è obbligatorio.'); return; }
    Ag.Api.fetch('/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function(j) {
      if (!j || !j.success) { alert(j?.error?.message || 'Errore'); return; }
      if (j.data?.id) S.gestFlussoListId = j.data.id;
      renderGestFlussoContent();
    });
  }

  function gestEditListForm(id) {
    Ag.Api.fetch('/lists/' + id).then(function(j) {
      if (!j || !j.success) return;
      var l = j.data, pattern = JSON.parse(l.recurrence_pattern || '[]');
      var dayLabels = ['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
      var el = C.$('gestFlussoBody');
      el.innerHTML = '<div class="form-section-title">Modifica lista</div><div class="form-row"><div class="form-group"><label>Nome</label><input id="ml_name" value="' + C.esc(l.name) + '"></div></div><div class="form-row"><div class="form-group"><label>Descrizione</label><textarea id="ml_desc" rows="2">' + C.esc(l.description || '') + '</textarea></div></div><div class="form-row cols-3"><div class="form-group"><label>Inizio</label><input type="time" id="ml_start" value="' + l.time_start + '"></div><div class="form-group"><label>Fine</label><input type="time" id="ml_end" value="' + l.time_end + '"></div><div class="form-group"><label>Intervallo (min)</label><input type="number" id="ml_interval" value="' + l.slot_interval_min + '" min="5" step="5"></div></div><div class="form-row cols-2"><div class="form-group"><label>Max pazienti/slot</label><input type="number" id="ml_max" value="' + l.max_patients + '" min="1"></div><div class="form-group"><label>Ricorrenza</label><select id="ml_rectype"><option value="weekly"' + (l.recurrence_type === 'weekly' ? ' selected' : '') + '>Settimanale</option><option value="monthly"' + (l.recurrence_type === 'monthly' ? ' selected' : '') + '>Mensile</option></select></div></div><div class="form-section" id="ml_pattern_section"><div class="form-section-title">Giorni attivi</div><div class="dur-chips" id="ml_pattern_chips">' + (l.recurrence_type === 'weekly' ? [1,2,3,4,5,6,7].map(function(d) { return '<button type="button" class="dur-chip' + (pattern.includes(d) ? ' selected' : '') + '" data-d="' + d + '" onclick="this.classList.toggle(\'selected\')">' + dayLabels[d] + '</button>'; }).join('') : Array.from({ length: 31 }, function(_, i) { return '<button type="button" class="dur-chip' + (pattern.includes(i + 1) ? ' selected' : '') + '" data-d="' + (i + 1) + '" onclick="this.classList.toggle(\'selected\')">' + (i + 1) + '</button>'; }).join('')) + '</div></div><div class="layer-form-footer"><button class="btn" onclick="renderGestFlussoContent()">Annulla</button><button class="btn btn-primary" onclick="gestSaveEditList(' + l.id + ')">Salva</button></div>';
      C.$('ml_rectype').addEventListener('change', updatePatternChips);
      setTimeout(function() { C.$('ml_name').focus(); }, 50);
    });
  }

  function gestSaveEditList(id) {
    var body = { name: C.$('ml_name').value.trim(), description: C.$('ml_desc').value.trim() || null, time_start: C.$('ml_start').value, time_end: C.$('ml_end').value, slot_interval_min: parseInt(C.$('ml_interval').value) || 30, max_patients: parseInt(C.$('ml_max').value) || 1, recurrence_type: C.$('ml_rectype').value, recurrence_pattern: getPatternFromChips() };
    if (!body.name) { alert('Il nome è obbligatorio.'); return; }
    Ag.Api.fetch('/lists/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function(j) {
      if (!j || !j.success) { alert(j?.error?.message || 'Errore'); return; }
      S.gestFlussoListId = id;
      renderGestFlussoContent();
    });
  }

  function gestToggleListActive(id, active) {
    Ag.Api.fetch('/lists/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: active }) }).then(function() { renderGestFlussoContent(); });
  }

  function gestDeleteList(id) {
    Ag.Wizard.showConfirm('Eliminare questa lista e tutti i pazienti inseriti?').then(function(ok) {
      if (!ok) return;
      Ag.Api.fetch('/lists/' + id, { method: 'DELETE' }).then(function() { S.gestFlussoListId = null; renderGestFlussoContent(); });
    });
  }

  /* ── Pattern chips ─────────────────────────────────────────── */
  function updatePatternChips() {
    var type = C.$('ml_rectype').value;
    var dayLabels = ['','Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
    if (type === 'weekly') {
      C.$('ml_pattern_chips').innerHTML = [1,2,3,4,5,6,7].map(function(d) { return '<button type="button" class="dur-chip' + (d <= 5 ? ' selected' : '') + '" data-d="' + d + '" onclick="this.classList.toggle(\'selected\')">' + dayLabels[d] + '</button>'; }).join('');
    } else {
      C.$('ml_pattern_chips').innerHTML = Array.from({ length: 31 }, function(_, i) { return '<button type="button" class="dur-chip' + (i === 0 ? ' selected' : '') + '" data-d="' + (i + 1) + '" onclick="this.classList.toggle(\'selected\')">' + (i + 1) + '</button>'; }).join('');
    }
  }
  function getPatternFromChips() { return Array.from(C.$('ml_pattern_chips').querySelectorAll('.dur-chip.selected')).map(function(c) { return parseInt(c.dataset.d); }); }

  /* ══ GESTIONE PRESTAZIONI MODAL ═════════════════════════════ */
  function openGestPrestazioni() {
    S.gestSvcFilterSede = null;
    C.injectIcon('icoCloseGestSvc', 'ico-cancel');
    renderGestSvcContent();
    C.$('gestSvcBackdrop').classList.add('active');
  }
  function closeGestSvc() { C.$('gestSvcBackdrop').classList.remove('active'); }

  function renderGestSvcContent() {
    Ag.Main.loadServices().then(function() {
      var sedi = S.treeNodes.filter(function(n) { return n.type === 'sede'; });
      var filtered = S.gestSvcFilterSede ? S.servicesList.filter(function(s) { return s.site_id === S.gestSvcFilterSede || !s.site_id; }) : S.servicesList;
      var tl = { visita: 'Visita', terapia: 'Terapia', prestazione: 'Prestazione' };
      var tc = { visita: 'var(--visita-bg)', terapia: 'var(--terapia-bg)', prestazione: 'var(--prestazione-bg)' };
      var tb = { visita: 'var(--visita-border)', terapia: 'var(--terapia-border)', prestazione: 'var(--prestazione-border)' };
      var delI = C.tpl('ico-delete'), addI = C.tpl('ico-add'), eyeI = C.tpl('ico-eye'), eyeOffI = C.tpl('ico-eye-off');
      C.$('gestSvcBody').innerHTML = '<div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-md)"><span class="form-section-title" style="margin:0">Tutte le prestazioni</span><div style="flex:1"></div><select onchange="gestSvcFilterSede=this.value?parseInt(this.value):null;renderGestSvcContent()" style="font-size:.75rem;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:4px 8px;font-family:inherit"><option value="">Tutte le sedi</option>' + sedi.map(function(s) { return '<option value="' + s.id + '"' + (s.id === S.gestSvcFilterSede ? ' selected' : '') + '>' + C.esc(s.name) + '</option>'; }).join('') + '</select></div><div class="mgmt-list">' + filtered.map(function(sv) {
        var sedeName = sv.site_id ? (S.nodeMap[sv.site_id]?.name || 'Sede') : 'Globale';
        return '<div class="mgmt-item svc-item" onclick="openSvcDetailOverlay(' + sv.id + ')" style="cursor:pointer"><div style="display:flex;align-items:center;gap:var(--sp-sm);flex:1;min-width:0"><span class="svc-type-dot" style="background:' + tc[sv.type] + ';border:1px solid ' + tb[sv.type] + '"></span><div style="min-width:0;flex:1"><div style="font-weight:600;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(sv.description) + '</div><div style="font-size:.65rem;color:var(--gray-500)">' + (tl[sv.type] || sv.type) + ' · ' + sv.duration_min + ' min · ' + C.esc(sedeName) + '</div></div></div><span class="mgmt-badge ' + (sv.active ? 'active' : 'inactive') + '">' + (sv.active ? 'Attiva' : 'Off') + '</span><div class="mgmt-actions"><button class="btn-icon" onclick="event.stopPropagation();gestToggleSvcAct(' + sv.id + ',' + (sv.active ? 0 : 1) + ')"><span class="icon icon-sm">' + (sv.active ? eyeI : eyeOffI) + '</span></button><button class="btn-icon" onclick="event.stopPropagation();gestDelSvc(' + sv.id + ')"><span class="icon icon-sm">' + delI + '</span></button></div></div>';
      }).join('') + '</div><button class="btn btn-sm" style="margin-top:var(--sp-sm);width:100%" onclick="gestAddSvc(' + (S.gestSvcFilterSede || 'null') + ')">' + addI + ' Aggiungi prestazione</button>';
    });
  }

  function gestAddSvc(siteId) {
    Ag.Api.fetch('/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: 'Nuova prestazione', type: 'prestazione', duration_min: 30, site_id: siteId || null }) }).then(function(j) {
      if (j && j.success && j.data) { Ag.Main.loadServices().then(function() { openSvcDetailOverlay(j.data.id); }); }
    });
  }

  function gestToggleSvcAct(id, a) {
    Ag.Api.fetch('/services/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: a }) }).then(function() {
      renderGestSvcContent();
      if (C.$('gestSedeBackdrop').classList.contains('active') && S.gestSedeTab === 'prestazioni') renderGestSedeContent();
    });
  }

  function gestDelSvc(id) {
    Ag.Wizard.showConfirm('Eliminare questa prestazione?').then(function(ok) {
      if (!ok) return;
      Ag.Api.fetch('/services/' + id, { method: 'DELETE' }).then(function() {
        renderGestSvcContent();
        if (C.$('gestSedeBackdrop').classList.contains('active') && S.gestSedeTab === 'prestazioni') renderGestSedeContent();
      });
    });
  }

  /* ══ GESTIONE POSTAZIONE MODAL ══════════════════════════════ */
  function openGestStation(id) {
    S.gestStationId = id; S.gestStationTab = 'schedule'; S._stationSched = null;
    var nd = S.nodeMap[id];
    var now = new Date(); S.gestStationCalYear = now.getFullYear(); S.gestStationCalMonth = now.getMonth();
    C.$('gestStationTitle').textContent = nd ? (nd.station_type ? C.STATION_ICONS[nd.station_type] + ' ' : '') + C.esc(nd.name) : 'Postazione';
    C.injectIcon('icoCloseGestStation', 'ico-cancel');
    renderGestStationTabs(); renderGestStationContent();
    C.$('gestStationBackdrop').classList.add('active');
  }
  function closeGestStation() { C.$('gestStationBackdrop').classList.remove('active'); }
  function switchGestStationTab(t) { S.gestStationTab = t; renderGestStationTabs(); renderGestStationContent(); }
  function renderGestStationTabs() {
    var tabs = [{ key: 'schedule', label: 'Schedule' }, { key: 'chiusure', label: 'Chiusure' }, { key: 'aperture', label: 'Aperture' }];
    C.$('gestStationTabs').innerHTML = tabs.map(function(t) { return '<button class="' + (t.key === S.gestStationTab ? 'active' : '') + '" onclick="switchGestStationTab(\'' + t.key + '\')">' + t.label + '</button>'; }).join('');
  }

  function renderGestStationContent() {
    var el = C.$('gestStationBody');
    if (S.gestStationTab === 'schedule') {
      var sched = getStationSched();
      var dayLabels = ['','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
      var h = '<div class="form-section-title">Fasce orarie settimanali</div>';
      for (var d = 1; d <= 7; d++) {
        var day = sched[d] || { active: false, ranges: [] };
        h += '<div class="sched-row"><span class="day-label">' + dayLabels[d] + '</span><div class="toggle' + (day.active ? ' on' : '') + '" onclick="schedToggleDay(' + d + ')" data-day="' + d + '"></div><div class="sched-ranges" id="schedRanges_' + d + '">';
        for (var ri = 0; ri < day.ranges.length; ri++) {
          h += '<span class="sched-range"><input type="time" value="' + day.ranges[ri][0] + '" data-day="' + d + '" data-ri="' + ri + '" data-pos="0" onchange="schedRangeChange(this)">–<input type="time" value="' + day.ranges[ri][1] + '" data-day="' + d + '" data-ri="' + ri + '" data-pos="1" onchange="schedRangeChange(this)"><span class="rm-range" onclick="schedRemoveRange(' + d + ',' + ri + ')">✕</span></span>';
        }
        if (day.active) h += '<span class="sched-add-range" onclick="schedAddRange(' + d + ')">+ Fascia</span>';
        h += '</div></div>';
      }
      h += '<div style="margin-top:var(--sp-md);text-align:right"><button class="btn btn-primary btn-sm" onclick="saveStationSchedule()">Salva schedule</button></div>';
      el.innerHTML = h;
    } else if (S.gestStationTab === 'chiusure') {
      var from = S.gestStationCalYear + '-' + String(S.gestStationCalMonth + 1).padStart(2, '0') + '-01';
      var toD2 = new Date(S.gestStationCalYear, S.gestStationCalMonth + 1, 0); var to2 = C.fmtDate(toD2);
      Ag.Api.fetch('/station-closures?room_id=' + S.gestStationId + '&from=' + from + '&to=' + to2).then(function(j) {
        var closures = (j && j.data) || [];
        var markers = [];
        for (var ci = 0; ci < closures.length; ci++) {
          var c = closures[ci];
          for (var d2 = new Date(c.date_start); d2 <= new Date(c.date_end); d2.setDate(d2.getDate() + 1)) {
            var ds = C.fmtDate(d2);
            markers.push({ date: ds, type: c.time_start ? 'partial' : 'closed', label: (c.reason_category || '') + (c.reason_note ? ' – ' + c.reason_note : '') + (c.time_start ? ' (' + c.time_start + '-' + c.time_end + ')' : ''), id: c.id, deletable: true });
          }
        }
        el.innerHTML = '<div class="form-section-title">Chiusure postazione</div><div id="stationCalContainer"></div>';
        C.$('gestCalPopover').dataset.roomId = S.gestStationId;
        renderGestCal('stationCalContainer', {
          year: S.gestStationCalYear, month: S.gestStationCalMonth, markers: markers,
          onNavigate: function(y, m) { S.gestStationCalYear = y; S.gestStationCalMonth = m; renderGestStationContent(); },
          onDayClick: function(date, e, mks) {
            if (calDayDetailPopover(date, e, mks, 'station-closures', 'delStationClosure')) return;
            showCalPopover(e.clientX || 200, e.clientY || 200, calPopoverClose(date, 'station-closures', renderGestStationContent));
          },
          onRangeSelect: function(s, en, e) { showCalPopover(e.clientX || 200, e.clientY || 200, calPopoverRangeClose(s, en, 'station-closures', renderGestStationContent)); }
        });
      });
    } else if (S.gestStationTab === 'aperture') {
      Ag.Api.fetch('/station-openings?room_id=' + S.gestStationId).then(function(j) {
        var openings = (j && j.data) || [];
        var delI = C.tpl('ico-delete');
        el.innerHTML = '<div class="form-section-title">Aperture eccezionali</div><div style="display:flex;gap:var(--sp-sm);margin-bottom:var(--sp-sm)"><input type="date" id="stOpenDate" style="flex:1;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:var(--sp-xs) var(--sp-sm);font-size:.75rem;font-family:inherit"><input type="time" id="stOpenStart" placeholder="Inizio" style="border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:var(--sp-xs) var(--sp-sm);font-size:.75rem;font-family:inherit"><input type="time" id="stOpenEnd" placeholder="Fine" style="border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:var(--sp-xs) var(--sp-sm);font-size:.75rem;font-family:inherit"><input id="stOpenNote" placeholder="Note (opzionale)" style="flex:1;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:var(--sp-xs) var(--sp-sm);font-size:.75rem;font-family:inherit"><button class="btn btn-sm btn-primary" onclick="addStationOpening()">Aggiungi</button></div><div class="mgmt-list">' + (openings.length ? openings.map(function(o) { return '<div class="mgmt-item"><div style="flex:1"><span style="font-weight:600;font-size:.8rem">' + o.date + '</span>' + (o.time_start ? ' <span style="font-size:.7rem">' + o.time_start + '-' + o.time_end + '</span>' : '') + ' <span style="font-size:.65rem;color:var(--gray-500)">' + C.esc(o.reason_note || '') + '</span></div><div class="mgmt-actions"><button class="btn-icon" onclick="delStationOpening(' + o.id + ')"><span class="icon icon-sm">' + delI + '</span></button></div></div>'; }).join('') : '<div style="font-size:.7rem;color:var(--gray-400);padding:var(--sp-sm)">Nessuna apertura eccezionale</div>') + '</div>';
      });
    }
  }

  /* ── Schedule editor helpers ───────────────────────────────── */
  function getStationSched() {
    if (S._stationSched) return S._stationSched;
    var nd = S.nodeMap[S.gestStationId];
    var raw = nd?.schedule ? JSON.parse(nd.schedule) : JSON.parse(C.DEFAULT_SCHEDULE);
    for (var d = 1; d <= 7; d++) { if (!raw[d]) raw[d] = { active: false, ranges: [] }; }
    S._stationSched = raw;
    return S._stationSched;
  }
  function schedToggleDay(d) { var s = getStationSched(); s[d].active = !s[d].active; if (!s[d].active) s[d].ranges = []; else if (!s[d].ranges.length) s[d].ranges = [['08:00','20:00']]; S._stationSched = s; renderGestStationContent(); }
  function schedAddRange(d) { var s = getStationSched(); s[d].ranges.push(['08:00','13:00']); S._stationSched = s; renderGestStationContent(); }
  function schedRemoveRange(d, ri) { var s = getStationSched(); s[d].ranges.splice(ri, 1); S._stationSched = s; renderGestStationContent(); }
  function schedRangeChange(inp) { var s = getStationSched(); var d = parseInt(inp.dataset.day), ri = parseInt(inp.dataset.ri), pos = parseInt(inp.dataset.pos); s[d].ranges[ri][pos] = inp.value; S._stationSched = s; }
  function saveStationSchedule() {
    var s = getStationSched();
    Ag.Api.fetch('/nodes/' + S.gestStationId, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schedule: JSON.stringify(s) }) }).then(function() {
      S._stationSched = null;
      Ag.Main.loadTree().then(function() { alert('Schedule salvato!'); });
    });
  }
  function addStationOpening() {
    var date = C.$('stOpenDate')?.value; if (!date) return;
    var ts = C.$('stOpenStart')?.value || null, te = C.$('stOpenEnd')?.value || null;
    var note = C.$('stOpenNote')?.value?.trim() || null;
    Ag.Api.fetch('/station-openings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: S.gestStationId, date: date, time_start: ts, time_end: te, reason_note: note }) }).then(function() { renderGestStationContent(); });
  }
  function delStationOpening(id) {
    Ag.Wizard.showConfirm('Rimuovere questa apertura?').then(function(ok) {
      if (!ok) return;
      Ag.Api.fetch('/station-openings/' + id, { method: 'DELETE' }).then(function() { renderGestStationContent(); });
    });
  }
  function delStationClosure(id) {
    Ag.Api.fetch('/station-closures/' + id, { method: 'DELETE' }).then(function() { renderGestStationContent(); });
  }

  /* ── Service detail overlay ────────────────────────────────── */
  function openSvcDetailOverlay(id) {
    var sv = S.servicesList.find(function(s) { return s.id === id; }); if (!sv) return;
    C.$('svcDetailTitle').textContent = sv.description || 'Dettaglio prestazione';
    var types = { visita: 'Visita', terapia: 'Terapia', prestazione: 'Prestazione' };
    C.$('svcDetailBody').innerHTML = '<div class="form-section"><div class="form-row"><div class="form-group"><label>Nome / Descrizione</label><input id="svcD_desc" value="' + C.esc(sv.description) + '"></div></div><div class="form-row cols-2"><div class="form-group"><label>Tipo</label><select id="svcD_type">' + Object.entries(types).map(function(pair) { return '<option value="' + pair[0] + '"' + (sv.type === pair[0] ? ' selected' : '') + '>' + pair[1] + '</option>'; }).join('') + '</select></div><div class="form-group"><label>Durata (min)</label><input type="number" id="svcD_dur" value="' + sv.duration_min + '" min="5" step="5"></div></div><div class="form-row"><div class="form-group"><label>Sede</label><select id="svcD_site"><option value="">Tutte le sedi</option>' + S.treeNodes.filter(function(n) { return n.type === 'sede'; }).map(function(s) { return '<option value="' + s.id + '"' + (sv.site_id === s.id ? ' selected' : '') + '>' + C.esc(s.name) + '</option>'; }).join('') + '</select></div></div></div><div class="layer-form-footer"><button class="btn" onclick="closeSvcDetailOverlay()">Annulla</button><button class="btn btn-primary" onclick="saveSvcDetailOverlay(' + sv.id + ')">Salva</button></div>';
    C.$('svcDetailBackdrop').classList.add('active');
  }
  function closeSvcDetailOverlay() { C.$('svcDetailBackdrop').classList.remove('active'); }
  function saveSvcDetailOverlay(id) {
    var data = { description: C.$('svcD_desc').value.trim(), type: C.$('svcD_type').value, duration_min: parseInt(C.$('svcD_dur').value) || 30, site_id: C.$('svcD_site').value ? parseInt(C.$('svcD_site').value) : null };
    Ag.Api.fetch('/services/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function() {
      Ag.Main.loadServices().then(function() {
        closeSvcDetailOverlay();
        if (C.$('gestSvcBackdrop').classList.contains('active')) renderGestSvcContent();
        if (C.$('gestSedeBackdrop').classList.contains('active') && S.gestSedeTab === 'prestazioni') renderGestSedeContent();
      });
    });
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Gestione = Object.freeze({
    init: initGestioneLayer, renderGestCal: renderGestCal,
    showCalPopover: showCalPopover, hideCalPopover: hideCalPopover
  });

  /* ── Globals for HTML onclick ──────────────────────────────── */
  global.gestFilterMacroarea = gestFilterMacroarea;
  global.addTreeRoot = addTreeRoot;
  global.addTreeChild = addTreeChild;
  global.renameTreeNode = renameTreeNode;
  global.toggleTreeNode = toggleTreeNode;
  global.deleteTreeNode = deleteTreeNode;
  global.changeStationType = changeStationType;
  global.fitTree = fitTree;
  global.openGestSede = openGestSede;
  global.closeGestSede = closeGestSede;
  global.switchGestSedeTab = switchGestSedeTab;
  global.renderGestOverrideRooms = renderGestOverrideRooms;
  global.gestToggleRoomDay = gestToggleRoomDay;
  global.gestSedeDelClosed = gestSedeDelClosed;
  global.openGestFlusso = openGestFlusso;
  global.closeGestFlusso = closeGestFlusso;
  global.switchGestFlussoTab = switchGestFlussoTab;
  global.gestOpenListDetail = gestOpenListDetail;
  global.gestFlussoCascadeConfirm = gestFlussoCascadeConfirm;
  global.gestFlussoCascadeDel = gestFlussoCascadeDel;
  global.gestFlussoDelClosed = gestFlussoDelClosed;
  global.gestNewListForm = gestNewListForm;
  global.gestSaveNewList = gestSaveNewList;
  global.gestEditListForm = gestEditListForm;
  global.gestSaveEditList = gestSaveEditList;
  global.gestToggleListActive = gestToggleListActive;
  global.gestDeleteList = gestDeleteList;
  global.renderGestFlussoContent = renderGestFlussoContent;
  global.gestFlussoListId = S.gestFlussoListId;
  global.updatePatternChips = updatePatternChips;
  global.openGestPrestazioni = openGestPrestazioni;
  global.closeGestSvc = closeGestSvc;
  global.renderGestSvcContent = renderGestSvcContent;
  global.gestSvcFilterSede = S.gestSvcFilterSede;
  global.gestAddSvc = gestAddSvc;
  global.gestToggleSvcAct = gestToggleSvcAct;
  global.gestDelSvc = gestDelSvc;
  global.openGestStation = openGestStation;
  global.closeGestStation = closeGestStation;
  global.switchGestStationTab = switchGestStationTab;
  global.schedToggleDay = schedToggleDay;
  global.schedAddRange = schedAddRange;
  global.schedRemoveRange = schedRemoveRange;
  global.schedRangeChange = schedRangeChange;
  global.saveStationSchedule = saveStationSchedule;
  global.addStationOpening = addStationOpening;
  global.delStationOpening = delStationOpening;
  global.delStationClosure = delStationClosure;
  global.openSvcDetailOverlay = openSvcDetailOverlay;
  global.closeSvcDetailOverlay = closeSvcDetailOverlay;
  global.saveSvcDetailOverlay = saveSvcDetailOverlay;
  global.hideCalPopover = hideCalPopover;
  global.popConfirmClose = popConfirmClose;
  global.popConfirmRangeClose = popConfirmRangeClose;

})(window);
