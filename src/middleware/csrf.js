/**
 * CSRF — secret management and token derivation
 */

const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { env } = require("../config/env");

const CSRF_SECRET = (() => {
  const envVal = env("CSRF_SECRET");
  if (envVal) return envVal;
  const secretFile = path.join(__dirname, "..", "..", "data", ".csrf_secret");
  try { return fs.readFileSync(secretFile, "utf-8").trim(); } catch (_) {}
  const secret = crypto.randomBytes(32).toString("hex");
  try {
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, secret, "utf-8");
  } catch (_) {}
  return secret;
})();

// V3.M1.A19: token full HMAC-SHA256 (64 hex = 256 bit) — niente troncamento.
function deriveCsrfToken(sessionToken) {
  return crypto.createHmac("sha256", CSRF_SECRET).update(sessionToken).digest("hex");
}

module.exports = { deriveCsrfToken };
