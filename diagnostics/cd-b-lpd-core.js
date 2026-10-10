/*! cd-b-lpd-core.js â€” CD-Based B-LPD Diagnostic Engine (zero DOM)
 *  Espone: window.CDBLPDCore
 *  Richiede: window.CDBLPDData (cd-b-lpd-data.js)
 *  Registra: LumiaAPI.diagnostics.bLPD
 *            LumiaAPI.markers.registerPanel('bLPD', ALL_MARKERS)
 *  Pattern: IIFE su window
 *
 *  v2 â€” Consuma MARKER_TABLE da CDBLPDData; genera RULES automaticamente.
 *
 *  API (invariata):
 *    CDBLPDCore.markers()     â†’ string[]
 *    CDBLPDCore.states()      â†’ {key,label}[]
 *    CDBLPDCore.diagnoses()   â†’ string[]
 *    CDBLPDCore.rules()       â†’ object (frozen copy)
 *    CDBLPDCore.compute(selections) â†’ {entries, all}
 *      selections: [{marker, state, note?}]
 *      entries:    [{diagnosis, score, pct, matches:string[], conflicts:string[]}]  (score>0, sorted desc)
 *      all:        [{diagnosis, score, ...}]  (tutti, sorted desc)
 */
(function attachCDBLPDCore(global) {
  'use strict';

  /* â”€â”€ Data dependency â”€â”€ */
  var Data = global.CDBLPDData;
  if (!Data) throw new Error('cd-b-lpd-core: CDBLPDData not loaded (load cd-b-lpd-data.js first)');

  /* â”€â”€ States â”€â”€ */
  const STATES = Object.freeze([
    { key: 'pos', label: 'Positivo' },
    { key: 'neg', label: 'Negativo' },
    { key: 'dim', label: 'Dim' },
    { key: 'br',  label: 'Bright' },
    { key: 'nt',  label: 'Non testato' }
  ]);

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Derive RULES from MARKER_TABLE
   *
   *  Per ogni disease, per ogni marker con weight !== 0:
   *    rule[marker][typical] = weight
   *    Varianti aggiuntive: espressioni non-typical con peso ridotto
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  var table = Data.table();              // deep copy
  var ALL_MARKERS = Data.markerKeys;     // frozen string[]
  var ALL_DISEASES = Data.diseaseKeys;   // frozen string[]

  function buildRules() {
    var rules = {};

    for (var d = 0; d < ALL_DISEASES.length; d++) {
      var disease = ALL_DISEASES[d];
      var rule = {};

      for (var m = 0; m < ALL_MARKERS.length; m++) {
        var marker = ALL_MARKERS[m];
        var entry = table[marker] && table[marker].diseases[disease];
        if (!entry || entry.weight === 0) continue;

        var stateMap = {};
        var typical = entry.typical;
        var w = entry.weight;

        // Typical expression: full weight
        stateMap[typical] = w;

        // Additional expression variants: reduced weight
        for (var e = 0; e < entry.expr.length; e++) {
          var alt = entry.expr[e];
          if (alt === typical || alt === 'var' || alt === 'nt') continue;
          if (stateMap[alt] != null) continue;

          // Positive-group expressions get slightly lower weight
          if (w > 0) {
            stateMap[alt] = Math.max(1, Math.round(w * 0.6));
          } else {
            // Negative-weight markers: alternatives get slightly less penalty
            stateMap[alt] = Math.min(-1, Math.round(w * 0.6));
          }
        }

        rule[marker] = stateMap;
      }

      rules[disease] = rule;
    }

    return Object.freeze(rules);
  }

  var RULES = buildRules();

  /* â”€â”€ Scoring helpers â”€â”€ */
  var POS_FALLBACK   = 0.5;
  var NEG_STRONG_PEN = -1.5;

  function isPosState(s) { return s === 'pos' || s === 'br' || s === 'dim'; }

  function fallbackDifferential(expect, seen) {
    if (isPosState(seen)) {
      if ('neg' in expect) {
        return expect.neg >= 2 ? -1 : 0;
      }
      return POS_FALLBACK;
    }
    if (seen === 'neg') {
      if (expect.pos || expect.br) return NEG_STRONG_PEN;
    }
    return 0;
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  compute(selections)
   *  selections: [{marker: string, state: string, note?: string}]
   *  returns { entries, all }
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function compute(selections) {
    if (!Array.isArray(selections) || selections.length === 0) {
      return { entries: [], all: [] };
    }

    var provided = {};
    for (var i = 0; i < selections.length; i++) {
      provided[selections[i].marker] = selections[i].state;
    }

    var allResults = [];
    var diagKeys = Object.keys(RULES);

    for (var d = 0; d < diagKeys.length; d++) {
      var diag = diagKeys[d];
      var score = 0;
      var matches = [];
      var conflicts = [];
      var rule = RULES[diag];
      var markers = Object.keys(rule);

      for (var m = 0; m < markers.length; m++) {
        var marker = markers[m];
        var expect = rule[marker];
        var seen = provided[marker];
        if (!seen || seen === 'nt') continue;

        // Direct match
        if (expect[seen] != null) {
          score += expect[seen];
          if (expect[seen] > 0)  matches.push(marker + '=' + seen);
          if (expect[seen] < 0)  conflicts.push(marker + '=' + seen);
          continue;
        }

        // Approximate state matches
        if (seen === 'dim' && expect.pos) {
          score += Math.min(expect.pos, 1);
          matches.push(marker + '=dim\u2248pos');
          continue;
        }
        if (seen === 'pos' && expect.br)  { score += 1; matches.push(marker + '=pos\u2248br');  continue; }
        if (seen === 'br'  && expect.pos) { score += expect.pos; matches.push(marker + '=br\u2265pos'); continue; }
        if (seen === 'pos' && expect.neg) { score -= 1; conflicts.push(marker + '=pos vs neg atteso'); continue; }
        if (seen === 'neg' && (expect.pos || expect.br)) { score -= 2; conflicts.push(marker + '=neg vs pos/br atteso'); continue; }

        // Fallback
        var fb = fallbackDifferential(expect, seen);
        if (fb !== 0) {
          score += fb;
          if (fb > 0) matches.push(marker + '=' + seen + ' (fallback)');
          else conflicts.push(marker + '=' + seen + ' (fallback)');
        }
      }

      allResults.push({ diagnosis: diag, score: score, matches: matches, conflicts: conflicts });
    }

    allResults.sort(function(a, b) { return b.score - a.score; });

    var positives = allResults.filter(function(e) { return e.score > 0; });
    var max = positives.length > 0 ? Math.max.apply(null, positives.map(function(e) { return e.score; })) : 1;
    var entries = positives.map(function(e) {
      return {
        diagnosis: e.diagnosis,
        score:     e.score,
        pct:       Math.max(1, Math.round((e.score / max) * 100)),
        matches:   e.matches,
        conflicts: e.conflicts
      };
    });

    return { entries: entries, all: allResults };
  }

  /* â”€â”€ Public API â”€â”€ */
  var engine = {
    compute:    compute,
    markers:    function() { return Data.markers(); },
    states:     function() { return STATES; },
    diagnoses:  function() { return Object.keys(RULES); },
    rules:      function() { return JSON.parse(JSON.stringify(RULES)); },
    data:       Data   // accesso diretto alla tabella marker-disease
  };

  global.CDBLPDCore = Object.freeze(engine);

  /* â”€â”€ Register on LumiaAPI â”€â”€ */
  try {
    var api = global.LumiaAPI;
    if (api) {
      if (typeof api.registerDiagnostic === 'function') api.registerDiagnostic('bLPD', engine);
      if (api.markers && typeof api.markers.registerPanel === 'function') api.markers.registerPanel('bLPD', ALL_MARKERS);
    }
  } catch (_) {}

})(window);
