/*! fl-therapy-core.js â€” Follicular Lymphoma Therapeutic Engine (zero DOM)
 *  Espone: window.FLTherapyCore
 *  Registra: LumiaAPI.therapy.fl   (se LumiaAPI presente)
 *  Pattern: IIFE su window
 */
(function attachFLTherapyCore(global) {
  'use strict';

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  DATASETS
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  const GENETICS = Object.freeze([
    't(14;18)/IGH::BCL2',
    'BCL2 overexpression',
    'EZH2 mutato',
    'TP53 mutato/deleto',
    'TNFRSF14 alterato (1p36)',
    'CREBBP mutato',
    'KMT2D mutato',
    'MYC riarrangiato (raro / trasformazione?)'
  ]);

  const MOLECULAR_RESIST = Object.freeze([
    'POD24 (progressione <24 mesi da 1L)',
    'RefrattarietÃ  anti-CD20',
    'RefrattarietÃ  lenalidomide',
    'RefrattarietÃ  alchilanti',
    'Trasformazione istologica sospetta/diagnosticata'
  ]);

  const SCORE_DEFS = Object.freeze({
    FLIPI: {
      desc: 'Age >60, Stadio IIIâ€“IV, Hb <12 g/dL, LDH alto, >4 stazioni linfonodali',
      items: [
        { key: 'age_gt60',  label: 'EtÃ  > 60 anni',           type: 'bool' },
        { key: 'stage_3_4', label: 'Stadio Ann Arbor IIIâ€“IV',  type: 'bool' },
        { key: 'hb_lt12',   label: 'Emoglobina < 12 g/dL',    type: 'bool' },
        { key: 'ldh_high',  label: 'LDH elevato',             type: 'bool' },
        { key: 'nodes_gt4', label: '> 4 aree linfonodali',    type: 'bool' }
      ],
      calc: v => (v.age_gt60 + v.stage_3_4 + v.hb_lt12 + v.ldh_high + v.nodes_gt4)
    },
    FLIPI2: {
      desc: 'Age >60, Î²2M >ULN, midollo positivo, Hb <12, LN >6 cm',
      items: [
        { key: 'age_gt60', label: 'EtÃ  > 60 anni',                type: 'bool' },
        { key: 'b2m_high', label: 'Î²2-microglobulina > ULN',     type: 'bool' },
        { key: 'bm_pos',   label: 'Infiltrazione midollare',      type: 'bool' },
        { key: 'hb_lt12',  label: 'Emoglobina < 12 g/dL',        type: 'bool' },
        { key: 'ln_gt6',   label: 'Linfonodo > 6 cm',            type: 'bool' }
      ],
      calc: v => (v.age_gt60 + v.b2m_high + v.bm_pos + v.hb_lt12 + v.ln_gt6)
    },
    PRIMA_PI: {
      desc: 'Î²2-microglobulina e infiltrazione midollare (Low/Intermediate/High)',
      items: [
        { key: 'b2m_high', label: 'Î²2-microglobulina > ULN', type: 'bool' },
        { key: 'bm_pos',   label: 'Infiltrazione midollare',  type: 'bool' }
      ],
      calc: v => (v.b2m_high && v.bm_pos) ? 2 : (v.b2m_high || v.bm_pos) ? 1 : 0
    }
  });

  const INDICAZIONI_GELF = Object.freeze([
    'Massa > 7 cm',
    'â‰¥3 sedi > 3 cm',
    'Sintomi B',
    'Compressione d\'organo / ostruzione',
    'Versamenti (pleurico/pericardico/peritoneale) da malattia',
    'Cito-penie da infiltrazione',
    'Splenomegalia sintomatica',
    'Leucemizzazione significativa'
  ]);

  const REGIMEN_LIST = Object.freeze([
    'Watch & Wait',
    'BR (bendamustina+rituximab)',
    'R-CHOP',
    'R-CVP',
    'G-benda (obinutuzumab+bendamustina)',
    'G-CHOP',
    'G-CVP',
    'R2 (rituximab+lenalidomide)',
    'Mosunetuzumab (Lunsumio)',
    'Axicabtagene ciloleucel (Yescarta)',
    'Lisocabtagene maraleucel (Breyanzi)',
    'Tazemetostat (EZH2 mutato) *verifica AIFA*'
  ]);

  const RESPONSES = Object.freeze(['CR', 'PR', 'SD', 'PD', 'Intolleranza/AE', 'Sconosciuta']);

  /* Gating AIFA */
  const GATE = Object.freeze({
    MOSUN:  { aifa: true,  minLine: 2 },
    AXICEL: { aifa: true,  minLine: 3 },
    LISO:   { aifa: true,  minLine: 2, only3B: true },
    TAZE:   { aifa: false, minLine: 2 }
  });

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Score calculator
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function calcScore(name, vals) {
    const def = SCORE_DEFS[name];
    if (!def) return null;
    const boolVals = {};
    def.items.forEach(it => { boolVals[it.key] = vals[it.key] ? 1 : 0; });
    const value = def.calc(boolVals);
    const detail = Object.keys(boolVals).filter(k => boolVals[k]).join(', ') || '0 criteri';
    return { name, value, detail };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  compute(state) â†’ { recommendations: [] }
   *  state: {
   *    genetics:    [{key, note?}],
   *    molecular:   [{key, note?}],
   *    scores:      [{name, value, detail}],
   *    priorTx:     [{regimen, line, response}],
   *    indications: string[]
   *  }
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function compute(state) {
    const out = [];
    const gen   = state.genetics || [];
    const mol   = state.molecular || [];
    const prior = state.priorTx || [];
    const inds  = state.indications || [];

    const has = (key, arr) => arr.some(x => x.key === key);
    const anyInd  = inds.length > 0;
    const maxLine = prior.reduce((m, p) => Math.max(m, p.line || 1), 0) || 0;
    const lineNow = maxLine + 1;

    const is3B = has('Trasformazione istologica sospetta/diagnosticata', mol) ||
                 gen.some(x => /3B|grade\s*3B/i.test(x.note || ''));
    const isPOD24  = has('POD24 (progressione <24 mesi da 1L)', mol);
    const isEZH2m  = has('EZH2 mutato', gen);
    const isP53    = has('TP53 mutato/deleto', gen);
    const isCD20R  = has('RefrattarietÃ  anti-CD20', mol);

    const heavy = isPOD24 ? 2 : 0;
    const anti20pen = isCD20R ? -2 : 0;

    /* 0) Watch & Wait */
    if (lineNow === 1 && !anyInd) {
      out.push({ name: 'Watch & Wait', cls: 'osservazione', aifa: true, score: 8,
        notes: ['Basso carico / assenza criteri GELF'] });
    }

    /* 3B â†’ pathway DLBCL */
    if (is3B) {
      out.push({ name: 'Gestione come DLBCL (FL3B)', cls: 'aggressivo', aifa: true, score: 9,
        notes: ['FL grado 3B: strategia tipo DLBCL (CHOP-like Â± anti-CD20)'] });
    }

    /* 1) Prima linea GELF + grade 1-3A */
    if (lineNow === 1 && anyInd && !is3B) {
      const base = 7 + (isP53 ? -1 : 0);
      out.push({ name: 'BR (bendamustina+rituximab)',       cls: 'chemoimmuno', aifa: true, score: base + 2, notes: ['1L standard; valutare mantenimento R'] });
      out.push({ name: 'G-benda (obinutuzumab+bendamustina)', cls: 'chemoimmuno', aifa: true, score: base + 1, notes: ['Alternativa a BR; mantenimento G'] });
      out.push({ name: 'R-CHOP',                             cls: 'chemoimmuno', aifa: true, score: base,     notes: ['Se sospetta componente trasformativa'] });
      out.push({ name: 'R-CVP',                              cls: 'chemoimmuno', aifa: true, score: base - 1, notes: ['Opzione meno intensiva'] });
      out.push({ name: 'R2 (rituximab+lenalidomide)',        cls: 'chemo-free',  aifa: true, score: base,     notes: ['Chemo-sparing; rischio trombotico'] });
    }

    /* 2) â‰¥ 2L */
    if (lineNow >= 2) {
      if (!isCD20R) {
        out.push({ name: 'R2 (rituximab+lenalidomide)',   cls: 'chemo-free',   aifa: true, score: 7 + heavy,     notes: ['Re-challenge anti-CD20 possibile'] });
        out.push({ name: 'BR (bendamustina+rituximab)',   cls: 'chemoimmuno',  aifa: true, score: 7 + heavy,     notes: ['Se non impiegato in 1L'] });
        out.push({ name: 'G-based (G-benda/G-CHOP/G-CVP)', cls: 'chemoimmuno', aifa: true, score: 6 + heavy,   notes: ['Switch anti-CD20'] });
      } else {
        out.push({ name: 'Regimi senza anti-CD20 / switch G', cls: 'chemoimmuno', aifa: true, score: 5 + heavy + anti20pen, notes: ['RefrattarietÃ  anti-CD20'] });
      }

      if (isEZH2m) {
        out.push({ name: 'Tazemetostat (EZH2 mut)', cls: 'targeted', aifa: false, score: 7, notes: ['EZH2-mut R/R; verifica AIFA locale'] });
      }

      if (lineNow >= GATE.MOSUN.minLine) {
        out.push({ name: 'Mosunetuzumab (Lunsumio)', cls: 'bispecific', aifa: true, score: 8 + heavy, notes: [`Rimborsato â‰¥${GATE.MOSUN.minLine}L; CRS/ICANS`] });
      }
      if (lineNow >= GATE.AXICEL.minLine) {
        out.push({ name: 'Axicabtagene ciloleucel (Yescarta)', cls: 'CAR-T', aifa: true, score: 9 + heavy, notes: [`Rimborsato â‰¥${GATE.AXICEL.minLine}L; centro accreditato`] });
      }
      if (is3B && lineNow >= GATE.LISO.minLine) {
        out.push({ name: 'Lisocabtagene maraleucel (Breyanzi) â€” FL3B', cls: 'CAR-T', aifa: true, score: 8 + heavy, notes: ['FL3B; verificare centro'] });
      }
    }

    out.sort((a, b) => b.score - a.score);
    return { recommendations: out };
  }

  /* â”€â”€ Public API â”€â”€ */
  const engine = {
    compute,
    calcScore,
    genetics()       { return GENETICS; },
    molecular()      { return MOLECULAR_RESIST; },
    scoreDefs()      { return SCORE_DEFS; },
    gelfFlags()      { return INDICAZIONI_GELF; },
    regimenList()    { return REGIMEN_LIST; },
    responses()      { return RESPONSES; }
  };

  global.FLTherapyCore = Object.freeze(engine);

  try {
    const api = global.LumiaAPI;
    if (api && typeof api.registerTherapy === 'function') api.registerTherapy('fl', engine);
  } catch (_) {}

})(window);
