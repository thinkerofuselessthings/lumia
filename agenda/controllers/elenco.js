'use strict';

const { getAgendaDb } = require('../db');
const nodeModel = require('../models/node');
const res_      = require('../utils/response');
const { safeInt } = require('../utils/validate');

let _stmts;
function stmts() {
  if (!_stmts) {
    const db = getAgendaDb();
    _stmts = {
      apptByDateRangeAndRooms: db.prepare(`
        SELECT a.*, n.name AS room_name, 'appointment' AS source
        FROM appointments a
        LEFT JOIN nodes n ON a.room_id = n.id
        WHERE a.date BETWEEN @from AND @to
          AND a.room_id IN (SELECT value FROM json_each(@room_ids))
        ORDER BY a.date ASC, a.start_time ASC, a.position ASC
      `),
      entriesByDateRangeAndLists: db.prepare(`
        SELECT le.*, l.name AS list_name, l.flusso_id,
               nf.name AS flusso_name, 'list_entry' AS source
        FROM list_entries le
        JOIN lists l ON le.list_id = l.id
        LEFT JOIN nodes nf ON l.flusso_id = nf.id
        WHERE le.date BETWEEN @from AND @to
          AND l.flusso_id IN (SELECT value FROM json_each(@flusso_ids))
        ORDER BY le.date ASC, le.slot_time ASC, le.position ASC
      `),
    };
  }
  return _stmts;
}

function list(ctx) {
  const nodeIdStr = ctx.query.get('node_id');
  const date      = ctx.query.get('date');
  const from      = ctx.query.get('from');
  const to        = ctx.query.get('to');

  if (!nodeIdStr) return res_.badRequest(ctx.res, 'node_id è obbligatorio');

  const nid = safeInt(nodeIdStr);
  if (nid === null) return res_.badRequest(ctx.res, 'node_id deve essere un intero valido');

  const node = nodeModel.getById(nid);
  if (!node) return res_.notFound(ctx.res, `Nodo #${nodeIdStr} non trovato`);

  let dateFrom, dateTo;
  if (date) {
    dateFrom = dateTo = date;
  } else if (from && to) {
    if (from > to) return res_.badRequest(ctx.res, 'from deve precedere to');
    dateFrom = from;
    dateTo = to;
  } else {
    return res_.badRequest(ctx.res, 'Specificare date oppure from+to');
  }

  const descendants = nodeModel.getDescendants(nid);
  const postazioni = descendants.filter(n => n.type === 'postazione').map(n => n.id);
  const flussi     = descendants.filter(n => n.type === 'flusso').map(n => n.id);

  let appointments = [];
  if (postazioni.length > 0) {
    appointments = stmts().apptByDateRangeAndRooms.all({
      from: dateFrom,
      to:   dateTo,
      room_ids: JSON.stringify(postazioni),
    });
  }

  let listEntries = [];
  if (flussi.length > 0) {
    listEntries = stmts().entriesByDateRangeAndLists.all({
      from: dateFrom,
      to:   dateTo,
      flusso_ids: JSON.stringify(flussi),
    });
  }

  const ancestors = nodeModel.getAncestors(nid);
  const breadcrumb = ancestors.map(a => a.name).join(' › ');

  res_.ok(ctx.res, {
    node,
    breadcrumb,
    date_from: dateFrom,
    date_to: dateTo,
    appointments,
    list_entries: listEntries,
  }, {
    appointment_count: appointments.length,
    list_entry_count: listEntries.length,
    total: appointments.length + listEntries.length,
  });
}

module.exports = { list };
