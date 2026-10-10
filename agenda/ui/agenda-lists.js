/**
 * agenda-lists.js — Liste layer: sidebar, slot grid, entry CRUD, patient detail, mini calendar
 * Exposes: Ag.Lists + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  function initListeLayer() {
    C.injectIcon('icoListeBrand', 'ico-clipboard');
    C.injectIcon('icoListeStruct', 'ico-hospital'); C.injectIcon('icoListeStructDD', 'ico-chevron-down');
    C.injectIcon('icoListeBack', 'ico-chevron-left');
    C.injectIcon('icoCloseEntry', 'ico-close');
    updateListeStructLabel(); updateListeDateLabel();
    loadListeClosed().then(function() { renderListeMiniCal(); });
    if (S.selFlussoId) loadListeForFlusso().then(function() { renderListeSidebar(); if (S.selListId) loadAndRenderSlots(); });
    else renderListeSidebar();
  }

  function updateListeStructLabel() {
    var flusso = S.selFlussoId ? S.nodeMap[S.selFlussoId] : null;
    var sede = flusso ? S.nodeMap[flusso.parent_id] : null;
    if (flusso) {
      C.$('listeStructLabel').textContent = flusso.name;
      C.$('listeStructSub').textContent = [S.nodeMap[S.selMacroareaId]?.name, S.nodeMap[S.selAreaId]?.name, sede?.name].filter(Boolean).join(' › ');
    } else { C.$('listeStructLabel').textContent = 'Seleziona flusso…'; C.$('listeStructSub').textContent = ''; }
  }

  function updateListeDateLabel() {
    var d = new Date(S.selDate);
    var dn = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    var mn = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    C.$('listeDayCardDow').textContent = dn[d.getDay()];
    C.$('listeDayCardNum').textContent = d.getDate();
    C.$('listeDayCardMonth').textContent = mn[d.getMonth()] + ' ' + d.getFullYear();
    C.$('listeToolbarDate').textContent = dn[d.getDay()] + ' ' + d.getDate() + ' ' + mn[d.getMonth()] + ' ' + d.getFullYear();
  }

  function renderListeMiniCal() {
    var target = C.$('listeMiniCal'); if (!target) return;
    var today = C.fmtDate(new Date()), sel = S.selDate;
    var dim = new Date(S.calY, S.calM + 1, 0).getDate();
    var fd = (new Date(S.calY, S.calM, 1).getDay() + 6) % 7;
    var pmd = new Date(S.calY, S.calM, 0).getDate();
    var mn = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
    var h = '<div class="mcal-header"><button onclick="calPrev()">' + C.tpl('ico-chevron-left') + '</button><span class="mcal-title">' + mn[S.calM] + ' ' + S.calY + '</span><button onclick="calNext()">' + C.tpl('ico-chevron-right') + '</button></div><div class="mcal-grid">';
    ['Lu','Ma','Me','Gi','Ve','Sa','Do'].forEach(function(d) { h += '<div class="mcal-dow">' + d + '</div>'; });
    for (var i = fd - 1; i >= 0; i--) { var day = pmd - i; var pm = S.calM === 0 ? 11 : S.calM - 1, py = S.calM === 0 ? S.calY - 1 : S.calY; var ds = py + '-' + String(pm + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0'); h += '<div class="mcal-day other-month" onclick="pickDay(\'' + ds + '\')">' + day + '</div>'; }
    for (var d2 = 1; d2 <= dim; d2++) { var ds2 = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-' + String(d2).padStart(2, '0'); var c = ['mcal-day', ds2 === today ? 'today' : '', ds2 === sel ? 'selected' : '', S.listeClosedDays[ds2] ? 'closed' : ''].filter(Boolean).join(' '); h += '<div class="' + c + '" onclick="pickDay(\'' + ds2 + '\')">' + d2 + '</div>'; }
    var rem = (7 - ((fd + dim) % 7)) % 7;
    for (var d3 = 1; d3 <= rem; d3++) { var nm = S.calM === 11 ? 0 : S.calM + 1, ny = S.calM === 11 ? S.calY + 1 : S.calY; var ds3 = ny + '-' + String(nm + 1).padStart(2, '0') + '-' + String(d3).padStart(2, '0'); h += '<div class="mcal-day other-month" onclick="pickDay(\'' + ds3 + '\')">' + d3 + '</div>'; }
    h += '</div>'; target.innerHTML = h;
  }

  function loadListeForFlusso() {
    if (!S.selFlussoId) { S.listeFlussoLists = []; S.selListId = null; return Promise.resolve(); }
    return Ag.Api.fetch('/lists?flusso_id=' + S.selFlussoId + '&active=1').then(function(j) {
      S.listeFlussoLists = (j && j.data) || [];
      if (!S.selListId || !S.listeFlussoLists.find(function(l) { return l.id === S.selListId; })) S.selListId = S.listeFlussoLists[0]?.id || null;
    });
  }

  function renderListeSidebar() {
    var el = C.$('listeListSidebar');
    if (!S.selFlussoId) { el.innerHTML = '<div style="padding:var(--sp-sm);font-size:.7rem;color:var(--gray-400)">Seleziona un flusso dalla struttura.</div>'; return; }
    if (!S.listeFlussoLists.length) { el.innerHTML = '<div style="padding:var(--sp-sm);font-size:.7rem;color:var(--gray-400)">Nessuna lista per questo flusso.</div>'; return; }
    el.innerHTML = S.listeFlussoLists.map(function(l) { return '<div class="liste-list-item' + (l.id === S.selListId ? ' active' : '') + '" onclick="pickList(' + l.id + ')"><span>' + C.esc(l.name) + '</span><span class="liste-badge">' + l.time_start + '–' + l.time_end + '</span></div>'; }).join('');
  }

  function pickList(id) { S.selListId = id; renderListeSidebar(); loadAndRenderSlots(); }

  function loadAndRenderSlots() {
    if (!S.selListId) { C.$('slotGridContent').innerHTML = '<div class="slot-inactive">Seleziona una lista dalla sidebar.</div>'; C.$('listeToolbarTitle').textContent = 'Seleziona una lista'; return Promise.resolve(); }
    var list = S.listeFlussoLists.find(function(l) { return l.id === S.selListId; });
    C.$('listeToolbarTitle').textContent = list?.name || 'Lista';
    return Ag.Api.fetch('/lists/' + S.selListId + '/slots?date=' + S.selDate).then(function(j) {
      if (!j || !j.success) { C.$('slotGridContent').innerHTML = '<div class="slot-inactive">' + C.esc(j?.error?.message || 'Errore') + '</div>'; return; }
      S.listeSlots = j.data;
      renderSlotGrid();
    });
  }

  function renderSlotGrid() {
    if (!S.listeSlots) { C.$('slotGridContent').innerHTML = '<div class="slot-inactive">Nessun dato.</div>'; return; }
    var data = S.listeSlots;
    var list = data.list, isActive = data.is_active_on_date, slots = data.slots;
    if (!isActive) { C.$('slotGridContent').innerHTML = '<div class="slot-inactive">Questa lista non è attiva per il giorno selezionato.<br><span style="font-size:.7rem">Ricorrenza: ' + list.recurrence_type + ' — Schema: ' + list.recurrence_pattern + '</span></div>'; return; }
    var maxP = list.max_patients || 1;
    var stLb = { booked: 'Prenotato', confirmed: 'Confermato', completed: 'Completato', cancelled: 'Annullato', no_show: 'Non pres.' };
    var h = '<table class="slot-table"><thead><tr><th>Orario</th>';
    for (var p = 1; p <= maxP; p++) h += '<th>Paziente ' + (maxP > 1 ? p : '') + '</th>';
    h += '</tr></thead><tbody>';
    for (var si = 0; si < slots.length; si++) {
      var slot = slots[si];
      h += '<tr><td class="slot-time-cell">' + C.esc(slot.time) + '</td>';
      for (var pi = 0; pi < maxP; pi++) {
        var entry = slot.entries[pi];
        if (entry) {
          h += '<td class="slot-cell"><div class="slot-entry" data-status="' + entry.status + '" onclick="openEntryDetail(' + entry.id + ')" oncontextmenu="event.preventDefault();showEntryCtx(event,' + entry.id + ')" title="' + C.esc(entry.patient_name) + (entry.notes ? ' — ' + C.esc(entry.notes) : '') + '"><span class="entry-name">' + C.esc(entry.patient_name) + '</span><span class="entry-status">' + (stLb[entry.status] || entry.status) + '</span></div></td>';
        } else {
          h += '<td class="slot-cell"><div class="slot-empty" onclick="openEntryDlg(' + list.id + ',\'' + S.selDate + '\',\'' + slot.time + '\')">+ Inserisci</div></td>';
        }
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    C.$('slotGridContent').innerHTML = h;
  }

  /* ── Entry context menu ──────────────────────────────────────── */
  function showEntryCtx(e, entryId) {
    e.stopPropagation(); Ag.Scheduler.hideCtx();
    var m = C.$('ctxMenu');
    var stLb = { booked: 'Prenotato', confirmed: 'Confermato', completed: 'Completato', cancelled: 'Annullato', no_show: 'Non presentato' };
    var stIcos = { booked: 'hgi-clock-01', confirmed: 'hgi-checkmark-circle-02', completed: 'hgi-tick-02', cancelled: 'hgi-cancel-circle', no_show: 'hgi-user-remove-01' };
    var sts = ['booked', 'confirmed', 'completed', 'cancelled', 'no_show'];
    m.innerHTML = '<button onclick="openEntryDlgEdit(' + entryId + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-edit') + '</span> Modifica</button>' + sts.map(function(s) { return '<button onclick="setEntryStatus(' + entryId + ',\'' + s + '\');hideCtx()"><span class="ctx-status-ico"><i class="hgi-stroke ' + stIcos[s] + '"></i></span> ' + stLb[s] + '</button>'; }).join('') + '<button onclick="promoteEntry(' + entryId + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-calendar') + '</span> Promuovi ad Agenda</button><button class="danger" onclick="deleteEntry(' + entryId + ');hideCtx()"><span class="icon icon-sm">' + C.tpl('ico-delete') + '</span> Elimina</button>';
    m.style.display = 'block'; m.style.left = Math.min(e.clientX, innerWidth - 200) + 'px'; m.style.top = Math.min(e.clientY, innerHeight - 300) + 'px';
    setTimeout(function() { document.addEventListener('click', Ag.Scheduler.hideCtx, { once: true }); }, 0);
  }

  /* ── Entry dialog CRUD ───────────────────────────────────────── */
  function openEntryDlg(listId, date, slotTime) {
    C.$('entryDlgTitle').textContent = 'Inserisci paziente';
    C.$('entryForm').reset(); C.$('e_id').value = ''; C.$('e_list_id').value = listId; C.$('e_date').value = date; C.$('e_slot_time').value = slotTime;
    C.$('entrySubmitBtn').textContent = 'Inserisci';
    C.$('entryDlgBackdrop').classList.add('active');
    setTimeout(function() { C.$('e_patient_name').focus(); }, 50);
  }

  function openEntryDlgEdit(id) {
    return Ag.Api.fetch('/list-entries/' + id).then(function(j) {
      if (!j || !j.success) return;
      var e = j.data;
      C.$('entryDlgTitle').textContent = 'Modifica paziente';
      C.$('e_id').value = e.id; C.$('e_list_id').value = e.list_id; C.$('e_date').value = e.date; C.$('e_slot_time').value = e.slot_time;
      C.$('e_patient_name').value = e.patient_name || ''; C.$('e_patient_id').value = e.patient_id || '';
      C.$('e_phone').value = e.phone || ''; C.$('e_notes').value = e.notes || '';
      C.$('e_patient_uuid').value = e.patient_uuid || ''; C.$('e_birth_date').value = e.birth_date || '';
      C.$('entrySubmitBtn').textContent = 'Aggiorna';
      C.$('entryDlgBackdrop').classList.add('active');
      setTimeout(function() { C.$('e_patient_name').focus(); }, 50);
    });
  }

  function closeEntryDlg() { C.$('entryDlgBackdrop').classList.remove('active'); }

  function submitEntry(ev) {
    ev.preventDefault();
    var id = C.$('e_id').value;
    // V3.M4.A1 A4.b: patient_uuid è obbligatorio (schema NOT NULL dopo A4.a).
    var uuid = C.$('e_patient_uuid').value.trim();
    if (!uuid) {
      alert('Selezionare un paziente dall\'anagrafica Cerus prima di salvare.');
      return;
    }
    var body = { list_id: parseInt(C.$('e_list_id').value), date: C.$('e_date').value, slot_time: C.$('e_slot_time').value, patient_name: C.$('e_patient_name').value.trim(), patient_id: C.$('e_patient_id').value.trim() || null, patient_uuid: uuid, phone: C.$('e_phone').value.trim() || null, birth_date: C.$('e_birth_date').value.trim() || null, notes: C.$('e_notes').value.trim() || null };
    return Ag.Api.fetch(id ? '/list-entries/' + id : '/list-entries', { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function(j) {
      if (!j || !j.success) { alert(j?.error?.message || 'Errore'); return; }
      closeEntryDlg(); loadAndRenderSlots();
    });
  }

  function setEntryStatus(id, status) {
    return Ag.Api.fetch('/list-entries/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status }) }).then(function() { loadAndRenderSlots(); });
  }

  function deleteEntry(id) {
    return Ag.Wizard.showConfirm('Rimuovere questo paziente dalla lista?').then(function(ok) {
      if (!ok) return;
      return Ag.Api.fetch('/list-entries/' + id, { method: 'DELETE' }).then(function() { loadAndRenderSlots(); });
    });
  }

  function promoteEntry(id) {
    var rooms = Ag.Scheduler.visibleRooms();
    var roomId = rooms[0]?.id; if (!roomId) { alert('Nessuna postazione disponibile per la promozione.'); return Promise.resolve(); }
    return Ag.Wizard.showConfirm('Promuovere questo paziente ad appuntamento in Agenda?').then(function(ok) {
      if (!ok) return;
      return Ag.Api.fetch('/list-entries/' + id + '/promote', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room_id: roomId, type: 'prestazione', title: 'Da lista' }) }).then(function() { loadAndRenderSlots(); });
    });
  }

  /* ── Entry detail modal (read-only) ──────────────────────────── */
  function openEntryDetail(entryId) {
    C.injectIcon('icoCloseEntryDetail', 'ico-close');
    return Ag.Api.fetch('/list-entries/' + entryId).then(function(j) {
      if (!j || !j.success) return;
      var e = j.data;
      var stLb = { booked: 'Prenotato', confirmed: 'Confermato', completed: 'Completato', cancelled: 'Annullato', no_show: 'Non presentato' };
      C.$('entryDetailTitle').textContent = 'Dettaglio paziente';
      // V3.M4.A1 A4.b: l'enrichment lato server (A2) inserisce e.patient con i dati Cerus.
      // Se assente (Cerus offline o uuid placeholder) si carica via getOne; in extremis si usa
      // il fallback dei campi denormalizzati (rimossi in A5.b ma ancora presenti per ora).
      var patPromise;
      if (e.patient && !e.patient._error) {
        patPromise = Promise.resolve({ success: true, data: e.patient });
      } else if (e.patient_uuid && e.patient_uuid !== '__legacy_unknown__') {
        patPromise = Ag.Api.fetch('/api/cerus/patients/' + encodeURIComponent(e.patient_uuid));
      } else {
        patPromise = Promise.resolve(null);
      }
      return patPromise.then(function(pj) {
        var pat = pj && pj.success ? pj.data : null;
        var patHtml;
        if (pat) {
          patHtml = '<div class="pat-detail-grid"><div class="pat-detail-item"><span class="pat-detail-label">Nome</span><span class="pat-detail-value">' + C.esc(pat.nome) + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Cognome</span><span class="pat-detail-value">' + C.esc(pat.cognome) + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Codice Fiscale</span><span class="pat-detail-value">' + C.esc(pat.codice_fiscale || '-') + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Data nascita</span><span class="pat-detail-value">' + C.esc(pat.data_nascita || '-') + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Sesso</span><span class="pat-detail-value">' + C.esc(pat.sesso || '-') + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Luogo nascita</span><span class="pat-detail-value">' + C.esc(pat.luogo_nascita || '-') + '</span></div><div class="pat-detail-item pat-detail-full"><span class="pat-detail-label">Indirizzo</span><span class="pat-detail-value">' + C.esc(pat.indirizzo || '-') + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Telefono</span><span class="pat-detail-value">' + C.esc(pat.telefono || '-') + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Email</span><span class="pat-detail-value">' + C.esc(pat.email || '-') + '</span></div></div>';
        } else {
          patHtml = '<div class="pat-detail-grid"><div class="pat-detail-item pat-detail-full"><span class="pat-detail-label">Nome</span><span class="pat-detail-value">' + C.esc(e.patient_name || '-') + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Codice / ID</span><span class="pat-detail-value">' + C.esc(e.patient_id || '-') + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Telefono</span><span class="pat-detail-value">' + C.esc(e.phone || '-') + '</span></div></div>';
        }
        C.$('entryDetailBody').innerHTML = '<div class="form-section"><div class="form-section-title">Prenotazione</div><div class="pat-detail-grid"><div class="pat-detail-item"><span class="pat-detail-label">Data</span><span class="pat-detail-value">' + C.esc(e.date) + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Orario</span><span class="pat-detail-value">' + C.esc(e.slot_time) + '</span></div><div class="pat-detail-item"><span class="pat-detail-label">Stato</span><span class="pat-detail-value">' + (stLb[e.status] || e.status) + '</span></div>' + (e.notes ? '<div class="pat-detail-item pat-detail-full"><span class="pat-detail-label">Note</span><span class="pat-detail-value">' + C.esc(e.notes) + '</span></div>' : '') + '</div></div><div class="form-section"><div class="form-section-title">Anagrafica paziente</div>' + patHtml + '</div><div class="pat-detail-actions"><button class="btn" onclick="closeEntryDetail();openEntryDlgEdit(' + e.id + ')"><span class="icon icon-sm">' + C.tpl('ico-edit') + '</span> Modifica</button><button class="btn" onclick="closeEntryDetail();showEntryCtx(event,' + e.id + ')"><span class="icon icon-sm">' + C.tpl('ico-settings') + '</span> Azioni</button></div>';
        C.$('entryDetailBackdrop').classList.add('active');
      });
    });
  }
  function closeEntryDetail() { C.$('entryDetailBackdrop').classList.remove('active'); }

  /* ── Liste day config ────────────────────────────────────────── */
  function loadListeClosed() {
    var f = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-01';
    var l = S.calY + '-' + String(S.calM + 1).padStart(2, '0') + '-' + String(new Date(S.calY, S.calM + 1, 0).getDate()).padStart(2, '0');
    return Ag.Api.fetch('/list-closed-days?from=' + f + '&to=' + l).then(function(j) {
      S.listeClosedDays = {};
      for (var ci = 0; ci < ((j && j.data) || []).length; ci++) {
        var c = (j.data)[ci]; S.listeClosedDays[c.date] = c;
      }
    });
  }

  function openListeDayConfig() {
    var d = new Date(S.selDate);
    var dn = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
    var cd = S.listeClosedDays[S.selDate];
    var el = C.$('entryDetailBody');
    C.$('entryDetailTitle').textContent = 'Liste — ' + dn[d.getDay()] + ' ' + d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    C.injectIcon('icoCloseEntryDetail', 'ico-close');
    el.innerHTML = '<div class="form-section"><div class="form-section-title">Stato giorno (Liste)</div><div style="display:flex;align-items:center;gap:var(--sp-sm);margin-bottom:var(--sp-sm)"><span style="font-size:.75rem;font-weight:500">' + (cd ? 'Giorno chiuso' : 'Giorno aperto') + '</span><div class="toggle' + (cd ? '' : ' on') + '" onclick="toggleListeClosed()"></div></div>' + (!cd ? '<input id="listeCloseReason" placeholder="Motivo chiusura (opzionale)" style="width:100%;border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:var(--sp-xs) var(--sp-sm);font-size:.7rem;font-family:inherit;">' : '<div style="font-size:.7rem;color:#991b1b;padding:var(--sp-xs);background:#FEE2E2;border-radius:var(--radius-sm)">' + C.esc(cd.reason || 'Nessun motivo indicato') + '</div>') + '</div>';
    C.$('entryDetailBackdrop').classList.add('active');
  }

  function toggleListeClosed() {
    var prom;
    if (S.listeClosedDays[S.selDate]) {
      prom = Ag.Api.fetch('/list-closed-days/' + S.selDate, { method: 'DELETE' });
    } else {
      var reason = C.$('listeCloseReason')?.value?.trim() || null;
      prom = Ag.Api.fetch('/list-closed-days', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: S.selDate, reason: reason }) });
    }
    prom.then(function() { return loadListeClosed(); }).then(function() { renderListeMiniCal(); openListeDayConfig(); });
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Lists = Object.freeze({
    init: initListeLayer,
    renderMiniCal: renderListeMiniCal,
    loadListeForFlusso: loadListeForFlusso,
    renderListeSidebar: renderListeSidebar,
    loadAndRenderSlots: loadAndRenderSlots,
    updateListeStructLabel: updateListeStructLabel,
    updateDateLabel: updateListeDateLabel,
    loadListeClosed: loadListeClosed
  });

  /* ── Globals for HTML onclick ──────────────────────────────── */
  global.pickList = pickList;
  global.openEntryDlg = openEntryDlg;
  global.openEntryDlgEdit = openEntryDlgEdit;
  global.closeEntryDlg = closeEntryDlg;
  global.submitEntry = submitEntry;
  global.setEntryStatus = setEntryStatus;
  global.deleteEntry = deleteEntry;
  global.promoteEntry = promoteEntry;
  global.openEntryDetail = openEntryDetail;
  global.closeEntryDetail = closeEntryDetail;
  global.showEntryCtx = showEntryCtx;
  global.openListeDayConfig = openListeDayConfig;
  global.toggleListeClosed = toggleListeClosed;

})(window);
