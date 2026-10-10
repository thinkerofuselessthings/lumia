'use strict';

const droModel = require('../models/day_room_override');
const res_     = require('../utils/response');
const { safeInt } = require('../utils/validate');

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

function list(ctx) {
  const date = ctx.query.get('date');
  if (!date || !RE_DATE.test(date))
    return res_.badRequest(ctx.res, 'date è obbligatorio (YYYY-MM-DD)');
  const items = droModel.getByDate(date);
  res_.ok(ctx.res, items, { count: items.length });
}

function set(ctx) {
  const body = ctx.body;
  if (!body.date || !RE_DATE.test(body.date))
    return res_.badRequest(ctx.res, 'date è obbligatorio (YYYY-MM-DD)');
  if (!body.room_id || typeof body.room_id !== 'number')
    return res_.badRequest(ctx.res, 'room_id è obbligatorio (numero)');
  if (body.is_open === undefined)
    return res_.badRequest(ctx.res, 'is_open è obbligatorio (0 o 1)');

  const item = droModel.set(body.date, body.room_id, body.is_open);
  res_.ok(ctx.res, item);
}

function bulkSet(ctx) {
  const body = ctx.body;
  if (!body.date || !RE_DATE.test(body.date))
    return res_.badRequest(ctx.res, 'date è obbligatorio (YYYY-MM-DD)');
  if (!Array.isArray(body.overrides))
    return res_.badRequest(ctx.res, 'overrides deve essere un array di { room_id, is_open }');

  const results = [];
  for (const o of body.overrides) {
    if (!o.room_id) continue;
    const item = droModel.set(body.date, o.room_id, o.is_open);
    results.push(item);
  }
  res_.ok(ctx.res, results, { count: results.length });
}

function remove(ctx) {
  const date = ctx.query.get('date');
  const roomIdStr = ctx.query.get('room_id');
  if (!date || !RE_DATE.test(date))
    return res_.badRequest(ctx.res, 'date è obbligatorio');
  if (!roomIdStr)
    return res_.badRequest(ctx.res, 'room_id è obbligatorio');

  const rid = safeInt(roomIdStr);
  if (rid === null) return res_.badRequest(ctx.res, 'room_id deve essere un intero valido');
  const deleted = droModel.remove(date, rid);
  if (!deleted) return res_.notFound(ctx.res, 'Override non trovato');
  res_.noContent(ctx.res);
}

module.exports = { list, set, bulkSet, remove };
