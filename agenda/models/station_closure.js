'use strict';

const { getAgendaDb } = require('../db');

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findById:    db.prepare('SELECT * FROM station_closures WHERE id = ?'),
      findByRoom:  db.prepare('SELECT * FROM station_closures WHERE room_id = ? ORDER BY date_start ASC'),
      findByRange: db.prepare('SELECT * FROM station_closures WHERE room_id = ? AND date_end >= ? AND date_start <= ? ORDER BY date_start ASC'),
      findByRooms: db.prepare('SELECT * FROM station_closures WHERE room_id IN (SELECT value FROM json_each(?)) AND date_end >= ? AND date_start <= ? ORDER BY date_start ASC'),
      insert:      db.prepare('INSERT INTO station_closures (room_id, date_start, date_end, time_start, time_end, reason_category, reason_note, recurrence_type, recurrence_pattern) VALUES (@room_id, @date_start, @date_end, @time_start, @time_end, @reason_category, @reason_note, @recurrence_type, @recurrence_pattern)'),
      update:      db.prepare('UPDATE station_closures SET date_start=@date_start, date_end=@date_end, time_start=@time_start, time_end=@time_end, reason_category=@reason_category, reason_note=@reason_note, recurrence_type=@recurrence_type, recurrence_pattern=@recurrence_pattern WHERE id=@id'),
      delete:      db.prepare('DELETE FROM station_closures WHERE id = ?'),
    };
  }
  return _stmts;
}

function getById(id)                    { return stmts().findById.get(id) ?? null; }
function getByRoom(roomId)              { return stmts().findByRoom.all(roomId); }
function getByRange(roomId, from, to)   { return stmts().findByRange.all(roomId, from, to); }
function getByRoomsRange(roomIds, from, to) { return stmts().findByRooms.all(JSON.stringify(roomIds), from, to); }

function create(data) {
  const result = stmts().insert.run({
    room_id:            data.room_id,
    date_start:         data.date_start,
    date_end:           data.date_end,
    time_start:         data.time_start || null,
    time_end:           data.time_end || null,
    reason_category:    data.reason_category || 'altro',
    reason_note:        data.reason_note || null,
    recurrence_type:    data.recurrence_type || null,
    recurrence_pattern: data.recurrence_pattern || null,
  });
  return getById(result.lastInsertRowid);
}

function bulkCreate(items) {
  const tx = getAgendaDb().transaction((items) => {
    const results = [];
    for (const data of items) results.push(create(data));
    return results;
  });
  return tx(items);
}

function update(id, data) {
  const existing = getById(id);
  if (!existing) return null;
  stmts().update.run({
    id,
    date_start:         data.date_start ?? existing.date_start,
    date_end:           data.date_end ?? existing.date_end,
    time_start:         data.time_start !== undefined ? data.time_start : existing.time_start,
    time_end:           data.time_end !== undefined ? data.time_end : existing.time_end,
    reason_category:    data.reason_category ?? existing.reason_category,
    reason_note:        data.reason_note !== undefined ? data.reason_note : existing.reason_note,
    recurrence_type:    data.recurrence_type !== undefined ? data.recurrence_type : existing.recurrence_type,
    recurrence_pattern: data.recurrence_pattern !== undefined ? data.recurrence_pattern : existing.recurrence_pattern,
  });
  return getById(id);
}

function remove(id) {
  const info = stmts().delete.run(id);
  return info.changes > 0;
}

module.exports = { getById, getByRoom, getByRange, getByRoomsRange, create, bulkCreate, update, remove };
