# Hemato — Analisi stato M0 (16 marzo 2026)

## 🔴 Bug critici — il server non parte

### 1. Export/import mismatch (3 file)

Le riscritture Express → Node puro hanno disallineato gli export con il modo in cui `api-server.js` li importa.

| File | Esporta | api-server.js chiama | Problema |
|------|---------|----------------------|----------|
| `server/middleware/auth.js:33` | `module.exports = checkAuth` (bare) | `const { checkAuth } = require(...)` (destructured) | `checkAuth` → `undefined` |
| `server/routes/diagnostics.js:96` | `module.exports = handle` (bare) | `diagnosticsRoute.handle(...)` | `.handle` non esiste su bare function |
| `server/routes/scores.js:84` | `module.exports = handle` (bare) | `scoresRoute.handle(...)` | Idem |

> `therapy.js` è OK: esporta `{ init, handle }` — coerente.

**Fix:** cambiare gli export in `{ checkAuth }`, `{ handle }`, `{ handle }` oppure adeguare le import in api-server.js.

### 2. node_modules non esiste

`npm install` non è mai stato eseguito. Né `electron` né `ws` sono installati. Nessun `package-lock.json`.

---

## 🟡 Inconsistenze moderate

### 3. hemato-presets.js — stato ambiguo

- Il terminale mostra un `Remove-Item` ma il file **esiste ancora** su disco (`app/core/hemato-presets.js`).
- `index.html` riga 306 lo carica: `<script src="./app/core/hemato-presets.js" defer>`.
- **Decisione necessaria:** eliminare definitivamente + togliere il tag, oppure tenerlo.

### 4. ROADMAP.md stale (almeno 6 punti)

| Sezione | Dice | Realtà |
|---------|------|--------|
| Diagramma architettura | "Express + WebSocket Server" | `http.createServer` puro + `ws` |
| Tabella stack | "Express 4" | Zero framework, solo built-in Node.js |
| M0 file table | `package.json → Dipendenze: electron, express, ws, uuid` | Solo `electron` + `ws`. `uuid` sostituito da `crypto.randomUUID()` |
| M0 file table | `api-server.js → Express app + WS attach` | HTTP server puro Node.js |
| Descrizione M0 | "Fondazione: Electron, Express, WebSocket" | Express eliminato |
| Stati moduli | Tutti ⬜ / 🔨 | M0 implementato, M1–M6 hanno route complete |

### 5. index.app.html

Esiste nella root accanto a `index.html`. Potenziale confusione, probabilmente legacy.

---

## 🟢 Cosa funziona

| Area | Stato | Note |
|------|-------|------|
| Server puro Node.js | ✅ | Nessun riferimento a express/cors/uuid (a parte export bug) |
| `server/routes/therapy.js` | ✅ | Unico route con export corretto `{ init, handle }` |
| `server/ws-handler.js` | ✅ | `crypto.randomUUID()`, nessun uuid |
| `server/config.js` | ✅ | `crypto.randomUUID()` per API key |
| `server/engine-loader.js` | ✅ | Carica *-core.js via vm sandbox |
| B-LPD diagnostico (M1) | ✅ | core + ui + route pronti |
| CLL, DLBCL, FL, MCL (M3–M6) | ✅ | Hanno `*-core.js` + `*-ui.js` + `*-helper.js` |
| Scores (M2) | ✅ | 11 calcolatori in hemato-scores.js + route |
| MM, MDS, CMML, AML (M8–M11) | ⬜ | Solo `*-helper.js`, nessun `*-core.js` — non pronti per API |

---

## 📋 Prossimi passi (priorità)

| # | Azione | Effort | Priorità |
|---|--------|--------|----------|
| 1 | Fix 3 export mismatch (auth, diagnostics, scores) | 5 min | 🔴 Critico |
| 2 | `npm install` | 1 min | 🔴 Critico |
| 3 | Test avvio `node server/api-server.js` | 2 min | 🔴 Validazione |
| 4 | Risolvere hemato-presets.js (tenere o eliminare + pulire index.html) | 3 min | 🟡 Pulizia |
| 5 | Aggiornare ROADMAP.md (Express → Node puro, stati moduli) | 10 min | 🟡 Documentazione |
| 6 | Test curl su ogni endpoint (health, catalog, scores, diagnostic, therapy) | 10 min | 🟡 Validazione M0–M6 |
| 7 | Decidere direzione: completare M7–M11 (scheletri) oppure raffinare UI/UX | — | ⚪ Strategico |
