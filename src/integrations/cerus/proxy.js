/**
 * src/integrations/cerus/proxy.js — Proxy controller per gli endpoint Cerus
 *
 * V3.M4.A1 Fase A1: estratto da app/agenda/controllers/patients-cerus.js.
 * Espone:
 *   GET /api/cerus/patients              → list (search semplice)
 *   GET /api/cerus/patients/search       → searchAdvanced
 *   GET /api/cerus/patients/:id          → getOne
 *
 * Il vecchio path /api/agenda/patients/* resta come alias (back-compat) finché
 * non si arriva alla Fase A5 — vedi docs/v3/cerus/04-cerus-migration.md.
 */
'use strict';

const cerus = require('./client');
const res_  = require('../../../app/agenda/utils/response');

function serviceError(res, code, message) {
  var status = code === 'CERUS_NOT_CONFIGURED' ? 503 : 502;
  var body = JSON.stringify({ success: false, error: { code: code, message: message } });
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function list(ctx) {
  var q     = ctx.query.get('q');
  var limit = parseInt(ctx.query.get('limit'), 10) || 10;

  if (!cerus.isConfigured()) {
    return serviceError(ctx.res, 'CERUS_NOT_CONFIGURED', 'Integrazione Cerus non configurata');
  }

  cerus.search(q || '', limit)
    .then(function (result) {
      res_.ok(ctx.res, result.data, { count: result.data.length, total: result.total });
    })
    .catch(function (err) {
      console.error('[cerus/proxy] search error:', err.message);
      serviceError(ctx.res, 'CERUS_UNAVAILABLE', 'Servizio anagrafica non disponibile');
    });
}

function getOne(ctx) {
  var id = ctx.params.id;

  if (!cerus.isConfigured()) {
    return serviceError(ctx.res, 'CERUS_NOT_CONFIGURED', 'Integrazione Cerus non configurata');
  }

  cerus.getById(id)
    .then(function (result) {
      if (!result.data) return res_.notFound(ctx.res, 'Paziente non trovato in Cerus');
      res_.ok(ctx.res, result.data);
    })
    .catch(function (err) {
      console.error('[cerus/proxy] getById error:', err.message);
      if (err.status === 404) return res_.notFound(ctx.res, 'Paziente non trovato in Cerus');
      serviceError(ctx.res, 'CERUS_UNAVAILABLE', 'Servizio anagrafica non disponibile');
    });
}

function searchAdvanced(ctx) {
  if (!cerus.isConfigured()) {
    return serviceError(ctx.res, 'CERUS_NOT_CONFIGURED', 'Integrazione Cerus non configurata');
  }

  var params = {};
  ['first_name', 'last_name', 'fiscal_code', 'city', 'birth_date', 'gender', 'page', 'limit'].forEach(function (k) {
    var v = ctx.query.get(k);
    if (v) params[k] = v;
  });

  cerus.searchAdvanced(params)
    .then(function (result) {
      res_.ok(ctx.res, result.data, { count: result.data.length, total: result.total });
    })
    .catch(function (err) {
      console.error('[cerus/proxy] searchAdvanced error:', err.message);
      serviceError(ctx.res, 'CERUS_UNAVAILABLE', 'Servizio anagrafica non disponibile');
    });
}

function health(ctx) {
  var configured = cerus.isConfigured();
  var body = JSON.stringify({
    success: true,
    data: { service: 'cerus', configured: configured, ts: new Date().toISOString() }
  });
  ctx.res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  ctx.res.end(body);
}

/**
 * register(router) — monta gli alias /api/cerus/* sul router LUMIA.
 * Da chiamare da src/routes.js (vedi `init()`).
 */
function register(router) {
  const PREFIX = 'cerus';
  router.get(PREFIX + '/health',           health, { auth: false });
  router.get(PREFIX + '/patients/search',  searchAdvanced);
  router.get(PREFIX + '/patients',         list);
  router.get(PREFIX + '/patients/:id',     getOne);
}

module.exports = { list, getOne, searchAdvanced, health, register };
