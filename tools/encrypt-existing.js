#!/usr/bin/env node
/**
 * tools/encrypt-existing.js — Migrazione one-shot di righe legacy in chiaro
 * verso il formato cifrato `enc:v1:` (V3.M4.A9, field-level encryption).
 *
 * Cosa fa:
 * - per ogni tabella/campo nella mappa qui sotto, scansiona le righe in chiaro
 *   (cioè senza prefisso `enc:v1:`) e le riscrive cifrate con la chiave corrente.
 * - operazione idempotente: una riga già cifrata viene saltata.
 * - opera in transazione per ciascuna tabella; in caso di errore fa rollback.
 *
 * Uso:
 *   LUMIA_ENCRYPTION_KEY=<hex/base64> node tools/encrypt-existing.js
 *   LUMIA_ENCRYPTION_KEY=... node tools/encrypt-existing.js --dry-run
 *
 * IMPORTANTE: fare un backup PRIMA (`npm run backup`).
 */

'use strict';

const path = require('path');
const { loadEnv, env } = require('../src/config/env');
loadEnv();

const { initSqlite, Database } = require('../src/lib/sqlite-wrapper');
const fc = require('../src/lib/field-crypto');

const DRY_RUN = process.argv.includes('--dry-run');

const TARGETS = [
  // { dbKind: 'lumia'|'agenda', table, columns: [...], pkey: 'id' }
  { dbKind: 'lumia',  table: 'utenti',        columns: ['email'], pkey: 'id' },
  { dbKind: 'lumia',  table: 'audit_log',     columns: ['before_data', 'after_data'], pkey: 'id' },
  { dbKind: 'agenda', table: 'appointments',  columns: ['patient_name', 'phone', 'birth_date', 'notes', 'description'], pkey: 'id' },
  { dbKind: 'agenda', table: 'list_entries',  columns: ['patient_name', 'phone', 'birth_date', 'notes'], pkey: 'id' },
];

function resolveDbPath(kind) {
  if (kind === 'lumia') return path.resolve(process.cwd(), env('DB_PATH', 'data/lumia.db'));
  if (kind === 'agenda') {
    const e = env('AGENDA_DB_PATH');
    return e
      ? (path.isAbsolute(e) ? e : path.resolve(process.cwd(), e))
      : path.resolve(process.cwd(), 'data', 'agenda.db');
  }
  throw new Error('unknown dbKind: ' + kind);
}

(async () => {
  await initSqlite();

  if (!fc.isAvailable()) {
    console.error('[encrypt-existing] LUMIA_ENCRYPTION_KEY o LUMIA_ENCRYPTION_PASSPHRASE non impostate. Aborto.');
    process.exit(2);
  }

  const dbCache = {};
  function getDb(kind) {
    if (!dbCache[kind]) dbCache[kind] = new Database(resolveDbPath(kind));
    return dbCache[kind];
  }

  const summary = [];

  for (const t of TARGETS) {
    const db = getDb(t.dbKind);
    // Verifica esistenza tabella e colonne
    const tinfo = db.prepare(`PRAGMA table_info(${t.table})`).all();
    if (!tinfo.length) {
      summary.push({ ...t, status: 'skip', reason: 'table missing' });
      continue;
    }
    const colset = new Set(tinfo.map((c) => c.name));
    const cols = t.columns.filter((c) => colset.has(c));
    if (!cols.length) {
      summary.push({ ...t, status: 'skip', reason: 'no target columns' });
      continue;
    }

    const selSql = `SELECT ${t.pkey}, ${cols.join(', ')} FROM ${t.table}`;
    const rows = db.prepare(selSql).all();

    let scanned = 0, encrypted = 0, alreadyEncrypted = 0, skippedNull = 0;
    const updates = [];
    for (const row of rows) {
      scanned++;
      const updates_for_row = {};
      for (const c of cols) {
        const v = row[c];
        if (v === null || v === undefined || v === '') { skippedNull++; continue; }
        if (typeof v !== 'string') { skippedNull++; continue; }
        if (fc.isEncrypted(v)) { alreadyEncrypted++; continue; }
        updates_for_row[c] = fc.encField(v);
        encrypted++;
      }
      if (Object.keys(updates_for_row).length) {
        updates.push({ id: row[t.pkey], set: updates_for_row });
      }
    }

    if (!DRY_RUN && updates.length) {
      const tx = db.transaction((batch) => {
        for (const u of batch) {
          const sets = Object.keys(u.set).map((c) => `${c} = ?`).join(', ');
          const vals = Object.values(u.set);
          db.prepare(`UPDATE ${t.table} SET ${sets} WHERE ${t.pkey} = ?`).run(...vals, u.id);
        }
      });
      tx(updates);
    }

    summary.push({
      table: `${t.dbKind}.${t.table}`,
      columns: cols,
      scanned,
      encrypted,
      already_encrypted: alreadyEncrypted,
      skipped_null_or_nontext: skippedNull,
      rows_updated: DRY_RUN ? 0 : updates.length,
      dry_run: DRY_RUN,
    });
  }

  // Forza il flush dei DB (sql.js: writeFileSync esplicito)
  for (const k of Object.keys(dbCache)) { try { dbCache[k].close(); } catch {} }

  console.log(JSON.stringify({ ts: new Date().toISOString(), dry_run: DRY_RUN, summary }, null, 2));
})().catch((err) => {
  console.error(JSON.stringify({ level: 'error', msg: 'encrypt-existing.failed', err: err.message, stack: err.stack }));
  process.exit(1);
});
