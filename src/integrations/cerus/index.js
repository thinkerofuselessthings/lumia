/**
 * src/integrations/cerus/index.js — Facade del modulo Cerus
 *
 * V3.M4.A1 Fase A1. Importi consigliati:
 *
 *   const { client, resolver, proxy, cache } = require('../integrations/cerus');
 *   await resolver.resolve(uuid);
 *   await client.searchAdvanced({ fiscal_code });
 *   proxy.register(router);
 *
 * NB: il vecchio require('app/agenda/utils/cerus-client') resta funzionante
 * tramite shim, ma il nuovo codice deve usare questo punto d'ingresso.
 */
'use strict';

const client   = require('./client');
const resolver = require('./resolver');
const proxy    = require('./proxy');
const cache    = require('./cache');

module.exports = { client, resolver, proxy, cache };
