/**
 * DB Schema — DDL for LUMIA tables
 */

const { getDb } = require("./instance");

function createTables() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS utenti (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      iterations INTEGER NOT NULL DEFAULT 600000,
      nome TEXT,
      cognome TEXT,
      ruolo TEXT NOT NULL DEFAULT 'medico' CHECK(ruolo IN ('admin','medico','infermiere','tecnico','amministrativo')),
      email TEXT,
      attivo INTEGER NOT NULL DEFAULT 1,
      forza_cambio_password INTEGER NOT NULL DEFAULT 0,
      creato_il TEXT DEFAULT (datetime('now')),
      aggiornato_il TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessioni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      utente_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      valida INTEGER NOT NULL DEFAULT 1,
      ip TEXT,
      user_agent TEXT,
      creata_il TEXT DEFAULT (datetime('now')),
      ultimo_accesso TEXT DEFAULT (datetime('now')),
      scade_il TEXT NOT NULL,
      FOREIGN KEY (utente_id) REFERENCES utenti(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      azione TEXT NOT NULL,
      utente_id INTEGER,
      ip TEXT,
      user_agent TEXT,
      metodo TEXT,
      percorso TEXT,
      esito TEXT DEFAULT 'successo',
      dettagli TEXT,
      creato_il TEXT DEFAULT (datetime('now'))
    );
  `);

  // V3.M2.A6: migrazione idempotente per lockout per account.
  // SQLite non supporta IF NOT EXISTS su ADD COLUMN: usiamo PRAGMA table_info.
  applyMigrationIfMissing(db, "utenti", "tentativi_falliti",
    "ALTER TABLE utenti ADD COLUMN tentativi_falliti INTEGER NOT NULL DEFAULT 0");
  applyMigrationIfMissing(db, "utenti", "bloccato_fino_il",
    "ALTER TABLE utenti ADD COLUMN bloccato_fino_il TEXT");

  // V3.M3.A11: estensione di audit_log per accogliere anche le mutazioni di dato
  // («audit unificato» — prima vivevano in agenda.db::audit_trail).
  applyMigrationIfMissing(db, "audit_log", "target_table",
    "ALTER TABLE audit_log ADD COLUMN target_table TEXT");
  applyMigrationIfMissing(db, "audit_log", "target_id",
    "ALTER TABLE audit_log ADD COLUMN target_id INTEGER");
  applyMigrationIfMissing(db, "audit_log", "before_data",
    "ALTER TABLE audit_log ADD COLUMN before_data TEXT");
  applyMigrationIfMissing(db, "audit_log", "after_data",
    "ALTER TABLE audit_log ADD COLUMN after_data TEXT");
}

function applyMigrationIfMissing(db, table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) return;
  db.exec(ddl);
  console.log(`  [DB] Migrazione applicata: ${table}.${column}`);
}

module.exports = { createTables };
