/**
 * Audit policy — whitelist of audited tables and per-table redaction rules.
 *
 * V3.M3.A12 — Centralizza la convenzione "quali tabelle vengono auditate
 * via logChange() e quali colonne vanno mascherate prima di finire negli
 * snapshot before/after".
 *
 * Regole:
 *  - Snapshot before/after sono cifrati at-rest (AES-256-GCM, vedi
 *    src/lib/field-crypto.js), MA per i segreti puri (hash password, salt,
 *    token di sessione) preferiamo la *redaction* (irreversibile) alla
 *    cifratura: un admin che consulta l'audit non deve poter ricostruire
 *    quei valori in nessun caso.
 *  - PHI/PII (nome, email, codice fiscale, telefono) NON viene redatto:
 *    finisce in chiaro DENTRO il blob cifrato. Visibile in detail dall'admin
 *    (legittimo per audit forense), invisibile a chi accede al file DB.
 *
 * Aggiungere una tabella nuova: pushare in `TABLES` con `redact: [...]`.
 * Una `logChange()` su tabella non listata produce un warning una sola volta
 * a runtime (non blocca l'INSERT — fail-open per non perdere eventi).
 */

"use strict";

const REDACT_PLACEHOLDER = "<redacted>";

/**
 * Whitelist tabelle auditate.
 *  - redact:      colonne sostituite con "<redacted>" prima dello snapshot.
 *  - description: nota di dominio, solo per leggibilità.
 */
const TABLES = Object.freeze({
  // ── lumia.db ────────────────────────────────────────────────────────
  utenti: {
    redact: ["password_hash", "salt", "iterations"],
    description: "Account utenti — segreti hashati redatti, email PII cifrata via blob.",
  },
  sessioni: {
    redact: ["token"],
    description: "Sessioni server — token redatto (alto valore di replay).",
  },

  // ── agenda.db ───────────────────────────────────────────────────────
  appointments: {
    redact: [],
    description: "Appuntamenti — PHI in chiaro nel blob cifrato.",
  },
  list_entries: {
    redact: [],
    description: "Voci di lista — PHI in chiaro nel blob cifrato.",
  },
  lists: {
    redact: [],
    description: "Liste agenda — metadati strutturali.",
  },
  nodes: {
    redact: [],
    description: "Nodi struttura (postazioni/sale).",
  },
  transfusion_requests: {
    redact: [],
    description: "Richieste trasfusionali (sub-record di appointments).",
  },
  transfusion_emocomponents: {
    redact: [],
    description: "Emocomponenti collegati a una richiesta trasfusionale.",
  },
});

const _warned = new Set();

function isAuditedTable(table) {
  return Object.prototype.hasOwnProperty.call(TABLES, table);
}

function redactRule(table) {
  return TABLES[table] || null;
}

/**
 * Ritorna una shallow copy dello snapshot con le colonne "redact" sostituite
 * dal placeholder. Su null/undefined ritorna null. Su tabelle sconosciute
 * logga un warning una sola volta e ritorna lo snapshot così com'è.
 */
function redactSnapshot(table, snapshot) {
  if (snapshot == null) return null;
  if (typeof snapshot !== "object") return snapshot;

  const rule = TABLES[table];
  if (!rule) {
    if (!_warned.has(table)) {
      _warned.add(table);
      // eslint-disable-next-line no-console
      console.warn(`[AUDIT] tabella '${table}' non in audit-policy: snapshot loggato senza redaction. Aggiungere in src/db/audit-policy.js`);
    }
    return snapshot;
  }

  if (!rule.redact || !rule.redact.length) return snapshot;

  const out = Array.isArray(snapshot) ? snapshot.slice() : { ...snapshot };
  for (const col of rule.redact) {
    if (col in out) out[col] = REDACT_PLACEHOLDER;
  }
  return out;
}

module.exports = {
  TABLES,
  REDACT_PLACEHOLDER,
  isAuditedTable,
  redactRule,
  redactSnapshot,
};
