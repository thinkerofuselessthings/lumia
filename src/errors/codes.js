/**
 * Catalogo codici errore — un prefisso per dominio.
 * Solo costanti, nessuna logica.
 */

module.exports = {
  // ── Auth ──
  AUTH_REQUIRED:            { status: 401, message: "Autenticazione richiesta" },
  AUTH_INVALID_CREDENTIALS: { status: 401, message: "Credenziali non valide" },
  AUTH_USER_DISABLED:       { status: 403, message: "Utente disabilitato" },
  AUTH_CSRF_INVALID:        { status: 403, message: "Token CSRF non valido" },
  AUTH_ROLE_DENIED:         { status: 403, message: "Accesso non autorizzato per questo ruolo" },
  AUTH_SESSION_EXPIRED:     { status: 401, message: "Sessione scaduta" },
  AUTH_API_KEY_INVALID:     { status: 401, message: "API Key non valida" },
  AUTH_ACCOUNT_LOCKED:      { status: 423, message: "Account temporaneamente bloccato per troppi tentativi falliti" },
  AUTH_PASSWORD_CHANGE_REQUIRED: { status: 403, message: "È richiesto il cambio password prima di proseguire" },
  AUTH_PASSWORD_REUSE:      { status: 400, message: "La nuova password non può essere uguale alla precedente" },
  LAST_ADMIN_PROTECTED:     { status: 409, message: "Impossibile rimuovere l'ultimo amministratore attivo" },

  // ── Rate Limiting ──
  RATE_LIMIT_LOGIN:         { status: 429, message: "Troppi tentativi di accesso. Riprova tra qualche minuto" },
  RATE_LIMIT_API:           { status: 429, message: "Troppe richieste. Riprova tra qualche secondo" },

  // ── Validazione ──
  VALIDATION_REQUIRED:      { status: 400, message: "Campo obbligatorio mancante" },
  VALIDATION_INVALID:       { status: 400, message: "Valore non valido" },
  VALIDATION_UNIQUE:        { status: 409, message: "Valore già esistente (duplicato)" },
  VALIDATION_PASSWORD_WEAK: { status: 400, message: "Password troppo debole (minimo 8 caratteri)" },

  // ── Risorse ──
  NOT_FOUND:                { status: 404, message: "Risorsa non trovata" },
  NOT_FOUND_ROUTE:          { status: 404, message: "Endpoint non trovato" },

  // ── Engines (LUMIA-specific) ──
  ENGINE_UNAVAILABLE:       { status: 503, message: "Engine non caricato" },
  ENGINE_INVALID_INPUT:     { status: 400, message: "Input non valido per l'engine" },
  ENGINE_COMPUTE_ERROR:     { status: 500, message: "Errore durante il calcolo" },
  MODULE_NOT_FOUND:         { status: 404, message: "Modulo non trovato" },

  // ── HTTP / Parsing ──
  BODY_TOO_LARGE:           { status: 413, message: "Payload troppo grande" },
  BODY_INVALID_JSON:        { status: 400, message: "JSON non valido" },
  BODY_TIMEOUT:             { status: 408, message: "Timeout ricezione dati" },
  METHOD_NOT_ALLOWED:       { status: 405, message: "Metodo non consentito" },
  FORBIDDEN:                { status: 403, message: "Accesso vietato" },

  // ── Server ──
  INTERNAL:                 { status: 500, message: "Errore interno del server" },
  DB_ERROR:                 { status: 500, message: "Errore database" },
};
