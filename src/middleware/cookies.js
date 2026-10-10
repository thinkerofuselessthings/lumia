/**
 * Cookies — parsing and session cookie helpers
 */

const { env } = require("../config/env");

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx < 1) return;
    cookies[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return cookies;
}

function setSessionCookie(res, token) {
  const maxAge = env("SESSION_MAX_AGE", 86400); // 24 h
  // V3.M1.A20: in produzione default Secure=true; resta override esplicito via env.
  const defaultSecure = process.env.NODE_ENV === "production" ? "true" : "false";
  const isSecure = env("SECURE_COOKIE", defaultSecure) === "true";
  const secure = isSecure ? " Secure;" : "";
  res.setHeader("Set-Cookie", `session=${token}; HttpOnly; SameSite=Strict;${secure} Path=/; Max-Age=${maxAge}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
}

module.exports = { parseCookies, setSessionCookie, clearSessionCookie };
