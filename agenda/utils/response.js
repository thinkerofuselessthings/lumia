'use strict';

/**
 * Invia una risposta JSON standardizzata.
 * Envelope: { success, data?, error?, meta? }
 */

function send(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type':  'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function ok(res, data, meta) {
  send(res, 200, { success: true, data, ...(meta && { meta }) });
}

function created(res, data) {
  send(res, 201, { success: true, data });
}

function noContent(res) {
  res.writeHead(204);
  res.end();
}

function badRequest(res, message, details) {
  send(res, 400, { success: false, error: { code: 'BAD_REQUEST', message, ...(details && { details }) } });
}

function notFound(res, message = 'Risorsa non trovata') {
  send(res, 404, { success: false, error: { code: 'NOT_FOUND', message } });
}

function conflict(res, message) {
  send(res, 409, { success: false, error: { code: 'CONFLICT', message } });
}

function methodNotAllowed(res) {
  send(res, 405, { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Metodo HTTP non supportato' } });
}

function internalError(res, err) {
  console.error('[Agenda] Internal error:', err);
  send(res, 500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'Errore interno del server' } });
}

// V3.M4.A1.A3: errori verso dipendenze esterne (es. Cerus offline/timeout)
function serviceUnavailable(res, message = 'Servizio esterno non disponibile') {
  send(res, 502, { success: false, error: { code: 'SERVICE_UNAVAILABLE', message } });
}

module.exports = { ok, created, noContent, badRequest, notFound, conflict, methodNotAllowed, internalError, serviceUnavailable };
