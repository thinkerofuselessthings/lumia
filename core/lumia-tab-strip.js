/*! lumia-tab-strip.js — Horizontal tab strip v2 component
 *
 *  Evoluzione del tab-rail verticale. Gestisce le sezioni come tab
 *  orizzontali Chrome-like. Ogni tab è un nodo LayerSystem di kind "section".
 *
 *  Dipendenze: LumiaEvents (opzionale), LayerSystem (per nodi section)
 *
 *  API:
 *    createTabStrip(layerEl, config, manager, moduleNodeId)
 *      → { openSection, closeSection, activateSection, getOpenTabs, getActiveTab, destroy }
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m;
    });
  }

  /**
   * createTabStrip — Mounts a horizontal tab strip inside a v2 layer layout.
   *
   * @param {HTMLElement} layerEl        - The layer-layout-v2 container
   * @param {Object}      config         - Module config (sections, icons, module, actions)
   * @param {Object}      manager        - LayerSystem manager instance
   * @param {string}      moduleNodeId   - The fullscreen node ID that owns this layer
   * @returns {Object} tab strip API
   */
  function createTabStrip(layerEl, config, manager, moduleNodeId) {
    var sections = config.sections || [];
    var icons = config.icons || {};
    var module = config.module || {};

    // State
    var openTabs = [];     // [{id, nodeId, sectionDef}]
    var activeTabId = null;

    // DOM references
    var stripEl = layerEl.querySelector('.tab-strip');
    var tabsContainer = stripEl.querySelector('.tab-strip-tabs');
    var contentArea = layerEl.querySelector('.content');
    var moduleIconEl = stripEl.querySelector('.tab-strip-module-icon');
    var moduleNameEl = stripEl.querySelector('.tab-strip-module-name');

    // Set module identity badge
    if (moduleIconEl && module.icon) moduleIconEl.innerHTML = module.icon;
    if (moduleNameEl && module.title) moduleNameEl.textContent = module.title;

    // ── Helpers ──

    function findSection(id) {
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].id === id) return sections[i];
        if (sections[i].children) {
          for (var j = 0; j < sections[i].children.length; j++) {
            if (sections[i].children[j].id === id) return sections[i].children[j];
          }
        }
      }
      return null;
    }

    function findOpenTab(sectionId) {
      for (var i = 0; i < openTabs.length; i++) {
        if (openTabs[i].id === sectionId) return openTabs[i];
      }
      return null;
    }

    function getIconSvg(iconKey) {
      return icons[iconKey] || '';
    }

    function isSectionOpen(id) {
      return !!findOpenTab(id);
    }

    // ── Rendering ──

    function renderStrip() {
      var html = '';
      openTabs.forEach(function (tab) {
        var sec = tab.sectionDef;
        var active = tab.id === activeTabId ? ' is-active' : '';
        var iconSvg = getIconSvg(sec.icon || sec.id);
        html += '<button class="tab' + active + '" data-tab-id="' + esc(tab.id) + '" title="' + esc(sec.label) + '">' +
          '<span class="tab-icon">' + iconSvg + '</span>' +
          '<span class="tab-label">' + esc(sec.label) + '</span>' +
          '<span class="tab-close" data-close-tab="' + esc(tab.id) + '" aria-label="Chiudi ' + esc(sec.label) + '">&times;</span>' +
        '</button>';
      });
      tabsContainer.innerHTML = html;
    }

    function showPanel(sectionId) {
      // Hide all panels
      var panels = contentArea.querySelectorAll('.section-panel');
      for (var i = 0; i < panels.length; i++) {
        panels[i].classList.remove('is-active');
      }
      // Show the target panel
      var tab = findOpenTab(sectionId);
      if (tab && tab.panelEl) {
        tab.panelEl.classList.add('is-active');
      }
      // Hide/show empty state
      var emptyState = contentArea.querySelector('.empty-state');
      if (emptyState) {
        emptyState.style.display = openTabs.length > 0 ? 'none' : '';
      }
    }

    function createPanel(sectionId) {
      var sec = findSection(sectionId);
      if (!sec) return null;
      var panel = document.createElement('div');
      panel.className = 'section-panel';

      // Append FIRST so sec.render() can rely on document.getElementById
      // to locate IDs inserted by its own innerHTML/DOM building.
      contentArea.appendChild(panel);

      // If section has a custom render function, use it
      if (typeof sec.render === 'function') {
        sec.render(panel);
      } else {
        // Default: title + desc + section cards
        panel.innerHTML =
          '<h1>' + esc(sec.label) + '</h1>' +
          '<p>' + esc(sec.desc || '') + '</p>' +
          '<div class="section-cards"></div>';

        if (config.sectionCards && config.sectionCards[sectionId]) {
          var cardsHtml = '';
          config.sectionCards[sectionId].forEach(function (card) {
            cardsHtml += '<div class="section-card">' +
              '<div class="section-card-title">' + esc(card[0]) + '</div>' +
              '<div class="section-card-value">' + esc(card[1]) + '</div>' +
            '</div>';
          });
          panel.querySelector('.section-cards').innerHTML = cardsHtml;
        }
      }

      return panel;
    }

    // ── Tab actions ──

    function openSection(sectionId) {
      if (isSectionOpen(sectionId)) {
        activateSection(sectionId);
        return;
      }

      var sec = findSection(sectionId);
      if (!sec) return;

      // Create the panel DOM
      var panelEl = createPanel(sectionId);
      if (!panelEl) return;

      // Register as section node in LayerSystem
      var nodeId = manager.openNode(moduleNodeId, {
        kind: 'section',
        title: sec.label,
        contentKey: sectionId,
        element: panelEl
      });

      if (!nodeId) {
        panelEl.remove();
        return;
      }

      openTabs.push({
        id: sectionId,
        nodeId: nodeId,
        sectionDef: sec,
        panelEl: panelEl
      });

      activeTabId = sectionId;
      renderStrip();
      showPanel(sectionId);

      // Emit event
      if (global.LumiaEvents) {
        global.LumiaEvents.emit('tab:opened', { sectionId: sectionId, nodeId: nodeId, moduleNodeId: moduleNodeId });
      }
    }

    function closeSection(sectionId) {
      var tab = findOpenTab(sectionId);
      if (!tab) return;

      // Close the LayerSystem node (recursively closes children)
      manager.closeNode(tab.nodeId);

      // Remove panel from DOM
      if (tab.panelEl && tab.panelEl.parentNode) {
        tab.panelEl.remove();
      }

      // Update state
      var idx = openTabs.indexOf(tab);
      if (idx >= 0) openTabs.splice(idx, 1);

      if (activeTabId === sectionId) {
        activeTabId = openTabs.length > 0 ? openTabs[Math.min(idx, openTabs.length - 1)].id : null;
      }

      renderStrip();
      showPanel(activeTabId);

      // Emit event
      if (global.LumiaEvents) {
        global.LumiaEvents.emit('tab:closed', { sectionId: sectionId, moduleNodeId: moduleNodeId });
      }
    }

    function activateSection(sectionId) {
      if (!isSectionOpen(sectionId)) {
        openSection(sectionId);
        return;
      }
      activeTabId = sectionId;
      renderStrip();
      showPanel(sectionId);

      // Re-invoke section render so modules using a shared template
      // (e.g. Agenda) can re-activate their internal layer on switch.
      var tab = findOpenTab(sectionId);
      if (tab && tab.sectionDef && typeof tab.sectionDef.render === 'function') {
        tab.sectionDef.render(tab.panelEl);
      }

      // Focus the section node in LayerSystem
      if (tab) manager.applyFocus(tab.nodeId);

      if (global.LumiaEvents) {
        global.LumiaEvents.emit('tab:activated', { sectionId: sectionId, moduleNodeId: moduleNodeId });
      }
    }

    // ── Event delegation ──

    stripEl.addEventListener('click', function (e) {
      // Close tab button
      var closeBtn = e.target.closest('[data-close-tab]');
      if (closeBtn) {
        e.stopPropagation();
        closeSection(closeBtn.dataset.closeTab);
        return;
      }
      // Tab click
      var tabBtn = e.target.closest('[data-tab-id]');
      if (tabBtn && tabBtn.dataset.tabId !== activeTabId) {
        activateSection(tabBtn.dataset.tabId);
        return;
      }
      // Launcher trigger (dropdown chevron)
      if (e.target.closest('.tab-strip-dropdown')) {
        if (api._onLauncherOpen) api._onLauncherOpen();
        return;
      }
      // Close layer button
      if (e.target.closest('.tab-strip-close')) {
        manager.closeNode(moduleNodeId);
        return;
      }
    });

    // Listen for LayerSystem close events (e.g. node closed from tree)
    var unsubClose = manager.on('node:closed', function (data) {
      // If a section node was closed externally, sync the tab strip
      for (var i = openTabs.length - 1; i >= 0; i--) {
        if (openTabs[i].nodeId === data.nodeId) {
          var tab = openTabs[i];
          if (tab.panelEl && tab.panelEl.parentNode) tab.panelEl.remove();
          openTabs.splice(i, 1);
          if (activeTabId === tab.id) {
            activeTabId = openTabs.length > 0 ? openTabs[Math.max(0, i - 1)].id : null;
          }
          renderStrip();
          showPanel(activeTabId);
          break;
        }
      }
    });

    // ── Destroy ──

    function destroy() {
      unsubClose();
      openTabs.forEach(function (tab) {
        if (tab.panelEl && tab.panelEl.parentNode) tab.panelEl.remove();
      });
      openTabs = [];
      activeTabId = null;
    }

    // ── API ──

    var api = {
      openSection: openSection,
      closeSection: closeSection,
      activateSection: activateSection,
      getOpenTabs: function () { return openTabs.map(function (t) { return t.id; }); },
      getActiveTab: function () { return activeTabId; },
      getTabNodeId: function (sectionId) {
        var tab = findOpenTab(sectionId);
        return tab ? tab.nodeId : null;
      },
      isSectionOpen: isSectionOpen,
      destroy: destroy,
      _onLauncherOpen: null  // Set by LumiaLauncher
    };

    // Expose on the layer element
    layerEl._tabStrip = api;

    return api;
  }

  // ── Public API ──
  global.LumiaTabStrip = { create: createTabStrip };

})(window);
