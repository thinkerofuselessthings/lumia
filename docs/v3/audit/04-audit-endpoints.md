# 04 — Audit: Endpoint REST e UI

Tutti gli endpoint di consultazione audit sono **admin-only** (auth-gate enforce `role: "admin"`, vedi [`../server/03-server-middleware.md`](../server/03-server-middleware.md)).

Base path: `/api/admin/audit-logs`.

## 1. `GET /api/admin/audit-logs` — lista paginata e filtrata

Definito in `app/admin/routes.js`.

### Query string

| Parametro | Tipo | Default | Descrizione |
|-----------|------|---------|-------------|
| `page` | int ≥ 1 | 1 | Pagina (alternativa a `offset`). |
| `page_size` | int 1–500 | 50 | Elementi per pagina (alternativa a `limit`). |
| `limit` | int 1–500 | 50 | Sinonimo di `page_size`. |
| `offset` | int ≥ 0 | 0 | Sinonimo posizionale di `(page-1)*page_size`. |
| `kind` | enum | — | `auth` ⇒ `azione NOT LIKE 'data.%'`; `data` ⇒ `azione LIKE 'data.%'`; assente o `all` ⇒ tutto. |
| `q` | string | — | Ricerca substring case-insensitive su `azione`, `percorso`, `dettagli`. |
| `esito` | enum | — | `successo` o `fallito`. |
| `utente_id` | int | — | Filtra per attore. |
| `target_table` | string | — | Es. `appointments`. Filtra solo le mutazioni su quella tabella. |
| `from` | datetime | — | Limite inferiore su `creato_il` (`>=`). Formato `YYYY-MM-DD HH:MM:SS`. |
| `to` | datetime | — | Limite superiore su `creato_il` (`<=`). |

### Response

```json
{
  "ok": true,
  "logs": [
    {
      "id": 1234,
      "azione": "data.appointments.update",
      "utente_id": 1,
      "ip": "10.4.60.36",
      "user_agent": "Mozilla/5.0 …",
      "metodo": "PUT",
      "percorso": "/api/agenda/appointments/42",
      "esito": "successo",
      "dettagli": null,
      "target_table": "appointments",
      "target_id": 42,
      "has_change": 1,
      "creato_il": "2026-04-21 14:52:55"
    }
  ],
  "items": [ /* alias di logs per compat con paginated() */ ],
  "page": 1,
  "page_size": 50,
  "total": 150,
  "total_pages": 3
}
```

> `has_change` è un booleano calcolato (`(before_data IS NOT NULL OR after_data IS NOT NULL)`) per permettere alla UI di mostrare un'icona "ci sono diff cliccabili" senza fare richieste extra. Gli snapshot stessi non vengono inviati nella lista (sono cifrati e voluminosi).

### Esempi

```bash
# Ultimi 50 eventi auth, ordinati per id desc
curl -b cookies.txt "/api/admin/audit-logs?kind=auth&limit=50"

# Tutte le mutazioni su appointments fatte oggi
curl -b cookies.txt "/api/admin/audit-logs?kind=data&target_table=appointments&from=2026-04-21%2000:00:00"

# V3.M3.A12: tutte le modifiche degli account utenti
curl -b cookies.txt "/api/admin/audit-logs?kind=data&target_table=utenti"

# Cerca tutti gli eventi che menzionano 'login'
curl -b cookies.txt "/api/admin/audit-logs?q=login"

# Eventi falliti
curl -b cookies.txt "/api/admin/audit-logs?esito=fallito&limit=200"
```

### Ordering

Sempre `ORDER BY id DESC` (più recenti per primi). Stabile e immune a clock skew.

## 2. `GET /api/admin/audit-logs/:id` — dettaglio singolo

### Comportamento

Recupera la riga, **decifra** `before_data`/`after_data` con `safeDecField()`, parsa il JSON, e parsa anche `dettagli` se è JSON-string.

### Response

```json
{
  "ok": true,
  "log": {
    "id": 1234,
    "azione": "data.appointments.update",
    "utente_id": 1,
    "ip": "10.4.60.36",
    "user_agent": "Mozilla/5.0 …",
    "metodo": "PUT",
    "percorso": "/api/agenda/appointments/42",
    "esito": "successo",
    "dettagli": null,
    "target_table": "appointments",
    "target_id": 42,
    "before": { "id": 42, "patient_name": "...", "status": "confirmed",  "start_time": "2026-04-21T10:00" },
    "after":  { "id": 42, "patient_name": "...", "status": "completed",  "start_time": "2026-04-21T10:00" },
    "creato_il": "2026-04-21 14:52:55"
  }
}
```

### Errori

- `404 NOT_FOUND` — id inesistente.
- `400 VALIDATION_INVALID { field: 'id' }` — id non numerico.
- `403 AUTH_ROLE_DENIED` — chiamante non admin.

### Note di sicurezza

- L'endpoint **decifra lato server** e ritorna in chiaro al browser. Questo è intenzionale: l'admin autenticato ha legittimo bisogno di vedere il diff per audit forense, e la response viaggia su sessione cifrata (HTTPS in produzione, vedi `SECURE_COOKIE`).
- Se `LUMIA_ENCRYPTION_KEY` non è configurata, `safeDecField()` ritorna il valore così com'è (legacy/degradato), evitando errori 500 ma loggando la mancata decifratura.

## 3. UI client — modulo Admin → Audit

File: `app/shell/shell-admin.js`, funzione `renderLogsTab()`. Caratteristiche:

### Toolbar di filtraggio

- **Tab pillola** `Tutti / Auth / Audit Trail` (mappata a `kind=`).
- **Search box** (debounced 250ms) → `q=`.
- Select **esito** → `esito=`.
- Date pickers **da / a** → `from=YYYY-MM-DD 00:00:00`, `to=YYYY-MM-DD 23:59:59`.
- Bottone **Reset** azzera tutto.
- Bottone **Aggiorna** ricarica.

### Tabella

| Col | Sorgente |
|-----|----------|
| Data | `new Date(creato_il + 'Z').toLocaleString('it-IT')` |
| Tipo | badge colorato derivato da `azione` (AUTH = blu, DATA = arancio, ADMIN = viola, SYS = grigio) |
| Azione | `azione` monospace + `›` se `has_change` o `dettagli` |
| Target | `target_table #target_id` o `—` |
| Utente | `utente_id` |
| IP | `ip` monospace |
| Esito | badge ok/no |

Click su riga → fetch `GET /admin/audit-logs/:id` e popola il pannello laterale.

### Pannello laterale (detail + diff)

Layout **due colonne** `1fr 420px`. Quando una riga è selezionata, il pannello mostra:

1. Badge tipo + `azione` + id + timestamp + esito.
2. Lista campi `Utente / IP / Metodo+Path / User-Agent / Target` se applicabili.
3. `dettagli` JSON pretty-printed in un `<pre>` se presente.
4. **Diff table** se `before` o `after` sono presenti:
   - una riga per ogni chiave dell'unione `keys(before) ∪ keys(after)`,
   - colonne `Campo / Prima / Dopo`,
   - righe con valori cambiati evidenziate (sfondo giallino), valori "prima" rossi, "dopo" verdi.

Esempio visuale (semplificato):

```
┌──────────────────────────────────────────────────────────┐
│ DATA  data.appointments.update      #1234   successo    │
│ utente: 1  ip: 10.4.60.36  PUT /api/agenda/appointments/42│
├─────────────────────────────────────────────────────────┤
│  Campo          Prima              Dopo                  │
│  status         confirmed          completed   ← yellow │
│  patient_name   Mario Rossi        Mario Rossi          │
│  start_time     2026-04-21T10:00   2026-04-21T10:00     │
└─────────────────────────────────────────────────────────┘
```

### Note implementative

- La UI dipende **esclusivamente** da `csrfToken` globale e dai due endpoint sopra. Nessuna chiamata diretta al DB.
- Il pannello laterale non viene ri-mountato a ogni click: si ri-renderizza in-place (`detailEl.innerHTML = …`).
- Il filtro client invia `limit=200` per default — sopra quel valore l'endpoint cap a 500.

## 4. Endpoint correlati (non specifici di audit ma referenziati dagli stessi flussi)

| Endpoint | Note |
|----------|------|
| `POST /api/admin/utenti/:id/unlock` | V3.M3.A12: genera `data.utenti.unlock` con diff (prima: `bloccato_fino_il`/`tentativi_falliti`; dopo: NULL/0). |
| `POST /api/admin/utenti/:id/reset-password` | V3.M3.A12: genera `data.utenti.reset_password` + forza `forza_cambio_password=1`. Snapshot con `password_hash`/`salt`/`iterations` redatti. |
| `DELETE /api/admin/utenti/:id` | V3.M3.A12: genera `data.utenti.delete` (l'`utente_id` di tutte le righe audit di quell'utente diventa NULL via `ON DELETE SET NULL`). |
| `POST /api/admin/utenti` | V3.M3.A12: genera `data.utenti.insert` con `after = snapshot completo` (segreti redatti). |
| `PUT /api/admin/utenti/:id` | V3.M3.A12: genera `data.utenti.update` con `before/after` (segreti redatti). |
| `GET /api/auth/sessions` / `DELETE /api/auth/sessions/:id` | Quando admin revoca una sessione altrui scrive `auth.session_revoked`. |
