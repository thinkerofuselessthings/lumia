#!/usr/bin/env node
/**
 * tools/backup.js — Backup snapshot dei DB LUMIA.
 *
 * Strategia:
 * - Carica .env per usare DB_PATH/AGENDA_DB_PATH.
 * - Copia binaria di ogni file .db in `data/backups/<basename>-YYYYMMDD-HHmm.db.gz`.
 * - Verifica integrità: riapre la copia gunzippata con sql.js e fa `PRAGMA integrity_check`.
 * - Rotazione: tiene gli ultimi N file per ciascun DB (env BACKUP_KEEP, default 30).
 *
 * Uso:
 *   node tools/backup.js
 *   BACKUP_DIR=/var/backups/lumia BACKUP_KEEP=60 node tools/backup.js
 *
 * Nota: poiché sql.js usa un debounce di 500ms su `_save()`, è prudente eseguire
 * questo script quando il server NON sta scrivendo intensamente (cron notturno).
 * Per snapshot a caldo perfetti servirebbe SQLCipher/better-sqlite3 con backup API.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');

const { loadEnv, env } = require('../src/config/env');
loadEnv();

const { initSqlite, Database } = require('../src/lib/sqlite-wrapper');

function ts() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function resolveDbPaths() {
  const main = path.resolve(process.cwd(), env('DB_PATH', 'data/lumia.db'));
  const agendaEnv = env('AGENDA_DB_PATH');
  const agenda = agendaEnv
    ? (path.isAbsolute(agendaEnv) ? agendaEnv : path.resolve(process.cwd(), agendaEnv))
    : path.resolve(process.cwd(), 'data', 'agenda.db');
  return [
    { label: 'lumia', src: main },
    { label: 'agenda', src: agenda },
  ];
}

async function gzipFile(src, dst) {
  await pipeline(createReadStream(src), zlib.createGzip({ level: 9 }), createWriteStream(dst));
}

async function gunzipToTemp(gzPath) {
  const tmp = gzPath.replace(/\.gz$/, '.verify');
  await pipeline(createReadStream(gzPath), zlib.createGunzip(), createWriteStream(tmp));
  return tmp;
}

async function verify(gzPath) {
  const tmp = await gunzipToTemp(gzPath);
  try {
    const db = new Database(tmp);
    const r = db.prepare('PRAGMA integrity_check').get();
    db.close();
    const ok = r && (r.integrity_check === 'ok' || r['integrity_check'] === 'ok');
    if (!ok) throw new Error('integrity_check failed: ' + JSON.stringify(r));
  } finally {
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function rotate(dir, label, keep) {
  const prefix = `${label}-`;
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.db.gz'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const toDelete = files.slice(keep);
  for (const { f } of toDelete) {
    try { fs.unlinkSync(path.join(dir, f)); } catch {}
  }
  return { kept: Math.min(files.length, keep), deleted: toDelete.length };
}

(async () => {
  await initSqlite();

  const backupDir = env('BACKUP_DIR') || path.resolve(process.cwd(), 'data', 'backups');
  const keep = parseInt(env('BACKUP_KEEP', 30), 10) || 30;
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const stamp = ts();
  const summary = [];

  for (const { label, src } of resolveDbPaths()) {
    if (!fs.existsSync(src)) {
      summary.push({ label, src, status: 'skipped', reason: 'source missing' });
      continue;
    }
    const dst = path.join(backupDir, `${label}-${stamp}.db.gz`);
    await gzipFile(src, dst);
    await verify(dst);
    const { kept, deleted } = rotate(backupDir, label, keep);
    const size = fs.statSync(dst).size;
    summary.push({ label, src, dst, size_bytes: size, kept, deleted, status: 'ok' });
  }

  console.log(JSON.stringify({ ts: new Date().toISOString(), backupDir, keep, results: summary }, null, 2));
})().catch((err) => {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: 'error', msg: 'backup.failed', err: err.message, stack: err.stack }));
  process.exit(1);
});
