/**
 * src/lib/field-crypto.js — V3.M4.A9 (field-level encryption)
 *
 * AES-256-GCM su singoli campi DB, formato wire:
 *
 *     enc:v1:<base64url(iv(12) || tag(16) || ciphertext)>
 *
 * - `iv` random per chiamata (12 byte → standard GCM)
 * - `tag` 16 byte (autenticità + integrità)
 * - chiave 32 byte da `LUMIA_ENCRYPTION_KEY` (hex 64 char o base64 44 char)
 *   o derivata via scrypt da `LUMIA_ENCRYPTION_PASSPHRASE` + salt persistente
 *   in `data/.enc_salt` (16 byte, autogenerato al primo uso)
 *
 * Strategia di migrazione:
 * - `decField(s)` → se `s` non inizia con `enc:v1:`, ritorna `s` invariato
 *   (back-compat con righe storiche in chiaro)
 * - `encField(p)` → cifra sempre se la chiave è disponibile, altrimenti
 *   ritorna il valore in chiaro (NO-OP) e logga warning una sola volta
 *
 * Limitazioni:
 * - non permette WHERE/LIKE su campi cifrati (occorre decifrare in app)
 * - no key rotation automatica (aggiungere `enc:v2:` con nuova kid quando serve)
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');

const PREFIX = 'enc:v1:';
const ALGO   = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

let _key = null;        // Buffer 32 byte | null
let _warned = false;

function _resolveSaltPath() {
  return path.resolve(process.cwd(), 'data', '.enc_salt');
}

function _loadOrCreateSalt() {
  const p = _resolveSaltPath();
  try {
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      if (buf.length >= 16) return buf.subarray(0, 16);
    }
  } catch {}
  const salt = crypto.randomBytes(16);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, salt, { mode: 0o600 });
  } catch (e) {
    // best-effort: in mancanza di salt persistente, NON deriviamo (chiave instabile è peggio di niente)
    throw new Error('field-crypto: impossibile persistere data/.enc_salt: ' + e.message);
  }
  return salt;
}

function _decodeKey(raw) {
  // hex 64 char
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
  // base64 (44 char con padding o senza)
  try {
    const b = Buffer.from(raw, 'base64');
    if (b.length === 32) return b;
  } catch {}
  return null;
}

function _initKey() {
  if (_key !== null) return _key;
  const direct = env('LUMIA_ENCRYPTION_KEY');
  if (direct) {
    const k = _decodeKey(direct);
    if (!k) throw new Error('field-crypto: LUMIA_ENCRYPTION_KEY non valida (attesi 32 byte hex o base64)');
    _key = k;
    return _key;
  }
  const pass = env('LUMIA_ENCRYPTION_PASSPHRASE');
  if (pass) {
    const salt = _loadOrCreateSalt();
    _key = crypto.scryptSync(pass, salt, 32, { N: 16384, r: 8, p: 1 });
    return _key;
  }
  return null;
}

function isAvailable() {
  try { return _initKey() !== null; } catch { return false; }
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encField(plain) {
  if (plain === null || plain === undefined) return plain;
  if (typeof plain !== 'string') plain = String(plain);
  if (isEncrypted(plain)) return plain; // idempotente
  const key = _initKey();
  if (!key) {
    if (!_warned) {
      _warned = true;
      console.warn('[field-crypto] LUMIA_ENCRYPTION_KEY non impostata: scrittura in chiaro (no-op)');
    }
    return plain;
  }
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

function decField(stored) {
  if (stored === null || stored === undefined) return stored;
  if (typeof stored !== 'string') return stored;
  if (!isEncrypted(stored)) return stored; // back-compat: chiaro
  const key = _initKey();
  if (!key) {
    // Chiave assente ma valore cifrato → non possiamo decifrare
    throw new Error('field-crypto: valore cifrato ma LUMIA_ENCRYPTION_KEY non disponibile');
  }
  const buf = Buffer.from(stored.slice(PREFIX.length), 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) throw new Error('field-crypto: payload troppo corto');
  const iv  = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct  = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * Decifra in modo "trasparente" un valore di tipo unknown:
 * - se è null/undefined → ritorna così
 * - se non è stringa → ritorna così
 * - se non ha prefisso `enc:v1:` → ritorna così (chiaro legacy)
 * - se è cifrato e la chiave manca → ritorna `null` (non lancia, per non rompere SELECT massive)
 */
function safeDecField(stored) {
  try { return decField(stored); }
  catch { return null; }
}

module.exports = {
  PREFIX,
  encField,
  decField,
  safeDecField,
  isEncrypted,
  isAvailable,
};
