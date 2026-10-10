/**
 * LUMIA — HTTP stress test
 *
 * Avvia il server LUMIA su una porta dedicata, bombarda i vari gruppi di
 * rotte/file con richieste concorrenti, raccoglie metriche (RPS, latenze,
 * error-rate) e termina il server.
 *
 *   node tests/stress-test.js [--duration=10] [--concurrency=32]
 *
 * Zero dipendenze esterne (solo moduli Node core).
 */
'use strict';

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

/* ─── CLI args ──────────────────────────────────────────────── */
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.+))?$/);
    return m ? [m[1], m[2] == null ? true : m[2]] : [a, true];
  })
);

const DURATION_MS   = Math.max(1, parseInt(args.duration, 10) || 8) * 1000;
const CONCURRENCY   = Math.max(1, parseInt(args.concurrency, 10) || 24);
const PORT          = parseInt(args.port, 10) || 3599;
const HOST          = '127.0.0.1';
const API_KEY       = 'stress-test-api-key-' + Date.now();
const SERVER_READY_TIMEOUT = 20000;

const REPO_ROOT = path.resolve(__dirname, '..');

/* ─── Scenari ───────────────────────────────────────────────── */
// Ciascuno scenario è { name, build: () => { method, path, headers?, body? } }
const scenarios = [
  {
    name: 'static/index.html',
    build: () => ({ method: 'GET', path: '/' })
  },
  {
    name: 'static/login.html',
    build: () => ({ method: 'GET', path: '/login.html' })
  },
  {
    name: 'static/css-bundle',
    cssFiles: [
      '/public/css/lumia-base.css', '/public/css/lumia-global.css', '/public/css/lumia-agenda.css',
      '/public/css/lumia-launcher.css', '/public/css/lumia-layer-system.css',
      '/public/css/lumia-tab-strip.css', '/public/css/lumia-library-shell.css',
      '/public/css/lumia-section-panel.css', '/public/css/login.css', '/public/css/loader.css'
    ],
    build(i) {
      const list = this.cssFiles;
      return { method: 'GET', path: list[i % list.length] };
    }
  },
  {
    name: 'static/js-app',
    jsFiles: [
      '/app/core/layer-system.js',
      '/app/core/lumia-launcher.js',
      '/app/core/lumia-tab-strip.js',
      '/app/core/lumia-library.js',
      '/app/core/lumia-api.js',
      '/app/core/lumia-csrf.js',
      '/app/shell/shell-init.js',
      '/app/shell/shell-navigation.js',
      '/app/agenda/ui/agenda-main.js',
      '/app/agenda/ui/agenda-config.js',
      '/app/agenda/ui/agenda-panoramica.js',
      '/app/agenda/ui/agenda-template.js'
    ],
    build(i) {
      const list = this.jsFiles;
      return { method: 'GET', path: list[i % list.length] };
    }
  },
  {
    name: 'api/health',
    build: () => ({ method: 'GET', path: '/api/health' })
  },
  {
    name: 'api/config (auth)',
    authed: true,
    build: () => ({ method: 'GET', path: '/api/config', headers: { 'X-API-Key': API_KEY } })
  },
  {
    name: 'api/catalog',
    build: () => ({ method: 'GET', path: '/api/catalog' })
  },
  {
    name: 'api/scores (list)',
    build: () => ({ method: 'GET', path: '/api/scores' })
  },
  {
    name: 'api/scores/cllIPI (POST)',
    build: () => ({
      method: 'POST',
      path: '/api/scores/cllIPI',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ age: true, b2m: true, stage: false, ighv: false, tp53: false })
    })
  },
  {
    name: 'api/diagnostic/b-lpd (GET)',
    build: () => ({ method: 'GET', path: '/api/diagnostic/b-lpd' })
  },
  {
    name: 'api/agenda/health',
    build: () => ({ method: 'GET', path: '/api/agenda/health' })
  },
  {
    name: 'api/agenda/nodes (auth)',
    authed: true,
    build: () => ({
      method: 'GET',
      path: '/api/agenda/nodes',
      headers: { 'X-API-Key': API_KEY }
    })
  },
  {
    name: 'api/agenda/services (auth)',
    authed: true,
    build: () => ({
      method: 'GET',
      path: '/api/agenda/services',
      headers: { 'X-API-Key': API_KEY }
    })
  },
  {
    name: 'api/agenda/appointments (auth)',
    authed: true,
    build: () => {
      const d = new Date();
      const iso = d.toISOString().slice(0, 10);
      return {
        method: 'GET',
        path: '/api/agenda/appointments?date=' + iso,
        headers: { 'X-API-Key': API_KEY }
      };
    }
  },
  {
    name: 'api/agenda/panoramica (auth)',
    authed: true,
    build: () => {
      const iso = new Date().toISOString().slice(0, 10);
      return {
        method: 'GET',
        path: '/api/agenda/appointments/panoramica?date=' + iso,
        headers: { 'X-API-Key': API_KEY }
      };
    }
  },
  {
    name: 'api/404 (atteso)',
    expectStatus: 404,
    build: () => ({ method: 'GET', path: '/api/does-not-exist' })
  }
];

/* ─── HTTP client con keep-alive ────────────────────────────── */
const agent = new http.Agent({ keepAlive: true, maxSockets: CONCURRENCY * 2 });

function doRequest({ method, path: p, headers = {}, body = null }) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.request({
      host: HOST, port: PORT, method, path: p,
      headers: { 'Accept': '*/*', ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}) },
      agent
    }, (res) => {
      let bytes = 0;
      res.on('data', (c) => { bytes += c.length; });
      res.on('end', () => {
        const ns = Number(process.hrtime.bigint() - start);
        resolve({ status: res.statusCode, ms: ns / 1e6, bytes });
      });
    });
    req.on('error', (err) => {
      const ns = Number(process.hrtime.bigint() - start);
      resolve({ status: 0, ms: ns / 1e6, bytes: 0, error: err.code || err.message });
    });
    if (body) req.write(body);
    req.end();
  });
}

/* ─── Worker loop ───────────────────────────────────────────── */
async function runScenario(scenario) {
  const latencies = [];
  const statusMap = new Map();
  let total = 0, ok = 0, errs = 0, netErrs = 0, bytes = 0;
  const endAt = Date.now() + DURATION_MS;
  const expected = scenario.expectStatus;

  async function worker(wid) {
    let i = wid;
    while (Date.now() < endAt) {
      const spec = scenario.build(i++);
      const r = await doRequest(spec);
      total++;
      bytes += r.bytes || 0;
      if (r.status) {
        latencies.push(r.ms);
        statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
        const isOk = expected ? r.status === expected : (r.status >= 200 && r.status < 400);
        if (isOk) ok++; else errs++;
      } else {
        netErrs++;
        errs++;
      }
    }
  }

  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, w) => worker(w)));
  const elapsed = (Date.now() - t0) / 1000;

  latencies.sort((a, b) => a - b);
  const pct = (p) => latencies.length ? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))] : 0;

  return {
    name: scenario.name,
    total, ok, errs, netErrs,
    rps: total / elapsed,
    p50: pct(0.50), p95: pct(0.95), p99: pct(0.99),
    max: latencies.length ? latencies[latencies.length - 1] : 0,
    bytes,
    statusMap: Object.fromEntries(statusMap)
  };
}

/* ─── Output formattato ─────────────────────────────────────── */
function fmtN(n, d = 0) {
  return Number(n).toLocaleString('en', { maximumFractionDigits: d, minimumFractionDigits: d });
}
function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}

function printSummary(results) {
  const pad = (s, n, left = false) => left ? String(s).padStart(n) : String(s).padEnd(n);
  console.log('');
  console.log('┌' + '─'.repeat(100) + '┐');
  console.log('│ ' + pad('STRESS TEST — riepilogo', 98) + ' │');
  console.log('├' + '─'.repeat(100) + '┤');
  console.log('│ ' + pad('scenario', 32) +
              pad('req', 7, true) +
              pad('ok', 7, true) +
              pad('err', 6, true) +
              pad('rps', 9, true) +
              pad('p50ms', 8, true) +
              pad('p95ms', 8, true) +
              pad('p99ms', 8, true) +
              pad('bytes', 13, true) + ' │');
  console.log('├' + '─'.repeat(100) + '┤');
  for (const r of results) {
    console.log('│ ' + pad(r.name, 32) +
                pad(fmtN(r.total), 7, true) +
                pad(fmtN(r.ok), 7, true) +
                pad(fmtN(r.errs), 6, true) +
                pad(fmtN(r.rps, 1), 9, true) +
                pad(fmtN(r.p50, 1), 8, true) +
                pad(fmtN(r.p95, 1), 8, true) +
                pad(fmtN(r.p99, 1), 8, true) +
                pad(fmtBytes(r.bytes), 13, true) + ' │');
  }
  console.log('└' + '─'.repeat(100) + '┘');

  // Dettaglio status / errori
  const withErrors = results.filter(r => r.errs > 0);
  if (withErrors.length) {
    console.log('\n  Scenari con errori:');
    for (const r of withErrors) {
      const parts = Object.entries(r.statusMap).map(([s, n]) => `${s}×${n}`);
      const netInfo = r.netErrs ? `, netErrs=${r.netErrs}` : '';
      console.log(`    • ${r.name}: statusMap={${parts.join(', ')}}${netInfo}`);
    }
  } else {
    console.log('\n  Nessuno scenario ha registrato errori.');
  }

  const grand = results.reduce((a, r) => ({
    total: a.total + r.total, ok: a.ok + r.ok, errs: a.errs + r.errs, bytes: a.bytes + r.bytes
  }), { total: 0, ok: 0, errs: 0, bytes: 0 });
  console.log('');
  console.log(`  Totale richieste : ${fmtN(grand.total)}`);
  console.log(`  OK               : ${fmtN(grand.ok)}  (${((grand.ok / grand.total) * 100).toFixed(2)}%)`);
  console.log(`  Errori           : ${fmtN(grand.errs)}`);
  console.log(`  Payload letti    : ${fmtBytes(grand.bytes)}`);
}

/* ─── Avvio / shutdown server ───────────────────────────────── */
function startServer() {
  const env = {
    ...process.env,
    LUMIA_HOST: HOST,
    LUMIA_PORT: String(PORT),
    LUMIA_API_KEY: API_KEY,
    API_RATE_LIMIT: '1000000',
    LOGIN_RATE_LIMIT: '1000000',
    ADMIN_PASSWORD: 'stresstest-admin',
    NODE_ENV: 'test'
  };
  const node = process.execPath;
  const child = spawn(node, ['src/init.js'], {
    cwd: REPO_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let banner = '';
  child.stdout.on('data', (c) => { banner += c.toString(); });
  child.stderr.on('data', (c) => { process.stderr.write('[server] ' + c.toString()); });
  child.on('exit', (code, sig) => {
    if (code !== 0 && code !== null) {
      console.error(`\n  [server] uscito con codice ${code} (sig=${sig})`);
    }
  });
  return { child, getBanner: () => banner };
}

async function waitForReady() {
  const deadline = Date.now() + SERVER_READY_TIMEOUT;
  while (Date.now() < deadline) {
    const r = await doRequest({ method: 'GET', path: '/api/health' }).catch(() => null);
    if (r && r.status === 200) return true;
    await new Promise(r2 => setTimeout(r2, 200));
  }
  return false;
}

function stopServer(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    child.once('exit', finish);
    try { child.kill('SIGTERM'); } catch (_) {}
    setTimeout(() => { try { child.kill('SIGKILL'); } catch (_) {} finish(); }, 5000);
  });
}

/* ─── Main ──────────────────────────────────────────────────── */
(async () => {
  console.log('  LUMIA stress test');
  console.log(`  durata/scenario : ${DURATION_MS / 1000}s`);
  console.log(`  concorrenza     : ${CONCURRENCY}`);
  console.log(`  target          : http://${HOST}:${PORT}\n`);

  console.log('  Avvio del server...');
  const { child } = startServer();

  try {
    const ready = await waitForReady();
    if (!ready) throw new Error('Server non pronto entro ' + SERVER_READY_TIMEOUT + 'ms');
    console.log('  Server pronto. Avvio scenari.\n');

    const results = [];
    for (const sc of scenarios) {
      process.stdout.write(`  → ${sc.name.padEnd(36)} `);
      const t0 = Date.now();
      const r = await runScenario(sc);
      const dt = ((Date.now() - t0) / 1000).toFixed(1);
      const okRate = r.total ? ((r.ok / r.total) * 100).toFixed(1) : '0';
      process.stdout.write(`done (${dt}s, ${fmtN(r.total)} req, ${okRate}% ok)\n`);
      results.push(r);
    }

    printSummary(results);

    const failed = results.filter(r => r.errs > 0).length;
    console.log('');
    if (failed > 0) {
      console.log(`  ❌  ${failed} scenario/i con errori.\n`);
      process.exitCode = 1;
    } else {
      console.log('  ✅  Tutti gli scenari OK.\n');
    }
  } catch (e) {
    console.error('\n  Errore durante lo stress test:', e.message);
    process.exitCode = 2;
  } finally {
    console.log('  Arresto del server...');
    await stopServer(child);
    agent.destroy();
  }
})();
