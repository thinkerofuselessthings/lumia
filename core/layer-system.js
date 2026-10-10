/*! layer-system.js â€” Windowing engine (parentâ†’child hierarchy)
 *
 *  Reference: LIBRERIA_SYSTEM.md
 *
 *  Exposes: window.LayerSystem
 *  Pattern: IIFE on window
 *
 *  Node kinds: fullscreen, modal, panel, sheet
 *  Features:
 *    - Parent/child tree with nesting rules
 *    - Content provider registry (render/destroy) with validation
 *    - Z-index management (300 base + 100 per root + 10 depth + 80 focus boost)
 *    - Focus management + focus trap (modal/sheet)
 *    - Recursive close (children first) â€” returns {closed, reason}
 *    - is-background for library toggle
 *    - Event bus: node:opened, node:closed, focus:changed, action:blocked, state:changed
 *    - Event unsubscribe via on() return value
 *    - openGuard to prevent race conditions
 */
(function (global) {
  'use strict';

  /* â”€â”€ Helpers â”€â”€ */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m;
    });
  }

  function generateId() {
    var arr = new Uint8Array(16);
    try { crypto.getRandomValues(arr); } catch (e) {
      for (var i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    var hex = Array.prototype.map.call(arr, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
    return 'ln-' + hex;
  }

  /* â”€â”€ Node Kinds â”€â”€ */
  var NODE_KINDS = {
    fullscreen: { cssClass: 'layer-fullscreen', role: 'region',        modal: false, animation: 'layerFadeIn'  },
    modal:      { cssClass: 'layer-modal',      role: 'dialog',        modal: true,  animation: 'modalScaleIn' },
    panel:      { cssClass: 'layer-panel',      role: 'complementary', modal: false, animation: 'panelSlideIn' },
    sheet:      { cssClass: 'layer-sheet',      role: 'dialog',        modal: true,  animation: 'sheetSlideUp' },
    section:    { cssClass: 'section-panel',     role: 'tabpanel',      modal: false, animation: 'none', virtual: true }
  };

  var NESTING_RULES = {
    fullscreen: { allowed: ['fullscreen', 'modal', 'panel', 'sheet', 'section'], max: 12 },
    modal:      { allowed: ['modal'], max: 1 },
    panel:      { allowed: ['modal', 'sheet'], max: 2 },
    sheet:      { allowed: ['modal'], max: 1 },
    section:    { allowed: ['modal', 'panel', 'sheet'], max: 5 }
  };

  /* â”€â”€ Content Provider Registry (global, shared) â”€â”€ */
  var contentProviders = {};

  function registerContent(key, provider) {
    if (!key || typeof (provider && provider.render) !== 'function') {
      console.error('[LayerSystem] Content provider "' + key + '" invalid (missing render function)');
      return false;
    }
    contentProviders[key] = {
      label: provider.label || key,
      render: provider.render,
      destroy: typeof provider.destroy === 'function' ? provider.destroy : function () {}
    };
    return true;
  }

  function renderContent(key, container, context) {
    var provider = contentProviders[key];
    if (!provider) {
      container.innerHTML = '<p class="layer-empty">Contenuto "' + esc(key) + '" non trovato.</p>';
      return false;
    }
    try {
      provider.render(container, context);
      return true;
    } catch (err) {
      console.error('[LayerSystem] Render error for "' + key + '":', err);
      container.innerHTML = '<p class="layer-empty">Errore: ' + esc(err.message) + '</p>';
      return false;
    }
  }

  function destroyContent(key, container) {
    var provider = contentProviders[key];
    if (provider && provider.destroy) {
      provider.destroy(container);
    }
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  createManager â€” creates a new layer manager instance
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function createManager(rootElement) {
    var rootEl = rootElement || document.getElementById('layerRoot');
    var nodes = {};          // Map<nodeId, nodeRecord>
    var focusStack = [];     // Array<nodeId>
    var sequence = 0;        // incremental ordering
    var listeners = {};      // event â†’ [callback]
    var openGuard = false;   // prevents concurrent opens

    /* â”€â”€ Event Bus â”€â”€ */
    function on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
      return function () {
        var idx = listeners[event].indexOf(callback);
        if (idx >= 0) listeners[event].splice(idx, 1);
      };
    }

    function emit(event, data) {
      var cbs = listeners[event];
      if (!cbs) return;
      for (var i = 0; i < cbs.length; i++) {
        try { cbs[i](data); } catch (e) { console.error('[LayerSystem] event handler error:', e); }
      }
    }

    /* â”€â”€ DOM creation â”€â”€ */
    function createNodeElement(cfg) {
      var kindDef = NODE_KINDS[cfg.kind];
      var el = document.createElement('section');
      el.className = kindDef.cssClass;
      el.id = cfg.nodeId;
      el.style.zIndex = String(cfg.zIndex || 1);
      el.setAttribute('data-node-id', cfg.nodeId);
      el.setAttribute('data-kind', cfg.kind);
      el.setAttribute('data-parent-id', cfg.parentId || '');
      el.setAttribute('role', kindDef.role);
      if (kindDef.modal) el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', cfg.title);

      if (cfg.kind === 'fullscreen') {
        /* Minimal shell â€” content provider renders sidebar via .layer-layout */
        el.innerHTML =
          '<div class="layer-content layer-content--has-sidebar">' +
            '<div class="layer-body"></div>' +
          '</div>';
      } else {
        /* Horizontal header for modal/panel/sheet */
        el.innerHTML =
          '<div class="layer-content">' +
            '<div class="layer-header">' +
              '<div class="layer-meta">' +
                '<p class="layer-title">' + esc(cfg.title) + '</p>' +
              '</div>' +
              '<div class="layer-header-actions">' +
                '<button class="layer-close-btn" type="button" data-layer-action="close" data-node-id="' + esc(cfg.nodeId) + '" aria-label="Chiudi ' + esc(cfg.title) + '">' +
                  '<i class="hgi-stroke hgi-cancel-01"></i>' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div class="layer-body"></div>' +
          '</div>';
      }

      return el;
    }

    /* â”€â”€ Focus Trap (modal / sheet) â”€â”€ */
    var FOCUSABLE_SEL = 'a[href],button:not([disabled]),textarea:not([disabled]),' +
      'input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

    function setupFocusTrap(element) {
      function handler(e) {
        if (e.key !== 'Tab') return;
        var focusable = Array.prototype.slice.call(element.querySelectorAll(FOCUSABLE_SEL))
          .filter(function (el) { return el.offsetParent !== null; });
        if (!focusable.length) return;
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
      element.addEventListener('keydown', handler);
      requestAnimationFrame(function () {
        var first = element.querySelector(FOCUSABLE_SEL);
        if (first) first.focus();
      });
      return handler;
    }

    /* â”€â”€ Z-Index Management â”€â”€ */
    function updateZIndexes() {
      var roots = getOpenRoots().sort(function (a, b) { return a.sequence - b.sequence; });

      roots.forEach(function (root, idx) {
        var base = 300 + idx * 100;

        function assign(nodeId, depth, offset) {
          var rec = nodes[nodeId];
          if (!rec) return;
          rec.zIndex = base + depth * 10 + offset;
          rec.element.style.zIndex = String(rec.zIndex);
          var children = [];
          rec.childrenIds.forEach(function (cid) {
            if (nodes[cid]) children.push(nodes[cid]);
          });
          children.sort(function (a, b) { return a.sequence - b.sequence; });
          children.forEach(function (child, i) { assign(child.id, depth + 1, i + 1); });
        }
        assign(root.id, 0, 0);
      });

      // Focus boost +80
      var focusedId = focusStack.length ? focusStack[focusStack.length - 1] : null;
      if (focusedId && nodes[focusedId]) {
        var rec = nodes[focusedId];
        var root = getRoot(focusedId);
        var rootIdx = -1;
        for (var r = 0; r < roots.length; r++) {
          if (roots[r].id === root.id) { rootIdx = r; break; }
        }
        rec.zIndex = 300 + (rootIdx >= 0 ? rootIdx : 0) * 100 + 80;
        rec.element.style.zIndex = String(rec.zIndex);
      }

      // is-active-layer toggle
      var activeRootId = focusedId ? getRoot(focusedId).id : null;
      var activeTreeIds = {};
      if (activeRootId) {
        (function collectTree(nodeId) {
          activeTreeIds[nodeId] = true;
          var n = nodes[nodeId];
          if (n) n.childrenIds.forEach(collectTree);
        })(activeRootId);
      }
      Object.keys(nodes).forEach(function (nid) {
        nodes[nid].element.classList.toggle('is-active-layer', !!activeTreeIds[nid]);
      });
    }

    /* â”€â”€ Utilities â”€â”€ */
    function getNode(id) { return nodes[id] || null; }

    function getRoot(nodeId) {
      var n = nodes[nodeId];
      while (n && n.parentId && nodes[n.parentId]) {
        n = nodes[n.parentId];
      }
      return n;
    }

    function getOpenRoots() {
      var result = [];
      Object.keys(nodes).forEach(function (id) {
        if (!nodes[id].parentId) result.push(nodes[id]);
      });
      return result;
    }

    function getAllNodes() {
      var result = [];
      Object.keys(nodes).forEach(function (id) { result.push(nodes[id]); });
      return result;
    }

    function hasOpenNodes() {
      return Object.keys(nodes).length > 0;
    }

    function getSnapshot() {
      var snap = {
        focusedNodeId: focusStack.length ? focusStack[focusStack.length - 1] : null,
        focusStack: focusStack.slice(),
        nodes: []
      };
      Object.keys(nodes).forEach(function (id) {
        var n = nodes[id];
        snap.nodes.push({
          id: n.id,
          kind: n.kind,
          title: n.title,
          parentId: n.parentId,
          childrenIds: Array.from(n.childrenIds),
          contentKey: n.contentKey,
          zIndex: n.zIndex,
          sequence: n.sequence
        });
      });
      return snap;
    }

    /* â”€â”€ Open Node â”€â”€ */
    function openNode(parentId, config) {
      if (openGuard) {
        console.warn('[LayerSystem] openNode blocked â€” another open in progress');
        return null;
      }
      openGuard = true;

      var kind = config.kind || 'fullscreen';
      var kindDef = NODE_KINDS[kind];
      if (!kindDef) {
        console.error('[LayerSystem] Unknown node kind:', kind);
        openGuard = false;
        return null;
      }

      // Nesting rules check
      if (parentId) {
        var parent = nodes[parentId];
        if (!parent) {
          console.error('[LayerSystem] Parent node not found:', parentId);
          openGuard = false;
          return null;
        }
        var rules = NESTING_RULES[parent.kind];
        if (!rules || rules.allowed.indexOf(kind) === -1) {
          emit('action:blocked', { reason: 'kind-not-allowed', parentId: parentId, kind: kind });
          openGuard = false;
          return null;
        }
        if (parent.childrenIds.size >= rules.max) {
          emit('action:blocked', { reason: 'max-children', parentId: parentId, kind: kind });
          openGuard = false;
          return null;
        }
      } else {
        // Root limit: max 5
        if (getOpenRoots().length >= 5) {
          emit('action:blocked', { reason: 'max-roots', kind: kind });
          if (global.LumiaToast) global.LumiaToast.warning('Massimo 5 moduli aperti.');
          openGuard = false;
          return null;
        }
      }

      var nodeId = generateId();
      sequence++;

      var isVirtual = kindDef.virtual;
      var element;

      if (isVirtual && config.element) {
        // Virtual node (e.g. section): use provided element, don't append to rootEl
        element = config.element;
        element.setAttribute('data-node-id', nodeId);
        element.setAttribute('data-kind', kind);
        element.setAttribute('data-parent-id', parentId || '');
      } else {
        element = createNodeElement({
          nodeId: nodeId,
          title: config.title || 'Layer',
          kind: kind,
          parentId: parentId,
          zIndex: 1
        });
        rootEl.appendChild(element);
      }

      var rec = {
        id: nodeId,
        kind: kind,
        title: config.title || 'Layer',
        parentId: parentId || null,
        childrenIds: new Set(),
        contentKey: config.contentKey || null,
        contentData: config.contentData || {},
        zIndex: 1,
        sequence: sequence,
        element: element,
        previousFocus: document.activeElement,
        trapHandler: null,
        beforeClose: null
      };

      nodes[nodeId] = rec;

      // Parent registration
      if (parentId && nodes[parentId]) {
        nodes[parentId].childrenIds.add(nodeId);
      }

      // Content provider (skip for virtual nodes — content managed externally)
      if (!isVirtual) {
        var body = element.querySelector('.layer-body');
        if (config.contentKey) {
          renderContent(config.contentKey, body, {
            nodeId: nodeId,
            parentId: parentId,
            kind: kind,
            contentData: config.contentData || {},
            manager: manager
          });
        } else if (config.mountFn && typeof config.mountFn === 'function') {
          // Backward compatibility: direct mount function
          config.mountFn(body);
        }
      }

      // Focus trap for modal/sheet
      if (kindDef.modal) {
        rec.trapHandler = setupFocusTrap(element);
      }

      // Focus
      applyFocus(nodeId);

      emit('node:opened', {
        nodeId: nodeId,
        kind: kind,
        parentId: parentId,
        contentKey: config.contentKey || null,
        title: config.title
      });
      emit('state:changed', { action: 'open', nodeId: nodeId });

      openGuard = false;
      return nodeId;
    }

    /* â”€â”€ Close Node (recursive) â”€â”€ */
    function removeRecursive(nodeId) {
      var target = nodes[nodeId];
      if (!target) return [];
      var closed = [];

      // Children first
      target.childrenIds.forEach(function (childId) {
        closed = closed.concat(removeRecursive(childId));
      });

      // Destroy content (skip for virtual nodes)
      var kindDefTarget = NODE_KINDS[target.kind];
      if (!kindDefTarget || !kindDefTarget.virtual) {
        if (target.contentKey) {
          var body = target.element.querySelector('.layer-body');
          if (body) destroyContent(target.contentKey, body);
        }
      }

      // Focus trap cleanup
      if (target.trapHandler) {
        target.element.removeEventListener('keydown', target.trapHandler);
      }

      // Remove from parent
      if (target.parentId && nodes[target.parentId]) {
        nodes[target.parentId].childrenIds.delete(target.id);
      }

      // DOM + map cleanup (virtual nodes are removed by their manager, not by us)
      if (!kindDefTarget || !kindDefTarget.virtual) {
        target.element.remove();
      }
      delete nodes[target.id];
      var idx = focusStack.lastIndexOf(target.id);
      if (idx >= 0) focusStack.splice(idx, 1);

      closed.push(target);
      return closed;
    }

    function closeNode(nodeId, options) {
      var target = nodes[nodeId];
      if (!target) return { closed: false, reason: 'not_found' };

      // beforeClose hook
      if (!options || !options.force) {
        if (target.beforeClose && typeof target.beforeClose === 'function') {
          var proceed = target.beforeClose();
          if (proceed === false) return { closed: false, reason: 'before_close_blocked' };
        }
      }

      var closed = removeRecursive(nodeId);

      // Restore focus
      if (target.previousFocus && typeof target.previousFocus.focus === 'function') {
        try { target.previousFocus.focus(); } catch (e) {}
      }

      // Update z-indexes
      if (hasOpenNodes()) {
        updateZIndexes();
        // Focus on stack top
        if (focusStack.length) {
          var topId = focusStack[focusStack.length - 1];
          if (nodes[topId]) {
            emit('focus:changed', { nodeId: topId });
          }
        }
      }

      emit('node:closed', {
        nodeId: nodeId,
        kind: target.kind,
        title: target.title,
        parentId: target.parentId,
        closedCount: closed.length
      });
      emit('state:changed', { action: 'close', nodeId: nodeId });

      return { closed: true, reason: 'ok' };
    }

    function closeTopNode() {
      if (!focusStack.length) return { closed: false, reason: 'empty' };
      return closeNode(focusStack[focusStack.length - 1]);
    }

    function closeByElement(el) {
      var section = el.closest('[data-node-id]');
      if (!section) return { closed: false, reason: 'not_found' };
      return closeNode(section.getAttribute('data-node-id'));
    }

    /* â”€â”€ Focus â”€â”€ */
    function applyFocus(nodeId) {
      if (!nodes[nodeId]) return;
      // Remove existing occurrence
      var idx = focusStack.indexOf(nodeId);
      if (idx >= 0) focusStack.splice(idx, 1);
      focusStack.push(nodeId);
      updateZIndexes();
      emit('focus:changed', { nodeId: nodeId });
    }

    /* â”€â”€ beforeClose hook â”€â”€ */
    function setBeforeClose(nodeId, fn) {
      if (nodes[nodeId]) nodes[nodeId].beforeClose = fn;
    }

    /* â”€â”€ Global event delegation â”€â”€ */

    // 1. Close buttons
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-layer-action]');
      if (!btn) return;
      if (btn.dataset.layerAction === 'close') {
        var nid = btn.dataset.nodeId;
        if (nid && nodes[nid]) closeNode(nid);
      }
    });

    // 2. Backdrop click â€” disabled by default (safer UX, prevents accidental closes)
    if (rootEl) {
      rootEl.addEventListener('click', function (e) {
        if (!manager.enableBackdropClose) return;
        if (e.target.classList.contains('layer-modal') || e.target.classList.contains('layer-sheet')) {
          var nid = e.target.getAttribute('data-node-id');
          if (nid) closeNode(nid);
        }
      });
    }

    // 3. Escape â€” disabled by default (conflicts with inner modals/forms)
    document.addEventListener('keydown', function (e) {
      if (!manager.enableEscapeClose) return;
      if (e.key === 'Escape' && Object.keys(nodes).length > 0) {
        e.preventDefault();
        closeTopNode();
      }
    });

    /* â”€â”€ Public API â”€â”€ */
    var manager = {
      openNode: openNode,
      closeNode: closeNode,
      closeTopNode: closeTopNode,
      closeByElement: closeByElement,
      applyFocus: applyFocus,
      hasOpenNodes: hasOpenNodes,
      getOpenRoots: getOpenRoots,
      getAllNodes: getAllNodes,
      getNodeById: getNode,
      getSnapshot: getSnapshot,
      setBeforeClose: setBeforeClose,
      on: on,
      emit: emit,
      enableBackdropClose: false,
      enableEscapeClose: false
    };

    return manager;
  }

  /* â”€â”€ Public Module API â”€â”€ */
  global.LayerSystem = {
    createManager: createManager,
    registerContent: registerContent,
    NODE_KINDS: NODE_KINDS
  };

})(window);
