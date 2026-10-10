/**
 * Security Headers â€” header di sicurezza su tutte le response.
 * Pattern Helmet-like, zero dipendenze.
 */
const crypto = require("crypto");
const { env } = require("../config/env");

// V3.M5.A16: modalità CSP strict con nonce. Off di default (back-compat con
// inline script/style della shell). Quando true, ogni response HTML ottiene
// un nonce per request e gli inline vengono annotati `nonce="..."`.
const CSP_STRICT = String(env("CSP_STRICT", "false")).toLowerCase() === "true";
function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-XSS-Protection", "0");
  /* COOP omitted: ineffective on plain HTTP with non-localhost origin */
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
}

/**
 * CSP header â€” solo per response HTML.
 * Adapted for lumia: allows hugeicons CDN for icon fonts.
 */
function applyCsp(res, opts) {
  const nonce = opts && opts.nonce;
  const useNonce = !!nonce && CSP_STRICT;
  const scriptInline = useNonce ? `'nonce-${nonce}' 'strict-dynamic'` : "'unsafe-inline'";
  const styleInline  = useNonce ? `'nonce-${nonce}'` : "'unsafe-inline'";
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    `script-src 'self' ${scriptInline} https://cdn.jsdelivr.net https://d3js.org`,
    `style-src 'self' ${styleInline} https://fonts.googleapis.com https://use.hugeicons.com https://cdn.hugeicons.com`,
    "font-src 'self' https://fonts.gstatic.com https://use.hugeicons.com https://cdn.hugeicons.com",
    "connect-src 'self' ws: https://cdn.hugeicons.com https://cdn.jsdelivr.net",
    "img-src 'self' data:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "));
}

function generateCspNonce() {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Cache-Control header per tipo di response.
 */
function applyCacheControl(res, type) {
  switch (type) {
    case "api":
      res.setHeader("Cache-Control", "no-store");
      break;
    case "html":
      res.setHeader("Cache-Control", "no-cache");
      break;
    case "static":
      res.setHeader("Cache-Control", "no-cache");
      break;
  }
}

module.exports = { applySecurityHeaders, applyCsp, applyCacheControl, generateCspNonce, CSP_STRICT };
