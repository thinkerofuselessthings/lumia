/*! src/lib/engine-loader.js â€” Load browser *-core.js engines in Node.js
 *
 *  Strategia: crea un contesto sandbox con un finto `window` e `document`,
 *  poi esegue i file .js del browser al suo interno. I moduli si attaccano
 *  a `window.XXX` come farebbero nel browser â†’ noi li estraiamo dal sandbox.
 *
 *  Vantaggi:
 *    - Zero modifiche ai file browser esistenti
 *    - I core restano identici per UI e API
 *    - Ogni reload ricrea un sandbox pulito
 */
'use strict';

const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/* â”€â”€ Minimal browser shims â”€â”€ */
function createSandbox() {
  const win = {
    /* Timer shims */
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,

    /* Event shims */
    CustomEvent: class CustomEvent {
      constructor(type, opts) { this.type = type; this.detail = (opts && opts.detail) || null; }
    },
    dispatchEvent() {},
    addEventListener() {},

    /* Minimal document (some helpers reference document.addEventListener) */
    document: {
      addEventListener() {},
      removeEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      getElementById() { return null; },
      createElement() {
        return {
          setAttribute() {},
          appendChild() {},
          addEventListener() {},
          innerHTML: '',
          style: {}
        };
      }
    },

    /* Object.freeze, Object.entries etc. are globals */
    Object,
    Array,
    Set,
    Map,
    Number,
    String,
    Math,
    JSON,
    Error,
    TypeError,
    RegExp,
    Date,
    Promise,
    Symbol,
    Infinity,
    NaN,
    undefined,
    isNaN,
    isFinite,
    parseInt,
    parseFloat,
    encodeURIComponent,
    decodeURIComponent
  };

  /* window === self === globalThis */
  win.window = win;
  win.self   = win;
  win.global = win;
  win.globalThis = win;

  return win;
}

/* â”€â”€ Load a JS file into the sandbox â”€â”€ */
function loadFile(sandbox, filePath) {
  const abs  = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const code = fs.readFileSync(abs, 'utf-8');
  const ctx  = vm.createContext(sandbox);
  vm.runInContext(code, ctx, { filename: abs });
}

/* â”€â”€ Load all engines and return a structured object â”€â”€ */
function loadEngines() {
  const sandbox = createSandbox();

  /* Order matters: lumia-api first (registers namespaces) */
  const files = [
    'app/core/lumia-api.js',
    'app/core/lumia-events.js',
    'app/core/lumia-scores.js',
    'app/diagnostics/cd-b-lpd-data.js',
    'app/diagnostics/cd-b-lpd-core.js'
    /* therapy cores will be added as modules are developed:
     * 'app/diseases/cll/cll-therapy-core.js',
     * 'app/diseases/dlbcl/dlbcl-therapy-core.js',
     * 'app/diseases/fl/fl-therapy-core.js',
     * 'app/diseases/mcl/mcl-therapy-core.js',
     */
  ];

  /* Load therapy cores if they exist */
  const therapyCores = [
    'app/diseases/cll/cll-therapy-core.js',
    'app/diseases/dlbcl/dlbcl-therapy-core.js',
    'app/diseases/fl/fl-therapy-core.js',
    'app/diseases/mcl/mcl-therapy-core.js'
  ];

  for (const f of files) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) {
      try { loadFile(sandbox, abs); }
      catch (e) { console.warn(`[engine-loader] Failed to load ${f}:`, e.message); }
    }
  }

  for (const f of therapyCores) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs)) {
      try { loadFile(sandbox, abs); }
      catch (e) { console.warn(`[engine-loader] Failed to load ${f}:`, e.message); }
    }
  }

  /* Extract engines from sandbox */
  const engines = {
    /* Direct references */
    LumiaAPI:      sandbox.LumiaAPI      || null,
    LumiaScores:   sandbox.LumiaScores   || null,
    CDBLPDData:     sandbox.CDBLPDData     || null,
    CDBLPDCore:     sandbox.CDBLPDCore     || null,

    /* Therapy engines (will be populated as core files are loaded) */
    CLLTherapyCore:   sandbox.CLLTherapyCore   || null,
    DLBCLTherapyCore: sandbox.DLBCLTherapyCore || null,
    FLTherapyCore:    sandbox.FLTherapyCore    || null,
    MCLTherapyCore:   sandbox.MCLTherapyCore   || null
  };

  console.log('[engine-loader] Loaded engines:', Object.keys(engines).filter(k => engines[k] !== null).join(', '));

  return engines;
}

module.exports = { loadEngines, createSandbox, loadFile };
