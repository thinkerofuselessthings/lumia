/**
 * shell-state.js — Application state, module registry, utilities
 */

/* ── Application State ── */
var state = {
  activeModule: null,
  openModules: {},
  selectedLibraryRoot: null,
  layerManager: null
};

/* ── CSRF token (populated by session guard in index.html) ── */
var csrfToken = '';

/* ── Utilities ── */
function esc(s) {
  return String(s).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m;
  });
}
function $(s, r) { return (r || document).querySelector(s); }

/* ── Module Registry ── */
var MODULE_INFO = {
  'tools':       { icon: 'hgi-stethoscope',  name: 'Tools',       contentKey: 'tools-module'       },
  'admin':       { icon: 'hgi-settings-02', name: 'Admin',       contentKey: 'admin-module-v2'    },
  'docs':        { icon: 'hgi-book-open-01',name: 'Docs',        contentKey: 'docs-module'        },
  'agenda':      { icon: 'hgi-calendar-03', name: 'Agenda',      contentKey: 'agenda-module-v2'   },
  'user':        { icon: 'hgi-user',        name: 'User',        contentKey: 'user-module'        },
  'laboratorio': { icon: 'hgi-test-tube-01',name: 'Laboratorio', contentKey: 'laboratorio-module' }
};

/* ── Icon map for registry helpers ── */
var LAYER_ICONS = {
  'fil-fitness-helper': 'hgi-dumbbell-01',
  'cd-b-lpd':           'hgi-test-tube-01',
  'mm-helper':          'hgi-blood',
  'mds-helper':         'hgi-file-01',
  'cmml-helper':        'hgi-dna',
  'aml-helper':         'hgi-blood',
  'cll':                'hgi-pill',
  'dlbcl':              'hgi-shield-01',
  'fl':                 'hgi-leaf-01',
  'mcl':                'hgi-cell-01'
};

/* ── API state ── */
var apiPort = 3500, apiKey = '', apiOnline = false;

/**
 * buildLayerLayout — Builds the standard layer-layout HTML for fullscreen modules.
 * Generates a vertical side-tab rail; tabs are added dynamically by setupLayerTabs().
 *
 * @param {Object} opts
 * @param {string} opts.badge       - Icon class for the badge (e.g. 'hgi-settings-02')
 * @param {string} opts.moduleKey   - Module key in MODULE_INFO (e.g. 'admin')
 * @param {string} opts.nodeId      - Layer node ID (for close button)
 * @returns {string} HTML string
 */
function buildLayerLayout(opts) {
  var modInfo = MODULE_INFO[opts.moduleKey] || {};
  var modName = modInfo.name || opts.moduleKey || '';
  return '<div class="layer-layout">' +
    '<nav class="tab-rail">' +
      /* Action buttons row */
      '<div class="tab-rail-actions">' +
        '<button class="tab-rail-btn tab-rail-launcher" type="button" title="Apri sezione (Ctrl+K)">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' +
        '</button>' +
        '<span style="flex:1"></span>' +
        '<button class="tab-rail-btn tab-rail-btn--close" type="button" data-layer-action="close" data-node-id="' + esc(opts.nodeId) + '" title="Chiudi modulo" aria-label="Chiudi">' +
          '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      /* Module name header */
      '<div class="tab-rail-header">' + esc(modName) + '</div>' +
      /* Scrollable tab list */
      '<div class="tab-rail-tabs"></div>' +
    '</nav>' +
    '<div class="layer-main"><div class="layer-main-content"></div></div>' +
  '</div>';
}

/**
 * setupLayerTabs — Dynamic Chrome-style tab manager for module sections.
 * Call AFTER setting container.innerHTML = buildLayerLayout(...).
 *
 * @param {HTMLElement} container - The layer content container
 * @param {Array} sections - [{key, icon, title, render(contentEl)}]
 * @param {Object} [opts]
 * @param {string} [opts.defaultSection] - Key of tab to open initially
 * @returns {Object} tab manager
 */
function setupLayerTabs(container, sections, opts) {
  opts = opts || {};
  var openTabs = [];
  var activeTab = null;
  var tabContainer = container.querySelector('.tab-rail-tabs');
  var contentArea = container.querySelector('.layer-main-content');
  var rail = container.querySelector('.tab-rail');
  var railHeader = container.querySelector('.tab-rail-header');

  function findSection(key) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].key === key) return sections[i];
    }
    return null;
  }

  function updateRailHeader() {
    /* No-op — header shows module name, not active section */
  }

  function renderStrip() {
    var html = '';
    openTabs.forEach(function(k) {
      var sec = findSection(k);
      if (!sec) return;
      var active = k === activeTab ? ' is-active' : '';
      html += '<button class="tab-rail-tab' + active + '" data-tab="' + esc(k) + '" title="' + esc(sec.title) + '">' +
        '<span class="tab-icon"><i class="hgi-stroke ' + esc(sec.icon) + '"></i></span>' +
        '<span class="tab-label">' + esc(sec.title) + '</span>' +
        '<span class="tab-close" data-close-tab="' + esc(k) + '">\u00d7</span>' +
      '</button>';
    });
    tabContainer.innerHTML = html;
    updateRailHeader();
  }

  function renderContent(key) {
    var sec = findSection(key);
    if (sec && sec.render) sec.render(contentArea);
  }

  function openSection(key) {
    if (openTabs.indexOf(key) < 0) openTabs.push(key);
    activeTab = key;
    renderStrip();
    renderContent(key);
  }

  function closeSection(key) {
    var idx = openTabs.indexOf(key);
    if (idx < 0) return;
    openTabs.splice(idx, 1);
    if (activeTab === key) {
      activeTab = openTabs[Math.min(idx, openTabs.length - 1)] || null;
      if (activeTab) renderContent(activeTab);
      else contentArea.innerHTML = '';
    }
    renderStrip();
  }

  function activateSection(key) {
    if (openTabs.indexOf(key) < 0) return openSection(key);
    activeTab = key;
    renderStrip();
    renderContent(key);
  }

  /* ── Rail click delegation ── */
  rail.addEventListener('click', function(e) {
    /* close-tab × */
    var closeBtn = e.target.closest('[data-close-tab]');
    if (closeBtn) { e.stopPropagation(); closeSection(closeBtn.dataset.closeTab); return; }
    /* tab click */
    var tab = e.target.closest('.tab-rail-tab');
    if (tab && tab.dataset.tab !== activeTab) { activateSection(tab.dataset.tab); return; }
    /* launcher button → open launcher */
    if (e.target.closest('.tab-rail-launcher')) {
      if (typeof openLauncher === 'function') openLauncher();
      return;
    }
  });

  /* ── Manager API ── */
  var mgr = {
    openSection: openSection,
    closeSection: closeSection,
    activateSection: activateSection,
    sections: sections,
    getOpenTabs: function() { return openTabs; },
    getActiveTab: function() { return activeTab; }
  };

  container._tabManager = mgr;
  window._activeTabManager = mgr;

  if (opts.defaultSection) openSection(opts.defaultSection);

  return mgr;
}

/**
 * buildLayerLayoutV2 — Builds the v2 layer layout HTML with horizontal tab strip,
 * content area, empty state, and launcher overlay placeholder.
 *
 * @param {Object} opts
 * @param {string} opts.nodeId      - Layer node ID (for close button)
 * @param {Object} opts.module      - { icon, title } for the module badge
 * @returns {string} HTML string
 */
function buildLayerLayoutV2(opts) {
  var mod = opts.module || {};
  return '<div class="layer-layout-v2">' +
    '<div class="tab-strip">' +
      '<div class="tab-strip-module">' +
        '<span class="tab-strip-module-icon">' + (mod.icon || '') + '</span>' +
        '<span class="tab-strip-module-name">' + esc(mod.title || '') + '</span>' +
      '</div>' +
      '<button class="tab-strip-btn tab-strip-dropdown" type="button" title="Launcher (Ctrl+K)">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
      '</button>' +
      '<div class="tab-strip-tabs"></div>' +
      '<span class="tab-strip-spacer"></span>' +
      '<button class="tab-strip-btn tab-strip-close" type="button" data-layer-action="close" data-node-id="' + esc(opts.nodeId) + '" title="Chiudi modulo" aria-label="Chiudi">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="content">' +
      '<div class="empty-state">' +
        '<div class="empty-state-badge">' + esc(mod.title || '') + '</div>' +
        '<div class="empty-state-shortcut" data-action="open-launcher">' +
          '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' +
          'Apri launcher' +
          '<kbd>Ctrl+K</kbd>' +
        '</div>' +
        '<div class="empty-state-hint">oppure tasto destro per il menu contestuale</div>' +
      '</div>' +
    '</div>' +
    '<div class="launcher-overlay"></div>' +
  '</div>';
}

/**
 * setupLayerV2 — Initializes tab strip + launcher for a v2 layer layout.
 * Call AFTER setting container.innerHTML = buildLayerLayoutV2(...).
 *
 * @param {HTMLElement} container   - The layer body container
 * @param {Object}      config      - Module config (sections, icons, module, actions, sectionCards)
 * @param {Object}      manager     - LayerSystem manager instance
 * @param {string}      moduleNodeId - The fullscreen node ID
 * @returns {Object} { tabStrip, launcher }
 */
function setupLayerV2(container, config, manager, moduleNodeId) {
  var layoutEl = container.querySelector('.layer-layout-v2');
  if (!layoutEl) return null;

  // Create tab strip
  var tabStrip = LumiaTabStrip.create(layoutEl, config, manager, moduleNodeId);

  // Create launcher
  var launcher = LumiaLauncher.create(layoutEl, config, tabStrip, manager, moduleNodeId);

  // Empty state click → open launcher
  var emptyShortcut = layoutEl.querySelector('[data-action="open-launcher"]');
  if (emptyShortcut) {
    emptyShortcut.addEventListener('click', function () { launcher.open(); });
  }

  // Right-click on content → open launcher
  var contentArea = layoutEl.querySelector('.content');
  if (contentArea) {
    contentArea.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      launcher.open();
    });
  }

  // Store references
  container._tabStrip = tabStrip;
  container._launcher = launcher;

  // Global tab strip registry (keyed by module node ID) for tree navigation
  if (!state._tabStrips) state._tabStrips = {};
  state._tabStrips[moduleNodeId] = tabStrip;

  return { tabStrip: tabStrip, launcher: launcher };
}
