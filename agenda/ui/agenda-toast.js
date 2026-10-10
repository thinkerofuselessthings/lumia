/**
 * agenda-toast.js — Toast notifications for the Agenda module
 * Exposes: Ag.Toast
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var $ = Ag.Config.$;

  /* ── Init toast container ──────────────────────────────────── */
  (function initToast() {
    if (document.getElementById('ag-toast-container')) return;
    var c = document.createElement('div');
    c.id = 'ag-toast-container';
    c.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(c);
  })();

  function showToast(msg, type, ms) {
    type = type || 'error';
    ms = ms || 4000;
    // Bridge to LUMIA toast if available
    if (global.LumiaToast && typeof global.LumiaToast.show === 'function') {
      global.LumiaToast.show(msg, type, ms);
      return;
    }
    var container = document.getElementById('ag-toast-container');
    if (!container) return;
    var t = document.createElement('div');
    t.style.cssText = 'padding:10px 18px;border-radius:8px;font-size:.82rem;color:#fff;pointer-events:auto;opacity:0;transition:opacity .3s;max-width:360px;word-break:break-word;box-shadow:0 4px 12px rgba(0,0,0,.15)';
    t.style.background = type === 'error' ? 'var(--error,#e06060)' : type === 'ok' ? '#4caf50' : 'var(--primary,#5ac8e6)';
    t.textContent = msg;
    container.appendChild(t);
    requestAnimationFrame(function() { t.style.opacity = '1'; });
    setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 300); }, ms);
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Toast = Object.freeze({ show: showToast });

})(window);
