/* =======================================================================
 *  LumiaToast — Toast notification system (Janus/ChemERA spec)
 *  Espone: window.LumiaToast
 *  Ref: library_style.md §11 — Toast notifications
 *
 *  API:
 *    LumiaToast.info(msg)      — default dark
 *    LumiaToast.success(msg)   — green
 *    LumiaToast.warning(msg)   — amber
 *    LumiaToast.error(msg)     — red
 *    LumiaToast.show(msg, type, duration)  — generic
 * ======================================================================= */
(function (global) {
  'use strict';

  var CONTAINER_ID = 'lumiaToastContainer';
  var DEFAULT_DURATION = 2800; // ms, from guideline spec

  /* Ensure container exists (created once, appended to body) */
  function ensureContainer() {
    var c = document.getElementById(CONTAINER_ID);
    if (!c) {
      c = document.createElement('div');
      c.id = CONTAINER_ID;
      c.className = 'he-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  /**
   * Show a toast notification.
   * @param {string} message  — plain text
   * @param {string} [type]   — 'info' | 'success' | 'warning' | 'error'
   * @param {number} [duration] — ms, default 2800
   */
  function show(message, type, duration) {
    var container = ensureContainer();
    var toast = document.createElement('div');
    toast.className = 'he-toast' + (type && type !== 'info' ? ' he-toast-' + type : '');
    toast.textContent = message;
    container.appendChild(toast);

    var ms = typeof duration === 'number' ? duration : DEFAULT_DURATION;

    setTimeout(function () {
      toast.classList.add('he-toast-exit');
      toast.addEventListener('animationend', function () { toast.remove(); }, { once: true });
      // Safety net: remove after animation max
      setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
    }, ms);
  }

  /* ── Public API ── */
  global.LumiaToast = Object.freeze({
    show:    show,
    info:    function (msg, dur) { show(msg, 'info',    dur); },
    success: function (msg, dur) { show(msg, 'success', dur); },
    warning: function (msg, dur) { show(msg, 'warning', dur); },
    error:   function (msg, dur) { show(msg, 'error',   dur); }
  });

  /* Wire into LumiaEvents if available */
  if (global.LumiaEvents) {
    global.LumiaEvents.on('toast', function (payload) {
      show(payload.message || payload.msg || '', payload.type, payload.duration);
    });
  }

})(window);
