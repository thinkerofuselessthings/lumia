/**
 * Router — Pattern-matching mini-router
 */

class Router {
  constructor() { this.routes = []; }

  /**
   * Register a route.
   * @param {string} method — HTTP method (GET, POST, PUT, DELETE) or "*"
   * @param {string} pattern — e.g. "diagnostic/:key", "scores/:key"
   * @param {Function} handler — (ctx) => void
   * @param {object} [opts] — { auth: false, role: "amministratore" }
   */
  add(method, pattern, handler, opts = {}) {
    const keys = [];
    const re = pattern.replace(/:([a-zA-Z_]+)/g, (_, name) => {
      keys.push(name);
      return "([^/]+)";
    });
    this.routes.push({
      method,
      regex: new RegExp(`^${re}$`),
      keys,
      handler,
      auth: opts.auth !== false,
      role: opts.role || null,
    });
  }

  get(p, h, o)    { this.add("GET", p, h, o); }
  post(p, h, o)   { this.add("POST", p, h, o); }
  put(p, h, o)    { this.add("PUT", p, h, o); }
  patch(p, h, o)  { this.add("PATCH", p, h, o); }
  delete(p, h, o) { this.add("DELETE", p, h, o); }
  all(p, h, o)    { this.add("*", p, h, o); }

  match(method, path) {
    for (const route of this.routes) {
      if (route.method !== "*" && route.method !== method) continue;
      const m = path.match(route.regex);
      if (!m) continue;
      const params = {};
      route.keys.forEach((key, i) => { params[key] = m[i + 1]; });
      return { handler: route.handler, params, auth: route.auth, role: route.role };
    }
    return null;
  }
}

module.exports = { Router };
