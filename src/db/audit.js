/**
 * DB Audit â€” write/prune audit logs.
 *
 * Espone tre primitive:
 *   - logAudit(action, ctx, opts)      â†’ eventi auth/sistema (no diff)
 *   - logChange(table, id, action, before, after, ctx)
 *                                       â†’ mutazione di dato con snapshot
 *                                         redatti (audit-policy) e cifrati
 *   - pruneAuditLogs()                  â†’ retention housekeeping
 *
 * Storico:
 *   V3.M3.A11 â€” unificazione (target_table/target_id/before_data/after_data)
 *   V3.M4.A9  â€” cifratura at-rest dei blob before/after
 *   V3.M3.A12 â€” audit-policy (redact whitelist) + ctx.source per eventi system
 */

"use strict";

const { getDb } = require("./instance");
const { env } = require("../config/env");
const { encField } = require("../lib/field-crypto");
const { redactSnapshot } = require("./audit-policy");

let _stmts = null;
function stmts() {
  if (_stmts) return _stmts;
  const db = getDb();
  _stmts = {
    insertEvent: db.prepare(`
      INSERT INTO audit_log
        (azione, utente_id, ip, user_agent, metodo, percorso, esito, dettagli)
      VALUES (?,?,?,?,?,?,?,?)
    `),
    insertChange: db.prepare(`
      INSERT INTO audit_log
        (azione, utente_id, ip, user_agent, metodo, percorso, esito, dettagli,
         target_table, target_id, before_data, after_data)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `),
  };
  return _stmts;
}

/**
 * Registra un evento nel log di audit (eventi auth/sistema).
 * @param {string} action  es. 'login.success', 'auth.denied', 'csrf.failure'
 * @param {object} ctx     { userId?, ip?, userAgent?, method?, path?, source? }
 * @param {object} opts    { result?: 'successo'|'fallito', details?: object|string }
 */
function logAudit(action, ctx = {}, opts = {}) {
  // V3.M3.A12: ctx.source ('system:<job>') si fonde con dettagli per eventi non-HTTP
  let details = opts.details;
  if (ctx.source) {
    if (details && typeof details === "object") details = { source: ctx.source, ...details };
    else if (details == null) details = { source: ctx.source };
  }
  stmts().insertEvent.run(
    action,
    ctx.userId || null,
    ctx.ip || null,
    ctx.userAgent || null,
    ctx.method || null,
    ctx.path || null,
    opts.result || "successo",
    details ? (typeof details === "string" ? details : JSON.stringify(details)) : null
  );
}

/**
 * Registra una mutazione di dato (INSERT/UPDATE/DELETE).
 * `azione` viene normalizzata a `data.<table>.<verb>` (verb in lowercase).
 *
 * @param {string} table        nome tabella mutata
 * @param {number|string} id    pkey del record
 * @param {string} action       'INSERT' | 'UPDATE' | 'DELETE' | 'CASCADE_DELETE' | 'reset_password' | 'unlock' | â€¦
 * @param {object|null} before  snapshot prima
 * @param {object|null} after   snapshot dopo
 * @param {object} ctx          { userId?, ip?, userAgent?, method?, path?, source? }
 */
function logChange(table, id, action, before, after, ctx = {}) {
  const azione = `data.${table}.${String(action).toLowerCase()}`;
  // V3.M3.A12: applica redaction policy (es. password_hash, token) PRIMA di cifrare
  const beforeRedacted = redactSnapshot(table, before);
  const afterRedacted = redactSnapshot(table, after);
  const dettagli = ctx.source ? JSON.stringify({ source: ctx.source }) : null;
  stmts().insertChange.run(
    azione,
    ctx.userId || null,
    ctx.ip || null,
    ctx.userAgent || null,
    ctx.method || null,
    ctx.path || null,
    "successo",
    dettagli,
    table,
    typeof id === "number" ? id : (id != null ? Number(id) || null : null),
    // V3.M4.A9: snapshot before/after possono contenere PHI â†’ cifrati at-rest
    beforeRedacted ? encField(JSON.stringify(beforeRedacted)) : null,
    afterRedacted ? encField(JSON.stringify(afterRedacted)) : null
  );
}

/**
 * Cancella audit log piÃ¹ vecchi di AUDIT_RETENTION_DAYS (default 365).
 * @returns {number} righe cancellate
 */
function pruneAuditLogs() {
  const db = getDb();
  const retentionDays = env("AUDIT_RETENTION_DAYS", 365);
  const r = db.prepare(`
    DELETE FROM audit_log
    WHERE creato_il < datetime('now', ?)
  `).run(`-${retentionDays} days`);
  if (r.changes > 0) console.log(`  [AUDIT] Pruned ${r.changes} old audit logs`);
  return r.changes;
}

module.exports = { logAudit, logChange, pruneAuditLogs };
