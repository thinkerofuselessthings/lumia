/**
 * agenda-wizard.js — Appointment wizard stepper + confirm/input dialogs
 * Exposes: Ag.Wizard + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  /* ══ CONFIRM MODAL ══════════════════════════════════════════ */
  function showConfirm(msg) {
    return new Promise(function(resolve) {
      S._confirmResolve = resolve;
      C.$('confirmMsg').textContent = msg;
      C.$('confirmBackdrop').classList.add('active');
    });
  }
  function resolveConfirm(val) {
    C.$('confirmBackdrop').classList.remove('active');
    if (S._confirmResolve) S._confirmResolve(val);
    S._confirmResolve = null;
  }

  /* ══ INPUT DIALOG ═══════════════════════════════════════════ */
  function showInputDlg(label, defVal) {
    return new Promise(function(resolve) {
      S._inputDlgResolve = resolve;
      C.$('inputDlgLabel').textContent = label || 'Nome';
      C.$('inputDlgInput').value = defVal || '';
      C.$('inputDlgBackdrop').classList.add('active');
      setTimeout(function() { C.$('inputDlgInput').focus(); }, 50);
    });
  }
  function resolveInputDlg(val) {
    C.$('inputDlgBackdrop').classList.remove('active');
    if (S._inputDlgResolve) S._inputDlgResolve(val);
    S._inputDlgResolve = null;
  }

  // Input dialog keyboard
  var inputDlgEl = C.$('inputDlgInput');
  if (inputDlgEl) {
    inputDlgEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); resolveInputDlg(C.$('inputDlgInput').value); }
      if (e.key === 'Escape') resolveInputDlg(null);
    });
  }

  /* ══ WIZARD STEPPER ═════════════════════════════════════════ */
  function visibleRooms() {
    var jsDow = new Date(S.selDate).getDay(), schedDow = jsDow === 0 ? 7 : jsDow;
    return S.postazioni.filter(function(p) {
      if (S.dayOverrides[p.id] !== undefined) return !!S.dayOverrides[p.id];
      if (p.schedule) { try { var sc = JSON.parse(p.schedule); var day = sc[schedDow]; if (!day || !day.active) return false; } catch(e) {} }
      return true;
    });
  }

  function openWizard(appt, roomId, startTime, endTime) {
    C.$('wizError').textContent = ''; S.wizStep = 0; S.wizSelSvcId = null;
    var pills = C.$('typePills').querySelectorAll('.type-pill');
    if (appt) {
      C.$('wizTitle').textContent = 'Modifica appuntamento';
      C.$('w_id').value = appt.id; C.$('w_room_id').value = appt.room_id || '';
      // Preferisci i campi Cerus-derived (appt.patient.nome/cognome) — fallback al
      // legacy split solo per righe storiche senza enrichment. Lo split di
      // patient_name è ambiguo per cognomi multi-token (es. "Di Gioia Massimo").
      if (appt.patient && (appt.patient.nome || appt.patient.cognome)) {
        C.$('w_nome').value = appt.patient.nome || '';
        C.$('w_cognome').value = appt.patient.cognome || '';
      } else {
        var nameParts = (appt.patient_name || '').trim().split(/\s+/);
        C.$('w_nome').value = nameParts[0] || ''; C.$('w_cognome').value = nameParts.slice(1).join(' ') || '';
      }
      C.$('w_codice_fiscale').value = appt.patient_id || ''; C.$('w_data_nascita').value = appt.birth_date || '';
      C.$('w_phone').value = appt.phone || ''; C.$('w_patient_uuid').value = appt.patient_uuid || '';
      C.$('w_title').value = appt.title || ''; C.$('w_prestazione').value = appt.prestazione_code || '';
      C.$('w_description').value = appt.description || ''; C.$('w_date').value = appt.date || S.selDate;
      C.$('w_start').value = appt.start_time || ''; C.$('w_end').value = appt.end_time || '';
      C.$('w_notes').value = appt.notes || '';
      var matchSvc = S.servicesList.find(function(s) { return s.description === appt.title || s.code === appt.prestazione_code; });
      if (matchSvc) S.wizSelSvcId = matchSvc.id;
      pills.forEach(function(p) { p.classList.toggle('selected', p.dataset.t === (appt.type || '')); });
      if (!Array.from(pills).some(function(p) { return p.classList.contains('selected'); })) pills[0].classList.add('selected');
      C.$('wizSubmitBtn').textContent = 'Aggiorna';
    } else {
      C.$('wizTitle').textContent = 'Nuovo appuntamento'; C.$('wizForm').reset();
      C.$('w_id').value = ''; C.$('w_room_id').value = roomId || (visibleRooms()[0]?.id ?? '');
      C.$('w_date').value = S.selDate;
      if (startTime) C.$('w_start').value = startTime;
      if (endTime) C.$('w_end').value = endTime;
      else if (startTime) C.$('w_end').value = C.toTime(C.toMin(startTime) + 30);
      pills.forEach(function(p, i) { p.classList.toggle('selected', i === 0); });
      C.$('wizSubmitBtn').textContent = 'Salva';
    }
    renderWizSvcList(); renderDurChips(); updateWizStep();
    C.$('wizBackdrop').classList.add('active');
  }

  function closeWizard() { C.$('wizBackdrop').classList.remove('active'); }

  var WIZ_PH_ICONS = ['hgi-clipboard', 'hgi-user', 'hgi-file-02', 'hgi-clock-02'];
  var WIZ_PH_LABELS = ['Prestazione', 'Paziente', 'Dettagli', 'Orario'];

  function updateWizStep() {
    C.$('wizSteps').querySelectorAll('.wizard-step').forEach(function(s, i) {
      s.classList.toggle('active', i === S.wizStep);
      s.classList.toggle('done', i < S.wizStep);
    });
    document.querySelectorAll('.wizard-page').forEach(function(p, i) { p.classList.toggle('active', i === S.wizStep); });
    C.$('wizPrev').style.display = S.wizStep > 0 ? '' : 'none';
    C.$('wizNext').style.display = S.wizStep < 3 ? '' : 'none';
    C.$('wizSubmitBtn').style.display = S.wizStep === 3 ? '' : 'none';
    if (S.wizStep === 3) renderDurChips();
    var phIcon = C.$('wizPhIcon');
    if (phIcon) { phIcon.className = 'hgi-stroke ' + WIZ_PH_ICONS[S.wizStep] + ' wiz-ph-icon'; }
    var phLabel = C.$('wizPhLabel');
    if (phLabel) phLabel.textContent = WIZ_PH_LABELS[S.wizStep];
  }

  function wizNextStep() {
    var err = validateWizStep(S.wizStep);
    if (err) { C.$('wizError').textContent = err; return; }
    C.$('wizError').textContent = '';
    if (S.wizStep < 3) { S.wizStep++; updateWizStep(); }
  }

  function wizPrevStep() { if (S.wizStep > 0) { S.wizStep--; updateWizStep(); } }

  function validateWizStep(step) {
    if (step === 0 && !S.wizSelSvcId) return 'Seleziona una prestazione per continuare.';
    if (step === 1) {
      if (!C.$('w_nome').value.trim()) return 'Il nome del paziente è obbligatorio.';
      if (!C.$('w_cognome').value.trim()) return 'Il cognome del paziente è obbligatorio.';
    }
    if (step === 2 && !C.$('w_title').value.trim()) return 'Il titolo è obbligatorio.';
    if (step === 3) {
      if (!C.$('w_date').value) return 'La data è obbligatoria.';
      var wd = new Date(C.$('w_date').value).getDay();
      var sd = wd === 0 ? 7 : wd;
      var defSch = JSON.parse(C.DEFAULT_SCHEDULE);
      if (!defSch[sd] || !defSch[sd].active) return 'Non è possibile inserire appuntamenti nei giorni non operativi (sab/dom).';
      if (!C.$('w_start').value) return "L'orario di inizio è obbligatorio.";
      if (!C.$('w_end').value) return "L'orario di fine è obbligatorio.";
    }
    return null;
  }

  function pickType(btn) {
    C.$('typePills').querySelectorAll('.type-pill').forEach(function(p) { p.classList.remove('selected'); });
    btn.classList.add('selected');
    renderWizSvcList();
  }

  function getWizTypeFilter() {
    var sel = C.$('typePills').querySelector('.type-pill.selected');
    return sel ? sel.dataset.t || '' : '';
  }

  function renderWizSvcList() {
    var filter = getWizTypeFilter();
    var active = S.servicesList.filter(function(s) { return s.active && (!filter || s.type === filter); });
    var tl = { visita: 'Visita', terapia: 'Terapia', prestazione: 'Prestazione' };
    var tc = { visita: 'var(--visita-bg)', terapia: 'var(--terapia-bg)', prestazione: 'var(--prestazione-bg)' };
    var tb = { visita: 'var(--visita-border)', terapia: 'var(--terapia-border)', prestazione: 'var(--prestazione-border)' };
    C.$('wizSvcList').innerHTML = active.length ? active.map(function(s) {
      return '<div class="wiz-svc-item' + (s.id === S.wizSelSvcId ? ' selected' : '') + '" onclick="pickWizSvc(' + s.id + ')"><span class="svc-type-dot" style="background:' + tc[s.type] + ';border:1px solid ' + tb[s.type] + '"></span><div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + C.esc(s.description) + '</div><div class="svc-meta">' + (tl[s.type] || s.type) + ' · ' + s.duration_min + ' min</div></div></div>';
    }).join('') : '<div style="padding:var(--sp-md);font-size:.75rem;color:var(--gray-400);text-align:center">Nessuna prestazione disponibile</div>';
  }

  function pickWizSvc(id) {
    var svc = S.servicesList.find(function(s) { return s.id === id; });
    if (!svc) return;
    S.wizSelSvcId = id;
    C.$('w_title').value = svc.description;
    C.$('w_prestazione').value = svc.code || '';
    if (svc.duration_min && C.$('w_start').value) { C.$('w_end').value = C.toTime(C.toMin(C.$('w_start').value) + svc.duration_min); hlDur(); }
    renderWizSvcList();
  }

  function renderDurChips() {
    C.$('durChips').innerHTML = C.DURATIONS.map(function(d) {
      return '<button type="button" class="dur-chip" data-d="' + d + '" onclick="pickDur(' + d + ')">' + (d >= 60 ? (d / 60) + 'h' : d + 'm') + '</button>';
    }).join('');
    hlDur();
  }

  function pickDur(m) {
    var s = C.$('w_start').value;
    if (!s) return;
    C.$('w_end').value = C.toTime(C.toMin(s) + m);
    hlDur();
  }

  function hlDur() {
    var s = C.$('w_start').value, e = C.$('w_end').value;
    var d = (s && e) ? C.toMin(e) - C.toMin(s) : -1;
    C.$('durChips').querySelectorAll('.dur-chip').forEach(function(c) {
      c.classList.toggle('selected', parseInt(c.dataset.d) === d);
    });
  }

  // Duration chip highlight on time change
  var wStart = C.$('w_start'), wEnd = C.$('w_end');
  if (wStart) wStart.addEventListener('change', hlDur);
  if (wEnd) wEnd.addEventListener('change', hlDur);

  function submitWizard(e) {
    e.preventDefault(); C.$('wizError').textContent = '';
    var err = validateWizStep(3);
    if (err) { C.$('wizError').textContent = err; return; }
    // V3.M4.A1 A4.b: patient_uuid è obbligatorio (schema NOT NULL dopo A4.a).
    var uuid = C.$('w_patient_uuid').value.trim();
    if (!uuid) {
      C.$('wizError').textContent = 'Selezionare un paziente dall\'anagrafica Cerus prima di salvare.';
      return;
    }
    var id = C.$('w_id').value;
    var selSvc = S.wizSelSvcId ? S.servicesList.find(function(s) { return s.id === S.wizSelSvcId; }) : null;
    var type = selSvc ? selSvc.type || 'visita' : 'visita';
    var nome = C.$('w_nome').value.trim(), cognome = C.$('w_cognome').value.trim();
    var body = {
      patient_name: [cognome, nome].filter(Boolean).join(' ') || '',
      patient_id: C.$('w_codice_fiscale').value.trim().toUpperCase() || null,
      patient_uuid: C.$('w_patient_uuid').value.trim() || null,
      phone: C.$('w_phone').value.trim() || null,
      birth_date: C.$('w_data_nascita').value || null,
      doctor: null,
      room_id: parseInt(C.$('w_room_id').value) || null,
      type: type,
      title: C.$('w_title').value,
      description: C.$('w_description').value || null,
      prestazione_code: C.$('w_prestazione').value || null,
      date: C.$('w_date').value,
      start_time: C.$('w_start').value,
      end_time: C.$('w_end').value,
      notes: C.$('w_notes').value || null
    };
    Ag.Api.fetch(id ? '/appointments/' + id : '/appointments', {
      method: id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(j) {
      if (!j) { C.$('wizError').textContent = 'Errore nel salvataggio'; return; }
      closeWizard();
      if (body.date === S.selDate) {
        Ag.Api.fetch('/appointments?date=' + S.selDate).then(function(j2) {
          S.appointments = (j2 && j2.data) || [];
          if (Ag.Scheduler) Ag.Scheduler.render();
        });
      } else {
        S.selDate = body.date;
        Ag.Calendar.syncCal();
        if (Ag.Main) Ag.Main.loadAll();
      }
      Ag.Calendar.loadCounts().then(function() { Ag.Calendar.renderMiniCal(); });
    });
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Wizard = Object.freeze({
    showConfirm: showConfirm, resolveConfirm: resolveConfirm,
    showInputDlg: showInputDlg, resolveInputDlg: resolveInputDlg,
    open: openWizard, close: closeWizard,
    updateStep: updateWizStep, nextStep: wizNextStep, prevStep: wizPrevStep,
    submit: submitWizard, visibleRooms: visibleRooms
  });

  /* ── Globals for HTML onclick ──────────────────────────────── */
  global.showConfirm = showConfirm;
  global.resolveConfirm = resolveConfirm;
  global.showInputDlg = showInputDlg;
  global.resolveInputDlg = resolveInputDlg;
  global.openWizard = openWizard;
  global.closeWizard = closeWizard;
  global.wizNextStep = wizNextStep;
  global.wizPrevStep = wizPrevStep;
  global.submitWizard = submitWizard;
  global.pickType = pickType;
  global.pickWizSvc = pickWizSvc;
  global.pickDur = pickDur;

})(window);
