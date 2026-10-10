'use strict';

const { getAgendaDb } = require('../db');

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findAll: db.prepare('SELECT * FROM lists ORDER BY sort_order ASC, id ASC'),
      findByFlusso: db.prepare('SELECT * FROM lists WHERE flusso_id = ? ORDER BY sort_order ASC, id ASC'),
      findActiveByFlusso: db.prepare('SELECT * FROM lists WHERE flusso_id = ? AND active = 1 ORDER BY sort_order ASC, id ASC'),
      findById: db.prepare('SELECT * FROM lists WHERE id = ?'),
      insert: db.prepare(`
        INSERT INTO lists
          (flusso_id, name, description, time_start, time_end, slot_interval_min,
           max_patients, recurrence_type, recurrence_pattern, active, sort_order)
        VALUES
          (@flusso_id, @name, @description, @time_start, @time_end, @slot_interval_min,
           @max_patients, @recurrence_type, @recurrence_pattern, @active, @sort_order)
      `),
      update: db.prepare(`
        UPDATE lists SET
          name = @name, description = @description, time_start = @time_start,
          time_end = @time_end, slot_interval_min = @slot_interval_min,
          max_patients = @max_patients, recurrence_type = @recurrence_type,
          recurrence_pattern = @recurrence_pattern, active = @active, sort_order = @sort_order
        WHERE id = @id
      `),
      delete: db.prepare('DELETE FROM lists WHERE id = ?'),
      maxOrder: db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM lists WHERE flusso_id = ?'),
    };
  }
  return _stmts;
}

const toMin  = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

function generateSlots(list) {
  const slots = [];
  let cursor = toMin(list.time_start);
  const end = toMin(list.time_end);
  while (cursor < end) {
    slots.push({ time: toTime(cursor), max_patients: list.max_patients });
    cursor += list.slot_interval_min;
  }
  return slots;
}

function isActiveOnDate(list, dateStr) {
  if (!list.active) return false;
  let pattern;
  try { pattern = JSON.parse(list.recurrence_pattern); } catch { return false; }
  const date = new Date(dateStr + 'T00:00:00');
  if (list.recurrence_type === 'weekly') {
    const dow = date.getDay() || 7;
    return pattern.includes(dow);
  }
  if (list.recurrence_type === 'monthly') {
    return pattern.includes(date.getDate());
  }
  return false;
}

function getAll() { return stmts().findAll.all(); }

function getByFlusso(flussoId, { activeOnly = false } = {}) {
  return activeOnly
    ? stmts().findActiveByFlusso.all(flussoId)
    : stmts().findByFlusso.all(flussoId);
}

function getById(id) { return stmts().findById.get(id) ?? null; }

function create(data) {
  const order = data.sort_order ?? (stmts().maxOrder.get(data.flusso_id).max_order + 1);
  const pattern = Array.isArray(data.recurrence_pattern)
    ? JSON.stringify(data.recurrence_pattern)
    : (data.recurrence_pattern || '[1,2,3,4,5]');

  const result = stmts().insert.run({
    flusso_id:          data.flusso_id,
    name:               (data.name || '').trim(),
    description:        data.description ?? null,
    time_start:         data.time_start || '08:00',
    time_end:           data.time_end || '13:00',
    slot_interval_min:  data.slot_interval_min || 30,
    max_patients:       data.max_patients || 1,
    recurrence_type:    data.recurrence_type || 'weekly',
    recurrence_pattern: pattern,
    active:             data.active ?? 1,
    sort_order:         order,
  });
  return getById(result.lastInsertRowid);
}

function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;

  const pattern = data.recurrence_pattern !== undefined
    ? (Array.isArray(data.recurrence_pattern) ? JSON.stringify(data.recurrence_pattern) : data.recurrence_pattern)
    : existing.recurrence_pattern;

  const merged = {
    name:               (data.name ?? existing.name).trim(),
    description:        data.description !== undefined ? data.description : existing.description,
    time_start:         data.time_start ?? existing.time_start,
    time_end:           data.time_end ?? existing.time_end,
    slot_interval_min:  data.slot_interval_min ?? existing.slot_interval_min,
    max_patients:       data.max_patients ?? existing.max_patients,
    recurrence_type:    data.recurrence_type ?? existing.recurrence_type,
    recurrence_pattern: pattern,
    active:             data.active ?? existing.active,
    sort_order:         data.sort_order ?? existing.sort_order,
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
  getAll, getByFlusso, getById, create, update, remove,
  generateSlots, isActiveOnDate,
};
