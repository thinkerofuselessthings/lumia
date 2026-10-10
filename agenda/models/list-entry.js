'use strict';

const { getAgendaDb } = require('../db');
const { encField, safeDecField } = require('../../../src/lib/field-crypto');

// V3.M4.A9: campi PHI/PII cifrati at-rest
const ENC_FIELDS = ['patient_name', 'phone', 'birth_date', 'notes'];
function _encIn(obj) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const k of ENC_FIELDS) {
    if (k in out && out[k] !== null && out[k] !== undefined && out[k] !== '') out[k] = encField(out[k]);
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

/** Normalizza stringa vuota → null */
function etn(v) { return (typeof v === 'string' && v.trim() === '') ? null : v; }

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      findById: db.prepare('SELECT * FROM list_entries WHERE id = ?'),
      findByListAndDate: db.prepare('SELECT * FROM list_entries WHERE list_id = ? AND date = ? ORDER BY slot_time ASC, position ASC'),
      findByDate: db.prepare('SELECT * FROM list_entries WHERE date = ? ORDER BY list_id ASC, slot_time ASC, position ASC'),
      findByPatient: db.prepare('SELECT * FROM list_entries WHERE patient_id = ? ORDER BY date DESC, slot_time ASC'),
      countOnSlot: db.prepare("SELECT COUNT(*) AS cnt FROM list_entries WHERE list_id = ? AND date = ? AND slot_time = ? AND status NOT IN ('cancelled')"),
      maxPositionOnSlot: db.prepare('SELECT COALESCE(MAX(position), -1) AS max_pos FROM list_entries WHERE list_id = ? AND date = ? AND slot_time = ?'),
      insert: db.prepare(`
        INSERT INTO list_entries
          (list_id, date, slot_time, patient_name, patient_id, patient_uuid, phone, birth_date, notes, status, position,
           created_by, updated_by)
        VALUES
          (@list_id, @date, @slot_time, @patient_name, @patient_id, @patient_uuid, @phone, @birth_date, @notes, @status, @position,
           @created_by, @updated_by)
      `),
      update: db.prepare(`
        UPDATE list_entries SET
          patient_name = @patient_name, patient_id = @patient_id, patient_uuid = @patient_uuid,
          phone = @phone, birth_date = @birth_date, notes = @notes, slot_time = @slot_time,
          updated_by = @updated_by
        WHERE id = @id
      `),
      updateStatus: db.prepare('UPDATE list_entries SET status = @status WHERE id = @id'),
      setAppointmentId: db.prepare('UPDATE list_entries SET appointment_id = @appointment_id WHERE id = @id'),
      delete: db.prepare('DELETE FROM list_entries WHERE id = ?'),
      countByListAndDateRange: db.prepare('SELECT date, COUNT(*) AS count FROM list_entries WHERE list_id = ? AND date BETWEEN ? AND ? GROUP BY date'),
    };
  }
  return _stmts;
}

function getById(id) { return _decOut(stmts().findById.get(id) ?? null); }
function getByListAndDate(listId, date) { return _decRows(stmts().findByListAndDate.all(listId, date)); }
function getByDate(date) { return _decRows(stmts().findByDate.all(date)); }
function getByPatient(patientId) { return _decRows(stmts().findByPatient.all(patientId)); }

function create(data, userId = null) {
  const listModel = require('./list');
  const tx = getAgendaDb().transaction((data) => {
    const list = listModel.getById(data.list_id);
    if (!list) throw new Error(`Lista #${data.list_id} non trovata`);

    const { cnt } = stmts().countOnSlot.get(data.list_id, data.date, data.slot_time);
    if (cnt >= list.max_patients) {
      throw new Error(`Slot ${data.slot_time} pieno (max ${list.max_patients} pazienti)`);
    }

    const { max_pos } = stmts().maxPositionOnSlot.get(data.list_id, data.date, data.slot_time);

    const result = stmts().insert.run(_encIn({
      list_id:      data.list_id,
      date:         data.date,
      slot_time:    data.slot_time,
      patient_name: (data.patient_name || '').trim(),
      patient_id:   etn(data.patient_id) ?? null,
      patient_uuid: etn(data.patient_uuid) ?? null,
      phone:        etn(data.phone) ?? null,
      birth_date:   etn(data.birth_date) ?? null,
      notes:        etn(data.notes) ?? null,
      status:       data.status ?? 'booked',
      position:     max_pos + 1,
      created_by:   userId ?? null,
      updated_by:   userId ?? null,
    }));
    return getById(result.lastInsertRowid);
  });
  return tx(data);
}

function update(id, data, userId = null) {
  const existing = getById(id);
  if (!existing) return null;

  const merged = {
    patient_name: ('patient_name' in data ? data.patient_name : existing.patient_name || '').trim(),
    patient_id:   data.patient_id !== undefined ? etn(data.patient_id) : existing.patient_id,
    patient_uuid: data.patient_uuid !== undefined ? etn(data.patient_uuid) : existing.patient_uuid,
    phone:        data.phone !== undefined ? etn(data.phone) : existing.phone,
    birth_date:   data.birth_date !== undefined ? etn(data.birth_date) : existing.birth_date,
    notes:        data.notes !== undefined ? etn(data.notes) : existing.notes,
    slot_time:    data.slot_time ?? existing.slot_time,
    updated_by:   userId ?? null,
    id,
  };
  stmts().update.run(_encIn(merged));
  return getById(id);
}

function updateStatus(id, status) {
  stmts().updateStatus.run({ id, status });
  return getById(id);
}

function promote(id, apptData) {
  const listModel = require('./list');
  const apptModel = require('./appointment');
  const tx = getAgendaDb().transaction((id, apptData) => {
    const entry = getById(id);
    if (!entry) throw new Error(`Entry #${id} non trovata`);
    if (entry.appointment_id) throw new Error(`Entry #${id} già promossa ad appuntamento #${entry.appointment_id}`);

    const list = listModel.getById(entry.list_id);

    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const toTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    const endMin = toMin(entry.slot_time) + (list?.slot_interval_min || 30);

    const appt = apptModel.create({
      patient_name:     entry.patient_name,
      patient_id:       entry.patient_id,
      patient_uuid:     entry.patient_uuid ?? null,
      phone:            entry.phone,
      birth_date:       entry.birth_date ?? null,
      room_id:          apptData.room_id ?? null,
      type:             apptData.type || 'prestazione',
      title:            apptData.title || list?.name || 'Da lista',
      description:      apptData.description ?? null,
      prestazione_code: apptData.prestazione_code ?? null,
      doctor:           apptData.doctor ?? null,
      date:             entry.date,
      start_time:       entry.slot_time,
      end_time:         apptData.end_time || toTime(endMin),
      duration_min:     apptData.duration_min || list?.slot_interval_min || 30,
      status:           'scheduled',
      color:            apptData.color ?? null,
      notes:            entry.notes,
    });

    stmts().setAppointmentId.run({ id, appointment_id: appt.id });
    return { entry: getById(id), appointment: appt };
  });
  return tx(id, apptData);
}

function remove(id) {
  const existing = getById(id);
  if (!existing) return false;
  stmts().delete.run(id);
  return true;
}

function getCountsByListAndDateRange(listId, from, to) {
  return stmts().countByListAndDateRange.all(listId, from, to);
}

module.exports = {
  getById, getByListAndDate, getByDate, getByPatient,
  create, update, updateStatus, promote, remove,
  getCountsByListAndDateRange,
};
