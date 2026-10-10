/**
 * Auth — password hashing & verification (PBKDF2 default, scrypt opt-in).
 *
 * V3.M5.A23: argon2id non disponibile in ambiente offline (modulo native non
 * scaricabile). Implementiamo scrypt come algoritmo "moderno" alternativo, con
 * autodetect via prefisso. Le righe legacy (PBKDF2 hex puro) restano supportate.
 *
 * Formati `password_hash` supportati:
 *   PBKDF2 (legacy):   `<128 hex chars>`     (salt e iterations su colonne dedicate)
 *   scrypt (modern):   `$scrypt$N$r$p$<saltHex>$<hashHex>`
 *
 * Migrazione: al login, se l'utente è ancora su PBKDF2 e `PASSWORD_ALGO=scrypt`
 * è attivo, `rehashIfNeeded` riscrive l'hash in formato scrypt.
 */

const crypto = require("crypto");
const { getDb } = require("../../src/db/instance");
const { env } = require("../../src/config/env");

const PBKDF2_ITERATIONS = parseInt(env("PBKDF2_ITERATIONS", 600000), 10);
const PBKDF2_LEGACY = 100000;
const PASSWORD_ALGO = String(env("PASSWORD_ALGO", "pbkdf2")).toLowerCase();

// scrypt parameters (OWASP 2024): N=2^15, r=8, p=1 → memoria ~32 MB
const SCRYPT_N = parseInt(env("SCRYPT_N", 32768), 10);
const SCRYPT_R = parseInt(env("SCRYPT_R", 8), 10);
const SCRYPT_P = parseInt(env("SCRYPT_P", 1), 10);
const SCRYPT_KEYLEN = 64;
const SCRYPT_MAXMEM = 256 * 1024 * 1024; // 256 MB safety cap

function _isScryptHash(s) { return typeof s === "string" && s.startsWith("$scrypt$"); }

function _hashPbkdf2(password, salt) {
  if (!salt) salt = crypto.randomBytes(32).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, "sha512").toString("hex");
  return { hash, salt, iterations: PBKDF2_ITERATIONS };
}

function _hashScrypt(password) {
  const salt = crypto.randomBytes(32);
  const buf = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM });
  const encoded = `$scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("hex")}$${buf.toString("hex")}`;
  // Per retro-compat con lo schema attuale (`salt`/`iterations` colonne separate),
  // i campi salt/iterations diventano ridondanti: tutto è serializzato in `hash`.
  return { hash: encoded, salt: "", iterations: 0 };
}

function hashPassword(password, salt /* legacy arg, usato solo da PBKDF2 */) {
  if (PASSWORD_ALGO === "scrypt") return _hashScrypt(password);
  return _hashPbkdf2(password, salt);
}

function _verifyPbkdf2(password, hash, salt, iterations) {
  const iter = iterations || PBKDF2_LEGACY;
  const check = crypto.pbkdf2Sync(password, salt, iter, 64, "sha512").toString("hex");
  const a = Buffer.from(check, "hex"), b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function _verifyScrypt(password, encoded) {
  const parts = encoded.split("$");
  if (parts.length !== 7) return false;
  const N = parseInt(parts[2], 10), r = parseInt(parts[3], 10), p = parseInt(parts[4], 10);
  const salt = Buffer.from(parts[5], "hex");
  const expected = Buffer.from(parts[6], "hex");
  const got = crypto.scryptSync(password, salt, expected.length, { N, r, p, maxmem: SCRYPT_MAXMEM });
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

function verifyPassword(password, hash, salt, iterations) {
  if (_isScryptHash(hash)) return _verifyScrypt(password, hash);
  return _verifyPbkdf2(password, hash, salt, iterations);
}

/**
 * Re-hash trasparente al login se:
 *  - PASSWORD_ALGO=scrypt e l'hash salvato è ancora PBKDF2, oppure
 *  - hash PBKDF2 con iterazioni < soglia corrente.
 * (Non eseguiamo mai downgrade scrypt → pbkdf2.)
 */
function rehashIfNeeded(userId, password, currentIterations, currentHash) {
  const isScryptStored = _isScryptHash(currentHash);
  const wantScrypt = PASSWORD_ALGO === "scrypt";

  let needsRehash = false;
  if (wantScrypt && !isScryptStored) needsRehash = true;
  else if (!isScryptStored && (!currentIterations || currentIterations < PBKDF2_ITERATIONS)) needsRehash = true;

  if (!needsRehash) return;

  const fresh = hashPassword(password);
  const db = getDb();
  db.prepare("UPDATE utenti SET password_hash = ?, salt = ?, iterations = ? WHERE id = ?")
    .run(fresh.hash, fresh.salt, fresh.iterations, userId);
}

module.exports = { hashPassword, verifyPassword, rehashIfNeeded };
