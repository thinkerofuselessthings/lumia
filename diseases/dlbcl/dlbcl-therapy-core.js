/*! dlbcl-therapy-core.js â€” DLBCL Therapeutic Recommendation Engine (zero DOM)
 *  Espone: window.DLBCLTherapyCore
 *  Registra: LumiaAPI.therapy.dlbcl   (se LumiaAPI presente)
 *  Pattern: IIFE su window
 */
(function attachDLBCLTherapyCore(global) {
  'use strict';

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  DATASET
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  const GENETICS = Object.freeze([
    { key:'HGBL_DH_MYC_BCL2',       label:'HGBL double hit: MYC + BCL2 (riarr.)' },
    { key:'HGBL_DH_MYC_BCL6',       label:'HGBL double hit: MYC + BCL6 (riarr.)' },
    { key:'HGBL_TH_MYC_BCL2_BCL6',  label:'HGBL triple hit (MYC+BCL2+BCL6)' },
    { key:'MYC_rearr',              label:'Riarrangiamento MYC (FISH)' },
    { key:'BCL2_rearr',             label:'Riarrangiamento BCL2 (FISH)' },
    { key:'BCL6_rearr',             label:'Riarrangiamento BCL6 (FISH)' },
    { key:'MYC_overexp',            label:'MYC overexpression (IHC)' },
    { key:'BCL2_overexp',           label:'BCL2 overexpression (IHC)' },
    { key:'TP53_mut',               label:'TP53 mutazione' },
    { key:'CD5_pos',                label:'CD5+ DLBCL' },
    { key:'EBV_pos',                label:'DLBCL EBV-positivo' },
    { key:'PMBCL',                  label:'Linfoma B primitivo mediastinico (PMBCL)' },
    { key:'Transformed_FL',         label:'DLBCL da trasformazione di FL' }
  ]);

  const MUTATIONS = Object.freeze([
    { key:'CD19_loss',          label:'Perdita/CD19 negativo al rilievo attuale' },
    { key:'Anthracycline_contra', label:'Controindicazione alle antracicline (cardiopatia)' }
  ]);

  const SCORES = Object.freeze([
    { key:'ipi',     label:'IPI (International Prognostic Index)' },
    { key:'cns_ipi', label:'CNS-IPI (rischio recidiva SNC)' }
  ]);

  const CONTEXT_FLAGS = Object.freeze([
    'early_relapse (recidiva â‰¤ 12 mesi dalla 1L o refrattario)',
    'late_relapse (recidiva > 12 mesi)',
    'transplant_eligible',
    'transplant_ineligible',
    'cardiac_contra (antracicline controindicate)',
    'CNS_involvement'
  ]);

  const REGIMENS = Object.freeze({
    'R_CHOP': {
      name:'R-CHOP', type:'Chemi-immunoterapia standard 1L',
      lines:['1L'], aifa:true,
      dosing:'Rituximab + CHOP ogni 21 gg Ã— 6 cicli (Â± RT su bulky)',
      refs:['ESMO CPG']
    },
    'pola_R_CHP': {
      name:'Polatuzumab-R-CHP', type:'Anticorpo-farmaco + chemo 1L',
      lines:['1L'], aifa:true, aifa_note:'Indicazione AIFA: IPI 3â€“5 in 1L',
      gating:{ ipi_min:3 },
      dosing:'Polatuzumab + R-CHP Ã— 6 cicli',
      refs:['POLARIX; AIFA 12/2023']
    },
    'DA_R_EPOCH': {
      name:'DA-R-EPOCH', type:'Chemioterapia intensificata 1L',
      lines:['1L'], aifa:true,
      gating:{ for:['PMBCL','HGBL_DH_MYC_BCL2','HGBL_DH_MYC_BCL6','HGBL_TH_MYC_BCL2_BCL6'] },
      dosing:'Dose-adjusted R-EPOCH Ã— 6 cicli',
      refs:['ESMO; WHO/ICC']
    },
    'Salvage_ASCT': {
      name:'Salvage chemo + ASCT', type:'2L eleggibile a trapianto (late relapse)',
      lines:['2L'], aifa:true,
      dosing:'R-ICE/R-DHAP/R-GDP â†’ HDT/ASCT',
      refs:['ESMO']
    },
    'CAR_T_axi': {
      name:'CAR-T (axi-cel, 2L/3L)', type:'Terapia cellulare anti-CD19',
      lines:['2L','3L+'], aifa:true,
      gating:{ early_relapse:true },
      dosing:'Singola infusione dopo linfodeplezione',
      refs:['AIFA 2023 2L; ESMO']
    },
    'pola_BR': {
      name:'Polatuzumab + BR (pola-BR)', type:'Anticorpo-farmaco + chemo',
      lines:['2L','3L+'], aifa:true,
      dosing:'pola + BR (6 cicli)',
      refs:['GO29365; AIFA']
    },
    'tafa_len': {
      name:'Tafasitamab + Lenalidomide', type:'Anticorpo anti-CD19 + IMiD',
      lines:['2L','3L+'], aifa:true,
      dosing:'Len 12 cicli; tafasit. continuativo',
      refs:['L-MIND; AIFA 11/2022']
    },
    'loncastuximab': {
      name:'Loncastuximab tesirine (Zynlonta)', type:'ADC anti-CD19',
      lines:['3L+'], aifa:true,
      dosing:'Q3-W secondo RCP',
      refs:['AIFA 03/2024']
    },
    'glofitamab': {
      name:'Glofitamab', type:'Bispecifico CD20xCD3',
      lines:['3L+'], aifa:true,
      dosing:'Schema step-up dopo obi pre-dose',
      refs:['AIFA 03/2024']
    },
    'epcoritamab': {
      name:'Epcoritamab', type:'Bispecifico CD20xCD3',
      lines:['3L+'], aifa:true,
      dosing:'Iniezioni s.c. con step-up',
      refs:['AIFA 09/2024']
    }
  });

  const REGIMEN_DETAILS = Object.freeze({
    'R_CHOP':        { tox:'Mielosoppressione, cardiotossicitÃ  (doxo), neuropatia (vincr.).', studies:'Standard consolidato', src:'LG ESMO' },
    'pola_R_CHP':    { tox:'Neutropenia, neuropatia periferica, epatotossicitÃ .', studies:'POLARIX (PFS> vs R-CHOP)', src:'AIFA/EMA' },
    'DA_R_EPOCH':    { tox:'MielotossicitÃ , mucositi; gestione intensiva.', studies:'PMBCL e HGBL', src:'LG ESMO' },
    'Salvage_ASCT':  { tox:'TossicitÃ  da HDT; candidabilitÃ  da valutare.', studies:'Standard 2L late relapse', src:'LG' },
    'CAR_T_axi':     { tox:'CRS/ICANS; centro CAR-T abilitato.', studies:'ZUMA-7 2L', src:'AIFA/ESMO' },
    'pola_BR':       { tox:'Mielosoppressione, neuropatia.', studies:'GO29365', src:'RCP' },
    'tafa_len':      { tox:'Neutropenia, rash, diarrea.', studies:'L-MIND', src:'AIFA' },
    'loncastuximab': { tox:'MielotossicitÃ , epatotossicitÃ , fotosensibilitÃ .', studies:'LOTIS-2', src:'AIFA' },
    'glofitamab':    { tox:'CRS; ospedalizzazione allo start.', studies:'NP30179', src:'AIFA' },
    'epcoritamab':   { tox:'CRS (lieve-mod), iniezione s.c.', studies:'EPCORE-NHL-1', src:'AIFA' }
  });

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Score calculators
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function computeIPI({ age, ldh, ps, stage, extranodal }) {
    const b = v => v === true || v === 'yes';
    let s = 0;
    if (b(age))        s++;
    if (b(ldh))        s++;
    if (b(ps))         s++;
    if (b(stage))      s++;
    if (b(extranodal)) s++;
    const risk = s <= 1 ? 'Basso' : s === 2 ? 'Intermedio-basso' : s === 3 ? 'Intermedio-alto' : 'Alto';
    return { score: s, risk };
  }

  function computeCNSIPI({ age, ldh, stage, ps, extranodal, renal }) {
    const b = v => v === true || v === 'yes';
    let s = 0;
    [age, ldh, stage, ps, extranodal, renal].forEach(v => { if (b(v)) s++; });
    const risk = s <= 1 ? 'Basso' : s <= 3 ? 'Intermedio' : 'Alto';
    return { score: s, risk };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  compute(state) â†’ recommendations
   *  state: {
   *    genetics:  [{key, value}],
   *    mutations: [{key, value}],
   *    scores:    {ipi:{score,risk}, cns_ipi:{score,risk}},
   *    history:   [{regimenKey, line, response}],
   *    flags:     string[]
   *  }
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function compute(state) {
    const out = [];
    const g = Object.fromEntries((state.genetics || []).map(x => [x.key, x.value]));
    const m = Object.fromEntries((state.mutations || []).map(x => [x.key, x.value]));
    const flags = new Set(state.flags || []);
    const prior = state.history || [];
    const ipi = state.scores?.ipi?.score ?? null;

    const isFrontline  = !prior.some(p => p.line === '1L');
    const earlyRel     = [...flags].some(f => f.startsWith('early_relapse'));
    const lateRel      = [...flags].some(f => f.startsWith('late_relapse'));
    const txEligible   = flags.has('transplant_eligible');
    const txIneligible = flags.has('transplant_ineligible');
    const cardiac      = [...flags].some(f => f.startsWith('cardiac_contra'));

    const hasDoubleHit = g.HGBL_DH_MYC_BCL2 === 'yes' || g.HGBL_DH_MYC_BCL6 === 'yes' || g.HGBL_TH_MYC_BCL2_BCL6 === 'yes';
    const isPMBCL = g.PMBCL === 'yes';
    const hasCNS  = flags.has('CNS_involvement');

    const S = { hi: 6, mid: 3, low: 1, avoid: -5 };

    function push(key, base, tags, why) {
      const r = REGIMENS[key]; if (!r) return;
      out.push({
        key, name: r.name, score: base,
        tags: [...(tags || []), ...(r.aifa ? ['AIFA'] : ['off-label?'])],
        why: [...(why || []), r.type, r.aifa_note || ''].filter(Boolean),
        aifa: r.aifa
      });
    }
    function penalize(keys, delta, reason) {
      out.forEach(o => { if (keys.includes(o.key)) { o.score += delta; o.why.push(reason); } });
    }

    if (isFrontline) {
      if (isPMBCL || hasDoubleHit) {
        push('DA_R_EPOCH', S.hi, ['1L'], [isPMBCL ? 'PMBCL' : 'HGBL double/triple hit']);
      }
      if (!cardiac) {
        push('R_CHOP', S.hi - (ipi >= 3 ? 1 : 0), ['1L'], []);
        if (ipi !== null && ipi >= 3) push('pola_R_CHP', S.hi + 1, ['1L', 'IPIâ‰¥3'], ['AIFA: IPI 3â€“5']);
      } else {
        push('R_CHOP', S.low, ['1L'], ['Antracicline controindicate: considerare R-CEOP']);
      }
    } else {
      if (earlyRel && txEligible)     push('CAR_T_axi', S.hi, ['2L', 'early'], ['2L â‰¤12 mesi']);
      if (lateRel && txEligible)      push('Salvage_ASCT', S.hi, ['2L', 'late'], ['Candidabile ASCT']);
      if (txIneligible || !txEligible) {
        push('pola_BR', S.hi, ['RR'], []);
        push('tafa_len', S.mid, ['RR'], []);
      }
      push('loncastuximab', S.mid, ['3L+'], []);
      push('glofitamab', S.mid, ['3L+'], []);
      push('epcoritamab', S.mid, ['3L+'], []);
    }

    if (m.CD19_loss === 'present') {
      penalize(['CAR_T_axi', 'tafa_len', 'loncastuximab'], S.avoid, 'CD19 negativo/instabile');
    }
    if (hasCNS) {
      out.forEach(o => o.why.push('Considerare profilassi/HD-MTX per SNC'));
    }

    out.sort((a, b) => b.score - a.score);
    return { recommendations: out };
  }

  /* â”€â”€ Public API â”€â”€ */
  const engine = {
    compute,
    computeIPI,
    computeCNSIPI,
    genetics()       { return GENETICS; },
    mutations()      { return MUTATIONS; },
    scores()         { return SCORES; },
    regimens()       { return REGIMENS; },
    regimenDetail(k) { return REGIMEN_DETAILS[k] || null; },
    contextFlags()   { return CONTEXT_FLAGS; }
  };

  global.DLBCLTherapyCore = Object.freeze(engine);

  /* â”€â”€ Register on LumiaAPI â”€â”€ */
  try {
    const api = global.LumiaAPI;
    if (api && typeof api.registerTherapy === 'function') {
      api.registerTherapy('dlbcl', engine);
    }
  } catch (_) {}

})(window);
