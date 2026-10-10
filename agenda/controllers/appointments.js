'use strict';

const model     = require('../models/appointment');
const audit     = require('../models/audit');
const nodeModel = require('../models/node');
const res_      = require('../utils/response');
const validate  = require('../utils/validate');
const { safeInt } = validate;
const { getAgendaDb } = require('../db');
const { resolver } = require('../../../src/integrations/cerus');

/** Normalizza stringa vuota → null */
function etn(v) { return (typeof v === 'string' && v.trim() === '') ? null : v; }

async function list(ctx) {
  const q = Object.fromEntries(ctx.query.entries());

  // V3.M4.A1.A2: enrich con dati live da Cerus (campo .patient)
  if (q.patient_id) {
    const items = await resolver.enrichRows(model.getByPatient(q.patient_id));
    return res_.ok(ctx.res, items, { count: items.length });
  }
  if (q.date) {
    const items = await resolver.enrichRows(model.getByDate(q.date));
    return res_.ok(ctx.res, items, { date: q.date, count: items.length });
  }
  if (q.week) {
    const days = validate.parseWeekParam(q.week);
    if (!days) return res_.badRequest(ctx.res, 'week deve essere nel formato YYYY-WXX (es. 2025-W03)');
    const items = await resolver.enrichRows(model.getByDateRange(days[0], days[6]));
    const grouped = {};
    for (const day of days) grouped[day] = [];
    for (const item of items) (grouped[item.date] ??= []).push(item);
    return res_.ok(ctx.res, grouped, { week: q.week, count: items.length });
  }
  if (q.from && q.to) {
    if (q.from > q.to) return res_.badRequest(ctx.res, 'from deve precedere to');
    const items = await resolver.enrichRows(model.getByDateRange(q.from, q.to));
    return res_.ok(ctx.res, items, { from: q.from, to: q.to, count: items.length });
  }
  return res_.badRequest(ctx.res, 'Specificare almeno uno tra: date, week, from+to, patient_id');
}

async function getOne(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const item = model.getById(id);
  if (!item) return res_.notFound(ctx.res, `Appuntamento #${id} non trovato`);
  // V3.M4.A1.A2: enrich con dati live da Cerus (campo .patient)
  const enriched = await resolver.enrichRow(item);
  res_.ok(ctx.res, enriched);
}

async function create(ctx) {
  let body = ctx.body;
  const check = validate.validateCreate(body);
  if (!check.valid) return res_.badRequest(ctx.res, 'Dati non validi', check.errors);

  body = validate.sanitizeBody(body);

  // V3.M4.A1.A4: patient_uuid è obbligatorio (schema NOT NULL).
  if (!body.patient_uuid || !String(body.patient_uuid).trim()) {
    return res_.badRequest(ctx.res, 'patient_uuid è obbligatorio: selezionare il paziente in Cerus');
  }

  // V3.M4.A1.A3: se c'è patient_uuid, il server è autorità — i campi
  // patient_name/patient_id/phone/birth_date vengono sovrascritti dai valori
  // canonici in Cerus (client input per questi campi ignorato).
  const derived = await resolver.deriveLegacyFields(body);
  if (!derived.ok) {
    if (derived.status === 502) return res_.serviceUnavailable(ctx.res, derived.error);
    return res_.notFound(ctx.res, derived.error);
  }
  body = derived.body;

  if (body.room_id != null) {
    const room = nodeModel.getById(body.room_id);
    if (!room || room.type !== 'postazione') return res_.badRequest(ctx.res, 'room_id deve riferirsi a una postazione valida');
  }

  const duration_min = (body.start_time && body.end_time) ? validate.calcDuration(body.start_time, body.end_time) : (body.duration_min || 30);
  const data = {
    patient_name:     (body.patient_name || '').trim() || '',
    patient_id:       etn(body.patient_id)     ?? null,
    patient_uuid:     etn(body.patient_uuid)   ?? null,
    phone:            etn(body.phone)          ?? null,
    birth_date:       etn(body.birth_date)     ?? null,
    doctor:           etn(body.doctor)         ?? null,
    room_id:          body.room_id        ?? null,
    type:             body.type           || 'visita',
    title:            (body.title || '').trim() || '',
    description:      body.description    ?? null,
    prestazione_code: body.prestazione_code ?? null,
    date:             body.date           || new Date().toISOString().slice(0,10),
    start_time:       body.start_time     || '08:00',
    end_time:         body.end_time       || '08:30',
    duration_min,
    status:           body.status         ?? 'scheduled',
    color:            body.color          ?? null,
    notes:            body.notes          ?? null,
  };

  const created = model.create(data, ctx.session?.utente_id || null);
  const userId = ctx.session?.utente_id || null;
  audit.log('appointments', created.id, 'INSERT', null, created, userId);
  res_.created(ctx.res, created);
}

async function update(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  let body = ctx.body;
  const check = validate.validateUpdate(body);
  if (!check.valid) return res_.badRequest(ctx.res, 'Dati non validi', check.errors);

  body = validate.sanitizeBody(body);

  // V3.M4.A1.A3: Cerus è autorità per i campi anagrafici.
  const derived = await resolver.deriveLegacyFields(body);
  if (!derived.ok) {
    if (derived.status === 502) return res_.serviceUnavailable(ctx.res, derived.error);
    return res_.notFound(ctx.res, derived.error);
  }
  body = derived.body;

  const existing = model.getById(id);
  if (!existing) return res_.notFound(ctx.res, `Appuntamento #${id} non trovato`);
  if (body.start_time || body.end_time) {
    const s = body.start_time ?? existing.start_time;
    const e = body.end_time   ?? existing.end_time;
    body.duration_min = validate.calcDuration(s, e);
  }

  const updated = model.update(id, body, ctx.session?.utente_id || null);
  if (!updated) return res_.notFound(ctx.res, `Appuntamento #${id} non trovato`);
  const userId = ctx.session?.utente_id || null;
  audit.log('appointments', id, 'UPDATE', existing, updated, userId);
  res_.ok(ctx.res, updated);
}

function move(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  const body = ctx.body;
  const check = validate.validateMove(body);
  if (!check.valid) return res_.badRequest(ctx.res, 'Dati non validi', check.errors);

  const existing = model.getById(id);
  if (!existing) return res_.notFound(ctx.res, `Appuntamento #${id} non trovato`);

  const duration_min = validate.calcDuration(body.start_time, body.end_time);
  const moved = model.move(id, { ...body, duration_min }, ctx.session?.utente_id || null);
  // V3.M3.A12: coverage — anche move è una mutation di dato
  audit.log('appointments', id, 'UPDATE', existing, moved, ctx.session?.utente_id || null);
  res_.ok(ctx.res, moved);
}

function reorder(ctx) {
  const body = ctx.body;
  const check = validate.validateReorder(body);
  if (!check.valid) return res_.badRequest(ctx.res, 'Dati non validi', check.errors);

  for (const { id } of body.items) {
    if (!model.getById(id)) return res_.notFound(ctx.res, `Appuntamento #${id} non trovato`);
  }

  const updated = model.reorder(body.items);
  res_.ok(ctx.res, updated, { count: updated.length });
}

function updateStatus(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  const body = ctx.body;
  const STATI = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
  if (!body.status || !STATI.includes(body.status))
    return res_.badRequest(ctx.res, `status deve essere uno di: ${STATI.join(', ')}`);

  const existing = model.getById(id);
  if (!existing) return res_.notFound(ctx.res, `Appuntamento #${id} non trovato`);

  const updated = model.updateStatus(id, body.status);
  // V3.M3.A12: coverage status change
  audit.log('appointments', id, 'UPDATE', existing, updated, ctx.session?.utente_id || null);
  res_.ok(ctx.res, updated);
}

function remove(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  const existing = model.getById(id);
  if (!existing) return res_.notFound(ctx.res, `Appuntamento #${id} non trovato`);

  const userId = ctx.session?.utente_id || null;

  // Audit transfusion data before CASCADE delete removes it
  const db = getAgendaDb();
  const trasfReq = db.prepare(`SELECT * FROM transfusion_requests WHERE appointment_id = ?`).all(id);
  for (const tr of trasfReq) {
    const emos = db.prepare(`SELECT * FROM transfusion_emocomponents WHERE request_id = ?`).all(tr.id);
    audit.log('transfusion_requests', tr.id, 'CASCADE_DELETE', { ...tr, emocomponents: emos }, null, userId);
  }

  model.remove(id);
  audit.log('appointments', id, 'DELETE', existing, null, userId);
  res_.noContent(ctx.res);
}

function slots(ctx) {
  const date = ctx.query.get('date');
  if (!date) return res_.badRequest(ctx.res, 'Parametro date obbligatorio');
  const duration = parseInt(ctx.query.get('duration') ?? '30', 10);
  if (isNaN(duration) || duration < 5 || duration > 480)
    return res_.badRequest(ctx.res, 'duration deve essere un intero tra 5 e 480 minuti');

  const freeSlots = model.getFreeSlots(date, duration);
  res_.ok(ctx.res, freeSlots, { date, duration_min: duration, count: freeSlots.length });
}

function counts(ctx) {
  const from = ctx.query.get('from');
  const to   = ctx.query.get('to');
  if (!from || !to) return res_.badRequest(ctx.res, 'Parametri from e to obbligatori');
  const data = model.getCountsByDateRange(from, to);
  const map = {};
  for (const row of data) map[row.date] = row.count;
  res_.ok(ctx.res, map);
}

function countsByRoom(ctx) {
  const date = ctx.query.get('date') || new Date().toISOString().slice(0, 10);
  const db = getAgendaDb();
  const data = db.prepare(
    'SELECT room_id, COUNT(*) as count FROM appointments WHERE date = ? AND room_id IS NOT NULL GROUP BY room_id'
  ).all(date);
  const map = {};
  for (const row of data) map[row.room_id] = row.count;
  res_.ok(ctx.res, map);
}

async function panoramica(ctx) {
  const date = ctx.query.get('date');
  if (!date) return res_.badRequest(ctx.res, 'Parametro date obbligatorio');
  // V3.M4.A1.A2: enrich con dati live da Cerus (campo .patient) prima dell'aggregazione nodi
  const items = await resolver.enrichRows(model.getByDate(date));
  const db = getAgendaDb();
  const nodeAll = db.prepare('SELECT id, name, type, parent_id, station_type FROM nodes').all();
  const nm = {};
  for (const n of nodeAll) nm[n.id] = n;
  const enriched = items.map(a => {
    const room = a.room_id ? nm[a.room_id] : null;
    const flusso = room ? nm[room.parent_id] : null;
    const sede = flusso ? nm[flusso.parent_id] : null;
    const area = sede ? nm[sede.parent_id] : null;
    const macro = area ? nm[area.parent_id] : null;
    return {
      ...a,
      room_name: room ? room.name : null,
      station_type: room ? room.station_type : null,
      flusso_id: flusso ? flusso.id : null,
      flusso_name: flusso ? flusso.name : null,
      sede_name: sede ? sede.name : null,
      area_name: area ? area.name : null,
      macro_name: macro ? macro.name : null
    };
  });
  res_.ok(ctx.res, enriched, { date, count: enriched.length });
}

module.exports = { list, getOne, create, update, move, reorder, updateStatus, remove, slots, counts, countsByRoom, panoramica };
