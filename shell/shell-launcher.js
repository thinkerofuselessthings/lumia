/**
 * shell-launcher.js — Launcher modal (module section menu)
 * Shows available sections of the currently active module.
 * Opens via Ctrl+K, ▼ dropdown button, or + button in tab strip.
 * Depends on: shell-state.js (state, esc, _activeTabManager)
 */
(function() {
  'use strict';

  var GRID_COLS = 4;
  var overlay = null;
  var isOpen = false;
  var selectedIndex = 0;

  /* ── Build the launcher overlay DOM (once) ── */
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'launcher-overlay';
    overlay.innerHTML =
      '<div class="launcher">' +
        '<div class="launcher-preview">' +
          '<div class="launcher-preview-content">' +
            '<svg class="launcher-preview-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>' +
            '</svg>' +
            '<span class="launcher-preview-title">Sezioni</span>' +
          '</div>' +
        '</div>' +
        '<div class="launcher-menu">' +
          '<div class="launcher-grid" id="launcherGrid"></div>' +
        '</div>' +
      '</div>';

    /* close on overlay click (outside modal) */
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeLauncher();
    });

    /* card click delegation */
    overlay.querySelector('#launcherGrid').addEventListener('click', function(e) {
      var card = e.target.closest('.launcher-card');
      if (!card) return;
      var action = card.dataset.action;
      var mgr = window._activeTabManager;

      if (action === '_close') {
        closeLauncher();
        if (state.activeModule && state.openModules[state.activeModule]) {
          var lm = state.layerManager;
          if (lm) lm.closeNode(state.openModules[state.activeModule]);
        }
      } else if (action === '_library') {
        closeLauncher();
        if (typeof showLibrary === 'function') showLibrary();
      } else if (action && mgr) {
        closeLauncher();
        mgr.openSection(action);
      }
    });

    /* card hover → update selection */
    overlay.querySelector('#launcherGrid').addEventListener('mouseover', function(e) {
      var card = e.target.closest('.launcher-card');
      if (!card) return;
      var cards = getAllCards();
      var idx = Array.prototype.indexOf.call(cards, card);
      if (idx >= 0) { selectedIndex = idx; updateSelection(cards); }
    });

    document.body.appendChild(overlay);
    return overlay;
  }

  function getAllCards() {
    return overlay.querySelectorAll('.launcher-card');
  }

  /* ── Render the grid from the active module's sections ── */
  function renderGrid() {
    var grid = overlay.querySelector('#launcherGrid');
    var mgr = window._activeTabManager;
    var html = '';

    if (mgr && mgr.sections && mgr.sections.length) {
      var openTabs = mgr.getOpenTabs();
      mgr.sections.forEach(function(sec, i) {
        var num = i + 1;
        var padNum = num < 10 ? '0' + num : '' + num;
        var isOpenCls = openTabs.indexOf(sec.key) >= 0 ? ' is-open' : '';
        html +=
          '<button class="launcher-card' + isOpenCls + '" data-action="' + esc(sec.key) + '">' +
            '<div class="launcher-card-header">' +
              '<span class="launcher-card-num">' + padNum + '</span>' +
              '<span class="launcher-card-name">' + esc(sec.title) + '</span>' +
            '</div>' +
            '<div class="launcher-card-icon"><i class="hgi-stroke ' + esc(sec.icon) + '"></i></div>' +
            (sec.desc ? '<div class="launcher-card-desc">' + esc(sec.desc) + '</div>' : '') +
          '</button>';
      });
    } else {
      html += '<div style="grid-column:1/-1;padding:24px;color:var(--muted);font-size:13px;">Nessuna sezione disponibile.</div>';
    }

    /* separator + action cards (always on own row) */
    html += '<div class="launcher-actions-row">';
    html +=
      '<button class="launcher-card launcher-card--action" data-action="_close">' +
        '<div class="launcher-card-header">' +
          '<span class="launcher-card-name">Chiudi modulo</span>' +
        '</div>' +
        '<div class="launcher-card-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div>' +
        '<div class="launcher-card-desc">Chiude il layer corrente</div>' +
      '</button>' +
      '<button class="launcher-card launcher-card--action" data-action="_library">' +
        '<div class="launcher-card-header">' +
          '<span class="launcher-card-name">Libreria</span>' +
        '</div>' +
        '<div class="launcher-card-icon"><i class="hgi-stroke hgi-grid-view"></i></div>' +
        '<div class="launcher-card-desc">Apri la libreria moduli</div>' +
      '</button>';
    html += '</div>';

    grid.innerHTML = html;
  }

  function updateSelection(cards) {
    if (!cards) cards = getAllCards();
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('is-selected', i === selectedIndex);
    }
  }

  /* ── Open / Close ── */
  function openLauncher() {
    ensureOverlay();
    renderGrid();
    selectedIndex = 0;
    updateSelection();
    overlay.classList.add('is-open');
    isOpen = true;
  }

  function closeLauncher() {
    if (!overlay) return;
    overlay.classList.remove('is-open');
    isOpen = false;
  }

  function toggleLauncher() {
    if (isOpen) closeLauncher(); else openLauncher();
  }

  /* ── Keyboard ── */
  document.addEventListener('keydown', function(e) {
    /* Ctrl+K → toggle launcher (only when a module layer is active) */
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (!state.activeModule) return;
      /* Skip V1 launcher when a V2 layout is active */
      if (state._tabStrips && state.openModules[state.activeModule] && state._tabStrips[state.openModules[state.activeModule]]) return;
      toggleLauncher();
      return;
    }

    if (!isOpen) return;

    var cards = getAllCards();
    var total = cards.length;
    if (!total) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeLauncher();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % total;
      updateSelection(cards);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + total) % total;
      updateSelection(cards);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + GRID_COLS, total - 1);
      updateSelection(cards);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - GRID_COLS, 0);
      updateSelection(cards);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cards[selectedIndex]) cards[selectedIndex].click();
    }
  });

  /* ── Right-click anywhere → open launcher (only when a module layer is active) ── */
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    /* Block launcher when library is the active view (no module layer open) */
    if (!state.activeModule) return;
    /* Skip V1 launcher when a V2 layout is active (V2 has its own launcher) */
    if (state._tabStrips && state.openModules[state.activeModule] && state._tabStrips[state.openModules[state.activeModule]]) return;
    toggleLauncher();
  });

  /* ── Additional keyboard shortcuts ── */
  document.addEventListener('keydown', function(e) {
    /* Ctrl+W → close active tab */
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      var mgr = window._activeTabManager;
      if (mgr && mgr.getActiveTab()) mgr.closeSection(mgr.getActiveTab());
      return;
    }
    /* Ctrl+Tab / Ctrl+Shift+Tab → cycle tabs */
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      var mgr2 = window._activeTabManager;
      if (!mgr2) return;
      var tabs = mgr2.getOpenTabs();
      if (tabs.length < 2) return;
      var idx = tabs.indexOf(mgr2.getActiveTab());
      var next = e.shiftKey
        ? (idx - 1 + tabs.length) % tabs.length
        : (idx + 1) % tabs.length;
      mgr2.activateSection(tabs[next]);
      return;
    }
    /* Ctrl+1..9 → activate tab by position */
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      var mgr3 = window._activeTabManager;
      if (!mgr3) return;
      var tabIdx = parseInt(e.key) - 1;
      var openT = mgr3.getOpenTabs();
      if (tabIdx < openT.length) mgr3.activateSection(openT[tabIdx]);
      return;
    }
  });

  /* ── Expose globally ── */
  window.openLauncher = openLauncher;
  window.closeLauncher = closeLauncher;
  window.toggleLauncher = toggleLauncher;
})();
