/**
 * src/lib/metrics.js — V3.M5.B4
 *
 * Mini collector di metriche in-process, senza dipendenze esterne.
 * Esporta in **Prometheus text format** (v0.0.4) — niente protobuf, niente pull lib.
 *
 * Tipi supportati:
 * - counter: monotonic, mai decrementabile
 * - gauge:   set/get arbitrario
 * - histogram con bucket fissi (ms): {5,10,25,50,100,250,500,1000,2500,5000,+Inf}
 *
 * Le label sono espresse come oggetti JS: `{ method: 'GET', status: '200' }`.
 * Il "child" (combinazione di label) viene serializzato in chiave dedicata.
 */

'use strict';

const HIST_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

function _labelsKey(labels) {
  if (!labels) return '';
  const keys = Object.keys(labels).sort();
  return keys.map((k) => `${k}=${labels[k]}`).join(',');
}
function _labelsLine(labels) {
  if (!labels) return '';
  const keys = Object.keys(labels).sort();
  if (!keys.length) return '';
  return '{' + keys.map((k) => `${k}="${String(labels[k]).replace(/"/g, '\\"')}"`).join(',') + '}';
}

class Counter {
  constructor(name, help) { this.name = name; this.help = help; this.values = new Map(); }
  inc(labels, n = 1) {
    const k = _labelsKey(labels);
    this.values.set(k, (this.values.get(k) || 0) + n);
    if (!this._labelMap) this._labelMap = new Map();
    if (labels) this._labelMap.set(k, labels);
  }
  expose() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} counter`];
    for (const [k, v] of this.values) {
      const lbls = this._labelMap && this._labelMap.get(k);
      lines.push(`${this.name}${_labelsLine(lbls)} ${v}`);
    }
    return lines.join('\n');
  }
}

class Gauge {
  constructor(name, help) { this.name = name; this.help = help; this.values = new Map(); this._labelMap = new Map(); }
  set(labels, v) {
    const k = _labelsKey(labels);
    this.values.set(k, v);
    if (labels) this._labelMap.set(k, labels);
  }
  expose() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} gauge`];
    for (const [k, v] of this.values) {
      const lbls = this._labelMap.get(k);
      lines.push(`${this.name}${_labelsLine(lbls)} ${v}`);
    }
    return lines.join('\n');
  }
}

class Histogram {
  constructor(name, help, buckets = HIST_BUCKETS_MS) {
    this.name = name; this.help = help;
    this.buckets = buckets;
    this.children = new Map(); // labelKey -> { bucketCounts: number[], sum: number, count: number, labels }
  }
  observe(labels, v) {
    const k = _labelsKey(labels);
    let child = this.children.get(k);
    if (!child) {
      child = { bucketCounts: new Array(this.buckets.length + 1).fill(0), sum: 0, count: 0, labels };
      this.children.set(k, child);
    }
    let placed = false;
    for (let i = 0; i < this.buckets.length; i++) {
      if (v <= this.buckets[i]) { child.bucketCounts[i]++; placed = true; break; }
    }
    if (!placed) child.bucketCounts[this.buckets.length]++;
    child.sum += v;
    child.count++;
  }
  expose() {
    const lines = [`# HELP ${this.name} ${this.help}`, `# TYPE ${this.name} histogram`];
    for (const child of this.children.values()) {
      // bucket cumulativi (Prom richiede _bucket cumulativo)
      let cum = 0;
      for (let i = 0; i < this.buckets.length; i++) {
        cum += child.bucketCounts[i];
        const lbls = { ...(child.labels || {}), le: String(this.buckets[i]) };
        lines.push(`${this.name}_bucket${_labelsLine(lbls)} ${cum}`);
      }
      cum += child.bucketCounts[this.buckets.length];
      const infLbls = { ...(child.labels || {}), le: '+Inf' };
      lines.push(`${this.name}_bucket${_labelsLine(infLbls)} ${cum}`);
      lines.push(`${this.name}_sum${_labelsLine(child.labels)} ${child.sum}`);
      lines.push(`${this.name}_count${_labelsLine(child.labels)} ${child.count}`);
    }
    return lines.join('\n');
  }
}

// Registry
const _registry = [];
function register(metric) { _registry.push(metric); return metric; }

const httpRequestsTotal = register(new Counter('lumia_http_requests_total', 'HTTP requests served, partitioned by method/status_class'));
const httpRequestDurationMs = register(new Histogram('lumia_http_request_duration_ms', 'HTTP request duration in ms, partitioned by method/status_class'));
const processStartTime = register(new Gauge('lumia_process_start_time_seconds', 'Unix timestamp of the process start'));
processStartTime.set({}, Math.floor(Date.now() / 1000 - process.uptime()));

function recordHttp({ method, statusCode, durationMs }) {
  const status_class = `${Math.floor(statusCode / 100)}xx`;
  const labels = { method: method || 'UNKNOWN', status_class };
  httpRequestsTotal.inc(labels, 1);
  httpRequestDurationMs.observe(labels, durationMs);
}

function expose() {
  // Aggiunge metriche dinamiche di processo
  const mem = process.memoryUsage();
  const dyn = [
    '# HELP lumia_process_uptime_seconds Process uptime in seconds',
    '# TYPE lumia_process_uptime_seconds gauge',
    `lumia_process_uptime_seconds ${process.uptime()}`,
    '# HELP lumia_process_memory_rss_bytes Resident set size',
    '# TYPE lumia_process_memory_rss_bytes gauge',
    `lumia_process_memory_rss_bytes ${mem.rss}`,
    '# HELP lumia_process_memory_heap_used_bytes Heap used',
    '# TYPE lumia_process_memory_heap_used_bytes gauge',
    `lumia_process_memory_heap_used_bytes ${mem.heapUsed}`,
  ].join('\n');
  return _registry.map((m) => m.expose()).concat(dyn).join('\n') + '\n';
}

module.exports = { recordHttp, expose, _internal: { Counter, Gauge, Histogram } };
