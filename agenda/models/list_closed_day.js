'use strict';

const { getAgendaDb } = require('../db');

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findAll:      db.prepare('SELECT * FROM list_closed_days ORDER BY date ASC'),
      findByDate:   db.prepare('SELECT * FROM list_closed_days WHERE date = ?'),
      findByRange:  db.prepare('SELECT * FROM list_closed_days WHERE date BETWEEN ? AND ? ORDER BY date ASC'),
      insert:       db.prepare('INSERT OR IGNORE INTO list_closed_days (date, reason) VALUES (@date, @reason)'),
      update:       db.prepare('UPDATE list_closed_days SET reason = @reason WHERE date = @date'),
      deleteByDate: db.prepare('DELETE FROM list_closed_days WHERE date = ?'),
    };
  }
  return _stmts;
}

function getAll()            { return stmts().findAll.all(); }
function getByDate(date)     { return stmts().findByDate.get(date) ?? null; }
function getByRange(from,to) { return stmts().findByRange.all(from, to); }

function set(date, reason) {
  const existing = getByDate(date);
  if (existing) {
    stmts().update.run({ date, reason: reason ?? existing.reason });
  } else {
    stmts().insert.run({ date, reason: reason ?? null });
  }
  return getByDate(date);
}

function remove(date) {
  const existing = getByDate(date);
  if (!existing) return false;
  stmts().deleteByDate.run(date);
  return true;
}

module.exports = { getAll, getByDate, getByRange, set, remove };
