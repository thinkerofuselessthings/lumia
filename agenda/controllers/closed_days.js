'use strict';

const closedModel = require('../models/closed_day');
const res_        = require('../utils/response');

const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

function list(ctx) {
  const from = ctx.query.get('from');
  const to   = ctx.query.get('to');
  if (from && to) {
    const items = closedModel.getByRange(from, to);
    return res_.ok(ctx.res, items, { count: items.length });
  }
  const items = closedModel.getAll();
  res_.ok(ctx.res, items, { count: items.length });
}

function set(ctx) {
  const body = ctx.body;
  if (!body.date || !RE_DATE.test(body.date))
    return res_.badRequest(ctx.res, 'date è obbligatorio (YYYY-MM-DD)');
  const item = closedModel.set(body.date, body.reason ?? null);
  res_.ok(ctx.res, item);
}

function remove(ctx) {
  const date = ctx.params.date;
  if (!RE_DATE.test(date))
    return res_.badRequest(ctx.res, 'Formato data non valido');
  const deleted = closedModel.remove(date);
  if (!deleted) return res_.notFound(ctx.res, `Giorno ${date} non trovato tra i giorni chiusi`);
  res_.noContent(ctx.res);
}

module.exports = { list, set, remove };
