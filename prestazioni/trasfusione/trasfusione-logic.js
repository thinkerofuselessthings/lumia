/**
 * trasfusione-logic.js — Module logic for the transfusion request form
 * Registers with PrestModules and handles emo-picker, print, save/load.
 */
(function(global) {
  'use strict';

  var Ag = global.LumiaAgenda;
  var C = Ag.Config, S = Ag.state;

  var EMO_TYPES = [
    'Emazie concentrate (EC)',
    'Concentrato piastrinico (CP)',
    'Plasma fresco congelato (PFC)',
    'Crioprecipitato',
    'Emazie concentrate leucodeplete',
    'Pool piastrinico',
    'Altro'
  ];
  var _emoItems = []; // [{type, units, irr, fil, lav, fen}]

  /* ── Emocomponent list rendering ─────────────────────────── */
  function renderEmoList() {
    var el = C.$('trEmoList'), emptyEl = C.$('trEmoEmpty');
    if (!el) return;
    if (!_emoItems.length) { el.innerHTML = ''; if (emptyEl) emptyEl.style.display = ''; return; }
    if (emptyEl) emptyEl.style.display = 'none';
    el.innerHTML = _emoItems.map(function(item, idx) {
      var checks = [
        { k: 'irr', l: 'Irradiato' }, { k: 'fil', l: 'Filtrato' },
        { k: 'lav', l: 'Lavato' }, { k: 'fen', l: 'Fenotipizzato' }
      ];
      return '<div class="trasf-emo-card" data-idx="' + idx + '">' +
        '<div class="trasf-emo-card-header">' +
          '<span class="trasf-emo-card-type">' + C.esc(item.type) + '</span>' +
          '<button class="trasf-emo-remove" onclick="trasfRemoveEmoItem(' + idx + ')" title="Rimuovi">&times;</button>' +
        '</div>' +
        '<div class="trasf-emo-card-body">' +
          '<div class="prest-field" style="max-width:120px"><label>N\u00B0 unit\u00E0</label><input type="number" min="1" value="' + (item.units || 1) + '" onchange="trasfUpdateEmoItem(' + idx + ',\'units\',this.value)" /></div>' +
          '<div class="trasf-emo-checks">' +
            checks.map(function(c) {
              return '<label class="prest-ck"><input type="checkbox"' + (item[c.k] ? ' checked' : '') + ' onchange="trasfUpdateEmoItem(' + idx + ',\'' + c.k + '\',this.checked)" /> ' + c.l + '</label>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ── Emocomponent picker ─────────────────────────────────── */
  function openEmoPicker() {
    var chosen = _emoItems.map(function(e) { return e.type; });
    var available = EMO_TYPES.filter(function(t) { return chosen.indexOf(t) === -1; });
    var body = C.$('emoPickerBody');
    if (!body) return;
    if (!available.length) {
      body.innerHTML = '<div class="trasf-emo-empty">Tutti gli emocomponenti sono gi\u00E0 stati aggiunti.</div>';
    } else {
      body.innerHTML = available.map(function(t) {
        return '<button class="prest-picker-item" onclick="trasfPickEmo(\'' + t.replace(/'/g, "\\'") + '\')">' + C.esc(t) + '</button>';
      }).join('');
    }
    C.$('emoPickerBackdrop').classList.add('active');
  }
  function closeEmoPicker() { C.$('emoPickerBackdrop').classList.remove('active'); }
  function pickEmo(type) {
    _emoItems.push({ type: type, units: 1, irr: false, fil: false, lav: false, fen: false });
    renderEmoList();
    closeEmoPicker();
  }
  function removeEmoItem(idx) { _emoItems.splice(idx, 1); renderEmoList(); }
  function updateEmoItem(idx, key, val) {
    if (!_emoItems[idx]) return;
    _emoItems[idx][key] = key === 'units' ? parseInt(val, 10) || 1 : !!val;
  }

  /* ── Collect form data ───────────────────────────────────── */
  function collectFormData() {
    var v = function(id) { var el = C.$(id); return el ? el.value : ''; };
    return {
      reparto: v('trReparto'), nosologico: v('trNosologico'),
      paziente: v('trPaziente'), nascita: v('trNascita'), sesso: v('trSesso'),
      cf: v('trCF'), peso: v('trPeso'),
      gruppo_sanguigno: v('trGruppo'), rh: v('trRh'),
      diagnosi: v('trDiagnosi'), indicazione: v('trIndicazione'),
      hb: v('trHb'), hct: v('trHct'), plt: v('trPlt'),
      pt_inr: v('trInr'), aptt: v('trAptt'), fibrinogeno: v('trFibr'),
      urgenza: v('trUrgenza'),
      prev_trasfusioni: v('trPrev'), reazioni_note: v('trReaz') === 'No' ? '' : v('trNote'),
      medico: v('trMedico'), data_richiesta: v('trDataOra'), note: v('trNote'),
      emocomponents: _emoItems.map(function(e) {
        return { emo_type: e.type, units: e.units, irradiato: e.irr ? 1 : 0, filtrato: e.fil ? 1 : 0, lavato: e.lav ? 1 : 0, fenotipizzato: e.fen ? 1 : 0 };
      })
    };
  }

  /* ── Print ───────────────────────────────────────────────── */
  function doPrint() {
    var area = C.$('trasfPrintArea');
    if (!area) return;
    var w = window.open('', '_blank', 'width=900,height=700');
    w.document.write('<!DOCTYPE html><html><head><title>Richiesta Trasfusionale</title><style>' +
      'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:11px;color:#111;margin:20px;line-height:1.4}' +
      'fieldset{border:1px solid #999;border-radius:4px;padding:8px 12px;margin-bottom:10px;page-break-inside:avoid}' +
      'legend{font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:0 6px}' +
      '.prest-title-block{text-align:center;margin-bottom:14px}' +
      '.prest-title{font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}' +
      '.prest-subtitle{font-size:10px;color:#666}' +
      '.prest-row{display:flex;gap:10px;margin-bottom:6px}' +
      '.prest-row.cols-1 .prest-field{flex:1}' +
      '.prest-row.cols-2 .prest-field{flex:1}' +
      '.prest-row.cols-3 .prest-field{flex:1}' +
      '.prest-field label{display:block;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#555;margin-bottom:2px}' +
      '.prest-field input,.prest-field select,.prest-field textarea{border:none;border-bottom:1px solid #999;font-size:11px;font-family:inherit;width:100%;padding:2px 0;background:none}' +
      '.prest-field textarea{border:1px solid #999;border-radius:2px;padding:4px;resize:none}' +
      '.prest-checks,.trasf-emo-checks{display:flex;gap:10px;flex-wrap:wrap;font-size:10px}' +
      '.prest-ck{display:flex;align-items:center;gap:3px}' +
      '.prest-firma-box{height:40px;border-bottom:1px solid #999}' +
      '.trasf-emo-print{border:1px solid #999;border-radius:4px;padding:6px 10px;margin-bottom:6px}' +
      '.trasf-emo-print-type{font-weight:700;font-size:11px;margin-bottom:4px}' +
      '.trasf-emo-print-row{display:flex;gap:12px;align-items:center;font-size:10px}' +
      '.trasf-emo-list,.trasf-emo-empty,.prest-picker-backdrop{display:none}' +
      'button{display:none}' +
      '@page{margin:15mm}' +
    '</style></head><body>');
    // Clone and serialize current values
    var clone = area.cloneNode(true);
    clone.querySelectorAll('input,select,textarea').forEach(function(el) {
      var src = el.id ? area.querySelector('#' + el.id) : null;
      if (!src) return;
      if (el.tagName === 'SELECT') {
        for (var i = 0; i < el.options.length; i++) el.options[i].selected = el.options[i].value === src.value;
      } else if (el.type === 'checkbox') {
        if (src.checked) el.setAttribute('checked', 'checked'); else el.removeAttribute('checked');
      } else {
        el.setAttribute('value', src.value);
        if (el.tagName === 'TEXTAREA') el.textContent = src.value;
      }
    });
    // Build static emocomponent table for print
    var emoHtml = '';
    if (_emoItems.length) {
      emoHtml = '<fieldset><legend>Emocomponenti richiesti</legend>';
      _emoItems.forEach(function(item) {
        var traits = [];
        if (item.irr) traits.push('Irradiato');
        if (item.fil) traits.push('Filtrato');
        if (item.lav) traits.push('Lavato');
        if (item.fen) traits.push('Fenotipizzato');
        emoHtml += '<div class="trasf-emo-print"><div class="trasf-emo-print-type">' + C.esc(item.type) + '</div>' +
          '<div class="trasf-emo-print-row"><span>Unit\u00E0: <strong>' + item.units + '</strong></span>' +
          (traits.length ? '<span>Caratteristiche: ' + traits.join(', ') + '</span>' : '') +
          '</div></div>';
      });
      emoHtml += '</fieldset>';
    }
    var listEl = clone.querySelector('#trEmoList');
    var emptyEl = clone.querySelector('#trEmoEmpty');
    if (listEl) listEl.outerHTML = emoHtml;
    if (emptyEl) emptyEl.remove();
    var picker = clone.querySelector('#emoPickerBackdrop');
    if (picker) picker.remove();
    w.document.write(clone.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function() { w.print(); }, 300);
  }

  /* ── Module open (pre-fill from appointment) ─────────────── */
  function doOpen(a) {
    var v = function(id, val) { var el = C.$(id); if (el) el.value = val || ''; };
    v('trPaziente', a.patient_name);
    v('trCF', a.patient_id);
    v('trNascita', a.birth_date);
    v('trNosologico', a.patient_uuid);
    v('trDiagnosi', a.description);
    v('trMedico', a.doctor);
    v('trReparto', S.nodeMap[a.room_id] ? S.nodeMap[a.room_id].name : '');
    // date/time
    var now = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    v('trDataOra', now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()));
    // Reset clinical fields
    ['trSesso','trPeso','trGruppo','trRh','trHb','trHct','trPlt','trInr','trAptt','trFibr','trUrgenza','trPrev','trReaz'].forEach(function(id) {
      var el = C.$(id); if (el && el.tagName === 'SELECT') el.selectedIndex = 0; else if (el) el.value = '';
    });
    v('trNote', '');
    v('trIndicazione', a.notes);
    // Reset emocomponents
    _emoItems = [];
    renderEmoList();
    // Try to load saved data
    doLoad(a.id);
  }

  /* ── Save to backend ─────────────────────────────────────── */
  function doSave() {
    var apptId = S._detailApptId;
    if (!apptId) return Promise.resolve(false);
    var data = collectFormData();
    return Ag.Api.fetch('/appointments/' + apptId + '/transfusion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(function(res) {
      if (res && res.ok) {
        if (typeof Ag.Toast !== 'undefined') Ag.Toast.show('Richiesta trasfusionale salvata', 'success');
        return true;
      }
      return false;
    });
  }

  /* ── Load from backend ───────────────────────────────────── */
  function doLoad(apptId) {
    Ag.Api.fetch('/appointments/' + apptId + '/transfusion').then(function(res) {
      if (!res || !res.data) return;
      var d = res.data;
      var v = function(id, val) { var el = C.$(id); if (el) el.value = val || ''; };
      v('trReparto', d.reparto);
      v('trNosologico', d.nosologico);
      v('trDiagnosi', d.diagnosi);
      v('trIndicazione', d.indicazione);
      v('trGruppo', d.gruppo_sanguigno);
      v('trRh', d.rh);
      v('trHb', d.hb);
      v('trHct', d.hct);
      v('trPlt', d.plt);
      v('trInr', d.pt_inr);
      v('trAptt', d.aptt);
      v('trFibr', d.fibrinogeno);
      v('trUrgenza', d.urgenza);
      v('trPrev', d.prev_trasfusioni);
      v('trReaz', d.reazioni_note ? 'Sì (specificare sotto)' : 'No');
      v('trNote', d.note);
      v('trMedico', d.medico);
      v('trDataOra', d.data_richiesta);
      v('trSesso', d.sesso);
      v('trPeso', d.peso);
      // Load emocomponents
      _emoItems = (d.emocomponents || []).map(function(e) {
        return { type: e.emo_type, units: e.units, irr: !!e.irradiato, fil: !!e.filtrato, lav: !!e.lavato, fen: !!e.fenotipizzato };
      });
      renderEmoList();
      // Data loaded from backend → enable print
      if (typeof prestEnablePrint === 'function') prestEnablePrint();
    });
  }

  /* ── Module registration ─────────────────────────────────── */
  var TrasfusioneModule = {
    id: 'trasfusione',
    label: 'Richiesta Trasfusionale',
    icon: 'hgi-injection',
    match: function(a) {
      return (a.title && /trasfusion/i.test(a.title)) || (a.prestazione_code && /trasf/i.test(a.prestazione_code));
    },
    getHTML: function() { return TrasfusioneTemplate.getHTML(); },
    open: doOpen,
    close: function() {},
    print: doPrint,
    save: doSave,
    load: doLoad
  };

  PrestModules.register(TrasfusioneModule);

  /* ── Globals for onclick handlers ────────────────────────── */
  global.trasfOpenEmoPicker = openEmoPicker;
  global.trasfCloseEmoPicker = closeEmoPicker;
  global.trasfPickEmo = pickEmo;
  global.trasfRemoveEmoItem = removeEmoItem;
  global.trasfUpdateEmoItem = updateEmoItem;

})(window);
