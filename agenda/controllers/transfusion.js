'use strict';

const { getAgendaDb } = require('../db');
const res_ = require('../utils/response');
const { resolver } = require('../../../src/integrations/cerus');

// V3.M4.A1.A3/A4: mapping nomi colonne legacy di transfusion_requests
// (schema diverso da appointments: paziente/cf/nascita/sesso invece di patient_*)
const TRANSF_FIELD_MAP = {
  name:       'paziente',
  fiscalCode: 'cf',
  phone:      null,
  birthDate:  'nascita',
  gender:     'sesso'
};

let _stmts = null;
function stmts() {
  if (_stmts) return _stmts;
  const db = getAgendaDb();
  _stmts = {
    getByAppt: db.prepare(`SELECT * FROM transfusion_requests WHERE appointment_id = ? AND status != 'cancelled' ORDER BY id DESC LIMIT 1`),
    getEmo:    db.prepare(`SELECT * FROM transfusion_emocomponents WHERE request_id = ? ORDER BY id`),
    upsert:    db.prepare(`INSERT OR REPLACE INTO transfusion_requests
      (id, appointment_id, patient_uuid, reparto, nosologico, paziente, nascita, sesso, cf, peso,
       diagnosi, indicazione, gruppo_sanguigno, rh, hb, hct, plt, pt_inr, aptt, fibrinogeno,
       urgenza, prev_trasfusioni, reazioni_note, medico, data_richiesta, note, status)
      VALUES (@id, @appointment_id, @patient_uuid, @reparto, @nosologico, @paziente, @nascita, @sesso, @cf, @peso,
       @diagnosi, @indicazione, @gruppo_sanguigno, @rh, @hb, @hct, @plt, @pt_inr, @aptt, @fibrinogeno,
       @urgenza, @prev_trasfusioni, @reazioni_note, @medico, @data_richiesta, @note, @status)`),
    delEmo:    db.prepare(`DELETE FROM transfusion_emocomponents WHERE request_id = ?`),
    insEmo:    db.prepare(`INSERT INTO transfusion_emocomponents (request_id, emo_type, units, irradiato, filtrato, lavato, fenotipizzato) VALUES (?,?,?,?,?,?,?)`),
    cancel:    db.prepare(`UPDATE transfusion_requests SET status = 'cancelled' WHERE appointment_id = ? AND status != 'cancelled'`),
  };
  return _stmts;
}

async function get(ctx) {
  const id = parseInt(ctx.params.id, 10);
  const s = stmts();
  const row = s.getByAppt.get(id);
  if (!row) return res_.ok(ctx.res, null);
  row.emocomponents = s.getEmo.all(row.id);
  // V3.M4.A1.A2: enrich con dati live da Cerus (campo .patient)
  const enriched = await resolver.enrichRow(row);
  return res_.ok(ctx.res, enriched);
}

async function save(ctx) {
  const apptId = parseInt(ctx.params.id, 10);
  let body = ctx.body;
  if (!body) return res_.badRequest(ctx.res, 'Body richiesto');

  // V3.M4.A1.A3: Cerus è autorità — se è presente patient_uuid, paziente/cf/
  // nascita/sesso vengono sovrascritti dai valori canonici.
  const derived = await resolver.deriveLegacyFields(body, { fieldMap: TRANSF_FIELD_MAP });
  if (!derived.ok) {
    if (derived.status === 502) return res_.serviceUnavailable(ctx.res, derived.error);
    return res_.notFound(ctx.res, derived.error);
  }
  body = derived.body;

  const s = stmts();
  const db = getAgendaDb();
  const existing = s.getByAppt.get(apptId);

  const doSave = db.transaction(() => {
    const params = {
      id:                existing ? existing.id : null,
      appointment_id:    apptId,
      patient_uuid:      body.patient_uuid || null,
      reparto:           body.reparto || null,
      nosologico:        body.nosologico || null,
      paziente:          body.paziente || null,
      nascita:           body.nascita || null,
      sesso:             body.sesso || null,
      cf:                body.cf || null,
      peso:              body.peso ? parseFloat(body.peso) : null,
      diagnosi:          body.diagnosi || null,
      indicazione:       body.indicazione || null,
      gruppo_sanguigno:  body.gruppo_sanguigno || null,
      rh:                body.rh || null,
      hb:                body.hb ? parseFloat(body.hb) : null,
      hct:               body.hct ? parseFloat(body.hct) : null,
      plt:               body.plt ? parseInt(body.plt, 10) : null,
      pt_inr:            body.pt_inr ? parseFloat(body.pt_inr) : null,
      aptt:              body.aptt ? parseFloat(body.aptt) : null,
      fibrinogeno:       body.fibrinogeno ? parseFloat(body.fibrinogeno) : null,
      urgenza:           body.urgenza || 'Ordinaria',
      prev_trasfusioni:  body.prev_trasfusioni || null,
      reazioni_note:     body.reazioni_note || null,
      medico:            body.medico || null,
      data_richiesta:    body.data_richiesta || null,
      note:              body.note || null,
      status:            body.status || 'draft',
    };

    const info = s.upsert.run(params);
    const reqId = existing ? existing.id : info.lastInsertRowid;

    s.delEmo.run(reqId);
    if (Array.isArray(body.emocomponents)) {
      for (const e of body.emocomponents) {
        s.insEmo.run(reqId, e.emo_type, e.units || 1, e.irradiato ? 1 : 0, e.filtrato ? 1 : 0, e.lavato ? 1 : 0, e.fenotipizzato ? 1 : 0);
      }
    }
    return reqId;
  });

  const reqId = doSave();
  return res_.ok(ctx.res, { ok: true, id: reqId });
}

function remove(ctx) {
  const apptId = parseInt(ctx.params.id, 10);
  stmts().cancel.run(apptId);
  return res_.ok(ctx.res, { ok: true });
}

/**
 * GET /api/agenda/transfusions?date=YYYY-MM-DD
 * Lists transfusion requests for a given date (via appointment.date JOIN).
 */
async function listByDate(ctx) {
  const date = ctx.query.get('date');
  if (!date) return res_.badRequest(ctx.res, 'Parametro date obbligatorio');
  const db = getAgendaDb();
  const rows = db.prepare(`
    SELECT tr.*, a.date AS appt_date, a.start_time, a.end_time,
           a.patient_name, a.room_id, n.name AS room_name
    FROM transfusion_requests tr
    JOIN appointments a ON a.id = tr.appointment_id
    LEFT JOIN nodes n ON n.id = a.room_id
    WHERE a.date = ? AND tr.status != 'cancelled'
    ORDER BY a.start_time ASC
  `).all(date);
  // attach emocomponents
  const s = stmts();
  for (const r of rows) {
    r.emocomponents = s.getEmo.all(r.id);
  }
  // V3.M4.A1.A2: enrich con dati live da Cerus (campo .patient)
  const enriched = await resolver.enrichRows(rows);
  return res_.ok(ctx.res, enriched, { date, count: enriched.length });
}

module.exports = { get, save, remove, listByDate };
