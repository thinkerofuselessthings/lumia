'use strict';

const model = require('../models/station_opening');
const res_  = require('../utils/response');
const { safeInt } = require('../utils/validate');

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

function create(ctx) {
  const body = ctx.body;
  if (!body.room_id) return res_.badRequest(ctx.res, 'room_id è obbligatorio');
  if (!body.date || !RE_DATE.test(body.date)) return res_.badRequest(ctx.res, 'date non valida');

  try {
    const item = model.create(body);
    res_.created(ctx.res, item);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res_.conflict(ctx.res, 'Apertura già esistente per questa data');
    throw e;
  }
}

function remove(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const deleted = model.remove(id);
  if (!deleted) return res_.notFound(ctx.res, 'Apertura non trovata');
  res_.noContent(ctx.res);
}

module.exports = { list, create, remove };
