'use strict';

const { getAgendaDb } = require('../db');

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findByDate:     db.prepare('SELECT * FROM day_room_overrides WHERE date = ?'),
      findByDateRoom: db.prepare('SELECT * FROM day_room_overrides WHERE date = ? AND room_id = ?'),
      findByRange:    db.prepare('SELECT * FROM day_room_overrides WHERE date BETWEEN ? AND ?'),
      upsert:         db.prepare(`
        INSERT INTO day_room_overrides (date, room_id, is_open)
        VALUES (@date, @room_id, @is_open)
        ON CONFLICT(date, room_id) DO UPDATE SET is_open = @is_open
      `),
      delete:         db.prepare('DELETE FROM day_room_overrides WHERE date = ? AND room_id = ?'),
      deleteByDate:   db.prepare('DELETE FROM day_room_overrides WHERE date = ?'),
    };
  }
  return _stmts;
}

function getByDate(date)             { return stmts().findByDate.all(date); }
function getByDateRoom(date, roomId) { return stmts().findByDateRoom.get(date, roomId) ?? null; }
function getByRange(from, to)        { return stmts().findByRange.all(from, to); }

function set(date, roomId, isOpen) {
  stmts().upsert.run({ date, room_id: roomId, is_open: isOpen ? 1 : 0 });
  return stmts().findByDateRoom.get(date, roomId);
}

function remove(date, roomId) {
  const info = stmts().delete.run(date, roomId);
  return info.changes > 0;
}

function removeByDate(date) {
  const info = stmts().deleteByDate.run(date);
  return info.changes > 0;
}

function getEffectiveRoomIds(date, activeRooms) {
  const overrides = getByDate(date);
  const overrideMap = {};
  for (const o of overrides) overrideMap[o.room_id] = o.is_open;

  return activeRooms.filter(room => {
    if (overrideMap[room.id] !== undefined) return !!overrideMap[room.id];
    return !!room.active;
  }).map(r => r.id);
}

module.exports = { getByDate, getByDateRoom, getByRange, set, remove, removeByDate, getEffectiveRoomIds };
