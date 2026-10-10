/**
 * env.js — Carica variabili da .env senza dipendenze esterne.
 *
 * Chiamare loadEnv() come prima cosa in init.js.
 * Supporta: KEY=value, commenti (#), righe vuote, valori tra apici.
 */

const fs = require("fs");
const path = require("path");

function loadEnv(envPath) {
  const filePath = envPath || path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined && val !== "") {
      process.env[key] = val;
    }
  }
}

/**
 * Legge una variabile d'ambiente con fallback, cast opzionale a numero.
 */
function env(key, fallback) {
  const val = process.env[key];
  if (val === undefined || val === "") return fallback;
  if (typeof fallback === "number") {
    const n = Number(val);
    return Number.isNaN(n) ? fallback : n;
  }
  return val;
}

module.exports = { loadEnv, env };
