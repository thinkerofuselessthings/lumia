#!/usr/bin/env node
/**
 * tools/backfill-cerus-uuid.js — V3.M4.A1.A0 (Fase A0 della migrazione Cerus)
 *
 * Riconcilia righe legacy di agenda.db che non hanno `patient_uuid` valorizzato,
 * cercando il paziente in Cerus tramite codice fiscale (CF). Aggiorna le righe
 * 1-to-1 (un solo match in Cerus); per le altre produce un report CSV destinato
 * all'operatore clinico.
 *
 * Tabelle coinvolte (agenda.db):
 *   - appointments         (CF in `patient_id`)
 *   - list_entries         (CF in `patient_id`)
 *   - transfusion_requests (CF in `cf`)
 *
 * Uso:
 *   node tools/backfill-cerus-uuid.js              # esecuzione reale (UPDATE)
 *   node tools/backfill-cerus-uuid.js --dry-run    # solo report, no UPDATE
 *   node tools/backfill-cerus-uuid.js --table=appointments
 *
 * Output:
 *   tools/backfill-report.csv   colonne: table, id, patient_name, patient_id, motivo
 *
 * Esiti per riga:
 *   MATCH        → 1 risultato in Cerus, UPDATE eseguito (o simulato in dry-run)
 *   ORFANA_NO_CF → la riga non ha CF: impossibile cercare in Cerus
 *   ORFANA_404   → CF presente ma 0 risultati in Cerus
 *   AMBIGUITA    → CF presente ma >1 risultati in Cerus
 *   ERRORE_API   → Cerus offline / 5xx / timeout
 *
 * Pre-requisiti:
 *   - Cerus configurato (CERUS_BASE_URL/CERUS_USER_ID/CERUS_USER_KEY o lumia.config.json)
 *   - LUMIA_ENCRYPTION_KEY impostata se i dati patient_name/phone sono cifrati
 *   - Backup recente: `npm run backup`
 *
 * NB: lo script è idempotente — saltare le righe con patient_uuid già valorizzato.
 */

'use strict';

const path = require('path');
const fs = require('fs');

const { loadEnv } = require('../src/config/env');
loadEnv();

const { initSqlite } = require('../src/lib/sqlite-wrapper');
const { initDatabase } = require('../src/db/connection');
const { initAgendaDb, getAgendaDb } = require('../app/agenda/db');
const { client: cerus } = require('../src/integrations/cerus');
const { safeDecField } = require('../src/lib/field-crypto');

/* ── CLI args ─────────────────────────────────────────────────────────── */
const DRY_RUN = process.argv.includes('--dry-run');
const ASSIGN_UNKNOWN = process.argv.includes('--assign-unknown');
const TABLE_ARG = (process.argv.find((a) => a.startsWith('--table=')) || '').split('=')[1] || null;

// Placeholder UUID per righe legacy non riconciliabili (vedi docs/v3/cerus/04 §9).
// resolver.resolve() su questo valore restituisce il placeholder "Paziente sconosciuto".
const UNKNOWN_UUID = '__legacy_unknown__';

const TABLES = [
  { name: 'appointments',         cfCol: 'patient_id' },
  { name: 'list_entries',         cfCol: 'patient_id' },
  { name: 'transfusion_requests', cfCol: 'cf' }
];

/* ── Report CSV ───────────────────────────────────────────────────────── */
const REPORT_PATH = path.resolve(__dirname, 'backfill-report.csv');
const reportRows = [];

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function pushReport(table, id, patientName, cf, motivo, extra) {
  reportRows.push({
    table,
    id,
    patient_name: patientName || '',
    patient_id: cf || '',
    motivo,
    extra: extra || ''
  });
}

function writeReport() {
  const header = 'table,id,patient_name,patient_id,motivo,extra\n';
  const body = reportRows.map((r) =>
    [r.table, r.id, r.patient_name, r.patient_id, r.motivo, r.extra].map(csvEscape).join(',')
  ).join('\n');
  fs.writeFileSync(REPORT_PATH, header + body + (body ? '\n' : ''), 'utf-8');
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function dec(v) {
  if (v == null) return null;
  try { return safeDecField(String(v)); } catch (_) { return String(v); }
}

function normalizeCf(s) {
  if (!s) return null;
  const t = String(s).trim().toUpperCase();
  return t.length >= 6 ? t : null;
}

/* ── Core: per-tabella ────────────────────────────────────────────────── */
async function processTable(db, def, stats) {
  // Verifica esistenza tabella + colonne
  const cols = db.prepare(`PRAGMA table_info(${def.name})`).all();
  if (!cols.length) {
    console.log(`[${def.name}] tabella assente, skip`);
    return;
  }
  const colset = new Set(cols.map((c) => c.name));
  if (!colset.has('patient_uuid')) {
    console.log(`[${def.name}] colonna patient_uuid assente, skip`);
    return;
  }
  const hasCf = colset.has(def.cfCol);
  const hasName = colset.has('patient_name') || colset.has('paziente');
  const nameCol = colset.has('patient_name') ? 'patient_name' : (colset.has('paziente') ? 'paziente' : null);

  const selectCols = ['id', 'patient_uuid'];
  if (hasCf) selectCols.push(def.cfCol);
  if (nameCol) selectCols.push(nameCol);

  const rows = db.prepare(
    `SELECT ${selectCols.join(', ')} FROM ${def.name} WHERE patient_uuid IS NULL OR patient_uuid = ''`
  ).all();

  if (!rows.length) {
    console.log(`[${def.name}] nessuna riga da riconciliare`);
    return;
  }

  console.log(`[${def.name}] ${rows.length} righe da analizzare`);

  const update = db.prepare(`UPDATE ${def.name} SET patient_uuid = ? WHERE id = ?`);

  for (const row of rows) {
    stats.scanned++;
    const cfRaw = hasCf ? row[def.cfCol] : null;
    const cf = normalizeCf(dec(cfRaw));
    const name = nameCol ? dec(row[nameCol]) : null;

    if (!cf) {
      stats.orfaneNoCf++;
      if (ASSIGN_UNKNOWN && !DRY_RUN) {
        update.run(UNKNOWN_UUID, row.id);
        pushReport(def.name, row.id, name, null, 'ORFANA_NO_CF', 'assegnato ' + UNKNOWN_UUID);
      } else {
        pushReport(def.name, row.id, name, null, 'ORFANA_NO_CF');
      }
      continue;
    }

    let result;
    try {
      result = await cerus.searchAdvanced({ fiscal_code: cf, limit: 5 });
    } catch (err) {
      stats.errori++;
      pushReport(def.name, row.id, name, cf, 'ERRORE_API', err.message);
      continue;
    }

    const list = (result && result.data) || [];
    if (list.length === 0) {
      stats.orfane404++;
      if (ASSIGN_UNKNOWN && !DRY_RUN) {
        update.run(UNKNOWN_UUID, row.id);
        pushReport(def.name, row.id, name, cf, 'ORFANA_404', 'assegnato ' + UNKNOWN_UUID);
      } else {
        pushReport(def.name, row.id, name, cf, 'ORFANA_404');
      }
      continue;
    }
    if (list.length > 1) {
      stats.ambigue++;
      const uuids = list.map((p) => p.cerus_uuid).filter(Boolean).join(';');
      pushReport(def.name, row.id, name, cf, 'AMBIGUITA', `${list.length} match: ${uuids}`);
      continue;
    }

    const uuid = list[0].cerus_uuid;
    if (!uuid) {
      stats.errori++;
      pushReport(def.name, row.id, name, cf, 'ERRORE_API', 'risposta Cerus senza cerus_uuid');
      continue;
    }

    if (!DRY_RUN) {
      update.run(uuid, row.id);
    }
    stats.match++;
    pushReport(def.name, row.id, name, cf, 'MATCH', uuid);
  }
}

/* ── Entry point ──────────────────────────────────────────────────────── */
(async function main() {
  console.log('────────────────────────────────────────────────────────────');
  console.log(' tools/backfill-cerus-uuid.js — V3.M4.A1 Fase A0');
  console.log(` modalità: ${DRY_RUN ? 'DRY-RUN (nessun UPDATE)' : 'REALE (UPDATE attivi)'}`);
  if (TABLE_ARG) console.log(` filtro tabella: ${TABLE_ARG}`);
  console.log('────────────────────────────────────────────────────────────');

  if (!cerus.isConfigured()) {
    console.error('[backfill] Cerus non configurato (CERUS_BASE_URL/CERUS_USER_ID/CERUS_USER_KEY o lumia.config.json.cerus). Aborto.');
    process.exit(2);
  }

  await initSqlite();
  await initDatabase();
  initAgendaDb();
  const db = getAgendaDb();

  const stats = { scanned: 0, match: 0, orfaneNoCf: 0, orfane404: 0, ambigue: 0, errori: 0 };
  const targets = TABLE_ARG ? TABLES.filter((t) => t.name === TABLE_ARG) : TABLES;

  if (!targets.length) {
    console.error(`[backfill] tabella '${TABLE_ARG}' non riconosciuta. Valori ammessi: ${TABLES.map((t) => t.name).join(', ')}`);
    process.exit(2);
  }

  for (const t of targets) {
    await processTable(db, t, stats);
  }

  // Flush esplicito su disco (sql.js usa debounce 500 ms; senza close() le scritture vanno perse).
  if (!DRY_RUN) {
    try { db.close(); } catch (_) {}
  }

  writeReport();

  console.log('────────────────────────────────────────────────────────────');
  console.log(' Riepilogo');
  console.log('────────────────────────────────────────────────────────────');
  console.log(` righe analizzate    : ${stats.scanned}`);
  console.log(` riconciliate (MATCH): ${stats.match}${DRY_RUN ? '  (simulato)' : ''}`);
  console.log(` orfane senza CF     : ${stats.orfaneNoCf}`);
  console.log(` orfane CF non trovato (404): ${stats.orfane404}`);
  console.log(` CF ambiguo (>1 match) : ${stats.ambigue}`);
  console.log(` errori API           : ${stats.errori}`);
  console.log('');
  console.log(` Report CSV: ${REPORT_PATH}`);
  if (stats.orfaneNoCf + stats.orfane404 + stats.ambigue + stats.errori > 0) {
    if (ASSIGN_UNKNOWN && !DRY_RUN) {
      console.log('');
      console.log(` ✓ Righe non riconciliate assegnate al placeholder ${UNKNOWN_UUID}.`);
      console.log('   Verificare il report CSV per la lista. Le righe restano editabili in UI.');
    } else {
      console.log('');
      console.log(' ⚠ Sono presenti righe non riconciliate. Aprire backfill-report.csv,');
      console.log('   risolvere ogni caso (creando il paziente in Cerus, cancellando la riga,');
      console.log('   o assegnando manualmente il patient_uuid) e ri-eseguire lo script.');
      console.log('   Per sbloccare la migrazione schema su righe legacy non recuperabili:');
      console.log('   node tools/backfill-cerus-uuid.js --assign-unknown');
    }
  } else if (stats.scanned > 0) {
    console.log('');
    console.log(' ✓ Tutte le righe sono state riconciliate. Pronti per V3.M4.A1.A1.');
  } else {
    console.log('');
    console.log(' ✓ Nessuna riga legacy: A0 già completata.');
  }

  process.exit(0);
})().catch((err) => {
  console.error('[backfill] errore inatteso:', err);
  try { writeReport(); } catch (_) {}
  process.exit(1);
});
