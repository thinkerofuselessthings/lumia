/**
 * src/integrations/cerus/client.js — HTTP client per Cerus patient API
 *
 * V3.M4.A1 Fase A1: estratto da app/agenda/utils/cerus-client.js verso il
 * modulo trasversale src/integrations/cerus/. Il vecchio path è ora un
 * thin re-export per back-compat.
 *
 * Risoluzione credenziali (in ordine):
 *   1. Variabili d'ambiente (CERUS_BASE_URL, CERUS_USER_ID, CERUS_USER_KEY, CERUS_TIMEOUT)
 *   2. lumia.config.json → cerus { baseUrl, userId, userKey, timeout }
 *
 * Tutti i dati anagrafici passano da qui (single mapping point).
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

/* ── Config ──────────────────────────────────────────────────────────── */

let _cfg = null;

function cfg() {
  if (_cfg) return _cfg;
  let file = {};
  // src/integrations/cerus → up 3 = repo root
  const cfgPath = path.join(__dirname, '..', '..', '..', 'lumia.config.json');
  try {
    const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    file = raw.cerus || {};
  } catch (_) {
    file = {};
  }
  const envTimeout = process.env.CERUS_TIMEOUT ? parseInt(process.env.CERUS_TIMEOUT, 10) : null;
  _cfg = {
    baseUrl: process.env.CERUS_BASE_URL || file.baseUrl || '',
    userId:  process.env.CERUS_USER_ID  || file.userId  || '',
    userKey: process.env.CERUS_USER_KEY || file.userKey || '',
    timeout: (envTimeout && !Number.isNaN(envTimeout)) ? envTimeout : (file.timeout || 5000)
  };
  return _cfg;
}

/* Solo per test: invalida la cache config (non usato in produzione). */
function _resetConfigCache() { _cfg = null; }

/* ── HTTP helper ─────────────────────────────────────────────────────── */

function cerusRequest(method, urlPath, qs) {
  const c = cfg();
  if (!c.baseUrl || !c.userId || !c.userKey) {
    return Promise.reject(new Error('Cerus non configurato (CERUS_BASE_URL/CERUS_USER_ID/CERUS_USER_KEY o lumia.config.json.cerus)'));
  }

  const base = c.baseUrl.replace(/\/+$/, '');
  let fullUrl = base + urlPath;
  if (qs) {
    const params = new URLSearchParams();
    for (const k of Object.keys(qs)) {
      if (qs[k] != null && qs[k] !== '') params.set(k, qs[k]);
    }
    const s = params.toString();
    if (s) fullUrl += '?' + s;
  }

  const parsed = new URL(fullUrl);
  const mod = parsed.protocol === 'https:' ? https : http;
  const timeout = c.timeout || 5000;

  return new Promise(function (resolve, reject) {
    const req = mod.request(fullUrl, {
      method: method,
      headers: {
        'X-User-Id': c.userId,
        'X-User-Key': c.userKey,
        'Accept': 'application/json'
      },
      timeout: timeout
    }, function (res) {
      const chunks = [];
      res.on('data', function (ch) { chunks.push(ch); });
      res.on('end', function () {
        const raw = Buffer.concat(chunks).toString('utf-8');
        try {
          const json = JSON.parse(raw);
          if (!json.success) {
            const err = new Error(json.error || 'Cerus error');
            err.status = res.statusCode;
            return reject(err);
          }
          resolve(json);
        } catch (_) {
          reject(new Error('Cerus: risposta non JSON'));
        }
      });
    });
    req.on('error', function (e) { reject(e); });
    req.on('timeout', function () { req.destroy(); reject(new Error('Cerus: timeout')); });
    req.end();
  });
}

/* ── Mapping Cerus → Agenda ──────────────────────────────────────────── */

function mapPatient(p) {
  if (!p) return null;

  var activeAddr = (p.addresses || []).find(function (a) { return a.is_active; });
  var activePhone = (p.contacts || []).find(function (c) {
    return c.is_active && (c.type === 'cellulare' || c.type === 'telefono');
  });
  var activeEmail = (p.contacts || []).find(function (c) {
    return c.is_active && c.type === 'email';
  });

  return {
    id:             p.id,
    cerus_uuid:     p.cerus_uuid,
    codice_fiscale: p.fiscal_code,
    nome:           p.first_name,
    cognome:        p.last_name,
    nome_completo:  p.last_name + ' ' + p.first_name,
    data_nascita:   p.birth_date || null,
    luogo_nascita:  p.birth_place || null,
    sesso:          p.gender || null,
    indirizzo:      activeAddr
      ? [activeAddr.address, activeAddr.city, activeAddr.province].filter(Boolean).join(', ')
      : null,
    telefono: activePhone ? activePhone.value : null,
    email:    activeEmail ? activeEmail.value : null
  };
}

function mapPatientList(p) {
  return {
    id:             p.id,
    cerus_uuid:     p.cerus_uuid,
    codice_fiscale: p.fiscal_code,
    nome:           p.first_name,
    cognome:        p.last_name,
    nome_completo:  p.last_name + ' ' + p.first_name,
    data_nascita:   p.birth_date || null,
    sesso:          p.gender || null
  };
}

/* ── Public API ──────────────────────────────────────────────────────── */

function search(q, limit) {
  return cerusRequest('GET', '/api/v1/patients', { q: q, limit: limit || 10 })
    .then(function (r) {
      return {
        success: true,
        data: (r.data || []).map(mapPatientList),
        total: r.total || 0
      };
    });
}

function getById(cerusId) {
  // Cerus accetta UUID via /by-uuid/:uuid e ID numerico via /:id
  var path = /^\d+$/.test(String(cerusId))
    ? '/api/v1/patients/' + encodeURIComponent(cerusId)
    : '/api/v1/patients/by-uuid/' + encodeURIComponent(cerusId);
  return cerusRequest('GET', path)
    .then(function (r) {
      return { success: true, data: mapPatient(r.data) };
    });
}

function searchAdvanced(params) {
  return cerusRequest('GET', '/api/v1/patients/search', params)
    .then(function (r) {
      return {
        success: true,
        data: (r.data || []).map(mapPatientList),
        total: r.total || 0
      };
    });
}

function isConfigured() {
  var c = cfg();
  return !!(c.baseUrl && c.userId && c.userKey);
}

module.exports = {
  search,
  getById,
  searchAdvanced,
  isConfigured,
  mapPatient,
  mapPatientList,
  _resetConfigCache
};
