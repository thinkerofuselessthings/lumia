#!/usr/bin/env node
/**
 * tools/migrate-cerus-not-null.js — V3.M4.A1 Fase A4 (schema lock)
 *
 * Applica il vincolo `patient_uuid TEXT NOT NULL` alle tabelle agenda, e
 * rimuove il vincolo `NOT NULL` dai campi legacy (`patient_name`/`patient_id`/
 * `phone`/`birth_date`/…). Le colonne legacy restano presenti per compatibilità
 * (verranno droppate in A5).
 *
 * Tecnica: SQLite non supporta `ALTER COLUMN`. Si usa il table-swap pattern:
 *   1. CREATE TABLE <tbl>_new (... con nuovi vincoli ...)
 *   2. INSERT INTO <tbl>_new SELECT ... FROM <tbl>
 *   3. DROP TABLE <tbl>
 *   4. ALTER TABLE <tbl>_new RENAME TO <tbl>
 *   5. ricrea indici + trigger
 * Tutto in un'unica transazione.
 *
 * Pre-requisiti:
 *   1. Backup recente: `npm run backup`
 *   2. Tutte le righe devono avere patient_uuid valorizzato — verificato al
 *      boot; se fallisce rimanda a `node tools/backfill-cerus-uuid.js`.
 *
 * Uso:
 *   node tools/migrate-cerus-not-null.js --dry-run    # solo controllo
 *   node tools/migrate-cerus-not-null.js              # esegue la migrazione
 */

'use strict';

const path = require('path');
const fs = require('fs');

const { loadEnv, env } = require('../src/config/env');
loadEnv();

const { initSqlite, Database } = require('../src/lib/sqlite-wrapper');

const DRY_RUN = process.argv.includes('--dry-run');

// Tabelle e mapping delle colonne (stessa struttura del rebuild + indici/trigger).
const MIGRATIONS = [
  {
    name: 'appointments',
    // DDL della tabella ricostruita. Note:
    //   - patient_uuid TEXT NOT NULL (vincolo nuovo)
    //   - patient_name NOT NULL rimosso (ora opzionale, derivato da Cerus)
    //   - altri vincoli preservati
    newDDL: `
      CREATE TABLE appointments_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_name     TEXT,
        patient_id       TEXT,
        patient_uuid     TEXT    NOT NULL,
        phone            TEXT,
        birth_date       TEXT,
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
        created_by       INTEGER,
        updated_by       INTEGER,
        created_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at       TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
    // colonne copiate (stesso nome in vecchia e nuova). Ordine: nuova → vecchia.
    copyCols: [
      'id', 'patient_name', 'patient_id', 'patient_uuid', 'phone', 'birth_date',
      'doctor', 'room_id', 'type', 'title', 'description', 'prestazione_code',
      'date', 'start_time', 'end_time', 'duration_min', 'position', 'status',
      'color', 'notes', 'created_by', 'updated_by', 'created_at', 'updated_at'
    ],
    postSQL: [
      `CREATE INDEX idx_appt_date         ON appointments(date)`,
      `CREATE INDEX idx_appt_date_time    ON appointments(date, start_time)`,
      `CREATE INDEX idx_appt_patient      ON appointments(patient_id)`,
      `CREATE INDEX idx_appt_patient_uuid ON appointments(patient_uuid)`,
      `CREATE INDEX idx_appt_status       ON appointments(status)`,
      `CREATE INDEX idx_appt_type         ON appointments(type)`,
      `CREATE INDEX idx_appt_room         ON appointments(room_id)`,
      `CREATE TRIGGER trg_appointments_updated_at
       AFTER UPDATE ON appointments FOR EACH ROW
       BEGIN
         UPDATE appointments SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
       END`,
      `CREATE TRIGGER trg_appt_room_check
       BEFORE INSERT ON appointments
       FOR EACH ROW WHEN NEW.room_id IS NOT NULL
       BEGIN
         SELECT RAISE(ABORT, 'room_id non trovato in nodes')
         WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE id = NEW.room_id AND type = 'postazione');
       END`,
      `CREATE TRIGGER trg_appt_room_check_upd
       BEFORE UPDATE OF room_id ON appointments
       FOR EACH ROW WHEN NEW.room_id IS NOT NULL
       BEGIN
         SELECT RAISE(ABORT, 'room_id non trovato in nodes')
         WHERE NOT EXISTS (SELECT 1 FROM nodes WHERE id = NEW.room_id AND type = 'postazione');
       END`
    ]
  },
  {
    name: 'list_entries',
    newDDL: `
      CREATE TABLE list_entries_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id         INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        date            TEXT    NOT NULL,
        slot_time       TEXT    NOT NULL,
        patient_name    TEXT,
        patient_id      TEXT,
        patient_uuid    TEXT    NOT NULL,
        phone           TEXT,
        birth_date      TEXT,
        notes           TEXT,
        status          TEXT    NOT NULL DEFAULT 'booked'
                        CHECK(status IN ('booked','confirmed','completed','cancelled','no_show')),
        appointment_id  INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
        position        INTEGER NOT NULL DEFAULT 0,
        created_by      INTEGER,
        updated_by      INTEGER,
        created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
        updated_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
      )`,
    copyCols: [
      'id', 'list_id', 'date', 'slot_time', 'patient_name', 'patient_id',
      'patient_uuid', 'phone', 'birth_date', 'notes', 'status', 'appointment_id',
      'position', 'created_by', 'updated_by', 'created_at', 'updated_at'
    ],
    postSQL: [
      `CREATE INDEX idx_le_list_date    ON list_entries(list_id, date)`,
      `CREATE INDEX idx_le_date         ON list_entries(date)`,
      `CREATE INDEX idx_le_patient      ON list_entries(patient_id)`,
      `CREATE INDEX idx_le_patient_uuid ON list_entries(patient_uuid)`,
      `CREATE INDEX idx_le_appt         ON list_entries(appointment_id)`,
      `CREATE TRIGGER trg_list_entries_updated_at
       AFTER UPDATE ON list_entries FOR EACH ROW
       BEGIN
         UPDATE list_entries SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
       END`
    ]
  },
  {
    name: 'transfusion_requests',
    newDDL: `
      CREATE TABLE transfusion_requests_new (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        appointment_id    INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        patient_uuid      TEXT    NOT NULL,
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
      )`,
    copyCols: [
      'id', 'appointment_id', 'patient_uuid', 'reparto', 'nosologico', 'paziente',
      'nascita', 'sesso', 'cf', 'peso', 'diagnosi', 'indicazione',
      'gruppo_sanguigno', 'rh', 'hb', 'hct', 'plt', 'pt_inr', 'aptt', 'fibrinogeno',
      'urgenza', 'prev_trasfusioni', 'reazioni_note', 'medico', 'data_richiesta',
      'note', 'status', 'created_at', 'updated_at'
    ],
    postSQL: [
      `CREATE INDEX idx_trasf_appt ON transfusion_requests(appointment_id)`,
      `CREATE INDEX idx_trasf_pat  ON transfusion_requests(patient_uuid)`,
      `CREATE TRIGGER trg_trasf_updated_at
       AFTER UPDATE ON transfusion_requests FOR EACH ROW
       BEGIN
         UPDATE transfusion_requests SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
       END`
    ]
  }
];

function resolveAgendaPath() {
  const e = env('AGENDA_DB_PATH');
  if (e) return path.isAbsolute(e) ? e : path.resolve(process.cwd(), e);
  return path.resolve(process.cwd(), 'data', 'agenda.db');
}

/**
 * isAlreadyNotNull(db, table) — controlla lo schema corrente della colonna
 * `patient_uuid`: se è già NOT NULL, la migrazione è idempotente.
 */
function isAlreadyNotNull(db, table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const pu = cols.find((c) => c.name === 'patient_uuid');
  if (!pu) return false; // colonna non esiste → skip
  return pu.notnull === 1;
}

function countNullUuids(db, table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.length) return 0;
  return db.prepare(
    `SELECT COUNT(*) AS cnt FROM ${table} WHERE patient_uuid IS NULL OR patient_uuid = ''`
  ).get().cnt;
}

function backupDb(dbPath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bkp = dbPath + '.pre-cerus-not-null.' + ts + '.bak';
  fs.copyFileSync(dbPath, bkp);
  return bkp;
}

function rebuildTable(db, migration) {
  const cols = migration.copyCols.join(', ');

  db.exec(migration.newDDL);
  db.exec(`INSERT INTO ${migration.name}_new (${cols}) SELECT ${cols} FROM ${migration.name}`);
  db.exec(`DROP TABLE ${migration.name}`);
  db.exec(`ALTER TABLE ${migration.name}_new RENAME TO ${migration.name}`);
  for (const sql of migration.postSQL) {
    db.exec(sql);
  }
}

(async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(' tools/migrate-cerus-not-null.js — V3.M4.A1 Fase A4');
  console.log(` modalità: ${DRY_RUN ? 'DRY-RUN (nessuna scrittura)' : 'REALE'}`);
  console.log('────────────────────────────────────────────────────────────');

  await initSqlite();
  const dbPath = resolveAgendaPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`[migrate] agenda.db non trovato in ${dbPath}`);
    process.exit(2);
  }
  const db = new Database(dbPath);

  // 1. Preflight — ogni tabella: stato + righe orfane
  const preflight = [];
  for (const m of MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${m.name})`).all();
    if (!cols.length) { preflight.push({ table: m.name, skip: 'table missing' }); continue; }
    const alreadyOk = isAlreadyNotNull(db, m.name);
    const nullCount = countNullUuids(db, m.name);
    preflight.push({ table: m.name, alreadyNotNull: alreadyOk, nullRows: nullCount });
  }
  console.log('\n Preflight:');
  for (const p of preflight) {
    if (p.skip) {
      console.log(`   ${p.table}: skip (${p.skip})`);
    } else {
      console.log(`   ${p.table}: already_not_null=${p.alreadyNotNull}, null_rows=${p.nullRows}`);
    }
  }

  const blockers = preflight.filter((p) => !p.skip && !p.alreadyNotNull && p.nullRows > 0);
  if (blockers.length) {
    console.error('\n⛔ Migrazione BLOCCATA: sono presenti righe con patient_uuid NULL.');
    console.error('   Eseguire prima: node tools/backfill-cerus-uuid.js');
    console.error('   Tabelle affette:', blockers.map((b) => `${b.table}(${b.nullRows})`).join(', '));
    process.exit(3);
  }

  const todo = preflight.filter((p) => !p.skip && !p.alreadyNotNull);
  if (!todo.length) {
    console.log('\n✓ Tutte le tabelle sono già migrate. Nothing to do.');
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log('\n(DRY-RUN) Sarebbero ricostruite:', todo.map((p) => p.table).join(', '));
    process.exit(0);
  }

  // 2. Backup
  console.log('\n Backup pre-migrazione…');
  const bkp = backupDb(dbPath);
  console.log('   ✓ backup creato:', bkp);

  // 3. Rebuild in unica transazione
  console.log('\n Migrazione…');
  // Trigger esterni che referenziano `appointments` vanno droppati prima del
  // rebuild (SQLite valida i corpi dei trigger anche durante DROP TABLE) e
  // ricreati al termine.
  const EXTERNAL_TRIGGERS = [
    {
      name: 'trg_nodes_cascade_appt',
      sql: `CREATE TRIGGER trg_nodes_cascade_appt
            AFTER DELETE ON nodes
            FOR EACH ROW WHEN OLD.type = 'postazione'
            BEGIN
              UPDATE appointments SET room_id = NULL WHERE room_id = OLD.id;
              DELETE FROM day_room_overrides WHERE room_id = OLD.id;
            END`
    }
  ];
  try {
    db.exec('BEGIN');
    for (const trg of EXTERNAL_TRIGGERS) {
      db.exec(`DROP TRIGGER IF EXISTS ${trg.name}`);
    }
    for (const p of todo) {
      const m = MIGRATIONS.find((x) => x.name === p.table);
      console.log(`   - rebuild ${p.table}…`);
      rebuildTable(db, m);
      console.log(`     ✓ ${p.table} ricostruita`);
    }
    for (const trg of EXTERNAL_TRIGGERS) {
      db.exec(trg.sql);
    }
    db.exec('COMMIT');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (_) {}
    console.error('\n✗ Migrazione fallita, rollback applicato.');
    console.error('   Errore:', err.message);
    console.error('   Backup disponibile in:', bkp);
    try { db.close(); } catch (_) {}
    process.exit(1);
  }

  try { db.close(); } catch (_) {}

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(' ✓ Migrazione completata.');
  console.log(' patient_uuid è ora NOT NULL in:', todo.map((p) => p.table).join(', '));
  console.log(' patient_name/patient_id/phone/birth_date sono ora OPZIONALI.');
  console.log(' Backup disponibile:', bkp);
  console.log('────────────────────────────────────────────────────────────');
  process.exit(0);
})().catch((err) => {
  console.error('[migrate] errore inatteso:', err);
  process.exit(1);
});
