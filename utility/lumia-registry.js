/*! lumia-registry.js â€” Helper Registry (enhanced)
 *  Espone: window.LumiaHelpersRegistry
 *  Dipendenze: nessuna (lumia-events.js opzionale per interop)
 *  Pattern: IIFE su window
 *
 *  API:
 *    register(helper)           â†’ void   (helper deve avere .id)
 *    unregister(id)             â†’ bool
 *    get(id)                    â†’ helper | undefined
 *    getByTag(tag)              â†’ helper[]
 *    getAll()                   â†’ helper[]   (copia frozen)
 *    has(id)                    â†’ bool
 *    list                       â†’ helper[]   (compatibilitÃ  legacy)
 *    byId                       â†’ {idâ†’helper} (compatibilitÃ  legacy)
 */
(function attachLumiaRegistry(global) {
  'use strict';

  const REGISTRY_KEY = 'LumiaHelpersRegistry';

  /* Se il registry esiste giÃ  (hot-reload), non sovrascrivere i dati */
  if (global[REGISTRY_KEY] && global[REGISTRY_KEY]._v >= 2) return;

  const _list = [];
  const _byId = Object.create(null);

  function _emit(type, detail) {
    if (global.LumiaEvents && typeof global.LumiaEvents.emit === 'function') {
      global.LumiaEvents.emit(type, detail);
    }
    try { global.dispatchEvent(new CustomEvent(type, { detail })); } catch (_) {}
  }

  const registry = {
    _v: 2,  // versione interna per detect

    /** Array dei helper registrati (compatibilitÃ  legacy) */
    get list() { return _list; },

    /** Mappa id â†’ helper (compatibilitÃ  legacy) */
    get byId() { return _byId; },

    /**
     * Registra un helper.
     * @param {object} h â€” deve avere almeno .id (string)
     */
    register(h) {
      if (!h || typeof h.id !== 'string' || !h.id) {
        console.warn('[LumiaRegistry] helper missing id', h);
        return;
      }
      if (_byId[h.id]) {
        // update in-place (hot reload)
        const idx = _list.findIndex(x => x.id === h.id);
        if (idx > -1) _list[idx] = h;
        _byId[h.id] = h;
        _emit('lumia:helper:updated', { id: h.id, helper: h });
        return;
      }
      _list.push(h);
      _byId[h.id] = h;
      _emit('lumia:helper:registered', { id: h.id, helper: h });
    },

    /**
     * Rimuove un helper dal registro.
     * @param {string} id
     * @returns {boolean}
     */
    unregister(id) {
      if (!_byId[id]) return false;
      const idx = _list.findIndex(x => x.id === id);
      if (idx > -1) _list.splice(idx, 1);
      delete _byId[id];
      _emit('lumia:helper:unregistered', { id });
      return true;
    },

    /** Ritorna helper per id. */
    get(id) { return _byId[id]; },

    /** Controlla se un helper Ã¨ registrato. */
    has(id) { return !!_byId[id]; },

    /**
     * Filtra helper per tag.
     * @param {string} tag â€” confronto case-insensitive
     * @returns {object[]}
     */
    getByTag(tag) {
      const t = (tag || '').toLowerCase();
      return _list.filter(h => Array.isArray(h.tags) && h.tags.some(x => x.toLowerCase() === t));
    },

    /** Ritorna copia della lista completa. */
    getAll() { return [..._list]; }
  };

  global[REGISTRY_KEY] = registry;
})(window);
