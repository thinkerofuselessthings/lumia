/**
 * Auth Routes — login, logout, session check, verify-password
 *
 * Registered as auth/:action in the main router.
 * All actions are public (auth: false) — they handle their own auth.
 */

const { getDb } = require("../../src/db/instance");
const {
  getSessionByToken, invalidateSession, verifyPassword, rehashIfNeeded, createSession,
  listUserSessions, revokeUserSession, invalidateOtherSessions,
} = require("./db");
const { hashPassword } = require("./password");
const {
  isUserLocked, recordFailedLogin, resetLoginFailures,
} = require("../admin/users");
const { logAudit } = require("../../src/db/audit");
const { deriveCsrfToken, parseCookies, setSessionCookie, clearSessionCookie } = require("../../src/middleware/auth");
const { loginLimiter } = require("../../src/middleware/rate-limiter");
const { AppError } = require("../../src/errors/app-error");
const { getClientIp } = require("../../src/http/client-ip");

function register(router, { json, notFound }) {

  router.all("auth/:action", handleAuth, { auth: false });

  // V3.M2.A7: revoca singola sessione (l'utente la possiede).
  router.delete("auth/sessions/:id", (ctx) => {
    const { req, res, params } = ctx;
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies.session;
    const session = getSessionByToken(token);
    if (!session) throw AppError.from("AUTH_REQUIRED");
    const csrfHeader = req.headers["x-csrf-token"];
    if (!csrfHeader || csrfHeader !== deriveCsrfToken(token)) throw AppError.from("AUTH_CSRF_INVALID");
    const id = Number(params.id);
    if (!Number.isFinite(id)) throw AppError.from("VALIDATION_INVALID", { field: "id" });
    const ok = revokeUserSession(session.utente_id, id);
    logAudit("auth.session_revoked", {
      userId: session.utente_id, ip: getClientIp(req), userAgent: req.headers["user-agent"],
      method: "DELETE", path: `/api/auth/sessions/${id}`,
    }, { result: ok ? "successo" : "fallito", details: { target: id } });
    return json(res, { ok: true, revoked: ok });
  }, { auth: false });

  function handleAuth(ctx) {
    const { req, res, body, params } = ctx;
    const action = params.action;
    const method = req.method;

    /* ── check-user ── */
    // V3.M1.A22: risposta costante → niente user enumeration.
    // Il vero esito (utente esistente vs no) viene determinato da `login`,
    // che restituisce sempre AUTH_INVALID_CREDENTIALS in entrambi i casi.
    // Manteniamo l'endpoint per compatibilità con il flusso 2-step di public/login.html.
    if (action === "check-user" && method === "POST") {
      const ip = getClientIp(req);
      if (!loginLimiter.check(ip)) throw AppError.from("RATE_LIMIT_LOGIN");
      const { username } = body || {};
      if (!username) throw AppError.from("VALIDATION_REQUIRED", { field: "username" });
      // Audit comunque utile per detection di tentativi di enumerazione.
      logAudit("auth.check", {
        userId: null, ip, userAgent: req.headers["user-agent"],
        method: "POST", path: "/api/auth/check-user",
      }, { details: { username } });
      return json(res, { exists: true });
    }

    /* ── login ── */
    if (action === "login" && method === "POST") {
      const ip = getClientIp(req);
      if (!loginLimiter.check(ip)) throw AppError.from("RATE_LIMIT_LOGIN");
      const { username, password } = body || {};
      if (!username || !password) throw AppError.from("VALIDATION_REQUIRED", { field: "username, password" });

      const user = getDb().prepare("SELECT * FROM utenti WHERE username = ?").get(username);
      const auditCtx = { userId: null, ip, userAgent: req.headers["user-agent"], method: "POST", path: "/api/auth/login" };

      if (!user || !user.attivo) {
        loginLimiter.record(ip);
        logAudit("login.failed", auditCtx, { result: "fallito", details: { username } });
        throw AppError.from("AUTH_INVALID_CREDENTIALS");
      }

      // V3.M2.A6: lockout per account. Se l'account è bloccato, rifiuto subito,
      // anche se la password è corretta (impedisce a un attaccante di sapere
      // di aver indovinato durante la finestra di blocco).
      const lockedUntil = isUserLocked(user);
      if (lockedUntil) {
        loginLimiter.record(ip);
        auditCtx.userId = user.id;
        logAudit("login.failed", auditCtx, { result: "fallito", details: { reason: "account_locked", locked_until: lockedUntil } });
        throw AppError.from("AUTH_ACCOUNT_LOCKED", { locked_until: lockedUntil });
      }

      const valid = verifyPassword(password, user.password_hash, user.salt, user.iterations);
      if (!valid) {
        loginLimiter.record(ip);
        auditCtx.userId = user.id;
        const lock = recordFailedLogin(user.id);
        logAudit("login.failed", auditCtx, { result: "fallito", details: { failures: lock?.count, locked_until: lock?.locked_until || null } });
        throw AppError.from("AUTH_INVALID_CREDENTIALS");
      }

      loginLimiter.reset(ip);
      resetLoginFailures(user.id); // V3.M2.A6: reset contatori lockout su login OK.
      rehashIfNeeded(user.id, password, user.iterations, user.password_hash);

      const session = createSession(user.id, ip, req.headers["user-agent"]);
      auditCtx.userId = user.id;
      logAudit("login.success", auditCtx, { details: { must_change_password: !!user.forza_cambio_password } });
      setSessionCookie(res, session.token);

      // V3.M4.A9: email cifrata at-rest \u2192 decifra per la response
      const { safeDecField } = require("../../src/lib/field-crypto");
      const userEmail = typeof user.email === "string" ? safeDecField(user.email) : user.email;

      return json(res, {
        csrf_token: deriveCsrfToken(session.token),
        expires_at: session.expires_at,
        // V3.M2.A5: hint per la UI \u2014 finch\u00e9 true, le altre rotte rispondono AUTH_PASSWORD_CHANGE_REQUIRED.
        must_change_password: !!user.forza_cambio_password,
        user: { id: user.id, username: user.username, nome: user.nome, cognome: user.cognome, ruolo: user.ruolo, email: userEmail },
      });
    }

    /* ── logout ── */
    if (action === "logout" && method === "POST") {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.session;
      if (token) {
        const session = getSessionByToken(token);
        invalidateSession(token);
        logAudit("logout", {
          userId: session?.utente_id || null,
          ip: getClientIp(req),
          userAgent: req.headers["user-agent"],
          method: "POST",
          path: "/api/auth/logout",
        });
      }
      clearSessionCookie(res);
      return json(res, { ok: true });
    }

    /* ── check (session status — read-only, does NOT reset idle timer) ── */
    if (action === "check" && method === "GET") {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.session;
      const session = getSessionByToken(token, { skipTouch: true });
      if (!session) return json(res, { authenticated: false }, 401);
      const idleMs = require("../../src/config/env").env("SESSION_IDLE_TIMEOUT", 60 * 60 * 1000);
      const lastAccess = session.ultimo_accesso ? new Date(session.ultimo_accesso).getTime() : Date.now();
      const idleRemaining = Math.max(0, Math.floor((idleMs - (Date.now() - lastAccess)) / 1000));
      return json(res, {
        authenticated: true,
        csrf_token: deriveCsrfToken(token),
        idle_remaining: idleRemaining,
        // V3.M2.A5: la UI deve rendere visibile lo stato di password-change-required.
        must_change_password: !!session.forza_cambio_password,
        user: { id: session.utente_id, username: session.username, nome: session.nome, cognome: session.cognome, ruolo: session.ruolo, email: session.email },
      });
    }

    /* ── verify-password (requires active session) ── */
    if (action === "verify-password" && method === "POST") {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.session;
      const session = getSessionByToken(token);
      if (!session) throw AppError.from("AUTH_REQUIRED");
      const csrfHeader = req.headers["x-csrf-token"];
      if (!csrfHeader || csrfHeader !== deriveCsrfToken(token)) throw AppError.from("AUTH_CSRF_INVALID");
      const { password } = body || {};
      if (!password) throw AppError.from("VALIDATION_REQUIRED", { field: "password" });
      const user = getDb().prepare("SELECT password_hash, salt, iterations FROM utenti WHERE id = ?").get(session.utente_id);
      if (!user) throw AppError.from("NOT_FOUND");
      const valid = verifyPassword(password, user.password_hash, user.salt, user.iterations);
      if (!valid) throw AppError.from("AUTH_INVALID_CREDENTIALS");
      return json(res, { ok: true });
    }

    /* ── V3.M2.A5: change-password (requires session + CSRF; consente cambio anche se forza_cambio_password=1) ── */
    if (action === "change-password" && method === "POST") {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.session;
      const session = getSessionByToken(token);
      if (!session) throw AppError.from("AUTH_REQUIRED");
      const csrfHeader = req.headers["x-csrf-token"];
      if (!csrfHeader || csrfHeader !== deriveCsrfToken(token)) throw AppError.from("AUTH_CSRF_INVALID");

      const { old_password, new_password } = body || {};
      if (!old_password) throw AppError.from("VALIDATION_REQUIRED", { field: "old_password" });
      if (!new_password || new_password.length < 8) throw AppError.from("VALIDATION_PASSWORD_WEAK");
      if (old_password === new_password) throw AppError.from("AUTH_PASSWORD_REUSE");

      const db = getDb();
      const user = db.prepare("SELECT id, password_hash, salt, iterations FROM utenti WHERE id = ?").get(session.utente_id);
      if (!user) throw AppError.from("NOT_FOUND");
      if (!verifyPassword(old_password, user.password_hash, user.salt, user.iterations)) {
        throw AppError.from("AUTH_INVALID_CREDENTIALS");
      }
      const fresh = hashPassword(new_password);
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE utenti
        SET password_hash = ?, salt = ?, iterations = ?, forza_cambio_password = 0,
            tentativi_falliti = 0, bloccato_fino_il = NULL, aggiornato_il = ?
        WHERE id = ?
      `).run(fresh.hash, fresh.salt, fresh.iterations, now, user.id);

      // Invalida tutte le altre sessioni (la corrente resta).
      const revoked = invalidateOtherSessions(user.id, token);
      logAudit("auth.password_changed", {
        userId: user.id, ip: getClientIp(req), userAgent: req.headers["user-agent"],
        method: "POST", path: "/api/auth/change-password",
      }, { details: { revoked_other_sessions: revoked } });
      return json(res, { ok: true, revoked_other_sessions: revoked });
    }

    /* ── V3.M2.A7: lista sessioni attive dell'utente corrente ── */
    if (action === "sessions" && method === "GET") {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.session;
      const session = getSessionByToken(token);
      if (!session) throw AppError.from("AUTH_REQUIRED");
      const list = listUserSessions(session.utente_id).map((s) => ({
        ...s,
        is_current: s.id === session.id,
      }));
      return json(res, { ok: true, sessions: list, max: parseInt(require("../../src/config/env").env("MAX_SESSIONS_PER_USER", 5), 10) || 5 });
    }

    return notFound(res);
  }
}

module.exports = { register };
