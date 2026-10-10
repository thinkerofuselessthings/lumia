'use strict';

const model      = require('../models/list');
const entryModel = require('../models/list-entry');
const nodeModel  = require('../models/node');
const res_       = require('../utils/response');

function list(ctx) {
  const flussoIdStr = ctx.query.get('flusso_id');
  if (flussoIdStr) {
    const fid = parseInt(flussoIdStr, 10);
    const activeOnly = ctx.query.get('active') === '1';
    const items = model.getByFlusso(fid, { activeOnly });
    return res_.ok(ctx.res, items, { count: items.length });
  }
  const items = model.getAll();
  res_.ok(ctx.res, items, { count: items.length });
}

function getOne(ctx) {
  const id = parseInt(ctx.params.id, 10);
  const item = model.getById(id);
  if (!item) return res_.notFound(ctx.res, `Lista #${id} non trovata`);
  res_.ok(ctx.res, item);
}

function create(ctx) {
  const body = ctx.body;
  if (!body.name?.trim()) return res_.badRequest(ctx.res, 'name è obbligatorio');
  if (!body.flusso_id) return res_.badRequest(ctx.res, 'flusso_id è obbligatorio');

  const node = nodeModel.getById(body.flusso_id);
  if (!node) return res_.notFound(ctx.res, `Nodo #${body.flusso_id} non trovato`);
  if (node.type !== 'flusso') return res_.badRequest(ctx.res, `Il nodo #${body.flusso_id} non è un flusso (è ${node.type})`);

  try {
    const item = model.create(body);
    res_.created(ctx.res, item);
  } catch (e) {
    res_.badRequest(ctx.res, e.message);
  }
}

function update(ctx) {
  const id = parseInt(ctx.params.id, 10);
  const updated = model.update(id, ctx.body);
  if (!updated) return res_.notFound(ctx.res, `Lista #${id} non trovata`);
  res_.ok(ctx.res, updated);
}

function remove(ctx) {
  const id = parseInt(ctx.params.id, 10);
  const ok = model.remove(id);
  if (!ok) return res_.notFound(ctx.res, `Lista #${id} non trovata`);
  res_.noContent(ctx.res);
}

function slots(ctx) {
  const id   = parseInt(ctx.params.id, 10);
  const date = ctx.query.get('date');
  if (!date) return res_.badRequest(ctx.res, 'Parametro date obbligatorio');

  const item = model.getById(id);
  if (!item) return res_.notFound(ctx.res, `Lista #${id} non trovata`);

  const activeOnDate = model.isActiveOnDate(item, date);
  const slotDefs = model.generateSlots(item);
  const entries = entryModel.getByListAndDate(id, date);

  const enriched = slotDefs.map(s => {
    const slotEntries = entries.filter(e => e.slot_time === s.time);
    return {
      time: s.time,
      max_patients: s.max_patients,
      entries: slotEntries,
      available: Math.max(0, s.max_patients - slotEntries.filter(e => e.status !== 'cancelled').length),
    };
  });

  res_.ok(ctx.res, { list: item, is_active_on_date: activeOnDate, slots: enriched });
}

module.exports = { list, getOne, create, update, remove, slots };
