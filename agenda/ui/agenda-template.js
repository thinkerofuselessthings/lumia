/**
 * agenda-template.js — HTML template for Agenda module
 * Returns the full DOM structure to be injected into the layer container.
 * IIFE pattern consistent with other agenda modules.
 */
(function(global) {
  'use strict';

  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};

  /* ── Template function ─────────────────────────────────────── */
  function getTemplate() {
    return '' +
    '<div class="ag-wrap" id="agWrap" style="display:flex;flex-direction:column;height:100%;overflow:hidden">' +

    /* ═══ MODULE LOADER ═══════════════════════════════════════ */
    '<div class="module-loader" id="agModuleLoader"><div class="hema-spinner"></div></div>' +

    /* ═══ LAYER AGENDA ════════════════════════════════════════ */
    '<div id="layerAgenda" class="layer-app">' +
      '<div class="ag-sidebar">' +
        '<div class="sidebar-brand">' +
          '<span class="icon icon-lg" id="icoBrand"></span>' +
          '<h1>Agenda</h1>' +
          '<span class="health" id="health"></span>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Struttura</div>' +
          '<button class="struct-btn" onclick="openTreePicker()">' +
            '<span class="icon icon-sm" id="icoStruct"></span>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="struct-btn-label" id="structLabel">Seleziona flusso\u2026</div>' +
              '<div class="struct-btn-sub" id="structSub"></div>' +
            '</div>' +
            '<span class="icon icon-sm" id="icoStructDD"></span>' +
          '</button>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="mcal" id="miniCal"></div>' +
          '<div class="legend" style="margin-top:var(--sp-sm)">' +
            '<div class="legend-item"><span class="mcal-ind ind-open" style="display:inline-block"></span>Aperto</div>' +
            '<div class="legend-item"><span class="mcal-ind ind-partial" style="display:inline-block"></span>Parziale</div>' +
            '<div class="legend-item"><span class="mcal-ind ind-closed" style="display:inline-block"></span>Chiuso</div>' +
            '<div class="legend-item"><span class="mcal-ind ind-festivo" style="display:inline-block"></span>Festivo</div>' +
            '<div class="legend-item"><span class="mcal-ind ind-weekend" style="display:inline-block"></span>Weekend</div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-section" style="padding:var(--sp-sm) var(--sp-md)">' +
          '<div class="day-card" id="dayCard">' +
            '<div class="day-card-dow" id="dayCardDow"></div>' +
            '<div class="day-card-num" id="dayCardNum"></div>' +
            '<div class="day-card-month" id="dayCardMonth"></div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Legenda</div>' +
          '<div class="legend">' +
            '<div class="legend-item"><div class="legend-dot" style="background:var(--visita-bg);border:1px solid var(--visita-border)"></div>Visita</div>' +
            '<div class="legend-item"><div class="legend-dot" style="background:var(--terapia-bg);border:1px solid var(--terapia-border)"></div>Terapia</div>' +
            '<div class="legend-item"><div class="legend-dot" style="background:var(--prestazione-bg);border:1px solid var(--prestazione-border)"></div>Prestazione</div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Vista</div>' +
          '<button class="zoom-cfg-btn" id="zoomCfgBtn" onclick="openZoomCfg()" title="Configurazione vista"><span class="icon icon-sm" id="icoZoomCfg"></span></button>' +
        '</div>' +
      '</div>' +
      '<div class="scheduler-area">' +
        '<div class="day-banner" id="closedBanner"></div>' +
        '<div class="scheduler-wrap" id="schedulerWrap">' +
          '<div class="scheduler" id="scheduler"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ ZOOM CONFIG MODAL ═══════════════════════════════════ */
    '<div class="zoom-cfg-backdrop" id="zoomCfgBackdrop" onclick="if(event.target===this)closeZoomCfg()">' +
      '<div class="zoom-cfg-modal">' +
        '<div class="zoom-cfg-title">Configurazione vista</div>' +
        '<div class="zoom-cfg-options">' +
          '<button class="zoom-opt" data-px="14" onclick="setSlotZoom(14);closeZoomCfg()"><span class="zoom-opt-label">Compatto</span><span class="zoom-opt-desc">S — 14px</span></button>' +
          '<button class="zoom-opt" data-px="22" onclick="setSlotZoom(22);closeZoomCfg()"><span class="zoom-opt-label">Normale</span><span class="zoom-opt-desc">M — 22px</span></button>' +
          '<button class="zoom-opt" data-px="32" onclick="setSlotZoom(32);closeZoomCfg()"><span class="zoom-opt-label">Ampio</span><span class="zoom-opt-desc">L — 32px</span></button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ LAYER LISTE ═════════════════════════════════════════ */
    '<div id="layerListe" class="layer-app">' +
      '<div class="liste-sidebar">' +
        '<div class="sidebar-brand">' +
          '<span class="icon icon-lg" id="icoListeBrand"></span>' +
          '<h1>Liste</h1>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Struttura</div>' +
          '<button class="struct-btn" onclick="openTreePicker()">' +
            '<span class="icon icon-sm" id="icoListeStruct"></span>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="struct-btn-label" id="listeStructLabel">Seleziona flusso\u2026</div>' +
              '<div class="struct-btn-sub" id="listeStructSub"></div>' +
            '</div>' +
            '<span class="icon icon-sm" id="icoListeStructDD"></span>' +
          '</button>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="mcal" id="listeMiniCal"></div>' +
        '</div>' +
        '<div class="sidebar-section" style="padding:var(--sp-sm) var(--sp-md)">' +
          '<div class="day-card" id="listeDayCard" onclick="openListeDayConfig()">' +
            '<div class="day-card-dow" id="listeDayCardDow"></div>' +
            '<div class="day-card-num" id="listeDayCardNum"></div>' +
            '<div class="day-card-month" id="listeDayCardMonth"></div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Liste del flusso</div>' +
          '<div id="listeListSidebar"></div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Azioni</div>' +
          '<ul class="side-nav">' +
            '<li onclick="showLanding()"><span class="icon icon-sm" id="icoListeBack"></span> Torna alla home</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="liste-main">' +
        '<div class="liste-toolbar">' +
          '<span class="liste-title" id="listeToolbarTitle">Seleziona una lista</span>' +
          '<span class="liste-date" id="listeToolbarDate"></span>' +
        '</div>' +
        '<div class="slot-grid-wrap" id="slotGridWrap">' +
          '<div id="slotGridContent" style="color:var(--gray-400);text-align:center;padding:var(--sp-lg)">Seleziona un flusso e una lista dalla sidebar.</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ LAYER ELENCO ════════════════════════════════════════ */
    '<div id="layerElenco" class="layer-app">' +
      '<div class="elenco-sidebar">' +
        '<div class="sidebar-brand">' +
          '<span class="icon icon-lg" id="icoElencoBrand"></span>' +
          '<h1>Elenco</h1>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Struttura</div>' +
          '<button class="struct-btn" onclick="openElencoTreePicker()">' +
            '<span class="icon icon-sm" id="icoElencoStruct"></span>' +
            '<div style="flex:1;min-width:0">' +
              '<div class="struct-btn-label" id="elencoStructLabel">Seleziona livello\u2026</div>' +
              '<div class="struct-btn-sub" id="elencoStructSub"></div>' +
            '</div>' +
            '<span class="icon icon-sm" id="icoElencoStructDD"></span>' +
          '</button>' +
        '</div>' +
        '<div class="sidebar-section" style="padding:var(--sp-sm) var(--sp-md)">' +
          '<div class="sidebar-section-title" style="margin-bottom:var(--sp-xs)">Periodo</div>' +
          '<div class="elenco-range-form">' +
            '<button class="btn-sm active" id="elencoModDay" onclick="setElencoMode(\'day\')">Giorno</button>' +
            '<button class="btn-sm" id="elencoModRange" onclick="setElencoMode(\'range\')">Intervallo</button>' +
          '</div>' +
          '<div style="margin-top:var(--sp-xs)">' +
            '<div id="elencoDateDay">' +
              '<div class="mcal" id="elencoMiniCal"></div>' +
            '</div>' +
            '<div id="elencoDateRange" style="display:none">' +
              '<div style="display:flex;gap:var(--sp-xs);align-items:center">' +
                '<input type="date" id="elencoFrom" style="flex:1">' +
                '<span style="font-size:.7rem;color:var(--gray-500)">\u2192</span>' +
                '<input type="date" id="elencoTo" style="flex:1">' +
              '</div>' +
              '<button class="btn-sm" style="margin-top:var(--sp-xs);width:100%" onclick="loadElenco()">Cerca</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Azioni</div>' +
          '<ul class="side-nav">' +
            '<li onclick="showLanding()"><span class="icon icon-sm" id="icoElencoBack"></span> Torna alla home</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="elenco-main">' +
        '<div class="elenco-toolbar">' +
          '<span class="elenco-title" id="elencoToolbarTitle">Seleziona una struttura e una data</span>' +
          '<span class="elenco-counts" id="elencoCounts"></span>' +
        '</div>' +
        '<div class="elenco-table-wrap">' +
          '<div id="elencoContent" style="color:var(--gray-400);text-align:center;padding:var(--sp-lg)">Seleziona un nodo dalla sidebar e una data per visualizzare l\'elenco.</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ LAYER PANORAMICA ════════════════════════════════════ */
    '<div id="layerPanoramica" class="layer-app">' +
      '<div class="pan-sidebar">' +
        '<div class="sidebar-brand">' +
          '<span class="icon icon-lg" id="icoPanBrand"></span>' +
          '<h1>Panoramica</h1>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="mcal" id="panMiniCal"></div>' +
        '</div>' +
        '<div class="sidebar-section" style="padding:var(--sp-sm) var(--sp-md)">' +
          '<div class="sidebar-section-title" style="margin-bottom:var(--sp-xs)">Data selezionata</div>' +
          '<div class="pan-date-label" id="panDateLabel"></div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Legenda</div>' +
          '<div class="legend">' +
            '<div class="legend-item"><div class="legend-dot" style="background:var(--visita-bg);border:1px solid var(--visita-border)"></div>Visita</div>' +
            '<div class="legend-item"><div class="legend-dot" style="background:var(--terapia-bg);border:1px solid var(--terapia-border)"></div>Terapia</div>' +
            '<div class="legend-item"><div class="legend-dot" style="background:var(--prestazione-bg);border:1px solid var(--prestazione-border)"></div>Prestazione</div>' +
          '</div>' +
        '</div>' +
        '<div class="sidebar-section">' +
          '<div class="sidebar-section-title">Azioni</div>' +
          '<ul class="side-nav">' +
            '<li onclick="showLanding()"><span class="icon icon-sm" id="icoPanBack"></span> Torna alla home</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +
      '<div class="pan-main">' +
        '<div class="pan-toolbar">' +
          '<span class="pan-toolbar-title">Panoramica appuntamenti</span>' +
          '<div class="pan-view-toggle" role="tablist" aria-label="Modalità vista">' +
            '<button type="button" class="pan-view-btn is-active" data-view="kanban" onclick="panSetView(\'kanban\')" role="tab" aria-selected="true">Kanban</button>' +
            '<button type="button" class="pan-view-btn" data-view="vertical" onclick="panSetView(\'vertical\')" role="tab" aria-selected="false">Verticale</button>' +
          '</div>' +
          '<span class="pan-toolbar-hint" id="panToolbarHint">Trascina le card per spostare gli appuntamenti tra postazioni</span>' +
        '</div>' +
        '<div class="pan-board-wrap">' +
          '<div class="pan-board" id="panBoard" data-view="kanban">' +
            '<div class="pan-empty">' +
              '<p>Seleziona una data per visualizzare la panoramica</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ PANORAMICA — POSTAZIONE MODAL ═══════════════════════ */
    '<div class="pan-room-backdrop" id="panRoomBackdrop" onclick="if(event.target===this)closePanRoom()">' +
      '<div class="pan-room-modal" role="dialog" aria-modal="true" aria-labelledby="panRoomTitle">' +
        '<div class="pan-room-header">' +
          '<div class="pan-room-titles">' +
            '<span class="pan-room-breadcrumb" id="panRoomBreadcrumb"></span>' +
            '<h2 id="panRoomTitle">Postazione</h2>' +
            '<span class="pan-room-date" id="panRoomDate"></span>' +
          '</div>' +
          '<button type="button" class="pan-room-close" onclick="closePanRoom()" aria-label="Chiudi"><span class="icon" id="icoPanRoomClose"></span></button>' +
        '</div>' +
        '<div class="pan-room-body" id="panRoomBody"></div>' +
      '</div>' +
    '</div>' +

    /* ═══ WIZARD ══════════════════════════════════════════════ */
    '<div class="layer-backdrop" id="wizBackdrop">' +
      '<div class="node-wizard">' +
        '<div class="node-header">' +
          '<h2 id="wizTitle">Nuovo appuntamento</h2>' +
          '<button class="node-close" onclick="closeWizard()"><span class="icon" id="icoCloseWiz"></span></button>' +
        '</div>' +
        '<div class="wiz-split">' +
          '<div class="wiz-placeholder" id="wizPlaceholder">' +
            '<span class="wiz-ph-icon" id="wizPhIcon"></span>' +
            '<span class="wiz-ph-label" id="wizPhLabel">Prestazione</span>' +
          '</div>' +
          '<div class="wiz-body">' +
            '<div class="wizard-steps" id="wizSteps">' +
              '<div class="wizard-step active" data-step="0"><span class="step-num">1</span>Tipo</div>' +
              '<div class="wizard-step" data-step="1"><span class="step-num">2</span>Paziente</div>' +
              '<div class="wizard-step" data-step="2"><span class="step-num">3</span>Dettagli</div>' +
              '<div class="wizard-step" data-step="3"><span class="step-num">4</span>Orario</div>' +
            '</div>' +
            '<div class="node-body">' +
              '<form id="wizForm" onsubmit="submitWizard(event)" autocomplete="off">' +
                '<input type="hidden" id="w_id"><input type="hidden" id="w_room_id"><input type="hidden" id="w_patient_uuid">' +
                '<div class="wizard-page active" data-page="0">' +
                  '<div class="form-section">' +
                    '<div class="form-section-title">Filtra per tipo</div>' +
                    '<div class="type-pills" id="typePills">' +
                      '<button type="button" class="type-pill selected" data-t="" onclick="pickType(this)">Tutti</button>' +
                      '<button type="button" class="type-pill" data-t="visita" onclick="pickType(this)">Visita</button>' +
                      '<button type="button" class="type-pill" data-t="terapia" onclick="pickType(this)">Terapia</button>' +
                      '<button type="button" class="type-pill" data-t="prestazione" onclick="pickType(this)">Prestazione</button>' +
                    '</div>' +
                  '</div>' +
                  '<div class="form-section">' +
                    '<div class="form-section-title">Scegli prestazione</div>' +
                    '<div class="wiz-svc-list" id="wizSvcList"></div>' +
                  '</div>' +
                  '<input type="hidden" id="w_prestazione">' +
                '</div>' +
                '<div class="wizard-page" data-page="1">' +
                  '<div class="form-section">' +
                    '<div class="form-section-title">Anagrafica paziente</div>' +
                    '<button type="button" class="btn btn-sm" id="wizAnaBtn" onclick="openAnagraficaModal()" style="margin-bottom:var(--sp-md)">' +
                      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21L16.65 16.65"/></svg> Cerca anagrafica' +
                    '</button>' +
                  '</div>' +
                  '<div class="form-section">' +
                    '<div class="form-section-title">Dati paziente</div>' +
                    '<div class="form-row cols-2">' +
                      '<div class="form-group"><label>Nome</label><input id="w_nome"></div>' +
                      '<div class="form-group"><label>Cognome</label><input id="w_cognome"></div>' +
                    '</div>' +
                    '<div class="form-row cols-2">' +
                      '<div class="form-group"><label>Codice Fiscale</label><input id="w_codice_fiscale" maxlength="16" style="text-transform:uppercase"></div>' +
                      '<div class="form-group"><label>Data di nascita</label><input type="date" id="w_data_nascita"></div>' +
                    '</div>' +
                    '<div class="form-row">' +
                      '<div class="form-group"><label>Telefono</label><input id="w_phone" type="tel" placeholder="Numero di telefono"></div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
                '<div class="wizard-page" data-page="2">' +
                  '<div class="form-section">' +
                    '<div class="form-section-title">Informazioni appuntamento</div>' +
                    '<div class="form-row"><div class="form-group"><label>Titolo</label><input id="w_title"></div></div>' +
                    '<div class="form-row"><div class="form-group"><label>Descrizione</label><textarea id="w_description" rows="2"></textarea></div></div>' +
                    '<div class="form-row"><div class="form-group"><label>Note</label><textarea id="w_notes" rows="2" placeholder="Note aggiuntive\u2026"></textarea></div></div>' +
                  '</div>' +
                '</div>' +
                '<div class="wizard-page" data-page="3">' +
                  '<div class="form-section">' +
                    '<div class="form-section-title">Data e orario</div>' +
                    '<div class="form-row cols-3">' +
                      '<div class="form-group"><label>Data</label><input type="date" id="w_date"></div>' +
                      '<div class="form-group"><label>Inizio</label><input type="time" id="w_start" step="600"></div>' +
                      '<div class="form-group"><label>Fine</label><input type="time" id="w_end" step="600"></div>' +
                    '</div>' +
                    '<div class="form-section-title" style="margin-top:var(--sp-sm)">Durata rapida</div>' +
                    '<div class="dur-chips" id="durChips"></div>' +
                  '</div>' +
                '</div>' +
                '<div class="form-error" id="wizError"></div>' +
                '<div class="wizard-footer">' +
                  '<button type="button" class="btn" id="wizPrev" onclick="wizPrevStep()" style="display:none">Indietro</button>' +
                  '<span style="flex:1"></span>' +
                  '<button type="button" class="btn" onclick="closeWizard()">Annulla</button>' +
                  '<button type="button" class="btn btn-primary" id="wizNext" onclick="wizNextStep()">Avanti</button>' +
                  '<button type="submit" class="btn btn-primary" id="wizSubmitBtn" style="display:none">Salva</button>' +
                '</div>' +
              '</form>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ ANAGRAFICA SEARCH MODAL ═════════════════════════════ */
    '<div class="ana-backdrop" id="anaBackdrop" onclick="if(event.target===this)closeAnagraficaModal()">' +
      '<div class="ana-modal">' +
        '<div class="node-header">' +
          '<h2>Cerca Anagrafica</h2>' +
          '<button class="node-close" onclick="closeAnagraficaModal()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6L18 18"/></svg></button>' +
        '</div>' +
        '<div class="ana-split">' +
          '<div class="ana-placeholder">' +
            '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ana-ph-icon"><circle cx="11" cy="11" r="8"/><path d="M21 21L16.65 16.65"/></svg>' +
          '</div>' +
          '<div class="ana-search">' +
            '<div class="ana-search-input-wrap">' +
              '<input id="anaSearchInput" placeholder="Cerca per cognome, nome o CF\u2026" oninput="anaSearch(this.value)" autocomplete="off">' +
            '</div>' +
            '<div class="ana-search-list" id="anaSearchList">' +
              '<div class="ana-empty">Digita per cercare\u2026</div>' +
            '</div>' +
          '</div>' +
          '<div class="ana-result" id="anaResult">' +
            '<div class="ana-empty">Seleziona un paziente dalla lista</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ DAY CONFIG ══════════════════════════════════════════ */
    '<div class="layer-backdrop layer-fullscreen" id="dayBackdrop">' +
      '<div class="node-layer">' +
        '<div class="node-header">' +
          '<h2 id="dayCfgTitle">Configurazione giorno</h2>' +
          '<button class="node-close" onclick="closeDayConfig()"><span class="icon" id="icoCloseDayCfg"></span></button>' +
        '</div>' +
        '<div class="layer-layout" style="flex:1;overflow:hidden">' +
          '<div class="layer-sidebar" id="dayCfgNav"></div>' +
          '<div class="layer-main" id="dayCfgContent"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ ENTRY DIALOG (Liste) ════════════════════════════════ */
    '<div class="layer-backdrop" id="entryDlgBackdrop" onclick="if(event.target===this)closeEntryDlg()">' +
      '<div class="node-modal">' +
        '<div class="node-header">' +
          '<h2 id="entryDlgTitle">Inserisci paziente</h2>' +
          '<button class="node-close" onclick="closeEntryDlg()"><span class="icon" id="icoCloseEntry"></span></button>' +
        '</div>' +
        '<div class="node-body">' +
          '<form id="entryForm" onsubmit="submitEntry(event)" autocomplete="off">' +
            '<input type="hidden" id="e_id">' +
            '<input type="hidden" id="e_list_id">' +
            '<input type="hidden" id="e_date">' +
            '<input type="hidden" id="e_slot_time">' +
            '<input type="hidden" id="e_patient_uuid">' +
            '<div class="form-section">' +
              '<div class="form-section-title">Cerca paziente</div>' +
              '<div class="form-row">' +
                '<div class="form-group pac-wrap">' +
                  '<label>Cerca per cognome, nome o CF</label>' +
                  '<input id="e_pac_search" placeholder="Digita per cercare\u2026" oninput="patSearchEntry(this.value)">' +
                  '<div class="pac-list" id="e_pac_list"></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="form-section">' +
              '<div class="form-section-title">Dati paziente</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Nome paziente</label><input id="e_patient_name" required></div>' +
              '</div>' +
              '<div class="form-row cols-2">' +
                '<div class="form-group"><label>Codice fiscale / ID</label><input id="e_patient_id"></div>' +
                '<div class="form-group"><label>Telefono</label><input id="e_phone"></div>' +
              '</div>' +
              '<div class="form-row cols-2">' +
                '<div class="form-group"><label>Data di nascita</label><input type="date" id="e_birth_date"></div>' +
                '<div class="form-group"></div>' +
              '</div>' +
              '<div class="form-row">' +
                '<div class="form-group"><label>Note</label><textarea id="e_notes" rows="2"></textarea></div>' +
              '</div>' +
            '</div>' +
            '<div class="layer-form-footer">' +
              '<button type="button" class="btn" onclick="closeEntryDlg()">Annulla</button>' +
              '<button type="submit" class="btn btn-primary" id="entrySubmitBtn">Inserisci</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ ENTRY DETAIL MODAL ══════════════════════════════════ */
    '<div class="layer-backdrop" id="entryDetailBackdrop" onclick="if(event.target===this)closeEntryDetail()">' +
      '<div class="node-modal">' +
        '<div class="node-header">' +
          '<h2 id="entryDetailTitle">Dettaglio paziente</h2>' +
          '<button class="node-close" onclick="closeEntryDetail()"><span class="icon" id="icoCloseEntryDetail"></span></button>' +
        '</div>' +
        '<div class="node-body" id="entryDetailBody"></div>' +
      '</div>' +
    '</div>' +

    /* ═══ CONFIRM MODAL ═══════════════════════════════════════ */
    '<div class="confirm-backdrop" id="confirmBackdrop">' +
      '<div class="confirm-box">' +
        '<p id="confirmMsg"></p>' +
        '<div class="confirm-actions">' +
          '<button class="btn" onclick="resolveConfirm(false)">Annulla</button>' +
          '<button class="btn btn-danger" onclick="resolveConfirm(true)">Conferma</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ INPUT DIALOG ════════════════════════════════════════ */
    '<div class="input-dialog-backdrop" id="inputDlgBackdrop" onclick="if(event.target===this)resolveInputDlg(null)">' +
      '<div class="input-dialog">' +
        '<label id="inputDlgLabel">Nome</label>' +
        '<input id="inputDlgInput" autocomplete="off">' +
        '<div class="input-dialog-actions">' +
          '<button class="btn" onclick="resolveInputDlg(null)">Annulla</button>' +
          '<button class="btn btn-primary" id="inputDlgOk" onclick="resolveInputDlg(document.getElementById(\'inputDlgInput\').value)">OK</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ TREE PICKER MODAL ═══════════════════════════════════ */
    '<div class="tree-picker-backdrop" id="treePickerBackdrop" onclick="if(event.target===this)closeTreePicker()">' +
      '<div class="tree-picker">' +
        '<div class="node-header">' +
          '<h2 id="treePickerTitle">Seleziona flusso</h2>' +
          '<button class="node-close" onclick="closeTreePicker()"><span class="icon" id="icoCloseTP"></span></button>' +
        '</div>' +
        '<div class="tree-picker-body" id="treePickerBody"></div>' +
      '</div>' +
    '</div>' +

    /* ═══ APPOINTMENT DETAIL MODAL ════════════════════════════ */
    '<div class="appt-detail-backdrop" id="apptDetailBackdrop" onclick="if(event.target===this)closeApptDetail()">' +
      '<div class="appt-detail-modal">' +
        '<div class="appt-detail-header">' +
          '<h2 id="apptDetailTitle">Dettaglio appuntamento</h2>' +
          '<button class="node-close" onclick="closeApptDetail()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6L18 18"/></svg></button>' +
        '</div>' +
        '<div class="appt-detail-split">' +
          '<div class="appt-detail-placeholder" id="apptDetailPh">' +
            '<span class="appt-ph-icon" id="apptPhIcon"></span>' +
            '<span class="appt-ph-badge" id="apptPhBadge"></span>' +
          '</div>' +
          '<div class="appt-detail-content">' +
            '<div class="appt-detail-body" id="apptDetailBody"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ═══ PRESTAZIONI CONTAINER ═══════════════════════════════ */
    '<div class="prest-backdrop" id="prestBackdrop" onclick="if(event.target===this)prestClose()">' +
      '<div class="prest-modal">' +
        '<div class="prest-header">' +
          '<h2 id="prestTitle">\u2014</h2>' +
          '<div class="prest-header-actions">' +
            '<button class="btn btn-sm btn-accent" id="prestBtnSave" onclick="prestSave()"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16L21 8V19C21 20.1 20.1 21 19 21Z"/><path d="M17 21V13H7V21"/><path d="M7 3V8H15"/></svg> Salva</button>' +
            '<button class="btn btn-sm btn-accent" id="prestBtnPrint" onclick="prestPrint()" disabled><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2H18V9"/><path d="M6 18H4C2.9 18 2 17.1 2 16V11C2 9.9 2.9 9 4 9H20C21.1 9 22 9.9 22 11V16C22 17.1 21.1 18 20 18H18"/><path d="M18 14H6V22H18V14Z"/></svg> Stampa</button>' +
            '<button class="node-close" onclick="prestClose()"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6L18 18"/></svg></button>' +
          '</div>' +
        '</div>' +
        '<div class="prest-body" id="prestBody"></div>' +
      '</div>' +
    '</div>' +



    '</div>'; /* /ag-wrap */
  }

  /* ── Public API ────────────────────────────────────────────── */
  /*
   * Template is split lazily (on first access) into per-layer chunks
   * and a "shared" chunk (module loader + modals). Each Agenda section
   * mounts its own layer into its section panel, while the shared
   * chunk is mounted exactly once at the container level. This keeps
   * the monolithic source readable while enabling per-panel mounting
   * (see AGENDA_AUDIT Bug 2/3/11 fix).
   */
  var _cache = null;
  function _parse() {
    if (_cache) return _cache;
    var holder = document.createElement('div');
    holder.innerHTML = getTemplate();
    var agWrap = holder.querySelector('.ag-wrap') || holder;
    var layers = {
      agenda:     (agWrap.querySelector('#layerAgenda')     || {}).outerHTML || '',
      liste:      (agWrap.querySelector('#layerListe')      || {}).outerHTML || '',
      elenco:     (agWrap.querySelector('#layerElenco')     || {}).outerHTML || '',
      panoramica: (agWrap.querySelector('#layerPanoramica') || {}).outerHTML || ''
    };
    // Zoom-cfg modal is Agenda-section-specific, bundle with agenda layer
    var zoomCfg = agWrap.querySelector('#zoomCfgBackdrop');
    if (zoomCfg) {
      layers.agenda += zoomCfg.outerHTML;
      zoomCfg.remove();
    }
    // Strip layers from the wrap: what remains is "shared" (loader + modals)
    ['#layerAgenda', '#layerListe', '#layerElenco', '#layerPanoramica'].forEach(function(sel) {
      var el = agWrap.querySelector(sel);
      if (el) el.remove();
    });
    _cache = { layers: layers, shared: agWrap.innerHTML };
    return _cache;
  }
  function getLayer(id)  { return _parse().layers[id] || ''; }
  function getShared()   { return _parse().shared; }

  Ag.Template = Object.freeze({
    get: getTemplate,
    getLayer: getLayer,
    getShared: getShared
  });

  /* ── Global export (for standalone use) ────────────────────── */
  global.getAgendaTemplate = getTemplate;

})(window);
