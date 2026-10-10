/**
 * src/integrations/cerus/cache.js — Cache di processo per le risposte Cerus
 *
 * V3.M4.A1 (Fase A2). Strategia: TTL semplice + cap LRU per evitare crescita
 * illimitata. Coerenza eventuale: cliniche con dati che cambiano spesso
 * dovrebbero usare TTL basso (default 30s).
 *
 * NB: nessuna persistenza — al riavvio del processo la cache è vuota.
 */
'use strict';

const DEFAULT_TTL_MS = 30 * 1000;   // 30 secondi
const DEFAULT_MAX    = 500;         // 500 entry, > pazienti attivi in una giornata tipo

class TtlCache {
  constructor(opts) {
    opts = opts || {};
    this.ttl = opts.ttlMs || DEFAULT_TTL_MS;
    this.max = opts.max || DEFAULT_MAX;
    this.map = new Map();           // key → { value, expiresAt }
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // LRU touch: re-insert per spostarlo in coda
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + this.ttl });
    if (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  delete(key) { this.map.delete(key); }
  clear()     { this.map.clear(); }

  stats() {
    return { size: this.map.size, max: this.max, ttlMs: this.ttl };
  }
}

module.exports = { TtlCache, DEFAULT_TTL_MS, DEFAULT_MAX };
