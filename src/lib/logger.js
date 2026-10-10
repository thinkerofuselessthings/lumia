/**
 * logger.js — JSON-line logger per LUMIA server.
 *
 * - In TTY: output compatto, leggibile in dev.
 * - In non-TTY (file/redirect/journald): una riga JSON per evento, parsabile con `jq`.
 *
 * API minimale (il bisogno reale del server è basso):
 *   log.info({ msg, ...fields })
 *   log.warn({ msg, ...fields })
 *   log.error({ msg, ...fields, err })
 *
 * Non sostituisce `console.log` ovunque: viene usato dai punti centrali
 * (request-handler, init).
 */

const TTY = !!(process.stdout && process.stdout.isTTY);

function ts() {
  return new Date().toISOString();
}

function emit(level, payload) {
  const out = level === "error" ? process.stderr : process.stdout;

  if (TTY) {
    const { msg, ...rest } = payload || {};
    const tag = `[${level.toUpperCase()}]`;
    const restStr = Object.keys(rest).length
      ? " " + Object.entries(rest).map(([k, v]) => {
          if (v instanceof Error) return `${k}=${v.message}`;
          if (typeof v === "object") return `${k}=${JSON.stringify(v)}`;
          return `${k}=${v}`;
        }).join(" ")
      : "";
    out.write(`  ${tag} ${msg || ""}${restStr}\n`);
    return;
  }

  // JSON-line
  const obj = { ts: ts(), level, ...payload };
  if (obj.err instanceof Error) {
    obj.err = { message: obj.err.message, stack: obj.err.stack, code: obj.err.code };
  }
  try {
    out.write(JSON.stringify(obj) + "\n");
  } catch {
    out.write(JSON.stringify({ ts: ts(), level, msg: "log_serialize_failed" }) + "\n");
  }
}

const log = {
  info: (payload) => emit("info", typeof payload === "string" ? { msg: payload } : payload),
  warn: (payload) => emit("warn", typeof payload === "string" ? { msg: payload } : payload),
  error: (payload) => emit("error", typeof payload === "string" ? { msg: payload } : payload),
};

module.exports = { log };
