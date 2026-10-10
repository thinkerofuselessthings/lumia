/**
 * sqlite-wrapper.js — Compatibility layer: sql.js ↔ better-sqlite3 API
 *
 * sql.js è SQLite compilato in WebAssembly (puro JS, zero moduli nativi).
 * Questo wrapper espone la stessa interfaccia sincrona di better-sqlite3
 * (prepare/get/all/run/exec/pragma) così il resto del codice non cambia.
 *
 * Persistenza: il database viene esportato su disco dopo ogni scrittura.
 */

const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

let SQL = null;

/**
 * Inizializza il motore WASM di sql.js (chiamare una volta prima di usare Database).
 */
async function initSqlite() {
  if (SQL) return;
  SQL = await initSqlJs();
}

/**
 * Database wrapper — API compatibile con better-sqlite3.
 */
class Database {
  constructor(dbPath) {
    if (!SQL) throw new Error("Chiamare initSqlite() prima di creare un Database");
    this.dbPath = dbPath;
    this._batchMode = false;
    this._saveTimer = null;
    this._savePending = false;

    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
  }

  /* ── PRAGMA ── */
  pragma(str) {
    try {
      if (/=/.test(str)) {
        this.db.exec(`PRAGMA ${str}`);
      } else {
        const stmt = this.db.prepare(`PRAGMA ${str}`);
        const result = stmt.step() ? stmt.getAsObject() : {};
        stmt.free();
        return result;
      }
    } catch (_) { /* ignora pragma non supportati */ }
  }

  /* ── EXEC (multi-statement DDL/DML) ── */
  exec(sql) {
    this.db.exec(sql);
    this._save();
    return this;
  }

  /* ── PREPARE → oggetto { get, all, run } ── */
  prepare(sql) {
    const self = this;

    /**
     * Resolve named params (@name) → positional array.
     * better-sqlite3 accepts { name: val } objects; sql.js only accepts arrays.
     * Extract @name tokens from SQL in order, map object values to array.
     */
    const namedTokens = (() => {
      const seen = new Set();
      const tokens = [];
      const re = /[@$:](\w+)/g;
      let m;
      while ((m = re.exec(sql)) !== null) {
        if (!seen.has(m[1])) { seen.add(m[1]); tokens.push(m[1]); }
      }
      return tokens;
    })();

    function resolveParams(params) {
      if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0])) {
        const obj = params[0];
        return namedTokens.map(name => obj[name] !== undefined ? obj[name] : null);
      }
      return params;
    }

    return {
      /** Restituisce la prima riga come oggetto, o undefined */
      get(...params) {
        const resolved = resolveParams(params);
        const stmt = self.db.prepare(sql);
        try {
          if (resolved.length) stmt.bind(resolved);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const obj = {};
            for (let i = 0; i < cols.length; i++) obj[cols[i]] = vals[i];
            return obj;
          }
          return undefined;
        } finally {
          stmt.free();
        }
      },

      /** Restituisce tutte le righe come array di oggetti */
      all(...params) {
        const resolved = resolveParams(params);
        const stmt = self.db.prepare(sql);
        try {
          if (resolved.length) stmt.bind(resolved);
          const results = [];
          let cols = null;
          while (stmt.step()) {
            if (!cols) cols = stmt.getColumnNames();
            const vals = stmt.get();
            const obj = {};
            for (let i = 0; i < cols.length; i++) obj[cols[i]] = vals[i];
            results.push(obj);
          }
          return results;
        } finally {
          stmt.free();
        }
      },

      /** Esegue INSERT/UPDATE/DELETE, restituisce { changes, lastInsertRowid } */
      run(...params) {
        const resolved = resolveParams(params);
        const isInsert = /^\s*INSERT/i.test(sql);
        const stmt = self.db.prepare(sql);
        try {
          if (resolved.length) stmt.bind(resolved);
          stmt.step();
        } finally {
          stmt.free();
        }
        const changes = self.db.getRowsModified();
        let lastInsertRowid = 0;
        if (isInsert) {
          const res = self.db.exec("SELECT last_insert_rowid() AS id");
          lastInsertRowid = res.length && res[0].values.length
            ? res[0].values[0][0]
            : 0;
        }
        self._save();
        return { changes, lastInsertRowid };
      },
    };
  }

  /* ── Batch mode: disabilita auto-save per operazioni bulk ── */
  beginBatch() { this._batchMode = true; }
  endBatch() { this._batchMode = false; this._flushToDisk(); }

  /* ── Transaction: wrappa una funzione in BEGIN/COMMIT ── */
  transaction(fn) {
    const self = this;
    const wrapped = function (...args) {
      const wasBatch = self._batchMode;
      self._batchMode = true;
      self.db.run("BEGIN");
      try {
        const result = fn(...args);
        self.db.run("COMMIT");
        return result;
      } catch (e) {
        try { self.db.run("ROLLBACK"); } catch (_) { /* already rolled back */ }
        throw e;
      } finally {
        self._batchMode = wasBatch;
        if (!wasBatch) self._flushToDisk();
      }
    };
    wrapped.deferred = wrapped;
    wrapped.immediate = wrapped;
    wrapped.exclusive = wrapped;
    return wrapped;
  }

  /* ── Persistenza su disco (debounce: accorpa scritture ravvicinate) ── */
  _save() {
    if (this._batchMode) return;
    this._savePending = true;
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      if (this._savePending) {
        this._savePending = false;
        this._flushToDisk();
      }
    }, 500);
  }

  /** Scrive il database su disco (sincrono) */
  _flushToDisk() {
    if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
    this._savePending = false;
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, Buffer.from(data));
  }

  close() {
    this._flushToDisk();
    this.db.close();
  }
}

module.exports = { initSqlite, Database };
