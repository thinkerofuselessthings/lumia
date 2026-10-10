'use strict';

const serviceModel = require('../models/service');
const res_         = require('../utils/response');

function list(ctx) {
  const siteId = ctx.query.get('site_id');
  const type   = ctx.query.get('type');
  let data;
  if (type)   data = serviceModel.getByType(type);
  else if (siteId) data = serviceModel.getBySite(parseInt(siteId, 10));
  else        data = serviceModel.getAll();
  res_.ok(ctx.res, data, { count: data.length });
}

function getOne(ctx) {
  const id = parseInt(ctx.params.id, 10);
  const svc = serviceModel.getById(id);
  if (!svc) return res_.notFound(ctx.res, `Prestazione #${id} non trovata`);
  res_.ok(ctx.res, svc);
}

function create(ctx) {
  const body = ctx.body;
  if (!body.code || typeof body.code !== 'string' || !body.code.trim())
    body.code = 'SVC-' + Date.now();
  if (!body.description || typeof body.description !== 'string' || !body.description.trim())
    return res_.badRequest(ctx.res, 'description è obbligatorio');

  const validTypes = ['visita', 'terapia', 'prestazione'];
  if (body.type && !validTypes.includes(body.type))
    return res_.badRequest(ctx.res, `type deve essere uno tra: ${validTypes.join(', ')}`);

  try {
    const svc = serviceModel.create({
      code:         body.code.trim(),
      description:  body.description.trim(),
      type:         body.type || 'prestazione',
      duration_min: body.duration_min || 30,
      price:        body.price ?? null,
      site_id:      body.site_id ?? null,
      sort_order:   body.sort_order ?? 0,
      active:       body.active ?? 1,
    });
    res_.created(ctx.res, svc);
  } catch (err) {
    if (err.message?.includes('UNIQUE'))
      return res_.conflict(ctx.res, `Prestazione con codice "${body.code}" già esistente per questa sede`);
    throw err;
  }
}

function update(ctx) {
  const id = parseInt(ctx.params.id, 10);
  const body = ctx.body;

  const validTypes = ['visita', 'terapia', 'prestazione'];
  if (body.type && !validTypes.includes(body.type))
    return res_.badRequest(ctx.res, `type deve essere uno tra: ${validTypes.join(', ')}`);

  try {
    const svc = serviceModel.update(id, body);
    if (!svc) return res_.notFound(ctx.res, `Prestazione #${id} non trovata`);
    res_.ok(ctx.res, svc);
  } catch (err) {
    if (err.message?.includes('UNIQUE'))
      return res_.conflict(ctx.res, `Prestazione con quel codice già esistente per questa sede`);
    throw err;
  }
}

function remove(ctx) {
  const id = parseInt(ctx.params.id, 10);
  const svc = serviceModel.getById(id);
  if (!svc) return res_.notFound(ctx.res, `Prestazione #${id} non trovata`);
  serviceModel.remove(id);
  res_.noContent(ctx.res);
}

module.exports = { list, getOne, create, update, remove };
