/**
 * Error Handler — gestisce un errore e manda response JSON al client.
 * - AppError (operativo): manda code + message al client
 * - Qualsiasi altro errore (bug): manda "Errore interno" — mai dettagli
 */

const { AppError } = require("./app-error");

function handleError(err, res) {
  if (err instanceof AppError) {
    console.error(`  [AppError] ${err.code}: ${err.message}`, err.details || "");
  } else {
    console.error("  [FATAL]", err);
  }

  const status = (err instanceof AppError) ? err.status : 500;
  const body = (err instanceof AppError)
    ? { ok: false, error: { code: err.code, message: err.message, details: err.details || undefined } }
    : { ok: false, error: { code: "INTERNAL", message: "Errore interno del server" } };

  if (res.headersSent) return;
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

module.exports = { handleError };
