/**
 * patients-cerus.js — SHIM di compatibilità
 *
 * Il proxy controller Cerus è stato spostato in src/integrations/cerus/proxy.js
 * (V3.M4.A1 Fase A1). Questo file è mantenuto per back-compat finché tutti
 * gli import legacy non saranno aggiornati (Fase A5).
 *
 * Nuovo import consigliato:
 *   const { proxy } = require('../../../src/integrations/cerus');
 */
'use strict';

module.exports = require('../../../src/integrations/cerus/proxy');
/**
 * patients-cerus.js — Proxy controller for Cerus patient API
 *
 * Replaces the local patients controller.
 * GET endpoints proxy to Cerus; CRUD is Cerus-only (no POST/PUT/DELETE).
 */
'use strict';

const cerus = require('../utils/cerus-client');
const res_  = require('../utils/response');

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
      console.error('[patients-cerus] search error:', err.message);
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
      console.error('[patients-cerus] getById error:', err.message);
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
      console.error('[patients-cerus] searchAdvanced error:', err.message);
      serviceError(ctx.res, 'CERUS_UNAVAILABLE', 'Servizio anagrafica non disponibile');
    });
}

module.exports = { list, getOne, searchAdvanced };
