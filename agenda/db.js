'use strict';

const { Database } = require('../../src/lib/sqlite-wrapper');
const { env } = require('../../src/config/env');
const path = require('path');
const fs   = require('fs');

// V3.M4.B8: AGENDA_DB_PATH env (assoluto o relativo al cwd). Default invariato.
const DB_PATH = (() => {
  const fromEnv = env('AGENDA_DB_PATH');
  if (fromEnv) return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  return path.resolve(__dirname, '..', '..', 'data', 'agenda.db');
})();
let db = null;

/**
 * Inizializza il database agenda (separato da lumia.db).
 * Chiamare DOPO initDatabase() — initSqlite() deve essere già avvenuto.
 */
function initAgendaDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  db.beginBatch();
  createSchema();
  runMigrations();
  db.endBatch();

  console.log('  [Agenda DB] Database ready:', DB_PATH);
  return db;
}

function getAgendaDb() {
  if (!db) throw new Error('Agenda DB non inizializzato — chiamare initAgendaDb() prima');
  return db;
}

// ─── Migrations ───────────────────────────────────────────────────────────────

function runMigrations() {
  // Helper: check if column exists
  function hasColumn(table, col) {
    const cols = db.prepare("PRAGMA table_info(" + table + ")").all();
    return cols.some(function (c) { return c.name === col; });
  }

  // M1: Add birth_date to appointments (fix: phone was misused for birth_date)
  if (!hasColumn('appointments', 'birth_date')) {
    db.exec("ALTER TABLE appointments ADD COLUMN birth_date TEXT");
    // Migrate: values matching date pattern move from phone → birth_date
    db.exec("UPDATE appointments SET birth_date = phone, phone = NULL WHERE phone GLOB '????-??-??'");
    console.log('  [Agenda DB] Migration M1: appointments.birth_date added');
  }

  // M2: Add birth_date to list_entries
  if (!hasColumn('list_entries', 'birth_date')) {
    db.exec("ALTER TABLE list_entries ADD COLUMN birth_date TEXT");
    console.log('  [Agenda DB] Migration M2: list_entries.birth_date added');
  }

  // M3: Drop patients table (anagrafica centralizzata in Cerus)
  db.exec("DROP TABLE IF EXISTS patients");

  // V3.M3.A12: created_by/updated_by su tabelle agenda con write da utenti finali.
  // Aggiunte come INTEGER NULL per consentire la presenza in tutti i record futuri
  // senza rompere quelli pregressi.
  for (const t of ['appointments', 'list_entries']) {
    if (!hasColumn(t, 'created_by')) {
      db.exec(`ALTER TABLE ${t} ADD COLUMN created_by INTEGER`);
      console.log(`  [Agenda DB] Migration A12: ${t}.created_by added`);
    }
    if (!hasColumn(t, 'updated_by')) {
      db.exec(`ALTER TABLE ${t} ADD COLUMN updated_by INTEGER`);
      console.log(`  [Agenda DB] Migration A12: ${t}.updated_by added`);
    }
  }
}

// ─── Schema ───────────────────────────────────────────────────────────────────

function createSchema() {

  // ─── Nodes (albero: macroarea → area → sede → flusso → postazione) ──────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id    INTEGER REFERENCES nodes(id) ON DELETE CASCADE,
      type         TEXT    NOT NULL CHECK(type IN ('macroarea','area','sede','flusso','postazione')),
      name         TEXT    NOT NULL,
      station_type TEXT    CHECK(station_type IS NULL OR station_type IN ('letto','poltrona','ambulatorio')),
      schedule     TEXT    DEFAULT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at   TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_nodes_type   ON nodes(type);

    CREATE TRIGGER IF NOT EXISTS trg_nodes_updated_at
    AFTER UPDATE ON nodes FOR EACH ROW
    BEGIN UPDATE nodes SET updated_at = datetime('now','localtime') WHERE id = OLD.id; END;
  `);

  // Seed albero di default se tabella vuota
  const nodeCount = db.prepare('SELECT COUNT(*) AS cnt FROM nodes').get().cnt;
  if (nodeCount === 0) seedNodes();

  // ─── Appointments ───────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name     TEXT    NOT NULL,
      patient_id       TEXT,
      patient_uuid     TEXT,
      phone            TEXT,
      doctor           TEXT,
      room_id          INTEGER,
      type             TEXT    NOT NULL CHECK(type IN ('visita','terapia','prestazione')),
      title            TEXT    NOT NULL,
      description      TEXT,
      prestazione_code TEXT,
      date             TEXT    NOT NULL,
      start_time       TEXT    NOT NULL,
      end_time         TEXT    NOT NULL,
      duration_min     INTEGER NOT NULL DEFAULT 30,
      position         INTEGER NOT NULL DEFAULT 0,
      status           TEXT    NOT NULL DEFAULT 'scheduled'
                       CHECK(status IN ('scheduled','confirmed','completed','cancelled','no_show')),
      color            TEXT    DEFAULT '#4A90D9',
      notes            TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_appt_date         ON appointments(date);
    CREATE INDEX IF NOT EXISTS idx_appt_date_time    ON appointments(date, start_time);
    CREATE INDEX IF NOT EXISTS idx_appt_patient      ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appt_patient_uuid ON appointments(patient_uuid);
    CREATE INDEX IF NOT EXISTS idx_appt_status       ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appt_type         ON appointments(type);
    CREATE INDEX IF NOT EXISTS idx_appt_room         ON appointments(room_id);

    CREATE TRIGGER IF NOT EXISTS trg_appointments_updated_at
    AFTER UPDATE ON appointments FOR EACH ROW
    BEGIN
      UPDATE appointments SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_appt_room_check
    BEFORE INSERT ON appointments
    FOR EACH ROW WHEN NEW.room_id IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'room_id non trovato in nodes')
      WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE id = NEW.room_id AND type = 'postazione');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_appt_room_check_upd
    BEFORE UPDATE OF room_id ON appointments
    FOR EACH ROW WHEN NEW.room_id IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'room_id non trovato in nodes')
      WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE id = NEW.room_id AND type = 'postazione');
    END;
  `);

  // ─── Closed days ────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS closed_days (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL UNIQUE,
      reason     TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_closed_date ON closed_days(date);
  `);

  // ─── Day room overrides ────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS day_room_overrides (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL,
      room_id    INTEGER NOT NULL,
      is_open    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(date, room_id)
    );
    CREATE INDEX IF NOT EXISTS idx_dro_date ON day_room_overrides(date);

    CREATE TRIGGER IF NOT EXISTS trg_dro_room_check
    BEFORE INSERT ON day_room_overrides FOR EACH ROW
    BEGIN
      SELECT RAISE(ABORT, 'room_id non trovato in nodes')
      WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE id = NEW.room_id AND type = 'postazione');
    END;
  `);

  // ─── Station closures ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS station_closures (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id           INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      date_start        TEXT    NOT NULL,
      date_end          TEXT    NOT NULL,
      time_start        TEXT    DEFAULT NULL,
      time_end          TEXT    DEFAULT NULL,
      reason_category   TEXT    NOT NULL DEFAULT 'altro'
                        CHECK(reason_category IN ('manutenzione','ferie','festivita','emergenza','altro')),
      reason_note       TEXT,
      recurrence_type   TEXT    DEFAULT NULL
                        CHECK(recurrence_type IS NULL OR recurrence_type IN ('weekly','monthly')),
      recurrence_pattern TEXT   DEFAULT NULL,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_sc_room  ON station_closures(room_id);
    CREATE INDEX IF NOT EXISTS idx_sc_dates ON station_closures(date_start, date_end);
  `);

  // ─── Station openings ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS station_openings (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id     INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      date        TEXT    NOT NULL,
      time_start  TEXT    DEFAULT NULL,
      time_end    TEXT    DEFAULT NULL,
      reason_note TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(room_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_so_room ON station_openings(room_id);
    CREATE INDEX IF NOT EXISTS idx_so_date ON station_openings(date);
  `);

  // ─── Lists ─────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      flusso_id         INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
      name              TEXT    NOT NULL,
      description       TEXT,
      time_start        TEXT    NOT NULL DEFAULT '08:00',
      time_end          TEXT    NOT NULL DEFAULT '13:00',
      slot_interval_min INTEGER NOT NULL DEFAULT 30,
      max_patients      INTEGER NOT NULL DEFAULT 1,
      recurrence_type   TEXT    NOT NULL DEFAULT 'weekly'
                        CHECK(recurrence_type IN ('weekly','monthly')),
      recurrence_pattern TEXT   NOT NULL DEFAULT '[1,2,3,4,5]',
      active            INTEGER NOT NULL DEFAULT 1,
      sort_order        INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_lists_flusso ON lists(flusso_id);

    CREATE TRIGGER IF NOT EXISTS trg_lists_updated_at
    AFTER UPDATE ON lists FOR EACH ROW
    BEGIN UPDATE lists SET updated_at = datetime('now','localtime') WHERE id = OLD.id; END;
  `);

  // ─── List entries ──────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS list_entries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      list_id         INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      date            TEXT    NOT NULL,
      slot_time       TEXT    NOT NULL,
      patient_name    TEXT    NOT NULL,
      patient_id      TEXT,
      patient_uuid    TEXT,
      phone           TEXT,
      notes           TEXT,
      status          TEXT    NOT NULL DEFAULT 'booked'
                      CHECK(status IN ('booked','confirmed','completed','cancelled','no_show')),
      appointment_id  INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
      position        INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_le_list_date    ON list_entries(list_id, date);
    CREATE INDEX IF NOT EXISTS idx_le_date         ON list_entries(date);
    CREATE INDEX IF NOT EXISTS idx_le_patient      ON list_entries(patient_id);
    CREATE INDEX IF NOT EXISTS idx_le_patient_uuid ON list_entries(patient_uuid);
    CREATE INDEX IF NOT EXISTS idx_le_appt         ON list_entries(appointment_id);

    CREATE TRIGGER IF NOT EXISTS trg_list_entries_updated_at
    AFTER UPDATE ON list_entries FOR EACH ROW
    BEGIN
      UPDATE list_entries SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
    END;
  `);

  // ─── List closed days ──────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS list_closed_days (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      date       TEXT    NOT NULL UNIQUE,
      reason     TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_lcd_date ON list_closed_days(date);
  `);

  // ─── (patients table removed — anagrafica centralizzata in Cerus) ────────

  // ─── Services ──────────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      code         TEXT    NOT NULL,
      description  TEXT    NOT NULL,
      type         TEXT    NOT NULL DEFAULT 'prestazione'
                   CHECK(type IN ('visita','terapia','prestazione')),
      duration_min INTEGER NOT NULL DEFAULT 30,
      price        REAL,
      site_id      INTEGER,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at   TEXT,
      UNIQUE(code, site_id)
    );
    CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);
    CREATE INDEX IF NOT EXISTS idx_services_site ON services(site_id);

    CREATE TRIGGER IF NOT EXISTS trg_svc_site_check
    BEFORE INSERT ON services FOR EACH ROW WHEN NEW.site_id IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'site_id non trovato in nodes')
      WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE id = NEW.site_id);
    END;

    CREATE TRIGGER IF NOT EXISTS trg_services_updated_at
    AFTER UPDATE ON services FOR EACH ROW
    BEGIN UPDATE services SET updated_at = datetime('now','localtime') WHERE id = OLD.id; END;
  `);

  // Seed services se tabella vuota
  const svcCount = db.prepare('SELECT COUNT(*) AS cnt FROM services').get().cnt;
  if (svcCount === 0) seedServices();

  // ─── Audit trail ───────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_trail (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT    NOT NULL,
      record_id  INTEGER NOT NULL,
      action     TEXT    NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
      old_data   TEXT,
      new_data   TEXT,
      user_id    TEXT,
      created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_trail(table_name, record_id);
    CREATE INDEX IF NOT EXISTS idx_audit_date  ON audit_trail(created_at);
  `);

  // ─── Transfusion requests ──────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfusion_requests (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      patient_uuid      TEXT,
      reparto           TEXT,
      nosologico        TEXT,
      paziente          TEXT,
      nascita           TEXT,
      sesso             TEXT,
      cf                TEXT,
      peso              REAL,
      diagnosi          TEXT,
      indicazione       TEXT,
      gruppo_sanguigno  TEXT,
      rh                TEXT,
      hb                REAL,
      hct               REAL,
      plt               INTEGER,
      pt_inr            REAL,
      aptt              REAL,
      fibrinogeno       REAL,
      urgenza           TEXT    NOT NULL DEFAULT 'Ordinaria',
      prev_trasfusioni  TEXT,
      reazioni_note     TEXT,
      medico            TEXT,
      data_richiesta    TEXT,
      note              TEXT,
      status            TEXT    NOT NULL DEFAULT 'draft'
                        CHECK(status IN ('draft','completed','cancelled')),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_trasf_appt ON transfusion_requests(appointment_id);
    CREATE INDEX IF NOT EXISTS idx_trasf_pat  ON transfusion_requests(patient_uuid);

    CREATE TRIGGER IF NOT EXISTS trg_trasf_updated_at
    AFTER UPDATE ON transfusion_requests FOR EACH ROW
    BEGIN
      UPDATE transfusion_requests SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
    END;
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS transfusion_emocomponents (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id    INTEGER NOT NULL REFERENCES transfusion_requests(id) ON DELETE CASCADE,
      emo_type      TEXT    NOT NULL,
      units         INTEGER NOT NULL DEFAULT 1,
      irradiato     INTEGER NOT NULL DEFAULT 0,
      filtrato      INTEGER NOT NULL DEFAULT 0,
      lavato        INTEGER NOT NULL DEFAULT 0,
      fenotipizzato INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_temo_req ON transfusion_emocomponents(request_id);
  `);

  // ─── Cleanup: orfani quando una postazione viene eliminata ─────────────────
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS trg_nodes_cascade_appt
    AFTER DELETE ON nodes
    FOR EACH ROW WHEN OLD.type = 'postazione'
    BEGIN
      UPDATE appointments SET room_id = NULL WHERE room_id = OLD.id;
      DELETE FROM day_room_overrides WHERE room_id = OLD.id;
    END;
  `);
}

// ─── Seed: albero di default ──────────────────────────────────────────────────

function seedNodes() {
  const ins = db.prepare(
    'INSERT INTO nodes (parent_id, type, name, station_type, sort_order) VALUES (?,?,?,?,?)'
  );
  const seed = db.transaction(() => {
    const ma      = ins.run(null, 'macroarea', 'USL Toscana Centro', null, 0).lastInsertRowid;
    const aEmpoli = ins.run(ma, 'area', 'Empoli', null, 0).lastInsertRowid;
    const sEmpoli = ins.run(aEmpoli, 'sede', 'Empoli', null, 0).lastInsertRowid;
    const sCastel = ins.run(aEmpoli, 'sede', 'Castelfiorentino', null, 1).lastInsertRowid;
    const fAmb    = ins.run(sEmpoli, 'flusso', 'Ambulatorio', null, 0).lastInsertRowid;
    const fAmbT1  = ins.run(sEmpoli, 'flusso', 'Ambulatorio Terapeutico 1', null, 1).lastInsertRowid;
    const fAmbT2  = ins.run(sEmpoli, 'flusso', 'Ambulatorio Terapeutico 2', null, 2).lastInsertRowid;
    const fDH     = ins.run(sEmpoli, 'flusso', 'Day Hospital', null, 3).lastInsertRowid;
    const fAmbC   = ins.run(sCastel, 'flusso', 'Ambulatorio', null, 0).lastInsertRowid;
    ins.run(fAmb,   'postazione', 'Ambulatorio 1', 'ambulatorio', 0);
    ins.run(fAmb,   'postazione', 'Ambulatorio 2', 'ambulatorio', 1);
    ins.run(fAmbT1, 'postazione', 'Poltrona 1', 'poltrona', 0);
    ins.run(fAmbT1, 'postazione', 'Poltrona 2', 'poltrona', 1);
    ins.run(fAmbT1, 'postazione', 'Poltrona 3', 'poltrona', 2);
    ins.run(fAmbT2, 'postazione', 'Letto 1', 'letto', 0);
    ins.run(fAmbT2, 'postazione', 'Letto 2', 'letto', 1);
    ins.run(fDH,    'postazione', 'Letto DH 1', 'letto', 0);
    ins.run(fDH,    'postazione', 'Letto DH 2', 'letto', 1);
    ins.run(fDH,    'postazione', 'Letto DH 3', 'letto', 2);
    ins.run(fAmbC,  'postazione', 'Ambulatorio 1', 'ambulatorio', 0);
  });
  seed();
}

// ─── Seed: prestazioni di default ─────────────────────────────────────────────

function seedServices() {
  const ins = db.prepare(
    'INSERT INTO services (code, description, type, duration_min, site_id, sort_order) VALUES (?,?,?,?,?,?)'
  );
  const seed = db.transaction(() => {
    ins.run('89.7',    'Visita generale',            'visita',      30, null, 0);
    ins.run('89.01',   'Anamnesi e valutazione',     'visita',      20, null, 1);
    ins.run('89.13',   'Visita neurologica',         'visita',      30, null, 2);
    ins.run('89.26',   'Visita ginecologica',        'visita',      30, null, 3);
    ins.run('89.52',   'Elettrocardiogramma',        'prestazione', 15, null, 4);
    ins.run('88.71.4', 'Ecografia addome completo',  'prestazione', 30, null, 5);
    ins.run('88.72.3', 'Ecotiroidea',                'prestazione', 20, null, 6);
    ins.run('88.73.5', 'Ecocardiogramma',            'prestazione', 30, null, 7);
    ins.run('90.43.2', 'Emocromo completo',          'prestazione', 10, null, 8);
    ins.run('93.11.3', 'Rieducazione motoria',       'terapia',     45, null, 9);
    ins.run('93.39.1', 'Elettroterapia antalgica',   'terapia',     30, null, 10);
    ins.run('99.25',   'Iniezione endovenosa',       'terapia',     15, null, 11);
  });
  seed();
}

module.exports = { initAgendaDb, getAgendaDb, AGENDA_DB_PATH: DB_PATH };
