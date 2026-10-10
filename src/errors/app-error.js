/**
 * AppError — errore operativo con status HTTP e codice machine-readable.
 */

const CODES = require("./codes");

class AppError extends Error {
  constructor(code, message, status = 400, details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
    this.isOperational = true;
  }

  /**
   * Factory — crea AppError dal catalogo codici.
   * @param {string} code — chiave in codes.js
   * @param {object} [details] — dati aggiuntivi (mai segreti)
   */
  static from(code, details = null) {
    const def = CODES[code];
    if (!def) return new AppError("INTERNAL", "Errore sconosciuto", 500);
    return new AppError(code, def.message, def.status, details);
  }
}

module.exports = { AppError };
