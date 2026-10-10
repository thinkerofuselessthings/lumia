# 01 — Audit: Overview

## 1. Scopo

LUMIA è un gestionale di dati sanitari: ogni accesso e ogni mutazione di dato deve essere **tracciabile, immutabile e attribuibile** a un utente specifico, con timestamp e contesto HTTP. Il sistema di audit è il sottosistema responsabile di questa tracciabilità.

Casi d'uso primari:

- **Compliance**: GDPR (art. 30 — registro dei trattamenti, art. 32 — sicurezza) e linee guida AgID per i sistemi sanitari richiedono un log completo e ispezionabile.
- **Forense**: ricostruire chi ha modificato un appuntamento, quando, da quale IP, con quale stato precedente.
- **Sicurezza operativa**: rilevare brute-force di login, tentativi CSRF, escalation di ruolo, account bloccati.
- **Debug funzionale**: capire perché un record è in un certo stato (chain di INSERT/UPDATE).

## 2. Due classi di eventi, una sola tabella

Storicamente esistevano **due sistemi paralleli**:

| Sistema legacy | DB | Tabella | Cosa registrava |
|----------------|----|---------|--------------------|
| Audit di sicurezza | `lumia.db` | `audit_log` | login, logout, denied, csrf failure, admin actions |
| Audit di dato (agenda) | `agenda.db` | `audit_trail` | INSERT/UPDATE/DELETE su `appointments`, `list_entries`, … con snapshot `old_data`/`new_data` |

Questa separazione era un problema:

- query cross-DB impossibili (sql.js non supporta `ATTACH DATABASE`),
- timeline operatore frammentata (per sapere "cosa ha fatto l'utente X tra le 10 e le 11" servivano due query, due connessioni, merge applicativo),
- retention e cifratura at-rest da applicare due volte.

### V3.M3.A11 — Unificazione

Da V3 c'è **una sola tabella di audit**: `lumia.db::audit_log`, estesa con quattro colonne aggiuntive (`target_table`, `target_id`, `before_data`, `after_data`) per accogliere anche le mutazioni di dato.

### V3.M3.A12 — Audit come cross-cutting concern

Subito dopo l'unificazione è emerso un secondo problema concettuale: la convenzione "chi chiama cosa" era ancora frammentata.

- I controller **agenda** chiamavano `logChange()` → producevano `data.<table>.<verb>` con diff cifrato.
- I controller **admin** chiamavano `logAudit('admin.user.*')` → producevano eventi puri *senza* diff. Risultato: la tabella `utenti` (la più sensibile) aveva audit **peggiore** di `appointments` — nessun before/after, impossibile sapere *cosa* era cambiato (ruolo? blocco? email?).

V3.M3.A12 riformula il principio:

> **L'audit non è una funzionalità di un singolo modulo. È un cross-cutting concern dell'intera applicazione. Ogni write su qualsiasi DB di LUMIA deve passare per la stessa pipeline di registrazione, con le stesse garanzie (attribuzione, contesto HTTP, diff cifrato, retention, redaction dei segreti).**

Conseguenze operative:

1. **Una sola API per i moduli**: `logChange(table, id, action, before, after, ctx)` per qualsiasi mutazione persistente. `logAudit()` resta solo per eventi che **non hanno** un record persistente associato (login, logout, csrf, denied, heartbeat).
2. **CRUD utenti convertiti a diff**: `admin.user.create` ⇒ `data.utenti.insert` con `after = snapshot`; `admin.user.update` ⇒ `data.utenti.update` con `before/after`; analoghi per `delete`, `reset_password`, `unlock`.
3. **Whitelist esplicita** in `src/db/audit-policy.js`: dichiara per ciascuna tabella auditata l'elenco di colonne da **redarre** prima dello snapshot. Tabelle non listate generano warning a console (fail-open) — è un invito a dichiararle.
4. **Redaction vs cifratura**: per i segreti puri (`password_hash`, `salt`, `iterations`, `token` di sessione) si usa la **redaction** (`"<redacted>"`, irreversibile) — un admin che consulta l'audit non deve poter ricostruire un hash. Per la PHI/PII (nome, email, codice fiscale, telefono) si usa la **cifratura at-rest** del blob completo — l'admin può vederla in detail (legittimo per audit forense), chi accede al file DB no.
5. **Eventi senza HTTP** (job, prune, rotation chiave): `ctx.source = 'system:<job-name>'` viene fuso nei `dettagli` per chiarire la provenienza non-utente.

```
                                   ┌──────────────────────────────┐
                                   │  lumia.db                    │
                                   │                              │
                                   │  audit_log                   │
                                   │  ┌────────────────────────┐  │
   src/middleware/auth-gate.js ───►│  │ azione, ip, ua,        │  │
   app/auth/routes.js          ───►│  │ metodo, percorso,      │  │
   app/admin/routes.js         ───►│  │ esito, dettagli,       │  │
                                   │  │                        │  │
                                   │  │ + target_table         │  │
   app/agenda/controllers/*    ───►│  │ + target_id            │  │
   (via app/agenda/models/audit)   │  │ + before_data (enc)    │  │
                                   │  │ + after_data  (enc)    │  │
                                   │  └────────────────────────┘  │
                                   │                              │
                                   │  ───────────────────────     │
                                   │  agenda.db::audit_trail      │
                                   │  (legacy, no nuove scritture)│
                                   └──────────────────────────────┘
```

Una `SELECT * FROM audit_log` ora restituisce **sia eventi auth/sistema sia mutazioni di dato**, joinabili per `utente_id`.

> La tabella legacy `audit_trail` in `agenda.db` resta in catalogo come archivio storico ma **non riceve più nuove righe**; nessun backfill è stato eseguito sui record vecchi.

## 3. Tassonomia delle azioni

Il campo `azione` segue una convenzione gerarchica `<dominio>.<oggetto>.<verbo>`. La tabella mostra tutti i valori scritti dal codice attuale, raggruppati per dominio:

### Auth (login, logout, sessioni)
- `login.success` — login riuscito (`details: { must_change_password }`)
- `login.failed` — credenziali sbagliate / account bloccato (`details: { username, reason?, locked_until?, failures? }`)
- `logout` — invalidazione esplicita di sessione
- `auth.check` — heartbeat di sessione (low-frequency, opzionale)
- `auth.password_changed` — self-service change-password (`details: { revoked_other_sessions }`)
- `auth.session_revoked` — admin revoca sessione di un altro utente
- `auth.denied` — auth-gate ha rifiutato una richiesta (sessione mancante o ruolo insufficiente)
- `auth.password_change_required` — `forza_cambio_password=1` blocca la rotta richiesta
- `csrf.failure` — header `X-CSRF-Token` mancante o non corrispondente

### Sistema (job, retention, manutenzione)
Eventi originati da timer/job senza richiesta HTTP. `ctx.source = 'system:<job-name>'` viene aggiunto ai `dettagli` per identificarli. Al momento è un meccanismo previsto ma non ancora usato dai job esistenti (`pruneAuditLogs`, `cleanupSessions` non emettono audit propri).

### Data mutations (V3.M3.A11 + V3.M3.A12)
Generate da `logChange(table, id, action, before, after, ctx)` come `data.<table>.<verb>`. Verb in lowercase. Esempi correnti:

**Tabella `utenti`** — V3.M3.A12 (sostituisce i vecchi `admin.user.*`):
- `data.utenti.insert` — creazione utente (`POST /admin/utenti`)
- `data.utenti.update` — aggiornamento campi (`PUT /admin/utenti/:id`)
- `data.utenti.reset_password` — reset password admin
- `data.utenti.unlock` — sblocco account in lockout
- `data.utenti.delete` — eliminazione utente

**Tabelle agenda**:
- `data.appointments.insert` / `data.appointments.update` / `data.appointments.delete`
- `data.list_entries.insert` / `data.list_entries.update` / `data.list_entries.delete`
- `data.transfusion_requests.cascade_delete` — cancellata in cascata da `appointments.delete`

> La filtrazione client-side nel modulo Admin → Audit usa esattamente questa convenzione: `kind=auth` ⇒ `azione NOT LIKE 'data.%'`, `kind=data` ⇒ `azione LIKE 'data.%'`.

> **Snapshot redatti**: lo snapshot `before/after` per `data.utenti.*` ha sempre `password_hash`, `salt`, `iterations` sostituiti da `"<redacted>"` *prima* della cifratura del blob (vedi [03 §3](03-audit-api.md#3-audit-policy-whitelist--redaction)). L'admin che consulta il dettaglio non vede mai il segreto.

## 4. Garanzie e non-garanzie

### Cosa è garantito
- **Append-only** in scrittura: nessun endpoint applicativo modifica righe esistenti.
- **Attribuzione**: ogni evento ha `utente_id` (FK soft a `utenti.id` con `ON DELETE SET NULL`); se una richiesta arriva senza sessione (es. `auth.denied`), `utente_id IS NULL`.
- **Contesto HTTP**: `ip`, `user_agent`, `metodo`, `percorso` popolati per tutti gli eventi originati da request.
- **Cifratura at-rest** dei campi sensibili: `before_data` e `after_data` sono cifrati con AES-256-GCM (vedi [05](05-audit-retention-security.md)).
- **Redaction dei segreti irreversibili**: `password_hash`, `salt`, `iterations`, `token` di sessione vengono sostituiti da `"<redacted>"` *prima* di entrare nel blob cifrato. Policy centralizzata in `src/db/audit-policy.js`.
- **Coverage uniforme dei CRUD**: tutti i moduli che mutano stato (admin/utenti, agenda/appointments, agenda/list_entries) emettono diff before/after via la stessa primitiva `logChange()`. Una mutazione su tabella non listata in `audit-policy.js` produce un warning a console (non blocca).
- **Retention configurabile** con prune giornaliero (default 365 giorni).

### Cosa NON è garantito
- **Tamper-evidence forte**: la tabella è un comune `INSERT INTO`. Un attaccante con accesso al DB può modificare/eliminare righe. Non c'è hash-chain né WORM. Per uso forense considerare l'export periodico verso un sink immutabile.
- **Backfill `audit_trail` → `audit_log`**: i record pre-V3 in `agenda.db::audit_trail` non sono stati migrati. Per consultarli serve aprire `agenda.db` separatamente.
- **High-throughput**: ogni `logAudit`/`logChange` è una `INSERT` sincrona su sql.js (WASM, in-memory + flush debounced). A migliaia di evt/sec saturerebbe; per LUMIA (~1000 req/giorno) è abbondante.
- **Coverage automatica**: la chiamata a `logChange()` resta a discrezione dello sviluppatore del controller. La policy whitelist *segnala* le tabelle non dichiarate ma non *intercetta* le query SQL: un `INSERT` diretto al DB senza chiamata `logChange()` non viene auditato. La mitigazione strutturale (audited-repo wrapper transazionale) è prevista come step futuro.

