/**
 * src/integrations/cerus/resolver.js — Risoluzione patient_uuid → dati anagrafici
 *
 * V3.M4.A1 (Fase A2). Astrazione che incapsula:
 *   - chiamata client.getById()
 *   - cache di processo (TTL)
 *   - placeholder graceful in caso di Cerus offline o paziente non trovato
 *
 * Uso tipico (dai controller agenda):
 *   const { resolver } = require('../../integrations/cerus');
 *   const map = await resolver.resolveMany(uuids);
 *   row.patient = map.get(row.patient_uuid) || resolver.placeholder(row.patient_uuid);
 */
'use strict';

const client = require('./client');
const { TtlCache } = require('./cache');

const cache = new TtlCache({ ttlMs: 30 * 1000, max: 500 });

/**
 * placeholder(uuid) — entità anagrafica "vuota" da usare quando l'uuid non è
 * risolvibile (Cerus offline, 404, errore di mapping). Garantisce la stessa
 * shape di mapPatient() perché il front-end non vada in NPE.
 */
function placeholder(uuid) {
  return {
    id:             null,
    cerus_uuid:     uuid || null,
    codice_fiscale: null,
    nome:           null,
    cognome:        null,
    nome_completo:  '— (paziente non disponibile)',
    data_nascita:   null,
    luogo_nascita:  null,
    sesso:          null,
    indirizzo:      null,
    telefono:       null,
    email:          null,
    _unresolved:    true
  };
}

/**
 * resolve(uuid) → Promise<mappedPatient | placeholder>
 * Mai rigetta: in caso di errore restituisce placeholder con _unresolved=true.
 */
async function resolve(uuid) {
  if (!uuid) return placeholder(null);

  const cached = cache.get(uuid);
  if (cached) return cached;

  if (!client.isConfigured()) return placeholder(uuid);

  try {
    const result = await client.getById(uuid);
    const data = result && result.data;
    if (!data) {
      const ph = placeholder(uuid);
      cache.set(uuid, ph);   // memorizziamo anche i 404 per non martellare
      return ph;
    }
    cache.set(uuid, data);
    return data;
  } catch (err) {
    // Non propaghiamo: i controller agenda devono restare tolleranti.
    const ph = placeholder(uuid);
    if (err && err.message) ph._error = err.message;
    return ph;
  }
}

/**
 * resolveMany(uuids) → Promise<Map<uuid, mapped>>
 * Sequenziale (per non saturare Cerus); con cache TTL i ri-fetch sono ridotti.
 * Nota: quando Cerus esporrà POST /api/v1/patients/by-uuids (vedi 03-to-be.md)
 * questa funzione passerà a una singola chiamata batch.
 */
async function resolveMany(uuids) {
  const out = new Map();
  if (!uuids || !uuids.length) return out;

  const unique = [...new Set(uuids.filter(Boolean))];
  for (const uuid of unique) {
    out.set(uuid, await resolve(uuid));
  }
  return out;
}

/**
 * invalidate(uuid) — da chiamare dopo una mutazione su Cerus (in futuro).
 */
function invalidate(uuid) {
  if (uuid) cache.delete(uuid);
  else cache.clear();
}

function stats() { return cache.stats(); }

/**
 * enrichRows(rows, opts) — aggiunge il campo `patient` (dati Cerus live) a
 * ogni riga che contenga un uuid valido. Non modifica i campi legacy
 * (`patient_name`/`phone`/`birth_date`): verranno deprecati gradualmente
 * (Fasi A3-A5 della migrazione).
 *
 * opts.uuidField — default 'patient_uuid'
 *
 * Tolerante: se Cerus non è configurato o il lookup fallisce, le righe
 * ricevono comunque un `patient` = placeholder (con `_unresolved: true`).
 */
async function enrichRows(rows, opts) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const field = (opts && opts.uuidField) || 'patient_uuid';
  const uuids = [...new Set(rows.map((r) => r && r[field]).filter(Boolean))];
  if (!uuids.length) return rows;
  const map = await resolveMany(uuids);
  return rows.map((r) => {
    if (!r || !r[field]) return r;
    return { ...r, patient: map.get(r[field]) || placeholder(r[field]) };
  });
}

async function enrichRow(row, opts) {
  if (!row) return row;
  const field = (opts && opts.uuidField) || 'patient_uuid';
  if (!row[field]) return row;
  const patient = await resolve(row[field]);
  return { ...row, patient };
}

/**
 * deriveLegacyFields(body, opts) — V3.M4.A1.A3
 *
 * Se `body.patient_uuid` è presente, risolve il paziente in Cerus e restituisce
 * il body con i campi legacy sovrascritti dai valori canonici Cerus (il server
 * è l'autorità, non il client).
 *
 * opts.fieldMap — override dei nomi delle colonne legacy. Default:
 *   {
 *     name:       'patient_name',   // → p.nome_completo
 *     fiscalCode: 'patient_id',     // → p.codice_fiscale
 *     phone:      'phone',          // → p.telefono
 *     birthDate:  'birth_date',     // → p.data_nascita
 *     gender:     null              // opzionale → p.sesso
 *   }
 * Tabelle come `transfusion_requests` passano { name:'paziente', fiscalCode:'cf',
 * birthDate:'nascita', gender:'sesso', phone: null }.
 *
 * Ritorna:
 *   - `{ ok: true, body }` — uuid valido e risolto (o uuid assente: body invariato).
 *   - `{ ok: false, status, error }` — uuid presente ma non risolvibile (404/502).
 */
async function deriveLegacyFields(body, opts) {
  if (!body || !body.patient_uuid) return { ok: true, body };

  const fm = Object.assign({
    name:       'patient_name',
    fiscalCode: 'patient_id',
    phone:      'phone',
    birthDate:  'birth_date',
    gender:     null
  }, (opts && opts.fieldMap) || {});

  const p = await resolve(body.patient_uuid);
  if (!p || p._unresolved) {
    return {
      ok: false,
      status: p && p._error ? 502 : 404,
      error: p && p._error
        ? `Cerus non raggiungibile: ${p._error}`
        : `patient_uuid ${body.patient_uuid} non trovato in Cerus`
    };
  }

  const out = { ...body };
  out.patient_uuid = p.cerus_uuid;
  if (fm.name)       out[fm.name]       = p.nome_completo || '';
  if (fm.fiscalCode) out[fm.fiscalCode] = p.codice_fiscale || null;
  if (fm.phone      && (fm.phone in out || p.telefono))         out[fm.phone]     = p.telefono || null;
  if (fm.birthDate  && (fm.birthDate in out || p.data_nascita)) out[fm.birthDate] = p.data_nascita || null;
  if (fm.gender     && (fm.gender in out || p.sesso))           out[fm.gender]    = p.sesso || null;
  return { ok: true, body: out };
}

module.exports = {
  resolve,
  resolveMany,
  enrichRow,
  enrichRows,
  deriveLegacyFields,
  placeholder,
  invalidate,
  stats
};
