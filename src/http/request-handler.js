/**
 * Request Handler — dispatches HTTP requests to API routes or static files
 */

const { applyCors } = require("../middleware/cors");
const { applySecurityHeaders, applyCacheControl } = require("../middleware/security-headers");
const { parseBody } = require("./body-parser");
const { serveStatic } = require("./static");
const { handleApiRequest } = require("../routes");
const { handleError } = require("../errors/handle");
const { log } = require("../lib/logger");
const metrics = require("../lib/metrics");

async function handleRequest(req, res) {
  applySecurityHeaders(res);

  if (applyCors(req, res)) return;

  // V3.M5.B10: alias di versione \u2014 `/api/v1/*` \u2261 `/api/*`. Permette di
  // pubblicare URL versionati senza duplicare le route. La v1 \u00e8 l'unica versione
  // attualmente esposta; future v2 si gestiscono creando un nuovo router.
  if (req.url.startsWith("/api/v1/")) {
    req.originalUrl = req.url;
    req.url = "/api/" + req.url.slice("/api/v1/".length);
  }

  // Request logging
  const start = Date.now();
  const origEnd = res.end.bind(res);
  res.end = function (...args) {
    const ms = Date.now() - start;
    if (req.url.startsWith("/api/")) {
      log.info({ msg: "api.request", method: req.method, url: req.originalUrl || req.url, status: res.statusCode, ms });
      // V3.M5.B4: registra metriche per ogni request API (no-op per /api/metrics stesso \u00e8 ok)
      metrics.recordHttp({ method: req.method, statusCode: res.statusCode, durationMs: ms });
    }
    return origEnd(...args);
  };

  // API routes: /api/*
  if (req.url.startsWith("/api/")) {
    applyCacheControl(res, "api");
    try {
      const body = await parseBody(req);
      handleApiRequest(req, res, body);
    } catch (e) {
      handleError(e, res);
    }
    return;
  }

  // Static files
  serveStatic(req, res);
}

module.exports = { handleRequest };
