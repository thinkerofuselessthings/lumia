/**
 * tools/reset-admin-password.js
 *
 * Reimposta la password dell'admin (o di un qualsiasi utente) usando
 * l'algoritmo corrente (`PASSWORD_ALGO`, default scrypt). Forza il
 * cambio password al primo login successivo (`forza_cambio_password=1`).
 *
 * Usage:
 *   node tools/reset-admin-password.js                    # reset 'admin', password = ADMIN_PASSWORD env
 *   node tools/reset-admin-password.js <user>             # reset utente specifico
 *   node tools/reset-admin-password.js <user> <password>  # password esplicita
 *
 * Sblocca anche eventuali lockout (failed_login_attempts=0, locked_until=NULL)
 * e riattiva l'account (attivo=1).
 */

require("../src/config/env").loadEnv();
const path = require("path");
const fs = require("fs");

(async () => {
  const username = process.argv[2] || "admin";
  const explicitPwd = process.argv[3];
  const password = explicitPwd || process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("ERROR: nessuna password fornita. Imposta ADMIN_PASSWORD in .env oppure passa la password come 2° argomento.");
    process.exit(2);
  }
  if (password.length < 8) {
    console.error(`ERROR: password troppo corta (${password.length} char). Minimo 8.`);
    process.exit(2);
  }

  // Inizializza il DB principale (carica anche lo schema).
  const { initDatabase } = require("../src/db/connection");
  await initDatabase();

  const { getDb } = require("../src/db/instance");
  const { hashPassword } = require("../app/auth/password");

  const db = getDb();
  const user = db.prepare("SELECT id, username FROM utenti WHERE username = ?").get(username);
  if (!user) {
    console.error(`ERROR: utente '${username}' non trovato in 'utenti'.`);
    process.exit(3);
  }

  const { hash, salt, iterations } = hashPassword(password);

  db.prepare(`
    UPDATE utenti
       SET password_hash = ?,
           salt = ?,
           iterations = ?,
           forza_cambio_password = 1,
           tentativi_falliti = 0,
           bloccato_fino_il = NULL,
           attivo = 1
     WHERE id = ?
  `).run(hash, salt, iterations, user.id);

  // Forza il flush su disco (sql.js usa debounce 500ms).
  if (typeof db._flushToDisk === "function") db._flushToDisk();
  if (typeof db.close === "function") db.close();

  const algo = hash.startsWith("$scrypt$") ? "scrypt" : "pbkdf2";
  console.log(`OK: password di '${username}' (id=${user.id}) reimpostata.`);
  console.log(`    algoritmo: ${algo}`);
  console.log(`    forza_cambio_password = 1 (verrà richiesto cambio al prossimo login)`);
  console.log(`    lockout azzerato, account attivo.`);
  process.exit(0);
})().catch((e) => {
  console.error("FATAL:", e && e.stack ? e.stack : e);
  process.exit(1);
});
