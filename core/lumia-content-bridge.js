/* =======================================================================
 *  LumiaContentBridge â€” Content-provider registration for Janus layer system
 *  Espone: window.LumiaContentBridge
 *
 *  Pattern (from LAYER_MODAL_SYSTEM.md Â§9):
 *    contentRegistry.register(key, { label, render(container, ctx), destroy(container) })
 *
 *  This module:
 *  1. Creates a lightweight contentRegistry shim if the full Janus system
 *     is NOT loaded (lumia standalone mode).
 *  2. Auto-registers every helper in LumiaHelpersRegistry as a content provider.
 *  3. Auto-registers every dialog-based helper (CLL, DLBCL, FL, MCL, CD-B-LPD)
 *     as a content provider that opens via their .open() method.
 *  4. Provides a lookup so the library grid and bridge can ask
 *     "give me the provider for this helper id".
 * ======================================================================= */
(function (global) {
  'use strict';

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Content Registry shim â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  var registry = new Map();

  /**
   * Register a content provider.
   * Compatible with Janus contentRegistry.register() API.
   */
  function register(key, provider) {
    if (!key || typeof key !== 'string') return;
    if (!provider || typeof provider.render !== 'function') return;
    registry.set(key, {
      label:   provider.label || key,
      render:  provider.render,
      destroy: typeof provider.destroy === 'function' ? provider.destroy : function () {}
    });
  }

  function getProvider(key)  { return registry.get(key) || null; }
  function hasProvider(key)  { return registry.has(key); }
  function listKeys()        { return Array.from(registry.keys()); }

  function renderInto(key, container, context) {
    var p = registry.get(key);
    if (!p) {
      container.innerHTML = '<p class="muted">Contenuto "' + key + '" non trovato.</p>';
      return false;
    }
    try { p.render(container, context); return true; }
    catch (err) {
      container.innerHTML = '<p class="muted">Errore rendering: ' + err.message + '</p>';
      return false;
    }
  }

  function destroyIn(key, container) {
    var p = registry.get(key);
    if (p) { try { p.destroy(container); } catch (_) { /* swallow */ } }
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Auto-register registry-based helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  function registerRegistryHelpers() {
    var REG = global.LumiaHelpersRegistry;
    if (!REG) return;
    var all = REG.getAll ? REG.getAll() : [];
    all.forEach(function (h) {
      if (registry.has(h.id)) return;          // already registered
      if (typeof h.mount !== 'function') return; // no mount â†’ skip
      register(h.id, {
        label: h.title || h.id,
        render: function (container) { h.mount(container); },
        destroy: function (container) { container.innerHTML = ''; }
      });
    });
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Auto-register dialog-based helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  /**
   * Map of dialog-based helper ids â†’ { globalName, label }
   * These helpers use their own <dialog> system, not mount-into-container.
   * The "render" here simply calls .open().
   */
  var DIALOG_HELPERS = [
    { id: 'cd-b-lpd',  global: 'CDDiagnosticHelper',  label: 'CD-Based B-LPD Diagnostic' },
    { id: 'cll',        global: 'CLLTherapyHelper',     label: 'CLL \u00b7 Assistente terapeutico' },
    { id: 'dlbcl',      global: 'DLBCLTherapyHelper',   label: 'DLBCL \u00b7 Assistente terapeutico' },
    { id: 'fl',          global: 'FLTherapyHelper',      label: 'FL \u00b7 Assistente terapeutico' },
    { id: 'mcl',        global: 'MCLTherapyHelper',     label: 'MCL \u00b7 Assistente terapeutico' }
  ];

  function registerDialogHelpers() {
    DIALOG_HELPERS.forEach(function (dh) {
      if (registry.has(dh.id)) return;
      var helper = global[dh.global];
      if (!helper) return;
      register(dh.id, {
        label: dh.label,
        render: function (container, context) {
          // Dialog-based: just open() the dialog.
          // Container gets a placeholder with a "launch" button.
          container.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:12px;">' +
              '<p class="muted">' + dh.label + '</p>' +
              '<button class="btn btn-primary" data-bridge-open="' + dh.id + '">Apri assistente</button>' +
            '</div>';
          if (typeof helper.open === 'function') helper.open();
        },
        destroy: function (container) {
          var h = global[dh.global];
          if (h && typeof h.close === 'function') h.close();
          container.innerHTML = '';
        }
      });
    });
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Bridge: Diagnosis â†’ Therapy mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  /**
   * Map a CD B-LPD diagnosis name to the matching therapy helper id.
   * Returns null if no therapy helper exists for that diagnosis.
   */
  var DX_TO_TX = Object.freeze({
    'CLL/SLL':            'cll',
    'MCL':                'mcl',
    'FL':                 'fl',
    'DLBCL-like':         'dlbcl',
    'HCL':                null,    // no helper yet
    'MZL (splenico)':     null,
    'LPL / WM':           null,
    'SMZL':               null,
    'BL (Burkitt-like)':  null,
    'Unclassified B-LPD': null,
    'MM-like':            'mm-helper',
    'AML-associated':     'aml-helper',
    'MDS-associated':     'mds-helper'
  });

  function therapyForDiagnosis(dxName) {
    if (!dxName) return null;
    // Exact match first
    if (DX_TO_TX[dxName] !== undefined) return DX_TO_TX[dxName];
    // Fuzzy match: check if any key is a prefix of dxName
    var keys = Object.keys(DX_TO_TX);
    for (var i = 0; i < keys.length; i++) {
      if (dxName.toLowerCase().indexOf(keys[i].toLowerCase()) === 0) {
        return DX_TO_TX[keys[i]];
      }
    }
    return null;
  }

  /**
   * Launch the therapy helper for a given diagnosis.
   * @param {string} dxName â€” e.g. 'CLL/SLL'
   * @returns {boolean} true if launched
   */
  function openTherapyForDiagnosis(dxName) {
    var helperId = therapyForDiagnosis(dxName);
    if (!helperId) return false;

    // Try dialog helper first
    var dh = DIALOG_HELPERS.find(function (d) { return d.id === helperId; });
    if (dh) {
      var h = global[dh.global];
      if (h && typeof h.open === 'function') { h.open(); return true; }
    }

    // Try registry helper
    var REG = global.LumiaHelpersRegistry;
    if (REG) {
      var rh = REG.get ? REG.get(helperId) : null;
      if (rh) {
        // Emit event for the library to open it
        if (global.LumiaEvents) {
          global.LumiaEvents.emit('openHelper', { id: helperId, source: 'bridge', dxName: dxName });
        }
        return true;
      }
    }

    return false;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Initialize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  function init() {
    registerRegistryHelpers();
    registerDialogHelpers();
  }

  // Auto-init after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

  global.LumiaContentBridge = Object.freeze({
    register:                register,
    getProvider:             getProvider,
    hasProvider:             hasProvider,
    listKeys:               listKeys,
    renderInto:              renderInto,
    destroyIn:               destroyIn,
    therapyForDiagnosis:     therapyForDiagnosis,
    openTherapyForDiagnosis: openTherapyForDiagnosis,
    init:                    init,
    DX_TO_TX:                DX_TO_TX,
    DIALOG_HELPERS:          DIALOG_HELPERS
  });

  /* Also expose as contentRegistry shim if the full Janus system is absent */
  if (!global.contentRegistry) {
    global.contentRegistry = Object.freeze({
      register:    register,
      getProvider: getProvider,
      hasProvider: hasProvider,
      listKeys:    listKeys,
      renderInto:  renderInto,
      destroyIn:   destroyIn
    });
  }

})(window);
