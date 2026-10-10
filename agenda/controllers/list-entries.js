'use strict';

const model = require('../models/list-entry');
const audit = require('../models/audit');
const res_  = require('../utils/response');
const { safeInt } = require('../utils/validate');
const { resolver } = require('../../../src/integrations/cerus');

const VALID_STATUSES = ['booked', 'confirmed', 'completed', 'cancelled', 'no_show'];

async function list(ctx) {
  const patientId = ctx.query.get('patient_id');
  const listIdStr = ctx.query.get('list_id');
  const date      = ctx.query.get('date');

  // V3.M4.A1.A2: enrich con dati live da Cerus (campo .patient)
  if (patientId) {
    const items = await resolver.enrichRows(model.getByPatient(patientId));
    return res_.ok(ctx.res, items, { count: items.length });
  }
  if (listIdStr && date) {
    const items = await resolver.enrichRows(model.getByListAndDate(parseInt(listIdStr, 10), date));
    return res_.ok(ctx.res, items, { count: items.length });
  }
  if (date) {
    const items = await resolver.enrichRows(model.getByDate(date));
    return res_.ok(ctx.res, items, { count: items.length });
  }
  return res_.badRequest(ctx.res, 'Specificare almeno uno tra: list_id+date, date, patient_id');
}

async function getOne(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const item = model.getById(id);
  if (!item) return res_.notFound(ctx.res, `Entry #${id} non trovata`);
  // V3.M4.A1.A2: enrich con dati live da Cerus (campo .patient)
  const enriched = await resolver.enrichRow(item);
  res_.ok(ctx.res, enriched);
}

async function create(ctx) {
  const body0 = ctx.body;
  if (!body0.list_id) return res_.badRequest(ctx.res, 'list_id è obbligatorio');
  if (!body0.date) return res_.badRequest(ctx.res, 'date è obbligatorio');
  if (!body0.slot_time) return res_.badRequest(ctx.res, 'slot_time è obbligatorio');
  // V3.M4.A1.A4: patient_uuid è obbligatorio (schema NOT NULL).
  if (!body0.patient_uuid || !String(body0.patient_uuid).trim()) {
    return res_.badRequest(ctx.res, 'patient_uuid è obbligatorio: selezionare il paziente in Cerus');
  }

  // V3.M4.A1.A3: Cerus è autorità sui campi anagrafici. Se è presente
  // patient_uuid i campi legacy vengono sovrascritti dai valori canonici.
  const derived = await resolver.deriveLegacyFields(body0);
  if (!derived.ok) {
    if (derived.status === 502) return res_.serviceUnavailable(ctx.res, derived.error);
    return res_.notFound(ctx.res, derived.error);
  }
  const body = derived.body;

  if (!body.patient_name?.trim()) return res_.badRequest(ctx.res, 'patient_name è obbligatorio');

  try {
    const item = model.create(body, ctx.session?.utente_id || null);
    const userId = ctx.session?.utente_id || null;
    audit.log('list_entries', item.id, 'INSERT', null, item, userId);
    res_.created(ctx.res, item);
  } catch (e) {
    res_.badRequest(ctx.res, e.message);
  }
}

async function update(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const existing = model.getById(id);
  if (!existing) return res_.notFound(ctx.res, `Entry #${id} non trovata`);

  // V3.M4.A1.A3: Cerus è autorità sui campi anagrafici.
  const derived = await resolver.deriveLegacyFields(ctx.body);
  if (!derived.ok) {
    if (derived.status === 502) return res_.serviceUnavailable(ctx.res, derived.error);
    return res_.notFound(ctx.res, derived.error);
  }

  const updated = model.update(id, derived.body, ctx.session?.utente_id || null);
  if (!updated) return res_.notFound(ctx.res, `Entry #${id} non trovata`);
  // V3.M3.A12: coverage
  audit.log('list_entries', id, 'UPDATE', existing, updated, ctx.session?.utente_id || null);
  res_.ok(ctx.res, updated);
}

function updateStatus(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  const body = ctx.body;
  if (!body.status || !VALID_STATUSES.includes(body.status))
    return res_.badRequest(ctx.res, `status deve essere uno di: ${VALID_STATUSES.join(', ')}`);

  const existing = model.getById(id);
  if (!existing) return res_.notFound(ctx.res, `Entry #${id} non trovata`);

  const updated = model.updateStatus(id, body.status);
  // V3.M3.A12: coverage status change
  audit.log('list_entries', id, 'UPDATE', existing, updated, ctx.session?.utente_id || null);
  res_.ok(ctx.res, updated);
}

function promote(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  try {
    const result = model.promote(id, ctx.body);
    res_.ok(ctx.res, result);
  } catch (e) {
    res_.badRequest(ctx.res, e.message);
  }
}

function remove(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const existing = model.getById(id);
  if (!existing) return res_.notFound(ctx.res, `Entry #${id} non trovata`);
  model.remove(id);
  const userId = ctx.session?.utente_id || null;
  audit.log('list_entries', id, 'DELETE', existing, null, userId);
  res_.noContent(ctx.res);
}

module.exports = { list, getOne, create, update, updateStatus, promote, remove };
