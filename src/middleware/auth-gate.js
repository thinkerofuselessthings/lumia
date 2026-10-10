/**
 * Auth Gate â€” session, CSRF and role checks for API requests.
 *
 * Supports dual-auth:
 *   - Cookie `session=...` â†’ DB session validation (browser)
 *   - Header `X-API-Key`   â†’ static key validation (API clients)
 */

const { parseCookies, deriveCsrfToken } = require("./auth");
const { getSessionByToken } = require("../../app/auth/db");
const { AppError } = require("../errors/app-error");
const { logAudit } = require("../db/audit");
const { env } = require("../config/env");
const { getClientIp } = require("../http/client-ip");

/**
 * Validates session/API-key, CSRF token and role for a matched route.
 *
 * @param {object} req â€” HTTP request
 * @param {object} match â€” router match { auth, role, handler, params }
 * @param {string} method â€” HTTP method
 * @param {string} apiPath â€” API path (for audit)
 * @returns {{ session: object|null }}
 */
function enforceAuth(req, match, method, apiPath) {
  if (!match.auth) return { session: null };

  const ip = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "";

  // Try X-API-Key first (stateless, for external API clients)
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    const fs = require("fs");
    const path = require("path");
    const configFile = path.join(__dirname, "..", "..", "lumia.config.json");
    let fileApiKey = "";
    try { fileApiKey = JSON.parse(fs.readFileSync(configFile, "utf-8")).apiKey || ""; } catch (_) {}
    const expected = env("LUMIA_API_KEY", fileApiKey);
    if (expected && apiKey === expected) {
      return { session: null }; // API-key auth: no session object
    }
    throw AppError.from("AUTH_API_KEY_INVALID");
  }

  // Cookie-based session auth (browser)
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.session;
  const session = getSessionByToken(token);

  if (!session) {
    logAudit("auth.denied", { ip, userAgent, method, path: apiPath }, { result: "fallito" });
    throw AppError.from("AUTH_REQUIRED");
  }

  // CSRF validation on state-changing requests
  // V3.M1.A3: PATCH aggiunto — agenda usa PATCH per move/reorder/status/promote.
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrfHeader = req.headers["x-csrf-token"];
    if (!csrfHeader || csrfHeader !== deriveCsrfToken(token)) {
      logAudit("csrf.failure", { userId: session.utente_id, ip, userAgent, method, path: apiPath }, { result: "fallito" });
      throw AppError.from("AUTH_CSRF_INVALID");
    }
  }

  // Role check
  if (match.role && session.ruolo !== match.role) {
    logAudit("auth.denied", { userId: session.utente_id, ip, userAgent, method, path: apiPath }, { result: "fallito", details: { required_role: match.role } });
    throw AppError.from("AUTH_ROLE_DENIED");
  }

  // V3.M2.A5: enforcement forza_cambio_password.
  // Se l'utente ha la flag attiva, blocca tutte le rotte tranne quelle di self-service auth
  // (logout, check, change-password, sessions list/revoke). In questo modo la prima
  // azione obbligatoria post-login è il cambio password.
  if (session.forza_cambio_password) {
    const allowed = new Set([
      "auth/logout", "auth/check", "auth/change-password",
      "auth/sessions",
    ]);
    const isSessionRevoke = method === "DELETE" && /^auth\/sessions\/[^/]+$/.test(apiPath);
    if (!allowed.has(apiPath) && !isSessionRevoke) {
      logAudit("auth.password_change_required", { userId: session.utente_id, ip, userAgent, method, path: apiPath }, { result: "fallito" });
      throw AppError.from("AUTH_PASSWORD_CHANGE_REQUIRED");
    }
  }

  return { session };
}

module.exports = { enforceAuth };
