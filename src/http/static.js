/**
 * Static file serving — MIME types, path traversal protection
 * CSP e security headers delegati a middleware/security-headers.js
 */

const fs = require("fs");
const path = require("path");
const { applyCsp, applyCacheControl, generateCspNonce, CSP_STRICT } = require("../middleware/security-headers");
const { parseCookies } = require("../middleware/auth");
const { getSessionByToken } = require("../../app/auth/db");

const ROOT_DIR = path.join(__dirname, "..", "..");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".woff2":"font/woff2",
  ".woff": "font/woff",
  ".ttf":  "font/ttf",
  ".otf":  "font/otf",
  ".webp": "image/webp",
  ".pdf":  "application/pdf",
  ".txt":  "text/plain; charset=utf-8",
};

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];

  // Session-based routing for root and protected pages
  if (urlPath === "/" || urlPath === "/index.html") {
    const cookies = parseCookies(req.headers.cookie);
    const session = cookies.session ? getSessionByToken(cookies.session) : null;
    if (!session) {
      urlPath = "/public/login.html";
    } else {
      urlPath = "/index.html";
    }
  }

  // /login.html alias → serve login page
  if (urlPath === "/login.html" || urlPath === "/login") {
    urlPath = "/public/login.html";
  }

  let filePath = path.resolve(path.join(ROOT_DIR, urlPath));

  // Security: prevent path traversal
  const resolvedRoot = path.resolve(ROOT_DIR);
  if (!filePath.startsWith(resolvedRoot + path.sep) && filePath !== resolvedRoot) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  // If directory, try index.html
  try {
    if (fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
  } catch (_) { /* not a directory or doesn't exist */ }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
      return;
    }

    if (ext === ".html") {
      // V3.M5.A16: in modalit\u00e0 CSP_STRICT genera nonce per request, lo aggiunge
      // alla CSP e lo inietta in tutti gli inline `<script>`/`<style>` dell'HTML.
      // Off di default: la shell legacy resta funzionante con `'unsafe-inline'`.
      let payload = data;
      if (CSP_STRICT) {
        const nonce = generateCspNonce();
        applyCsp(res, { nonce });
        const html = data.toString("utf8");
        const injected = html
          .replace(/<script(?![^>]*\snonce=)([\s>])/g, `<script nonce="${nonce}"$1`)
          .replace(/<style(?![^>]*\snonce=)([\s>])/g, `<style nonce="${nonce}"$1`);
        payload = Buffer.from(injected, "utf8");
      } else {
        applyCsp(res);
      }
      applyCacheControl(res, "html");
      res.writeHead(200, { "Content-Type": contentType });
      res.end(payload);
      return;
    }
    applyCacheControl(res, "static");

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

module.exports = { serveStatic };
