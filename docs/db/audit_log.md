# Tabella `audit_log`

Registro delle azioni significative nel sistema. Usato per tracciabilità, debugging e conformità.

## Campi

| Campo | Tipo | Vincoli | Default | Descrizione |
|-------|------|---------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificativo univoco auto-incrementale |
| `azione` | TEXT | NOT NULL | — | Tipo di azione registrata (es. `login`, `logout`, `login_fallito`, `sessione_scaduta`, `accesso_api`) |
| `utente_id` | INTEGER | — | `NULL` | Riferimento all'utente che ha eseguito l'azione. `NULL` per azioni anonime (es. login fallito con username inesistente) |
| `ip` | TEXT | — | `NULL` | Indirizzo IP del client |
| `user_agent` | TEXT | — | `NULL` | User-Agent del browser/client |
| `metodo` | TEXT | — | `NULL` | Metodo HTTP della richiesta (GET, POST, PUT, DELETE) |
| `percorso` | TEXT | — | `NULL` | Percorso della richiesta API (es. `/api/scores/cllIPI`) |
| `esito` | TEXT | — | `'successo'` | Esito dell'operazione: `successo`, `fallito`, `errore` |
| `dettagli` | TEXT | — | `NULL` | Dettagli aggiuntivi in formato JSON stringificato. Contiene informazioni contestuali (es. motivo del fallimento, parametri) |
| `creato_il` | TEXT | — | `datetime('now')` | Timestamp ISO 8601 di registrazione dell'evento |

## Note

- Il campo `dettagli` è un JSON stringificato. Non ha uno schema fisso — il contenuto varia in base al tipo di `azione`.
- `utente_id` non ha vincolo FOREIGN KEY esplicito per permettere la registrazione di azioni su utenti inesistenti o cancellati.
- La tabella cresce nel tempo. Una procedura di pruning (`pruneAuditLogs`) elimina i record più vecchi della retention configurata (default: 90 giorni, configurabile via `LUMIA_AUDIT_RETENTION_DAYS`).
- L'audit log è write-heavy e read-rare. Non sono previsti indici aggiuntivi oltre alla PRIMARY KEY.

## Azioni registrate

| Azione | Quando | Dettagli tipici |
|--------|--------|-----------------|
| `login` | Login riuscito | `{ username }` |
| `login_fallito` | Credenziali errate | `{ username, motivo }` |
| `logout` | Logout volontario | — |
| `sessione_scaduta` | Sessione invalidata per timeout | `{ token_prefix }` |
| `accesso_api` | Richiesta API autenticata | `{ endpoint }` |
| `cambio_password` | Utente cambia password | — |
| `utente_creato` | Admin crea nuovo utente | `{ username, ruolo }` |
| `utente_disabilitato` | Admin disabilita utente | `{ username }` |

## Relazioni

- **N → 1** con `utenti` via `utente_id` (riferimento logico, non FK esplicita)

## Query frequenti

```sql
-- Ultimi 50 eventi
SELECT * FROM audit_log ORDER BY creato_il DESC LIMIT 50;

-- Login falliti nelle ultime 24h per un IP
SELECT COUNT(*) FROM audit_log
WHERE azione = 'login_fallito' AND ip = ? AND creato_il > datetime('now', '-1 day');

-- Pruning record vecchi (> 90 giorni)
DELETE FROM audit_log WHERE creato_il < datetime('now', '-90 days');
```
