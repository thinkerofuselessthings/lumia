'use strict';

/**
 * V3.M3.A11: il log mutazioni agenda è ora delegato all'audit_log unificato in
 * lumia.db. La tabella audit_trail in agenda.db viene mantenuta solo per i
 * record storici (no backfill).
 *
 * Firma compatibile col vecchio chiamante: il `userId` viene tradotto in `ctx`.
 * Per ip/method/path serve passare un ctx esplicito (vedi `logWithCtx`).
 */

const { logChange } = require('../../../src/db/audit');

function log(tableName, recordId, action, oldData, newData, userId) {
  logChange(tableName, recordId, action, oldData, newData, { userId: userId || null });
}

/** Variante che riceve un `ctx` HTTP completo per popolare ip/method/path. */
function logWithCtx(tableName, recordId, action, oldData, newData, httpCtx) {
  const userId = httpCtx?.session?.utente_id || null;
  const ip = httpCtx?.ip || null;
  const userAgent = httpCtx?.userAgent || null;
  const method = httpCtx?.req?.method || null;
  const path = httpCtx?.req?.url || null;
  logChange(tableName, recordId, action, oldData, newData, { userId, ip, userAgent, method, path });
}

module.exports = { log, logWithCtx };
