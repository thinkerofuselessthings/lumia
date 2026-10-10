/**
 * Routes â€” LUMIA API routes using Router pattern.
 *
 * Mounts all LUMIA engines (diagnostic, scores, therapy) and
 * system endpoints (health, catalog, config, log).
 */

const { Router } = require("./http/router");
const { json, notFound } = require("./http/response");
const { AppError } = require("./errors/app-error");
const { handleError } = require("./errors/handle");
const { apiLimiter } = require("./middleware/rate-limiter");
const { enforceAuth } = require("./middleware/auth-gate");
const { env } = require("./config/env");
const { getClientIp } = require("./http/client-ip");
const authRoutes = require("../app/auth/routes");
const adminRoutes = require("../app/admin/routes");
const agendaRoutes = require("../app/agenda/routes");
const cerusIntegration = require("./integrations/cerus");

const router = new Router();

/* ── Shared API log (in-memory ring buffer) ── */
const API_LOG = [];
const MAX_LOG = 500;

// V3.M3.A21: chiavi sensibili che NON devono finire nel ring buffer.
const SENSITIVE_KEYS = new Set([
  "password", "old_password", "new_password",
  "token", "csrf_token", "session",
  "secret", "api_key", "apiKey",
  "authorization", "cookie",
]);

function sanitizeForLog(value, depth = 0) {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((v) => sanitizeForLog(v, depth + 1));
  if (typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "[REDACTED]" : sanitizeForLog(v, depth + 1);
  }
  return out;
}

const apiLog = {
  push(entry) {
    const safe = entry && typeof entry === "object"
      ? { ...entry, input: sanitizeForLog(entry.input) }
      : entry;
    API_LOG.push(safe);
    if (API_LOG.length > MAX_LOG) API_LOG.shift();
  },
  entries() { return API_LOG; },
};

/* â”€â”€ Engines holder (set by init) â”€â”€ */
let engines = {};

function setEngines(e) { engines = e; }
function getEngines() { return engines; }

/* â”€â”€ Auth routes (login, logout, check, verify-password) â”€â”€ */
authRoutes.register(router, { json, notFound });

/* â”€â”€ Admin routes (user management â€” admin-only) â”€â”€ */
adminRoutes.register(router, { json });
/* â"€â"€ Agenda routes (scheduling module) â"€â"€ */
agendaRoutes.register(router);

/* ── Cerus integration routes (alias /api/cerus/*, V3.M4.A1) ── */
cerusIntegration.proxy.register(router);
/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  System routes (no auth required)
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

router.get("health", (ctx) => {
  json(ctx.res, {
    ok: true,
    service: "lumia",
    version: "0.0.1",
    uptime: process.uptime(),
    engines: {
      diagnostic:    !!engines.CDBLPDCore,
      scores:        !!engines.LumiaScores,
      therapy_cll:   !!engines.CLLTherapyCore,
      therapy_dlbcl: !!engines.DLBCLTherapyCore,
      therapy_fl:    !!engines.FLTherapyCore,
      therapy_mcl:   !!engines.MCLTherapyCore,
    },
  });
}, { auth: false });

// V3.M4.B3: liveness probe minimal (per nginx/k8s — risponde sempre 200 se il
// processo è in vita; nessun side-effect, nessuna query DB).
router.get("health/lite", (ctx) => {
  json(ctx.res, { ok: true, uptime: process.uptime() });
}, { auth: false });
// V3.M5.B4: endpoint metriche in formato Prometheus text v0.0.4. Auth false per
// permettere lo scrape; in produzione esporre solo a IP fidati (vedi nginx allow).
router.get("metrics", (ctx) => {
  const metrics = require("./lib/metrics");
  ctx.res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4" });
  ctx.res.end(metrics.expose());
}, { auth: false });
// V3.M4.B3: readiness/health profondo (DB ping, agenda DB ping, disk free,
// ultimo backup). Richiede solo che l'auth sia disabilitata per essere usato
// dietro un load balancer; in produzione dovrebbe stare dietro IP allow-list
// di rete (non è esposto pubblicamente da LUMIA).
router.get("health/deep", (ctx) => {
  const fs = require("fs");
  const path = require("path");
  const out = { ok: true, service: "lumia", uptime: process.uptime(), checks: {} };

  // DB principale
  try {
    const { getDb, DB_PATH } = require("./db/instance");
    const r = getDb().prepare("SELECT 1 AS ok").get();
    let size = null;
    try { size = fs.statSync(DB_PATH).size; } catch {}
    out.checks.db = { ok: !!r && r.ok === 1, path: DB_PATH, size_bytes: size };
  } catch (e) {
    out.ok = false;
    out.checks.db = { ok: false, error: e.message };
  }

  // Agenda DB
  try {
    const { getAgendaDb, AGENDA_DB_PATH } = require("../app/agenda/db");
    const r = getAgendaDb().prepare("SELECT 1 AS ok").get();
    let size = null;
    try { size = fs.statSync(AGENDA_DB_PATH).size; } catch {}
    out.checks.agenda_db = { ok: !!r && r.ok === 1, path: AGENDA_DB_PATH, size_bytes: size };
  } catch (e) {
    out.ok = false;
    out.checks.agenda_db = { ok: false, error: e.message };
  }

  // Ultimo backup (best-effort: cerca il file più recente in data/backups/)
  try {
    const backupDir = path.resolve(process.cwd(), "data", "backups");
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .map((f) => {
          const full = path.join(backupDir, f);
          try { return { f, mtime: fs.statSync(full).mtimeMs, size: fs.statSync(full).size }; }
          catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => b.mtime - a.mtime);
      out.checks.last_backup = files[0]
        ? { file: files[0].f, mtime: new Date(files[0].mtime).toISOString(), size_bytes: files[0].size, count: files.length }
        : { file: null, count: 0 };
    } else {
      out.checks.last_backup = { file: null, count: 0 };
    }
  } catch (e) {
    out.checks.last_backup = { ok: false, error: e.message };
  }

  // Memoria processo
  const mem = process.memoryUsage();
  out.checks.memory = { rss: mem.rss, heap_used: mem.heapUsed, heap_total: mem.heapTotal };

  json(ctx.res, out, out.ok ? 200 : 503);
}, { auth: false });

// V3.M1.A1: requires session (any role); apiKey rimosso dalla response.
// La apiKey resta accessibile a client server-to-server tramite lumia.config.json
// o env LUMIA_API_KEY — non va mai esposta al browser.
router.get("config", (ctx) => {
  json(ctx.res, {
    ok: true,
    host: env("LUMIA_HOST", "127.0.0.1"),
    port: env("LUMIA_PORT", 3500),
    wsEnabled: false,
  });
}, { auth: true });

// V3.M1.A2: log API ring-buffer riservato agli admin.
router.get("log", (ctx) => {
  const limitStr = ctx.query.get("limit");
  const limit = Math.min(parseInt(limitStr, 10) || 50, MAX_LOG);
  json(ctx.res, { ok: true, entries: API_LOG.slice(-limit) });
}, { auth: true, role: "admin" });

router.get("catalog", (ctx) => {
  const catalog = {
    diagnostic: [
      { key: "b-lpd", endpoint: "/api/diagnostic/b-lpd", available: !!engines.CDBLPDCore },
    ],
    scores: engines.LumiaScores
      ? engines.LumiaScores.list().map(k => ({ key: k, endpoint: `/api/scores/${k}` }))
      : [],
    therapy: ["cll", "dlbcl", "fl", "mcl", "mm", "mds", "cmml", "aml"].map(k => ({
      key: k,
      endpoint: `/api/therapy/${k}`,
      available: !!{ cll: engines.CLLTherapyCore, dlbcl: engines.DLBCLTherapyCore, fl: engines.FLTherapyCore, mcl: engines.MCLTherapyCore }[k],
    })),
  };
  json(ctx.res, { ok: true, catalog });
}, { auth: false });

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  Diagnostic routes
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

router.get("diagnostic/:key", (ctx) => {
  const { key } = ctx.params;
  if (key !== "b-lpd") throw AppError.from("NOT_FOUND");
  const Core = engines.CDBLPDCore;
  if (!Core) throw AppError.from("ENGINE_UNAVAILABLE");
  json(ctx.res, {
    ok: true, engine: "diagnostic/b-lpd",
    description: "CD-Based B-LPD Diagnostic â€” immunophenotypic differential diagnosis",
    fields_required: [{
      name: "selections", type: "array",
      description: 'Array di {marker: string, state: string}',
      items: { marker: { type: "string", enum: Core.markers() }, state: { type: "string", enum: Core.states().map(s => s.key) } },
    }],
    markers_available: Core.markers(),
    states_available: Core.states(),
    diagnoses_available: Core.diagnoses(),
  });
}, { auth: false });

router.post("diagnostic/:key", (ctx) => {
  const { key } = ctx.params;
  if (key !== "b-lpd") throw AppError.from("NOT_FOUND");
  const Core = engines.CDBLPDCore;
  if (!Core) throw AppError.from("ENGINE_UNAVAILABLE");

  const selections = ctx.body && ctx.body.selections;
  if (!Array.isArray(selections) || selections.length === 0) {
    throw AppError.from("ENGINE_INVALID_INPUT", { field: "selections" });
  }
  const validMarkers = new Set(Core.markers());
  const validStates = new Set(Core.states().map(s => s.key));
  for (const sel of selections) {
    if (!sel.marker || !validMarkers.has(sel.marker)) throw AppError.from("VALIDATION_INVALID", { field: "marker", value: sel.marker });
    if (!sel.state || !validStates.has(sel.state)) throw AppError.from("VALIDATION_INVALID", { field: "state", value: sel.state });
  }

  const result = Core.compute(selections);
  const timestamp = new Date().toISOString();
  apiLog.push({ type: "REST", method: "POST", path: "/api/diagnostic/b-lpd", timestamp, input: { selections }, resultCount: result.entries.length });

  json(ctx.res, { ok: true, engine: "diagnostic/b-lpd", version: "0.1.0", timestamp, input: { selections }, result: { entries: result.entries, all: result.all }, meta: { markers_available: Core.markers(), states_available: Core.states(), diagnoses_available: Core.diagnoses() } });
}, { auth: false });

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  Scores routes
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const SCORE_PARAMS = {
  cllIPI:       { params: ["age", "b2m", "stage", "ighv", "tp53"], desc: "CLL-IPI (Lancet Oncol 2016)", booleans: true },
  flipi:        { params: ["age", "stage", "hb", "ldh", "nodes"], desc: "FLIPI (Blood 2004)", booleans: true },
  flipi2:       { params: ["age", "b2m", "bm", "hb", "ln"], desc: "FLIPI-2 (JCO 2009)", booleans: true },
  primaPI:      { params: ["b2m", "bm"], desc: "PRIMA-PI (Lancet Haematol 2017)", booleans: true },
  ipi:          { params: ["age", "ldh", "ecog", "stage", "extranodal"], desc: "IPI â€” Aggressive NHL (NEJM 1993)", booleans: true },
  cnsIPI:       { params: ["age", "ldh", "stage", "ecog", "extranodal", "renal"], desc: "CNS-IPI (Blood 2016)", booleans: true },
  sMIPI:        { params: ["age", "ecog", "ldh", "wbc"], desc: "S-MIPI (Blood 2008)", booleans: false, note: "Valori numerici 0-2" },
  mipiBiologic: { params: ["smipi", "ki67"], desc: "MIPI-b (+ Ki-67)", booleans: false },
  ipssR:        { params: ["cytogenetics", "blasts", "hb", "plt", "anc"], desc: "IPSS-R â€” MDS (Blood 2012)", booleans: false, note: "Valori numerici secondo tabella IPSS-R" },
  rISS:         { params: ["iss", "ldh", "highRiskFISH"], desc: "R-ISS â€” MM (JCO 2015)", booleans: false },
  filFitness:   { params: ["ecog", "cirs", "adl"], desc: "FIL Fitness (semplificato)", booleans: false, note: "Valori numerici" },
};

router.get("scores", (ctx) => {
  const Scores = engines.LumiaScores;
  if (!Scores) throw AppError.from("ENGINE_UNAVAILABLE");
  const list = Scores.list().map(key => {
    const p = SCORE_PARAMS[key] || {};
    return { key, endpoint: `/api/scores/${key}`, params: p.params, desc: p.desc, booleans: p.booleans, note: p.note || null };
  });
  json(ctx.res, { ok: true, engine: "scores", calculators: list });
}, { auth: false });

router.get("scores/:key", (ctx) => {
  const { key } = ctx.params;
  const Scores = engines.LumiaScores;
  if (!Scores || typeof Scores[key] !== "function") throw AppError.from("NOT_FOUND", { key });
  const info = SCORE_PARAMS[key] || { params: [], desc: key };
  json(ctx.res, { ok: true, engine: `scores/${key}`, description: info.desc, fields_required: info.params.map(p => ({ name: p, type: info.booleans ? "boolean" : "number", required: true })), note: info.note || null });
}, { auth: false });

router.post("scores/:key", (ctx) => {
  const { key } = ctx.params;
  const Scores = engines.LumiaScores;
  if (!Scores || typeof Scores[key] !== "function") throw AppError.from("NOT_FOUND", { key });
  const params = ctx.body || {};
  const info = SCORE_PARAMS[key];
  if (info) {
    const missing = info.params.filter(p => params[p] === undefined);
    if (missing.length) throw AppError.from("VALIDATION_REQUIRED", { missing });
  }
  const result = Scores[key](params);
  const timestamp = new Date().toISOString();
  apiLog.push({ type: "REST", method: "POST", path: `/api/scores/${key}`, timestamp, input: params, result: result.risk });
  json(ctx.res, { ok: true, engine: `scores/${key}`, version: "0.1.0", timestamp, input: params, result, meta: info || null });
}, { auth: false });

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  Therapy routes
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const THERAPY_META = {
  cll:   { desc: "CLL â€” Assistente terapeutico (ESMO + AIFA)", fields: [{ name: "genetics", type: "string[]" }, { name: "mutations", type: "object" }, { name: "fitness", type: "string" }, { name: "line", type: "string" }, { name: "age", type: "number" }] },
  dlbcl: { desc: "DLBCL â€” Assistente terapeutico (ESMO + AIFA)", fields: [{ name: "genetics", type: "string[]" }, { name: "mutations", type: "object" }, { name: "fitness", type: "string" }, { name: "line", type: "string" }, { name: "subtype", type: "string" }, { name: "ipi_score", type: "number" }] },
  fl:    { desc: "FL â€” Assistente terapeutico (ESMO + AIFA)", fields: [{ name: "genetics", type: "string[]" }, { name: "fitness", type: "string" }, { name: "line", type: "string" }, { name: "gelf_met", type: "boolean" }, { name: "flipi_score", type: "number" }, { name: "pod24", type: "boolean" }] },
  mcl:   { desc: "MCL â€” Assistente terapeutico (ESMO + AIFA)", fields: [{ name: "genetics", type: "string[]" }, { name: "fitness", type: "string" }, { name: "line", type: "string" }, { name: "variant", type: "string" }, { name: "mipi_score", type: "number" }] },
  mm:    { desc: "Multiple Myeloma (non ancora implementato)", fields: [] },
  mds:   { desc: "MDS (non ancora implementato)", fields: [] },
  cmml:  { desc: "CMML (non ancora implementato)", fields: [] },
  aml:   { desc: "AML (non ancora implementato)", fields: [] },
};

function getTherapyEngine(key) {
  return { cll: engines.CLLTherapyCore, dlbcl: engines.DLBCLTherapyCore, fl: engines.FLTherapyCore, mcl: engines.MCLTherapyCore }[key] || null;
}

router.get("therapy", (ctx) => {
  const list = Object.keys(THERAPY_META).map(key => ({
    key, endpoint: `/api/therapy/${key}`, available: !!getTherapyEngine(key), description: THERAPY_META[key].desc,
  }));
  json(ctx.res, { ok: true, engine: "therapy", modules: list });
}, { auth: false });

router.get("therapy/:key", (ctx) => {
  const { key } = ctx.params;
  const meta = THERAPY_META[key];
  if (!meta) throw AppError.from("MODULE_NOT_FOUND", { key });
  json(ctx.res, { ok: true, engine: `therapy/${key}`, available: !!getTherapyEngine(key), description: meta.desc, fields: meta.fields });
}, { auth: false });

router.post("therapy/:key", (ctx) => {
  const { key } = ctx.params;
  const meta = THERAPY_META[key];
  if (!meta) throw AppError.from("MODULE_NOT_FOUND", { key });
  const engine = getTherapyEngine(key);
  if (!engine || typeof engine.compute !== "function") throw AppError.from("ENGINE_UNAVAILABLE", { key });
  const input = ctx.body || {};
  const result = engine.compute(input);
  const timestamp = new Date().toISOString();
  apiLog.push({ type: "REST", method: "POST", path: `/api/therapy/${key}`, timestamp, input, resultSummary: result.summary || null });
  json(ctx.res, { ok: true, engine: `therapy/${key}`, version: "0.1.0", timestamp, input, result, meta: { fields: meta.fields } });
}, { auth: false });

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 *  Main API request handler
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function handleApiRequest(req, res, body) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const apiPath = url.pathname.replace("/api/", "").split("/").filter(Boolean).join("/");
  const method = req.method;

  try {
    const ip = getClientIp(req);
    if (!apiLimiter.check(ip)) throw AppError.from("RATE_LIMIT_API");

    const match = router.match(method, apiPath);
    if (!match) return notFound(res);

    apiLimiter.record(ip);

    // Dual auth: session cookie (browser) + X-API-Key (API clients)
    const { session } = enforceAuth(req, match, method, apiPath);

    const ctx = {
      req, res, body,
      params: match.params,
      query: url.searchParams,
      session,
      ip,
      userAgent: req.headers["user-agent"] || "",
    };

    // V3.M4.A1.A2: gli handler ora possono essere async — instradiamo gli
    // errori di una Promise rigettata verso handleError come per i sync throws.
    const result = match.handler(ctx);
    if (result && typeof result.then === "function") {
      return result.catch((err) => handleError(err, res));
    }
    return result;
  } catch (err) {
    return handleError(err, res);
  }
}

module.exports = { handleApiRequest, setEngines, getEngines, apiLog };
