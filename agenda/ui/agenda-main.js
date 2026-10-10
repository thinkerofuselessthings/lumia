/**
 * agenda-main.js — Orchestrator: navigation, loadTree, tree picker, boot, content provider
 * Exposes: Ag.Main + global onclick handlers
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};
  var C = Ag.Config, S = Ag.state;

  /* ══ MODULE LOADER ══════════════════════════════════════════ */
  function showModuleLoader() {
    var el = C.$('agModuleLoader');
    if (el) el.style.display = '';
  }
  function hideModuleLoader() {
    var el = C.$('agModuleLoader');
    if (el) el.style.display = 'none';
  }

  /* ══ NAVIGATION ═════════════════════════════════════════════ */
  /*
   * Section visibility is fully owned by the tab-strip (.section-panel
   * .is-active). Each section mounts its own layer-app into its panel,
   * so we do NOT toggle layer-app.active globally anymore — it is set
   * permanently on mount. See AGENDA_AUDIT Bug 2/3 fix.
   */
  function showAgenda() {
    S.currentLayer = 'agenda';
    Ag.Calendar.syncCal();
    if (!S.selFlussoId) {
      showAgendaLanding();
      return;
    }
    hideAgendaLanding();
    showModuleLoader();
    loadAll().then(hideModuleLoader).catch(hideModuleLoader);
  }

  function showAgendaLanding() {
    var sa = C.$('schedulerWrap');
    if (!sa) return;
    sa.style.display = 'none';
    var landing = C.$('agendaLanding');
    if (!landing) {
      landing = document.createElement('div');
      landing.id = 'agendaLanding';
      landing.className = 'agenda-landing';
      sa.parentElement.appendChild(landing);
    }
    var roots = (S.treeNodes || []).filter(function(n) { return n.type === 'macroarea' && n.active; });
    var hasTree = roots.length > 0;
    landing.innerHTML = '<div class="agenda-landing-inner">' +
      '<div class="agenda-landing-icon">' + C.SVG_STETHOSCOPE.replace('width="14"', 'width="48"').replace('height="14"', 'height="48"') + '</div>' +
      '<h2 class="agenda-landing-title">Agenda</h2>' +
      '<p class="agenda-landing-desc">' + (hasTree ? 'Seleziona un flusso per visualizzare le postazioni e gli appuntamenti.' : 'Nessuna struttura configurata. Vai in Gestione per crearne una.') + '</p>' +
      (hasTree ? '<button class="btn btn-primary btn-lg" onclick="openTreePicker()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21H21"/><path d="M5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21"/><path d="M9 21V17H15V21"/><path d="M10 7H14M12 5V9"/><rect x="9" y="11" width="6" height="4" rx="0.5"/></svg> Seleziona flusso</button>' : '') +
    '</div>';
    landing.style.display = '';
  }

  function hideAgendaLanding() {
    var landing = C.$('agendaLanding');
    if (landing) landing.style.display = 'none';
    var sa = C.$('schedulerWrap');
    if (sa) sa.style.display = '';
  }
  function showListe() {
    S.currentLayer = 'liste';
    Ag.Lists.init();
  }
  function showElenco() {
    S.currentLayer = 'elenco';
    Ag.Elenco.init();
  }
  function showPanoramica() {
    S.currentLayer = 'panoramica';
    Ag.Panoramica.init();
  }

  /* ══ DATA LOADING ═══════════════════════════════════════════ */
  function loadTree() {
    return Ag.Api.fetch('/nodes').then(function(j) {
      S.treeNodes = (j && j.data) || [];
      S.nodeMap = {};
      S.treeNodes.forEach(function(n) { S.nodeMap[n.id] = n; });
      autoSelectPath();
      updateStructLabel();
    });
  }

  function autoSelectPath() {
    var ms = S.treeNodes.filter(function(n) { return n.type === 'macroarea' && n.active; });
    if (!S.selMacroareaId || !ms.find(function(n) { return n.id === S.selMacroareaId; })) S.selMacroareaId = ms[0]?.id || null;
    var as = S.selMacroareaId ? S.treeNodes.filter(function(n) { return n.type === 'area' && n.parent_id === S.selMacroareaId && n.active; }) : [];
    if (!S.selAreaId || !as.find(function(n) { return n.id === S.selAreaId; })) S.selAreaId = as[0]?.id || null;
    var ss = S.selAreaId ? S.treeNodes.filter(function(n) { return n.type === 'sede' && n.parent_id === S.selAreaId && n.active; }) : [];
    if (!S.selSedeId || !ss.find(function(n) { return n.id === S.selSedeId; })) S.selSedeId = ss[0]?.id || null;
    var fs = S.selSedeId ? S.treeNodes.filter(function(n) { return n.type === 'flusso' && n.parent_id === S.selSedeId && n.active; }) : [];
    if (!S.selFlussoId || !fs.find(function(n) { return n.id === S.selFlussoId; })) S.selFlussoId = fs[0]?.id || null;
    S.postazioni = S.selFlussoId ? S.treeNodes.filter(function(n) { return n.type === 'postazione' && n.parent_id === S.selFlussoId && n.active; }) : [];
  }

  function updateStructLabel() {
    var flusso = S.selFlussoId ? S.nodeMap[S.selFlussoId] : null;
    var sede = flusso ? S.nodeMap[flusso.parent_id] : null;
    var lbl = C.$('structLabel'), sub = C.$('structSub');
    if (!lbl) return;
    if (flusso) {
      lbl.textContent = flusso.name;
      if (sub) sub.textContent = [S.nodeMap[S.selMacroareaId]?.name, S.nodeMap[S.selAreaId]?.name, sede?.name].filter(Boolean).join(' › ');
    } else { lbl.textContent = 'Seleziona flusso…'; if (sub) sub.textContent = ''; }
  }

  function loadServices() {
    return Ag.Api.fetch('/services').then(function(j) {
      S.servicesList = (j && j.data) || [];
    });
  }

  function loadAll() {
    return Promise.all([
      Ag.Scheduler.loadAppts(),
      Ag.Scheduler.loadOverrides()
    ]).then(function() {
      Ag.Scheduler.render();
      Ag.Scheduler.updateDateLabel();
      Ag.Scheduler.updateBanner();
    });
  }

  /* ══ TREE PICKER (Agenda mode) ══════════════════════════════ */
  function openTreePicker() {
    C.$('treePickerTitle').textContent = 'Seleziona flusso';
    // Fetch today's appointment counts per room, then render
    Ag.Api.fetch('/appointments/counts-by-room?date=' + S.selDate).then(function(j) {
      S._roomApptCounts = (j && j.data) || {};
      renderTreePickerBody();
      C.$('treePickerBackdrop').classList.add('active');
    }).catch(function() {
      S._roomApptCounts = {};
      renderTreePickerBody();
      C.$('treePickerBackdrop').classList.add('active');
    });
  }
  function closeTreePicker() { C.$('treePickerBackdrop').classList.remove('active'); }

  function renderTreePickerBody() {
    var body = C.$('treePickerBody');
    var roots = S.treeNodes.filter(function(n) { return n.type === 'macroarea' && n.active; });
    if (!roots.length) { body.innerHTML = '<div style="padding:var(--sp-lg);text-align:center;color:var(--gray-400);font-size:.8rem">Nessuna struttura configurata.</div>'; return; }
    var SVG_CHECK = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12L11 15L16 9"/></svg>';
    var SVG_CANCEL = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="var(--gray-400)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9L9 15M9 9L15 15"/></svg>';
    var SVG_ARROW_R = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';
    var SVG_CHECK_FILL = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12L11 15L16 9"/></svg>';
    var stIco = function(n) { return n.active ? SVG_CHECK : SVG_CANCEL; };
    var h = '';
    for (var mi = 0; mi < roots.length; mi++) {
      var ma = roots[mi];
      h += '<div class="tp-type-label">Macroarea</div>';
      h += '<div class="tp-node">' + stIco(ma) + '<span class="tp-dot" style="background:' + C.TP_COLORS.macroarea + '"></span><strong>' + C.esc(ma.name) + '</strong></div>';
      var areas = S.treeNodes.filter(function(n) { return n.type === 'area' && n.parent_id === ma.id && n.active; });
      if (areas.length) {
        h += '<div class="tp-group">';
        for (var ai = 0; ai < areas.length; ai++) {
          var ar = areas[ai];
          h += '<div class="tp-node">' + stIco(ar) + '<span class="tp-dot" style="background:' + C.TP_COLORS.area + '"></span>' + C.esc(ar.name) + '</div>';
          var sedi = S.treeNodes.filter(function(n) { return n.type === 'sede' && n.parent_id === ar.id && n.active; });
          if (sedi.length) {
            h += '<div class="tp-group">';
            for (var si = 0; si < sedi.length; si++) {
              var sd = sedi[si];
              h += '<div class="tp-node">' + stIco(sd) + '<span class="tp-dot" style="background:' + C.TP_COLORS.sede + '"></span>' + C.esc(sd.name) + '</div>';
              var flussi = S.treeNodes.filter(function(n) { return n.type === 'flusso' && n.parent_id === sd.id && n.active; });
              if (flussi.length) {
                h += '<div class="tp-group">';
                for (var fi = 0; fi < flussi.length; fi++) {
                  var fl = flussi[fi];
                  var sel = fl.id === S.selFlussoId;
                  var posti = S.treeNodes.filter(function(n) { return n.type === 'postazione' && n.parent_id === fl.id; });
                  var postiActive = posti.filter(function(n) { return n.active; }).length;
                  var postiTotal = posti.length;
                  var flApptCnt = 0;
                  posti.forEach(function(p) { flApptCnt += (S._roomApptCounts[p.id] || 0); });
                  var badge = postiTotal ? '<span class="tp-badge">' + postiActive + '/' + postiTotal + ' post.</span>' : '';
                  var cntBadge = flApptCnt ? '<span class="tp-badge tp-badge-count">' + flApptCnt + ' app.</span>' : '';
                  h += '<div class="tp-node is-flusso' + (sel ? ' is-selected' : '') + '" onclick="pickFlussoFromTree(' + ma.id + ',' + ar.id + ',' + sd.id + ',' + fl.id + ')">' + stIco(fl) + '<span class="tp-dot" style="background:' + C.TP_COLORS.flusso + '"></span><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">' + C.esc(fl.name) + '</span>' + badge + cntBadge + (sel ? ' ' + SVG_CHECK_FILL : '<span class="tp-arrow">' + SVG_ARROW_R + '</span>') + '</div>';
                  // Show postazioni with per-room counts
                  if (posti.length) {
                    h += '<div class="tp-group tp-postazioni">';
                    for (var pi = 0; pi < posti.length; pi++) {
                      var po = posti[pi];
                      var roomCnt = S._roomApptCounts[po.id] || 0;
                      var stIcon = po.station_type ? C.STATION_ICONS[po.station_type] + ' ' : '';
                      h += '<div class="tp-node tp-postazione">' + stIco(po) + stIcon + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">' + C.esc(po.name) + '</span>' + (roomCnt ? '<span class="tp-badge tp-badge-count">' + roomCnt + '</span>' : '<span class="tp-badge" style="opacity:.5">0</span>') + '</div>';
                    }
                    h += '</div>';
                  }
                }
                h += '</div>';
              }
            }
            h += '</div>';
          }
        }
        h += '</div>';
      }
    }
    body.innerHTML = h;
  }

  function pickFlussoFromTree(maId, arId, sdId, flId) {
    S.selMacroareaId = maId; S.selAreaId = arId; S.selSedeId = sdId; S.selFlussoId = flId;
    autoSelectPath(); updateStructLabel(); closeTreePicker();
    if (S.currentLayer === 'liste') {
      Ag.Lists.updateListeStructLabel();
      Ag.Lists.loadListeForFlusso().then(function() { Ag.Lists.renderListeSidebar(); if (S.selListId) Ag.Lists.loadAndRenderSlots(); });
    } else {
      hideAgendaLanding();
      loadSchedulerData();
    }
  }

  function loadSchedulerData() {
    return Promise.all([Ag.Scheduler.loadAppts(), Ag.Scheduler.loadOverrides()]).then(function() { Ag.Scheduler.render(); });
  }

  /* ══ ICON INJECTION ═════════════════════════════════════════
   * Shared icons (modals) are injected on boot because their DOM
   * exists immediately. Section-scoped icons must be injected when
   * the section's panel is mounted — the ID-based injector can't
   * find elements that don't exist yet.
   */
  function injectSharedIcons() {
    C.injectIcon('icoCloseWiz', 'ico-close');
    C.injectIcon('icoCloseDayCfg', 'ico-close');
    C.injectIcon('icoCloseTP', 'ico-close');
  }
  function injectAgendaSectionIcons() {
    C.injectIcon('icoBrand', 'ico-calendar');
    C.injectIcon('icoStruct', 'ico-hospital');
    C.injectIcon('icoStructDD', 'ico-chevron-down');
    C.injectIcon('icoAgendaBack', 'ico-chevron-left');
    C.injectIcon('icoZoomCfg', 'ico-settings');
  }

  /* ══ HEALTH CHECK ═══════════════════════════════════════════ */
  function healthCheck() {
    return Ag.Api.fetch('/health').then(function(j) {
      if (j && j.status === 'ok') return true;
      console.warn('[Agenda] health check failed:', j);
      return false;
    }).catch(function() { return false; });
  }

  /* ══ BOOT ═══════════════════════════════════════════════════ */
  var _booted = false;
  function boot(force) {
    injectSharedIcons();
    // Idempotent: skip data fetch if already loaded and not forced
    if (_booted && !force && S.treeNodes && S.treeNodes.length) {
      return Promise.resolve();
    }
    return loadTree().then(function() {
      return loadServices();
    }).then(function() {
      _booted = true;
    });
  }

  /* ══ CONTENT PROVIDER ═══════════════════════════════════════ */
  var _container = null;

  /**
   * mountSharedTemplate — injects module-loader + modals (wizard, tree
   * picker, confirm, etc.) once into the module's .content area. All
   * sections share these globally-scoped DOM nodes. A DOM-level guard
   * on `#wizBackdrop` ensures it cannot be injected twice even if
   * module lifecycle goes wrong (see AGENDA_AUDIT Bug 7/11).
   */
  function mountSharedTemplate() {
    if (document.getElementById('wizBackdrop')) return;
    if (!_container || !Ag.Template) return;
    var target = _container.querySelector('.content') || _container;
    var wrapper = document.createElement('div');
    // .ag-wrap class is required for the cascade of scoped agenda styles
    wrapper.className = 'ag-wrap agenda-shared-root';
    wrapper.innerHTML = Ag.Template.getShared();
    target.appendChild(wrapper);
  }

  /**
   * mountLayerIntoPanel — mounts a section's layer-app HTML directly
   * into its owning .section-panel. Each panel owns its DOM exclusively
   * (see AGENDA_AUDIT Bug 2/3). `.active` is set permanently because
   * the panel itself is toggled by the tab-strip.
   */
  function mountLayerIntoPanel(panel, layerId) {
    if (!panel || panel._agendaMounted) return;
    if (!Ag.Template) return;
    panel._agendaMounted = true;
    // Override default .section-panel padding/overflow so layer-app fills
    panel.style.padding = '0';
    panel.style.overflow = 'hidden';
    panel.classList.add('ag-wrap');
    panel.innerHTML = Ag.Template.getLayer(layerId);
    var layerEl = panel.querySelector('.layer-app');
    if (layerEl) layerEl.classList.add('active');
    if (layerId === 'agenda') injectAgendaSectionIcons();
  }

  function destroyTemplate(container) {
    var target = container || _container;
    if (target) {
      target.innerHTML = '';
    }
    _container = null;
    _booted = false;
    // Full state reset for clean re-open (see AGENDA_AUDIT Bug 8)
    S.currentLayer = 'agenda';
    S.treeNodes = []; S.nodeMap = {};
    S.selMacroareaId = null; S.selAreaId = null;
    S.selSedeId = null; S.selFlussoId = null;
    S.postazioni = []; S.appointments = [];
    S.servicesList = [];
    S.closedDays = {}; S.calCounts = {}; S.dayOverrides = {};
    S.calStationClosures = [];
    S.dragApptId = null;
    S.rangeSel = false; S.rangeRoom = null; S.rangeS = null; S.rangeE = null;
    S.wizStep = 0; S.wizSelSvcId = null;
    S.listeFlussoLists = []; S.selListId = null;
    S.listeSlots = null; S.listeClosedDays = {};
    S.elencoMode = 'day'; S.elencoNodeId = null; S.elencoData = null;
    S.mgmtMacroareaId = null;
    // D3 handles (released via innerHTML wipe, but clear refs)
    S.treeSvg = null; S.treeG = null; S.treeZoom = null;
    S.gestSedeId = null; S.gestFlussoId = null; S.gestStationId = null;
    S._detailApptId = null;
    S._roomApptCounts = null;
  }

  if (global.LayerSystem && global.LayerSystem.registerContent) {
    /* ── V2 Content Provider (tab strip + launcher layout) ── */
    var AGENDA_V2_CONFIG = {
      module: {
        icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        title: 'Agenda'
      },
      icons: {
        calendar: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        grid: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
        close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        lib: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15H15C15.93 15 16.4 15 16.77 15.15C17.26 15.36 17.64 15.74 17.85 16.23C18 16.6 18 17.07 18 18C18 18.93 18 19.4 17.85 19.77C17.64 20.26 17.26 20.64 16.77 20.85C16.4 21 15.93 21 15 21H2"/><path d="M2 3H15C15.93 3 16.4 3 16.77 3.15C17.26 3.36 17.64 3.74 17.85 4.23C18 4.6 18 5.07 18 6C18 6.93 18 7.4 17.85 7.77C17.64 8.26 17.26 8.64 16.77 8.85C16.4 9 15.93 9 15 9H2"/><path d="M22 9H9C8.07 9 7.6 9 7.23 9.15C6.74 9.36 6.36 9.74 6.15 10.23C6 10.6 6 11.07 6 12C6 12.93 6 13.4 6.15 13.77C6.36 14.26 6.74 14.64 7.23 14.85C7.6 15 8.07 15 9 15H22"/></svg>',
        chevron: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'
      },
      sections: [
        { id: 'agenda',      label: 'Agenda',     icon: 'calendar', desc: 'Calendario e appuntamenti',                    color: '#287094', render: function(el) { mountLayerIntoPanel(el, 'agenda');     showAgenda(); } },
        { id: 'liste',       label: 'Liste',      icon: 'list',     desc: 'Liste di lavoro giornaliere',                  color: '#5BA88C', render: function(el) { mountLayerIntoPanel(el, 'liste');      showListe(); } },
        { id: 'elenco',      label: 'Elenco',     icon: 'eye',      desc: 'Elenco prestazioni e pazienti',               color: '#A87FD4', render: function(el) { mountLayerIntoPanel(el, 'elenco');     showElenco(); } },
        { id: 'panoramica',  label: 'Panoramica', icon: 'grid',     desc: 'Vista cross-struttura con drag\u0026drop',     color: '#E87F24', render: function(el) { mountLayerIntoPanel(el, 'panoramica'); showPanoramica(); } }
      ],
      actions: [
        { id: '_close_layer', label: 'Chiudi Modulo', icon: 'close', desc: 'Chiudi il layer corrente', color: '#CE2626' },
        { id: '_library',     label: 'Libreria',      icon: 'lib',   desc: 'Torna alla libreria moduli', color: '#7DAACB' }
      ]
    };

    global.LayerSystem.registerContent('agenda-module-v2', {
      label: 'Agenda',
      render: function(container, context) {
        container.innerHTML = buildLayerLayoutV2({
          nodeId: context.nodeId,
          module: AGENDA_V2_CONFIG.module
        });
        _container = container;
        // Shared chunk (module loader + modals) goes in once.
        // Per-section layer DOM is mounted by each section's render().
        mountSharedTemplate();
        setupLayerV2(container, AGENDA_V2_CONFIG, context.manager, context.nodeId);
        showModuleLoader();
        boot().then(function() {
          hideModuleLoader();
          // Do NOT auto-open a section: show the launcher so the user
          // can pick the desired section (empty-state → launcher UX).
          if (container._launcher) container._launcher.open();
        }).catch(function() {
          hideModuleLoader();
        });
      },
      destroy: function(container) {
        if (container._tabStrip) container._tabStrip.destroy();
        destroyTemplate(container);
      }
    });
  } else {
    // Standalone: auto-boot
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Main = Object.freeze({
    loadTree: loadTree,
    loadServices: loadServices,
    loadAll: loadAll,
    autoSelectPath: autoSelectPath,
    updateStructLabel: updateStructLabel,
    closeTreePicker: closeTreePicker,
    boot: boot,
    healthCheck: healthCheck,
    showLoader: showModuleLoader,
    hideLoader: hideModuleLoader
  });

  /* ── Globals for HTML onclick ──────────────────────────────── */
  global.showAgenda = showAgenda;
  global.showListe = showListe;
  global.showElenco = showElenco;
  global.showPanoramica = showPanoramica;
  global.showLanding = showAgenda; // alias for template onclick
  global.openTreePicker = openTreePicker;
  global.closeTreePicker = closeTreePicker;
  global.pickFlussoFromTree = pickFlussoFromTree;

})(window);
