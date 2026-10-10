/*! cd-b-lpd-data.js — Immunophenotypic marker-disease expression table for B-LPD
 *  Espone: window.CDBLPDData
 *  Pattern: IIFE su window
 *
 *  Fonti cliniche di riferimento:
 *    - WHO Classification of Haematolymphoid Tumours, 5th ed. (2022)
 *    - ICC 2022 (International Consensus Classification)
 *    - Matutes scoring system for CLL (Matutes et al., Leukemia 1994)
 *    - EuroFlow consensus panels
 *    - Swerdlow SH et al., WHO Classification (2017) rev 4th ed.
 *    - NCCN Guidelines (B-cell lymphomas, CLL/SLL)
 *
 *  Struttura:
 *    MARKER_TABLE[marker] = {
 *      category: string,                // pannello (pan-B, CLL, MCL, HCL, MZL, FL, DLBCL, BL, LPL, misc)
 *      fullName: string,                // nome completo del marker
 *      diseases: {                      // espressione per patologia
 *        'DISEASE_KEY': {
 *          expr: string[],              // pattern espressione possibili: 'pos','neg','dim','br','var'
 *          typical: string,             // espressione tipica/più frequente
 *          weight: number,              // peso diagnostico (1-3, negativo se esclude)
 *          note?: string                // note cliniche opzionali
 *        }
 *      }
 *    }
 *
 *  API:
 *    CDBLPDData.markers()           → string[]
 *    CDBLPDData.categories()        → string[]
 *    CDBLPDData.diseases()          → string[]
 *    CDBLPDData.table()             → MARKER_TABLE (frozen deep copy)
 *    CDBLPDData.markersByCategory() → { category: string[] }
 *    CDBLPDData.profileOf(disease)  → { marker: {expr,typical,weight,note} }
 *    CDBLPDData.diseaseKeys         → ALL_DISEASES (frozen)
 *    CDBLPDData.markerKeys          → ALL_MARKERS (frozen)
 */
(function attachCDBLPDData(global) {
  'use strict';

  /* ══════════════════════════════════════════
   *  Disease keys
   * ══════════════════════════════════════════ */
  const ALL_DISEASES = Object.freeze([
    'CLL/SLL',
    'MCL (classical)',
    'MCL (leukemic non-nodal)',
    'MCL (blastoid/pleomorphic)',
    'HCL',
    'HCL-variant',
    'SMZL',
    'NMZL',
    'EMZL/MALT',
    'LPL/WM',
    'FL',
    'DLBCL-GCB',
    'DLBCL-ABC',
    'DLBCL-DE',
    'BL',
    'SDRPL',
    'B-PLL'
  ]);

  /* ══════════════════════════════════════════
   *  Marker-Disease expression table
   *
   *  expr[]:  possibili pattern ('pos','neg','dim','br','var')
   *  typical: il pattern più comune/caratteristico
   *  weight:  peso diagnostico positivo (favorisce) o negativo (esclude)
   *           3 = patognomonico/molto forte
   *           2 = forte
   *           1 = moderato/supportivo
   *          -1 = lieve contro
   *          -2 = forte contro
   *          -3 = virtualmente esclude
   * ══════════════════════════════════════════ */
  const MARKER_TABLE = Object.freeze({

    /* ─── Pan-B markers ─── */
    'CD19': {
      category: 'pan-B',
      fullName: 'B-lymphocyte antigen CD19',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','dim'],     typical: 'pos',  weight: 1,  note: 'variabile, generalmente positivo' },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 }
      }
    },

    'CD20': {
      category: 'pan-B',
      fullName: 'B-lymphocyte antigen CD20 (MS4A1)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','neg','pos'], typical: 'dim',  weight: 2,  note: 'tipicamente dim; criterio Matutes' },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'br',   weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['pos','br'],      typical: 'br',   weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','br'],     typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['br'],            typical: 'br',   weight: 2 },
        'HCL-variant':              { expr: ['br'],            typical: 'br',   weight: 1 },
        'SMZL':                     { expr: ['br','pos'],      typical: 'br',   weight: 1 },
        'NMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'DLBCL-ABC':                { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'DLBCL-DE':                 { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'BL':                       { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['br','pos'],      typical: 'br',   weight: 1 }
      }
    },

    'CD22': {
      category: 'pan-B',
      fullName: 'B-cell receptor CD22 (Siglec-2)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','neg'],     typical: 'dim',  weight: 1,  note: 'debole/negativo' },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos','br'],      typical: 'br',   weight: 1 },
        'HCL-variant':              { expr: ['pos','br'],      typical: 'br',   weight: 1 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 1 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 1 },
        'DLBCL-DE':                 { expr: ['pos','var'],     typical: 'pos',  weight: 1 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 }
      }
    },

    'CD79a': {
      category: 'pan-B',
      fullName: 'Immunoglobulin-associated alpha (Igα)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','dim'],     typical: 'pos',  weight: 1 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 }
      }
    },

    'CD79b': {
      category: 'pan-B',
      fullName: 'Immunoglobulin-associated beta (Igβ)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 2,  note: 'negativo/debole; criterio Matutes' },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'pos',  weight: 2 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 2 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 }
      }
    },

    /* ─── CLL/SLL panel ─── */
    'CD5': {
      category: 'CLL',
      fullName: 'T-cell surface glycoprotein CD5',
      diseases: {
        'CLL/SLL':                  { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'coespresso con CD19; criterio Matutes' },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'MCL (leukemic non-nodal)': { expr: ['pos','neg'],     typical: 'pos',  weight: 1,  note: 'variabile, può essere negativo' },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 2 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SMZL':                     { expr: ['neg','dim'],     typical: 'neg',  weight: 2,  note: 'generalmente negativo; se pos rivalutare' },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'EMZL/MALT':                { expr: ['neg','dim'],     typical: 'neg',  weight: 1,  note: 'raro dim' },
        'LPL/WM':                   { expr: ['neg','dim'],     typical: 'neg',  weight: 1 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 1,  note: 'raramente positivo (10-20%)' },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 2 },
        'B-PLL':                    { expr: ['neg','pos'],     typical: 'neg',  weight: 1,  note: 'pos in ~30% dei casi' }
      }
    },

    'CD23': {
      category: 'CLL',
      fullName: 'Low-affinity IgE receptor (FcεRII)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'criterio Matutes; coespresso con CD5' },
        'MCL (classical)':          { expr: ['neg','dim'],     typical: 'neg',  weight: 2,  note: 'negativo; chiave per DD con CLL' },
        'MCL (leukemic non-nodal)': { expr: ['neg','dim','pos'], typical: 'neg', weight: 1, note: 'variabile, può essere positivo' },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 2 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SMZL':                     { expr: ['neg','dim'],     typical: 'neg',  weight: 1 },
        'NMZL':                     { expr: ['neg','dim'],     typical: 'neg',  weight: 1 },
        'EMZL/MALT':                { expr: ['neg','dim'],     typical: 'neg',  weight: 1 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'FL':                       { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'variabile (~30% pos)' },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 2 },
        'B-PLL':                    { expr: ['neg','dim'],     typical: 'neg',  weight: 1 }
      }
    },

    'CD200': {
      category: 'CLL',
      fullName: 'OX-2 membrane glycoprotein',
      diseases: {
        'CLL/SLL':                  { expr: ['br','pos'],      typical: 'br',   weight: 3,  note: 'bright; chiave DD CLL vs MCL' },
        'MCL (classical)':          { expr: ['neg','dim'],     typical: 'neg',  weight: -2, note: 'negativo; chiave DD MCL vs CLL' },
        'MCL (leukemic non-nodal)': { expr: ['pos','dim'],     typical: 'pos',  weight: 1,  note: 'può essere moderatamente positivo' },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: -2 },
        'HCL':                      { expr: ['pos','br'],      typical: 'br',   weight: 1 },
        'HCL-variant':              { expr: ['neg','dim'],     typical: 'neg',  weight: -1 },
        'SMZL':                     { expr: ['neg','dim','pos'], typical: 'dim', weight: 0,  note: 'variabile' },
        'NMZL':                     { expr: ['neg','dim'],     typical: 'dim',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['pos','dim'],     typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg','dim'],     typical: 'neg',  weight: -1 },
        'B-PLL':                    { expr: ['neg','dim','pos'], typical: 'dim', weight: 0 }
      }
    },

    'LEF1': {
      category: 'CLL',
      fullName: 'Lymphoid enhancer-binding factor 1',
      diseases: {
        'CLL/SLL':                  { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'marcatore nucleare; alta specificità per CLL' },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: -1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'FMC7': {
      category: 'CLL',
      fullName: 'FMC7 (epitope of CD20)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 2,  note: 'negativo; criterio Matutes' },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'pos',  weight: 2 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos','br'],      typical: 'br',   weight: 1 },
        'HCL-variant':              { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'SMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 2 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 }
      }
    },

    'CD43': {
      category: 'CLL',
      fullName: 'Leukosialin (Sialophorin)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg','dim'],     typical: 'neg',  weight: 1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos','neg'],     typical: 'pos',  weight: 0,  note: 'variabile' },
        'LPL/WM':                   { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 1,  note: 'neg aiuta DD FL vs CLL' },
        'DLBCL-GCB':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['pos','neg'],     typical: 'pos',  weight: 0 }
      }
    },

    'CD81': {
      category: 'CLL',
      fullName: 'Tetraspanin-28 (TAPA-1)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','neg'],     typical: 'dim',  weight: 1,  note: 'dim/neg; supporta CLL' },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'pos',  weight: -1 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    /* ─── Mantle Cell Lymphoma panel ─── */
    'CyclinD1': {
      category: 'MCL',
      fullName: 'Cyclin D1 (CCND1, BCL-1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: -3, note: 'se positivo esclude CLL, cercare MCL' },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'pos',  weight: 3,  note: 'patognomonico; t(11;14)' },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 3 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','br'],     typical: 'pos',  weight: 3 },
        'HCL':                      { expr: ['neg','dim'],     typical: 'neg',  weight: 0,  note: 'raro dim; non confondere con MCL' },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: -2 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'SOX11': {
      category: 'MCL',
      fullName: 'SRY-box transcription factor 11',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: -3 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'nucleare; positivo nella forma classica' },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 2,  note: 'negativo; distingue dal classico' },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 2 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: -2 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    /* ─── Hairy Cell Leukemia panel ─── */
    'AnnexinA1': {
      category: 'HCL',
      fullName: 'Annexin A1 (ANXA1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 3,  note: 'patognomonico per HCL classica; negativo in HCL-v' },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 2,  note: 'negativo; chiave DD HCL vs HCL-v' },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: -2 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD103': {
      category: 'HCL',
      fullName: 'Integrin alphaE (ITGAE)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['pos','br'],      typical: 'pos',  weight: 2 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 2,  note: 'negativo; chiave DD SMZL vs HCL' },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD25': {
      category: 'HCL',
      fullName: 'IL-2 receptor alpha chain (IL2RA)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['pos','br'],      typical: 'pos',  weight: 2 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: -1, note: 'negativo; chiave DD HCL-v vs HCL' },
        'SMZL':                     { expr: ['neg','dim'],     typical: 'neg',  weight: 1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD11c': {
      category: 'HCL',
      fullName: 'Integrin alphaX (ITGAX, CR4)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['pos','br'],      typical: 'br',   weight: 2 },
        'HCL-variant':              { expr: ['pos','br'],      typical: 'pos',  weight: 2 },
        'SMZL':                     { expr: ['dim','pos','neg'], typical: 'dim', weight: 1,  note: 'variabile, debole' },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['pos','dim'],     typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD123': {
      category: 'HCL',
      fullName: 'IL-3 receptor alpha (IL3RA)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['br','pos'],      typical: 'br',   weight: 2,  note: 'bright; molto caratteristico' },
        'HCL-variant':              { expr: ['neg','dim'],     typical: 'neg',  weight: -1 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 2 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'TRAP': {
      category: 'HCL',
      fullName: 'Tartrate-resistant acid phosphatase (ACP5)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['pos','br'],      typical: 'pos',  weight: 2,  note: 'citochimica; forte positività' },
        'HCL-variant':              { expr: ['pos','dim'],     typical: 'dim',  weight: 1,  note: 'debole/variabile' },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: -1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    /* ─── Surface Immunoglobulins ─── */
    'sIg': {
      category: 'sIg',
      fullName: 'Surface immunoglobulin (sIgM/sIgD intensity)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','neg'],     typical: 'dim',  weight: 2,  note: 'debole; criterio Matutes' },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'br',   weight: 2,  note: 'moderata-forte (IgM/IgD)' },
        'MCL (leukemic non-nodal)': { expr: ['pos','br'],      typical: 'br',   weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','br'],     typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'HCL-variant':              { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'SMZL':                     { expr: ['br','pos'],      typical: 'br',   weight: 2,  note: 'forte IgM ± IgD' },
        'NMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['br','pos'],      typical: 'br',   weight: 2,  note: 'forte IgM' },
        'FL':                       { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos','neg','var'], typical: 'pos', weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','neg','var'], typical: 'pos', weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','neg','var'], typical: 'var', weight: 0 },
        'BL':                       { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['br','pos'],      typical: 'br',   weight: 1 }
      }
    },

    'IgM': {
      category: 'sIg',
      fullName: 'Immunoglobulin M (heavy chain mu)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','pos'],     typical: 'dim',  weight: 1 },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SMZL':                     { expr: ['br','pos'],      typical: 'br',   weight: 2,  note: 'forte; co-espresso con IgD in ~50%' },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['br','pos'],      typical: 'br',   weight: 2,  note: 'forte; componente monoclonale IgM' },
        'FL':                       { expr: ['pos','neg'],     typical: 'pos',  weight: 0,  note: 'variabile; class switch frequente' },
        'DLBCL-GCB':                { expr: ['pos','neg','var'], typical: 'var', weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','neg','var'], typical: 'var', weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','neg','var'], typical: 'var', weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 }
      }
    },

    'IgD': {
      category: 'sIg',
      fullName: 'Immunoglobulin D (heavy chain delta)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','pos','neg'], typical: 'dim', weight: 0 },
        'MCL (classical)':          { expr: ['pos','neg'],     typical: 'pos',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','neg'],    typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['pos','neg'],     typical: 'pos',  weight: 1,  note: '~50% coesprime IgD' },
        'NMZL':                     { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['pos','neg'],     typical: 'pos',  weight: 0 }
      }
    },

    'Kappa/Lambda': {
      category: 'sIg',
      fullName: 'Light chain restriction (κ or λ)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim'],           typical: 'dim',  weight: 1,  note: 'restrizione debole; rapporto >3:1 o <1:3' },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'pos',  weight: 1,  note: 'restrizione netta' },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 1 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 1 }
      }
    },

    /* ─── Germinal Center / FL / DLBCL panel ─── */
    'CD10': {
      category: 'GC',
      fullName: 'Neprilysin (MME, CALLA)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 2 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'FL':                       { expr: ['pos','br'],      typical: 'pos',  weight: 2,  note: 'marcatore del centro germinativo' },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 3,  note: 'positivo → fenotipo GCB (algoritmo Hans)' },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 2 },
        'DLBCL-DE':                 { expr: ['neg','pos'],     typical: 'neg',  weight: 1 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 2 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'BCL6': {
      category: 'GC',
      fullName: 'B-cell lymphoma 6 protein',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'nucleare; algoritmo Hans' },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 1,  note: 'neg o dimostrazione della mutazione' },
        'DLBCL-DE':                 { expr: ['pos','neg'],     typical: 'pos',  weight: 1 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'MUM1/IRF4': {
      category: 'GC',
      fullName: 'Multiple myeloma oncogene 1 / IRF4',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'MCL (classical)':          { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg','pos'],    typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 2,  note: 'neg → GCB (algoritmo Hans)' },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'pos → non-GCB / ABC (algoritmo Hans)' },
        'DLBCL-DE':                 { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SDRPL':                    { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg','var'],     typical: 'neg',  weight: 0 }
      }
    },

    'BCL2': {
      category: 'GC',
      fullName: 'B-cell lymphoma 2 (anti-apoptotic)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos','br'],      typical: 'pos',  weight: 2,  note: 'overespresso per t(14;18); DD FL vs reattivo' },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','br'],      typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','br'],      typical: 'br',   weight: 2,  note: 'double expressor: BCL2 + MYC' },
        'BL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 1,  note: 'neg/dim; DD BL vs DLBCL-DE' },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'MYC': {
      category: 'GC',
      fullName: 'MYC proto-oncogene (c-Myc)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','var'],    typical: 'pos',  weight: 1,  note: 'può essere elevato in blastoid' },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg','pos','var'], typical: 'var', weight: 0 },
        'DLBCL-ABC':                { expr: ['neg','pos','var'], typical: 'var', weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','br'],      typical: 'pos',  weight: 2,  note: 'double expressor: MYC ≥40% + BCL2 ≥50%' },
        'BL':                       { expr: ['pos','br'],      typical: 'br',   weight: 3,  note: '≥95% nuclei; t(8;14)' },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg','dim'],     typical: 'neg',  weight: 0 }
      }
    },

    /* ─── Proliferation ─── */
    'Ki-67': {
      category: 'misc',
      fullName: 'Proliferation marker Ki-67 (MKI67)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim'],           typical: 'dim',  weight: 1,  note: 'basso (<30%); se alto sospettare Richter' },
        'MCL (classical)':          { expr: ['pos','var'],     typical: 'pos',  weight: 1,  note: 'variabile (10-40%)' },
        'MCL (leukemic non-nodal)': { expr: ['dim'],           typical: 'dim',  weight: 1,  note: 'basso (<10%)' },
        'MCL (blastoid/pleomorphic)':{ expr: ['br','pos'],     typical: 'br',   weight: 2,  note: 'alto (>30-50%); aggressivo' },
        'HCL':                      { expr: ['dim'],           typical: 'dim',  weight: 0,  note: 'basso' },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['dim','pos'],     typical: 'dim',  weight: 0 },
        'NMZL':                     { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'EMZL/MALT':                { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'LPL/WM':                   { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'FL':                       { expr: ['dim','pos'],     typical: 'dim',  weight: 0,  note: 'basso nel grado 1-2; alto in grado 3B' },
        'DLBCL-GCB':                { expr: ['pos','br'],      typical: 'pos',  weight: 0,  note: 'alto (>40-60%)' },
        'DLBCL-ABC':                { expr: ['pos','br'],      typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['br','pos'],      typical: 'br',   weight: 1 },
        'BL':                       { expr: ['br'],            typical: 'br',   weight: 2,  note: '≥95%; caratteristico' },
        'SDRPL':                    { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    /* ─── Additional discriminating markers ─── */
    'CD38': {
      category: 'misc',
      fullName: 'Cyclic ADP ribose hydrolase',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','neg','var'], typical: 'var', weight: 0,  note: '≥30% = prognostico sfavorevole (IGHV non mutato)' },
        'MCL (classical)':          { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['var'],           typical: 'var',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['var'],           typical: 'var',  weight: 0 },
        'NMZL':                     { expr: ['var'],           typical: 'var',  weight: 0 },
        'EMZL/MALT':                { expr: ['var'],           typical: 'var',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'var',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'var',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','var'],     typical: 'var',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SDRPL':                    { expr: ['var'],           typical: 'var',  weight: 0 },
        'B-PLL':                    { expr: ['var'],           typical: 'var',  weight: 0 }
      }
    },

    'ZAP-70': {
      category: 'misc',
      fullName: 'Zeta-chain associated protein kinase 70',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','neg'],     typical: 'var',  weight: 0,  note: '≥20% = prognostico sfavorevole in CLL' },
        'MCL (classical)':          { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg','var'],    typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD30': {
      category: 'misc',
      fullName: 'TNFRSF8 (Ki-1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg','pos'],    typical: 'neg',  weight: 0,  note: 'raro positivo nei pleomorfici' },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: '10-20% pos; target terapeutico (brentuximab)' },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD138': {
      category: 'misc',
      fullName: 'Syndecan-1 (SDC1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['pos','dim'],     typical: 'dim',  weight: 1,  note: 'variabile; subset con differenziazione plasmocitica' },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'raro subset plasmoblastico' },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD148': {
      category: 'misc',
      fullName: 'Protein tyrosine phosphatase receptor type J (PTPRJ, DEP-1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['pos','br'],      typical: 'pos',  weight: 1,  note: 'utile nella DD HCL; fortemente positivo' },
        'HCL-variant':              { expr: ['pos','dim'],     typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    /* ─── Lineage / gating markers ─── */
    'CD45': {
      category: 'gate',
      fullName: 'Leukocyte common antigen (LCA, PTPRC)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','dim'],     typical: 'pos',  weight: 0 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['br'],            typical: 'br',   weight: 1,  note: 'bright; tipico dell\'HCL' },
        'HCL-variant':              { expr: ['br'],            typical: 'br',   weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 0 }
      }
    },

    'CD3': {
      category: 'gate',
      fullName: 'T-cell co-receptor (TCR complex)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 1,  note: 'negativo; esclude neoplasia T' },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 1 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 }
      }
    },

    'CD34': {
      category: 'gate',
      fullName: 'LUMIApoietic progenitor cell antigen CD34',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 1,  note: 'negativo in neoplasie B mature' },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 1 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 }
      }
    },

    'TdT': {
      category: 'gate',
      fullName: 'Terminal deoxynucleotidyl transferase (DNTT)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 1,  note: 'negativo; se pos → riclassificare come B-ALL' },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg','pos'],    typical: 'neg',  weight: 1,  note: 'raramente positivo nella variante blastoide' },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 }
      }
    },

    /* ─── Additional CLL/SLL and MZL markers ─── */
    'CD49d': {
      category: 'CLL',
      fullName: 'Integrin alpha-4 (VLA-4, ITGA4)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','neg','var'], typical: 'var', weight: 1,  note: 'prognostico: ≥30% = sfavorevole; correla con IgHV non mutato' },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos','dim'],     typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'CD305': {
      category: 'CLL',
      fullName: 'LAIR1 (Leukocyte-associated immunoglobulin-like receptor 1)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','br'],      typical: 'pos',  weight: 1,  note: 'tipicamente positivo nella CLL' },
        'MCL (classical)':          { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg','dim'],    typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'NMZL':                     { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'EMZL/MALT':                { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'LPL/WM':                   { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'FL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'B-PLL':                    { expr: ['dim','neg'],     typical: 'dim',  weight: 0 }
      }
    },

    'CD180': {
      category: 'CLL',
      fullName: 'Toll-like receptor homolog RP105 (LY64)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 1,  note: 'tipicamente negativo/debole nella CLL' },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1,  note: 'negativo; utile nella DD' },
        'HCL-variant':              { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 1,  note: 'bright; marker utile per SMZL' },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SDRPL':                    { expr: ['pos','br'],      typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'CD24': {
      category: 'pan-B',
      fullName: 'Heat-stable antigen (HSA, BA-1)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','neg'],     typical: 'dim',  weight: 1,  note: 'debole/negativo nella CLL; positivo nella maggior parte B-LPD' },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1,  note: 'tipicamente negativo nell\'HCL' },
        'HCL-variant':              { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos','br'],      typical: 'pos',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'CD27': {
      category: 'misc',
      fullName: 'TNF receptor superfamily member 7 (TNFRSF7)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','dim'],     typical: 'pos',  weight: 0,  note: 'generalmente positivo; marker di memoria B' },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','neg'],    typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['pos','br'],      typical: 'pos',  weight: 0,  note: 'tipicamente positivo nella zona marginale' },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos','br'],      typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['var'],           typical: 'var',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'CD56': {
      category: 'gate',
      fullName: 'Neural cell adhesion molecule (NCAM1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 1 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'raramente pos; se presente → consider T/NK o plasmablastico' },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 1 }
      }
    },

    /* ─── Additional MZL / differentiation markers ─── */
    'MNDA': {
      category: 'misc',
      fullName: 'Myeloid nuclear differentiation antigen',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'positivo nucleare; marker per linfomi della zona marginale' },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'LPL/WM':                   { expr: ['pos','dim'],     typical: 'pos',  weight: 1 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: -1 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['pos','dim'],     typical: 'pos',  weight: 1 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'IRTA1': {
      category: 'misc',
      fullName: 'Immunoglobulin superfamily receptor translocation-associated 1 (FCRL4)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'marker di zona marginale; IHC su biopsia' },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'LPL/WM':                   { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: -1 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'HGAL': {
      category: 'GC',
      fullName: 'Human germinal center-associated lymphoma protein (GCET2)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'marker GC specifico; utile per confermare origine GC' },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: -1 },
        'DLBCL-DE':                 { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'LMO2': {
      category: 'GC',
      fullName: 'LIM domain only 2 (Rhombotin-2)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 2,  note: 'marker GC sulla IHC; utile per subtyping DLBCL' },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 2 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: -1 },
        'DLBCL-DE':                 { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'Stathmin': {
      category: 'MCL',
      fullName: 'Stathmin 1 (STMN1, Oncoprotein 18)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['pos','br'],      typical: 'pos',  weight: 1,  note: 'sovraespresso nel MCL; utile se Ciclina D1 equivoca' },
        'MCL (leukemic non-nodal)': { expr: ['pos','dim'],     typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['br'],           typical: 'br',   weight: 2,  note: 'intensamente positivo nella variante blastoide' },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos','br'],      typical: 'br',   weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg','dim'],     typical: 'neg',  weight: 0 }
      }
    },

    'CD15': {
      category: 'misc',
      fullName: 'Lewis X antigen (SSEA-1, FUT4)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0,  note: 'negativo; se pos → considerare Hodgkin o granulociti' }
      }
    },

    'CD71': {
      category: 'misc',
      fullName: 'Transferrin receptor 1 (TFRC)',
      diseases: {
        'CLL/SLL':                  { expr: ['dim','neg'],     typical: 'dim',  weight: 0 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','br'],     typical: 'pos',  weight: 0,  note: 'alto nella variante blastoide (proliferazione elevata)' },
        'HCL':                      { expr: ['pos','br'],      typical: 'pos',  weight: 1,  note: 'tipicamente positivo nell\'HCL' },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['dim','pos'],     typical: 'dim',  weight: 0 },
        'NMZL':                     { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'EMZL/MALT':                { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos','dim'],     typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos','br'],      typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','br'],      typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['br'],            typical: 'br',   weight: 0 },
        'BL':                       { expr: ['br'],            typical: 'br',   weight: 0 },
        'SDRPL':                    { expr: ['dim'],           typical: 'dim',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'CD44': {
      category: 'misc',
      fullName: 'Hyaluronic acid receptor (Pgp-1, Hermes)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 1,  note: 'negativo/debole nel FL; positivo nelle B normali del mantello' },
        'DLBCL-GCB':                { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'IgG': {
      category: 'sIg',
      fullName: 'Immunoglobulin G (catena pesante gamma)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'rara class-switch; la maggior parte è IgM/IgD' },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'rara class-switch nella variante non-nodale' },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: -1, note: 'per definizione IgM nel WM' },
        'FL':                       { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos','neg'],     typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg','pos'],     typical: 'neg',  weight: 0 }
      }
    },

    'IgA': {
      category: 'sIg',
      fullName: 'Immunoglobulin A (catena pesante alpha)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'subset IgA+ specialmente nel MALT gastrico' },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: -1 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 }
      }
    },

    'CD9': {
      category: 'misc',
      fullName: 'Tetraspanin 29 (MRP-1, TSPAN29)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','br'],      typical: 'pos',  weight: 0 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['pos','br'],      typical: 'br',   weight: 0 },
        'HCL-variant':              { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['neg','dim'],     typical: 'neg',  weight: 1,  note: 'tipicamente negativo nel FL; marker del mantello' },
        'DLBCL-GCB':                { expr: ['neg','var'],     typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','var'],     typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['var'],           typical: 'var',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    },

    'CD26': {
      category: 'misc',
      fullName: 'Dipeptidyl peptidase IV (DPP4)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0,  note: 'marker T-cell; negativo sulle B; utile per escludere T-PLL' }
      }
    },

    /* ─── Molecular / genetic markers ─── */
    'TP53': {
      category: 'molecular',
      fullName: 'Tumor protein p53 (TP53, LFS1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'p53 overespresso (IHC) correla con del(17p)/mutazione TP53; prognostico sfavorevole' },
        'MCL (classical)':          { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'sovraespressione nel 20-30%; prognosi peggiore' },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos','br'],     typical: 'pos',  weight: 1,  note: 'frequente nella variante blastoide; fortemente sfavorevole' },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg','pos'],     typical: 'neg',  weight: 0,  note: 'acquisizione di mut TP53 → trasformazione a DLBCL' },
        'DLBCL-GCB':                { expr: ['neg','pos'],     typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos','neg'],     typical: 'pos',  weight: 0,  note: 'mutazione TP53 più frequente nel sottotipo ABC' },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 1 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['pos','neg'],     typical: 'pos',  weight: 1,  note: 'del(17p) nel 50% dei B-PLL' }
      }
    },

    'CD57': {
      category: 'gate',
      fullName: 'NK-1, HNK-1 (B3GAT1)',
      diseases: {
        'CLL/SLL':                  { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (classical)':          { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['neg'],          typical: 'neg',  weight: 0 },
        'HCL':                      { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'HCL-variant':              { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'NMZL':                     { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'EMZL/MALT':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'LPL/WM':                   { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'FL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-GCB':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-ABC':                { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'DLBCL-DE':                 { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'BL':                       { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'SDRPL':                    { expr: ['neg'],           typical: 'neg',  weight: 0 },
        'B-PLL':                    { expr: ['neg'],           typical: 'neg',  weight: 0,  note: 'marker NK/T; negativo sulle B; esclude T-LGL' }
      }
    },

    'CD11a': {
      category: 'misc',
      fullName: 'Integrin alpha-L (LFA-1, ITGAL)',
      diseases: {
        'CLL/SLL':                  { expr: ['pos','dim'],     typical: 'dim',  weight: 0 },
        'MCL (classical)':          { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (leukemic non-nodal)': { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'MCL (blastoid/pleomorphic)':{ expr: ['pos'],          typical: 'pos',  weight: 0 },
        'HCL':                      { expr: ['neg','dim'],     typical: 'neg',  weight: 1,  note: 'ridotto/assente nell\'HCL classico; DD con SMZL' },
        'HCL-variant':              { expr: ['pos','dim'],     typical: 'dim',  weight: 0 },
        'SMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'NMZL':                     { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'EMZL/MALT':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'LPL/WM':                   { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'FL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-GCB':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-ABC':                { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'DLBCL-DE':                 { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'BL':                       { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'SDRPL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 },
        'B-PLL':                    { expr: ['pos'],           typical: 'pos',  weight: 0 }
      }
    }
  });

  /* ══════════════════════════════════════════
   *  Derived lookups
   * ══════════════════════════════════════════ */
  const ALL_MARKERS = Object.freeze(Object.keys(MARKER_TABLE));

  const CATEGORIES = Object.freeze([...new Set(ALL_MARKERS.map(m => MARKER_TABLE[m].category))]);

  function markersByCategory() {
    const map = {};
    for (const cat of CATEGORIES) map[cat] = [];
    for (const m of ALL_MARKERS) map[MARKER_TABLE[m].category].push(m);
    return map;
  }

  function profileOf(disease) {
    const profile = {};
    for (const [marker, data] of Object.entries(MARKER_TABLE)) {
      if (data.diseases[disease]) {
        profile[marker] = { ...data.diseases[disease] };
      }
    }
    return profile;
  }

  /* ── Public API ── */
  const api = {
    markers()          { return [...ALL_MARKERS]; },
    categories()       { return [...CATEGORIES]; },
    diseases()         { return [...ALL_DISEASES]; },
    table()            { return JSON.parse(JSON.stringify(MARKER_TABLE)); },
    markersByCategory,
    profileOf,
    markerKeys: ALL_MARKERS,
    diseaseKeys: ALL_DISEASES
  };

  global.CDBLPDData = Object.freeze(api);

})(window);
