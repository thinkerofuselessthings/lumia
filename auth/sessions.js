/**
 * Auth — session CRUD and cleanup
 *
 * Token: 96-char hex (crypto.randomBytes(48)).
 * Dual expiry: idle 30min + absolute 24h.
 */

const crypto = require("crypto");
const { getDb } = require("../../src/db/instance");
const { env } = require("../../src/config/env");

function createSession(utenteId, ip, userAgent) {
  const db = getDb();
  // V3.M2.A7: multi-session per dispositivo. Tetto configurabile (default 5).
  // Quando si supera il limite si invalidano le sessioni più vecchie
  // mantenendo (MAX-1) sessioni precedenti + la nuova.
  const MAX = Math.max(1, parseInt(env("MAX_SESSIONS_PER_USER", 5), 10) || 5);
  const active = db.prepare(`
    SELECT id FROM sessioni
    WHERE utente_id = ? AND valida = 1
    ORDER BY ultimo_accesso DESC, id DESC
  `).all(utenteId);
  if (active.length >= MAX) {
    const toKill = active.slice(MAX - 1).map((r) => r.id);
    if (toKill.length) {
      const placeholders = toKill.map(() => "?").join(",");
      db.prepare(`UPDATE sessioni SET valida = 0 WHERE id IN (${placeholders})`).run(...toKill);
    }
  }

  const token = crypto.randomBytes(48).toString("hex"); // 96 chars
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

  const info = db.prepare(`
    INSERT INTO sessioni (utente_id, token, ip, user_agent, ultimo_accesso, scade_il)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(utenteId, token, ip || null, userAgent || null, now.toISOString(), expires.toISOString());

  return { id: info.lastInsertRowid, token, expires_at: expires.toISOString() };
}

function getSessionByToken(token, opts) {
  if (!token) return null;
  const db = getDb();
  const idleMs = env("SESSION_IDLE_TIMEOUT", 60 * 60 * 1000); // 60 min
  const now = new Date().toISOString();

  const row = db.prepare(`
    SELECT s.*, u.username, u.nome, u.cognome, u.ruolo, u.email,
           u.attivo AS utente_attivo, u.forza_cambio_password
    FROM sessioni s
    JOIN utenti u ON u.id = s.utente_id
    WHERE s.token = ? AND s.valida = 1 AND s.scade_il > ?
  `).get(token, now);

  if (!row) return null;
  if (!row.utente_attivo) return null;

  // V3.M4.A9: email cifrata at-rest \u2192 decifra trasparente
  if (typeof row.email === "string") {
    const { safeDecField } = require("../../src/lib/field-crypto");
    row.email = safeDecField(row.email);
  }

  // Idle timeout check
  if (row.ultimo_accesso) {
    const lastAccess = new Date(row.ultimo_accesso).getTime();
    if (Date.now() - lastAccess > idleMs) {
      db.prepare("UPDATE sessioni SET valida = 0 WHERE id = ?").run(row.id);
      return null;
    }
  }

  // Touch last access — skip when called from heartbeat (skipTouch: true)
  if (!(opts && opts.skipTouch)) {
    db.prepare("UPDATE sessioni SET ultimo_accesso = ? WHERE id = ?").run(new Date().toISOString(), row.id);
  }
  return row;
}

function invalidateSession(token) {
  getDb().prepare("UPDATE sessioni SET valida = 0 WHERE token = ?").run(token);
}

// V3.M2.A7: lista sessioni attive di un utente.
function listUserSessions(utenteId) {
  const db = getDb();
  const now = new Date().toISOString();
  return db.prepare(`
    SELECT id, ip, user_agent, creata_il, ultimo_accesso, scade_il
    FROM sessioni
    WHERE utente_id = ? AND valida = 1 AND scade_il > ?
    ORDER BY ultimo_accesso DESC
  `).all(utenteId, now);
}

// V3.M2.A7: revoca singola sessione (solo se appartiene all'utente).
function revokeUserSession(utenteId, sessionId) {
  const db = getDb();
  const r = db.prepare(
    "UPDATE sessioni SET valida = 0 WHERE id = ? AND utente_id = ? AND valida = 1"
  ).run(sessionId, utenteId);
  return r.changes > 0;
}

// V3.M2.A5: invalida tutte le sessioni di un utente eccetto quella corrente.
// Usata da change-password.
function invalidateOtherSessions(utenteId, keepToken) {
  const db = getDb();
  return db.prepare(
    "UPDATE sessioni SET valida = 0 WHERE utente_id = ? AND valida = 1 AND token != ?"
  ).run(utenteId, keepToken).changes;
}

function cleanupSessions() {
  const now = new Date().toISOString();
  const r = getDb().prepare("DELETE FROM sessioni WHERE valida = 0 OR scade_il <= ?").run(now);
  if (r.changes > 0) console.log(`  [cleanup] ${r.changes} sessioni scadute rimosse`);
  return r.changes;
}

module.exports = {
  createSession, getSessionByToken, invalidateSession,
  cleanupSessions, listUserSessions, revokeUserSession, invalidateOtherSessions,
};
