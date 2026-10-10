/**
 * Auth — admin user seeding
 *
 * Creates the initial admin user if not present.
 * Password from ADMIN_PASSWORD env or random 16-byte hex.
 */

const crypto = require("crypto");
const { getDb } = require("../../src/db/instance");
const { hashPassword } = require("./password");

function seedAdminUser() {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM utenti WHERE username = 'admin'").get();
  if (existing) return;

  const defaultPwd = process.env.ADMIN_PASSWORD || crypto.randomBytes(16).toString("hex");
  const { hash, salt, iterations } = hashPassword(defaultPwd);

  db.prepare(`
    INSERT INTO utenti (username, email, nome, cognome, ruolo, password_hash, salt, iterations, forza_cambio_password, attivo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
  `).run("admin", "admin@lumia.local", "Admin", "Sistema", "admin", hash, salt, iterations);

  const masked = defaultPwd.slice(0, 4) + "*".repeat(defaultPwd.length - 4);
  console.log(`  [SETUP] Utente admin creato — password: ${masked} (${defaultPwd.length} chars)`);
  console.log(`  [SETUP] Sarà richiesto il cambio password al primo accesso.\n`);
}

module.exports = { seedAdminUser };
