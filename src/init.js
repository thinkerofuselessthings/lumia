/**
 * Init — Entry point for LUMIA server
 *
 * Loads .env, initializes database, loads engines, starts HTTP server.
 * Engine-loader sandbox is preserved from the original LUMIA architecture.
 */

const { loadEnv, env } = require("./config/env");
loadEnv(); // load .env BEFORE everything else

const { initDatabase } = require("./db/connection");
const { initAgendaDb } = require("../app/agenda/db");
const { loadEngines } = require("./lib/engine-loader");
const { createServer } = require("./server");
const { setEngines } = require("./routes");
const { seedAdminUser } = require("../app/auth/seed");
const { cleanupSessions } = require("../app/auth/sessions");
const { pruneAuditLogs } = require("./db/audit");
const { getDb } = require("./db/instance");
const { log } = require("./lib/logger");

/* ── Start ── */
(async () => {
  await initDatabase();
  /* V3.M1.A14: il .catch finale (sotto) intercetta failure di bootstrap. */
  initAgendaDb();
  seedAdminUser();

  const engines = loadEngines();
  setEngines(engines);

  const { server, PORT, HOST } = createServer();
  server.listen(PORT, HOST, () => {
    log.info({ msg: "server.listen", host: HOST, port: PORT, app: "LUMIA" });
  });

  // Session cleanup every 15 minutes
  const cleanupTimer = setInterval(cleanupSessions, 15 * 60 * 1000);
  cleanupTimer.unref();

  // V3.M3.A10: prune audit log giornaliero (retention via AUDIT_RETENTION_DAYS, default 365).
  // Eseguito subito al boot e poi ogni 24h.
  try { pruneAuditLogs(); } catch (e) { log.error({ msg: "audit.prune.failed", err: e }); }
  const auditPruneTimer = setInterval(() => {
    try { pruneAuditLogs(); } catch (e) { log.error({ msg: "audit.prune.failed", err: e }); }
  }, 24 * 60 * 60 * 1000);
  auditPruneTimer.unref();

  // Graceful shutdown — V3.M4.B6:
  //   1) smetto di accettare nuove connessioni e attendo il drain (server.close)
  //   2) invalido sessioni e chiudo i DB SOLO dopo il drain
  //   3) hard-exit di sicurezza dopo SHUTDOWN_GRACE_MS
  let shuttingDown = false;
  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info({ msg: "shutdown.start", signal });

    clearInterval(cleanupTimer);
    clearInterval(auditPruneTimer);

    const graceMs = parseInt(env("SHUTDOWN_GRACE_MS", 10000), 10) || 10000;
    const hardKill = setTimeout(() => {
      log.error({ msg: "shutdown.timeout", grace_ms: graceMs });
      process.exit(1);
    }, graceMs);
    hardKill.unref();

    server.close((err) => {
      if (err) log.error({ msg: "shutdown.server_close_error", err });
      try {
        const db = getDb();
        const r = db.prepare("UPDATE sessioni SET valida = 0 WHERE valida = 1").run();
        if (r.changes > 0) log.info({ msg: "shutdown.sessions_invalidated", count: r.changes });
        db.close();
      } catch (e) { log.warn({ msg: "shutdown.db_close_warn", err: e }); }
      log.info({ msg: "shutdown.complete" });
      process.exit(0);
    });
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
})().catch((err) => {
  // V3.M1.A14: bootstrap failure handler — stampa stack chiaro e termina con codice 1.
  log.error({ msg: "bootstrap.failed", err });
  process.exit(1);
});
