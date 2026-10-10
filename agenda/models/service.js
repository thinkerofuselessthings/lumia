'use strict';

const { getAgendaDb } = require('../db');

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      getAll:    db.prepare('SELECT * FROM services ORDER BY sort_order, code'),
      getActive: db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY sort_order, code'),
      getById:   db.prepare('SELECT * FROM services WHERE id = ?'),
      getByCode: db.prepare('SELECT * FROM services WHERE code = ? AND (site_id = ? OR (site_id IS NULL AND ? IS NULL))'),
      getBySite: db.prepare('SELECT * FROM services WHERE (site_id = ? OR site_id IS NULL) AND active = 1 ORDER BY sort_order, code'),
      getByType: db.prepare('SELECT * FROM services WHERE type = ? AND active = 1 ORDER BY sort_order, code'),
      insert:    db.prepare('INSERT INTO services (code, description, type, duration_min, price, site_id, sort_order, active) VALUES (?,?,?,?,?,?,?,?)'),
      update:    db.prepare('UPDATE services SET code=?, description=?, type=?, duration_min=?, price=?, site_id=?, sort_order=?, active=? WHERE id=?'),
      remove:    db.prepare('DELETE FROM services WHERE id = ?'),
    };
  }
  return _stmts;
}

module.exports = {
  getAll()           { return stmts().getAll.all(); },
  getActive()        { return stmts().getActive.all(); },
  getById(id)        { return stmts().getById.get(id); },
  getByCode(code, siteId) { return stmts().getByCode.get(code, siteId ?? null, siteId ?? null); },
  getBySite(siteId)  { return stmts().getBySite.all(siteId); },
  getByType(type)    { return stmts().getByType.all(type); },

  create({ code, description, type = 'prestazione', duration_min = 30, price = null, site_id = null, sort_order = 0, active = 1 }) {
    const info = stmts().insert.run(code, description, type, duration_min, price, site_id, sort_order, active ? 1 : 0);
    return stmts().getById.get(info.lastInsertRowid);
  },

  update(id, data) {
    const cur = stmts().getById.get(id);
    if (!cur) return null;
    stmts().update.run(
      'code' in data         ? data.code         : cur.code,
      'description' in data  ? data.description  : cur.description,
      'type' in data         ? data.type         : cur.type,
      'duration_min' in data ? data.duration_min : cur.duration_min,
      'price' in data        ? data.price        : cur.price,
      'site_id' in data      ? data.site_id      : cur.site_id,
      'sort_order' in data   ? data.sort_order   : cur.sort_order,
      'active' in data       ? (data.active ? 1 : 0) : cur.active,
      id
    );
    return stmts().getById.get(id);
  },

  remove(id) { return stmts().remove.run(id); },
};
