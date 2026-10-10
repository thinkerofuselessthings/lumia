/**
 * agenda-api.js — API fetch wrapper for the Agenda module
 *
 * CSRF injection + 403 retry is handled trans-versally by
 * app/core/lumia-csrf.js (global window.fetch wrapper). This module
 * only layers timeout, error toast and response parsing on top.
 *
 * Exposes: Ag.Api
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config;

  function apiFetch(url, opts) {
    opts = opts || {};
    var ac = new AbortController();
    var tid = setTimeout(function() { ac.abort(); }, opts.timeout || C.API_TIMEOUT);
    // V3.M4.A1 A4.b: URL che iniziano con '/api/' sono assoluti (es. /api/cerus/...).
    // I path relativi vengono prefissati con C.API_BASE = '/api/agenda'.
    var fullUrl = (url.indexOf('/api/') === 0) ? url : (C.API_BASE + url);
    return fetch(fullUrl, Object.assign({}, opts, {
      signal: opts.signal || ac.signal,
      credentials: 'same-origin'
    })).then(function(r) {
      clearTimeout(tid);
      if (!r.ok) {
        return r.json().catch(function() { return {}; }).then(function(j) {
          var msg = 'Errore HTTP ' + r.status;
          if (j.error && j.error.message) msg = j.error.message;
          Ag.Toast.show(msg);
          return null;
        });
      }
      if (r.status === 204) return { success: true, data: null };
      return r.json().then(function(j) {
        if (!j.success) { Ag.Toast.show(j.error && j.error.message || 'Errore sconosciuto'); return null; }
        window.dispatchEvent(new Event('session-api-activity'));
        return j;
      });
    }).catch(function(e) {
      clearTimeout(tid);
      if (e.name === 'AbortError') { Ag.Toast.show('Richiesta scaduta (timeout)'); return null; }
      Ag.Toast.show('Errore di rete: server non raggiungibile');
      console.error('[apiFetch]', e);
      return null;
    });
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Api = Object.freeze({ fetch: apiFetch });

})(window);
