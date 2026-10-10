/**
 * shell-modules.js — Content providers for tools/docs/user modules (V2 layout)
 *
 * Each module uses buildLayerLayoutV2() + setupLayerV2() for the new
 * tab-strip + launcher chrome. The launcher opens automatically on
 * module mount — sections are picked from there.
 */
(function () {
  'use strict';

  var ICO = {
    close:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    lib:     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15H15C15.93 15 16.4 15 16.77 15.15C17.26 15.36 17.64 15.74 17.85 16.23C18 16.6 18 17.07 18 18C18 18.93 18 19.4 17.85 19.77C17.64 20.26 17.26 20.64 16.77 20.85C16.4 21 15.93 21 15 21H2"/><path d="M2 3H15C15.93 3 16.4 3 16.77 3.15C17.26 3.36 17.64 3.74 17.85 4.23C18 4.6 18 5.07 18 6C18 6.93 18 7.4 17.85 7.77C17.64 8.26 17.26 8.64 16.77 8.85C16.4 9 15.93 9 15 9H2"/><path d="M22 9H9C8.07 9 7.6 9 7.23 9.15C6.74 9.36 6.36 9.74 6.15 10.23C6 10.6 6 11.07 6 12C6 12.93 6 13.4 6.15 13.77C6.36 14.26 6.74 14.64 7.23 14.85C7.6 15 8.07 15 9 15H22"/></svg>',
    chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    steth:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v4a4 4 0 0 0 8 0V3"/><path d="M10 14a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="13" r="2"/></svg>',
    speed:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><circle cx="12" cy="12" r="4"/></svg>',
    list:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    book:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    user:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  };

  var STD_ACTIONS = [
    { id: '_close_layer', label: 'Chiudi Modulo', icon: 'close', desc: 'Chiudi il layer corrente',   color: '#CE2626' },
    { id: '_library',     label: 'Libreria',      icon: 'lib',   desc: 'Torna alla libreria moduli', color: '#7DAACB' }
  ];

  function autoOpenLauncher(container) {
    if (container._launcher) container._launcher.open();
  }

  /* ════════════════════════════════════════════════════════
   *  TOOLS — Helper diagnostici
   * ════════════════════════════════════════════════════════ */
  var TOOLS_V2_CONFIG = {
    module: {
      icon:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v4a4 4 0 0 0 8 0V3"/><path d="M10 14a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="13" r="2"/></svg>',
      title: 'Tools'
    },
    icons: { steth: ICO.steth, close: ICO.close, lib: ICO.lib, chevron: ICO.chevron },
    sections: [
      {
        id: 'library', label: 'Helper diagnostici', icon: 'steth',
        desc: 'Strumenti e helper clinici', color: '#5BA88C',
        render: function (el) {
          el.className = 'layer-main-content lib-chooser';
          el.style.cssText = 'display:flex;flex-direction:row;height:100%;overflow:hidden;';
          if (window.LumiaLibrary) {
            window.LumiaLibrary.renderShell(el);
          } else {
            el.innerHTML = '<div class="lib-empty" style="padding:2rem;color:var(--muted);font-size:13px;">Libreria non disponibile.</div>';
          }
        }
      }
    ],
    actions: STD_ACTIONS
  };

  window.LayerSystem.registerContent('tools-module', {
    label: 'Tools',
    render: function (container, context) {
      container.innerHTML = buildLayerLayoutV2({
        nodeId: context.nodeId,
        module: TOOLS_V2_CONFIG.module
      });
      setupLayerV2(container, TOOLS_V2_CONFIG, context.manager, context.nodeId);
      autoOpenLauncher(container);
    },
    destroy: function (container) {
      var layoutEl = container.querySelector('.layer-layout-v2');
      if (layoutEl && layoutEl._tabStrip) layoutEl._tabStrip.destroy();
    }
  });

  /* ════════════════════════════════════════════════════════
   *  DOCS — API Monitor + API Catalog + Documentazione
   * ════════════════════════════════════════════════════════ */
  function renderMonitor(el) {
    el.style.cssText = 'flex:1;overflow-y:auto;padding:24px;';
    el.innerHTML =
      '<h2 style="margin:0 0 8px;font-size:18px;display:flex;align-items:center;gap:8px;">' +
        '<i class="hgi-stroke hgi-dashboard-speed-01" style="font-size:16px;"></i> API Monitor</h2>' +
      '<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--line);border-radius:8px;margin-bottom:12px;">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + (apiOnline ? '#4caf50' : '#ccc') + ';flex-shrink:0;"></span>' +
        '<span style="font-size:13px;">' + (apiOnline ? 'Online \u2014 porta ' + apiPort : 'Offline') + '</span>' +
      '</div>' +
      '<div id="docs-monitor-entries" style="max-height:400px;overflow:auto;display:flex;flex-direction:column-reverse;gap:4px;"></div>';

    var monitorEl = el.querySelector('#docs-monitor-entries');
    var entries = document.querySelectorAll('#apiLogList .api-log-entry');
    if (entries.length) {
      entries.forEach(function (e) { monitorEl.insertAdjacentHTML('afterbegin', e.outerHTML); });
    } else {
      monitorEl.innerHTML = '<div class="api-log-empty" style="font-size:12px;">Nessuna chiamata registrata.</div>';
    }
  }

  function renderCatalog(el) {
    el.style.cssText = 'flex:1;overflow-y:auto;padding:24px;';
    el.innerHTML =
      '<h2 style="margin:0 0 12px;font-size:18px;">API Catalog</h2>' +
      '<div id="docs-catalog-content" style="color:var(--muted);font-size:13px;">Caricamento catalogo\u2026</div>';

    var catalogEl = el.querySelector('#docs-catalog-content');
    fetch('/api/catalog', { headers: { 'X-API-Key': apiKey } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok && d.catalog) {
          var h = '';
          Object.entries(d.catalog).forEach(function (kv) {
            h += '<h4 style="margin:12px 0 6px;color:#6BAAAE;font-size:13px;">' + esc(kv[0]) + '</h4>' +
              '<ul style="margin:0 0 8px;padding-left:20px;font-size:12.5px;line-height:1.8;">';
            (Array.isArray(kv[1]) ? kv[1] : [kv[1]]).forEach(function (ep) {
              if (typeof ep === 'object' && ep.path) {
                h += '<li><code style="background:#f5f5f5;padding:1px 5px;border-radius:4px;font-size:11px;">' +
                  esc(ep.method || 'GET') + '</code> <code style="background:#f5f5f5;padding:1px 5px;border-radius:4px;font-size:11px;">' +
                  esc(ep.path) + '</code>' + (ep.description ? ' \u2014 ' + esc(ep.description) : '') + '</li>';
              } else {
                h += '<li>' + esc(JSON.stringify(ep)) + '</li>';
              }
            });
            h += '</ul>';
          });
          catalogEl.innerHTML = h;
        } else {
          catalogEl.innerHTML = '<span style="color:var(--muted);">Catalogo non disponibile.</span>';
        }
      })
      .catch(function () {
        catalogEl.innerHTML = '<span style="color:#f44336;">Errore nel recupero del catalogo.</span>';
      });
  }

  function renderDocs(el) {
    el.style.cssText = 'flex:1;overflow-y:auto;padding:24px;';
    el.innerHTML =
      '<h2 style="margin:0 0 12px;font-size:18px;">Documentazione</h2>' +
      '<div style="display:flex;flex-direction:column;gap:12px;">' +
        '<div style="padding:14px 18px;border:1px solid var(--line);border-radius:10px;font-size:13px;">' +
          '<div style="font-weight:600;">API Reference</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:4px;">Endpoint e parametri disponibili</div></div>' +
        '<div style="padding:14px 18px;border:1px solid var(--line);border-radius:10px;font-size:13px;">' +
          '<div style="font-weight:600;">Layer Modal System</div>' +
          '<div style="font-size:12px;color:var(--muted);margin-top:4px;">Architettura del sistema a layer</div></div>' +
      '</div>';
  }

  var DOCS_V2_CONFIG = {
    module: {
      icon:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
      title: 'Docs'
    },
    icons: { speed: ICO.speed, list: ICO.list, book: ICO.book, close: ICO.close, lib: ICO.lib, chevron: ICO.chevron },
    sections: [
      { id: 'monitor', label: 'API Monitor',     icon: 'speed', desc: 'Stato e log delle chiamate API', color: '#5BA88C', render: renderMonitor },
      { id: 'catalog', label: 'API Catalog',     icon: 'list',  desc: 'Endpoint e parametri disponibili', color: '#73A5CA', render: renderCatalog },
      { id: 'docs',    label: 'Documentazione',  icon: 'book',  desc: 'Guide e riferimenti tecnici',      color: '#A87FD4', render: renderDocs }
    ],
    actions: STD_ACTIONS
  };

  window.LayerSystem.registerContent('docs-module', {
    label: 'Docs',
    render: function (container, context) {
      container.innerHTML = buildLayerLayoutV2({
        nodeId: context.nodeId,
        module: DOCS_V2_CONFIG.module
      });
      setupLayerV2(container, DOCS_V2_CONFIG, context.manager, context.nodeId);
      autoOpenLauncher(container);
    },
    destroy: function (container) {
      var layoutEl = container.querySelector('.layer-layout-v2');
      if (layoutEl && layoutEl._tabStrip) layoutEl._tabStrip.destroy();
    }
  });

  /* ════════════════════════════════════════════════════════
   *  USER — Profilo e sicurezza
   * ════════════════════════════════════════════════════════ */
  function renderProfilo(el) {
    var u = window._currentUser || {};
    var fullName = ((u.nome || '') + ' ' + (u.cognome || '')).trim() || '—';
    el.style.cssText = 'padding:24px;overflow-y:auto;';
    el.innerHTML =
      '<div style="max-width:560px;margin:0 auto;">' +
        '<div style="display:flex;align-items:center;gap:14px;margin-bottom:24px;">' +
          '<i class="hgi-stroke hgi-user" style="font-size:36px;color:var(--accent,#287094);"></i>' +
          '<div>' +
            '<div style="font-size:18px;font-weight:600;">' + escAttr(fullName) + '</div>' +
            '<div style="font-size:13px;color:var(--muted,#777);">' +
              escAttr(u.username || '') + ' · ' + escAttr(u.ruolo || '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="user-info-grid" style="display:grid;grid-template-columns:140px 1fr;gap:8px 16px;font-size:13px;margin-bottom:24px;">' +
          '<div style="color:var(--muted,#777);">ID</div><div>' + escAttr(String(u.id || '—')) + '</div>' +
          '<div style="color:var(--muted,#777);">Username</div><div>' + escAttr(u.username || '—') + '</div>' +
          '<div style="color:var(--muted,#777);">Email</div><div>' + escAttr(u.email || '—') + '</div>' +
          '<div style="color:var(--muted,#777);">Ruolo</div><div>' + escAttr(u.ruolo || '—') + '</div>' +
        '</div>' +
        '<hr style="border:0;border-top:1px solid var(--border,#e0e0e0);margin:0 0 20px;">' +
        '<h3 style="font-size:15px;margin:0 0 8px;">Sicurezza</h3>' +
        '<p style="font-size:13px;color:var(--muted,#777);margin:0 0 12px;">' +
          'Cambia regolarmente la password. Dopo il cambio, le altre sessioni attive verranno chiuse.' +
        '</p>' +
        '<button id="user-change-pwd" type="button" ' +
          'style="background:var(--accent,#287094);color:#fff;border:0;border-radius:4px;padding:8px 16px;font-size:13px;cursor:pointer;">' +
          'Cambia password' +
        '</button>' +
      '</div>';

    var btn = el.querySelector('#user-change-pwd');
    if (btn) {
      btn.addEventListener('click', function () {
        if (window.LumiaChangePassword) window.LumiaChangePassword.open({});
        else alert('Modulo cambio password non disponibile.');
      });
    }
  }

  function escAttr(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var USER_V2_CONFIG = {
    module: {
      icon:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      title: 'User'
    },
    icons: { user: ICO.user, close: ICO.close, lib: ICO.lib, chevron: ICO.chevron },
    sections: [
      { id: 'profilo', label: 'Profilo', icon: 'user', desc: 'Dati utente e sicurezza', color: '#287094', render: renderProfilo }
    ],
    actions: STD_ACTIONS
  };

  window.LayerSystem.registerContent('user-module', {
    label: 'User',
    render: function (container, context) {
      container.innerHTML = buildLayerLayoutV2({
        nodeId: context.nodeId,
        module: USER_V2_CONFIG.module
      });
      setupLayerV2(container, USER_V2_CONFIG, context.manager, context.nodeId);
      autoOpenLauncher(container);
    },
    destroy: function (container) {
      var layoutEl = container.querySelector('.layer-layout-v2');
      if (layoutEl && layoutEl._tabStrip) layoutEl._tabStrip.destroy();
    }
  });

  /* Agenda — registrato da app/agenda/ui/agenda-main.js (agenda-module-v2) */
})();
