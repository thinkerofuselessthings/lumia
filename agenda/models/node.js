'use strict';

const { getAgendaDb } = require('../db');

const VALID_TYPES = ['macroarea', 'area', 'sede', 'flusso', 'postazione'];
const TYPE_HIERARCHY = { macroarea: null, area: 'macroarea', sede: 'area', flusso: 'sede', postazione: 'flusso' };
const CHILD_TYPE = { macroarea: 'area', area: 'sede', sede: 'flusso', flusso: 'postazione', postazione: null };

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findAll:       db.prepare('SELECT * FROM nodes ORDER BY sort_order ASC, id ASC'),
      findByType:    db.prepare('SELECT * FROM nodes WHERE type = ? ORDER BY sort_order ASC, id ASC'),
      findById:      db.prepare('SELECT * FROM nodes WHERE id = ?'),
      findChildren:  db.prepare('SELECT * FROM nodes WHERE parent_id = ? ORDER BY sort_order ASC, id ASC'),
      findActiveChildren: db.prepare('SELECT * FROM nodes WHERE parent_id = ? AND active = 1 ORDER BY sort_order ASC, id ASC'),
      findRoots:     db.prepare('SELECT * FROM nodes WHERE parent_id IS NULL ORDER BY sort_order ASC, id ASC'),
      insert:        db.prepare('INSERT INTO nodes (parent_id, type, name, station_type, sort_order, active, schedule) VALUES (@parent_id, @type, @name, @station_type, @sort_order, @active, @schedule)'),
      update:        db.prepare('UPDATE nodes SET name = @name, station_type = @station_type, sort_order = @sort_order, active = @active, schedule = @schedule WHERE id = @id'),
      delete:        db.prepare('DELETE FROM nodes WHERE id = ?'),
      maxOrder:      db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM nodes WHERE parent_id IS ?'),
      descendants:   db.prepare(`
        WITH RECURSIVE desc AS (
          SELECT * FROM nodes WHERE id = ?
          UNION ALL
          SELECT n.* FROM nodes n JOIN desc d ON n.parent_id = d.id
        ) SELECT * FROM desc ORDER BY sort_order ASC, id ASC
      `),
      ancestors:     db.prepare(`
        WITH RECURSIVE anc AS (
          SELECT * FROM nodes WHERE id = ?
          UNION ALL
          SELECT n.* FROM nodes n JOIN anc a ON n.id = a.parent_id
        ) SELECT * FROM anc ORDER BY id ASC
      `),
    };
  }
  return _stmts;
}

function getAll()           { return stmts().findAll.all(); }
function getByType(type)    { return stmts().findByType.all(type); }
function getById(id)        { return stmts().findById.get(id) ?? null; }
function getChildren(id)    { return stmts().findChildren.all(id); }
function getActiveChildren(id) { return stmts().findActiveChildren.all(id); }
function getRoots()         { return stmts().findRoots.all(); }
function getDescendants(id) { return stmts().descendants.all(id); }
function getAncestors(id)   { return stmts().ancestors.all(id); }

function getTree() {
  const all = getAll();
  const map = new Map();
  for (const n of all) map.set(n.id, { ...n, children: [] });
  const roots = [];
  for (const n of all) {
    const node = map.get(n.id);
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function create({ parent_id, type, name, station_type, sort_order, active, schedule }) {
  if (!VALID_TYPES.includes(type)) throw new Error(`Tipo non valido: ${type}`);
  if (parent_id != null) {
    const parent = getById(parent_id);
    if (!parent) throw new Error(`Nodo padre #${parent_id} non trovato`);
    const expected = CHILD_TYPE[parent.type];
    if (expected !== type) throw new Error(`Un nodo "${parent.type}" può contenere solo "${expected}", non "${type}"`);
  } else if (type !== 'macroarea') {
    throw new Error('Solo i nodi "macroarea" possono essere radice');
  }
  const order = sort_order ?? (stmts().maxOrder.get(parent_id ?? null).max_order + 1);
  const st = type === 'postazione' ? (station_type || null) : null;
  const sched = type === 'postazione' ? (schedule || null) : null;
  const result = stmts().insert.run({ parent_id: parent_id ?? null, type, name: name.trim(), station_type: st, sort_order: order, active: active ?? 1, schedule: sched });
  return getById(result.lastInsertRowid);
}

function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;

  if (data.parent_id !== undefined && data.parent_id !== existing.parent_id) {
    const newParentId = data.parent_id;
    if (newParentId != null) {
      const parent = getById(newParentId);
      if (!parent) throw new Error(`Nodo padre #${newParentId} non trovato`);
      const expected = CHILD_TYPE[parent.type];
      if (expected !== existing.type) throw new Error(`Un nodo "${parent.type}" può contenere solo "${expected}", non "${existing.type}"`);
      const descendants = stmts().descendants.all(id);
      if (descendants.some(d => d.id === newParentId)) {
        throw new Error('Spostamento non consentito: creerebbe un ciclo nell\'albero');
      }
    } else if (existing.type !== 'macroarea') {
      throw new Error('Solo i nodi "macroarea" possono essere radice');
    }
    getAgendaDb().prepare('UPDATE nodes SET parent_id = ? WHERE id = ?').run(newParentId, id);
  }

  const merged = {
    name:       (data.name ?? existing.name).trim(),
    station_type: data.station_type !== undefined ? data.station_type : (existing.station_type ?? null),
    sort_order: data.sort_order ?? existing.sort_order,
    active:     data.active ?? existing.active,
    schedule:   data.schedule !== undefined ? data.schedule : (existing.schedule ?? null),
    id,
  };
  stmts().update.run(merged);
  return getById(id);
}

function remove(id) {
  const existing = getById(id);
  if (!existing) return false;
  stmts().delete.run(id);
  return true;
}

module.exports = {
  VALID_TYPES, TYPE_HIERARCHY, CHILD_TYPE,
  getAll, getByType, getById, getChildren, getActiveChildren, getRoots,
  getDescendants, getAncestors, getTree, create, update, remove,
};
