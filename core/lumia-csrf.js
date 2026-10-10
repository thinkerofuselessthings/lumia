/**
 * lumia-csrf.js — Trans-versal CSRF guard for same-origin /api/* fetches.
 *
 * Wraps window.fetch to:
 *   1. Auto-inject X-CSRF-Token on mutating requests (POST/PUT/PATCH/DELETE).
 *   2. Lazy-fetch the token from /api/auth/check if not yet populated,
 *      so requests issued during the cold-start window don't fail with 403.
 *   3. Auto-refresh the token and retry once when the server answers 403
 *      with error.code === "AUTH_CSRF_INVALID".
 *
 * Exposes window.LumiaCsrf = { refresh(), getToken(), isReady() }.
 *
 * Must load BEFORE any module that makes API calls (see index.html).
 */
(function (global) {
  'use strict';
  if (global.LumiaCsrf) return; // idempotent

  var AUTH_CHECK_URL = '/api/auth/check';
  var MUTATING = { POST: 1, PUT: 1, PATCH: 1, DELETE: 1 };

  var _inflight = null;

  function isApiUrl(url) {
    if (typeof url !== 'string') {
      try { url = String(url); } catch (_) { return false; }
    }
    // Same-origin relative paths
    if (url.charAt(0) === '/') return url.indexOf('/api/') === 0;
    // Absolute URLs on the same origin
    try {
      var u = new URL(url, global.location.href);
      return u.origin === global.location.origin && u.pathname.indexOf('/api/') === 0;
    } catch (_) { return false; }
  }

  function methodOf(init) {
    if (!init || !init.method) return 'GET';
    return String(init.method).toUpperCase();
  }

  function refresh() {
    if (_inflight) return _inflight;
    _inflight = _nativeFetch.call(global, AUTH_CHECK_URL, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.csrf_token) global.csrfToken = d.csrf_token;
        return global.csrfToken || '';
      })
      .catch(function () { return global.csrfToken || ''; })
      .then(function (tok) { _inflight = null; return tok; });
    return _inflight;
  }

  /* ── Header helpers (preserve caller's headers object type) ── */
  function setHeader(init, name, value) {
    if (!init.headers) { init.headers = {}; }
    if (typeof Headers !== 'undefined' && init.headers instanceof Headers) {
      init.headers.set(name, value);
      return init;
    }
    if (Array.isArray(init.headers)) {
      var found = false;
      for (var i = 0; i < init.headers.length; i++) {
        if (String(init.headers[i][0]).toLowerCase() === name.toLowerCase()) {
          init.headers[i][1] = value; found = true; break;
        }
      }
      if (!found) init.headers.push([name, value]);
      return init;
    }
    // Plain object
    init.headers = Object.assign({}, init.headers);
    // Remove any case-variant of the header, then set canonical name.
    Object.keys(init.headers).forEach(function (k) {
      if (k.toLowerCase() === name.toLowerCase()) delete init.headers[k];
    });
    init.headers[name] = value;
    return init;
  }

  /* ── Detect CSRF 403 from response body ── */
  function isCsrfFailure(res) {
    if (res.status !== 403) return Promise.resolve(false);
    // We may only read the body once; clone first.
    var clone;
    try { clone = res.clone(); } catch (_) { return Promise.resolve(false); }
    return clone.json().then(function (j) {
      return !!(j && j.error && j.error.code === 'AUTH_CSRF_INVALID');
    }).catch(function () { return false; });
  }

  var _nativeFetch = global.fetch.bind(global);

  global.fetch = function wrappedFetch(resource, init) {
    // Extract URL + method (fetch also accepts Request objects).
    var url = (typeof resource === 'string' || resource instanceof URL)
      ? String(resource)
      : (resource && resource.url) || '';

    var reqMethod = (init && init.method)
      ? String(init.method).toUpperCase()
      : (resource && resource.method ? String(resource.method).toUpperCase() : 'GET');

    var mutating = !!MUTATING[reqMethod];
    var sameApi = isApiUrl(url);

    // Pass-through for non-API or non-mutating requests.
    if (!sameApi || !mutating) {
      return _nativeFetch(resource, init);
    }

    // Mutating /api/* call: ensure we have a token first.
    var pre = global.csrfToken ? Promise.resolve(global.csrfToken) : refresh();

    return pre.then(function (token) {
      var nextInit = Object.assign({}, init || {});
      nextInit.credentials = nextInit.credentials || 'same-origin';
      if (token) setHeader(nextInit, 'X-CSRF-Token', token);
      return _nativeFetch(resource, nextInit).then(function (res) {
        return isCsrfFailure(res).then(function (bad) {
          if (!bad) return res;
          // Refresh once and retry.
          return refresh().then(function (tok2) {
            if (!tok2 || tok2 === token) return res; // nothing to retry with
            var retryInit = Object.assign({}, init || {});
            retryInit.credentials = retryInit.credentials || 'same-origin';
            setHeader(retryInit, 'X-CSRF-Token', tok2);
            return _nativeFetch(resource, retryInit);
          });
        });
      });
    });
  };

  global.LumiaCsrf = {
    refresh: refresh,
    getToken: function () { return global.csrfToken || ''; },
    isReady: function () { return !!global.csrfToken; }
  };
})(window);
