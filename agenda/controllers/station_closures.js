'use strict';

const model = require('../models/station_closure');
const res_  = require('../utils/response');
const { safeInt } = require('../utils/validate');

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_CATEGORIES = ['manutenzione','ferie','festivita','emergenza','altro'];

function list(ctx) {
  const roomIdStr = ctx.query.get('room_id');
  if (!roomIdStr) return res_.badRequest(ctx.res, 'room_id è obbligatorio');
  const roomId = safeInt(roomIdStr);
  if (roomId === null) return res_.badRequest(ctx.res, 'room_id deve essere un intero valido');
  const from = ctx.query.get('from');
  const to   = ctx.query.get('to');
  let items;
  if (from && to && RE_DATE.test(from) && RE_DATE.test(to)) {
    items = model.getByRange(roomId, from, to);
  } else {
    items = model.getByRoom(roomId);
  }
  res_.ok(ctx.res, items, { count: items.length });
}

function listByRooms(ctx) {
  const roomIdsStr = ctx.query.get('room_ids');
  const from = ctx.query.get('from');
  const to   = ctx.query.get('to');
  if (!roomIdsStr) return res_.badRequest(ctx.res, 'room_ids è obbligatorio');
  if (!from || !to) return res_.badRequest(ctx.res, 'from e to sono obbligatori');
  const roomIds = roomIdsStr.split(',').map(Number);
  const items = model.getByRoomsRange(roomIds, from, to);
  res_.ok(ctx.res, items, { count: items.length });
}

function getOne(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const item = model.getById(id);
  if (!item) return res_.notFound(ctx.res, 'Chiusura non trovata');
  res_.ok(ctx.res, item);
}

function create(ctx) {
  const body = ctx.body;
  if (!body.room_id) return res_.badRequest(ctx.res, 'room_id è obbligatorio');
  if (!body.date_start || !RE_DATE.test(body.date_start)) return res_.badRequest(ctx.res, 'date_start non valida');
  if (!body.date_end || !RE_DATE.test(body.date_end)) return res_.badRequest(ctx.res, 'date_end non valida');
  if (body.date_start > body.date_end) return res_.badRequest(ctx.res, 'date_start deve precedere o essere uguale a date_end');
  if (body.reason_category && !VALID_CATEGORIES.includes(body.reason_category))
    return res_.badRequest(ctx.res, 'reason_category non valida');
  const item = model.create(body);
  res_.created(ctx.res, item);
}

function bulkCreate(ctx) {
  const body = ctx.body;
  if (!Array.isArray(body.room_ids) || !body.room_ids.length)
    return res_.badRequest(ctx.res, 'room_ids è obbligatorio (array)');
  if (!body.date_start || !body.date_end)
    return res_.badRequest(ctx.res, 'date_start e date_end obbligatori');
  if (body.date_start > body.date_end)
    return res_.badRequest(ctx.res, 'date_start deve precedere o essere uguale a date_end');

  const items = model.bulkCreate(body.room_ids.map(room_id => ({
    room_id,
    date_start:         body.date_start,
    date_end:           body.date_end,
    time_start:         body.time_start,
    time_end:           body.time_end,
    reason_category:    body.reason_category,
    reason_note:        body.reason_note,
    recurrence_type:    body.recurrence_type,
    recurrence_pattern: body.recurrence_pattern,
  })));
  res_.ok(ctx.res, items, { count: items.length });
}

function update(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  const body = ctx.body;
  if (body.reason_category && !VALID_CATEGORIES.includes(body.reason_category))
    return res_.badRequest(ctx.res, 'reason_category non valida');

  const item = model.update(id, body);
  if (!item) return res_.notFound(ctx.res, 'Chiusura non trovata');
  res_.ok(ctx.res, item);
}

function remove(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const deleted = model.remove(id);
  if (!deleted) return res_.notFound(ctx.res, 'Chiusura non trovata');
  res_.noContent(ctx.res);
}

module.exports = { list, listByRooms, getOne, create, bulkCreate, update, remove };
