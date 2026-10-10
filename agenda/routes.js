'use strict';

const ctrl      = require('./controllers/appointments');
const nodeCtrl  = require('./controllers/nodes');
const closedCtrl = require('./controllers/closed_days');
const droCtrl   = require('./controllers/day_room_overrides');
const svcCtrl   = require('./controllers/services');
const listCtrl  = require('./controllers/lists');
const leCtrl    = require('./controllers/list-entries');
const lcdCtrl   = require('./controllers/list_closed_days');
const elencoCtrl = require('./controllers/elenco');
const scCtrl    = require('./controllers/station_closures');
const soCtrl    = require('./controllers/station_openings');
const trasfCtrl = require('./controllers/transfusion');

const PREFIX = 'agenda';

/**
 * Register all agenda routes on the LUMIA router.
 * Routes are prefixed with `agenda/` so they respond at `/api/agenda/...`.
 */
function register(router) {
  const p = (path) => path ? `${PREFIX}/${path}` : PREFIX;

  // ── health ───────────────────────────────────────────────────────────────
  router.get(p('health'), (ctx) => {
    const { json } = require('../../src/http/response');
    json(ctx.res, { status: 'ok', service: 'agenda', ts: new Date().toISOString() });
  }, { auth: false });

  // ── elenco ───────────────────────────────────────────────────────────────
  router.get(p('elenco'), elencoCtrl.list);

  // ── nodes ────────────────────────────────────────────────────────────────
  router.get(p('nodes'),                    nodeCtrl.list);
  router.post(p('nodes'),                   nodeCtrl.create);
  router.get(p('nodes/:id/children'),       nodeCtrl.children);
  router.get(p('nodes/:id/descendants'),    nodeCtrl.descendants);
  router.get(p('nodes/:id/ancestors'),      nodeCtrl.ancestors);
  router.get(p('nodes/:id'),                nodeCtrl.getOne);
  router.put(p('nodes/:id'),                nodeCtrl.update);
  router.delete(p('nodes/:id'),             nodeCtrl.remove);

  // ── closed-days ──────────────────────────────────────────────────────────
  router.get(p('closed-days'),              closedCtrl.list);
  router.post(p('closed-days'),             closedCtrl.set);
  router.delete(p('closed-days/:date'),     closedCtrl.remove);

  // ── day-room-overrides ───────────────────────────────────────────────────
  router.get(p('day-room-overrides'),       droCtrl.list);
  router.post(p('day-room-overrides'),      droCtrl.set);
  router.delete(p('day-room-overrides'),    droCtrl.remove);
  router.post(p('day-room-overrides/bulk'), droCtrl.bulkSet);

  // ── services ─────────────────────────────────────────────────────────────
  router.get(p('services'),                 svcCtrl.list);
  router.post(p('services'),                svcCtrl.create);
  router.get(p('services/:id'),             svcCtrl.getOne);
  router.put(p('services/:id'),             svcCtrl.update);
  router.delete(p('services/:id'),          svcCtrl.remove);

  // ── appointments ─────────────────────────────────────────────────────────
  router.get(p('appointments/counts'),          ctrl.counts);
  router.get(p('appointments/counts-by-room'),  ctrl.countsByRoom);
  router.get(p('appointments/panoramica'),      ctrl.panoramica);
  router.get(p('appointments/slots'),           ctrl.slots);
  router.patch(p('appointments/reorder'),       ctrl.reorder);
  router.get(p('appointments'),                 ctrl.list);
  router.post(p('appointments'),            ctrl.create);
  router.get(p('appointments/:id'),         ctrl.getOne);
  router.put(p('appointments/:id'),         ctrl.update);
  router.delete(p('appointments/:id'),      ctrl.remove);
  router.patch(p('appointments/:id/move'),  ctrl.move);
  router.patch(p('appointments/:id/status'), ctrl.updateStatus);

  // ── transfusion ──────────────────────────────────────────────────────────
  router.get(p('transfusions'),                        trasfCtrl.listByDate);
  router.get(p('appointments/:id/transfusion'),    trasfCtrl.get);
  router.post(p('appointments/:id/transfusion'),   trasfCtrl.save);
  router.delete(p('appointments/:id/transfusion'), trasfCtrl.remove);

  // ── lists ────────────────────────────────────────────────────────────────
  router.get(p('lists'),                    listCtrl.list);
  router.post(p('lists'),                   listCtrl.create);
  router.get(p('lists/:id/slots'),          listCtrl.slots);
  router.get(p('lists/:id'),                listCtrl.getOne);
  router.put(p('lists/:id'),                listCtrl.update);
  router.delete(p('lists/:id'),             listCtrl.remove);

  // ── list-entries ─────────────────────────────────────────────────────────
  router.get(p('list-entries'),                     leCtrl.list);
  router.post(p('list-entries'),                    leCtrl.create);
  router.patch(p('list-entries/:id/promote'),       leCtrl.promote);
  router.patch(p('list-entries/:id/status'),        leCtrl.updateStatus);
  router.get(p('list-entries/:id'),                 leCtrl.getOne);
  router.put(p('list-entries/:id'),                 leCtrl.update);
  router.delete(p('list-entries/:id'),              leCtrl.remove);

  // V3.M4.A1.A5.b: alias legacy /api/agenda/patients/* RIMOSSI.
  // L'unico endpoint per l'anagrafica \u00e8 ora /api/cerus/patients/* (vedi
  // src/integrations/cerus/proxy.js, montato da src/routes.js).

  // ── list-closed-days ─────────────────────────────────────────────────────
  router.get(p('list-closed-days'),             lcdCtrl.list);
  router.post(p('list-closed-days'),            lcdCtrl.set);
  router.delete(p('list-closed-days/:date'),    lcdCtrl.remove);

  // ── station-closures ─────────────────────────────────────────────────────
  router.get(p('station-closures'),             scCtrl.list);
  router.post(p('station-closures'),            scCtrl.create);
  router.get(p('station-closures/bulk'),        scCtrl.listByRooms);
  router.post(p('station-closures/bulk'),       scCtrl.bulkCreate);
  router.get(p('station-closures/:id'),         scCtrl.getOne);
  router.put(p('station-closures/:id'),         scCtrl.update);
  router.delete(p('station-closures/:id'),      scCtrl.remove);

  // ── station-openings ─────────────────────────────────────────────────────
  router.get(p('station-openings'),             soCtrl.list);
  router.post(p('station-openings'),            soCtrl.create);
  router.delete(p('station-openings/:id'),      soCtrl.remove);
}

module.exports = { register };
