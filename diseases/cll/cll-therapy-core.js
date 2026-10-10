/*! cll-therapy-core.js â€” CLL Therapeutic Recommendation Engine (zero DOM)
 *  Espone: window.CLLTherapyCore
 *  Registra: LumiaAPI.therapy.cll   (se LumiaAPI presente)
 *  Pattern: IIFE su window
 *
 *  API:
 *    CLLTherapyCore.genetics()       â†’ {key,label}[]
 *    CLLTherapyCore.mutations()      â†’ {key,label}[]
 *    CLLTherapyCore.scores()         â†’ {key,label}[]
 *    CLLTherapyCore.regimens()       â†’ {key â†’ object}
 *    CLLTherapyCore.iwcllFlags()     â†’ string[]
 *    CLLTherapyCore.compute(state)   â†’ {recommendations, watchAndWait}
 *    CLLTherapyCore.computeCLLIPI(p) â†’ {score, risk}
 */
(function attachCLLTherapyCore(global) {
  'use strict';

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  DATASET
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  const TX_GENETICS = Object.freeze([
    { key:'TP53_aberration', label:'Aberrazione TP53 (del17p e/o mut TP53)' },
    { key:'IGHV_unmut',      label:'IGHV non mutato' },
    { key:'IGHV_mut',        label:'IGHV mutato' },
    { key:'del11q',          label:'del(11q)/ATM' },
    { key:'del13q',          label:'del(13q)' },
    { key:'trisomy12',       label:'Trisomia 12' },
    { key:'complex_karyotype', label:'Cariotipo complesso (â‰¥3)' },
    { key:'NOTCH1',          label:'NOTCH1 mut' },
    { key:'SF3B1',           label:'SF3B1 mut' },
    { key:'BIRC3',           label:'BIRC3 mut' },
    { key:'ATM_mut',         label:'ATM mut' },
    { key:'MYD88',           label:'MYD88 L265P (raro)' }
  ]);

  const TX_MUTATIONS = Object.freeze([
    { key:'BTK_C481',   label:'BTK C481S/C481X (resistenza ai cBTKi)' },
    { key:'PLCG2_act',  label:'PLCG2 attivanti (R665W/L845F/â€¦ )' },
    { key:'BTK_T474',   label:'BTK T474X (gatekeeper, resistenza n-cBTKi)' },
    { key:'BTK_L528W',  label:'BTK L528W (kinase-impaired)' },
    { key:'BTK_other',  label:'BTK varianti non-C481 (V416L/A428D/D539H/â€¦)' },
    { key:'BCL2_G101V', label:'BCL2 G101V (resistenza a venetoclax)' },
    { key:'BCL2_D103',  label:'BCL2 D103N/Y (resistenza a venetoclax)' }
  ]);

  const TX_SCORES = Object.freeze([
    { key:'rai',     label:'Rai' },
    { key:'binet',   label:'Binet' },
    { key:'cll_ipi', label:'CLL-IPI' }
  ]);

  const TX_REGIMENS = Object.freeze({
    'acalabrutinib': {
      name:'Acalabrutinib', type:'BTKi (covalente, 2Âª gen)', aifa:true, lines:['1L','RR'],
      dosing:'100 mg BID (continuo)', refs:['Calquence RCP EMA/AIFA']
    },
    'zanubrutinib': {
      name:'Zanubrutinib', type:'BTKi (covalente, 2Âª gen)', aifa:true, lines:['1L','RR'],
      dosing:'160 mg BID o 320 mg QD (continuo)', refs:['Brukinsa label']
    },
    'ibrutinib': {
      name:'Ibrutinib', type:'BTKi (covalente, 1Âª gen)', aifa:true, lines:['1L','RR'],
      dosing:'420 mg QD (continuo)', refs:['Imbruvica label']
    },
    'ibrutinib_venetoclax': {
      name:'Ibrutinib + Venetoclax (15 mesi)', type:'BTKi + BCL2i (durata fissa)',
      aifa:true, lines:['1L'], dosing:'Ibrutinib continuo + Venetoclax ramp-up â†’ 12 mesi (tot ~15 mesi)',
      refs:['AIFA 2024']
    },
    'venetoclax_obinutuzumab': {
      name:'Venetoclax + Obinutuzumab (VO)', type:'BCL2i + anti-CD20 (durata fissa)',
      aifa:true, lines:['1L'], dosing:'VEN ramp-up â†’ 12 mesi; OBI 6 cicli',
      refs:['CLL14 / RCP']
    },
    'venetoclax_rituximab': {
      name:'Venetoclax + Rituximab (VR)', type:'BCL2i + anti-CD20 (durata fissa)',
      aifa:true, lines:['RR'], dosing:'VEN 24 mesi; RTX 6 cicli (MURANO)',
      refs:['MURANO']
    },
    'obinutuzumab_chlorambucil': {
      name:'Obinutuzumab + Chlorambucil', type:'CIT', aifa:true, lines:['1L'],
      dosing:'Schema CLL11 (6 cicli)', refs:['CLL11']
    },
    'FCR': {
      name:'FCR (fit, IGHV mut, no TP53)', type:'CIT', aifa:true, lines:['1L'],
      dosing:'FCR standard Ã— 6 cicli', refs:['ESMO']
    }
  });

  const IWCLL_FLAGS = Object.freeze([
    'Sintomi B (febbre, sudorazioni, calo ponderale)',
    'Progressione rapida linfocitosi (raddoppio < 6 mesi)',
    'Anemia progressiva o Hb < 10 g/dL dovuta a CLL',
    'Piastrinopenia < 100 Ã—10â¹/L dovuta a CLL',
    'Linfoadenopatia/splenomegalia massiva o progressiva',
    'AutoimmunitÃ  refrattaria (AIHA/ITP) non controllata',
    'Coinvolgimento extranodale sintomatico'
  ]);

  /* Dettagli per scheda regimi */
  const REGIMEN_DETAILS = Object.freeze({
    'acalabrutinib': { tox:'Cefalea, sanguinamenti, IP, FA/Flutter; interazioni CYP3A.', studies:'ELEVATE-TN / ELEVATE-RR.', src:'RCP/Label' },
    'zanubrutinib':  { tox:'Neutropenia, infezioni, sanguinamenti; FA inferiore a ibrutinib.', studies:'ALPINE.', src:'RCP/Label' },
    'ibrutinib':     { tox:'FA/Flutter, ipertensione, sanguinamenti, diarrea.', studies:'RESONATE(Â±2).', src:'PI' },
    'ibrutinib_venetoclax': { tox:'Somma tossicitÃ  BTKi + BCL2i; rischio TLS.', studies:'GLOW, CAPTIVATE.', src:'AIFA/ESMO' },
    'venetoclax_obinutuzumab': { tox:'TLS, neutropenia, IRRs.', studies:'CLL14.', src:'RCP' },
    'venetoclax_rituximab': { tox:'TLS, neutropenia.', studies:'MURANO.', src:'RCP' },
    'obinutuzumab_chlorambucil': { tox:'Mielosoppressione, IRR, infezioni.', studies:'CLL11.', src:'RCP' },
    'FCR': { tox:'MielotossicitÃ , infezioni, MDS/AML secondarie.', studies:'Storici/long-term.', src:'LG' }
  });

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  CLL-IPI calculator
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function computeCLLIPI({ age, b2m, stage, ighv, tp53 }) {
    const bool = v => v === true || v === 'yes';
    let s = 0;
    if (bool(age))   s += 1;
    if (bool(b2m))   s += 2;
    if (bool(stage)) s += 1;
    if (bool(ighv))  s += 2;
    if (bool(tp53))  s += 4;
    const risk = s <= 1 ? 'Basso' : s <= 3 ? 'Intermedio' : s <= 4 ? 'Alto' : 'Molto alto';
    return { score: s, risk };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  compute(state) â†’ recommendations
   *  state: {
   *    genetics:   [{key, value:'yes'|'no'}],
   *    mutations:  [{key, value:'present'|'absent'|'unk'}],
   *    scores:     {rai:{stage}, binet:{stage}, cll_ipi:{score,risk}},
   *    history:    [{regimenKey, line:'1L'|'RR', response:'CR'|'PR'|'SD'|'PD'|'intolerance'}],
   *    indications: string[]  (iwCLL flags selected)
   *  }
   *  returns: { recommendations: [{key,name,score,tags,why,aifa}], watchAndWait: boolean }
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function compute(state) {
    const out = [];
    const g = Object.fromEntries((state.genetics || []).map(x => [x.key, x.value]));
    const m = Object.fromEntries((state.mutations || []).map(x => [x.key, x.value]));
    const prior = state.history || [];
    const indications = Array.isArray(state.indications) ? state.indications : [...(state.indications || [])];
    const treatIndicated = indications.length > 0;

    if (!treatIndicated) {
      return { recommendations: [], watchAndWait: true };
    }

    const hasTP53   = g.TP53_aberration === 'yes';
    const unmutIGHV = g.IGHV_unmut === 'yes';
    const mutIGHV   = g.IGHV_mut === 'yes';

    const S = { high: 6, mid: 3, low: 1, avoid: -5 };

    const failedBTKi     = prior.some(p => ['acalabrutinib','zanubrutinib','ibrutinib'].includes(p.regimenKey) && p.response === 'PD');
    const intolerantBTKi = prior.some(p => ['acalabrutinib','zanubrutinib','ibrutinib'].includes(p.regimenKey) && p.response === 'intolerance');
    const failedBCL2     = prior.some(p => ['venetoclax_obinutuzumab','venetoclax_rituximab','ibrutinib_venetoclax'].includes(p.regimenKey) && p.response === 'PD');

    const isFrontline = !prior.some(p => p.line === '1L');

    function push(key, base, tags, why) {
      const r = TX_REGIMENS[key];
      if (!r) return;
      out.push({
        key, name: r.name, score: base,
        tags: [...(tags || []), ...(r.aifa ? ['AIFA'] : ['off-label?'])],
        why: [...(why || []), r.type],
        aifa: r.aifa
      });
    }
    function lower(keys, delta, reason) {
      out.forEach(o => { if (keys.includes(o.key)) { o.score += delta; o.why.push(reason); } });
    }

    if (isFrontline) {
      if (hasTP53) {
        push('acalabrutinib', S.high, ['1L','TP53+'], ['Preferenza in TP53/del17p']);
        push('zanubrutinib',  S.high, ['1L','TP53+'], ['Preferenza in TP53/del17p']);
        push('ibrutinib',     S.mid,  ['1L','TP53+'], ['Alternativa ove appropriato']);
        push('venetoclax_obinutuzumab', S.mid, ['1L','time-limited'], ['Time-limited; valutare profilo']);
      } else {
        push('venetoclax_obinutuzumab', S.high, ['1L','time-limited'], ['Time-limited']);
        push('acalabrutinib', S.high, ['1L'], ['BTKi 2Âª gen']);
        push('zanubrutinib',  S.high, ['1L'], ['BTKi 2Âª gen']);
        push('ibrutinib_venetoclax', S.high, ['1L','15 mesi'], ['Combinazione rimborsata']);
        if (mutIGHV) push('FCR', S.low, ['1L','selezionato'], ['Giovane, IGHV mut, no TP53']);
      }
    } else {
      if (failedBTKi || intolerantBTKi) push('venetoclax_rituximab', S.high, ['RR','post-BTKi'], ['MURANO-like']);
      if (failedBCL2) { push('acalabrutinib', S.high, ['RR','post-BCL2i'], []); push('zanubrutinib', S.high, ['RR','post-BCL2i'], []); }
      if (!(failedBTKi || failedBCL2)) {
        if (!prior.some(p => ['venetoclax_obinutuzumab','venetoclax_rituximab','ibrutinib_venetoclax'].includes(p.regimenKey))) {
          push('venetoclax_rituximab', S.mid, ['RR'], []);
        }
        if (!prior.some(p => ['acalabrutinib','zanubrutinib','ibrutinib'].includes(p.regimenKey))) {
          push('acalabrutinib', S.mid, ['RR'], []);
          push('zanubrutinib',  S.mid, ['RR'], []);
        }
      }
    }

    // Resistance penalties
    if (m.BTK_C481 === 'present' || m.PLCG2_act === 'present') {
      lower(['ibrutinib','acalabrutinib','zanubrutinib'], S.avoid, 'Resistenza cBTKi (BTK C481/PLCG2)');
    }
    if (m.BCL2_G101V === 'present' || m.BCL2_D103 === 'present') {
      lower(['venetoclax_obinutuzumab','venetoclax_rituximab','ibrutinib_venetoclax'], S.avoid, 'Resistenza BCL2 (BCL2 mut)');
    }

    out.sort((a, b) => b.score - a.score);

    return { recommendations: out, watchAndWait: false };
  }

  /* â”€â”€ Public API â”€â”€ */
  const engine = {
    compute,
    computeCLLIPI,
    genetics()    { return TX_GENETICS; },
    mutations()   { return TX_MUTATIONS; },
    scores()      { return TX_SCORES; },
    regimens()    { return TX_REGIMENS; },
    regimenDetail(key) { return REGIMEN_DETAILS[key] || null; },
    iwcllFlags()  { return IWCLL_FLAGS; }
  };

  global.CLLTherapyCore = Object.freeze(engine);

  /* â”€â”€ Register on LumiaAPI â”€â”€ */
  try {
    const api = global.LumiaAPI;
    if (api && typeof api.registerTherapy === 'function') {
      api.registerTherapy('cll', engine);
    }
  } catch (_) {}

})(window);
