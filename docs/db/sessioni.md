# Tabella `sessioni`

Gestione delle sessioni di autenticazione attive. Ogni login crea un record sessione con token univoco.

## Campi

| Campo | Tipo | Vincoli | Default | Descrizione |
|-------|------|---------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificativo univoco auto-incrementale |
| `utente_id` | INTEGER | NOT NULL, FK → `utenti(id)` | — | Riferimento all'utente proprietario della sessione |
| `token` | TEXT | UNIQUE NOT NULL | — | Token di sessione (96 caratteri, crypto-random hex). Usato nel cookie `session` |
| `valida` | INTEGER | NOT NULL | `1` | Flag validità: `1` = attiva, `0` = invalidata (logout o scadenza) |
| `ip` | TEXT | — | `NULL` | Indirizzo IP del client al momento del login |
| `user_agent` | TEXT | — | `NULL` | User-Agent del browser al momento del login |
| `creata_il` | TEXT | — | `datetime('now')` | Timestamp ISO 8601 di creazione della sessione |
| `ultimo_accesso` | TEXT | — | `datetime('now')` | Timestamp ISO 8601 dell'ultimo accesso autenticato. Aggiornato ad ogni richiesta API |
| `scade_il` | TEXT | NOT NULL | — | Timestamp ISO 8601 di scadenza assoluta (max 24h dal login) |

## Note

- Ogni login genera un nuovo token da 96 caratteri hex tramite `crypto.randomBytes(48)`.
- La sessione ha doppia scadenza:
  - **Idle timeout** (30 min): se `ultimo_accesso` supera 30 minuti, la sessione è considerata scaduta.
  - **Scadenza assoluta** (24h): indipendentemente dall'attività, la sessione scade dopo 24 ore.
- Al logout, il campo `valida` viene impostato a `0`. Il record non viene cancellato per consentire audit.
- Il token viene inviato al browser come cookie `HttpOnly; Secure; SameSite=Strict`.

## Relazioni

- **N → 1** con `utenti` via `utente_id` (FOREIGN KEY)

## Indici impliciti

- `token` — indice UNIQUE automatico dal vincolo

## Query frequenti

```sql
-- Verifica sessione valida (usata da auth-gate)
SELECT s.*, u.username, u.ruolo, u.nome, u.cognome
FROM sessioni s
JOIN utenti u ON u.id = s.utente_id
WHERE s.token = ? AND s.valida = 1 AND s.scade_il > datetime('now');

-- Invalida sessione (logout)
UPDATE sessioni SET valida = 0 WHERE token = ?;

-- Cleanup sessioni scadute
UPDATE sessioni SET valida = 0 WHERE valida = 1 AND scade_il < datetime('now');
```
