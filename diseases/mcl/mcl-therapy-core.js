/* =======================================================================
 *  MCLTherapyCore â€” Mantle-Cell Lymphoma (MCL) pure engine
 *  Zero DOM, zero side-effects.  Frozen data + compute(state).
 *  Registra su LumiaAPI.therapy.mcl
 * ======================================================================= */
(function (global) {
  'use strict';

  /* ==================== DATA ==================== */

  const GENETICS = Object.freeze([
    't(11;14)/IGH::CCND1',
    'SOX11 negativo (nota: fenotipo indolente/non-nodale)',
    'TP53 mutato/deleto (17p-)',
    'ATM alterato',
    'NOTCH1/NOTCH2 mutati',
    'KMT2D/CREBBP mutati',
    'CDKN2A perdita',
    'MYC riarrangiato (blastoid/pleomorphic?)'
  ]);

  const MOLECULAR = Object.freeze([
    'Ki-67 \u2265 30%',
    'Variante blastoid/pleomorphic',
    'Fenotipo indolente non-nodale',
    'BTK C481 mutazione (resistenza BTKi covalenti)',
    'PLCG2 attivante (resistenza BTKi)',
    'Intolleranza BTKi',
    'CNS coinvolgimento/rischio elevato'
  ]);

  const SCORE_DEFS = Object.freeze({
    'S-MIPI': {
      desc: 'Semplificato: Et\u00e0, ECOG, LDH (ULN), WBC.',
      items: Object.freeze([
        { key: 'age',  label: 'Et\u00e0',           type: 'select', opts: ['\u226460', '61\u201370', '>70'],   val: [0, 1, 2] },
        { key: 'ecog', label: 'ECOG PS',          type: 'select', opts: ['0\u20131', '2\u20134'],             val: [0, 1]    },
        { key: 'ldh',  label: 'LDH',              type: 'select', opts: ['\u2264 ULN', '> ULN'],            val: [0, 1]    },
        { key: 'wbc',  label: 'WBC (x10^9/L)',    type: 'select', opts: ['< 6.7', '6.7\u20139.9', '\u2265 10'], val: [0, 1, 2] }
      ]),
      calc: function (v) { return v.age + v.ecog + v.ldh + v.wbc; },
      risk: function (s) { return s <= 3 ? 'Basso' : (s <= 5 ? 'Intermedio' : 'Alto'); }
    },
    'MIPI-b (Ki-67)': {
      desc: 'S-MIPI + Ki-67 \u226530% "penalizza" di 1 classe.',
      items: Object.freeze([
        { key: 'smipi_val', label: 'S-MIPI (riporta il punteggio calcolato)', type: 'number', min: 0, max: 6, placeholder: '0\u20136' },
        { key: 'ki67',      label: 'Ki-67 \u2265 30%',                        type: 'bool' }
      ]),
      calc: function (v) {
        var base = Number(v.smipi_val || 0);
        var cls = base <= 3 ? 0 : (base <= 5 ? 1 : 2);
        if (v.ki67) cls = Math.min(2, cls + 1);
        return cls;
      },
      riskFromVal: function (c) { return c === 0 ? 'Basso' : (c === 1 ? 'Intermedio' : 'Alto'); }
    }
  });

  const REGIMENS = Object.freeze([
    'R-CHOP/R-DHAP (alternati) \u00b1 ASCT',
    'Nordic (Maxi-CHOP + HD-AraC) \u00b1 ASCT',
    'BR (bendamustina+rituximab)',
    'R-BAC (rituximab+bendamustina+citarabina)',
    'R-CHOP',
    'R-CVP',
    'Ibrutinib',
    'Acalabrutinib',
    'Zanubrutinib',
    'Pirtobrutinib',
    'Lenalidomide+Rituximab (R2)',
    'Bortezomib-based',
    'Brexucabtagene autoleucel (Tecartus)',
    'Rituximab mantenimento',
    'ASCT (consolidamento)',
    'Allo-SCT (selezionati)'
  ]);

  const RESPONSES = Object.freeze(['CR', 'PR', 'SD', 'PD', 'Intolleranza/AE', 'Sconosciuta']);

  const CONTEXT_FLAGS = Object.freeze([
    'Candidato a trapianto autologo (ASCT-eligible)',
    'Non candidato a trapianto (unfit/fragile)',
    'Sintomatico/indicazione a trattamento',
    'Asintomatico (considera watch & wait se indolente)',
    'Fallimento BTKi precedente',
    'Precedente BTKi ma sospeso per intolleranza',
    'Sospetto/accertato coinvolgimento SNC'
  ]);

  /* ==================== GATE AIFA ==================== */

  const GATE = Object.freeze({
    IBRUT: { aifa: true,  note: 'rimb. MCL R/R' },
    ACALA: { aifa: false, note: 'verifica AIFA locale (MCL)' },
    ZANU:  { aifa: false, note: 'verifica AIFA locale (MCL)' },
    PIRTO: { aifa: true,  afterBTKi: true, note: 'rimb. dopo BTKi' },
    BREXU: { aifa: true,  minLine: 3, needBTKi: true, note: 'CAR-T \u22652 linee incl. BTKi' }
  });

  /* ==================== SCORE CALCULATORS ==================== */

  /**
   * Compute a named score from raw values.
   * @param {string} name  â€“ key in SCORE_DEFS
   * @param {Object} vals  â€“ { key: numericOrBool, ... }
   * @returns {{ name, value, display, detail, risk }}
   */
  function computeScore(name, vals) {
    var def = SCORE_DEFS[name];
    if (!def) return null;
    var value = def.calc(vals);

    if (name === 'S-MIPI') {
      var risk = def.risk(value);
      return {
        name: name,
        value: value,
        display: value + ' (' + risk + ')',
        detail: Object.entries(vals).map(function (e) { return e[0] + '=' + e[1]; }).join(', '),
        risk: risk
      };
    }
    if (name === 'MIPI-b (Ki-67)') {
      var riskB = def.riskFromVal(value);
      return {
        name: name,
        value: value,
        display: riskB,
        detail: 'classe=' + value + ', Ki-67=' + (vals.ki67 ? '\u226530%' : '<30%') + ', S-MIPI=' + (vals.smipi_val || 0),
        risk: riskB
      };
    }
    return { name: name, value: value, display: String(value), detail: '', risk: undefined };
  }

  /* ==================== HELPERS ==================== */

  function has(key, arr) { return arr.some(function (x) { return x.key === key; }); }

  function maxLine(priorTx) {
    return priorTx.reduce(function (m, p) { return Math.max(m, p.line || 1); }, 0) || 0;
  }

  function btkiUsed(priorTx) {
    return priorTx.some(function (p) { return /ibrutinib|acalabrutinib|zanubrutinib/i.test(p.regimen); });
  }

  function btkiFailed(st) {
    return st.context.includes('Fallimento BTKi precedente') ||
      st.priorTx.some(function (p) {
        return /ibrutinib|acalabrutinib|zanubrutinib/i.test(p.regimen) && /PD|SD/i.test(p.response || '');
      });
  }

  function btkiIntolerant(st) {
    return st.context.includes('Precedente BTKi ma sospeso per intolleranza') ||
      st.priorTx.some(function (p) {
        return /ibrutinib|acalabrutinib|zanubrutinib/i.test(p.regimen) && /Intolleranza/i.test(p.response || '');
      });
  }

  function indolent(st) {
    return has('Fenotipo indolente non-nodale', st.molecular) ||
      has('SOX11 negativo (nota: fenotipo indolente/non-nodale)', st.genetics);
  }

  function highRisk(st) {
    return has('TP53 mutato/deleto (17p-)', st.genetics) ||
      has('Variante blastoid/pleomorphic', st.molecular) ||
      has('Ki-67 \u2265 30%', st.molecular);
  }

  function cnsRisk(st) {
    return has('CNS coinvolgimento/rischio elevato', st.molecular) ||
      st.context.includes('Sospetto/accertato coinvolgimento SNC');
  }

  /* ==================== ENGINE ==================== */

  /**
   * Main recommendation engine.
   * @param {{ genetics:Array, molecular:Array, scores:Array, priorTx:Array, context:Array }} state
   * @returns {{ recommendations:Array<{name,class,aifa,score,notes}>, watchAndWait:boolean }}
   */
  function compute(state) {
    var st = {
      genetics:  Array.isArray(state.genetics)  ? state.genetics  : [],
      molecular: Array.isArray(state.molecular) ? state.molecular : [],
      scores:    Array.isArray(state.scores)    ? state.scores    : [],
      priorTx:   Array.isArray(state.priorTx)   ? state.priorTx   : [],
      context:   Array.isArray(state.context)   ? state.context   : []
    };

    var ctxHas = function (k) { return st.context.includes(k); };
    var out = [];
    var lineNow = maxLine(st.priorTx) + 1;
    var needTx  = ctxHas('Sintomatico/indicazione a trattamento');
    var fitASCT = ctxHas('Candidato a trapianto autologo (ASCT-eligible)');
    var unfit   = ctxHas('Non candidato a trapianto (unfit/fragile)');
    var ww = false;

    /* ---------- 0) Watch & Wait ---------- */
    if (lineNow === 1 && !needTx && indolent(st)) {
      out.push({
        name: 'Watch & Wait', class: 'osservazione', aifa: true, score: 9,
        notes: ['Forma indolente/non-nodale SOX11-neg; monitoraggio attivo']
      });
      ww = true;
    }

    /* ---------- 1) Prima linea ---------- */
    if (lineNow === 1 && needTx) {
      // Fit / ASCT
      if (fitASCT && !indolent(st)) {
        var base = 8;
        if (highRisk(st)) base -= 1;
        out.push({
          name: 'R-CHOP/R-DHAP (alternati) + ASCT + mantenimento R',
          class: 'citarabina+ASCT', aifa: true, score: base + 2,
          notes: ['Standard intensivo nei pazienti eleggibili; consolidamento con ASCT; mantenimento rituximab raccomandato']
        });
        out.push({
          name: 'Nordic (Maxi-CHOP + HD-AraC) \u00b1 ASCT',
          class: 'citarabina\u00b1ASCT', aifa: true, score: base + 1,
          notes: ['Schema alternativo citarabina-intensivo nei fit']
        });
      }
      // Unfit / anziani
      if (unfit || indolent(st)) {
        var baseU = 7;
        if (highRisk(st)) baseU -= 1;
        out.push({
          name: 'BR (bendamustina+rituximab)', class: 'chemoimmuno', aifa: true, score: baseU + 1,
          notes: ['1\u00aa linea negli unfit; valutare mantenimento R']
        });
        out.push({
          name: 'R-BAC (rituximab+bendamustina+citarabina)', class: 'chemoimmuno', aifa: true, score: baseU,
          notes: ['Opzione intensiva per anziani/fit selezionati; attenzione a mielotossicit\u00e0']
        });
        out.push({
          name: 'R-CHOP / R-CVP', class: 'chemoimmuno', aifa: true, score: baseU - 1,
          notes: ['Alternative meno intensiva; risposta pi\u00f9 rapida vs BR in alcune situazioni']
        });
      }
      // Alto rischio â†’ target/Trial
      if (highRisk(st)) {
        out.push({
          name: 'BTKi-based (off-label 1L in Italia) / arruolamento in studio',
          class: 'target', aifa: false, score: 6,
          notes: ['TP53/blastoid: chemo-resistenza; preferire trial o strategie BTKi-based dove consentito']
        });
      }
    }

    /* ---------- 2) Linee successive (\u22652L) ---------- */
    if (lineNow >= 2) {
      var afterBTKi   = btkiUsed(st.priorTx);
      var failedBTKi  = btkiFailed(st);
      var intolerBTKi = btkiIntolerant(st);

      // BTKi naive
      if (!afterBTKi) {
        out.push({ name: 'Ibrutinib',     class: 'BTKi', aifa: GATE.IBRUT.aifa, score: 9, notes: [GATE.IBRUT.note] });
        out.push({ name: 'Acalabrutinib', class: 'BTKi', aifa: GATE.ACALA.aifa, score: 7, notes: [GATE.ACALA.note] });
        out.push({ name: 'Zanubrutinib',  class: 'BTKi', aifa: GATE.ZANU.aifa,  score: 7, notes: [GATE.ZANU.note] });
      } else {
        // Post-BTKi
        if (failedBTKi || has('BTK C481 mutazione (resistenza BTKi covalenti)', st.molecular) || has('PLCG2 attivante (resistenza BTKi)', st.molecular)) {
          out.push({
            name: 'Pirtobrutinib (post-BTKi)', class: 'BTKi-noncovalent', aifa: GATE.PIRTO.aifa, score: 9,
            notes: [GATE.PIRTO.note]
          });
        } else if (intolerBTKi) {
          out.push({
            name: 'Switch BTKi alternativo (acalabrutinib/zanubrutinib)',
            class: 'BTKi', aifa: false, score: 7,
            notes: ['Intolleranza a un BTKi: valutare switch (verifica AIFA)']
          });
        }
        // CAR-T
        if (lineNow >= (GATE.BREXU.minLine || 3) && (failedBTKi || afterBTKi)) {
          out.push({
            name: 'Brexucabtagene autoleucel (Tecartus)', class: 'CAR-T', aifa: GATE.BREXU.aifa, score: 9,
            notes: [GATE.BREXU.note, 'Invio a centro accreditato; valutare bridging']
          });
        }
        // Other salvage
        out.push({ name: 'Lenalidomide+Rituximab (R2)', class: 'chemo-free',   aifa: true, score: 6, notes: ['Chemo-sparing; attenzione a citopenie/TEV'] });
        out.push({ name: 'Bortezomib-based',            class: 'targeted',     aifa: true, score: 6, notes: ['Opzione in recidiva; neuropatia cumulativa'] });
        out.push({ name: 'Re-challenge BR / R-BAC (se non gi\u00e0 impiegati e risposta duratura)', class: 'chemoimmuno', aifa: true, score: 5, notes: ['Valutare durata risposta precedente e fitness'] });
      }
    }

    /* ---------- CNS risk ---------- */
    if (cnsRisk(st)) {
      out.push({
        name: 'Profilassi/gestione SNC (HD-MTX; valutare schema dedicato)',
        class: 'CNS', aifa: true, score: 6,
        notes: ['Coinvolgimento o rischio SNC: percorso dedicato con team; imaging/LCR']
      });
    }

    out.sort(function (a, b) { return b.score - a.score; });

    return { recommendations: out, watchAndWait: ww };
  }

  /* ==================== PUBLIC API ==================== */

  var MCLTherapyCore = Object.freeze({
    GENETICS:      GENETICS,
    MOLECULAR:     MOLECULAR,
    SCORE_DEFS:    SCORE_DEFS,
    REGIMENS:      REGIMENS,
    RESPONSES:     RESPONSES,
    CONTEXT_FLAGS: CONTEXT_FLAGS,
    GATE:          GATE,
    computeScore:  computeScore,
    compute:       compute
  });

  global.MCLTherapyCore = MCLTherapyCore;

  /* Register on LumiaAPI if available */
  if (global.LumiaAPI && global.LumiaAPI.registerTherapy) {
    global.LumiaAPI.registerTherapy('mcl', {
      id:      'mcl-therapy',
      version: '2.0.0',
      compute: compute,
      computeScore: computeScore,
      data: { GENETICS: GENETICS, MOLECULAR: MOLECULAR, SCORE_DEFS: SCORE_DEFS, REGIMENS: REGIMENS, RESPONSES: RESPONSES, CONTEXT_FLAGS: CONTEXT_FLAGS, GATE: GATE }
    });
  }

})(window);
