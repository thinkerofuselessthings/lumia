# Tabella `utenti`

Anagrafica degli utenti abilitati al sistema LUMIA.

## Campi

| Campo | Tipo | Vincoli | Default | Descrizione |
|-------|------|---------|---------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | — | Identificativo univoco auto-incrementale |
| `username` | TEXT | UNIQUE NOT NULL | — | Nome utente per il login. Deve essere univoco nel sistema |
| `password_hash` | TEXT | NOT NULL | — | Hash della password (PBKDF2-SHA512) codificato in hex |
| `salt` | TEXT | NOT NULL | — | Salt crittografico random (hex) usato per l'hashing |
| `iterations` | INTEGER | NOT NULL | `600000` | Numero di iterazioni PBKDF2. Valore alto per resistenza a brute-force |
| `nome` | TEXT | — | `NULL` | Nome proprio dell'utente |
| `cognome` | TEXT | — | `NULL` | Cognome dell'utente |
| `ruolo` | TEXT | NOT NULL | `'medico'` | Ruolo nell'applicazione. Valori previsti: `admin`, `medico` |
| `email` | TEXT | — | `NULL` | Indirizzo email (opzionale, per notifiche future) |
| `attivo` | INTEGER | NOT NULL | `1` | Flag attivazione: `1` = attivo, `0` = disabilitato. Un utente disabilitato non può effettuare login |
| `forza_cambio_password` | INTEGER | NOT NULL | `0` | Se `1`, l'utente deve cambiare password al prossimo login |
| `creato_il` | TEXT | — | `datetime('now')` | Timestamp ISO 8601 di creazione del record |
| `aggiornato_il` | TEXT | — | `datetime('now')` | Timestamp ISO 8601 dell'ultimo aggiornamento |

## Note

- La password non viene mai salvata in chiaro. Si conservano solo `password_hash`, `salt` e `iterations`.
- L'algoritmo di hashing è PBKDF2 con digest SHA-512, 600.000 iterazioni (standard OWASP 2024+).
- Il campo `ruolo` determina i permessi: `admin` ha accesso completo, `medico` accede solo alle funzionalità cliniche.
- Il campo `attivo` permette di disabilitare un utente senza cancellarlo, preservando l'integrità referenziale con `sessioni` e `audit_log`.

## Relazioni

- **1 → N** con `sessioni` (un utente può avere più sessioni)
- **1 → N** con `audit_log` (un utente genera più record di audit)

## Indici impliciti

- `username` — indice UNIQUE automatico dal vincolo
