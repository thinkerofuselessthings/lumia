/*! lumia-launcher.js — Modal launcher grid v2 component
 *
 *  Evoluzione del sistema menu. Overlay modale con griglia sezioni
 *  del modulo attivo. Supporta keyboard nav, children, azioni fisse.
 *
 *  Dipendenze: LumiaTabStrip (per aprire/chiudere sezioni)
 *
 *  API:
 *    createLauncher(layerEl, config, tabStrip, manager, moduleNodeId)
 *      → { open, close, isOpen, destroy }
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m;
    });
  }

  /**
   * validateModuleConfig — Lightweight sync validation of the module config.
   * Returns { valid: boolean, errors: string[] }
   */
  function validateModuleConfig(config) {
    var errors = [];
    if (!config) { return { valid: false, errors: ['Config is null'] }; }
    if (!config.sections || !Array.isArray(config.sections)) {
      errors.push('Missing or invalid sections array');
    } else {
      config.sections.forEach(function (s, i) {
        if (!s.id) errors.push('Section [' + i + '] missing id');
        if (!s.label) errors.push('Section [' + i + '] missing label');
        if (!s.icon) errors.push('Section [' + i + '] missing icon');
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  /**
   * createLauncher — Mounts a launcher overlay inside a v2 layer layout.
   *
   * @param {HTMLElement} layerEl        - The layer-layout-v2 container
   * @param {Object}      config         - Module config (sections, icons, module, actions)
   * @param {Object}      tabStrip       - LumiaTabStrip API instance
   * @param {Object}      manager        - LayerSystem manager instance
   * @param {string}      moduleNodeId   - The fullscreen node ID
   * @returns {Object} launcher API
   */
  function createLauncher(layerEl, config, tabStrip, manager, moduleNodeId) {
    var sections = config.sections || [];
    var actions = config.actions || [];
    var icons = config.icons || {};
    var module = config.module || {};

    // State
    var isOpen = false;
    var selectedIndex = 0;
    var expandedSectionId = null;
    var subIndex = -1;

    // Build flat items list (sections + separator + actions)
    var gridItems = [];
    sections.forEach(function (s) { gridItems.push({ type: 'section', data: s }); });
    if (actions.length > 0) {
      gridItems.push({ type: 'separator' });
      actions.forEach(function (a) { gridItems.push({ type: 'action', data: a }); });
    }

    // DOM — create overlay
    var overlayEl = layerEl.querySelector('.launcher-overlay');
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'launcher-overlay';
      layerEl.appendChild(overlayEl);
    }

    // ── Render ──

    function getIconSvg(key) {
      return icons[key] || '';
    }

    function renderGrid() {
      var gridHtml = '';
      var idx = 0;
      gridItems.forEach(function (item) {
        if (item.type === 'separator') {
          gridHtml += '<div class="launcher-separator"></div>';
          return;
        }

        var d = item.data;
        var classes = 'launcher-card';
        if (idx === selectedIndex) classes += ' is-selected';
        if (item.type === 'section' && tabStrip.isSectionOpen(d.id)) classes += ' is-open';
        if (d.id === expandedSectionId) classes += ' is-expanded';

        var iconSvg = getIconSvg(d.icon);
        var chevron = d.children && d.children.length > 0
          ? '<span class="launcher-card-chevron">' + getIconSvg('chevron') + '</span>'
          : '';

        // Icon uses neutral gray styling from CSS; per-card color is not applied.
        var iconStyle = '';

        // Library-style layout: header (num + name) → icon (middle) → desc (bottom)
        // — matches .quick-module-button from lumia-library-shell.css.
        gridHtml += '<div class="' + classes + '" data-card-idx="' + idx + '" data-card-id="' + esc(d.id) + '">' +
          '<div class="launcher-card-header">' +
            '<span class="launcher-card-num">' + esc(String(idx + 1).padStart(2, '0')) + '</span>' +
            '<span class="launcher-card-name">' + esc(d.label) + '</span>' +
          '</div>' +
          '<div class="launcher-card-icon"' + iconStyle + '>' + iconSvg + '</div>' +
          '<div class="launcher-card-desc">' + esc(d.desc || '') + '</div>' +
          chevron +
        '</div>';
        idx++;
      });

      // Preview column — always shows the module identity
      var previewIcon = module.iconLarge || module.icon || '';
      var previewTitle = esc(module.title || '');

      overlayEl.innerHTML =
        '<div class="launcher">' +
          '<div class="launcher-preview">' +
            '<div class="launcher-preview-content">' +
              '<div class="launcher-preview-icon">' + previewIcon + '</div>' +
              '<div class="launcher-preview-title">' + previewTitle + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="launcher-menu">' +
            '<div class="launcher-grid">' + gridHtml + '</div>' +
          '</div>' +
          '<div class="launcher-subs' + (expandedSectionId ? ' is-open' : '') + '">' +
            renderSubs() +
          '</div>' +
        '</div>';
    }

    function renderSubs() {
      if (!expandedSectionId) return '';
      var sec = null;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].id === expandedSectionId) { sec = sections[i]; break; }
      }
      if (!sec || !sec.children || !sec.children.length) return '';

      var html = '<div class="launcher-subs-header">' +
        getIconSvg(sec.icon) + ' ' + esc(sec.label) +
      '</div><div class="launcher-subs-list">';

      sec.children.forEach(function (child, ci) {
        var selected = ci === subIndex ? ' is-selected' : '';
        html += '<div class="launcher-sub-item' + selected + '" data-sub-id="' + esc(child.id) + '" data-sub-idx="' + ci + '">' +
          '<div class="launcher-sub-item-icon">' + getIconSvg(sec.icon) + '</div>' +
          '<div class="launcher-sub-item-text">' +
            '<div class="launcher-sub-item-name">' + esc(child.label) + '</div>' +
            '<div class="launcher-sub-item-desc">' + esc(child.desc || '') + '</div>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
      return html;
    }

    function getSelectedItem() {
      var count = 0;
      for (var i = 0; i < gridItems.length; i++) {
        if (gridItems[i].type === 'separator') continue;
        if (count === selectedIndex) return gridItems[i].data;
        count++;
      }
      return null;
    }

    function getSelectableCount() {
      var count = 0;
      for (var i = 0; i < gridItems.length; i++) {
        if (gridItems[i].type !== 'separator') count++;
      }
      return count;
    }

    // ── Open / Close ──

    function open() {
      if (isOpen) return;
      isOpen = true;
      selectedIndex = 0;
      expandedSectionId = null;
      subIndex = -1;
      renderGrid();
      overlayEl.classList.add('is-open');
      document.addEventListener('keydown', handleKeydown);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      overlayEl.classList.remove('is-open');
      expandedSectionId = null;
      subIndex = -1;
      document.removeEventListener('keydown', handleKeydown);
    }

    // ── Selection ──

    function selectItem(item) {
      if (!item) return;

      if (item.id === '_close_layer') {
        close();
        manager.closeNode(moduleNodeId);
        return;
      }

      if (item.id === '_library') {
        close();
        if (global.showLibrary) global.showLibrary();
        return;
      }

      // Section already open → do nothing (grayed out)
      if (tabStrip.isSectionOpen(item.id)) return;

      // Section with children → expand subsections
      if (item.children && item.children.length > 0) {
        if (expandedSectionId === item.id) {
          expandedSectionId = null;
          subIndex = -1;
        } else {
          expandedSectionId = item.id;
          subIndex = 0;
        }
        renderGrid();
        return;
      }

      // Open section as tab
      close();
      tabStrip.openSection(item.id);
    }

    function selectChild(childId) {
      if (tabStrip.isSectionOpen(childId)) return;
      close();
      tabStrip.openSection(childId);
    }

    // ── Keyboard Navigation ──

    function handleKeydown(e) {
      if (!isOpen) return;
      var total = getSelectableCount();

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (expandedSectionId && subIndex >= 0) {
            var sec = null;
            for (var i = 0; i < sections.length; i++) {
              if (sections[i].id === expandedSectionId) { sec = sections[i]; break; }
            }
            if (sec && sec.children && subIndex < sec.children.length - 1) {
              subIndex++;
              renderGrid();
            }
          } else {
            selectedIndex = Math.min(selectedIndex + 4, total - 1); // Grid 4 columns
            renderGrid();
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (expandedSectionId && subIndex >= 0) {
            subIndex = Math.max(subIndex - 1, 0);
            renderGrid();
          } else {
            selectedIndex = Math.max(selectedIndex - 4, 0);
            renderGrid();
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (expandedSectionId && subIndex >= 0) return;
          selectedIndex = Math.min(selectedIndex + 1, total - 1);
          renderGrid();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (expandedSectionId && subIndex >= 0) {
            subIndex = -1;
            expandedSectionId = null;
            renderGrid();
            return;
          }
          selectedIndex = Math.max(selectedIndex - 1, 0);
          renderGrid();
          break;

        case 'Enter':
          e.preventDefault();
          if (expandedSectionId && subIndex >= 0) {
            var sec2 = null;
            for (var j = 0; j < sections.length; j++) {
              if (sections[j].id === expandedSectionId) { sec2 = sections[j]; break; }
            }
            if (sec2 && sec2.children && sec2.children[subIndex]) {
              selectChild(sec2.children[subIndex].id);
            }
          } else {
            selectItem(getSelectedItem());
          }
          break;
      }
    }

    // ── Click delegation ──

    overlayEl.addEventListener('click', function (e) {
      // Click on backdrop → close
      if (e.target === overlayEl) { close(); return; }

      // Sub-item click
      var subItem = e.target.closest('[data-sub-id]');
      if (subItem) {
        selectChild(subItem.dataset.subId);
        return;
      }

      // Card click
      var card = e.target.closest('[data-card-id]');
      if (card) {
        var item = null;
        var cid = card.dataset.cardId;
        for (var i = 0; i < gridItems.length; i++) {
          if (gridItems[i].data && gridItems[i].data.id === cid) { item = gridItems[i].data; break; }
        }
        if (item) selectItem(item);
        return;
      }
    });

    // ── Ctrl+K global binding (scoped to this layer) ──

    function handleGlobalKeydown(e) {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        if (isOpen) close(); else open();
      }
    }
    document.addEventListener('keydown', handleGlobalKeydown);

    // ── Connect to tab strip ──
    tabStrip._onLauncherOpen = open;

    // ── Destroy ──

    function destroy() {
      close();
      document.removeEventListener('keydown', handleGlobalKeydown);
      if (overlayEl && overlayEl.parentNode) overlayEl.remove();
    }

    // ── API ──

    return {
      open: open,
      close: close,
      isOpen: function () { return isOpen; },
      destroy: destroy,
      validate: function () { return validateModuleConfig(config); }
    };
  }

  // ── Public API ──
  global.LumiaLauncher = {
    create: createLauncher,
    validateConfig: validateModuleConfig
  };

})(window);
