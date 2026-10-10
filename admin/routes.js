/**
 * Admin routes — user management
 *
 * All endpoints require `{ role: "admin" }`.
 * The auth-gate middleware enforces session.ruolo === "admin".
 */

const admin = require("./users");
const { AppError } = require("../../src/errors/app-error");
const { logChange } = require("../../src/db/audit");
const { getDb } = require("../../src/db/instance");
const { parsePagination, paginated } = require("../../src/lib/pagination");
const { safeDecField } = require("../../src/lib/field-crypto");

function register(router, { json }) {

  const ROLE = { role: "admin" };

  /* ── Audit logs (paginated, filterable)
   *    V3.M3.A11: audit_log unificato (auth events + data mutations).
   *    Filters supportati:
   *      - q           ricerca like su azione / percorso / dettagli
   *      - kind        'auth' | 'data' | 'all' (default 'all')
   *      - esito       'successo' | 'fallito'
   *      - utente_id   numerico
   *      - target_table  filtro per tabella mutata
   *      - from / to   ISO date (>= / <=) su creato_il
   * ── */
  router.get("admin/audit-logs", (ctx) => {
    const { page, page_size, limit, offset } = parsePagination(ctx, { default_size: 50, max_size: 500 });
    const q = ctx.query;
    const get = (k) => (q && typeof q.get === "function") ? q.get(k) : (q ? q[k] : null);

    const where = [];
    const args = [];

    const kind = get("kind");
    if (kind === "auth") where.push("azione NOT LIKE 'data.%'");
    else if (kind === "data") where.push("azione LIKE 'data.%'");

    const esito = get("esito");
    if (esito) { where.push("esito = ?"); args.push(String(esito)); }
    const utenteId = get("utente_id");
    if (utenteId) { where.push("utente_id = ?"); args.push(Number(utenteId)); }
    const targetTable = get("target_table");
    if (targetTable) { where.push("target_table = ?"); args.push(String(targetTable)); }
    const from = get("from");
    if (from) { where.push("creato_il >= ?"); args.push(String(from)); }
    const to = get("to");
    if (to)   { where.push("creato_il <= ?"); args.push(String(to)); }
    const qStr = get("q");
    if (qStr) {
      where.push("(azione LIKE ? OR percorso LIKE ? OR dettagli LIKE ?)");
      const pat = "%" + String(qStr) + "%";
      args.push(pat, pat, pat);
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const db = getDb();
    const logs = db.prepare(`
      SELECT id, azione, utente_id, ip, user_agent, metodo, percorso, esito, dettagli,
             target_table, target_id,
             (before_data IS NOT NULL OR after_data IS NOT NULL) AS has_change,
             creato_il
      FROM audit_log ${whereSql}
      ORDER BY id DESC LIMIT ? OFFSET ?
    `).all(...args, limit, offset);

    const countRow = db.prepare(`SELECT COUNT(*) AS total FROM audit_log ${whereSql}`).get(...args);
    json(ctx.res, { ok: true, logs, ...paginated(logs, countRow.total, page, page_size) });
  }, ROLE);

  /* ── Audit log detail (decrypts before/after) ── */
  router.get("admin/audit-logs/:id", (ctx) => {
    const id = Number(ctx.params.id);
    if (!Number.isFinite(id)) throw AppError.from("VALIDATION_INVALID", { field: "id" });
    const db = getDb();
    const row = db.prepare(`
      SELECT id, azione, utente_id, ip, user_agent, metodo, percorso, esito, dettagli,
             target_table, target_id, before_data, after_data, creato_il
      FROM audit_log WHERE id = ?
    `).get(id);
    if (!row) throw AppError.from("NOT_FOUND");

    let before = null, after = null;
    if (row.before_data) {
      try { before = JSON.parse(safeDecField(row.before_data)); }
      catch (_) { before = { _raw: safeDecField(row.before_data) }; }
    }
    if (row.after_data) {
      try { after = JSON.parse(safeDecField(row.after_data)); }
      catch (_) { after = { _raw: safeDecField(row.after_data) }; }
    }
    let dettagliParsed = null;
    if (row.dettagli) {
      try { dettagliParsed = JSON.parse(row.dettagli); }
      catch (_) { dettagliParsed = row.dettagli; }
    }

    json(ctx.res, { ok: true, log: {
      id: row.id, azione: row.azione, utente_id: row.utente_id, ip: row.ip,
      user_agent: row.user_agent, metodo: row.metodo, percorso: row.percorso,
      esito: row.esito, dettagli: dettagliParsed,
      target_table: row.target_table, target_id: row.target_id,
      before, after, creato_il: row.creato_il
    }});
  }, ROLE);

  /* ── List all users (paginated) ── */
  router.get("admin/utenti", (ctx) => {
    const { page, page_size, limit, offset } = parsePagination(ctx, { default_size: 100, max_size: 500 });
    const all = admin.getAllUtenti();
    const slice = all.slice(offset, offset + limit);
    json(ctx.res, { ok: true, utenti: slice, ...paginated(slice, all.length, page, page_size) });
  }, ROLE);

  /* ── Get single user ── */
  router.get("admin/utenti/:id", (ctx) => {
    const user = admin.getUtenteById(Number(ctx.params.id));
    if (!user) throw AppError.from("NOT_FOUND");
    json(ctx.res, { ok: true, utente: user });
  }, ROLE);

  /* ── Create user ── */
  router.post("admin/utenti", (ctx) => {
    const b = ctx.body || {};

    /* Validation */
    if (!b.username || b.username.length < 3)
      throw AppError.from("VALIDATION_REQUIRED", { field: "username" });
    if (!b.password || b.password.length < 8)
      throw AppError.from("VALIDATION_REQUIRED", { field: "password" });
    if (!b.ruolo || !admin.RUOLI_VALIDI.includes(b.ruolo))
      throw AppError.from("VALIDATION_INVALID", { field: "ruolo", validi: admin.RUOLI_VALIDI });

    try {
      const user = admin.createUtente(b);
      // V3.M3.A12: i CRUD utenti sono auditati come data mutation con diff
      logChange("utenti", user.id, "INSERT", null, user, {
        userId: ctx.session.id, ip: ctx.ip, userAgent: ctx.userAgent,
        method: "POST", path: "/api/admin/utenti",
      });
      json(ctx.res, { ok: true, utente: user }, 201);
    } catch (err) {
      if (err.message && err.message.includes("UNIQUE")) {
        throw AppError.from("VALIDATION_UNIQUE", { field: "username" });
      }
      throw err;
    }
  }, ROLE);

  /* ── Update user ── */
  router.put("admin/utenti/:id", (ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};

    if (b.ruolo && !admin.RUOLI_VALIDI.includes(b.ruolo))
      throw AppError.from("VALIDATION_INVALID", { field: "ruolo", validi: admin.RUOLI_VALIDI });

    const existing = admin.getUtenteById(id);
    if (!existing) throw AppError.from("NOT_FOUND");

    try {
      const user = admin.updateUtente(id, b);
      logChange("utenti", id, "UPDATE", existing, user, {
        userId: ctx.session.id, ip: ctx.ip, userAgent: ctx.userAgent,
        method: "PUT", path: `/api/admin/utenti/${id}`,
      });
      json(ctx.res, { ok: true, utente: user });
    } catch (err) {
      if (err.message && err.message.includes("UNIQUE")) {
        throw AppError.from("VALIDATION_UNIQUE", { field: "username" });
      }
      throw err;
    }
  }, ROLE);

  /* ── Reset password ── */
  router.post("admin/utenti/:id/reset-password", (ctx) => {
    const id = Number(ctx.params.id);
    const b = ctx.body || {};

    if (!b.password || b.password.length < 8)
      throw AppError.from("VALIDATION_REQUIRED", { field: "password" });

    const existing = admin.getUtenteById(id);
    if (!existing) throw AppError.from("NOT_FOUND");

    admin.resetPasswordUtente(id, b.password);
    const after = admin.getUtenteById(id);
    // V3.M3.A12: usa verb 'reset_password' → azione = data.utenti.reset_password
    logChange("utenti", id, "reset_password", existing, after, {
      userId: ctx.session.id, ip: ctx.ip, userAgent: ctx.userAgent,
      method: "POST", path: `/api/admin/utenti/${id}/reset-password`,
    });
    json(ctx.res, { ok: true, message: "Password reimpostata" });
  }, ROLE);

  /* ── Delete user ── */
  router.delete("admin/utenti/:id", (ctx) => {
    const id = Number(ctx.params.id);
    const existing = admin.getUtenteById(id);
    if (!existing) throw AppError.from("NOT_FOUND");

    // V3.M2.A13: deleteUtente lancia LAST_ADMIN_PROTECTED se è l'ultimo admin attivo.
    const ok = admin.deleteUtente(id);
    if (!ok) throw AppError.from("VALIDATION_INVALID", { field: "id", message: "Impossibile eliminare questo utente" });

    logChange("utenti", id, "DELETE", existing, null, {
      userId: ctx.session.id, ip: ctx.ip, userAgent: ctx.userAgent,
      method: "DELETE", path: `/api/admin/utenti/${id}`,
    });
    json(ctx.res, { ok: true, message: "Utente eliminato" });
  }, ROLE);

  /* ── V3.M2.A6: sblocco manuale account bloccato ── */
  router.post("admin/utenti/:id/unlock", (ctx) => {
    const id = Number(ctx.params.id);
    const existing = admin.getUtenteById(id);
    if (!existing) throw AppError.from("NOT_FOUND");
    const ok = admin.unlockUtente(id);
    const after = admin.getUtenteById(id);
    // V3.M3.A12: unlock è una mutation di stato → audit con diff
    logChange("utenti", id, "unlock", existing, after, {
      userId: ctx.session.id, ip: ctx.ip, userAgent: ctx.userAgent,
      method: "POST", path: `/api/admin/utenti/${id}/unlock`,
    });
    json(ctx.res, { ok: true, unlocked: ok });
  }, ROLE);
}

module.exports = { register };
