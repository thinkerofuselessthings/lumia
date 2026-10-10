# LUMIA — Documentazione Moduli

> Layered Unified Modular Interface Assistant v0.0.1

## Indice

| Sezione | File | Descrizione |
|---------|------|-------------|
| **Shell** | | Layer di navigazione e gestione applicazione |
| | [shell-state](shell/shell-state.md) | Stato globale, registry moduli, utility condivise |
| | [shell-navigation](shell/shell-navigation.md) | Navigazione Library ↔ Layer, gestione moduli aperti |
| | [shell-admin](shell/shell-admin.md) | Modulo admin — CRUD utenti, audit log, agenda |
| | [shell-modules](shell/shell-modules.md) | Content provider: tools, docs, agenda, user |
| | [shell-init + guard](shell/shell-init-guard.md) | Inizializzazione app + protezione sessione single-tab |
| **Core** | | Moduli infrastrutturali condivisi |
| | [core-modules](core/core-modules.md) | LayerSystem, events, API registry, scores, export, UI factory, a11y, toast, stepper, form, library, presets, molecular, content-bridge, registry |
| **Diagnostica** | | Moduli diagnostici clinici |
| | [cd-b-lpd](diagnostics/cd-b-lpd.md) | Diagnosi differenziale B-LPD basata su immunofenotipo CD |
| **Utility** | | Strumenti clinici |
| | [fil-fitness](utility/fil-fitness.md) | Valutazione geriatrica FIL sGA/EPI |
| **Terapia** | | Motori terapeutici per patologia |
| | [therapy-modules](diseases/therapy-modules.md) | CLL, DLBCL, FL, MCL (completi) + AML, CMML, MDS, MM (skeleton) |
| **Server** | | Architettura backend |
| | [server-architecture](server/server-architecture.md) | HTTP server, auth, DB, engine-loader, API REST |

## Architettura generale

```
┌─ Browser (index.html) ──────────────────────────────────┐
│                                                          │
│  Shell ─── state → navigation → admin → modules → init  │
│    │         → session-guard                             │
│    │                                                     │
│  Core ──── LayerSystem, Events, API, Scores, Export…     │
│    │                                                     │
│  Diagnostica ── CD B-LPD (data → core → knowledge → UI) │
│    │                                                     │
│  Utility ────── FIL Fitness (data → core → UI → helper)  │
│    │                                                     │
│  Terapia ────── CLL/DLBCL/FL/MCL (core → UI)            │
│                 AML/CMML/MDS/MM (skeleton helper)        │
│                                                          │
└──────────────────────────────────────────────────────────┘
         │
         │  REST API + WebSocket
         ▼
┌─ Node.js Server (src/init.js) ──────────────────────────┐
│                                                          │
│  engine-loader ── VM sandbox: riusa browser *-core.js    │
│  routes ───────── diagnostic, scores, therapy, system    │
│  http/ ────────── router, request-handler, static        │
│  middleware/ ──── auth-gate, CORS, CSRF, rate-limiter    │
│  db/ ──────────── SQLite (utenti, sessioni, audit_log)   │
│  auth/ ────────── PBKDF2-SHA512, session tokens          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Stack tecnologico

| Componente | Tecnologia |
|------------|------------|
| Frontend | Vanilla JS (IIFE, window globals), CSS custom |
| Backend | Node.js v22 (zero framework) |
| Database | SQLite via sql.js |
| Auth | PBKDF2-SHA512, session cookie, CSRF HMAC |
| Icons | HugeIcons (CDN) |
| Windowing | LayerSystem custom (parent→child nodes) |
