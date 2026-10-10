/* =======================================================================
 *  HematoMolecularPanel — Centralized Molecular / Mutation Database
 *  Zero DOM, frozen data.  Shared by all disease modules.
 *  Espone: window.HematoMolecularPanel
 *  Registra su: HematoAPI.markers
 * ======================================================================= */
(function (global) {
  'use strict';

  /* ==================== GENE / MUTATION CATALOGUE ==================== */

  /**
   * Ogni entry: { gene, aliases[], diseases[], class, description }
   * class: 'oncogene' | 'tumor-suppressor' | 'signaling' | 'epigenetic' |
   *        'splicing' | 'dna-repair' | 'cell-cycle' | 'apoptosis' | 'other'
   */
  var MUTATIONS = Object.freeze([

    /* ─── Ubiquitari / multi-disease ─── */
    { gene: 'TP53',    aliases: ['17p-', 'del(17p)'], diseases: ['CLL','DLBCL','FL','MCL','AML','MDS','MM'], class: 'tumor-suppressor', description: 'Delezione/mutazione 17p; chemo-resistenza, prognosi sfavorevole' },
    { gene: 'ATM',     aliases: ['11q-', 'del(11q)'], diseases: ['CLL','MCL'],                              class: 'dna-repair',        description: 'Coinvolto nella riparazione DSB; frequente nella CLL' },

    /* ─── CLL-specifici ─── */
    { gene: 'IGHV',    aliases: ['IgHV'],            diseases: ['CLL'],                                     class: 'other',             description: 'Stato mutazionale catene pesanti Ig; unmutated = prognosi sfavorevole' },
    { gene: 'NOTCH1',  aliases: [],                   diseases: ['CLL','MCL'],                               class: 'signaling',         description: 'Attivazione aberrante via Notch; Richter, refrattariet\u00e0 anti-CD20' },
    { gene: 'SF3B1',   aliases: [],                   diseases: ['CLL','MDS'],                               class: 'splicing',          description: 'Splicing factor; intermedio nella CLL, basso rischio nella MDS' },
    { gene: 'BIRC3',   aliases: [],                   diseases: ['CLL'],                                     class: 'apoptosis',         description: 'Delezione/mutazione; resistenza fludarabina' },

    /* ─── DLBCL-specifici ─── */
    { gene: 'MYC',     aliases: ['8q24'],             diseases: ['DLBCL','MCL','FL'],                        class: 'oncogene',          description: 'Riarrangiamento/amplificazione; DH/TH; prognosi sfavorevole' },
    { gene: 'BCL2',    aliases: ['t(14;18)'],         diseases: ['DLBCL','FL'],                              class: 'apoptosis',         description: 'Riarrangiamento; hallmark del FL; double-hit DLBCL' },
    { gene: 'BCL6',    aliases: ['3q27'],             diseases: ['DLBCL','FL'],                              class: 'oncogene',          description: 'Riarrangiamento; triple-hit con MYC+BCL2' },
    { gene: 'CD79B',   aliases: [],                   diseases: ['DLBCL'],                                   class: 'signaling',         description: 'Mutazione attivante BCR; sottotipo ABC/MCD' },
    { gene: 'MYD88',   aliases: ['MYD88 L265P'],      diseases: ['DLBCL'],                                   class: 'signaling',         description: 'Mutazione L265P; sottotipo MCD; buona risposta ibrutinib' },
    { gene: 'CREBBP',  aliases: [],                   diseases: ['DLBCL','FL'],                              class: 'epigenetic',        description: 'Loss-of-function; sottotipo EZB' },
    { gene: 'EZH2',    aliases: [],                   diseases: ['DLBCL','FL'],                              class: 'epigenetic',        description: 'Gain-of-function; target tazemetostat nel FL' },

    /* ─── FL-specifici ─── */
    { gene: 'KMT2D',   aliases: ['MLL2'],             diseases: ['FL','DLBCL','MCL'],                        class: 'epigenetic',        description: 'Perdita funzione; frequente nel FL e sottotipo EZB DLBCL' },
    { gene: 'TNFRSF14',aliases: ['HVEM'],             diseases: ['FL'],                                      class: 'tumor-suppressor',  description: 'Perdita; alterazione microambiente nel FL' },
    { gene: 'RRAGC',   aliases: [],                   diseases: ['FL'],                                      class: 'signaling',         description: 'Mutazione attivante mTOR; FL' },

    /* ─── MCL-specifici ─── */
    { gene: 'CCND1',   aliases: ['t(11;14)', 'IGH::CCND1'], diseases: ['MCL','MM'],                         class: 'cell-cycle',        description: 'Traslocazione hallmark MCL; overespressione ciclina D1' },
    { gene: 'SOX11',   aliases: [],                   diseases: ['MCL'],                                     class: 'other',             description: 'Negativo = fenotipo indolente non-nodale' },
    { gene: 'BTK',     aliases: ['BTK C481S'],        diseases: ['CLL','MCL'],                               class: 'signaling',         description: 'Mutazione sito legame; resistenza BTKi covalenti' },
    { gene: 'PLCG2',   aliases: [],                   diseases: ['CLL','MCL'],                               class: 'signaling',         description: 'Mutazione attivante; resistenza BTKi bypass' },

    /* ─── AML-specifici ─── */
    { gene: 'FLT3',    aliases: ['FLT3-ITD', 'FLT3-TKD'], diseases: ['AML'],                                class: 'signaling',         description: 'ITD/TKD; target midostaurin, gilteritinib, quizartinib' },
    { gene: 'NPM1',    aliases: [],                   diseases: ['AML'],                                     class: 'other',             description: 'Mutazione tipo A; prognosi favorevole se isolata senza FLT3-ITD alto' },
    { gene: 'IDH1',    aliases: [],                   diseases: ['AML','MDS'],                               class: 'epigenetic',        description: 'Mutazione R132; target ivosidenib' },
    { gene: 'IDH2',    aliases: [],                   diseases: ['AML','MDS'],                               class: 'epigenetic',        description: 'Mutazione R140/R172; target enasidenib' },
    { gene: 'CEBPA',   aliases: [],                   diseases: ['AML'],                                     class: 'other',             description: 'Mutazione biallelica in-frame bZIP; prognosi favorevole (ELN 2022)' },
    { gene: 'RUNX1',   aliases: [],                   diseases: ['AML','MDS'],                               class: 'other',             description: 'Mutazione; avverso nella classificazione ELN' },
    { gene: 'ASXL1',   aliases: [],                   diseases: ['AML','MDS','CMML'],                        class: 'epigenetic',        description: 'Frequente nelle MDS/CMML; avverso' },
    { gene: 'DNMT3A',  aliases: [],                   diseases: ['AML','MDS'],                               class: 'epigenetic',        description: 'Mutazione R882; clonal hematopoiesis of indeterminate potential (CHIP)' },

    /* ─── MDS-specifici ─── */
    { gene: 'TET2',    aliases: [],                   diseases: ['MDS','CMML','AML'],                        class: 'epigenetic',        description: 'Loss-of-function; risposta ad azacitidina; CHIP comune' },
    { gene: 'SRSF2',   aliases: [],                   diseases: ['MDS','CMML'],                              class: 'splicing',          description: 'Splicing factor; frequente CMML; prognosi intermedia' },
    { gene: 'U2AF1',   aliases: [],                   diseases: ['MDS'],                                     class: 'splicing',          description: 'Splicing factor; variante S34 vs Q157' },
    { gene: 'STAG2',   aliases: [],                   diseases: ['MDS','AML'],                               class: 'other',             description: 'Coesina; sfavorevole nella MDS' },
    { gene: 'ZRSR2',   aliases: [],                   diseases: ['MDS'],                                     class: 'splicing',          description: 'Splicing factor; X-linked; prognosi favorevole' },

    /* ─── CMML-specifici ─── */
    { gene: 'NRAS',    aliases: ['RAS'],              diseases: ['CMML','AML','MM'],                         class: 'signaling',         description: 'Attivazione RAS-MAPK; frequente CMML; prognosi sfavorevole' },
    { gene: 'KRAS',    aliases: [],                   diseases: ['CMML','AML','MM'],                         class: 'signaling',         description: 'Attivazione RAS-MAPK; frequente CMML' },
    { gene: 'CBL',     aliases: [],                   diseases: ['CMML'],                                    class: 'signaling',         description: 'Ubiquitina ligasi; regolazione negativa signaling; CMML' },

    /* ─── MM-specifici ─── */
    { gene: 'del(17p)', aliases: [],                  diseases: ['MM'],                                      class: 'tumor-suppressor',  description: 'Alto rischio R-ISS; perdita TP53' },
    { gene: 't(4;14)',  aliases: ['IGH::FGFR3/MMSET'],diseases: ['MM'],                                     class: 'oncogene',          description: 'Alto rischio; overespressione FGFR3/MMSET' },
    { gene: 't(14;16)', aliases: ['IGH::MAF'],        diseases: ['MM'],                                      class: 'oncogene',          description: 'Alto rischio; overespressione c-MAF' },
    { gene: 't(14;20)', aliases: ['IGH::MAFB'],       diseases: ['MM'],                                      class: 'oncogene',          description: 'Ultra-alto rischio' },
    { gene: 't(11;14)', aliases: ['IGH::CCND1'],      diseases: ['MM','MCL'],                                class: 'cell-cycle',        description: 'Standard risk MM; overespressione ciclina D1; sensibilit\u00e0 venetoclax' },
    { gene: 'gain(1q)', aliases: ['1q21+'],           diseases: ['MM'],                                      class: 'other',             description: 'Alto rischio; frequente; CKS1B overespressione' }
  ]);

  /* ==================== QUERY HELPERS ==================== */

  /**
   * Get all mutations relevant to a disease.
   * @param {string} disease — e.g. 'CLL', 'DLBCL'
   * @returns {Array}
   */
  function byDisease(disease) {
    var d = (disease || '').toUpperCase();
    return MUTATIONS.filter(function (m) { return m.diseases.includes(d); });
  }

  /**
   * Lookup by gene name (case-insensitive) or alias.
   * @param {string} query — gene name or alias
   * @returns {Object|null}
   */
  function findGene(query) {
    var q = (query || '').toUpperCase();
    return MUTATIONS.find(function (m) {
      return m.gene.toUpperCase() === q ||
        m.aliases.some(function (a) { return a.toUpperCase() === q; });
    }) || null;
  }

  /**
   * Filter by mutation class.
   * @param {string} cls — e.g. 'epigenetic', 'splicing'
   * @returns {Array}
   */
  function byClass(cls) {
    var c = (cls || '').toLowerCase();
    return MUTATIONS.filter(function (m) { return m.class === c; });
  }

  /**
   * Get all unique gene names.
   * @returns {string[]}
   */
  function allGenes() {
    return MUTATIONS.map(function (m) { return m.gene; });
  }

  /**
   * Get diseases that share at least one mutation with the given disease.
   * @param {string} disease
   * @returns {string[]}
   */
  function relatedDiseases(disease) {
    var genes = byDisease(disease);
    var set = new Set();
    genes.forEach(function (g) {
      g.diseases.forEach(function (d) { set.add(d); });
    });
    set.delete(disease.toUpperCase());
    return Array.from(set).sort();
  }

  /* ==================== PUBLIC API ==================== */

  var HematoMolecularPanel = Object.freeze({
    MUTATIONS:        MUTATIONS,
    byDisease:        byDisease,
    findGene:         findGene,
    byClass:          byClass,
    allGenes:         allGenes,
    relatedDiseases:  relatedDiseases
  });

  global.HematoMolecularPanel = HematoMolecularPanel;

  /* Register on HematoAPI if available */
  if (global.HematoAPI && typeof global.HematoAPI.registerDiagnostic === 'function') {
    global.HematoAPI.registerDiagnostic('molecularPanel', {
      id:      'hemato-molecular-panel',
      version: '1.0.0',
      query:   { byDisease: byDisease, findGene: findGene, byClass: byClass, allGenes: allGenes, relatedDiseases: relatedDiseases },
      data:    { MUTATIONS: MUTATIONS }
    });
  }

})(window);
