'use strict';

const { getAgendaDb } = require('../db');
const { encField, safeDecField } = require('../../../src/lib/field-crypto');

// V3.M4.A9: campi PHI/PII cifrati at-rest (AES-256-GCM, prefisso `enc:v1:`).
// La lettura è trasparente per le righe legacy in chiaro.
const ENC_FIELDS = ['patient_name', 'phone', 'birth_date', 'notes', 'description'];

function _encIn(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const k of ENC_FIELDS) {
    if (k in out && out[k] !== null && out[k] !== undefined && out[k] !== '') {
      out[k] = encField(out[k]);
    }
  }
  return out;
}
function _decOut(row) {
  if (!row) return row;
  for (const k of ENC_FIELDS) {
    if (k in row && typeof row[k] === 'string') row[k] = safeDecField(row[k]);
  }
  return row;
}
function _decRows(rows) { return Array.isArray(rows) ? rows.map(_decOut) : rows; }

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findById: db.prepare('SELECT * FROM appointments WHERE id = ?'),
      findByDate: db.prepare('SELECT * FROM appointments WHERE date = ? ORDER BY start_time ASC, position ASC'),
      findByDateRange: db.prepare('SELECT * FROM appointments WHERE date BETWEEN ? AND ? ORDER BY date ASC, start_time ASC, position ASC'),
      findByPatient: db.prepare('SELECT * FROM appointments WHERE patient_id = ? ORDER BY date DESC, start_time ASC'),
      findByDateAndRoom: db.prepare('SELECT * FROM appointments WHERE date = ? AND room_id = ? ORDER BY start_time ASC, position ASC'),
      maxPositionOnSlot: db.prepare('SELECT COALESCE(MAX(position), -1) AS max_pos FROM appointments WHERE date = ? AND start_time = ? AND id != ?'),
      insert: db.prepare(`
        INSERT INTO appointments
          (patient_name, patient_id, patient_uuid, phone, birth_date, doctor, room_id, type, title, description,
           prestazione_code, date, start_time, end_time, duration_min, position, status, color, notes,
           created_by, updated_by)
        VALUES
          (@patient_name, @patient_id, @patient_uuid, @phone, @birth_date, @doctor, @room_id, @type, @title, @description,
           @prestazione_code, @date, @start_time, @end_time, @duration_min, @position, @status, @color, @notes,
           @created_by, @updated_by)
      `),
      update: db.prepare(`
        UPDATE appointments SET
          patient_name = @patient_name, patient_id = @patient_id, patient_uuid = @patient_uuid,
          phone = @phone, birth_date = @birth_date, doctor = @doctor, room_id = @room_id, type = @type, title = @title,
          description = @description, prestazione_code = @prestazione_code, date = @date,
          start_time = @start_time, end_time = @end_time, duration_min = @duration_min,
          status = @status, color = @color, notes = @notes,
          updated_by = @updated_by
        WHERE id = @id
      `),
      move: db.prepare(`
        UPDATE appointments SET
          date = @date, start_time = @start_time, end_time = @end_time,
          duration_min = @duration_min, room_id = @room_id, position = @position,
          updated_by = @updated_by
        WHERE id = @id
      `),
      updatePosition: db.prepare('UPDATE appointments SET position = @position WHERE id = @id'),
      updateStatus: db.prepare('UPDATE appointments SET status = @status WHERE id = @id'),
      delete: db.prepare('DELETE FROM appointments WHERE id = ?'),
      allOnDate: db.prepare("SELECT start_time, end_time, room_id FROM appointments WHERE date = ? AND status NOT IN ('cancelled','no_show') ORDER BY start_time ASC"),
      countByDateRange: db.prepare('SELECT date, COUNT(*) AS count FROM appointments WHERE date BETWEEN ? AND ? GROUP BY date'),
    };
  }
  return _stmts;
}

function getById(id) {
  return _decOut(stmts().findById.get(id) ?? null);
}

function getByDate(date) {
  return _decRows(stmts().findByDate.all(date));
}

function getByDateRange(from, to) {
  return _decRows(stmts().findByDateRange.all(from, to));
}

function getByPatient(patientId) {
  return _decRows(stmts().findByPatient.all(patientId));
}

function create(data, userId = null) {
  const { max_pos } = stmts().maxPositionOnSlot.get(data.date, data.start_time, 0);
  const position = max_pos + 1;

  const result = stmts().insert.run(_encIn({
    patient_name:     data.patient_name || '',
    patient_id:       data.patient_id ?? null,
    patient_uuid:     data.patient_uuid ?? null,
    phone:            data.phone ?? null,
    birth_date:       data.birth_date ?? null,
    doctor:           data.doctor ?? null,
    room_id:          data.room_id ?? null,
    type:             data.type || 'prestazione',
    title:            data.title || '',
    description:      data.description ?? null,
    prestazione_code: data.prestazione_code ?? null,
    date:             data.date,
    start_time:       data.start_time,
    end_time:         data.end_time,
    duration_min:     data.duration_min ?? null,
    position,
    status:           data.status || 'scheduled',
    color:            data.color ?? null,
    notes:            data.notes ?? null,
    created_by:       userId ?? null,
    updated_by:       userId ?? null,
  }));
  return getById(result.lastInsertRowid);
}

function update(id, data, userId = null) {
  const existing = getById(id); // già decifrato
  if (!existing) return null;

  const pick = (key) => key in data ? data[key] : existing[key];
  const merged = {
    patient_name: pick('patient_name'), patient_id: pick('patient_id'),
    patient_uuid: pick('patient_uuid'), phone: pick('phone'),
    birth_date: pick('birth_date'), doctor: pick('doctor'), room_id: pick('room_id'),
    type: pick('type'), title: pick('title'),
    description: pick('description'), prestazione_code: pick('prestazione_code'),
    date: pick('date'), start_time: pick('start_time'),
    end_time: pick('end_time'), duration_min: pick('duration_min'),
    status: pick('status'), color: pick('color'), notes: pick('notes'),
    updated_by: userId ?? null,
    id,
  };
  stmts().update.run(_encIn(merged));
  return getById(id);
}

function move(id, { date, start_time, end_time, duration_min, room_id }, userId = null) {
  const { max_pos } = stmts().maxPositionOnSlot.get(date, start_time, id);
  const existing = getById(id);
  stmts().move.run({ id, date, start_time, end_time, duration_min, room_id: room_id ?? existing?.room_id ?? null, position: max_pos + 1, updated_by: userId ?? null });
  return getById(id);
}

function reorder(items) {
  const tx = getAgendaDb().transaction((items) => {
    for (const { id, position } of items) {
      stmts().updatePosition.run({ id, position });
    }
  });
  tx(items);
  const first = getById(items[0].id);
  return first ? getByDate(first.date) : [];
}

function updateStatus(id, status) {
  stmts().updateStatus.run({ id, status });
  return getById(id);
}

function remove(id) {
  const existing = getById(id);
  if (!existing) return false;
  stmts().delete.run(id);
  return true;
}

function getFreeSlots(date, durationMin = 30, { dayStart = '08:00', dayEnd = '20:00' } = {}) {
  const toMin  = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const busy  = stmts().allOnDate.all(date).map(r => ({ s: toMin(r.start_time), e: toMin(r.end_time) }));
  const start = toMin(dayStart);
  const end   = toMin(dayEnd);
  const slots = [];

  let cursor = start;
  while (cursor + durationMin <= end) {
    const slotEnd = cursor + durationMin;
    const overlap = busy.some(b => cursor < b.e && slotEnd > b.s);
    if (!overlap) slots.push({ start_time: toTime(cursor), end_time: toTime(slotEnd) });
    cursor += durationMin;
  }
  return slots;
}

function getCountsByDateRange(from, to) {
  return stmts().countByDateRange.all(from, to);
}

module.exports = { getById, getByDate, getByDateRange, getByPatient, create, update, move, reorder, updateStatus, remove, getFreeSlots, getCountsByDateRange };
