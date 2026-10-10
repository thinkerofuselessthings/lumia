'use strict';

const { getAgendaDb } = require('../db');

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findById:    db.prepare('SELECT * FROM station_openings WHERE id = ?'),
      findByRoom:  db.prepare('SELECT * FROM station_openings WHERE room_id = ? ORDER BY date ASC'),
      findByRange: db.prepare('SELECT * FROM station_openings WHERE room_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC'),
      findByRooms: db.prepare('SELECT * FROM station_openings WHERE room_id IN (SELECT value FROM json_each(?)) AND date BETWEEN ? AND ? ORDER BY date ASC'),
      insert:      db.prepare('INSERT INTO station_openings (room_id, date, time_start, time_end, reason_note) VALUES (@room_id, @date, @time_start, @time_end, @reason_note)'),
      delete:      db.prepare('DELETE FROM station_openings WHERE id = ?'),
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
    room_id:     data.room_id,
    date:        data.date,
    time_start:  data.time_start || null,
    time_end:    data.time_end || null,
    reason_note: data.reason_note || null,
  });
  return getById(result.lastInsertRowid);
}

function remove(id) {
  const info = stmts().delete.run(id);
  return info.changes > 0;
}

module.exports = { getById, getByRoom, getByRange, getByRoomsRange, create, remove };
