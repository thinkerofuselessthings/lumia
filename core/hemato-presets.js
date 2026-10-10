/* =======================================================================
 *  HematoPresets — CD marker presets auto-generated from CDBLPDCore RULES
 *
 *  I preset vengono generati al DOMContentLoaded direttamente dalle regole
 *  diagnostiche in CDBLPDCore, così rimangono SEMPRE allineati ai dati reali.
 *  Per ogni diagnosi nelle RULES, il preset contiene i marker con lo stato
 *  che ottiene il punteggio più alto (è lo stato "atteso" per quella diagnosi).
 *
 *  Espone: window.HematoPresets
 *  Dipendenze: cd-b-lpd-core.js (CDBLPDCore)
 *
 *  API:
 *    HematoPresets.all()            → [{id, title, desc, category, markers:[{marker,state}]}]
 *    HematoPresets.byId(id)         → preset object
 *    HematoPresets.apply(id)        → loads into CDDiagnosticHelper + auto-computes
 *    HematoPresets.categories()     → string[]
 *    HematoPresets.byCategory(cat)  → presets[]
 * ======================================================================= */
(function (global) {
  'use strict';

  /* ═══════════════════════════════════════
   *  Category mapping — diagnosis name → category label
   * ═══════════════════════════════════════ */
  var CATEGORY_MAP = {
    'CLL/SLL':                                   'CLL',
    'MCL (classical/nodal)':                     'MCL',
    'MCL (leukemic non-nodal/indolent)':         'MCL',
    'MCL (CD5-negative variant)':                'MCL',
    'MCL (CyclinD1\u2212 / SOX11+)':            'MCL',
    'MCL (CyclinD1\u2212 / SOX11\u2212, non-nodal-like)': 'MCL',
    'HCL classica':                              'HCL',
    'HCL-variant':                               'HCL',
    'SMZL':                                      'MZL',
    'LPL/WM':                                    'Other',
    'SDRPL':                                     'Other',
    'FL (GC-type)':                              'FL',
    'DLBCL (Hans GCB)':                          'DLBCL',
    'DLBCL (Hans non-GCB)':                      'DLBCL',
    'DLBCL (double-expressor: evaluate DH/TH)':  'DLBCL',
    'DLBCL (pan-B)':                             'DLBCL',
    'BL':                                        'Other'
  };

  /* ═══════════════════════════════════════
   *  Build presets from CDBLPDCore RULES
   * ═══════════════════════════════════════ */
  var PRESETS = [];
  var BY_ID = {};
  var CATEGORIES = [];

  function slugify(name) {
    return name.toLowerCase()
      .replace(/[\s/()]+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** For a marker's rule object {pos:2, neg:-1, br:3, ...}
   *  return the state key that has the highest positive score.
   *  E.g. {pos:2, br:3, neg:-1} → 'br'    */
  function bestState(ruleObj) {
    var best = null, bestScore = -Infinity;
    Object.keys(ruleObj).forEach(function (st) {
      if (ruleObj[st] > bestScore) { bestScore = ruleObj[st]; best = st; }
    });
    return bestScore > 0 ? best : null;
  }

  function buildPresets() {
    var Core = global.CDBLPDCore;
    if (!Core) { console.warn('[hemato-presets] CDBLPDCore non disponibile — preset vuoti'); return; }
    var rules = Core.rules();

    Object.keys(rules).forEach(function (diagName) {
      var rule = rules[diagName];
      var markers = [];
      Object.keys(rule).forEach(function (marker) {
        var st = bestState(rule[marker]);
        if (st) markers.push({ marker: marker, state: st });
      });

      if (!markers.length) return;

      var id = slugify(diagName);
      var cat = CATEGORY_MAP[diagName] || 'Other';

      /* Build human-readable desc from markers */
      var desc = markers.map(function (m) {
        var stLabel = m.state === 'pos' ? '+' : m.state === 'neg' ? '\u2212' : m.state === 'br' ? 'bright' : m.state === 'dim' ? 'dim' : m.state;
        return m.marker + ' ' + stLabel;
      }).join(' \u00b7 ');

      var preset = {
        id:       id,
        title:    diagName,
        desc:     desc,
        category: cat,
        markers:  markers
      };
      PRESETS.push(preset);
      BY_ID[id] = preset;
    });

    /* Build unique category list preserving order */
    var catSet = {};
    PRESETS.forEach(function (p) {
      if (!catSet[p.category]) { CATEGORIES.push(p.category); catSet[p.category] = true; }
    });
  }

  /* ═══════════════════════════════════════
   *  apply(id) — load preset into CDDiagnosticHelper
   * ═══════════════════════════════════════ */
  function apply(id) {
    var p = BY_ID[id];
    if (!p) return false;
    var helper = global.CDDiagnosticHelper;
    if (!helper || typeof helper.setSelection !== 'function') {
      if (global.HematoToast) global.HematoToast.warning('CDDiagnosticHelper non disponibile');
      return false;
    }
    helper.setSelection(p.markers);

    /* Auto-open if not already open */
    if (typeof helper.open === 'function') helper.open();

    /* Auto-compute after DOM render */
    setTimeout(function () {
      var btn = document.getElementById('cd-compute');
      if (btn) btn.click();
    }, 150);

    if (global.HematoToast) global.HematoToast.info('Preset: ' + p.title);
    if (global.HematoEvents) global.HematoEvents.emit('preset:applied', { id: id, title: p.title });
    return true;
  }

  /* ── Public API ── */
  global.HematoPresets = Object.freeze({
    all:        function () { return PRESETS; },
    byId:       function (id) { return BY_ID[id] || null; },
    apply:      apply,
    categories: function () { return CATEGORIES.slice(); },
    byCategory: function (cat) { return PRESETS.filter(function (p) { return p.category === cat; }); }
  });

  /* Build presets once CDBLPDCore is available (after DOMContentLoaded with defer scripts) */
  document.addEventListener('DOMContentLoaded', function () { buildPresets(); });
})(window);
