/**
 * agenda-patients.js — Patient autocomplete for wizard and entry forms
 * Exposes: Ag.Patients + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  function patSearchEntry(q) {
    clearTimeout(S._pacTimerE);
    var list = C.$('e_pac_list');
    if (!q || q.length < 2) { list.innerHTML = ''; list.style.display = 'none'; return; }
    S._pacTimerE = setTimeout(function() {
      Ag.Api.fetch('/api/cerus/patients?q=' + encodeURIComponent(q) + '&limit=10').then(function(j) {
        var pats = (j && j.data) || [];
        if (!pats.length) { list.innerHTML = '<div class="pac-item" style="pointer-events:none;color:var(--gray-400)">Nessun risultato</div>'; list.style.display = 'block'; return; }
        list.innerHTML = pats.map(function(p) {
          return '<div class="pac-item" onclick="selectPatientEntry(\'' + p.cerus_uuid + '\')"><span class="pac-item-name">' + C.esc(p.cognome) + ' ' + C.esc(p.nome) + '</span><span class="pac-item-cf">' + C.esc(p.codice_fiscale || '') + '</span></div>';
        }).join('');
        list.style.display = 'block';
      });
    }, 250);
  }

  function patSearchWizard(q) {
    clearTimeout(S._pacTimerW);
    var list = C.$('w_pac_list');
    if (!list) return;
    if (!q || q.length < 2) { list.innerHTML = ''; list.style.display = 'none'; return; }
    S._pacTimerW = setTimeout(function() {
      Ag.Api.fetch('/api/cerus/patients?q=' + encodeURIComponent(q) + '&limit=10').then(function(j) {
        var pats = (j && j.data) || [];
        if (!pats.length) { list.innerHTML = '<div class="pac-item" style="pointer-events:none;color:var(--gray-400)">Nessun risultato</div>'; list.style.display = 'block'; return; }
        list.innerHTML = pats.map(function(p) {
          return '<div class="pac-item" onclick="selectPatientWizard(\'' + p.cerus_uuid + '\')"><span class="pac-item-name">' + C.esc(p.cognome) + ' ' + C.esc(p.nome) + '</span><span class="pac-item-cf">' + C.esc(p.codice_fiscale || '') + '</span></div>';
        }).join('');
        list.style.display = 'block';
      });
    }, 250);
  }

  /* ── Anagrafica modal (3-column) ───────────────────────────── */
  function openAnagraficaModal() {
    C.$('anaSearchInput').value = '';
    C.$('anaSearchList').innerHTML = '<div class="ana-empty">Digita per cercare\u2026</div>';
    C.$('anaResult').innerHTML = '<div class="ana-empty">Seleziona un paziente dalla lista</div>';
    C.$('anaBackdrop').classList.add('active');
    setTimeout(function() { C.$('anaSearchInput').focus(); }, 100);
  }
  function closeAnagraficaModal() { C.$('anaBackdrop').classList.remove('active'); }

  function anaSearch(q) {
    clearTimeout(S._anaTimer);
    var list = C.$('anaSearchList');
    if (!q || q.length < 2) { list.innerHTML = '<div class="ana-empty">Digita per cercare\u2026</div>'; return; }
    S._anaTimer = setTimeout(function() {
      Ag.Api.fetch('/api/cerus/patients?q=' + encodeURIComponent(q) + '&limit=15').then(function(j) {
        var pats = (j && j.data) || [];
        if (!pats.length) { list.innerHTML = '<div class="ana-empty">Nessun risultato</div>'; return; }
        list.innerHTML = pats.map(function(p) {
          return '<div class="ana-item" onclick="anaSelectItem(\'' + p.cerus_uuid + '\',this)">' +
            '<div class="ana-item-name">' + C.esc(p.cognome) + ' ' + C.esc(p.nome) + '</div>' +
            '<div class="ana-item-meta">' + C.esc(p.codice_fiscale || '—') + (p.data_nascita ? ' · ' + p.data_nascita : '') + '</div>' +
          '</div>';
        }).join('');
      });
    }, 300);
  }

  function anaSelectItem(uuid, el) {
    C.$('anaSearchList').querySelectorAll('.ana-item').forEach(function(i) { i.classList.remove('selected'); });
    if (el) el.classList.add('selected');
    Ag.Api.fetch('/api/cerus/patients/' + encodeURIComponent(uuid)).then(function(j) {
      if (!j || !j.success) return;
      var p = j.data;
      S._anaSelectedPatient = p;
      C.$('anaResult').innerHTML =
        '<div class="ana-card">' +
          '<div class="ana-card-field"><div class="ana-card-label">Nome</div><div class="ana-card-value">' + C.esc(p.nome || '—') + '</div></div>' +
          '<div class="ana-card-field"><div class="ana-card-label">Cognome</div><div class="ana-card-value">' + C.esc(p.cognome || '—') + '</div></div>' +
          '<div class="ana-card-field"><div class="ana-card-label">Codice Fiscale</div><div class="ana-card-value mono">' + C.esc(p.codice_fiscale || '—') + '</div></div>' +
          '<div class="ana-card-field"><div class="ana-card-label">Data di nascita</div><div class="ana-card-value">' + C.esc(p.data_nascita || '—') + '</div></div>' +
          '<div class="ana-card-field"><div class="ana-card-label">Telefono</div><div class="ana-card-value">' + C.esc(p.telefono || '—') + '</div></div>' +
          '<button type="button" class="btn btn-primary btn-sm" style="margin-top:auto" onclick="anaConfirmSelect()">Seleziona</button>' +
        '</div>';
    });
  }

  function anaConfirmSelect() {
    var p = S._anaSelectedPatient;
    if (!p) return;
    C.$('w_nome').value = p.nome || '';
    C.$('w_cognome').value = p.cognome || '';
    C.$('w_codice_fiscale').value = p.codice_fiscale || '';
    C.$('w_data_nascita').value = p.data_nascita || '';
    C.$('w_phone').value = p.telefono || '';
    C.$('w_patient_uuid').value = p.cerus_uuid || '';
    closeAnagraficaModal();
  }

  function selectPatientEntry(uuid) {
    Ag.Api.fetch('/api/cerus/patients/' + encodeURIComponent(uuid)).then(function(j) {
      if (!j || !j.success) return;
      var p = j.data;
      C.$('e_patient_name').value = p.cognome + ' ' + p.nome;
      C.$('e_patient_id').value = p.codice_fiscale || '';
      C.$('e_phone').value = p.telefono || '';
      C.$('e_patient_uuid').value = p.cerus_uuid || '';
      C.$('e_birth_date').value = p.data_nascita || '';
      C.$('e_pac_search').value = p.cognome + ' ' + p.nome;
      C.$('e_pac_list').style.display = 'none';
    });
  }

  function selectPatientWizard(uuid) {
    Ag.Api.fetch('/api/cerus/patients/' + encodeURIComponent(uuid)).then(function(j) {
      if (!j || !j.success) return;
      var p = j.data;
      C.$('w_nome').value = p.nome || '';
      C.$('w_cognome').value = p.cognome || '';
      C.$('w_codice_fiscale').value = p.codice_fiscale || '';
      C.$('w_data_nascita').value = p.data_nascita || '';
      C.$('w_phone').value = p.telefono || '';
      C.$('w_patient_uuid').value = p.cerus_uuid || '';
      C.$('w_pac_search').value = p.cognome + ' ' + p.nome;
      C.$('w_pac_list').style.display = 'none';
    });
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Patients = Object.freeze({
    searchEntry: patSearchEntry, searchWizard: patSearchWizard,
    selectEntry: selectPatientEntry, selectWizard: selectPatientWizard,
    openAnagrafica: openAnagraficaModal, closeAnagrafica: closeAnagraficaModal,
    anaSearch: anaSearch, anaSelectItem: anaSelectItem, anaConfirmSelect: anaConfirmSelect
  });

  /* ── Globals for HTML onclick/oninput ──────────────────────── */
  global.patSearchEntry = patSearchEntry;
  global.patSearchWizard = patSearchWizard;
  global.selectPatientEntry = selectPatientEntry;
  global.selectPatientWizard = selectPatientWizard;
  global.openAnagraficaModal = openAnagraficaModal;
  global.closeAnagraficaModal = closeAnagraficaModal;
  global.anaSearch = anaSearch;
  global.anaSelectItem = anaSelectItem;
  global.anaConfirmSelect = anaConfirmSelect;

})(window);
