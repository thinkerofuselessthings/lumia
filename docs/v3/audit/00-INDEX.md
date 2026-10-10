# LUMIA — Documentazione V3 / Audit

Versione: **V3 (perfezionamento)**
Ambito di questa cartella: documentazione di riferimento del **sistema di audit** di LUMIA — schema DB, API server, endpoint REST, UI di consultazione, retention e cifratura.

> Questa cartella documenta lo stato attuale del codice (post-M3.A11 «audit unificato», post-M4.A9 «encryption at-rest», post-M3.A12 «audit-policy + utenti come data mutation», post-M5 «admin UI auditor»). Per la roadmap storica vedi [`../server/11-roadmap.md`](../server/11-roadmap.md) e [`../server/12-changelog.md`](../server/12-changelog.md).

---

## Indice

| # | File | Argomento |
|---|------|-----------|
| 01 | [01-audit-overview.md](01-audit-overview.md) | Cos'è il sistema di audit, perché è unico, due classi di eventi (auth/sistema vs mutazioni di dato), differenza tra `audit_log` e l'ex `audit_trail`, principio "audit cross-cutting" e policy whitelist |
| 02 | [02-audit-schema.md](02-audit-schema.md) | DDL della tabella `audit_log`, semantica delle colonne, migrazioni idempotenti, indici impliciti, tabella legacy `audit_trail` |
| 03 | [03-audit-api.md](03-audit-api.md) | API server: `logAudit()`, `logChange()`, `pruneAuditLogs()`, audit-policy (redact whitelist), `ctx.source`, costruzione del `ctx` HTTP, tassonomia dei valori `azione` |
| 04 | [04-audit-endpoints.md](04-audit-endpoints.md) | REST API admin: `GET /admin/audit-logs` (filtri+paginazione), `GET /admin/audit-logs/:id` (detail con before/after decifrati), UI client |
| 05 | [05-audit-retention-security.md](05-audit-retention-security.md) | Retention configurabile, prune giornaliero, cifratura at-rest dei campi PHI, redaction dei segreti irreversibili, tool di re-encryption, considerazioni GDPR/AgID |

---

## File del codice toccati

```
src/db/schema.js              ← DDL audit_log + migrazioni target_*/before_data/after_data
src/db/audit.js               ← logAudit, logChange, pruneAuditLogs
src/db/audit-policy.js        ← V3.M3.A12 — whitelist tabelle auditate + redaction segreti
src/init.js                   ← timer prune giornaliero (24h.unref())
src/lib/field-crypto.js       ← encField/decField (AES-256-GCM) usate per before/after
src/middleware/auth-gate.js   ← log eventi auth.denied, csrf.failure, auth.password_change_required
app/auth/routes.js            ← log eventi login.success/failed, logout, auth.password_changed, auth.session_revoked, auth.check
app/admin/routes.js           ← V3.M3.A12 — CRUD utenti via logChange('utenti', …) con diff redatto + endpoint /admin/audit-logs
app/agenda/models/audit.js    ← shim verso logChange (mantiene firma legacy `audit.log(table,id,action,old,new,userId)`)
app/agenda/controllers/*      ← chiamate audit.log() su appointments/list_entries/transfusion_requests (incl. move/updateStatus, V3.M3.A12)
app/shell/shell-admin.js      ← UI auditor (tab «Audit», filtri, dettaglio diff)
tools/encrypt-existing.js     ← migrazione one-shot di before_data/after_data verso encField()
```

## Convenzioni

- **Lingua**: italiano per la prosa; identificatori e codice in inglese (riflette il sorgente).
- **Path**: relativi alla root del repository.
- **Stato**: codice attuale del branch principale di `lumia/`. In caso di divergenze, il codice fa fede.
