/**
 * Rate Limiter — factory per IP-based rate limiting.
 */

const { env } = require("../config/env");

function createLimiter({ maxAttempts = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, r] of attempts) {
      if (now - r.first > windowMs) attempts.delete(ip);
    }
  }, 10 * 60 * 1000);
  timer.unref();

  return {
    check(ip) {
      const r = attempts.get(ip);
      if (!r) return true;
      if (Date.now() - r.first > windowMs) { attempts.delete(ip); return true; }
      return r.count < maxAttempts;
    },
    record(ip) {
      const now = Date.now();
      const r = attempts.get(ip);
      if (!r || now - r.first > windowMs) attempts.set(ip, { count: 1, first: now });
      else r.count++;
    },
    reset(ip) { attempts.delete(ip); },
  };
}

const apiLimiter = createLimiter({
  maxAttempts: env("API_RATE_LIMIT", 200),
  windowMs: env("API_RATE_WINDOW", 60 * 1000),
});

const loginLimiter = createLimiter({
  maxAttempts: env("LOGIN_RATE_LIMIT", 5),
  windowMs: env("LOGIN_RATE_WINDOW", 15 * 60 * 1000), // 15 min
});

module.exports = { createLimiter, apiLimiter, loginLimiter };
