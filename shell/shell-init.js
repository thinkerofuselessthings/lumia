/**
 * shell-init.js â€” DOMContentLoaded: layer manager, events, API monitor
 */

document.addEventListener('DOMContentLoaded', function() {

  /* â”€â”€ Create layer manager â”€â”€ */
  state.layerManager = window.LayerSystem.createManager(document.getElementById('layerRoot'));

  /* â”€â”€ Landing = Library â”€â”€ */
  showLibrary();

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Layer system event synchronisation
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  state.layerManager.on('node:closed', function(data) {
    var keys = Object.keys(state.openModules);
    for (var i = 0; i < keys.length; i++) {
      if (state.openModules[keys[i]] === data.nodeId) {
        delete state.openModules[keys[i]];
        // Clean up tab strip registry
        if (state._tabStrips) delete state._tabStrips[data.nodeId];
        break;
      }
    }
    /* Clear library selection if the closed root was selected */
    if (state.selectedLibraryRoot === data.nodeId) {
      state.selectedLibraryRoot = null;
    }
    updateCardStates();

    if (!state.layerManager.hasOpenNodes()) {
      showLibrary();
    } else {
      var snap = state.layerManager.getSnapshot();
      var focused = snap.focusedNodeId;
      if (focused) {
        var nodeMap2 = {};
        snap.nodes.forEach(function(n) { nodeMap2[n.id] = n; });
        var root2 = nodeMap2[focused];
        while (root2 && root2.parentId) root2 = nodeMap2[root2.parentId];
        if (root2) {
          var shell = document.getElementById('library-shell');
          if (shell) shell.classList.add('hidden');
          state.layerManager.getAllNodes().forEach(function(n) { n.element.classList.add('is-background'); });
          revealTree(root2.id);
          state.activeModule = null;
          var keys2 = Object.keys(state.openModules);
          for (var j = 0; j < keys2.length; j++) {
            if (state.openModules[keys2[j]] === root2.id) { state.activeModule = keys2[j]; break; }
          }
        }
      }
      renderLibraryList();
      renderLibraryTree();
    }
  });

  state.layerManager.on('node:opened', function(data) {
    /* Auto-select newly opened root so its tree shows immediately */
    if (data && data.nodeId) {
      var n = state.layerManager.getNodeById(data.nodeId);
      if (n && !n.parentId) state.selectedLibraryRoot = data.nodeId;
    }
    renderLibraryList();
    renderLibraryTree();
  });
  state.layerManager.on('focus:changed', function() { renderLibraryTree(); });

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Click event delegation
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  document.addEventListener('click', function(e) {
    /* Module card */
    var card = e.target.closest('.quick-module-button[data-module]');
    if (card) { openModule(card.dataset.module); return; }

    /* Logout */
    if (e.target.closest('#btn-logout')) { doLogout(); return; }

    /* Back to library (sidebar / activity bar) */
    if (e.target.closest('[data-go-library]')) { showLibrary(); return; }

    /* Close tracked module (col 2) */
    var closeModBtn = e.target.closest('[data-close-module]');
    if (closeModBtn) {
      e.stopPropagation();
      var mod = closeModBtn.dataset.closeModule;
      var nid = state.openModules[mod];
      if (nid) state.layerManager.closeNode(nid);
      return;
    }

    /* Close untracked layer (col 2) */
    var closeNodeBtn = e.target.closest('[data-close-node]');
    if (closeNodeBtn) {
      e.stopPropagation();
      if (closeNodeBtn.dataset.closeNode) state.layerManager.closeNode(closeNodeBtn.dataset.closeNode);
      return;
    }

    /* Focus library item (col 2) — selects for Tree column (does NOT navigate) */
    var item = e.target.closest('.library-item-row');
    if (item) {
      var nodeId2 = item.dataset.nodeId;
      if (nodeId2) {
        state.selectedLibraryRoot = nodeId2;
        renderLibraryList();
        renderLibraryTree();
      }
      return;
    }

    /* Tree node (col 3) */
    var treeCard = e.target.closest('[data-tree-node]');
    if (treeCard) {
      var treeNodeId = treeCard.dataset.treeNode;
      var node = state.layerManager.getNodeById(treeNodeId);
      if (!node) return;
      var snap = state.layerManager.getSnapshot();
      var nm = {};
      snap.nodes.forEach(function(n) { nm[n.id] = n; });
      var rootSnap = nm[treeNodeId];
      while (rootSnap && rootSnap.parentId) rootSnap = nm[rootSnap.parentId];
      if (!rootSnap) return;
      var mod3 = null;
      var kk = Object.keys(state.openModules);
      for (var k = 0; k < kk.length; k++) {
        if (state.openModules[kk[k]] === rootSnap.id) { mod3 = kk[k]; break; }
      }
      if (mod3) {
        focusModule(mod3, rootSnap.id);
        if (treeNodeId !== rootSnap.id) {
          state.layerManager.applyFocus(treeNodeId);
          // Section node → activate the corresponding tab
          if (node.kind === 'section' && node.contentKey && state._tabStrips) {
            var ts = state._tabStrips[rootSnap.id];
            if (ts) ts.activateSection(node.contentKey);
          }
        }
      } else {
        var sh = document.getElementById('library-shell');
        if (sh) sh.classList.add('hidden');
        state.layerManager.getAllNodes().forEach(function(n) { n.element.classList.add('is-background'); });
        revealTree(rootSnap.id);
        state.layerManager.applyFocus(treeNodeId);
      }
    }
  });

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  API Monitor â€” config, health, WebSocket
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  var apiPanel = document.getElementById('apiLogPanel');
  var apiLogList = document.getElementById('apiLogList');
  var apiDot = document.getElementById('apiDot');
  var apiStatusText = document.getElementById('apiStatusText');
  var apiKeyDisplay = document.getElementById('apiKeyDisplay');

  document.getElementById('closeApiLog').addEventListener('click', function() {
    apiPanel.classList.remove('is-open');
  });

  (async function initApiConfig() {
    apiPort = parseInt(window.location.port, 10) || 3500;
    // V3.M1.A1: /api/config non ritorna più apiKey. Il browser non ne ha bisogno:
    // tutte le request usano cookie di sessione (+ CSRF), non X-API-Key.
    try {
      var cfgRes = await fetch('/api/config', { credentials: 'same-origin' });
      var cfgData = await cfgRes.json();
      if (cfgData.ok) {
        apiKeyDisplay.textContent = '\u2014 (cookie session)';
      }
    } catch (_) {}
    checkApiHealth();
  })();

  function checkApiHealth() {
    fetch('/api/health')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.ok) {
          apiOnline = true;
          apiDot.classList.add('online');
          var engMap = d.engines || {};
          var engines = Object.entries(engMap).filter(function(kv) { return kv[1]; }).map(function(kv) { return kv[0]; });
          apiStatusText.textContent = 'Online \xb7 porta ' + apiPort + ' \xb7 ' + engines.length + ' engine' + (engines.length !== 1 ? 's' : '');
          /* connectLogWS — disabled: main LUMIA server has no WebSocket.
             The old api-server.js had WS support but is no longer used.
             Re-enable when WS is added to src/server.js */
        } else { setOffline(); }
      })
      .catch(function() { setOffline(); });
  }

  function setOffline() {
    apiOnline = false;
    apiDot.classList.remove('online');
    apiStatusText.textContent = 'Offline \u2014 avvia il server';
  }

  setInterval(checkApiHealth, 15000);

  function fetchLog() {
    if (!apiOnline) return;
    // V3.M1.A2: /api/log richiede sessione admin. Niente X-API-Key dal browser.
    // Per utenti non admin la response è 403 → silently ignored.
    fetch('/api/log?limit=50', { credentials: 'same-origin' })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) { if (d && d.ok && d.entries) renderLogEntries(d.entries); })
      .catch(function() {});
  }

  var logWs = null;
  function connectLogWS() {
    if (logWs) return;
    try {
      logWs = new WebSocket('ws://' + window.location.host);
      logWs.onopen = function() {
        logWs.send(JSON.stringify({ type: 'auth', apiKey: apiKey }));
        fetchLog();
      };
      logWs.onmessage = function(ev) {
        try {
          var msg = JSON.parse(ev.data);
          if (msg.type === 'apiLog' && msg.entry) appendLogEntry(msg.entry);
        } catch (_) {}
      };
      logWs.onclose = function() { logWs = null; };
    } catch (_) { logWs = null; }
  }

  function renderLogEntries(entries) {
    if (!entries.length) { apiLogList.innerHTML = '<div class="api-log-empty">Nessuna chiamata registrata.</div>'; return; }
    apiLogList.innerHTML = '';
    entries.forEach(appendLogEntry);
  }

  function appendLogEntry(e) {
    var empty = apiLogList.querySelector('.api-log-empty');
    if (empty) empty.remove();
    var div = document.createElement('div');
    div.className = 'api-log-entry';
    var time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '';
    var isWs = e.type === 'WS';
    div.innerHTML = '<span class="log-time">' + time + '</span> ' +
      '<span class="log-method' + (isWs ? ' ws' : '') + '">' + (e.type || 'REST') + ' ' + (e.method || '') + '</span> ' +
      '<span class="log-path">' + (e.path || e.engine || '') + '</span>' +
      (e.resultCount !== undefined ? ' <span class="log-result">\u2192 ' + e.resultCount + ' risultati</span>' : '') +
      (e.result ? ' <span class="log-result">\u2192 ' + e.result + '</span>' : '');
    apiLogList.prepend(div);
    while (apiLogList.children.length > 100) apiLogList.lastChild.remove();
  }

  /* â•â• Event bus integration â•â• */
  if (window.LumiaEvents) {
    window.LumiaEvents.on('openRegistryHelper', function(d) {
      if (d && d.id) openRegistryHelper(d.id);
    });
  }
});
