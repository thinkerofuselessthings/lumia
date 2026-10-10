'use strict';

const APPOINTMENT_TYPES = ['visita', 'terapia', 'prestazione'];
const APPOINTMENT_STATI  = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];
const RE_DATE  = /^\d{4}-\d{2}-\d{2}$/;
const RE_TIME  = /^\d{2}:\d{2}$/;
const RE_HEX   = /^#[0-9A-Fa-f]{6}$/;
const RE_WEEK  = /^\d{4}-W\d{2}$/;   // es. 2025-W03

/**
 * Sanitizza una stringa rimuovendo tag HTML/script pericolosi.
 */
function sanitizeString(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
}

/**
 * Sanitizza tutti i campi stringa di un oggetto (primo livello).
 */
function sanitizeBody(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === 'string' ? sanitizeString(v) : v;
  }
  return out;
}

/**
 * parseInt sicuro: restituisce null se il risultato è NaN.
 */
function safeInt(value, radix = 10) {
  const n = parseInt(value, radix);
  return Number.isNaN(n) ? null : n;
}

function isValidDate(s) {
  if (!RE_DATE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function isValidTime(s) {
  if (!RE_TIME.test(s)) return false;
  const [h, m] = s.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * Valida i dati per la creazione di un appuntamento.
 * Ritorna { valid: true } oppure { valid: false, errors: [...] }
 */
function validateCreate(body) {
  const errors = [];

  // Campi obbligatori
  if (!body.patient_name?.trim()) errors.push('patient_name è obbligatorio');
  if (!body.title?.trim()) errors.push('title è obbligatorio');
  if (!body.type) errors.push('type è obbligatorio');
  if (!body.date) errors.push('date è obbligatorio');
  if (!body.start_time) errors.push('start_time è obbligatorio');
  if (!body.end_time) errors.push('end_time è obbligatorio');

  // Formato e semantica
  if (body.type && !APPOINTMENT_TYPES.includes(body.type))
    errors.push(`type deve essere uno di: ${APPOINTMENT_TYPES.join(', ')}`);

  if (body.date && !isValidDate(body.date))
    errors.push('date deve essere una data valida nel formato YYYY-MM-DD');

  if (body.start_time && !isValidTime(body.start_time))
    errors.push('start_time deve essere un orario valido nel formato HH:MM');

  if (body.end_time && !isValidTime(body.end_time))
    errors.push('end_time deve essere un orario valido nel formato HH:MM');

  if (body.start_time && body.end_time && RE_TIME.test(body.start_time) && RE_TIME.test(body.end_time)) {
    if (body.start_time >= body.end_time)
      errors.push('end_time deve essere successivo a start_time');
  }

  if (body.color && !RE_HEX.test(body.color))
    errors.push('color deve essere un colore esadecimale valido (es. #4A90D9)');

  if (body.birth_date != null && body.birth_date !== '' && !isValidDate(body.birth_date))
    errors.push('birth_date deve essere una data valida nel formato YYYY-MM-DD');

  if (body.status && !APPOINTMENT_STATI.includes(body.status))
    errors.push(`status deve essere uno di: ${APPOINTMENT_STATI.join(', ')}`);

  return errors.length ? { valid: false, errors } : { valid: true };
}

/**
 * Valida i dati per l'aggiornamento (campi parziali).
 */
function validateUpdate(body) {
  const errors = [];

  if (body.type !== undefined && !APPOINTMENT_TYPES.includes(body.type))
    errors.push(`type deve essere uno di: ${APPOINTMENT_TYPES.join(', ')}`);

  if (body.date !== undefined && !isValidDate(body.date))
    errors.push('date deve essere una data valida nel formato YYYY-MM-DD');

  if (body.start_time !== undefined && !isValidTime(body.start_time))
    errors.push('start_time deve essere un orario valido nel formato HH:MM');

  if (body.end_time !== undefined && !isValidTime(body.end_time))
    errors.push('end_time deve essere un orario valido nel formato HH:MM');

  if (body.start_time && body.end_time && RE_TIME.test(body.start_time) && RE_TIME.test(body.end_time)) {
    if (body.start_time >= body.end_time)
      errors.push('end_time deve essere successivo a start_time');
  }

  if (body.color !== undefined && !RE_HEX.test(body.color))
    errors.push('color deve essere un colore esadecimale valido');

  if (body.birth_date !== undefined && body.birth_date != null && body.birth_date !== '' && !isValidDate(body.birth_date))
    errors.push('birth_date deve essere una data valida nel formato YYYY-MM-DD');

  if (body.status !== undefined && !APPOINTMENT_STATI.includes(body.status))
    errors.push(`status deve essere uno di: ${APPOINTMENT_STATI.join(', ')}`);

  return errors.length ? { valid: false, errors } : { valid: true };
}

/**
 * Valida il payload per il move (drag temporale).
 */
function validateMove(body) {
  const errors = [];

  if (!body.date || !isValidDate(body.date))
    errors.push('date è obbligatorio (YYYY-MM-DD)');

  if (!body.start_time || !isValidTime(body.start_time))
    errors.push('start_time è obbligatorio (HH:MM)');

  if (!body.end_time || !isValidTime(body.end_time))
    errors.push('end_time è obbligatorio (HH:MM)');

  if (body.start_time && body.end_time && RE_TIME.test(body.start_time) && RE_TIME.test(body.end_time)) {
    if (body.start_time >= body.end_time)
      errors.push('end_time deve essere successivo a start_time');
  }

  if (body.room_id !== undefined && body.room_id !== null && (typeof body.room_id !== 'number' || !Number.isInteger(body.room_id) || body.room_id < 1))
    errors.push('room_id deve essere un intero positivo');

  return errors.length ? { valid: false, errors } : { valid: true };
}

/**
 * Valida il payload per il reorder (drag posizionale).
 * Atteso: { items: [{ id, position }, ...] }
 */
function validateReorder(body) {
  const errors = [];

  if (!Array.isArray(body.items) || body.items.length === 0)
    errors.push('items deve essere un array non vuoto');
  else {
    body.items.forEach((item, i) => {
      if (typeof item.id !== 'number' || !Number.isInteger(item.id) || item.id < 1)
        errors.push(`items[${i}].id deve essere un intero positivo`);
      if (typeof item.position !== 'number' || !Number.isInteger(item.position) || item.position < 0)
        errors.push(`items[${i}].position deve essere un intero >= 0`);
    });
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}

/**
 * Calcola duration_min da start_time e end_time (HH:MM).
 */
function calcDuration(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

/**
 * Ritorna la settimana ISO (YYYY-WXX) di una data.
 */
function parseWeekParam(param) {
  if (!param || !RE_WEEK.test(param)) return null;
  const [year, week] = param.split('-W').map(Number);
  // Lunedì della settimana ISO
  const simple    = new Date(year, 0, 1 + (week - 1) * 7);
  const dow       = simple.getDay();
  const monday    = new Date(simple);
  monday.setDate(simple.getDate() - (dow === 0 ? 6 : dow - 1));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

module.exports = { validateCreate, validateUpdate, validateMove, validateReorder, calcDuration, parseWeekParam, sanitizeString, sanitizeBody, safeInt };
