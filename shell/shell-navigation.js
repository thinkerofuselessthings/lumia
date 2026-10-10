/**
 * shell-navigation.js â€” Library â†” Layer navigation, rendering, logout
 */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *  Navigation â€” Library â†” Layers
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function showLibrary() {
  state.activeModule = null;
  var shell = document.getElementById('library-shell');
  if (shell) shell.classList.remove('hidden');
  if (state.layerManager) {
    state.layerManager.getAllNodes().forEach(function(n) {
      n.element.classList.add('is-background');
    });
  }
  renderLibraryList();
  renderLibraryTree();
  updateCardStates();
}

function openModule(mod) {
  var existing = state.openModules[mod];
  if (existing) { focusModule(mod, existing); return; }
  var cfg = MODULE_INFO[mod];
  if (!cfg) return;
  state.activeModule = mod;
  var shell = document.getElementById('library-shell');
  if (shell) shell.classList.add('hidden');
  state.layerManager.getAllNodes().forEach(function(n) {
    n.element.classList.add('is-background');
  });
  var nodeId = state.layerManager.openNode(null, {
    kind: 'fullscreen',
    title: cfg.name,
    contentKey: cfg.contentKey,
    contentData: {}
  });
  if (nodeId) {
    state.openModules[mod] = nodeId;
    updateCardStates();
  }
}

function focusModule(mod, nodeId) {
  state.activeModule = mod;
  var shell = document.getElementById('library-shell');
  if (shell) shell.classList.add('hidden');
  state.layerManager.getAllNodes().forEach(function(n) {
    n.element.classList.add('is-background');
  });
  revealTree(nodeId);
  state.layerManager.applyFocus(nodeId);
}

function revealTree(nodeId) {
  var snap = state.layerManager.getSnapshot();
  var nodeMap = {};
  snap.nodes.forEach(function(n) { nodeMap[n.id] = n; });
  var root = nodeMap[nodeId];
  while (root && root.parentId) root = nodeMap[root.parentId];
  if (!root) return;
  var toReveal = [];
  (function collect(id) {
    toReveal.push(id);
    var n = nodeMap[id];
    if (n && n.childrenIds) n.childrenIds.forEach(collect);
  })(root.id);
  toReveal.forEach(function(id) {
    var rec = state.layerManager.getNodeById(id);
    if (rec) rec.element.classList.remove('is-background');
  });
}

function updateCardStates() {
  document.querySelectorAll('.quick-module-button[data-module]').forEach(function(btn) {
    btn.classList.toggle('is-open', !!state.openModules[btn.dataset.module]);
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *  Column 2 â€” Open Modules
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function renderLibraryList() {
  var list = document.getElementById('library-list');
  if (!list || !state.layerManager) return;
  var trackedNodeIds = {};
  var rootIds = [];
  Object.keys(state.openModules).forEach(function(mod) {
    var nid = state.openModules[mod];
    trackedNodeIds[nid] = true;
    rootIds.push(nid);
  });
  state.layerManager.getOpenRoots().forEach(function(r) {
    if (!trackedNodeIds[r.id]) rootIds.push(r.id);
  });
  /* Ensure selection is valid */
  if (state.selectedLibraryRoot && rootIds.indexOf(state.selectedLibraryRoot) === -1) {
    state.selectedLibraryRoot = null;
  }
  if (!state.selectedLibraryRoot && rootIds.length) {
    state.selectedLibraryRoot = rootIds[0];
  }
  var html = '';
  Object.keys(state.openModules).forEach(function(mod) {
    var nodeId = state.openModules[mod];
    var info = MODULE_INFO[mod] || { icon: 'hgi-grid-view', name: mod };
    var sel = nodeId === state.selectedLibraryRoot ? ' is-selected' : '';
    html += '<button class="library-item-row' + sel + '" data-module="' + esc(mod) + '" data-node-id="' + esc(nodeId) + '">' +
      '<span class="lib-item-icon"><i class="hgi-stroke ' + info.icon + '"></i></span>' +
      '<span class="lib-item-name">' + esc(info.name) + '</span>' +
      '<span class="lib-item-close" data-close-module="' + esc(mod) + '" title="Chiudi"><i class="hgi-stroke hgi-cancel-01"></i></span>' +
    '</button>';
  });
  state.layerManager.getOpenRoots().forEach(function(r) {
    if (!trackedNodeIds[r.id]) {
      var sel = r.id === state.selectedLibraryRoot ? ' is-selected' : '';
      html += '<button class="library-item-row' + sel + '" data-node-id="' + esc(r.id) + '">' +
        '<span class="lib-item-icon"><i class="hgi-stroke hgi-grid-view"></i></span>' +
        '<span class="lib-item-name">' + esc(r.title || 'Layer') + '</span>' +
        '<span class="lib-item-close" data-close-node="' + esc(r.id) + '" title="Chiudi"><i class="hgi-stroke hgi-cancel-01"></i></span>' +
      '</button>';
    }
  });
  list.innerHTML = html || '<p class="text-xs text-muted" style="padding:0 .7rem">Nessun modulo aperto</p>';
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *  Column 3 â€” Node Tree
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function renderLibraryTree() {
  var tree = document.getElementById('library-tree');
  if (!tree || !state.layerManager) return;
  var snap = state.layerManager.getSnapshot();
  if (!snap.nodes.length) {
    tree.innerHTML = '<p class="text-xs text-muted" style="padding:0 .7rem">Nessun nodo attivo</p>';
    return;
  }
  var nodeMap = {};
  snap.nodes.forEach(function(n) { nodeMap[n.id] = n; });
  var allRoots = snap.nodes.filter(function(n) { return !n.parentId; })
    .sort(function(a, b) { return a.zIndex - b.zIndex; });
  /* Filter to only the selected module's root (column 3 shows the
     tree of the module currently selected in column 2). */
  var roots = state.selectedLibraryRoot
    ? allRoots.filter(function(r) { return r.id === state.selectedLibraryRoot; })
    : allRoots;
  if (!roots.length) {
    tree.innerHTML = '<p class="text-xs text-muted" style="padding:0 .7rem">Nessun modulo selezionato</p>';
    return;
  }
  var focusedId = snap.focusedNodeId;

  function modNameForNode(nodeId) {
    var keys = Object.keys(state.openModules);
    for (var i = 0; i < keys.length; i++) {
      if (state.openModules[keys[i]] === nodeId) return MODULE_INFO[keys[i]] ? MODULE_INFO[keys[i]].name : keys[i];
    }
    return null;
  }
  function iconForNode(n) {
    if (n.kind === 'section') return 'hgi-layout-top';
    var keys = Object.keys(state.openModules);
    for (var i = 0; i < keys.length; i++) {
      if (state.openModules[keys[i]] === n.id) return MODULE_INFO[keys[i]] ? MODULE_INFO[keys[i]].icon : 'hgi-grid-view';
    }
    return LAYER_ICONS[n.contentKey] || 'hgi-grid-view';
  }
  function renderNode(n, isRoot) {
    var isFocused = n.id === focusedId;
    var children = snap.nodes.filter(function(c) { return c.parentId === n.id; })
      .sort(function(a, b) { return a.zIndex - b.zIndex; });
    var label = modNameForNode(n.id) || n.title || 'Layer';
    var icon = iconForNode(n);
    var cardClass = isRoot ? 'tree-card tree-card-module' : 'tree-card tree-card-child';
    var activeClass = isFocused ? ' tree-card-active' : '';
    var html = '<li><div class="' + cardClass + activeClass + '" data-tree-node="' + esc(n.id) + '">' +
      '<span class="tree-icon' + (isRoot ? '' : ' tree-icon-child') + '"><i class="hgi-stroke ' + icon + '"></i></span>' +
      '<span class="tree-label">' + esc(label) + '</span>' +
    '</div>';
    if (children.length) {
      html += '<ul>';
      children.forEach(function(c) { html += renderNode(c, false); });
      html += '</ul>';
    }
    html += '</li>';
    return html;
  }
  var html = '<ul class="tree-view">';
  roots.forEach(function(r) { html += renderNode(r, true); });
  html += '</ul>';
  tree.innerHTML = html;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *  Registry Helper â€” opens as child of Tools
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function openRegistryHelper(id) {
  var reg = window.LumiaHelpersRegistry;
  var h = reg && reg.byId ? reg.byId[id] : null;
  if (!h) {
    if (window.LumiaToast) window.LumiaToast.warning('Helper non registrato: ' + id);
    return;
  }
  function helperMountFn(body) {
    var mount = document.createElement('div');
    mount.className = 'panel-mount';
    mount.style.cssText = 'flex:1;overflow:auto;';
    body.appendChild(mount);
    h.mount(mount);
  }
  var toolsNodeId = state.openModules['tools'] || null;
  if (toolsNodeId) {
    var nodeId = state.layerManager.openNode(toolsNodeId, {
      kind: 'fullscreen',
      title: h.title || 'Helper',
      contentKey: null,
      mountFn: helperMountFn
    });
    if (nodeId) {
      var shell = document.getElementById('library-shell');
      if (shell) shell.classList.add('hidden');
      state.layerManager.getAllNodes().forEach(function(n) {
        n.element.classList.add('is-background');
      });
      revealTree(nodeId);
    }
  } else {
    state.layerManager.openNode(null, {
      kind: 'fullscreen',
      title: h.title || 'Helper',
      contentKey: null,
      mountFn: helperMountFn
    });
  }
}
window.openRegistryHelper = openRegistryHelper;

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *  Logout (with loader animation)
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

var LOGOUT_MIN_MS = 3000;

function doLogout() {
  var loader = document.getElementById('logout-loader');
  if (loader) loader.classList.remove('hidden');
  var t0 = Date.now();
  fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': csrfToken }
  })
    .then(function(r) {
      if (!r.ok) console.warn('[logout] server returned', r.status);
      finishLogout(t0);
    })
    .catch(function() { finishLogout(t0); });
}

function finishLogout(t0) {
  var remaining = LOGOUT_MIN_MS - (Date.now() - t0);
  var url = '/login.html?logout=1';
  if (remaining > 0) {
    setTimeout(function() { window.location.replace(url); }, remaining);
  } else {
    window.location.replace(url);
  }
}

/* â”€â”€ Compat shims â”€â”€ */
window.showLayer = function(layer) { if (layer === 'A') showLibrary(); };
window.hideLayer = function(layer) {
  if (layer === 'A') {
    var shell = document.getElementById('library-shell');
    if (shell) shell.classList.add('hidden');
  }
};
