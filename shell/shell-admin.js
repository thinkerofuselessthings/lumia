/**
 * shell-admin.js — Admin module content provider
 * User management (CRUD), audit logs, agenda placeholder
 * Depends on: shell-state.js (state, csrfToken, esc, buildLayerLayout, buildLayerLayoutV2, setupLayerV2)
 */

/* ── Admin (user management — admin-only) ── */
window.LayerSystem.registerContent('admin-module', {
  label: 'Admin',
  render: function(container, context) {
    /* Client-side role guard (server enforces via AUTH_ROLE_DENIED) */
    if (!window._currentUser || window._currentUser.ruolo !== 'admin') {
      container.innerHTML = buildLayerLayout({ badge: 'hgi-settings-02', moduleKey: 'admin', nodeId: context.nodeId });
      var mainDenied = container.querySelector('.layer-main-content');
      mainDenied.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;';
      mainDenied.innerHTML =
        '<div style="text-align:center;">' +
          '<i class="hgi-stroke hgi-alert-02" style="font-size:48px;color:#e53e3e;display:block;margin-bottom:16px;"></i>' +
          '<h2 style="margin:0 0 8px;font-size:18px;">Accesso negato</h2>' +
          '<p style="font-size:13px;color:var(--muted);margin:0;">Solo gli utenti Admin possono accedere a questo pannello.</p>' +
        '</div>';
      return;
    }

    /* ── Layout with sidebar tabs ── */
    container.innerHTML = buildLayerLayout({
      badge: 'hgi-settings-02',
      moduleKey: 'admin',
      nodeId: context.nodeId
    });

    var contentArea = container.querySelector('.layer-main-content');
    contentArea.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;';

    /* ── Setup dynamic tab manager with sections ── */
    setupLayerTabs(container, [
      { key: 'utenti', icon: 'hgi-user-group', title: 'Utenti', desc: 'Gestione utenti del sistema', render: function(el) { contentArea = el; contentArea.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;'; renderUtentiTab(); } },
      { key: 'logs', icon: 'hgi-file-02', title: 'Audit Log', desc: 'Registro attività e accessi', render: function(el) { contentArea = el; contentArea.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;'; renderLogsTab(); } },
      { key: 'agenda', icon: 'hgi-calendar-03', title: 'Gestione Agende', desc: 'Configurazione agende e flussi', render: function(el) { contentArea = el; contentArea.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;'; renderAgendaTab(); } }
    ], { defaultSection: 'utenti' });

    /* ═══════════════════════════════════
     *  ROLES
     * ═══════════════════════════════════ */
    var RUOLI = [
      ['admin', 'Admin'],
      ['medico', 'Medico'],
      ['infermiere', 'Infermiere'],
      ['tecnico', 'Tecnico'],
      ['amministrativo', 'Amministrativo']
    ];

    /* ═══════════════════════════════════
     *  FIELD DEFINITIONS
     * ═══════════════════════════════════ */
    function fieldsCreate() {
      return [
        { key: 'username', label: 'Username', required: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'nome', label: 'Nome' },
        { key: 'cognome', label: 'Cognome' },
        { key: 'ruolo', label: 'Ruolo', type: 'select', options: RUOLI, defaultValue: 'medico' },
        { key: 'password', label: 'Password', type: 'password', required: true }
      ];
    }

    function fieldsEdit(user) {
      return [
        { key: 'username', label: 'Username', readonly: true },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'nome', label: 'Nome' },
        { key: 'cognome', label: 'Cognome' },
        { key: 'ruolo', label: 'Ruolo', type: 'select', options: RUOLI },
        { key: 'attivo', label: 'Attivo', type: 'select', options: [['1','Sì'],['0','No']] }
      ];
    }

    function fieldsResetPwd() {
      return [
        { key: 'password', label: 'Nuova password (min 8 caratteri)', type: 'password', required: true }
      ];
    }

    /* ═══════════════════════════════════
     *  Get admin fullscreen node ID
     * ═══════════════════════════════════ */
    function getAdminNodeId() {
      return state.openModules['admin'] || null;
    }

    /* ═══════════════════════════════════
     *  Tab renderer
     * ═══════════════════════════════════ */
    /* ─── UTENTI TAB ─── */
    function renderUtentiTab() {
      contentArea.innerHTML =
        '<div class="admin-tab-header">' +
          '<div>' +
            '<h2 class="admin-tab-title">Utenti</h2>' +
            '<p class="admin-tab-subtitle">Gestione utenti del sistema</p>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            '<button id="admin-btn-new" class="admin-btn admin-btn--primary" type="button">+ Nuovo utente</button>' +
            '<button id="admin-btn-refresh" class="admin-btn" type="button">Aggiorna</button>' +
          '</div>' +
        '</div>' +
        '<div id="admin-users-table" class="admin-tab-body"></div>';

      var tableWrap = contentArea.querySelector('#admin-users-table');

      contentArea.querySelector('#admin-btn-new').addEventListener('click', function() { openCreateModal(); });
      contentArea.querySelector('#admin-btn-refresh').addEventListener('click', function() { loadUsers(); });

      function loadUsers() {
        tableWrap.innerHTML = '<p class="admin-loading">Caricamento…</p>';
        fetch('/api/admin/utenti', { credentials: 'same-origin' })
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (!d.ok) { tableWrap.innerHTML = '<p class="admin-error">Errore: ' + esc(d.error && d.error.message || 'sconosciuto') + '</p>'; return; }
            renderUserTable(d.utenti || []);
          })
          .catch(function() { tableWrap.innerHTML = '<p class="admin-error">Errore di rete</p>'; });
      }

      function renderUserTable(users) {
        if (!users.length) { tableWrap.innerHTML = '<p class="admin-empty">Nessun utente.</p>'; return; }
        var h = '<table class="admin-table">' +
          '<thead><tr>' +
            '<th>ID</th><th>Username</th><th>Nome</th><th>Cognome</th>' +
            '<th>Ruolo</th><th>Email</th><th>Attivo</th><th>Azioni</th>' +
          '</tr></thead><tbody>';
        users.forEach(function(u) {
          var badge = u.attivo
            ? '<span class="admin-badge admin-badge--ok">Sì</span>'
            : '<span class="admin-badge admin-badge--no">No</span>';
          h += '<tr>' +
            '<td>' + u.id + '</td>' +
            '<td class="admin-td-bold">' + esc(u.username) + '</td>' +
            '<td>' + esc(u.nome || '—') + '</td>' +
            '<td>' + esc(u.cognome || '—') + '</td>' +
            '<td>' + esc(u.ruolo) + '</td>' +
            '<td>' + esc(u.email || '—') + '</td>' +
            '<td>' + badge + '</td>' +
            '<td class="admin-td-actions">' +
              '<button class="admin-tbl-btn admin-edit" data-id="' + u.id + '" type="button">Modifica</button>' +
              '<button class="admin-tbl-btn admin-reset" data-id="' + u.id + '" type="button">Reset pwd</button>' +
              (u.username !== 'admin' ? '<button class="admin-tbl-btn admin-tbl-btn--danger admin-delete" data-id="' + u.id + '" data-name="' + esc(u.username) + '" type="button">Elimina</button>' : '') +
            '</td></tr>';
        });
        h += '</tbody></table>';
        tableWrap.innerHTML = h;
      }

      /* ── Event delegation for table actions ── */
      tableWrap.addEventListener('click', function(e) {
        var editBtn = e.target.closest('.admin-edit');
        if (editBtn) {
          fetch('/api/admin/utenti/' + editBtn.dataset.id, { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(d) { if (d.ok) openEditModal(d.utente); });
          return;
        }
        var resetBtn = e.target.closest('.admin-reset');
        if (resetBtn) { openResetPwdModal(resetBtn.dataset.id); return; }
        var delBtn = e.target.closest('.admin-delete');
        if (delBtn) { confirmDelete(delBtn.dataset.id, delBtn.dataset.name); return; }
      });

      /* ── Create user modal ── */
      function openCreateModal() {
        var fl = fieldsCreate();
        var html = window.LumiaFormLayer.buildForm(fl, {});
        window.LumiaFormLayer.openFormLayer(getAdminNodeId(), 'Nuovo utente', html, function(formContainer, nodeId, showErr) {
          var data = window.LumiaFormLayer.collectForm(fl, formContainer);
          if (!data.username || !data.password) { showErr('Username e password obbligatori'); return; }
          fetch('/api/admin/utenti', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify(data)
          })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (!d.ok) { showErr(d.error && d.error.message || 'Errore'); return; }
              state.layerManager.closeNode(nodeId);
              loadUsers();
            })
            .catch(function() { showErr('Errore di rete'); });
        });
      }

      /* ── Edit user modal ── */
      function openEditModal(user) {
        var fl = fieldsEdit(user);
        var data = {
          username: user.username, email: user.email || '',
          nome: user.nome || '', cognome: user.cognome || '',
          ruolo: user.ruolo, attivo: String(user.attivo)
        };
        var html = window.LumiaFormLayer.buildForm(fl, data);
        window.LumiaFormLayer.openFormLayer(getAdminNodeId(), 'Modifica utente', html, function(formContainer, nodeId, showErr) {
          var formData = window.LumiaFormLayer.collectForm(fl, formContainer);
          delete formData.username;
          if (formData.attivo !== undefined) formData.attivo = Number(formData.attivo);
          fetch('/api/admin/utenti/' + user.id, {
            method: 'PUT', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify(formData)
          })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (!d.ok) { showErr(d.error && d.error.message || 'Errore'); return; }
              state.layerManager.closeNode(nodeId);
              loadUsers();
            })
            .catch(function() { showErr('Errore di rete'); });
        });
      }

      /* ── Reset password modal ── */
      function openResetPwdModal(userId) {
        var fl = fieldsResetPwd();
        var html = window.LumiaFormLayer.buildForm(fl, {});
        window.LumiaFormLayer.openFormLayer(getAdminNodeId(), 'Reset password', html, function(formContainer, nodeId, showErr) {
          var data = window.LumiaFormLayer.collectForm(fl, formContainer);
          if (!data.password || data.password.length < 8) { showErr('Password troppo corta (min 8 caratteri)'); return; }
          fetch('/api/admin/utenti/' + userId + '/reset-password', {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
            body: JSON.stringify({ password: data.password })
          })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (!d.ok) { showErr(d.error && d.error.message || 'Errore'); return; }
              state.layerManager.closeNode(nodeId);
              if (window.LumiaToast) window.LumiaToast.success('Password reimpostata');
            })
            .catch(function() { showErr('Errore di rete'); });
        }, { saveLabel: 'Reimposta' });
      }

      /* ── Delete user (confirm dialog) ── */
      function confirmDelete(userId, username) {
        if (!confirm('Eliminare l\'utente "' + username + '"? L\'azione è irreversibile.')) return;
        fetch('/api/admin/utenti/' + userId, {
          method: 'DELETE', credentials: 'same-origin',
          headers: { 'X-CSRF-Token': csrfToken }
        })
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (d.ok) loadUsers();
            else alert('Errore: ' + (d.error && d.error.message || 'sconosciuto'));
          })
          .catch(function() { alert('Errore di rete'); });
      }

      loadUsers();
    }

    /* ─── LOGS TAB ─── */
    function renderLogsTab() {
      contentArea.innerHTML =
        '<div class="admin-tab-header">' +
          '<div>' +
            '<h2 class="admin-tab-title">Audit Log</h2>' +
            '<p class="admin-tab-subtitle">Registro attività del sistema</p>' +
          '</div>' +
          '<button id="admin-logs-refresh" class="admin-btn" type="button">Aggiorna</button>' +
        '</div>' +
        '<div id="admin-logs-body" class="admin-tab-body"></div>';

      var logsBody = contentArea.querySelector('#admin-logs-body');

      contentArea.querySelector('#admin-logs-refresh').addEventListener('click', function() { loadLogs(); });

      function loadLogs() {
        logsBody.innerHTML = '<p class="admin-loading">Caricamento…</p>';
        fetch('/api/admin/audit-logs?limit=100', { credentials: 'same-origin' })
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (!d.ok) { logsBody.innerHTML = '<p class="admin-error">Errore: ' + esc(d.error && d.error.message || 'sconosciuto') + '</p>'; return; }
            renderLogsTable(d.logs || []);
          })
          .catch(function() { logsBody.innerHTML = '<p class="admin-error">Errore di rete</p>'; });
      }

      function renderLogsTable(logs) {
        if (!logs.length) { logsBody.innerHTML = '<p class="admin-empty">Nessun log presente.</p>'; return; }
        var h = '<table class="admin-table admin-table--logs">' +
          '<thead><tr>' +
            '<th>Data</th><th>Azione</th><th>Utente</th><th>IP</th><th>Esito</th><th>Dettagli</th>' +
          '</tr></thead><tbody>';
        logs.forEach(function(l) {
          var ts = l.creato_il ? new Date(l.creato_il).toLocaleString('it-IT') : '—';
          var esitoClass = l.esito === 'successo' ? 'admin-badge--ok' : 'admin-badge--no';
          h += '<tr>' +
            '<td class="admin-td-mono">' + esc(ts) + '</td>' +
            '<td>' + esc(l.azione || '—') + '</td>' +
            '<td>' + esc(l.utente_id || '—') + '</td>' +
            '<td class="admin-td-mono">' + esc(l.ip || '—') + '</td>' +
            '<td><span class="admin-badge ' + esitoClass + '">' + esc(l.esito || '—') + '</span></td>' +
            '<td class="admin-td-details">' + esc(l.dettagli || '—') + '</td>' +
          '</tr>';
        });
        h += '</tbody></table>';
        logsBody.innerHTML = h;
      }

      loadLogs();
    }

    /* ─── AGENDA TAB (Gestione Agende) ─── */
    function renderAgendaTab() {
      contentArea.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%">' +
          '<div class="gest-toolbar" id="gestToolbar"></div>' +
          '<div id="treeContainer" class="tree-container" style="flex:1"></div>' +
        '</div>' +
        /* Gestione modals */
        '<div class="svc-detail-backdrop" id="svcDetailBackdrop" onclick="if(event.target===this)closeSvcDetailOverlay()">' +
          '<div class="svc-detail-modal">' +
            '<div class="node-header">' +
              '<h2 id="svcDetailTitle">Dettaglio prestazione</h2>' +
              '<button class="node-close" onclick="closeSvcDetailOverlay()"><span class="icon" id="icoCloseSvcDetail"></span></button>' +
            '</div>' +
            '<div class="node-body" id="svcDetailBody"></div>' +
          '</div>' +
        '</div>' +
        '<div class="gest-modal-backdrop" id="gestSedeBackdrop" onclick="if(event.target===this)closeGestSede()">' +
          '<div class="gest-modal">' +
            '<div class="node-header"><h2 id="gestSedeTitle">Gestione sede</h2><button class="node-close" onclick="closeGestSede()"><span class="icon" id="icoCloseGestSede"></span></button></div>' +
            '<div class="gest-tabs" id="gestSedeTabs"></div>' +
            '<div class="node-body" id="gestSedeBody"></div>' +
          '</div>' +
        '</div>' +
        '<div class="gest-modal-backdrop" id="gestFlussoBackdrop" onclick="if(event.target===this)closeGestFlusso()">' +
          '<div class="gest-modal">' +
            '<div class="node-header"><h2 id="gestFlussoTitle">Gestione flusso</h2><button class="node-close" onclick="closeGestFlusso()"><span class="icon" id="icoCloseGestFlusso"></span></button></div>' +
            '<div class="gest-tabs" id="gestFlussoTabs"></div>' +
            '<div class="node-body" id="gestFlussoBody"></div>' +
          '</div>' +
        '</div>' +
        '<div class="gest-modal-backdrop" id="gestSvcBackdrop" onclick="if(event.target===this)closeGestSvc()">' +
          '<div class="gest-modal">' +
            '<div class="node-header">' +
              '<h2>Prestazioni</h2>' +
              '<button class="node-close" onclick="closeGestSvc()"><span class="icon" id="icoCloseGestSvc"></span></button>' +
            '</div>' +
            '<div class="node-body" id="gestSvcBody"></div>' +
          '</div>' +
        '</div>' +
        '<div class="gest-station-backdrop" id="gestStationBackdrop" onclick="if(event.target===this)closeGestStation()">' +
          '<div class="gest-station-modal">' +
            '<div class="node-header"><h2 id="gestStationTitle">Gestione postazione</h2><button class="node-close" onclick="closeGestStation()"><span class="icon" id="icoCloseGestStation"></span></button></div>' +
            '<div class="gest-tabs" id="gestStationTabs"></div>' +
            '<div class="node-body" id="gestStationBody"></div>' +
          '</div>' +
        '</div>' +
        '<div class="gest-cal-popover" id="gestCalPopover"></div>' +
        '<div class="ctx-menu" id="adminCtxMenu" style="display:none"></div>' +
        /* Shared util modals (confirm & input, only if not in DOM) */
        (!document.getElementById('confirmBackdrop') ?
          '<div class="confirm-backdrop" id="confirmBackdrop">' +
            '<div class="confirm-box">' +
              '<p id="confirmMsg"></p>' +
              '<div class="confirm-actions">' +
                '<button class="btn" onclick="resolveConfirm(false)">Annulla</button>' +
                '<button class="btn btn-danger" onclick="resolveConfirm(true)">Conferma</button>' +
              '</div>' +
            '</div>' +
          '</div>' : '') +
        (!document.getElementById('inputDlgBackdrop') ?
          '<div class="input-dialog-backdrop" id="inputDlgBackdrop" onclick="if(event.target===this)resolveInputDlg(null)">' +
            '<div class="input-dialog">' +
              '<label id="inputDlgLabel">Nome</label>' +
              '<input id="inputDlgInput" autocomplete="off">' +
              '<div class="input-dialog-actions">' +
                '<button class="btn" onclick="resolveInputDlg(null)">Annulla</button>' +
                '<button class="btn btn-primary" id="inputDlgOk" onclick="resolveInputDlg(document.getElementById(\'inputDlgInput\').value)">OK</button>' +
              '</div>' +
            '</div>' +
          '</div>' : '') +
        (!document.getElementById('ctxMenu') ?
          '<div class="ctx-menu" id="ctxMenu" style="display:none"></div>' : '');

      /* Boot gestione if LumiaAgenda is available */
      var Ag = window.LumiaAgenda;
      if (Ag && Ag.Gestione) {
        Ag.Gestione.init();
      }
    }
  },
  destroy: function() {}
});

/* ══════════════════════════════════════════════════════════════
 *  V2 Content Provider (tab strip + launcher layout)
 * ══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  var ADMIN_V2_CONFIG = {
    module: {
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
      title: 'Admin'
    },
    icons: {
      users: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      logs: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><line x1="10" x2="8" y1="9" y2="9"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>',
      auth: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
      calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      lib: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15H15C15.93 15 16.4 15 16.77 15.15C17.26 15.36 17.64 15.74 17.85 16.23C18 16.6 18 17.07 18 18C18 18.93 18 19.4 17.85 19.77C17.64 20.26 17.26 20.64 16.77 20.85C16.4 21 15.93 21 15 21H2"/><path d="M2 3H15C15.93 3 16.4 3 16.77 3.15C17.26 3.36 17.64 3.74 17.85 4.23C18 4.6 18 5.07 18 6C18 6.93 18 7.4 17.85 7.77C17.64 8.26 17.26 8.64 16.77 8.85C16.4 9 15.93 9 15 9H2"/><path d="M22 9H9C8.07 9 7.6 9 7.23 9.15C6.74 9.36 6.36 9.74 6.15 10.23C6 10.6 6 11.07 6 12C6 12.93 6 13.4 6.15 13.77C6.36 14.26 6.74 14.64 7.23 14.85C7.6 15 8.07 15 9 15H22"/></svg>',
      chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
    },
    sections: [
      { id: 'utenti',  label: 'Utenti',           icon: 'users',    desc: 'Gestione utenti del sistema',                   color: '#5BA88C', render: null },
      { id: 'auth',    label: 'Accessi',          icon: 'auth',     desc: 'Login, logout, lockout, CSRF, sessione',        color: '#73A5CA', render: null },
      { id: 'audit',   label: 'Audit dati',       icon: 'logs',     desc: 'Mutazioni di dato con diff before/after',       color: '#9B7EBE', render: null },
      { id: 'agenda',  label: 'Gestione Agende',  icon: 'calendar', desc: 'Configurazione agende e flussi',                color: '#E87F24', render: null }
    ],
    actions: [
      { id: '_close_layer', label: 'Chiudi Modulo', icon: 'close', desc: 'Chiudi il layer corrente', color: '#CE2626' },
      { id: '_library',     label: 'Libreria',      icon: 'lib',   desc: 'Torna alla libreria moduli', color: '#7DAACB' }
    ]
  };

  window.LayerSystem.registerContent('admin-module-v2', {
    label: 'Admin',
    render: function(container, context) {
      /* Client-side role guard */
      if (!window._currentUser || window._currentUser.ruolo !== 'admin') {
        container.innerHTML = buildLayerLayoutV2({ nodeId: context.nodeId, module: ADMIN_V2_CONFIG.module });
        var cArea = container.querySelector('.content');
        if (cArea) {
          cArea.innerHTML =
            '<div style="display:flex;align-items:center;justify-content:center;height:100%;">' +
              '<div style="text-align:center;">' +
                '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e53e3e" stroke-width="1.5" style="display:block;margin:0 auto 16px;"><path d="m21.7 16.4-9-14a1 1 0 0 0-1.7 0l-9 14A1 1 0 0 0 2.8 18h18.4a1 1 0 0 0 .8-1.6z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' +
                '<h2 style="margin:0 0 8px;font-size:18px;">Accesso negato</h2>' +
                '<p style="font-size:13px;color:var(--muted);margin:0;">Solo gli utenti Admin possono accedere a questo pannello.</p>' +
              '</div>' +
            '</div>';
        }
        return;
      }

      /* ── V2 Layout ── */
      container.innerHTML = buildLayerLayoutV2({
        nodeId: context.nodeId,
        module: ADMIN_V2_CONFIG.module
      });

      /* ═══════════════════════════════════
       *  ROLES & FIELD DEFINITIONS
       * ═══════════════════════════════════ */
      var RUOLI = [
        ['admin', 'Admin'],
        ['medico', 'Medico'],
        ['infermiere', 'Infermiere'],
        ['tecnico', 'Tecnico'],
        ['amministrativo', 'Amministrativo']
      ];

      function fieldsCreate() {
        return [
          { key: 'username', label: 'Username', required: true },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'nome', label: 'Nome' },
          { key: 'cognome', label: 'Cognome' },
          { key: 'ruolo', label: 'Ruolo', type: 'select', options: RUOLI, defaultValue: 'medico' },
          { key: 'password', label: 'Password', type: 'password', required: true }
        ];
      }

      function fieldsEdit(user) {
        return [
          { key: 'username', label: 'Username', readonly: true },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'nome', label: 'Nome' },
          { key: 'cognome', label: 'Cognome' },
          { key: 'ruolo', label: 'Ruolo', type: 'select', options: RUOLI },
          { key: 'attivo', label: 'Attivo', type: 'select', options: [['1','Sì'],['0','No']] }
        ];
      }

      function fieldsResetPwd() {
        return [
          { key: 'password', label: 'Nuova password (min 8 caratteri)', type: 'password', required: true }
        ];
      }

      function getAdminNodeId() {
        return state.openModules['admin'] || null;
      }

      /* ═══════════════════════════════════
       *  UTENTI
       * ═══════════════════════════════════ */
      function renderUtentiTab(contentArea) {
        contentArea.innerHTML =
          '<div class="admin-tab-header">' +
            '<div>' +
              '<h2 class="admin-tab-title">Utenti</h2>' +
              '<p class="admin-tab-subtitle">Gestione utenti del sistema</p>' +
            '</div>' +
            '<div style="display:flex;gap:8px;">' +
              '<button id="admin-btn-new" class="admin-btn admin-btn--primary" type="button">+ Nuovo utente</button>' +
              '<button id="admin-btn-refresh" class="admin-btn" type="button">Aggiorna</button>' +
            '</div>' +
          '</div>' +
          '<div id="admin-users-table" class="admin-tab-body"></div>';

        var tableWrap = contentArea.querySelector('#admin-users-table');
        contentArea.querySelector('#admin-btn-new').addEventListener('click', function() { openCreateModal(); });
        contentArea.querySelector('#admin-btn-refresh').addEventListener('click', function() { loadUsers(); });

        function loadUsers() {
          tableWrap.innerHTML = '<p class="admin-loading">Caricamento…</p>';
          fetch('/api/admin/utenti', { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (!d.ok) { tableWrap.innerHTML = '<p class="admin-error">Errore: ' + esc(d.error && d.error.message || 'sconosciuto') + '</p>'; return; }
              renderUserTable(d.utenti || []);
            })
            .catch(function() { tableWrap.innerHTML = '<p class="admin-error">Errore di rete</p>'; });
        }

        function renderUserTable(users) {
          if (!users.length) { tableWrap.innerHTML = '<p class="admin-empty">Nessun utente.</p>'; return; }
          var h = '<table class="admin-table">' +
            '<thead><tr>' +
              '<th>ID</th><th>Username</th><th>Nome</th><th>Cognome</th>' +
              '<th>Ruolo</th><th>Email</th><th>Attivo</th><th>Azioni</th>' +
            '</tr></thead><tbody>';
          users.forEach(function(u) {
            var badge = u.attivo
              ? '<span class="admin-badge admin-badge--ok">Sì</span>'
              : '<span class="admin-badge admin-badge--no">No</span>';
            h += '<tr>' +
              '<td>' + u.id + '</td>' +
              '<td class="admin-td-bold">' + esc(u.username) + '</td>' +
              '<td>' + esc(u.nome || '—') + '</td>' +
              '<td>' + esc(u.cognome || '—') + '</td>' +
              '<td>' + esc(u.ruolo) + '</td>' +
              '<td>' + esc(u.email || '—') + '</td>' +
              '<td>' + badge + '</td>' +
              '<td class="admin-td-actions">' +
                '<button class="admin-tbl-btn admin-edit" data-id="' + u.id + '" type="button">Modifica</button>' +
                '<button class="admin-tbl-btn admin-reset" data-id="' + u.id + '" type="button">Reset pwd</button>' +
                (u.username !== 'admin' ? '<button class="admin-tbl-btn admin-tbl-btn--danger admin-delete" data-id="' + u.id + '" data-name="' + esc(u.username) + '" type="button">Elimina</button>' : '') +
              '</td></tr>';
          });
          h += '</tbody></table>';
          tableWrap.innerHTML = h;
        }

        tableWrap.addEventListener('click', function(e) {
          var editBtn = e.target.closest('.admin-edit');
          if (editBtn) {
            fetch('/api/admin/utenti/' + editBtn.dataset.id, { credentials: 'same-origin' })
              .then(function(r) { return r.json(); })
              .then(function(d) { if (d.ok) openEditModal(d.utente); });
            return;
          }
          var resetBtn = e.target.closest('.admin-reset');
          if (resetBtn) { openResetPwdModal(resetBtn.dataset.id); return; }
          var delBtn = e.target.closest('.admin-delete');
          if (delBtn) { confirmDelete(delBtn.dataset.id, delBtn.dataset.name); return; }
        });

        function openCreateModal() {
          var fl = fieldsCreate();
          var html = window.LumiaFormLayer.buildForm(fl, {});
          window.LumiaFormLayer.openFormLayer(getAdminNodeId(), 'Nuovo utente', html, function(formContainer, nodeId, showErr) {
            var data = window.LumiaFormLayer.collectForm(fl, formContainer);
            if (!data.username || !data.password) { showErr('Username e password obbligatori'); return; }
            fetch('/api/admin/utenti', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
              body: JSON.stringify(data)
            })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                if (!d.ok) { showErr(d.error && d.error.message || 'Errore'); return; }
                state.layerManager.closeNode(nodeId);
                loadUsers();
              })
              .catch(function() { showErr('Errore di rete'); });
          });
        }

        function openEditModal(user) {
          var fl = fieldsEdit(user);
          var data = {
            username: user.username, email: user.email || '',
            nome: user.nome || '', cognome: user.cognome || '',
            ruolo: user.ruolo, attivo: String(user.attivo)
          };
          var html = window.LumiaFormLayer.buildForm(fl, data);
          window.LumiaFormLayer.openFormLayer(getAdminNodeId(), 'Modifica utente', html, function(formContainer, nodeId, showErr) {
            var formData = window.LumiaFormLayer.collectForm(fl, formContainer);
            delete formData.username;
            if (formData.attivo !== undefined) formData.attivo = Number(formData.attivo);
            fetch('/api/admin/utenti/' + user.id, {
              method: 'PUT', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
              body: JSON.stringify(formData)
            })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                if (!d.ok) { showErr(d.error && d.error.message || 'Errore'); return; }
                state.layerManager.closeNode(nodeId);
                loadUsers();
              })
              .catch(function() { showErr('Errore di rete'); });
          });
        }

        function openResetPwdModal(userId) {
          var fl = fieldsResetPwd();
          var html = window.LumiaFormLayer.buildForm(fl, {});
          window.LumiaFormLayer.openFormLayer(getAdminNodeId(), 'Reset password', html, function(formContainer, nodeId, showErr) {
            var data = window.LumiaFormLayer.collectForm(fl, formContainer);
            if (!data.password || data.password.length < 8) { showErr('Password troppo corta (min 8 caratteri)'); return; }
            fetch('/api/admin/utenti/' + userId + '/reset-password', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
              body: JSON.stringify({ password: data.password })
            })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                if (!d.ok) { showErr(d.error && d.error.message || 'Errore'); return; }
                state.layerManager.closeNode(nodeId);
                if (window.LumiaToast) window.LumiaToast.success('Password reimpostata');
              })
              .catch(function() { showErr('Errore di rete'); });
          }, { saveLabel: 'Reimposta' });
        }

        function confirmDelete(userId, username) {
          if (!confirm('Eliminare l\'utente "' + username + '"? L\'azione è irreversibile.')) return;
          fetch('/api/admin/utenti/' + userId, {
            method: 'DELETE', credentials: 'same-origin',
            headers: { 'X-CSRF-Token': csrfToken }
          })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (d.ok) loadUsers();
              else alert('Errore: ' + (d.error && d.error.message || 'sconosciuto'));
            })
            .catch(function() { alert('Errore di rete'); });
        }

        loadUsers();
      }

      /* ═══════════════════════════════════
       *  AUDIT — V3.M3.A12 — due viste strutturalmente separate
       *  - renderAuthTab  → eventi auth/sicurezza (kind=auth)
       *  - renderAuditTab → mutazioni di dato con diff (kind=data)
       *  Entrambi delegano alla factory mountAuditView().
       * ═══════════════════════════════════ */
      var AUDIT_TARGET_TABLES = [
        'utenti', 'sessioni',
        'appointments', 'list_entries', 'lists', 'nodes',
        'transfusion_requests', 'transfusion_emocomponents'
      ];

      function mountAuditView(contentArea, opts) {
        var isData = opts.kind === 'data';
        contentArea.classList.add('is-flex');
        contentArea.style.flexDirection = 'column';

        var targetSelectHtml = '';
        if (isData) {
          targetSelectHtml = '<select id="audit-target" style="padding:6px 8px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:13px;">' +
            '<option value="">Tabella: tutte</option>';
          AUDIT_TARGET_TABLES.forEach(function(t) {
            targetSelectHtml += '<option value="' + t + '">' + t + '</option>';
          });
          targetSelectHtml += '</select>';
        }

        contentArea.innerHTML =
          '<div class="admin-tab-header">' +
            '<div>' +
              '<h2 class="admin-tab-title">' + esc(opts.title) + '</h2>' +
              '<p class="admin-tab-subtitle">' + esc(opts.subtitle) + '</p>' +
            '</div>' +
            '<button id="admin-logs-refresh" class="admin-btn" type="button">Aggiorna</button>' +
          '</div>' +
          '<div class="audit-filters" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 12px;background:var(--gray-50,#f5f6f7);border:1px solid var(--border,#e0e0e0);border-radius:6px;margin-bottom:12px;">' +
            '<input id="audit-q" type="search" placeholder="' + (isData ? 'Cerca azione, target, dettagli…' : 'Cerca azione, percorso, dettagli…') + '" style="flex:1;min-width:200px;padding:6px 10px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:13px;">' +
            targetSelectHtml +
            '<select id="audit-esito" style="padding:6px 8px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:13px;">' +
              '<option value="">Esito: tutti</option>' +
              '<option value="successo">successo</option>' +
              '<option value="fallito">fallito</option>' +
            '</select>' +
            '<input id="audit-from" type="date" title="Da" style="padding:6px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:12px;">' +
            '<input id="audit-to" type="date" title="A" style="padding:6px;border:1px solid var(--border,#ccc);border-radius:4px;font-size:12px;">' +
            '<button id="audit-clear" type="button" class="admin-btn" style="padding:6px 10px;font-size:12px;">Reset</button>' +
          '</div>' +
          '<div class="audit-split" style="display:grid;grid-template-columns:1fr 420px;gap:12px;flex:1;min-height:0;">' +
            '<div id="admin-logs-body" class="admin-tab-body" style="overflow:auto;"></div>' +
            '<aside id="admin-logs-detail" style="border:1px solid var(--border,#e0e0e0);border-radius:6px;background:#fff;overflow:auto;padding:12px;font-size:12px;color:var(--muted,#666);">Seleziona una voce per vedere il dettaglio.</aside>' +
          '</div>';

        var logsBody = contentArea.querySelector('#admin-logs-body');
        var detailEl = contentArea.querySelector('#admin-logs-detail');
        var qEl = contentArea.querySelector('#audit-q');
        var esitoEl = contentArea.querySelector('#audit-esito');
        var targetEl = contentArea.querySelector('#audit-target');
        var fromEl = contentArea.querySelector('#audit-from');
        var toEl = contentArea.querySelector('#audit-to');
        var clearBtn = contentArea.querySelector('#audit-clear');

        var debounceT = null;
        var selectedId = null;

        contentArea.querySelector('#admin-logs-refresh').addEventListener('click', function() { loadLogs(); });
        clearBtn.addEventListener('click', function() {
          qEl.value = ''; esitoEl.value = '';
          if (targetEl) targetEl.value = '';
          fromEl.value = ''; toEl.value = '';
          loadLogs();
        });
        [qEl, esitoEl, targetEl, fromEl, toEl].forEach(function(el) {
          if (!el) return;
          var ev = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
          el.addEventListener(ev, function() {
            clearTimeout(debounceT);
            debounceT = setTimeout(loadLogs, 250);
          });
        });

        function buildQueryString() {
          var p = new URLSearchParams();
          p.set('limit', '200');
          p.set('kind', opts.kind);
          if (qEl.value) p.set('q', qEl.value);
          if (esitoEl.value) p.set('esito', esitoEl.value);
          if (targetEl && targetEl.value) p.set('target_table', targetEl.value);
          if (fromEl.value) p.set('from', fromEl.value + ' 00:00:00');
          if (toEl.value)   p.set('to',   toEl.value + ' 23:59:59');
          return p.toString();
        }

        function loadLogs() {
          logsBody.innerHTML = '<p class="admin-loading">Caricamento…</p>';
          fetch('/api/admin/audit-logs?' + buildQueryString(), { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (!d.ok) { logsBody.innerHTML = '<p class="admin-error">Errore: ' + esc(d.error && d.error.message || 'sconosciuto') + '</p>'; return; }
              renderLogsTable(d.logs || [], d.total);
            })
            .catch(function() { logsBody.innerHTML = '<p class="admin-error">Errore di rete</p>'; });
        }

        /* Badge contestuale: per data → verbo SQL (INSERT/UPDATE/DELETE),
         *                   per auth → dominio (auth/login/logout/csrf/session/admin). */
        function actionBadge(azione) {
          if (!azione) return '';
          if (isData) {
            var parts = azione.split('.');
            var verb = (parts.length >= 3 ? parts[2] : '').toUpperCase();
            var palette = { INSERT: '#0F7B3F', UPDATE: '#287094', DELETE: '#A04600' };
            var color = palette[verb] || '#555';
            if (!verb) return '';
            return '<span class="audit-badge" style="background:' + color + ';color:#fff;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px;">' + esc(verb) + '</span>';
          }
          var prefix = azione.split('.')[0];
          var pal = {
            auth:    ['#D7E8F4', '#1f4d6b'],
            login:   ['#D9F1DD', '#0F7B3F'],
            logout:  ['#EAEAEA', '#444'],
            csrf:    ['#FCE3E3', '#A02828'],
            session: ['#FFF1D6', '#8A6300'],
            admin:   ['#E5DBF4', '#4B2A82']
          };
          var c = pal[prefix] || ['#eee', '#444'];
          return '<span class="audit-badge" style="background:' + c[0] + ';color:' + c[1] + ';padding:1px 6px;border-radius:3px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;">' + esc(prefix) + '</span>';
        }

        function renderLogsTable(logs, total) {
          if (!logs.length) { logsBody.innerHTML = '<p class="admin-empty">Nessun log che corrisponde ai filtri.</p>'; return; }
          var h = '<div style="font-size:11px;color:var(--muted,#777);margin-bottom:6px;">' + logs.length + ' di ' + (total || logs.length) + ' eventi (più recenti per primi)</div>';
          h += '<table class="admin-table admin-table--logs" style="font-size:12px;">' +
            '<thead><tr>' +
              '<th>Data</th>' +
              (isData
                ? '<th>Op.</th><th>Tabella</th><th>Azione</th>'
                : '<th>Tipo</th><th>Azione</th><th>Origine</th>') +
              '<th>Utente</th><th>IP</th><th>Esito</th>' +
            '</tr></thead><tbody>';
          logs.forEach(function(l) {
            var ts = l.creato_il ? new Date(l.creato_il.replace(' ', 'T') + 'Z').toLocaleString('it-IT') : '—';
            var esitoClass = l.esito === 'successo' ? 'admin-badge--ok' : 'admin-badge--no';
            var middle;
            if (isData) {
              var target = l.target_table ? esc(l.target_table) + (l.target_id != null ? ' #' + l.target_id : '') : '—';
              var clickable = l.has_change || l.dettagli;
              middle =
                '<td>' + actionBadge(l.azione) + '</td>' +
                '<td class="admin-td-mono">' + target + '</td>' +
                '<td class="admin-td-mono">' + esc(l.azione || '—') + (clickable ? ' <span style="color:#287094;font-weight:600;">›</span>' : '') + '</td>';
            } else {
              var origine = (l.metodo ? esc(l.metodo) + ' ' : '') + esc(l.percorso || '—');
              middle =
                '<td>' + actionBadge(l.azione) + '</td>' +
                '<td class="admin-td-mono">' + esc(l.azione || '—') + '</td>' +
                '<td class="admin-td-mono" style="font-size:10px;color:#666;">' + origine + '</td>';
            }
            h += '<tr data-log-id="' + l.id + '" style="cursor:pointer;' + (l.id === selectedId ? 'background:#E8F0F6;' : '') + '">' +
              '<td class="admin-td-mono" style="white-space:nowrap;">' + esc(ts) + '</td>' +
              middle +
              '<td>' + esc(l.utente_id != null ? String(l.utente_id) : '—') + '</td>' +
              '<td class="admin-td-mono">' + esc(l.ip || '—') + '</td>' +
              '<td><span class="admin-badge ' + esitoClass + '">' + esc(l.esito || '—') + '</span></td>' +
            '</tr>';
          });
          h += '</tbody></table>';
          logsBody.innerHTML = h;
        }

        logsBody.addEventListener('click', function(e) {
          var tr = e.target.closest('tr[data-log-id]');
          if (!tr) return;
          var id = Number(tr.dataset.logId);
          selectedId = id;
          var rows = logsBody.querySelectorAll('tr[data-log-id]');
          rows.forEach(function(r) { r.style.background = (Number(r.dataset.logId) === id) ? '#E8F0F6' : ''; });
          loadDetail(id);
        });

        function loadDetail(id) {
          detailEl.innerHTML = '<p class="admin-loading">Caricamento dettaglio…</p>';
          fetch('/api/admin/audit-logs/' + id, { credentials: 'same-origin' })
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (!d.ok) { detailEl.innerHTML = '<p class="admin-error">' + esc(d.error && d.error.message || 'Errore') + '</p>'; return; }
              renderDetail(d.log);
            })
            .catch(function() { detailEl.innerHTML = '<p class="admin-error">Errore di rete</p>'; });
        }

        function fmtJson(o) {
          if (o == null) return '<em style="color:#999;">— vuoto —</em>';
          try { return '<pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:Menlo,Consolas,monospace;font-size:11px;">' + esc(JSON.stringify(o, null, 2)) + '</pre>'; }
          catch (_) { return '<pre>' + esc(String(o)) + '</pre>'; }
        }

        function renderDiff(before, after) {
          if (!before && !after) return '<p style="color:var(--muted,#777);">Nessun snapshot di mutazione.</p>';
          var keys = {};
          if (before && typeof before === 'object') Object.keys(before).forEach(function(k) { keys[k] = 1; });
          if (after  && typeof after  === 'object') Object.keys(after).forEach(function(k) { keys[k] = 1; });
          var keyList = Object.keys(keys).sort();
          if (!keyList.length) {
            return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              '<div><div style="font-weight:600;font-size:11px;margin-bottom:4px;color:#A04600;">Prima</div>' + fmtJson(before) + '</div>' +
              '<div><div style="font-weight:600;font-size:11px;margin-bottom:4px;color:#0F7B3F;">Dopo</div>' + fmtJson(after) + '</div></div>';
          }
          var rows = '';
          keyList.forEach(function(k) {
            var b = before ? before[k] : undefined;
            var a = after  ? after[k]  : undefined;
            var bStr = (b === undefined) ? '' : (typeof b === 'object' ? JSON.stringify(b) : String(b));
            var aStr = (a === undefined) ? '' : (typeof a === 'object' ? JSON.stringify(a) : String(a));
            var changed = bStr !== aStr;
            var bg = changed ? '#FFF8E1' : 'transparent';
            rows += '<tr style="background:' + bg + ';">' +
              '<td style="padding:4px 6px;font-weight:600;color:#444;white-space:nowrap;border-bottom:1px solid #f0f0f0;">' + esc(k) + '</td>' +
              '<td style="padding:4px 6px;color:' + (changed ? '#A04600' : '#777') + ';font-family:Menlo,Consolas,monospace;border-bottom:1px solid #f0f0f0;word-break:break-word;">' + esc(bStr || '∅') + '</td>' +
              '<td style="padding:4px 6px;color:' + (changed ? '#0F7B3F' : '#777') + ';font-family:Menlo,Consolas,monospace;border-bottom:1px solid #f0f0f0;word-break:break-word;">' + esc(aStr || '∅') + '</td>' +
            '</tr>';
          });
          return '<table style="width:100%;border-collapse:collapse;font-size:11px;">' +
            '<thead><tr>' +
              '<th style="text-align:left;padding:4px 6px;color:#666;border-bottom:1px solid #ccc;">Campo</th>' +
              '<th style="text-align:left;padding:4px 6px;color:#A04600;border-bottom:1px solid #ccc;">Prima</th>' +
              '<th style="text-align:left;padding:4px 6px;color:#0F7B3F;border-bottom:1px solid #ccc;">Dopo</th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';
        }

        function renderDetail(l) {
          var ts = l.creato_il ? new Date(l.creato_il.replace(' ', 'T') + 'Z').toLocaleString('it-IT') : '—';
          var hasChange = (l.before || l.after);
          var html =
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">' +
              '<div>' +
                '<div style="font-weight:600;color:#222;font-size:13px;">' + actionBadge(l.azione) + ' <code>' + esc(l.azione) + '</code></div>' +
                '<div style="font-size:11px;color:var(--muted,#777);margin-top:2px;">#' + l.id + ' · ' + esc(ts) + '</div>' +
              '</div>' +
              '<span class="admin-badge ' + (l.esito === 'successo' ? 'admin-badge--ok' : 'admin-badge--no') + '">' + esc(l.esito || '—') + '</span>' +
            '</div>' +
            '<dl style="display:grid;grid-template-columns:90px 1fr;gap:4px 8px;font-size:11px;margin:0 0 12px;">' +
              '<dt style="color:#777;">Utente</dt><dd style="margin:0;">' + esc(l.utente_id != null ? String(l.utente_id) : '—') + '</dd>' +
              '<dt style="color:#777;">IP</dt><dd style="margin:0;font-family:Menlo,Consolas,monospace;">' + esc(l.ip || '—') + '</dd>' +
              '<dt style="color:#777;">Metodo</dt><dd style="margin:0;font-family:Menlo,Consolas,monospace;">' + esc((l.metodo || '—') + ' ' + (l.percorso || '')) + '</dd>' +
              '<dt style="color:#777;">User-Agent</dt><dd style="margin:0;color:#999;font-size:10px;word-break:break-all;">' + esc(l.user_agent || '—') + '</dd>' +
              (l.target_table ?
                '<dt style="color:#777;">Target</dt><dd style="margin:0;font-family:Menlo,Consolas,monospace;">' + esc(l.target_table) + (l.target_id != null ? ' #' + l.target_id : '') + '</dd>'
                : '') +
            '</dl>';

          if (l.dettagli != null) {
            html += '<div style="margin-bottom:12px;">' +
              '<div style="font-size:11px;font-weight:600;color:#444;margin-bottom:4px;">Dettagli</div>' +
              fmtJson(l.dettagli) +
            '</div>';
          }

          if (hasChange) {
            html += '<div>' +
              '<div style="font-size:11px;font-weight:600;color:#444;margin-bottom:6px;">Diff</div>' +
              renderDiff(l.before, l.after) +
            '</div>';
          } else if (isData) {
            html += '<p style="color:var(--muted,#777);font-size:11px;">Nessun snapshot di mutazione registrato.</p>';
          }

          detailEl.innerHTML = html;
        }

        loadLogs();
      }

      function renderAuthTab(contentArea) {
        mountAuditView(contentArea, {
          kind: 'auth',
          title: 'Accessi & sicurezza',
          subtitle: 'Login, logout, lockout, CSRF, sessione (eventi non-mutativi)'
        });
      }

      function renderAuditTab(contentArea) {
        mountAuditView(contentArea, {
          kind: 'data',
          title: 'Audit dati',
          subtitle: 'Mutazioni di dato (INSERT / UPDATE / DELETE) con diff before/after — V3.M3.A12'
        });
      }

      /* ═══════════════════════════════════
       *  AGENDA GESTIONE
       * ═══════════════════════════════════ */
      function renderAgendaTab(contentArea) {
        contentArea.innerHTML =
          '<div style="display:flex;flex-direction:column;height:100%">' +
            '<div class="gest-toolbar" id="gestToolbar"></div>' +
            '<div id="treeContainer" class="tree-container" style="flex:1"></div>' +
          '</div>' +
          '<div class="svc-detail-backdrop" id="svcDetailBackdrop" onclick="if(event.target===this)closeSvcDetailOverlay()">' +
            '<div class="svc-detail-modal">' +
              '<div class="node-header">' +
                '<h2 id="svcDetailTitle">Dettaglio prestazione</h2>' +
                '<button class="node-close" onclick="closeSvcDetailOverlay()"><span class="icon" id="icoCloseSvcDetail"></span></button>' +
              '</div>' +
              '<div class="node-body" id="svcDetailBody"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gest-modal-backdrop" id="gestSedeBackdrop" onclick="if(event.target===this)closeGestSede()">' +
            '<div class="gest-modal">' +
              '<div class="node-header"><h2 id="gestSedeTitle">Gestione sede</h2><button class="node-close" onclick="closeGestSede()"><span class="icon" id="icoCloseGestSede"></span></button></div>' +
              '<div class="gest-tabs" id="gestSedeTabs"></div>' +
              '<div class="node-body" id="gestSedeBody"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gest-modal-backdrop" id="gestFlussoBackdrop" onclick="if(event.target===this)closeGestFlusso()">' +
            '<div class="gest-modal">' +
              '<div class="node-header"><h2 id="gestFlussoTitle">Gestione flusso</h2><button class="node-close" onclick="closeGestFlusso()"><span class="icon" id="icoCloseGestFlusso"></span></button></div>' +
              '<div class="gest-tabs" id="gestFlussoTabs"></div>' +
              '<div class="node-body" id="gestFlussoBody"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gest-modal-backdrop" id="gestSvcBackdrop" onclick="if(event.target===this)closeGestSvc()">' +
            '<div class="gest-modal">' +
              '<div class="node-header">' +
                '<h2>Prestazioni</h2>' +
                '<button class="node-close" onclick="closeGestSvc()"><span class="icon" id="icoCloseGestSvc"></span></button>' +
              '</div>' +
              '<div class="node-body" id="gestSvcBody"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gest-station-backdrop" id="gestStationBackdrop" onclick="if(event.target===this)closeGestStation()">' +
            '<div class="gest-station-modal">' +
              '<div class="node-header"><h2 id="gestStationTitle">Gestione postazione</h2><button class="node-close" onclick="closeGestStation()"><span class="icon" id="icoCloseGestStation"></span></button></div>' +
              '<div class="gest-tabs" id="gestStationTabs"></div>' +
              '<div class="node-body" id="gestStationBody"></div>' +
            '</div>' +
          '</div>' +
          '<div class="gest-cal-popover" id="gestCalPopover"></div>' +
          '<div class="ctx-menu" id="adminCtxMenu" style="display:none"></div>' +
          (!document.getElementById('confirmBackdrop') ?
            '<div class="confirm-backdrop" id="confirmBackdrop">' +
              '<div class="confirm-box">' +
                '<p id="confirmMsg"></p>' +
                '<div class="confirm-actions">' +
                  '<button class="btn" onclick="resolveConfirm(false)">Annulla</button>' +
                  '<button class="btn btn-danger" onclick="resolveConfirm(true)">Conferma</button>' +
                '</div>' +
              '</div>' +
            '</div>' : '') +
          (!document.getElementById('inputDlgBackdrop') ?
            '<div class="input-dialog-backdrop" id="inputDlgBackdrop" onclick="if(event.target===this)resolveInputDlg(null)">' +
              '<div class="input-dialog">' +
                '<label id="inputDlgLabel">Nome</label>' +
                '<input id="inputDlgInput" autocomplete="off">' +
                '<div class="input-dialog-actions">' +
                  '<button class="btn" onclick="resolveInputDlg(null)">Annulla</button>' +
                  '<button class="btn btn-primary" id="inputDlgOk" onclick="resolveInputDlg(document.getElementById(\'inputDlgInput\').value)">OK</button>' +
                '</div>' +
              '</div>' +
            '</div>' : '') +
          (!document.getElementById('ctxMenu') ?
            '<div class="ctx-menu" id="ctxMenu" style="display:none"></div>' : '');

        var Ag = window.LumiaAgenda;
        if (Ag && Ag.Gestione) {
          Ag.Gestione.init();
        }
      }

      /* ── Wire render functions into config ──
       * NOTE: do NOT set inline `display:flex` on the panel — it would override
       * the `.section-panel.is-active { display: block }` rule and keep all
       * opened panels visible (broken tab switching). Use only padding / overflow.
       */
      ADMIN_V2_CONFIG.sections[0].render = function(el) { el.style.cssText = 'padding:var(--space-lg) var(--space-2xl);'; renderUtentiTab(el); };
      ADMIN_V2_CONFIG.sections[1].render = function(el) { el.style.cssText = 'padding:var(--space-lg) var(--space-2xl);'; renderAuthTab(el); };
      ADMIN_V2_CONFIG.sections[2].render = function(el) { el.style.cssText = 'padding:var(--space-lg) var(--space-2xl);'; renderAuditTab(el); };
      ADMIN_V2_CONFIG.sections[3].render = function(el) { el.style.cssText = 'padding:var(--space-lg) var(--space-2xl);'; renderAgendaTab(el); };

      /* ── Initialize V2 layout ── */
      setupLayerV2(container, ADMIN_V2_CONFIG, context.manager, context.nodeId);
    },
    destroy: function(container) {
      var layoutEl = container.querySelector('.layer-layout-v2');
      if (layoutEl && layoutEl._tabStrip) layoutEl._tabStrip.destroy();
    }
  });
})();

