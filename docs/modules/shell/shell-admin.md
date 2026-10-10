# shell-admin.js

> Modulo Admin — gestione utenti CRUD, log di audit, agenda (placeholder).

| Proprietà | Valore |
|-----------|--------|
| **File** | `app/shell/shell-admin.js` |
| **Righe** | ~345 |
| **Dipendenze** | `shell-state.js`, `LayerSystem`, `LumiaFormLayer`, `LumiaToast` |
| **Load order** | 3/6 nella catena shell |

## Scopo

Registra il content provider `'admin-module'` nel LayerSystem. Fornisce l'interfaccia di amministrazione con 3 tab: gestione utenti, log di audit e agenda (WIP).

## Content Provider

```js
LayerSystem.registerContent('admin-module', {
  render(container, node) { … },
  destroy(container) { … }
});
```

## Tab

### 1. Utenti

- **Lista utenti**: `GET /api/admin/users` → tabella con username, ruolo, azioni
- **Crea utente**: modal form via `LumiaFormLayer.openFormLayer()` → `POST /api/admin/users`
- **Modifica utente**: inline edit ruolo → `PUT /api/admin/users/:id`
- **Reset password**: modal form → `PUT /api/admin/users/:id/password`
- **Elimina utente**: conferma → `DELETE /api/admin/users/:id`

Campi form:

```js
fieldsCreate  = [username, password, confirm, ruolo]
fieldsEdit    = [ruolo]
fieldsResetPwd = [password, confirm]
```

Ruoli disponibili: `['admin', 'medico', 'specializzando', 'biologo', 'infermiere', 'readonly']`

### 2. Log

- **Audit trail**: `GET /api/admin/audit` → tabella cronologica
- Colonne: timestamp, utente, azione, metodo, path, esito, dettagli
- Refresh manuale

### 3. Agenda

- Placeholder per funzionalità futura

## Guardia ruolo

Solo utenti con `role === 'admin'` possono accedere. Se l'utente non è admin, il tab mostra un messaggio di accesso negato.

```js
if (window._currentUser?.role !== 'admin') {
  container.innerHTML = '⛔ Accesso riservato agli amministratori';
  return;
}
```

## Dipendenze API server

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/admin/users` | GET | Lista utenti |
| `/api/admin/users` | POST | Crea utente |
| `/api/admin/users/:id` | PUT | Modifica ruolo |
| `/api/admin/users/:id/password` | PUT | Reset password |
| `/api/admin/users/:id` | DELETE | Elimina utente |
| `/api/admin/audit` | GET | Log audit |

Tutte le chiamate includono header `X-CSRF-Token` e cookie di sessione.

## Note

- Estratto da `shell-modules.js` durante Phase D del refactoring.
- Le form utilizzano `LumiaFormLayer` per consistenza con il pattern modale dell'app.
- La funzione `esc()` da shell-state previene XSS nei dati utente renderizzati.
