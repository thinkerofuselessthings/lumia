/* =======================================================================
 *  HematoA11y — Keyboard navigation & ARIA utilities
 *  Espone: window.HematoA11y
 *  Dipendenze: nessuna
 *  Pattern: IIFE su window
 *
 *  Funzionalità:
 *    - Focus-trap per dialog/modal aperti
 *    - Escape chiude il dialog più in alto
 *    - Enter su card/button attiva il click
 *    - Arrow keys per navigazione griglia marker
 *    - Auto-focus primo elemento interattivo alla apertura dialog
 *    - Annuncio screen-reader via live region
 * ======================================================================= */
(function (global) {
  'use strict';

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /* ─── Live region for screen readers ─── */
  var liveRegion = null;
  function ensureLive() {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'he-sr-only';
      document.body.appendChild(liveRegion);
    }
    return liveRegion;
  }

  /** Announce a message to screen readers */
  function announce(msg) {
    var lr = ensureLive();
    lr.textContent = '';
    // Force re-announcement by clearing then setting after frame
    requestAnimationFrame(function () { lr.textContent = msg; });
  }

  /* ─── Focus trap ─── */
  /**
   * Trap focus within an element.
   * Returns a release() function.
   */
  function trapFocus(container) {
    if (!container) return function () {};

    function handler(e) {
      if (e.key !== 'Tab') return;
      var focusable = container.querySelectorAll(FOCUSABLE);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handler);
    // Auto-focus first focusable
    var first = container.querySelector(FOCUSABLE);
    if (first) requestAnimationFrame(function () { first.focus(); });

    return function release() {
      container.removeEventListener('keydown', handler);
    };
  }

  /* ─── Auto-focus on dialog open ─── */
  function autoFocusDialog(dlg) {
    if (!dlg) return;
    var target = dlg.querySelector('[autofocus]') || dlg.querySelector(FOCUSABLE);
    if (target) requestAnimationFrame(function () { target.focus(); });
  }

  /* ─── Global Escape handler ─── */
  // Closes the topmost open dialog (highest z-index)
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    // Find all open dialogs
    var dialogs = document.querySelectorAll('dialog[open]');
    if (dialogs.length === 0) {
      // Check for .modal.show layers
      var modals = document.querySelectorAll('.modal.show');
      if (modals.length === 0) return;
      // Close the one with highest z-index
      var top = null;
      var maxZ = -1;
      modals.forEach(function (m) {
        var z = parseInt(m.style.zIndex || '0', 10);
        if (z > maxZ) { maxZ = z; top = m; }
      });
      if (top) {
        e.preventDefault();
        // Try the matching close button
        var closeBtn = top.querySelector('[id$="closeA"], [id$="closeB"], [id$="close"]');
        if (closeBtn) closeBtn.click();
        else top.classList.remove('show');
      }
      return;
    }

    // Close topmost dialog
    var topDlg = null;
    var maxZ2 = -1;
    dialogs.forEach(function (d) {
      var z = parseInt(d.style.zIndex || '0', 10);
      if (z > maxZ2) { maxZ2 = z; topDlg = d; }
    });
    if (topDlg) {
      e.preventDefault();
      topDlg.close();
    }
  });

  /* ─── Arrow key grid navigation ─── */
  // For .state-grid elements: ArrowLeft/Right cycle states
  document.addEventListener('keydown', function (e) {
    var el = document.activeElement;
    if (!el || !el.classList.contains('state')) return;
    var grid = el.closest('.state-grid');
    if (!grid) return;

    var items = Array.from(grid.querySelectorAll('.state'));
    var idx = items.indexOf(el);
    if (idx < 0) return;

    var next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (idx + 1) % items.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (idx - 1 + items.length) % items.length;
    }
    if (next >= 0) {
      e.preventDefault();
      items[next].focus();
      items[next].click(); // activate the state
    }
  });

  /* ─── Enter activation for cards / interactive elements ─── */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var el = document.activeElement;
    if (!el) return;

    // Activate cards (.he-lib-card, .list-item, .vitem)
    if (el.matches('.he-lib-card, .list-item, .vitem, [data-helper-id]')) {
      e.preventDefault();
      el.click();
    }
  });

  /* ─── Ensure all interactive cards are keyboard-focusable ─── */
  function ensureTabIndex() {
    document.querySelectorAll('.he-lib-card, .list-item, .vitem').forEach(function (el) {
      if (!el.getAttribute('tabindex') && el.tagName !== 'BUTTON' && el.tagName !== 'A') {
        el.setAttribute('tabindex', '0');
      }
    });
  }

  // Run on DOMContentLoaded and observe for dynamic content
  document.addEventListener('DOMContentLoaded', function () {
    ensureTabIndex();
    // Observe body for newly added interactive elements
    if (global.MutationObserver) {
      var observer = new MutationObserver(function () { ensureTabIndex(); });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  });

  /* ── Public API ── */
  global.HematoA11y = Object.freeze({
    trapFocus:       trapFocus,
    autoFocusDialog: autoFocusDialog,
    announce:        announce,
    FOCUSABLE:       FOCUSABLE
  });

})(window);
