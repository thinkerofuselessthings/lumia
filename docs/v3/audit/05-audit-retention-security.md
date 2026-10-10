# 05 — Audit: Retention, sicurezza, compliance

## 1. Retention

### Configurazione

```env
# .env
AUDIT_RETENTION_DAYS=365      # default se non settato
```

Letto in `src/db/audit.js::pruneAuditLogs()` via `env('AUDIT_RETENTION_DAYS', 365)`.

### Schedule

`src/init.js`:

```js
// Run subito al boot, poi una volta ogni 24 ore
pruneAuditLogs();
const auditPruneTimer = setInterval(pruneAuditLogs, 24 * 60 * 60 * 1000);
auditPruneTimer.unref();   // non blocca lo shutdown
```

Nel signal handler di shutdown (`SIGTERM`/`SIGINT`): `clearInterval(auditPruneTimer)` + `db.close()` (flush sincrono).

### Query di prune

```sql
DELETE FROM audit_log
WHERE creato_il < datetime('now', '-365 days');
```

`datetime('now', …)` di SQLite ritorna UTC; `creato_il` è anch'esso UTC → confronto corretto. Dopo il `DELETE`, sql.js triggera l'auto-flush debounced del wrapper.

### Scelta del valore

| Esigenza | Suggerimento |
|----------|--------------|
| GDPR (art. 5.1.e — limitazione conservazione) | minimizzare; 1–3 anni tipici per audit di sicurezza |
| AgID — sistemi sanitari | spesso 5–10 anni richiesti per documentazione clinica → ma l'audit_log non è la cartella clinica; se serve archiviare a lungo, fare export periodico (vedi §4) e mantenere `audit_log` operativo a 365 gg |
| Forensics interno | 90–180 gg sufficienti per la maggior parte delle indagini |

Il default `365` è un compromesso ragionevole.

## 2. Due strategie di protezione: redaction vs cifratura

L'audit gestisce dati di natura molto diversa. V3.M3.A12 distingue esplicitamente due categorie e applica strategie di protezione differenti, **ortogonali**:

| Categoria | Strategia | Implementazione | Recuperabilità |
|-----------|-----------|-----------------|----------------|
| **Segreti irreversibili** (`password_hash`, `salt`, `iterations`, `sessioni.token`) | **Redaction** | `redactSnapshot()` in `src/db/audit-policy.js` | Nessuna — il valore viene sostituito da `"<redacted>"` *prima* dello snapshot. Né l'admin né chi accede al DB può recuperarlo. |
| **PHI / PII** (nome paziente, email, telefono, codice fiscale, note cliniche) | **Cifratura at-rest** del blob | `encField()` AES-256-GCM su `before_data`/`after_data` | L'admin autenticato lo vede in detail (legittimo per audit forense). Chi accede al file DB senza chiave NO. |
| **Campi strutturali** (id, status, ruolo, contatori, timestamp) | Nessuna | — | Visibili in chiaro nel diff per leggibilità immediata. |

Le due strategie compongono: una stessa riga `data.utenti.update` ha:

```
audit_log.before_data = enc:v1:<…cifrato…>
                                ↓ decifrato in detail dall'admin
                        { id, username, email (in chiaro qui),
                          ruolo, attivo,
                          password_hash: "<redacted>",   ← già redatto PRIMA della cifratura
                          salt: "<redacted>",
                          iterations: "<redacted>" }
```

### Perché redact e non cifrare i segreti?

Cifrare l'hash password sarebbe ridondante e fragile: l'hash è già una funzione one-way; cifrarlo aggiunge solo la dipendenza dalla chiave (`LUMIA_ENCRYPTION_KEY`). Se la chiave viene compromessa, l'attaccante recupererebbe l'hash *e* potrebbe attaccarlo offline. Con la redaction, l'hash semplicemente **non esiste** nell'audit — irrecuperabile per principio.

### Configurazione redaction

Vedi [03 §3](03-audit-api.md#3-audit-policy-whitelist--redaction) per la API completa di `audit-policy.js` e per istruzioni su come dichiarare nuove tabelle.

## 3. Cifratura at-rest dei campi PHI

### Cosa è cifrato

Solo i campi che possono contenere PHI (Personal Health Information):

- `audit_log.before_data`
- `audit_log.after_data`

Tutti gli altri campi (`azione`, `ip`, `user_agent`, `metodo`, `percorso`, `esito`, `dettagli`) sono **in chiaro** — per design, perché `dettagli` non deve mai contenere PHI (vedi [03 §1](03-audit-api.md#convenzione-del-campo-details)).

### Algoritmo

`src/lib/field-crypto.js`:

- **AES-256-GCM** (cipher `aes-256-gcm` di Node `crypto`).
- Chiave: 32 byte (256 bit) derivati via `scryptSync` da `LUMIA_ENCRYPTION_KEY`.
- IV: 12 byte random per ogni `encField()`.
- Tag GCM: 16 byte.
- Formato disco: `enc:v1:` + base64url(`iv(12) || tag(16) || ciphertext`).

```
enc:v1:<base64url(IV ‖ TAG ‖ CIPHERTEXT)>
       └── 12B ──┘└─16B─┘└── len(plaintext) bytes ──┘
```

### Fail-soft

`encField()` se `LUMIA_ENCRYPTION_KEY` è vuota ritorna il valore in chiaro (no exception). `decField()` se l'input non inizia con `enc:v1:` lo ritorna invariato. Questo permette:

- esecuzione senza chiave (ambienti dev) — niente crash, ma niente cifratura,
- coesistenza di righe legacy in chiaro e nuove righe cifrate nello stesso file DB.

### Esempio in `logChange()`

```js
// src/db/audit.js — V3.M3.A12: redact PRIMA di cifrare
const beforeRedacted = redactSnapshot(table, before);
const afterRedacted  = redactSnapshot(table, after);
// …
beforeRedacted ? encField(JSON.stringify(beforeRedacted)) : null,
afterRedacted  ? encField(JSON.stringify(afterRedacted))  : null,
```

E in lettura nel detail endpoint:

```js
// app/admin/routes.js
let before = null;
if (row.before_data) {
  try { before = JSON.parse(safeDecField(row.before_data)); }
  catch (_) { before = { _raw: safeDecField(row.before_data) }; }
}
```

`safeDecField()` cattura le eccezioni di decifratura (chiave sbagliata, ciphertext corrotto) e ritorna la stringa raw, evitando 500 — l'admin vede il problema ma il sistema non si blocca.

## 4. Migrazione di dati esistenti — `tools/encrypt-existing.js`

Per cifrare snapshot già presenti in `audit_log` (e altri campi PHI di altre tabelle):

```bash
LUMIA_ENCRYPTION_KEY=... node tools/encrypt-existing.js
```

Lo script in `tools/encrypt-existing.js` itera su una whitelist di tabella+colonne:

```js
const TARGETS = [
  { dbKind: 'lumia',  table: 'utenti',         columns: ['email'] },
  { dbKind: 'lumia',  table: 'audit_log',      columns: ['before_data', 'after_data'] },
  { dbKind: 'agenda', table: 'appointments',   columns: ['patient_name', 'phone', 'birth_date', 'notes', 'description'] },
  { dbKind: 'agenda', table: 'list_entries',   columns: ['patient_name', 'phone', 'birth_date', 'notes'] },
];
```

Idempotente: i valori che iniziano già con `enc:v1:` vengono skippati.

## 5. Export e archiviazione long-term

Il sistema attuale **non implementa** un sink di archiviazione esterno. Pattern raccomandato per chi serve >1 anno:

```
[cron settimanale]
  └─► node tools/export-audit.js --from <last_export> --to now \
        | gzip > /backup/audit/audit_YYYYMMDD.jsonl.gz
```

Il file JSONL può essere depositato su:

- **WORM storage** (es. S3 Object Lock in compliance mode) — soddisfa il requisito di immutabilità.
- **Bucket cifrato off-site** con retention 5–10 anni configurata server-side.

Lo script `tools/export-audit.js` non esiste ancora — è un TODO documentato. Schema dell'export consigliato: una riga JSON per evento, in chiaro (gli snapshot vanno decifrati al volo prima dell'export, per garantire leggibilità anche dopo rotation della chiave).

## 6. Tamper resistance — limiti e mitigazioni

### Cosa NON c'è

- Nessuna **hash chain** (`hash(prev) → hash(curr)`).
- Nessuna **firma digitale** sulle righe.
- Nessuna **append-only enforcement** a livello SQL (un superuser DB può `DELETE`/`UPDATE`).

### Come mitigare

1. **Restringere accesso al file `data/lumia.db`**: solo l'utente OS che esegue il processo node. Niente accesso shell agli operatori.
2. **Backup periodici offline** del file DB su media WORM o storage append-only.
3. **Export streaming** verso un sink esterno (vedi §4).
4. **Monitoring**: alert su `DELETE FROM audit_log` non originato dal job di prune (richiede wrapping/proxy SQL — non implementato).

Per uso forense ad alto livello (es. cause legali) considerare di alimentare un **SIEM esterno** (Elastic, Loki) con shipping in tempo reale tramite un side-process che fa `tail` della tabella.

## 7. Privacy by design

### Diritto all'oblio (GDPR art. 17)

Quando un `utente` viene cancellato (`DELETE /admin/utenti/:id`), la FK soft `audit_log.utente_id` viene messa a `NULL` via `ON DELETE SET NULL`. Questo:

- ✅ rimuove il legame diretto identità↔eventi;
- ⚠️ **non** rimuove `ip`, `user_agent`, contenuto di `dettagli` o di `before_data`/`after_data` — che potrebbero contenere indirettamente identificativi.

Per rispettare in pieno il diritto all'oblio sui dati audit (rara, ma possibile): query SQL custom + script di scrub. Pattern consigliato:

```sql
-- pseudo-soft delete: anonimizza senza perdere il valore probatorio
UPDATE audit_log
SET ip = '0.0.0.0',
    user_agent = NULL,
    dettagli = NULL,
    before_data = NULL,
    after_data = NULL
WHERE utente_id IS NULL          -- già cancellato
  AND id IN (SELECT id FROM ...) -- record correlati al soggetto richiedente
;
```

### Minimizzazione

- Non loggare PHI in `dettagli` (regola di policy, non enforced dal codice).
- Mantenere `details: { ids, counts, flags }` — non `details: { patient_name, fiscal_code }`.

## 8. Variabili d'ambiente rilevanti

| Var | Default | Effetto sull'audit |
|-----|---------|--------------------|
| `AUDIT_RETENTION_DAYS` | `365` | Soglia per `pruneAuditLogs()` |
| `LUMIA_ENCRYPTION_KEY` | (vuota) | Senza, `before_data`/`after_data` salvati in chiaro (fail-soft) |
| `TRUSTED_PROXIES` | (vuota) | Determina come `getClientIp()` interpreta `X-Forwarded-For` → `audit_log.ip` |
| `SECURE_COOKIE` | `true` in prod | Indirettamente: senza HTTPS l'esposizione del detail endpoint admin va su HTTP plain |

## 9. Checklist operativa di hardening

- [ ] `LUMIA_ENCRYPTION_KEY` impostata in produzione e backup-ata in vault separato dal DB.
- [ ] `AUDIT_RETENTION_DAYS` rivisto rispetto ai requisiti AgID/GDPR locali.
- [ ] `data/lumia.db` con ACL filesystem strette (owner = utente node, mode 0600).
- [ ] Backup periodico del DB su storage immutabile.
- [ ] Reverse proxy con `X-Forwarded-For` corretto + `TRUSTED_PROXIES` allineato (altrimenti `audit_log.ip` registra l'IP del proxy).
- [ ] Monitor su anomalie: spike di `auth.denied`, `csrf.failure`, `login.failed` → alert SOC.
- [ ] Procedura documentata per export forense quando richiesto (export JSONL + decifratura controllata).
- [ ] `src/db/audit-policy.js` aggiornata: ogni nuova tabella che riceve scritture deve essere dichiarata, con `redact: [...]` per eventuali segreti irreversibili. Verificare assenza di warning `[AUDIT] tabella '...' non in audit-policy` nei log di produzione.
