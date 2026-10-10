/*! fil-fitness-data.js — FIL sGA / EPI constants & scales
 *
 *  Reference: Merli F. et al., JCO 2021;39(11):1214-1222
 *  DOI: 10.1200/JCO.20.02465
 *
 *  Espone: window.FILFitnessData
 *  Dipendenze: nessuna
 *  Pattern: IIFE su window
 */
(function (global) {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
   *  ADL — Katz Index of Independence in Activities of Daily Living
   *  Score: 1 punto per ogni attività svolta in modo indipendente
   *  Range: 0 (totalmente dipendente) – 6 (totalmente indipendente)
   * ═══════════════════════════════════════════════════════════════ */
  var ADL_ITEMS = [
    { id: 'bathing',     label: 'Fare il bagno',   desc: 'Si lava completamente senza assistenza o necessitando aiuto solo per una parte del corpo' },
    { id: 'dressing',    label: 'Vestirsi',        desc: 'Si veste completamente senza assistenza, escluso allacciarsi le scarpe' },
    { id: 'toileting',   label: 'Igiene personale', desc: 'Va in bagno, si pulisce e si riveste senza assistenza' },
    { id: 'transferring', label: 'Trasferimento',   desc: 'Si alza e si siede dalla sedia/letto senza assistenza' },
    { id: 'continence',  label: 'Continenza',      desc: 'Controlla completamente minzione e defecazione' },
    { id: 'feeding',     label: 'Alimentazione',   desc: 'Si alimenta senza assistenza (consentito tagliare il cibo)' }
  ];

  /* ADL score → sGA domain score */
  function adlDomainScore(adlTotal) {
    if (adlTotal >= 6) return 0;
    if (adlTotal === 5) return 1;
    return 2; /* ≤4 */
  }

  /* ═══════════════════════════════════════════════════════════════
   *  IADL — Lawton Instrumental Activities of Daily Living Scale
   *  Score: 1 punto per ogni attività svolta in modo indipendente
   *  Range: 0–8 (donne), 0–5 (uomini, escludendo cucina, pulizie, bucato)
   * ═══════════════════════════════════════════════════════════════ */
  var IADL_ITEMS = [
    { id: 'telephone',  label: 'Usare il telefono',        desc: 'Usa il telefono di propria iniziativa', gender: 'all' },
    { id: 'shopping',   label: 'Fare la spesa',            desc: 'Fa la spesa per tutti gli acquisti necessari in modo indipendente', gender: 'all' },
    { id: 'cooking',    label: 'Preparare i pasti',        desc: 'Pianifica, prepara e serve pasti adeguati in modo indipendente', gender: 'F' },
    { id: 'housework',  label: 'Cura della casa',          desc: 'Mantiene la casa da solo o con assistenza occasionale per lavori pesanti', gender: 'F' },
    { id: 'laundry',    label: 'Fare il bucato',           desc: 'Fa il bucato personale completamente', gender: 'F' },
    { id: 'transport',  label: 'Uso mezzi di trasporto',   desc: 'Viaggia in modo indipendente con mezzi pubblici o guida l\'auto', gender: 'all' },
    { id: 'medication', label: 'Gestione farmaci',         desc: 'Assume i farmaci nelle dosi corrette e negli orari giusti', gender: 'all' },
    { id: 'finances',   label: 'Gestione finanze',         desc: 'Gestisce le finanze in modo indipendente', gender: 'all' }
  ];

  /**
   * Restituisce gli item IADL applicabili per genere.
   * @param {string} gender 'M' o 'F'
   */
  function iadlItemsForGender(gender) {
    if (gender === 'M') {
      return IADL_ITEMS.filter(function (it) { return it.gender === 'all'; });
    }
    return IADL_ITEMS; /* F → tutti gli 8 item */
  }

  /**
   * IADL score → sGA domain score (gender-specific cutoffs)
   * F: 8=0, 6–7=1, ≤5=2
   * M: 5=0, 3–4=1, ≤2=2
   */
  function iadlDomainScore(iadlTotal, gender) {
    if (gender === 'M') {
      if (iadlTotal >= 5) return 0;
      if (iadlTotal >= 3) return 1;
      return 2;
    }
    /* F */
    if (iadlTotal >= 8) return 0;
    if (iadlTotal >= 6) return 1;
    return 2;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  CIRS-G — Cumulative Illness Rating Scale for Geriatrics
   *  14 categorie organo, ciascuna con grado 0-4
   *  0 = nessun problema
   *  1 = problema lieve / disturbo passato
   *  2 = disabilità moderata / necessita trattamento di prima linea
   *  3 = disabilità severa / costante e significativa
   *  4 = problema estremamente severo / richiede trattamento urgente
   * ═══════════════════════════════════════════════════════════════ */
  var CIRS_CATEGORIES = [
    { id: 'cardiac',       label: 'Patologie cardiache',            example: 'Insufficienza cardiaca, coronaropatia, aritmie' },
    { id: 'vascular',      label: 'Ipertensione / Patologie vascolari', example: 'Ipertensione, vasculopatie periferiche, aneurismi' },
    { id: 'hematologic',   label: 'Patologie ematologiche',         example: 'Anemia, leucopenia, coagulopatie' },
    { id: 'respiratory',   label: 'Patologie respiratorie',         example: 'BPCO, asma, fibrosi polmonare' },
    { id: 'oorl',          label: 'Occhi, orecchie, naso, laringe', example: 'Glaucoma, cataratta, ipoacusia, sinusite cronica' },
    { id: 'gi_upper',      label: 'Apparato GI superiore',          example: 'Esofagite, ulcera gastrica, ernia iatale' },
    { id: 'gi_lower',      label: 'Apparato GI inferiore',          example: 'Malattia diverticolare, stipsi cronica, IBD' },
    { id: 'hepatic',       label: 'Patologie epatiche',             example: 'Epatopatia cronica, cirrosi, steatosi' },
    { id: 'renal',         label: 'Patologie renali',               example: 'Insufficienza renale, nefropatia diabetica, calcolosi' },
    { id: 'genitourinary', label: 'Apparato genitourinario',        example: 'IPB, incontinenza, infezioni ricorrenti' },
    { id: 'musculoskeletal', label: 'Apparato muscolo-scheletrico', example: 'Artrite, osteoporosi, fratture vertebrali' },
    { id: 'neurological',  label: 'Patologie neurologiche',         example: 'Neuropatia, Parkinson, ictus pregresso, demenza' },
    { id: 'endocrine',     label: 'Patologie endocrino-metaboliche', example: 'Diabete mellito, ipotiroidismo, obesit\u00e0' },
    { id: 'psychiatric',   label: 'Patologie psichiatrico-comportamentali', example: 'Depressione, ansia, disturbi cognitivi' }
  ];

  var CIRS_GRADES = [
    { value: 0, label: 'Nessun problema' },
    { value: 1, label: 'Problema lieve / pregresso' },
    { value: 2, label: 'Disabilit\u00e0 moderata' },
    { value: 3, label: 'Disabilit\u00e0 severa / significativa' },
    { value: 4, label: 'Estremamente severo / urgente' }
  ];

  /**
   * Calcola metriche CIRS-G da un array di 14 gradi (0–4)
   * @param {number[]} grades — array di 14 valori
   * @returns {{ totalScore: number, severityIndex: number, nSevere: number }}
   */
  function cirsMetrics(grades) {
    var totalScore = 0;
    var nRated = 0;
    var nSevere = 0;
    for (var i = 0; i < grades.length; i++) {
      var g = grades[i] || 0;
      totalScore += g;
      if (g > 0) nRated++;
      if (g >= 3) nSevere++;
    }
    return {
      totalScore: totalScore,
      severityIndex: nRated > 0 ? +(totalScore / nRated).toFixed(2) : 0,
      nSevere: nSevere
    };
  }

  /**
   * CIRS nSevere → sGA domain score
   * 0 comorbidità grado≥3 → 0
   * 1 comorbidità grado≥3 → 1
   * ≥2 comorbidità grado≥3 → 2
   */
  function cirsDomainScore(nSevere) {
    if (nSevere === 0) return 0;
    if (nSevere === 1) return 1;
    return 2;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  Età — domain score
   *  ≤75 → 0 | 76–80 → 1 | >80 → 2
   * ═══════════════════════════════════════════════════════════════ */
  function ageDomainScore(age) {
    if (age <= 75) return 0;
    if (age <= 80) return 1;
    return 2;
  }

  /* ═══════════════════════════════════════════════════════════════
   *  sGA classification (worst-domain logic)
   *  Fit  = tutti i domini 0
   *  Unfit = ≥1 dominio = 1, nessun dominio = 2
   *  Frail = ≥1 dominio = 2
   * ═══════════════════════════════════════════════════════════════ */
  var SGA_CLASSES = [
    { key: 'fit',   label: 'Fit',   color: '#10b981' },
    { key: 'unfit', label: 'Unfit', color: '#f59e0b' },
    { key: 'frail', label: 'Frail', color: '#ef4444' }
  ];

  /**
   * @param {{ age: number, adl: number, iadl: number, cirs: number }} domainScores
   * @returns {{ key: string, label: string, color: string }}
   */
  function sgaClassify(domainScores) {
    var max = Math.max(domainScores.age, domainScores.adl, domainScores.iadl, domainScores.cirs);
    if (max >= 2) return SGA_CLASSES[2]; /* Frail */
    if (max >= 1) return SGA_CLASSES[1]; /* Unfit */
    return SGA_CLASSES[0]; /* Fit */
  }

  /* ═══════════════════════════════════════════════════════════════
   *  EPI — Elderly Prognostic Index
   *  sGA (Fit 0 / Unfit 1 / Frail 2) + IPI mapping + Hb
   * ═══════════════════════════════════════════════════════════════ */

  /** IPI (0–5) → EPI sub-score: 0–2→0, 3→1, 4–5→2 */
  function ipiToEpi(ipi) {
    if (ipi <= 2) return 0;
    if (ipi === 3) return 1;
    return 2;
  }

  /** Hb (g/dL) → EPI sub-score: <12→1, ≥12→0 */
  function hbToEpi(hb) {
    return hb < 12 ? 1 : 0;
  }

  var EPI_RISKS = [
    { key: 'low',          label: 'Low risk',          color: '#10b981', range: '0\u20131' },
    { key: 'intermediate', label: 'Intermediate risk',  color: '#f59e0b', range: '2\u20133' },
    { key: 'high',         label: 'High risk',          color: '#ef4444', range: '4\u20135' }
  ];

  /**
   * @param {number} epiScore 0–5
   * @returns {{ key: string, label: string, color: string, range: string }}
   */
  function epiClassify(epiScore) {
    if (epiScore <= 1) return EPI_RISKS[0];
    if (epiScore <= 3) return EPI_RISKS[1];
    return EPI_RISKS[2];
  }

  /* ═══════════════════════════════════════════════════════════════
   *  ECOG PS — informativo (non entra nel calcolo sGA)
   * ═══════════════════════════════════════════════════════════════ */
  var ECOG_OPTIONS = [
    { value: 0, label: '0 \u2014 Completamente attivo' },
    { value: 1, label: '1 \u2014 Limitato in attivit\u00e0 faticose, deambulante' },
    { value: 2, label: '2 \u2014 Deambulante, capace di autocura, non lavoro' },
    { value: 3, label: '3 \u2014 Autocura limitata, a letto/sedia >50% del tempo' },
    { value: 4, label: '4 \u2014 Completamente disabile, allettato' }
  ];

  /* ═══════════════════════════════════════════════════════════════
   *  Public API
   * ═══════════════════════════════════════════════════════════════ */
  global.FILFitnessData = {
    /* ADL */
    ADL_ITEMS:        ADL_ITEMS,
    adlDomainScore:   adlDomainScore,

    /* IADL */
    IADL_ITEMS:       IADL_ITEMS,
    iadlItemsForGender: iadlItemsForGender,
    iadlDomainScore:  iadlDomainScore,

    /* CIRS-G */
    CIRS_CATEGORIES:  CIRS_CATEGORIES,
    CIRS_GRADES:      CIRS_GRADES,
    cirsMetrics:      cirsMetrics,
    cirsDomainScore:  cirsDomainScore,

    /* Età */
    ageDomainScore:   ageDomainScore,

    /* sGA */
    SGA_CLASSES:      SGA_CLASSES,
    sgaClassify:      sgaClassify,

    /* EPI */
    ipiToEpi:         ipiToEpi,
    hbToEpi:          hbToEpi,
    EPI_RISKS:        EPI_RISKS,
    epiClassify:      epiClassify,

    /* ECOG */
    ECOG_OPTIONS:     ECOG_OPTIONS
  };

})(window);
