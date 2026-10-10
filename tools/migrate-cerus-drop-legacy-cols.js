#!/usr/bin/env node
/**
 * tools/migrate-cerus-drop-legacy-cols.js — V3.M4.A1 Fase A5.b
 *
 * Droppa le colonne anagrafiche legacy dalle tabelle agenda. Da eseguire
 * SOLO DOPO che:
 *   1. Fase A4.a è stata eseguita (patient_uuid è NOT NULL)
 *   2. UI non legge più i campi legacy nei payload (A4.b)
 *   3. **I model server-side sono stati refactored** per non scrivere più
 *      patient_name/patient_id/phone/birth_date in INSERT/UPDATE
 *
 * ⚠ ATTENZIONE: il punto (3) NON è ancora stato implementato al momento di
 * scrittura di questo tool. I file
 *   - app/agenda/models/appointment.js
 *   - app/agenda/models/list-entry.js
 * referenziano ancora le colonne legacy nelle prepared statement. Eseguire
 * questo tool senza prima refactorare i model causerà errori SQL su tutte
 * le INSERT/UPDATE.
 *
 * Per questa ragione il tool richiede il flag esplicito `--i-confirm` per
 * procedere, oltre ai consueti `--dry-run`.
 *
 * Tecnica: stesso table-swap pattern di migrate-cerus-not-null.js.
 *
 * Colonne droppate:
 *   appointments       : patient_name, patient_id, phone, birth_date
 *   list_entries       : patient_name, patient_id, phone, birth_date
 *   transfusion_requests: NESSUNA (i campi paziente, cf, nascita, sesso restano
 *                         per compatibilità con il modulo trasfusione legacy;
 *                         saranno valutati in una fase successiva)
 *
 * Uso:
 *   node tools/migrate-cerus-drop-legacy-cols.js --dry-run
 *   node tools/migrate-cerus-drop-legacy-cols.js --i-confirm
 *
 * Exit code:
 *   0 ok
 *   1 errore (rollback applicato)
 *   2 db non trovato
 *   3 preflight: patient_uuid non è NOT NULL (eseguire prima A4.a)
 *   4 manca --i-confirm
 */

'use strict';

const path = require('path');
const fs = require('fs');

const { loadEnv, env } = require('../src/config/env');
loadEnv();

const { initSqlite, Database } = require('../src/lib/sqlite-wrapper');

const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--i-confirm');

const MIGRATIONS = [
  {
    name: 'appointments',
    newDDL: `
      CREATE TABLE appointments_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_uuid     TEXT    NOT NULL,
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
    copyCols: [
      'id', 'patient_uuid', 'doctor', 'room_id', 'type', 'title', 'description',
      'prestazione_code', 'date', 'start_time', 'end_time', 'duration_min', 'position',
      'status', 'color', 'notes', 'created_by', 'updated_by', 'created_at', 'updated_at'
    ],
    postSQL: [
      `CREATE INDEX idx_appt_date         ON appointments(date)`,
      `CREATE INDEX idx_appt_date_time    ON appointments(date, start_time)`,
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
    ],
    dropped: ['patient_name', 'patient_id', 'phone', 'birth_date']
  },
  {
    name: 'list_entries',
    newDDL: `
      CREATE TABLE list_entries_new (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        list_id         INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        date            TEXT    NOT NULL,
        slot_time       TEXT    NOT NULL,
        patient_uuid    TEXT    NOT NULL,
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
      'id', 'list_id', 'date', 'slot_time', 'patient_uuid', 'notes', 'status',
      'appointment_id', 'position', 'created_by', 'updated_by', 'created_at', 'updated_at'
    ],
    postSQL: [
      `CREATE INDEX idx_le_list_date    ON list_entries(list_id, date)`,
      `CREATE INDEX idx_le_date         ON list_entries(date)`,
      `CREATE INDEX idx_le_patient_uuid ON list_entries(patient_uuid)`,
      `CREATE INDEX idx_le_appt         ON list_entries(appointment_id)`,
      `CREATE TRIGGER trg_list_entries_updated_at
       AFTER UPDATE ON list_entries FOR EACH ROW
       BEGIN
         UPDATE list_entries SET updated_at = datetime('now','localtime') WHERE id = OLD.id;
       END`
    ],
    dropped: ['patient_name', 'patient_id', 'phone', 'birth_date']
  }
];

function resolveAgendaPath() {
  const e = env('AGENDA_DB_PATH');
  if (e) return path.isAbsolute(e) ? e : path.resolve(process.cwd(), e);
  return path.resolve(process.cwd(), 'data', 'agenda.db');
}

function isPatientUuidNotNull(db, table) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const pu = cols.find((c) => c.name === 'patient_uuid');
  if (!pu) return false;
  return pu.notnull === 1;
}

function hasLegacyCols(db, table, dropped) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const names = new Set(cols.map((c) => c.name));
  return dropped.filter((c) => names.has(c));
}

function backupDb(dbPath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const bkp = dbPath + '.pre-cerus-drop-legacy.' + ts + '.bak';
  fs.copyFileSync(dbPath, bkp);
  return bkp;
}

function rebuildTable(db, migration) {
  const cols = migration.copyCols.join(', ');
  db.exec(migration.newDDL);
  db.exec(`INSERT INTO ${migration.name}_new (${cols}) SELECT ${cols} FROM ${migration.name}`);
  db.exec(`DROP TABLE ${migration.name}`);
  db.exec(`ALTER TABLE ${migration.name}_new RENAME TO ${migration.name}`);
  for (const sql of migration.postSQL) db.exec(sql);
}

(async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(' tools/migrate-cerus-drop-legacy-cols.js — V3.M4.A1 Fase A5.b');
  console.log(` modalità: ${DRY_RUN ? 'DRY-RUN' : (CONFIRM ? 'REALE (--i-confirm)' : 'BLOCCATA')}`);
  console.log('────────────────────────────────────────────────────────────');

  if (!DRY_RUN && !CONFIRM) {
    console.error('\n⛔ Manca --i-confirm.');
    console.error('   Questo tool droppa colonne legacy. Prima di eseguirlo:');
    console.error('   1. verificare che A4.a sia stata applicata (patient_uuid NOT NULL);');
    console.error('   2. verificare che app/agenda/models/{appointment,list-entry}.js NON');
    console.error('      referenzino più patient_name/patient_id/phone/birth_date;');
    console.error('   3. verificare che la UI consumi i dati paziente solo da .patient enrich.');
    console.error('   Poi: node tools/migrate-cerus-drop-legacy-cols.js --i-confirm');
    console.error('   Per ispezione preventiva: --dry-run');
    process.exit(4);
  }

  await initSqlite();
  const dbPath = resolveAgendaPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`[migrate] agenda.db non trovato in ${dbPath}`);
    process.exit(2);
  }
  const db = new Database(dbPath);

  // Preflight
  console.log('\n Preflight:');
  const todo = [];
  let blocked = false;
  for (const m of MIGRATIONS) {
    const cols = db.prepare(`PRAGMA table_info(${m.name})`).all();
    if (!cols.length) { console.log(`   ${m.name}: skip (table missing)`); continue; }
    const uuidNotNull = isPatientUuidNotNull(db, m.name);
    const legacy = hasLegacyCols(db, m.name, m.dropped);
    if (!uuidNotNull) {
      console.log(`   ${m.name}: ⛔ patient_uuid NON è NOT NULL (eseguire A4.a)`);
      blocked = true;
      continue;
    }
    if (!legacy.length) {
      console.log(`   ${m.name}: ✓ già migrata (nessuna colonna legacy)`);
      continue;
    }
    console.log(`   ${m.name}: legacy cols presenti = [${legacy.join(', ')}]`);
    todo.push(m);
  }

  if (blocked) {
    console.error('\n⛔ Migrazione BLOCCATA: alcune tabelle non hanno patient_uuid NOT NULL.');
    process.exit(3);
  }
  if (!todo.length) {
    console.log('\n✓ Nothing to do.');
    process.exit(0);
  }
  if (DRY_RUN) {
    console.log('\n(DRY-RUN) Sarebbero ricostruite:', todo.map((m) => m.name).join(', '));
    process.exit(0);
  }

  console.log('\n Backup pre-migrazione…');
  const bkp = backupDb(dbPath);
  console.log('   ✓ backup creato:', bkp);

  console.log('\n Migrazione…');
  // Trigger esterni che referenziano `appointments` (nodes cascade) — vanno droppati e ricreati.
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
    for (const trg of EXTERNAL_TRIGGERS) db.exec(`DROP TRIGGER IF EXISTS ${trg.name}`);
    for (const m of todo) {
      console.log(`   - rebuild ${m.name} (drop ${m.dropped.join(', ')})…`);
      rebuildTable(db, m);
      console.log(`     ✓ ${m.name} ricostruita`);
    }
    for (const trg of EXTERNAL_TRIGGERS) db.exec(trg.sql);
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
  console.log(' Colonne legacy droppate da:', todo.map((m) => m.name).join(', '));
  console.log(' Backup disponibile:', bkp);
  console.log('────────────────────────────────────────────────────────────');
  process.exit(0);
})().catch((err) => {
  console.error('[migrate] errore inatteso:', err);
  process.exit(1);
});
