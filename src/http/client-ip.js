/**
 * client-ip.js — risolve l'IP reale del client.
 *
 * Strategia:
 * - `req.socket.remoteAddress` di default (normalizzato: rimuove prefisso `::ffff:`).
 * - Se l'IP del socket è in `TRUSTED_PROXIES` (CSV di IP esatti, env), legge
 *   il primo valore di `X-Forwarded-For` (trimmato e normalizzato).
 * - Fallback `"unknown"`.
 *
 * Note: NON viene supportato CIDR. Per LUMIA il caso reale è "nginx su 127.0.0.1
 * davanti al server", quindi `TRUSTED_PROXIES=127.0.0.1,::1` è sufficiente.
 */

const { env } = require("../config/env");

function parseTrusted() {
  const raw = env("TRUSTED_PROXIES", "");
  if (!raw) return new Set();
  return new Set(
    String(raw)
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(normalize)
  );
}

let TRUSTED = parseTrusted();

function normalize(ip) {
  if (!ip) return ip;
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

function getClientIp(req) {
  const socketIp = normalize(req?.socket?.remoteAddress) || "unknown";
  if (!TRUSTED.has(socketIp)) return socketIp;

  const xff = req?.headers?.["x-forwarded-for"];
  if (!xff) return socketIp;

  const first = String(xff).split(",")[0]?.trim();
  return normalize(first) || socketIp;
}

// Esposto per i test.
function _reloadTrustedProxies() {
  TRUSTED = parseTrusted();
}

module.exports = { getClientIp, _reloadTrustedProxies };
