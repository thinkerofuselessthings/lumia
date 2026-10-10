/*! hemato-api.js — HematoAPI namespace (zero DOM)
 *  Espone: window.HematoAPI
 *  Dipendenze: nessuna (deve caricarsi per primo)
 *  Pattern: IIFE su window
 */
(function attachHematoAPI(global) {
  'use strict';

  const VERSION = '0.1.0';

  /* ── Namespace ── */
  const API = {
    version: VERSION,

    /** Diagnostics engines — registrati dai rispettivi *-core.js */
    diagnostics: {},

    /** Therapy recommendation engines — registrati dai rispettivi *-core.js */
    therapy: {},

    /** Score calculators — registrati da hemato-scores.js */
    scores: {},

    /** Marker reference data */
    markers: {
      _panels: {},

      /** Registra un pannello di marker */
      registerPanel(panelKey, markerList) {
        this._panels[panelKey] = Object.freeze([...markerList]);
      },

      /** Tutti i marker di un pannello */
      byPanel(panelKey) {
        return this._panels[panelKey] || [];
      },

      /** Tutti i marker di tutti i pannelli (unici) */
      all() {
        const set = new Set();
        Object.values(this._panels).forEach(arr => arr.forEach(m => set.add(m)));
        return [...set];
      },

      /** Lista pannelli registrati */
      panels() {
        return Object.keys(this._panels);
      }
    },

    /** Stati possibili per un marker CD */
    states() {
      return Object.freeze([
        { key: 'pos', label: 'Positivo' },
        { key: 'neg', label: 'Negativo' },
        { key: 'dim', label: 'Dim' },
        { key: 'br',  label: 'Bright' },
        { key: 'nt',  label: 'Non testato' }
      ]);
    },

    /* ── Utility di registrazione per i sotto-moduli ── */

    /**
     * Registra un diagnostic engine.
     * @param {string} key — es. 'bLPD', 'tLPD'
     * @param {object} engine — oggetto con almeno compute(), markers(), diagnoses()
     */
    registerDiagnostic(key, engine) {
      if (!key || typeof key !== 'string') throw new Error('registerDiagnostic: key deve essere una stringa.');
      if (!engine || typeof engine.compute !== 'function') throw new Error(`registerDiagnostic(${key}): engine.compute deve essere una funzione.`);
      this.diagnostics[key] = engine;
      _emit('hemato:diagnostic:registered', { key });
    },

    /**
     * Registra un therapy recommendation engine.
     * @param {string} key — es. 'cll', 'dlbcl'
     * @param {object} engine — oggetto con almeno compute(), regimens()
     */
    registerTherapy(key, engine) {
      if (!key || typeof key !== 'string') throw new Error('registerTherapy: key deve essere una stringa.');
      if (!engine || typeof engine.compute !== 'function') throw new Error(`registerTherapy(${key}): engine.compute deve essere una funzione.`);
      this.therapy[key] = engine;
      _emit('hemato:therapy:registered', { key });
    },

    /**
     * Registra un calcolatore di score.
     * @param {string} key — es. 'cllIPI', 'flipi'
     * @param {function} calculator — (params) => { score, risk }
     */
    registerScore(key, calculator) {
      if (!key || typeof key !== 'string') throw new Error('registerScore: key deve essere una stringa.');
      if (typeof calculator !== 'function') throw new Error(`registerScore(${key}): deve essere una funzione.`);
      this.scores[key] = calculator;
      _emit('hemato:score:registered', { key });
    }
  };

  /* ── Event helper (usa hemato-events se presente, altrimenti fallback) ── */
  function _emit(type, detail) {
    if (global.HematoEvents && typeof global.HematoEvents.emit === 'function') {
      global.HematoEvents.emit(type, detail);
    }
    try {
      global.dispatchEvent(new CustomEvent(type, { detail }));
    } catch (_) { /* silent */ }
  }

  global.HematoAPI = API;
})(window);
