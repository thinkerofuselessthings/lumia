/*! fil-fitness-core.js — FIL sGA / EPI compute engine
 *
 *  Reference: Merli F. et al., JCO 2021;39(11):1214-1222
 *
 *  Espone: window.FILFitnessCore
 *  Dipendenze: fil-fitness-data.js (FILFitnessData)
 *  Pattern: IIFE su window
 *
 *  API:
 *    computeSGA(input)  → { domainScores, worstDomain, sgaClass, domains }
 *    computeEPI(input)  → { sgaSub, ipiSub, hbSub, epiScore, epiRisk }
 *    computeAll(input)  → { sga: {...}, epi: {...}, cirsMetrics: {...} }
 */
(function (global) {
  'use strict';

  var Data = global.FILFitnessData;
  if (!Data) { console.error('[FILFitnessCore] FILFitnessData not loaded'); return; }

  /* ═══════════════════════════════════════════════════════════════
   *  computeSGA
   *
   *  @param {{ age: number, adlScore: number, iadlScore: number,
   *            gender: string, cirsGrades: number[] }} input
   *  @returns {{ domainScores: {age,adl,iadl,cirs}, worstDomain: string,
   *              sgaClass: {key,label,color}, domains: array }}
   * ═══════════════════════════════════════════════════════════════ */
  function computeSGA(input) {
    var ageDom  = Data.ageDomainScore(input.age);
    var adlDom  = Data.adlDomainScore(input.adlScore);
    var iadlDom = Data.iadlDomainScore(input.iadlScore, input.gender);
    var cirsM   = Data.cirsMetrics(input.cirsGrades || []);
    var cirsDom = Data.cirsDomainScore(cirsM.nSevere);

    var domainScores = { age: ageDom, adl: adlDom, iadl: iadlDom, cirs: cirsDom };
    var sgaClass = Data.sgaClassify(domainScores);

    /* Identify worst domain(s) */
    var max = Math.max(ageDom, adlDom, iadlDom, cirsDom);
    var worstDomains = [];
    if (ageDom  === max) worstDomains.push('Et\u00e0');
    if (adlDom  === max) worstDomains.push('ADL');
    if (iadlDom === max) worstDomains.push('IADL');
    if (cirsDom === max) worstDomains.push('CIRS-G');

    /* Structured domain details */
    var domains = [
      { id: 'age',  label: 'Et\u00e0',  score: ageDom,  raw: input.age + ' anni' },
      { id: 'adl',  label: 'ADL',   score: adlDom,  raw: input.adlScore + '/6' },
      { id: 'iadl', label: 'IADL',  score: iadlDom, raw: input.iadlScore + '/' + (input.gender === 'M' ? '5' : '8') },
      { id: 'cirs', label: 'CIRS-G', score: cirsDom, raw: cirsM.nSevere + ' comorbidit\u00e0 grado \u22653' }
    ];

    return {
      domainScores: domainScores,
      worstDomain: worstDomains.join(', '),
      sgaClass: sgaClass,
      domains: domains
    };
  }

  /* ═══════════════════════════════════════════════════════════════
   *  computeEPI
   *
   *  @param {{ sgaKey: string, ipi: number, hb: number }} input
   *  @returns {{ sgaSub, ipiSub, hbSub, epiScore, epiRisk }}
   * ═══════════════════════════════════════════════════════════════ */
  function computeEPI(input) {
    var sgaMap  = { fit: 0, unfit: 1, frail: 2 };
    var sgaSub  = sgaMap[input.sgaKey] != null ? sgaMap[input.sgaKey] : 0;
    var ipiSub  = Data.ipiToEpi(input.ipi);
    var hbSub   = Data.hbToEpi(input.hb);
    var epiScore = sgaSub + ipiSub + hbSub;
    var epiRisk  = Data.epiClassify(epiScore);

    return {
      sgaSub:   sgaSub,
      ipiSub:   ipiSub,
      hbSub:    hbSub,
      epiScore: epiScore,
      epiRisk:  epiRisk
    };
  }

  /* ═══════════════════════════════════════════════════════════════
   *  computeAll — convenience wrapper
   *
   *  @param {{ age, gender, adlScore, iadlScore, cirsGrades,
   *            ipi, hb, ecog? }} input
   *  @returns {{ sga, epi, cirsMetrics }}
   * ═══════════════════════════════════════════════════════════════ */
  function computeAll(input) {
    var sga = computeSGA(input);
    var cirsM = Data.cirsMetrics(input.cirsGrades || []);
    var epi = computeEPI({
      sgaKey: sga.sgaClass.key,
      ipi: input.ipi,
      hb: input.hb
    });
    return {
      sga: sga,
      epi: epi,
      cirsMetrics: cirsM
    };
  }

  /* ═══════════════════════════════════════════════════════════════
   *  Public API
   * ═══════════════════════════════════════════════════════════════ */
  global.FILFitnessCore = {
    computeSGA:  computeSGA,
    computeEPI:  computeEPI,
    computeAll:  computeAll
  };

})(window);
