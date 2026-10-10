/**
 * Admin — User CRUD (server-side)
 *
 * All functions operate on the `utenti` table.
 * Password fields (hash, salt, iterations) are never exposed.
 */

const { getDb } = require("../../src/db/instance");
const { hashPassword } = require("../auth/password");
const { AppError } = require("../../src/errors/app-error");
const { env } = require("../../src/config/env");
const { encField, safeDecField } = require("../../src/lib/field-crypto");

const RUOLI_VALIDI = ["admin", "medico", "infermiere", "tecnico", "amministrativo"];

// V3.M4.A9: `email` cifrata at-rest (PII). Lettura trasparente per legacy in chiaro.
function _decEmail(row) {
  if (row && typeof row.email === "string") row.email = safeDecField(row.email);
  return row;
}
function _decEmails(rows) { return Array.isArray(rows) ? rows.map(_decEmail) : rows; }

// V3.M2.A6: parametri di lockout per account.
const LOCKOUT_THRESHOLD = Math.max(1, parseInt(env("LOCKOUT_THRESHOLD", 5), 10) || 5);
const LOCKOUT_WINDOW_MS = Math.max(60_000, parseInt(env("LOCKOUT_WINDOW_MS", 15 * 60 * 1000), 10) || 15 * 60 * 1000);

/* ── List all users ── */
function getAllUtenti() {
  const db = getDb();
  return _decEmails(db.prepare(`
    SELECT id, username, nome, cognome, ruolo, email, attivo,
           forza_cambio_password, tentativi_falliti, bloccato_fino_il,
           creato_il, aggiornato_il
    FROM utenti ORDER BY id
  `).all());
}

/* ── Single user by id ── */
function getUtenteById(id) {
  const db = getDb();
  return _decEmail(db.prepare(`
    SELECT id, username, nome, cognome, ruolo, email, attivo,
           forza_cambio_password, tentativi_falliti, bloccato_fino_il,
           creato_il, aggiornato_il
    FROM utenti WHERE id = ?
  `).get(id));
}

/* ── Create user ── */
function createUtente({ username, email, nome, cognome, ruolo, password }) {
  const db = getDb();
  const { hash, salt, iterations } = hashPassword(password);
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO utenti (username, email, nome, cognome, ruolo,
                        password_hash, salt, iterations,
                        forza_cambio_password, creato_il, aggiornato_il)
    VALUES (?,?,?,?,?,?,?,?,1,?,?)
  `).run(username, email ? encField(email) : null, nome || null, cognome || null, ruolo, hash, salt, iterations, now, now);
  return getUtenteById(info.lastInsertRowid);
}

/* ── Update user (partial) ── */
function updateUtente(id, data) {
  const db = getDb();
  const allowed = ["username", "email", "nome", "cognome", "ruolo", "attivo"];
  const sets = [];
  const vals = [];
  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = ?`);
      vals.push(key === "email" && data[key] ? encField(data[key]) : data[key]);
    }
  }
  if (!sets.length) return getUtenteById(id);
  sets.push("aggiornato_il = ?");
  vals.push(new Date().toISOString());
  vals.push(id);
  db.prepare(`UPDATE utenti SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getUtenteById(id);
}

/* ── Reset password ── */
function resetPasswordUtente(id, newPassword) {
  const db = getDb();
  const { hash, salt, iterations } = hashPassword(newPassword);
  db.prepare(`
    UPDATE utenti SET password_hash = ?, salt = ?, iterations = ?,
                      forza_cambio_password = 1, aggiornato_il = ?
    WHERE id = ?
  `).run(hash, salt, iterations, new Date().toISOString(), id);
  /* Invalidate all sessions for this user */
  db.prepare("UPDATE sessioni SET valida = 0 WHERE utente_id = ? AND valida = 1").run(id);
}

/* ── Delete user (cannot delete last active admin) ── */
// V3.M2.A13: protezione basata su `ruolo='admin'` (non sullo username letterale)
// + verifica che resti almeno un altro admin attivo prima di disattivare/eliminare.
function deleteUtente(id) {
  const db = getDb();
  const user = db.prepare("SELECT ruolo FROM utenti WHERE id = ?").get(id);
  if (!user) return false;
  if (user.ruolo === "admin") {
    const others = db.prepare(
      "SELECT COUNT(*) AS n FROM utenti WHERE ruolo = 'admin' AND attivo = 1 AND id != ?"
    ).get(id);
    if (!others || others.n < 1) {
      throw AppError.from("LAST_ADMIN_PROTECTED");
    }
  }
  db.prepare("UPDATE sessioni SET valida = 0 WHERE utente_id = ?").run(id);
  db.prepare("DELETE FROM utenti WHERE id = ?").run(id);
  return true;
}

/* ── V3.M2.A6: lockout helpers ── */

// Stato del blocco (string ISO o null se non bloccato).
function isUserLocked(user) {
  if (!user || !user.bloccato_fino_il) return null;
  const until = new Date(user.bloccato_fino_il).getTime();
  return Number.isFinite(until) && until > Date.now() ? user.bloccato_fino_il : null;
}

// Incrementa contatore tentativi falliti; se raggiunge la soglia
// imposta `bloccato_fino_il = now + LOCKOUT_WINDOW_MS`.
function recordFailedLogin(userId) {
  const db = getDb();
  const row = db.prepare("SELECT tentativi_falliti FROM utenti WHERE id = ?").get(userId);
  if (!row) return null;
  const next = (row.tentativi_falliti || 0) + 1;
  if (next >= LOCKOUT_THRESHOLD) {
    const until = new Date(Date.now() + LOCKOUT_WINDOW_MS).toISOString();
    db.prepare(
      "UPDATE utenti SET tentativi_falliti = ?, bloccato_fino_il = ? WHERE id = ?"
    ).run(next, until, userId);
    return { count: next, locked_until: until };
  }
  db.prepare("UPDATE utenti SET tentativi_falliti = ? WHERE id = ?").run(next, userId);
  return { count: next, locked_until: null };
}

// Reset contatore + lock dopo login riuscito.
function resetLoginFailures(userId) {
  getDb().prepare(
    "UPDATE utenti SET tentativi_falliti = 0, bloccato_fino_il = NULL WHERE id = ?"
  ).run(userId);
}

// Sblocco manuale da admin.
function unlockUtente(id) {
  const r = getDb().prepare(
    "UPDATE utenti SET tentativi_falliti = 0, bloccato_fino_il = NULL WHERE id = ?"
  ).run(id);
  return r.changes > 0;
}

module.exports = {
  RUOLI_VALIDI,
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_MS,
  getAllUtenti,
  getUtenteById,
  createUtente,
  updateUtente,
  resetPasswordUtente,
  deleteUtente,
  // lockout
  isUserLocked,
  recordFailedLogin,
  resetLoginFailures,
  unlockUtente,
};
