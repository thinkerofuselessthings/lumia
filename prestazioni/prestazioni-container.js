/**
 * prestazioni-container.js — Shared backdrop/modal for prestazioni modules
 * Provides generic open/close/print/save container; each module injects its body.
 * Depends on: PrestModules (registry.js), Ag.Config (agenda-config.js)
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;
  var _activeMod = null;
  var _currentAppt = null;
  var _isSaved = false;

  function _updatePrintBtn() {
    var btn = C.$('prestBtnPrint');
    if (btn) btn.disabled = !_isSaved;
  }

  function prestEnablePrint() { _isSaved = true; _updatePrintBtn(); }

  function prestOpen(moduleId) {
    var a = S.appointments.find(function(x) { return x.id === S._detailApptId; });
    if (!a) return;
    var mod = global.PrestModules.getById(moduleId);
    if (!mod) return;
    _activeMod = mod;
    _currentAppt = a;
    _isSaved = false;
    C.$('prestTitle').textContent = mod.label;
    var body = C.$('prestBody');
    body.innerHTML = mod.getHTML();
    // Show/hide save button based on module capability
    var btnSave = C.$('prestBtnSave');
    if (btnSave) btnSave.style.display = mod.save ? '' : 'none';
    _updatePrintBtn();
    mod.open(a);
    C.$('prestBackdrop').classList.add('active');
  }

  function prestClose() {
    if (_activeMod && _activeMod.close) _activeMod.close();
    C.$('prestBackdrop').classList.remove('active');
    _activeMod = null;
    _currentAppt = null;
  }

  function prestPrint() {
    if (_activeMod && _activeMod.print) _activeMod.print();
  }

  function prestSave() {
    if (_activeMod && _activeMod.save && _currentAppt) {
      var result = _activeMod.save(_currentAppt);
      if (result && typeof result.then === 'function') {
        result.then(function(ok) { if (ok !== false) prestEnablePrint(); });
      }
    }
  }

  /* ── Globals for HTML onclick ── */
  global.prestOpen = prestOpen;
  global.prestClose = prestClose;
  global.prestPrint = prestPrint;
  global.prestSave = prestSave;
  global.prestEnablePrint = prestEnablePrint;
})(window);
