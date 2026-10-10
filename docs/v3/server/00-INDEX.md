# LUMIA — Documentazione V3

Versione: **V3 (perfezionamento)**
Ambito di questa cartella: documentazione di riferimento canonica del software LUMIA, ricostruita dal codice sorgente al netto della documentazione storica conservata in `docs/` (V1) e `docs/agenda/`, `docs/cerus/`, `docs/lumia/`, `docs/modules/` (V2).

---

## Indice

### Server (questo blocco)

| # | File | Argomento |
|---|------|-----------|
| 01 | [01-server-overview.md](01-server-overview.md) | Architettura generale, bootstrap, ciclo di vita di una richiesta |
| 02 | [02-server-http-stack.md](02-server-http-stack.md) | `server.js`, request-handler, mini-router, body-parser, response helpers, file server statico |
| 03 | [03-server-middleware.md](03-server-middleware.md) | security headers + CSP, CORS, cookies, CSRF, rate-limiter, auth-gate (dual auth + role check) |
| 04 | [04-server-auth.md](04-server-auth.md) | Schema `utenti`/`sessioni`, hashing password (PBKDF2), ciclo di vita sessione, seeding admin, endpoint auth |
| 05 | [05-server-database.md](05-server-database.md) | Wrapper sql.js, schema `lumia.db` (utenti, sessioni, audit_log), schema `agenda.db`, audit + retention |
| 06 | [06-server-errors.md](06-server-errors.md) | Modello `AppError`, catalogo codici di errore, contratto risposta `{ ok:false, error:{...} }` |
| 07 | [07-server-api-reference.md](07-server-api-reference.md) | Catalogo completo endpoint REST (system, auth, admin, agenda, scores, diagnostic, therapy) |
| 08 | [08-server-config.md](08-server-config.md) | Variabili `.env`, `lumia.config.json`, precedenza, integrazione Cerus |
| 10 | [10-server-analysis.md](10-server-analysis.md) | Analisi critica: bug, vulnerabilità, punti deboli, gap di compliance, roadmap di hardening per "gestionale dati sensibili" |
| 11 | [11-roadmap.md](11-roadmap.md) | Roadmap eseguibile (M1→M5) con criteri di "fatto", file impattati, rischi |
| 12 | [12-changelog.md](12-changelog.md) | Log append-only delle modifiche applicate per ciascuna voce della roadmap |

### Client / Moduli (prossimi blocchi V3)

Da scrivere nelle iterazioni successive del perfezionamento:

- `10-client-shell.md` — `app/shell/*`, sessione lato client, navigazione
- `11-client-core.md` — `app/core/lumia-*.js` (api, events, scores, library, presets, ui-factory, …)
- `12-modules-agenda.md` — modulo Agenda lato client
- `13-modules-prestazioni.md` — modulo Prestazioni
- `14-modules-laboratorio.md` — modulo Laboratorio
- `15-modules-diseases.md` — calcolatori per patologia (CLL, FL, MCL, DLBCL, MDS, MM, AML, CMML)
- `16-modules-diagnostics.md` — CD-Based B-LPD diagnostic engine
- `17-build-deploy.md` — build, packaging, deploy
- `18-testing.md` — `tests/stress-test.js`, strategie

---

## Convenzioni di lettura

- **Lingua**: italiano per la prosa, inglese per identificatori e codice (riflette il codice sorgente).
- **Path**: relativi alla root del repository (es. `src/init.js`).
- **Stato del codice**: descritto al **commit corrente** della repo `lumia/` al momento dell'apertura della fase V3. In caso di divergenze, il codice fa fede.
- **Server**: unico, in `src/` (entry: `npm start` → `node src/init.js`). La vecchia cartella `server/` (stack legacy http+ws) è stata **rimossa** nella fase V3 perché non più referenziata da nessuna parte del codice né dagli script npm.
