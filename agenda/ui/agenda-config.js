/**
 * agenda-config.js — Constants, helpers, SVG icons for the Agenda module
 * Exposes: Ag.Config + global helpers ($, esc, tpl, hgi, fmtDate, toMin, toTime)
 */
(function(global) {
  'use strict';
  var Ag = global.LumiaAgenda = global.LumiaAgenda || {};

  /* ── State container (shared across all agenda modules) ────── */
  Ag.state = Ag.state || {
    treeNodes: [], nodeMap: {}, postazioni: [], appointments: [],
    closedDays: {}, calCounts: {}, dayOverrides: {}, calStationClosures: [],
    selDate: fmtDate(new Date()), selMacroareaId: null, selAreaId: null,
    selSedeId: null, selFlussoId: null,
    calY: new Date().getFullYear(), calM: new Date().getMonth(),
    dragApptId: null, rangeSel: false, rangeRoom: null, rangeS: null, rangeE: null,
    wizStep: 0, currentLayer: 'landing',
    servicesList: [], listeFlussoLists: [], selListId: null, listeSlots: null,
    listeClosedDays: {},
    elencoMode: 'day', elencoNodeId: null, elencoData: null,
    mgmtMacroareaId: null, treeSvg: null, treeG: null, treeZoom: null,
    gestSedeId: null, gestSedeTab: 'chiusure', gestSedeCalYear: null, gestSedeCalMonth: null,
    gestFlussoId: null, gestFlussoTab: 'liste', gestFlussoCalYear: null, gestFlussoCalMonth: null, gestFlussoListId: null,
    gestStationId: null, gestStationTab: 'schedule', gestStationCalYear: null, gestStationCalMonth: null,
    gestSvcFilterSede: null,
    wizSelSvcId: null,
    _detailApptId: null,
    _confirmResolve: null,
    _inputDlgResolve: null,
    _pacTimerE: null,
    _pacTimerW: null,
    _stationSched: null
  };

  /* ── Constants ─────────────────────────────────────────────── */
  var API_BASE = '/api/agenda';
  var DAY_START = 8 * 60;
  var DAY_END = 20 * 60;
  var SLOT_MIN = 10;
  var API_TIMEOUT = 15000;
  var DURATIONS = [5,10,15,20,30,40,45,50,60,75,90,120,150,180];

  var HGI_MAP = {
    'ico-chevron-left':'hgi-arrow-left-01','ico-chevron-right':'hgi-arrow-right-01',
    'ico-chevron-down':'hgi-arrow-down-01','ico-add':'hgi-add-01',
    'ico-edit':'hgi-pencil-edit-02','ico-delete':'hgi-delete-02',
    'ico-close':'hgi-cancel-01','ico-settings':'hgi-settings-02',
    'ico-hospital':'hgi-hospital-02','ico-eye':'hgi-eye','ico-eye-off':'hgi-view-off',
    'ico-today':'hgi-record','ico-stethoscope':'hgi-stethoscope-02',
    'ico-calendar':'hgi-calendar-02','ico-clipboard':'hgi-clipboard','ico-list':'hgi-note-edit'
  };

  var STATUS_ICO = {
    scheduled:'hgi-clock-01', confirmed:'hgi-checkmark-circle-02',
    completed:'hgi-tick-02', cancelled:'hgi-cancel-circle', no_show:'hgi-user-remove-01'
  };

  var TYPE_SVG = {
    visita:'<svg viewBox="0 0 24 24"><path d="M13 2C14.1 2 15 2.93 15 4.08C15 5.03 15.04 5.87 14.27 6.57C11.76 8.86 10.5 10 9 10C7.5 10 6.24 8.86 3.73 6.57C2.96 5.87 3 5.03 3 4.08C3 2.93 3.9 2 5 2"/><path d="M9 14V17.5C9 19.99 11.01 22 13.5 22C15.99 22 18 19.99 18 17.5V16"/><path d="M14 7L12.7 10.26C12.35 11.12 12.18 11.55 11.89 11.91C11.6 12.26 11.21 12.52 10.43 13.03L8.97 14L7.53 13.03C6.77 12.52 6.39 12.26 6.11 11.91C5.82 11.56 5.65 11.14 5.31 10.28L4 7"/><path d="M21 13C21 14.66 19.66 16 18 16C16.34 16 15 14.66 15 13C15 11.34 16.34 10 18 10C19.66 10 21 11.34 21 13Z"/></svg>',
    terapia:'<svg viewBox="0 0 24 24"><path d="M11.45 19.55L19.55 11.45C20.48 10.52 21 9.26 21 7.95C21 5.22 18.78 3 16.05 3C14.74 3 13.48 3.52 12.55 4.45L4.45 12.55C3.52 13.48 3 14.74 3 16.05C3 18.78 5.22 21 7.95 21C9.26 21 10.52 20.48 11.45 19.55Z"/><path d="M8.5 8.5L15.5 15.5"/></svg>',
    prestazione:'<svg viewBox="0 0 24 24"><path d="M5 7.37C13 3.24 11.5 10 19 7.37"/><path d="M5 9C5 6.19 5 4.79 5.67 3.78C5.97 3.34 6.34 2.97 6.78 2.67C7.79 2 9.19 2 12 2C14.81 2 16.21 2 17.22 2.67C17.66 2.97 18.03 3.34 18.33 3.78C19 4.79 19 6.19 19 9V11C19 13.81 19 15.21 18.33 16.22C18.03 16.66 17.66 17.03 17.22 17.33C16.21 18 14.81 18 12 18C9.19 18 7.79 18 6.78 17.33C6.34 17.03 5.97 16.66 5.67 16.22C5 15.21 5 13.81 5 11V9Z"/><path d="M12.01 10L10.57 11.49C9.8 12.3 9.81 13.61 10.59 14.41C11.37 15.21 12.64 15.19 13.41 14.39C14.2 13.58 14.19 12.27 13.41 11.47L12.01 10Z"/><path d="M8 22C10.21 22 12 20.21 12 18"/></svg>'
  };

  var SVG_NAV_LEFT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>';
  var SVG_NAV_RIGHT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>';

  var SVG_PATIENT = '<svg viewBox="0 0 24 24"><path d="M15 21.5C16.39 21.5 17.09 21.5 17.67 21.36C19.5 20.92 20.92 19.5 21.36 17.67C21.5 17.09 21.5 16.39 21.5 15M9 21.5C7.61 21.5 6.91 21.5 6.33 21.36C4.5 20.92 3.08 19.5 2.64 17.67C2.5 17.09 2.5 16.39 2.5 15M9 2.5C7.61 2.5 6.91 2.5 6.33 2.64C4.5 3.08 3.08 4.5 2.64 6.33C2.5 6.91 2.5 7.61 2.5 9M15 2.5C16.39 2.5 17.09 2.5 17.67 2.64C19.5 3.08 20.92 4.5 21.36 6.33C21.5 6.91 21.5 7.61 21.5 9"/><path d="M15 9.5C15 7.84 13.66 6.5 12 6.5C10.34 6.5 9 7.84 9 9.5C9 11.16 10.34 12.5 12 12.5C13.66 12.5 15 11.16 15 9.5Z"/><path d="M17 17.5C17 14.74 14.76 12.5 12 12.5C9.24 12.5 7 14.74 7 17.5"/></svg>';
  var SVG_CLOCK = '<svg viewBox="0 0 24 24"><path d="M16 2V6M8 2V6"/><path d="M21 12C21 8.23 21 6.34 19.83 5.17C18.66 4 16.77 4 13 4H11C7.23 4 5.34 4 4.17 5.17C3 6.34 3 8.23 3 12V14C3 17.77 3 19.66 4.17 20.83C5.34 22 7.23 22 11 22"/><path d="M3 10H21"/><path d="M18.27 18.7L17 18V16.27M21 18C21 20.21 19.21 22 17 22C14.79 22 13 20.21 13 18C13 15.79 14.79 14 17 14C19.21 14 21 15.79 21 18Z"/></svg>';
  var SVG_CF = '<svg viewBox="0 0 24 24"><path d="M8.5 18C10.31 16.05 13.67 15.95 15.5 18M13.94 12C13.94 13.1 13.07 14 11.99 14C10.92 14 10.05 13.1 10.05 12C10.05 10.9 10.92 10 11.99 10C13.07 10 13.94 10.9 13.94 12Z"/><path d="M9.5 4C6.86 4.01 5.44 4.1 4.53 4.97C3.5 5.94 3.5 7.51 3.5 10.63V15.37C3.5 18.5 3.5 20.06 4.53 21.03C5.55 22 7.2 22 10.5 22H13.5C16.8 22 18.45 22 19.47 21.03C20.5 20.06 20.5 18.5 20.5 15.37V10.63C20.5 7.51 20.5 5.94 19.47 4.97C18.56 4.1 17.14 4.01 14.5 4"/><path d="M9.77 3.63C9.87 3.22 9.92 3.01 10.01 2.84C10.22 2.45 10.62 2.16 11.09 2.05C11.29 2 11.53 2 12 2C12.47 2 12.71 2 12.91 2.05C13.38 2.16 13.78 2.45 13.99 2.84C14.08 3.01 14.13 3.22 14.23 3.63L14.31 3.99C14.48 4.73 14.57 5.1 14.44 5.38C14.35 5.56 14.21 5.72 14.03 5.83C13.75 6 13.33 6 12.5 6H11.5C10.67 6 10.25 6 9.97 5.83C9.79 5.72 9.65 5.56 9.56 5.38C9.43 5.1 9.52 4.73 9.69 3.99L9.77 3.63Z"/></svg>';
  var SVG_DURATION = '<svg viewBox="0 0 24 24"><path d="M8.38 3C8.16 3.08 7.95 3.17 7.74 3.26M20.72 16.3C20.82 16.08 20.91 15.85 21 15.62M18.5 19.36C18.67 19.2 18.84 19.04 19 18.87M15.27 21.37C15.46 21.3 15.65 21.22 15.84 21.14M12.16 21.99C11.93 22 11.69 22 11.46 21.99M7.79 21.14C7.97 21.22 8.15 21.3 8.34 21.37M4.67 18.92C4.81 19.07 4.95 19.21 5.1 19.34M2.63 15.66C2.71 15.86 2.79 16.06 2.88 16.25M2 12.51C2 12.3 2 12.09 2 11.88M2.63 8.74C2.7 8.54 2.78 8.35 2.86 8.16M4.66 5.48C4.8 5.33 4.95 5.18 5.1 5.03"/><path d="M13.5 12C13.5 12.83 12.83 13.5 12 13.5C11.17 13.5 10.5 12.83 10.5 12C10.5 11.17 11.17 10.5 12 10.5M13.5 12C13.5 11.17 12.83 10.5 12 10.5M13.5 12H16M12 10.5V6"/><path d="M22 12C22 6.48 17.52 2 12 2"/></svg>';

  var STATUS_SVG = {
    scheduled:  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6V12L16 14"/></svg>',
    confirmed:  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12L11 15L16 9"/></svg>',
    completed:  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13L9 17L19 7"/></svg>',
    cancelled:  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M15 9L9 15M9 9L15 15"/></svg>',
    no_show:    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20C5 16.13 8.13 13 12 13C12.7 13 13.37 13.1 14 13.29"/><path d="M18 14L22 18M22 14L18 18"/></svg>'
  };

  var SVG_CALENDAR_EMPTY = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10H21"/><path d="M8 2V6M16 2V6"/></svg>';
  var SVG_CALENDAR_REMOVE = '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10H21"/><path d="M8 2V6M16 2V6"/><path d="M15 15L9 15"/></svg>';
  var SVG_STETHOSCOPE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2C4.34 4 4 6 4 8C4 10.21 5.79 12 8 12H9C11.21 12 13 10.21 13 8C13 6 12.66 4 11 2"/><path d="M8.5 12V16.5C8.5 19 10.5 21 13 21C15.5 21 17.5 19 17.5 16.5V14"/><circle cx="17.5" cy="12" r="2"/></svg>';
  var SVG_INJECTION = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2L22 6"/><path d="M20 4L10.5 13.5"/><path d="M13.5 7.5L16.5 10.5"/><path d="M6.5 14.5L9.5 17.5"/><path d="M2 22L5.5 18.5"/><path d="M10.5 10.5L4 17C3.45 17.55 3.45 18.45 4 19L5 20C5.55 20.55 6.45 20.55 7 20L13.5 13.5"/></svg>';
  var SVG_CLIPBOARD = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3V2C9 1.45 9.45 1 10 1H14C14.55 1 15 1.45 15 2V3"/><path d="M9 11H15M9 15H13"/></svg>';
  var SVG_TITLE = '<svg viewBox="0 0 24 24"><path d="M4 17.98V9.71C4 6.07 4 4.26 5.17 3.13C6.34 2 8.23 2 12 2C15.77 2 17.66 2 18.83 3.13C20 4.26 20 6.07 20 9.71V17.98C20 20.29 20 21.44 19.23 21.85C17.73 22.65 14.92 19.99 13.59 19.18C12.82 18.72 12.43 18.48 12 18.48C11.57 18.48 11.18 18.72 10.41 19.18C9.08 19.99 6.27 22.65 4.77 21.85C4 21.44 4 20.29 4 17.98Z"/><path d="M4 7H20"/></svg>';

  var TYPE_LABELS_IT = { visita: 'Visita', terapia: 'Terapia', prestazione: 'Prestazione' };
  var TP_COLORS = { macroarea: '#1A1A1A', area: '#287094', sede: '#16A34A', flusso: '#EA580C' };
  var TYPE_COLORS = { macroarea: '#1A1A1A', area: '#287094', sede: '#16A34A', flusso: '#EA580C', postazione: '#9E9E9E' };
  var TYPE_LABELS = { macroarea: 'Macroarea', area: 'Area', sede: 'Sede', flusso: 'Flusso', postazione: 'Postazione' };
  var TYPE_CHILD = { macroarea: 'area', area: 'sede', sede: 'flusso', flusso: 'postazione' };
  var STATION_ICONS = {
    letto: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20V14C3 12.34 4.34 11 6 11H18C19.66 11 21 12.34 21 14V20"/><path d="M3 11V7C3 5.9 3.9 5 5 5H9C10.1 5 11 5.9 11 7V11"/><path d="M2 20H22"/><circle cx="7" cy="8" r="2"/></svg>',
    poltrona: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11V7C5 4.79 6.79 3 9 3H15C17.21 3 19 4.79 19 7V11"/><path d="M3 14C3 12.9 3.9 12 5 12H19C20.1 12 21 12.9 21 14V16H3V14Z"/><path d="M5 16V20M19 16V20"/><path d="M3 16H21"/></svg>',
    ambulatorio: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21H21"/><path d="M5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21"/><path d="M9 21V17H15V21"/><path d="M10 7H14M12 5V9"/><rect x="9" y="11" width="6" height="4" rx="0.5"/></svg>'
  };
  var CLOSURE_CATS = [
    { v: 'manutenzione', l: 'Manutenzione' }, { v: 'ferie', l: 'Ferie' },
    { v: 'festivita', l: 'Festività' }, { v: 'emergenza', l: 'Emergenza' }, { v: 'altro', l: 'Altro' }
  ];
  var MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  var DOW_SHORT = ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'];
  var DEFAULT_SCHEDULE = JSON.stringify({
    1:{active:true,ranges:[['08:00','20:00']]},2:{active:true,ranges:[['08:00','20:00']]},
    3:{active:true,ranges:[['08:00','20:00']]},4:{active:true,ranges:[['08:00','20:00']]},
    5:{active:true,ranges:[['08:00','20:00']]},6:{active:false,ranges:[]},7:{active:false,ranges:[]}
  });
  var DAY_CFG_TABS = [
    { key: 'status', label: 'Stato', icon: 'ico-calendar' },
    { key: 'rooms', label: 'Postazioni', icon: 'ico-eye' }
  ];

  /* ── Helpers ────────────────────────────────────────────────── */
  function $(id) { return document.getElementById(id); }
  function esc(s) { if (s == null) return ''; var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

  var SVG_ICON_MAP = {
    'ico-chevron-left': SVG_NAV_LEFT,
    'ico-chevron-right': SVG_NAV_RIGHT,
    'ico-chevron-down': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9L12 15L18 9"/></svg>',
    'ico-add': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5V19M5 12H19"/></svg>',
    'ico-edit': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16.03 3.97L20.03 7.97M2 22L5.7 21.07C6.09 20.97 6.29 20.92 6.47 20.84L19 8.56C19.55 8.01 19.83 7.73 19.94 7.42C20.03 7.14 20.03 6.85 19.94 6.57C19.83 6.26 19.55 5.98 19 5.44L18.57 5C18.02 4.45 17.74 4.17 17.43 4.06C17.15 3.97 16.86 3.97 16.58 4.06C16.27 4.17 15.99 4.45 15.44 5L3.94 16.5L2 22Z"/></svg>',
    'ico-delete': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 5.5L18.87 15.39C18.7 18.05 18.61 19.38 18.03 20.37C17.52 21.24 16.74 21.91 15.82 22.26C14.78 22.66 13.45 22.66 10.79 22.66H10.21C7.55 22.66 6.22 22.66 5.18 22.26C4.26 21.91 3.48 21.24 2.97 20.37C2.39 19.38 2.3 18.05 2.13 15.39L1.5 5.5"/><path d="M21 5.5H0"/></svg>',
    'ico-close': '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6L18 18"/></svg>',
    'ico-settings': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15C19.2 15.3 19.1 15.7 19.2 16.1L19.7 18.1C19.8 18.4 19.6 18.7 19.3 18.9L17.4 20C17.1 20.2 16.7 20.1 16.5 19.8L15.3 18.2C15.1 17.9 14.7 17.7 14.3 17.7H9.7C9.3 17.7 8.9 17.9 8.7 18.2L7.5 19.8C7.3 20.1 6.9 20.2 6.6 20L4.7 18.9C4.4 18.7 4.2 18.4 4.3 18.1L4.8 16.1C4.9 15.7 4.8 15.3 4.6 15L2.6 12.4C2.4 12.2 2.4 11.8 2.6 11.6L4.6 9C4.8 8.7 4.9 8.3 4.8 7.9L4.3 5.9C4.2 5.6 4.4 5.3 4.7 5.1L6.6 4C6.9 3.8 7.3 3.9 7.5 4.2L8.7 5.8C8.9 6.1 9.3 6.3 9.7 6.3H14.3C14.7 6.3 15.1 6.1 15.3 5.8L16.5 4.2C16.7 3.9 17.1 3.8 17.4 4L19.3 5.1C19.6 5.3 19.8 5.6 19.7 5.9L19.2 7.9C19.1 8.3 19.2 8.7 19.4 9L21.4 11.6C21.6 11.8 21.6 12.2 21.4 12.4L19.4 15Z"/></svg>',
    'ico-hospital': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21H21"/><path d="M5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21"/><path d="M9 21V17H15V21"/><path d="M10 7H14M12 5V9"/><rect x="9" y="11" width="6" height="4" rx="0.5"/></svg>',
    'ico-eye': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 12 5 5 12 5C19 5 22 12 22 12C22 12 19 19 12 19C5 19 2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    'ico-eye-off': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88C9.33 10.43 9 11.18 9 12C9 13.66 10.34 15 12 15C12.82 15 13.57 14.67 14.12 14.12"/><path d="M3 3L21 21"/><path d="M10.73 5.08C11.15 5.03 11.57 5 12 5C19 5 22 12 22 12C22 12 21.18 13.64 19.76 15.24"/><path d="M6.61 6.61C4.62 8.13 3.18 10.22 2 12C2 12 5 19 12 19C13.83 19 15.46 18.5 16.86 17.72"/></svg>',
    'ico-today': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/></svg>',
    'ico-stethoscope': SVG_STETHOSCOPE,
    'ico-calendar': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10H21"/><path d="M8 2V6M16 2V6"/></svg>',
    'ico-clipboard': SVG_CLIPBOARD,
    'ico-list': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01"/></svg>'
  };

  function tpl(id) { return SVG_ICON_MAP[id] || ''; }
  function hgi(cls) { return '<i class="hgi-stroke ' + cls + '"></i>'; }
  function fmtDate(d) { return d.toISOString().slice(0, 10); }
  function toMin(t) { var p = t.split(':').map(Number); return p[0] * 60 + p[1]; }
  function toTime(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function injectIcon(el, t) { var e = $(el), svg = SVG_ICON_MAP[t]; if (e && svg) e.innerHTML = svg; }
  function getAncestorIds(n) {
    var ids = [], cur = n;
    while (cur.parent_id) { ids.push(cur.parent_id); cur = Ag.state.nodeMap[cur.parent_id]; if (!cur) break; }
    return ids;
  }

  /* ── Public API ────────────────────────────────────────────── */
  Ag.Config = Object.freeze({
    API_BASE: API_BASE, DAY_START: DAY_START, DAY_END: DAY_END, SLOT_MIN: SLOT_MIN,
    API_TIMEOUT: API_TIMEOUT, DURATIONS: DURATIONS, HGI_MAP: HGI_MAP, STATUS_ICO: STATUS_ICO,
    STATUS_SVG: STATUS_SVG, SVG_CALENDAR_EMPTY: SVG_CALENDAR_EMPTY, SVG_CALENDAR_REMOVE: SVG_CALENDAR_REMOVE,
    SVG_STETHOSCOPE: SVG_STETHOSCOPE, SVG_INJECTION: SVG_INJECTION, SVG_CLIPBOARD: SVG_CLIPBOARD,
    TYPE_SVG: TYPE_SVG, SVG_PATIENT: SVG_PATIENT, SVG_CLOCK: SVG_CLOCK, SVG_CF: SVG_CF,
    SVG_DURATION: SVG_DURATION, SVG_TITLE: SVG_TITLE, SVG_NAV_LEFT: SVG_NAV_LEFT, SVG_NAV_RIGHT: SVG_NAV_RIGHT,
    TYPE_LABELS_IT: TYPE_LABELS_IT, TP_COLORS: TP_COLORS, TYPE_COLORS: TYPE_COLORS,
    TYPE_LABELS: TYPE_LABELS, TYPE_CHILD: TYPE_CHILD, STATION_ICONS: STATION_ICONS,
    CLOSURE_CATS: CLOSURE_CATS, MESI: MESI, DOW_SHORT: DOW_SHORT,
    DEFAULT_SCHEDULE: DEFAULT_SCHEDULE, DAY_CFG_TABS: DAY_CFG_TABS,
    $: $, esc: esc, tpl: tpl, hgi: hgi, fmtDate: fmtDate, toMin: toMin, toTime: toTime,
    injectIcon: injectIcon, getAncestorIds: getAncestorIds
  });

  /* ── Expose globals needed by HTML onclick handlers ────────── */
  global.agFmtDate = fmtDate;

})(window);
