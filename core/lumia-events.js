/*! lumia-events.js â€” Event bus interno
 *  Espone: window.LumiaEvents
 *  Dipendenze: nessuna
 *  Pattern: IIFE su window
 *
 *  Uso:
 *    LumiaEvents.on('lumia:diagnostic:computed', (d) => console.log(d));
 *    LumiaEvents.emit('lumia:diagnostic:computed', { type:'bLPD', result:{} });
 *    const off = LumiaEvents.on('evt', fn);   off();  // unsubscribe
 */
(function attachLumiaEvents(global) {
  'use strict';

  const listeners = new Map();
  const history = [];          // circular buffer ultimi 100 eventi
  const MAX_HISTORY = 100;

  /**
   * Registra un listener.
   * @param {string} eventName
   * @param {function} callback
   * @returns {function} unsubscribe
   */
  function on(eventName, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(callback);
    return () => listeners.get(eventName)?.delete(callback);
  }

  /**
   * Emette un evento.
   * @param {string} eventName
   * @param {*} data
   */
  function emit(eventName, data) {
    const entry = { type: eventName, data, at: new Date().toISOString() };
    history.push(entry);
    if (history.length > MAX_HISTORY) history.shift();

    const cbs = listeners.get(eventName);
    if (cbs) {
      cbs.forEach(cb => {
        try { cb(data); } catch (_) { /* swallow */ }
      });
    }

    // Emetti anche come CustomEvent sul window per interop con software terzi
    try {
      global.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    } catch (_) { /* silent in test/SSR */ }
  }

  /**
   * Rimuove tutti i listener per un evento (o tutti se omesso).
   */
  function off(eventName) {
    if (eventName) {
      listeners.delete(eventName);
    } else {
      listeners.clear();
    }
  }

  /**
   * Ultimi N eventi dal buffer.
   */
  function recent(n) {
    return history.slice(-(n || MAX_HISTORY));
  }

  global.LumiaEvents = Object.freeze({ on, emit, off, recent });
})(window);
