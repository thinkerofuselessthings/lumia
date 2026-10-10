'use strict';

const model = require('../models/node');
const res_  = require('../utils/response');
const { safeInt } = require('../utils/validate');

function list(ctx) {
  const type      = ctx.query.get('type');
  const parent_id = ctx.query.get('parent_id');
  const tree      = ctx.query.get('tree');

  if (tree === '1') return res_.ok(ctx.res, model.getTree());
  if (parent_id === 'null' || parent_id === '') return res_.ok(ctx.res, model.getRoots());
  if (parent_id) {
    const pid = safeInt(parent_id);
    if (pid === null) return res_.badRequest(ctx.res, 'parent_id deve essere un intero valido');
    return res_.ok(ctx.res, model.getChildren(pid));
  }
  if (type) {
    if (!model.VALID_TYPES.includes(type)) return res_.badRequest(ctx.res, `Tipo non valido: ${type}`);
    return res_.ok(ctx.res, model.getByType(type));
  }
  return res_.ok(ctx.res, model.getAll());
}

function getOne(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const node = model.getById(id);
  if (!node) return res_.notFound(ctx.res, `Nodo #${id} non trovato`);
  res_.ok(ctx.res, node);
}

function children(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const node = model.getById(id);
  if (!node) return res_.notFound(ctx.res, `Nodo #${id} non trovato`);
  res_.ok(ctx.res, model.getChildren(id));
}

function descendants(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const node = model.getById(id);
  if (!node) return res_.notFound(ctx.res, `Nodo #${id} non trovato`);
  res_.ok(ctx.res, model.getDescendants(id));
}

function ancestors(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const node = model.getById(id);
  if (!node) return res_.notFound(ctx.res, `Nodo #${id} non trovato`);
  res_.ok(ctx.res, model.getAncestors(id));
}

function create(ctx) {
  const body = ctx.body;
  if (!body.name?.trim()) return res_.badRequest(ctx.res, 'name è obbligatorio');
  if (!body.type) return res_.badRequest(ctx.res, 'type è obbligatorio');

  try {
    const node = model.create({
      parent_id:    body.parent_id ?? null,
      type:         body.type,
      name:         body.name,
      station_type: body.station_type,
      sort_order:   body.sort_order,
      active:       body.active,
    });
    res_.created(ctx.res, node);
  } catch (e) {
    res_.badRequest(ctx.res, e.message);
  }
}

function update(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');

  try {
    const updated = model.update(id, ctx.body);
    if (!updated) return res_.notFound(ctx.res, `Nodo #${id} non trovato`);
    res_.ok(ctx.res, updated);
  } catch (e) {
    res_.badRequest(ctx.res, e.message);
  }
}

function remove(ctx) {
  const id = safeInt(ctx.params.id);
  if (id === null) return res_.badRequest(ctx.res, 'id non valido');
  const ok = model.remove(id);
  if (!ok) return res_.notFound(ctx.res, `Nodo #${id} non trovato`);
  res_.noContent(ctx.res);
}

module.exports = { list, getOne, children, descendants, ancestors, create, update, remove };
