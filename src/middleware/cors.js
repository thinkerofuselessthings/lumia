/**
 * CORS Middleware â€” LUMIA
 * Restricted to actual origin (HOST:PORT).
 */

const { env } = require("../config/env");

function applyCors(req, res) {
  const HOST = env("LUMIA_HOST", "127.0.0.1");
  const PORT = env("LUMIA_PORT", 3500);
  const origin = req.headers.origin;
  const allowed = `http://${HOST}:${PORT}`;
  // V3.M1.A18: localhost ammesso solo se non in produzione.
  const allowLocalhost = process.env.NODE_ENV !== "production";
  const isAllowed = origin === allowed || (allowLocalhost && origin === `http://localhost:${PORT}`);

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    // V3.M1.A4: PATCH aggiunto per allineare CORS al CSRF check.
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, X-CSRF-Token");
  }

  if (req.method === "OPTIONS") {
    res.writeHead(isAllowed ? 204 : 403);
    res.end();
    return true;
  }
  return false;
}

module.exports = { applyCors };
