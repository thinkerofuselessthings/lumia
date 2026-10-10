/*! lumia-scores.js â€” Unified Score Calculators
 *  Espone: window.LumiaScores  (+ registrazione su LumiaAPI.scores)
 *  Dipendenze: lumia-api.js (opzionale), lumia-events.js (opzionale)
 *  Pattern: IIFE su window
 *
 *  Ogni calcolatore accetta un oggetto parametri e ritorna { score, risk, detail }.
 *  Tutti i campi booleani accettano true/false/'yes'/'no'.
 */
(function attachLumiaScores(global) {
  'use strict';

  /* â”€â”€ Helpers â”€â”€ */
  const bool = v => v === true || v === 'yes';
  const num  = (v, fallback) => { const n = Number(v); return Number.isFinite(n) ? n : (fallback ?? 0); };

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  CLL-IPI  (International Prognostic Index for CLL)
   *  Ref: Lancet Oncol 2016
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function cllIPI(p) {
    let s = 0;
    if (bool(p.age))   s += 1;   // etÃ  > 65
    if (bool(p.b2m))   s += 2;   // Î²2-microglobulina > 3.5
    if (bool(p.stage)) s += 1;   // stadio avanzato (Rai I-IV / Binet B-C)
    if (bool(p.ighv))  s += 2;   // IGHV non mutato
    if (bool(p.tp53))  s += 4;   // aberrazione TP53
    const risk = s <= 1 ? 'Basso' : s <= 3 ? 'Intermedio' : s <= 4 ? 'Alto' : 'Molto alto';
    return { score: s, risk, detail: `CLL-IPI ${s}/10` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  FLIPI  (Follicular Lymphoma International Prognostic Index)
   *  Ref: Blood 2004
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function flipi(p) {
    let s = 0;
    if (bool(p.age))   s++;  // > 60
    if (bool(p.stage)) s++;  // III-IV
    if (bool(p.hb))    s++;  // Hb < 12
    if (bool(p.ldh))   s++;  // LDH elevato
    if (bool(p.nodes)) s++;  // > 4 aree linfonodali
    const risk = s <= 1 ? 'Basso' : s === 2 ? 'Intermedio' : 'Alto';
    return { score: s, risk, detail: `FLIPI ${s}/5` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  FLIPI-2
   *  Ref: J Clin Oncol 2009
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function flipi2(p) {
    let s = 0;
    if (bool(p.age))   s++;  // > 60
    if (bool(p.b2m))   s++;  // Î²2M > ULN
    if (bool(p.bm))    s++;  // infiltrazione midollare
    if (bool(p.hb))    s++;  // Hb < 12
    if (bool(p.ln))    s++;  // linfonodo > 6 cm
    const risk = s <= 1 ? 'Basso' : s === 2 ? 'Intermedio' : 'Alto';
    return { score: s, risk, detail: `FLIPI-2 ${s}/5` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  PRIMA-PI
   *  Ref: Lancet Haematol 2017
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function primaPI(p) {
    const b2m = bool(p.b2m);
    const bm  = bool(p.bm);
    const s = (b2m && bm) ? 2 : (b2m || bm) ? 1 : 0;
    const risk = s === 0 ? 'Basso' : s === 1 ? 'Intermedio' : 'Alto';
    return { score: s, risk, detail: `PRIMA-PI ${s}/2` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  IPI  (International Prognostic Index â€” Aggressive NHL)
   *  Ref: NEJM 1993
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function ipi(p) {
    let s = 0;
    if (bool(p.age))        s++;  // > 60
    if (bool(p.ldh))        s++;  // LDH elevato
    if (bool(p.ecog))       s++;  // ECOG â‰¥ 2
    if (bool(p.stage))      s++;  // III-IV
    if (bool(p.extranodal)) s++;  // sedi extranodali > 1
    const risk = s <= 1 ? 'Basso' : s === 2 ? 'Intermedio-basso' : s === 3 ? 'Intermedio-alto' : 'Alto';
    return { score: s, risk, detail: `IPI ${s}/5` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  CNS-IPI
   *  Ref: Blood 2016
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function cnsIPI(p) {
    let s = 0;
    if (bool(p.age))        s++;
    if (bool(p.ldh))        s++;
    if (bool(p.stage))      s++;
    if (bool(p.ecog))       s++;
    if (bool(p.extranodal)) s++;
    if (bool(p.renal))      s++;  // coinvolgimento renale/surrene
    const risk = s <= 1 ? 'Basso' : s <= 3 ? 'Intermedio' : 'Alto';
    return { score: s, risk, detail: `CNS-IPI ${s}/6` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  S-MIPI  (Simplified MIPI â€” Mantle Cell Lymphoma)
   *  Ref: Blood 2008 / Ann Oncol 2017
   *  p.age, p.ecog, p.ldh, p.wbc come valori numerici (0,1,2)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function sMIPI(p) {
    const s = num(p.age) + num(p.ecog) + num(p.ldh) + num(p.wbc);
    const risk = s <= 3 ? 'Basso' : s <= 5 ? 'Intermedio' : 'Alto';
    return { score: s, risk, detail: `S-MIPI ${s}/6` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  MIPI-b  (MIPI biologic â€” with Ki-67)
   *  p.smipi (0-6), p.ki67 (bool â‰¥30%)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function mipiBiologic(p) {
    let cls = num(p.smipi) <= 3 ? 0 : num(p.smipi) <= 5 ? 1 : 2;
    if (bool(p.ki67)) cls = Math.min(2, cls + 1);
    const risk = cls === 0 ? 'Basso' : cls === 1 ? 'Intermedio' : 'Alto';
    return { score: cls, risk, detail: `MIPI-b classe ${cls}` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  IPSS-R  (Revised Int. Prognostic Scoring System â€” MDS)
   *  Ref: Blood 2012
   *  p.cytogenetics (0-4), p.blasts (0-3), p.hb (0-1.5), p.plt (0-1), p.anc (0-0.5)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function ipssR(p) {
    const s = +(num(p.cytogenetics, 0) + num(p.blasts, 0) + num(p.hb, 0) + num(p.plt, 0) + num(p.anc, 0)).toFixed(1);
    let risk;
    if (s <= 1.5)      risk = 'Very Low';
    else if (s <= 3)   risk = 'Low';
    else if (s <= 4.5) risk = 'Intermediate';
    else if (s <= 6)   risk = 'High';
    else               risk = 'Very High';
    return { score: s, risk, detail: `IPSS-R ${s}` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  R-ISS  (Revised International Staging System â€” MM)
   *  Ref: J Clin Oncol 2015
   *  p.iss (1-3), p.ldh (bool elevated), p.highRiskFISH (bool)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function rISS(p) {
    const iss = num(p.iss, 1);
    const ldh = bool(p.ldh);
    const hr  = bool(p.highRiskFISH);
    let stage;
    if (iss === 1 && !ldh && !hr)       stage = 'I';
    else if (iss === 3 && (ldh || hr))  stage = 'III';
    else                                 stage = 'II';
    const risk = stage === 'I' ? 'Basso' : stage === 'II' ? 'Intermedio' : 'Alto';
    return { score: stage, risk, detail: `R-ISS ${stage}` };
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  FIL Fitness  (schema semplificato)
   *  p.ecog (0-2), p.cirs (0-1), p.adl (0-2)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function filFitness(p) {
    const s = num(p.ecog) + num(p.cirs) + num(p.adl);
    const risk = s <= 1 ? 'Fit' : s <= 3 ? 'Unfit' : 'Frail';
    return { score: s, risk, detail: `FIL ${s} â†’ ${risk}` };
  }

  /* â”€â”€ Catalogo â”€â”€ */
  const SCORES = {
    cllIPI,
    flipi,
    flipi2,
    primaPI,
    ipi,
    cnsIPI,
    sMIPI,
    mipiBiologic,
    ipssR,
    rISS,
    filFitness
  };

  /* â”€â”€ Registrazione su LumiaAPI (se presente) â”€â”€ */
  function _registerAll() {
    const api = global.LumiaAPI;
    if (!api || typeof api.registerScore !== 'function') return;
    Object.entries(SCORES).forEach(([key, fn]) => {
      try { api.registerScore(key, fn); } catch (_) { /* giÃ  registrato */ }
    });
  }

  _registerAll();

  /* â”€â”€ Esporta â”€â”€ */
  global.LumiaScores = Object.freeze({ ...SCORES, list: () => Object.keys(SCORES) });

})(window);
