/*! cd-b-lpd-knowledge.js — Marker Knowledge Base (NordiQC / PubMed)
 *  Pure data: aliases, gene, MW, structure, distribution, function, clinical, clones
 *  for each marker used in the CD-Based B-LPD diagnostic panel.
 *  Exposes: window.CDBLPDKnowledge
 */
(function(global) {
  'use strict';
  global.CDBLPDKnowledge = {
  'CD19': {
    aliases: 'B4, Leu-12',
    gene: 'CD19 â€” 16p11.2',
    mw: '95 kDa',
    structure: 'Glicoproteina transmembrana tipo I, superfamiglia Ig con 2 domini Ig-like extracellulari.',
    distribution: 'Cellule B dal pre-B precoce al linfocita B maturo. Perso allo stadio plasmacellulare. Assente su T, NK e cellule mieloidi.',
    fn: 'Co-recettore critico del complesso BCR, forma unitÃ  di segnalazione con CD21 (CR2) e CD81 (TAPA-1). Riduce la soglia di attivazione del BCR modulando le vie Src/PI3K/Akt. Essenziale per lo sviluppo B e le risposte immunitarie umorali.',
    clinical: 'Marker pan-B universale nel pannello di citometria a flusso per neoplasie B. Target terapeutico: blinatumomab (BiTE anti-CD3Ã—CD19), CAR-T (tisagenlecleucel, axicabtagene ciloleucel, lisocabtagene), tafasitamab (Fc-enhanced), loncastuximab tesirine (ADC).',
    clones: 'HIB19, SJ25C1, FMC63 (riferimento CAR-T), LE-CD19'
  },
  'CD20': {
    aliases: 'B1, Leu-16, MS4A1',
    gene: 'MS4A1 â€” 11q12.2',
    mw: '33â€“37 kDa',
    structure: 'Proteina tetraspanina non glicosilata con 4 domini transmembrana. Forma oligomeri nella membrana.',
    distribution: 'Cellule B dal pre-B tardivo al linfocita B maturo attivato. Non espresso su pro-B precoci e plasmacellule. Assente su cellule staminali.',
    fn: 'Canale del calcio necessario per l\'attivazione e la proliferazione B-cellulare. Regola la progressione del ciclo cellulare dal G1 alla fase S. Ruolo nella segnalazione BCR-indipendente.',
    clinical: 'Target terapeutico primario in oncoematologia: rituximab, obinutuzumab, ofatumumab, ocrelizumab. L\'intensitÃ  (dim vs bright) Ã¨ criterio diagnostico: dim nella CLL/SLL (Matutes), bright nelle altre B-LPD.',
    clones: 'L26 (IHC), 2H7, rituximab (terapeutico)'
  },
  'CD22': {
    aliases: 'BL-CAM, Siglec-2, Leu-14',
    gene: 'CD22 â€” 19q13.12',
    mw: '135 kDa',
    structure: 'Glicoproteina transmembrana tipo I, famiglia Siglec (7 domini Ig-like). Lega acido sialico.',
    distribution: 'Cellule B mature circolanti e tessutali. Espressione debole su pre-B midollari. Assente su plasmacellule.',
    fn: 'Recettore inibitorio della segnalazione BCR. Contiene motivi ITIM citoplasmatici che reclutano SHP-1. Regola la soglia di attivazione B e la sopravvivenza cellulare.',
    clinical: 'Debole/negativo nella CLL. Target di inotuzumab ozogamicin (ADC) e moxetumomab pasudotox (immunotossina, approvata per HCL). Utile nella DD delle B-LPD.',
    clones: 'FPC1, S-HCL-1, RFB4 (terapeutico)'
  },
  'CD79a': {
    aliases: 'IgÎ±, MB-1',
    gene: 'CD79A â€” 19q13.2',
    mw: '47 kDa (glicosilato)',
    structure: 'Glicoproteina transmembrana tipo I con un singolo dominio Ig-like extracellulare e motivo ITAM citoplasmatico.',
    distribution: 'Cellule B dal pro-B precoce alla plasmacellula (piÃ¹ ampio di CD20). Marker pan-B attraverso tutto il differenziamento.',
    fn: 'Componente eterodimerica del complesso BCR (con CD79b/IgÎ²). Trasduttore del segnale tramite motivo ITAM che recluta Syk e BLNK. Indispensabile per l\'espressione di superficie del BCR.',
    clinical: 'Marker pan-B per IHC, utile quando CD20 Ã¨ negativo (post-rituximab, mieloma). Mutazioni CD79A/B frequenti nel DLBCL-ABC (via NF-ÎºB), target per ibrutinib.',
    clones: 'JCB117, HM47/A9, SP18'
  },
  'CD79b': {
    aliases: 'IgÎ², B29',
    gene: 'CD79B â€” 17q23.3',
    mw: '37 kDa',
    structure: 'Glicoproteina transmembrana simile a CD79a, con dominio Ig-like e motivo ITAM citoplasmatico.',
    distribution: 'Cellule B dal pre-B alla B matura. Espressione di superficie richiede eterodimero con CD79a. Ridotto/assente nella CLL.',
    fn: 'Componente del complesso di segnalazione del BCR insieme a CD79a. Entrambi i motivi ITAM sono necessari per la piena trasduzione del segnale.',
    clinical: 'Negativo/debole nella CLL (criterio Matutes). Target di polatuzumab vedotin (ADC anti-CD79b, approvato per DLBCL). Mutazioni Y196 attivano il BCR nel DLBCL-ABC.',
    clones: 'SN8, CB3-1'
  },
  'CD5': {
    aliases: 'Leu-1, T1',
    gene: 'CD5 â€” 11q12.2',
    mw: '67 kDa',
    structure: 'Glicoproteina transmembrana tipo I della superfamiglia SRCR (scavenger receptor cysteine-rich).',
    distribution: 'Maggior parte dei linfociti T (pan-T). Subset di cellule B (B-1a). Forte nella CLL e MCL.',
    fn: 'Modulatore negativo della segnalazione TCR e BCR. Recluta SHP-1 attenuando le risposte. Nelle cellule B marca il subset B1a coinvolto nell\'immunitÃ  innata.',
    clinical: 'Coespressione CD5+CD19+ Ã¨ hallmark della CLL/SLL e MCL. DD fondamentale: CLL vs zone marginali (CD5âˆ’). MCL: CD5+/CD23âˆ’ vs CLL: CD5+/CD23+.',
    clones: 'L17F12, UCHT2, 4C7'
  },
  'CD23': {
    aliases: 'FcÎµRII, FCER2, BLAST-2',
    gene: 'FCER2 â€” 19p13.2',
    mw: '45 kDa (lectina tipo C)',
    structure: 'Recettore di superficie tipo II (N-term intracellulare). Lectina di tipo C. Forma trimeri. Rilasciato per clivaggio proteolitico come sCD23.',
    distribution: 'Cellule B attivate, cellule dendritiche follicolari, eosinofili, piastrine. Indotto dall\'IL-4.',
    fn: 'Recettore a bassa affinitÃ  per IgE. Regola la sintesi di IgE e la presentazione dell\'antigene. sCD23 solubile con attivitÃ  citochinica. Ruolo nella sopravvivenza B via NF-ÎºB.',
    clinical: 'Criterio Matutes: CLL tipicamente CD23+, MCL CD23âˆ’. Distinzione fondamentale per DD CLL vs MCL (entrambi CD5+). sCD23 sierico correla con carico tumorale nella CLL.',
    clones: 'MHM6, BU38, EBVCS-5'
  },
  'CD200': {
    aliases: 'OX-2, MRC',
    gene: 'CD200 â€” 3q13.2',
    mw: '41â€“47 kDa',
    structure: 'Glicoproteina transmembrana tipo I con 2 domini Ig-like. Membro della superfamiglia immunoglobulinica.',
    distribution: 'Cellule B, subset T (Th2), neuroni, cellule endoteliali, cellule stromali del midollo.',
    fn: 'Ligando immunomodulatorio che interagisce con CD200R1 su monociti e macrofagi, inibendo la loro attivazione. Segnali immunosoppressivi che modificano il microambiente tumorale.',
    clinical: 'Fortemente espresso nella CLL (>95%), tipicamente negativo nel MCL. Utile nella DD CLL vs MCL quando CD23 Ã¨ equivoco. Elevato anche nell\'HCL.',
    clones: 'OX-104, MRC OX-68'
  },
  'LEF1': {
    aliases: 'Lymphoid Enhancer Factor 1, TCF10',
    gene: 'LEF1 â€” 4q25',
    mw: '44 kDa (fattore nucleare)',
    structure: 'Fattore di trascrizione nucleare della famiglia TCF/LEF. Dominio HMG-box per legame al DNA e dominio di interazione con Î²-catenina.',
    distribution: 'Linfociti T e B, specialmente cellule della CLL. Espresso in tessuti embrionali, follicoli piliferi, colon.',
    fn: 'Mediatore della via Wnt/Î²-catenina. Attiva la trascrizione di geni target (MYC, ciclina D1, survivina). Promuove la sopravvivenza cellulare.',
    clinical: 'Sovraespresso nella CLL/SLL. Marker nucleare altamente specifico per CLL nella DD con altri linfomi B a piccole cellule. Negativo nel MCL e nei linfomi marginali.',
    clones: 'EPR2029Y, anti-LEF1 policlonale'
  },
  'FMC7': {
    aliases: 'FMC7 epitope (conformazionale su CD20)',
    gene: 'MS4A1 â€” 11q12.2 (epitopo conformazionale)',
    mw: '~35 kDa (epitopo di CD20)',
    structure: 'Epitopo conformazionale presente sulla proteina CD20 quando completamente matura nella membrana. Non Ã¨ una molecola separata.',
    distribution: 'Cellule B mature con piena espressione di CD20. Assente quando CD20 Ã¨ debole (come nella CLL).',
    fn: 'Riflette lo stato conformazionale maturo di CD20 nella membrana. L\'assenza nella CLL corrisponde all\'espressione dim di CD20.',
    clinical: 'Criterio Matutes: negativo nella CLL (score +1), positivo nella maggior parte delle altre B-LPD. Il pattern FMC7âˆ’/CD20 dim Ã¨ quasi patognomonico per CLL.',
    clones: 'FMC7 (unico clone disponibile)'
  },
  'CD43': {
    aliases: 'Sialophorin, Leukosialin, SPN',
    gene: 'SPN â€” 16p11.2',
    mw: '95â€“135 kDa (altamente glicosilato)',
    structure: 'Sialomucina transmembrana tipo I, pesantemente O-glicosilata. Dominio extracellulare esteso con sialilazione densa.',
    distribution: 'Linfociti T, monociti, granulociti, piastrine, cellule staminali. Normalmente assente su cellule B mature (espressione aberrante nelle B-LPD).',
    fn: 'Molecola anti-adesiva (carica negativa). Regola l\'interazione cellula-cellula. Ruolo nella migrazione leucocitaria e nell\'attivazione T.',
    clinical: 'Espressione aberrante sulle cellule B Ã¨ reperto patologico. Positivo in CLL/SLL, MCL, BL. Negativo nella maggior parte FL e DLBCL. Utile per DD con linfomi della zona marginale.',
    clones: 'L10, DF-T1, MT1'
  },
  'CD81': {
    aliases: 'TAPA-1, Target of Antiproliferative Antibody 1',
    gene: 'CD81 â€” 11p15.5',
    mw: '26 kDa',
    structure: 'Tetraspanina con 4 domini transmembrana. Forma complesso con CD19 e CD21 (complesso co-recettoriale B).',
    distribution: 'Espressione ubiquitaria su leucociti. Sulle cellule B forma il complesso co-recettoriale CD19/CD21/CD81.',
    fn: 'Componente del complesso co-recettoriale del BCR. Co-recettore per l\'ingresso del virus HCV. Regola la soglia di attivazione B insieme a CD19.',
    clinical: 'Ridotto nella CLL rispetto alle B normali. Marker accessorio. L\'associazione HCV-linfoma B Ã¨ mediata in parte da CD81.',
    clones: '5A6, JS-81'
  },
  'CyclinD1': {
    aliases: 'CCND1, BCL-1, PRAD1',
    gene: 'CCND1 â€” 11q13.3',
    mw: '34 kDa (proteina nucleare)',
    structure: 'Ciclina di tipo D, regolatore del ciclo cellulare. Forma complesso con CDK4/CDK6 per fosforilare Rb.',
    distribution: 'Normalmente espressa in modo ciclico durante G1. Non espressa nelle cellule B normali (sovraespressione aberrante nel MCL).',
    fn: 'Regolatore chiave della transizione G1â†’S del ciclo cellulare. La sovraespressione porta a proliferazione incontrollata e accumulo di danno genomico.',
    clinical: 'Sovraespressione patognomonica del MCL, causata dalla t(11;14)(q13;q32) che giustappone CCND1 al locus IgH. Presente in >95% dei MCL classici. Gold standard diagnostico per MCL.',
    clones: 'SP4, EP12, DCS-6'
  },
  'SOX11': {
    aliases: 'SRY-Box Transcription Factor 11',
    gene: 'SOX11 â€” 2p25.2',
    mw: '47 kDa (fattore nucleare)',
    structure: 'Fattore di trascrizione nucleare della famiglia SOX, con dominio HMG-box per legame al DNA.',
    distribution: 'Normalmente espresso durante lo sviluppo embrionale (neurogenesi). Assente nella maggior parte dei tessuti adulti. Sovraespresso nel MCL.',
    fn: 'Fattore di trascrizione dello sviluppo. Nel MCL promuove il blocco del differenziamento e la sopravvivenza cellulare. Regola PAX5 e altri geni critici.',
    clinical: 'Positivo nel MCL classico (85-90%), negativo nel MCL leucemico non-nodale (variante indolente). Rilevanza prognostica: SOX11âˆ’ MCL ha decorso piÃ¹ indolente. Negativo nella CLL e nelle altre B-LPD.',
    clones: 'MRQ-58, C1'
  },
  'AnnexinA1': {
    aliases: 'ANXA1, Lipocortina-1, LC-1',
    gene: 'ANXA1 â€” 9q21.13',
    mw: '37 kDa',
    structure: 'Proteina citosolica calcio-dipendente che lega fosfolipidi. Famiglia delle annessine (dominio di ripetizione annessina).',
    distribution: 'Neutrofili, monociti, cellule epiteliali. Nelle neoplasie linfoidi espressione caratteristica nell\'HCL.',
    fn: 'Mediatore dell\'azione anti-infiammatoria dei glucocorticoidi. Inibisce fosfolipasi A2. Ruolo in apoptosi, fagocitosi e risoluzione dell\'infiammazione.',
    clinical: 'Marker altamente specifico per HCL classico (>95% positivo). Negativo nell\'HCL-variante e nelle altre B-LPD. Fondamentale per DD HCL vs HCL-variante vs SMZL.',
    clones: 'MRQ-3, clone 29'
  },
  'CD103': {
    aliases: 'Integrina Î±E, ITGAE, HML-1',
    gene: 'ITGAE â€” 17p13.2',
    mw: '150/25 kDa (Î±E/Î²7)',
    structure: 'SubunitÃ  Î±E dell\'integrina Î±EÎ²7. Glicoproteina eterodimerica transmembrana.',
    distribution: 'Linfociti intraepiteliali (IEL) intestinali, cellule dendritiche tissutali, subset T regolatori. Nelle neoplasie B, caratteristico dell\'HCL.',
    fn: 'Recettore per E-caderina. Media l\'adesione e la ritenzione dei linfociti negli epiteli. Nell\'HCL responsabile della localizzazione splenica ed epatica.',
    clinical: 'Positivo nell\'HCL classico e variante. Negativo in CLL, MCL e la maggior parte dei linfomi. Utile nel pannello HCL ma non discriminante da solo.',
    clones: 'Ber-ACT8, 2G5'
  },
  'CD25': {
    aliases: 'IL-2RÎ±, Tac antigen',
    gene: 'IL2RA â€” 10p15.1',
    mw: '55 kDa',
    structure: 'Catena Î± del recettore per IL-2. Tipo I, non ha dominio di segnalazione; richiede Î²/Î³.',
    distribution: 'T attivati, Treg (costitutivo), B attivati, macrofagi. Nell\'HCL costitutivamente espresso.',
    fn: 'Catena di alta affinitÃ  del recettore IL-2. Il complesso trimerico IL-2RÎ±Î²Î³ ha la massima affinitÃ . Regola espansione e sopravvivenza dei linfociti.',
    clinical: 'Specifico per HCL classico (positivo), negativo nell\'HCL-variante. DD fondamentale: HCL-v Ã¨ CD25âˆ’/CD11c+/CD103+. sCD25 sierico elevato nelle LPD aggressive.',
    clones: 'BC96, 2A3, basiliximab (terapeutico)'
  },
  'CD11c': {
    aliases: 'Integrina Î±X, ITGAX, Leu-M5, p150',
    gene: 'ITGAX â€” 16p11.2',
    mw: '150/95 kDa (Î±X/Î²2)',
    structure: 'SubunitÃ  Î±X dell\'integrina Î²2 (CD11c/CD18, CR4). Glicoproteina eterodimerica transmembrana.',
    distribution: 'Cellule dendritiche (marker DC classico), monociti, macrofagi, granulociti. Nelle B espresso nell\'HCL e SMZL.',
    fn: 'Recettore del complemento (CR4), lega iC3b, fibrinogeno e ICAM-1. Media adesione, fagocitosi e presentazione antigenica.',
    clinical: 'Bright nell\'HCL classico e variante. Positivo anche nel SMZL. Il pattern CD11c+/CD103+/CD25+/CD123+ definisce l\'HCL classico.',
    clones: 'S-HCL-3, BU15, KB90'
  },
  'CD123': {
    aliases: 'IL-3RÎ±, IL3RA',
    gene: 'IL3RA â€” Xp22.3 / Yp13.3',
    mw: '70 kDa',
    structure: 'Catena Î± del recettore per IL-3. Tipo I transmembrana. Richiede la catena Î²c (CD131) condivisa con IL-5R e GM-CSFR.',
    distribution: 'Cellule dendritiche plasmocitoidi, basofili, progenitori ematopoietici. Nelle B espresso nell\'HCL.',
    fn: 'Componente del recettore IL-3 che media proliferazione, sopravvivenza e differenziamento dei progenitori ematopoietici. Via JAK2/STAT5.',
    clinical: 'Positivo nell\'HCL classico, marker aggiuntivo nel pannello HCL. Target terapeutico: tagraxofusp (IL-3-difterica, BPDCN). Espressione anche su staminali leucemiche AML.',
    clones: '6H6, 9F5, 7G3 (terapeutico)'
  },
  'TRAP': {
    aliases: 'Fosfatasi acida tartrato-resistente, ACP5, TRAP5b',
    gene: 'ACP5 â€” 19p13.2',
    mw: '35 kDa (enzima)',
    structure: 'Metallo-enzima binucleare ferro-contenente. Forma attiva (5b) prodotta per clivaggio proteolitico.',
    distribution: 'Osteoclasti (principale fonte), macrofagi attivati, cellule dendritiche. Nelle neoplasie linfoidi caratteristico dell\'HCL.',
    fn: 'Fosfatasi resistente all\'inibizione da tartrato. Idrolizza fosfoproteine. Genera specie reattive dell\'ossigeno (ROS).',
    clinical: 'Colorazione citochimica classica per HCL (>90% positivo). Variabile nell\'HCL-variante. Marker storico, ora integrato con immunofenotipo e Annexin A1.',
    clones: '26E5, colorazione citochimica (metodo Janckila)'
  },
  'sIg': {
    aliases: 'Immunoglobulina di superficie, SmIg',
    gene: 'Loci Ig (IGH 14q32, IGK 2p11, IGL 22q11)',
    mw: 'Variabile (150â€“900 kDa per classe)',
    structure: 'Immunoglobulina ancorata alla membrana (BCR). Complesso con CD79a/CD79b per la trasduzione del segnale.',
    distribution: 'Cellule B mature. IntensitÃ  variabile: dim nella CLL, bright nella maggior parte delle altre B-LPD.',
    fn: 'Recettore per l\'antigene delle cellule B (BCR). Media riconoscimento antigenico, internalizzazione e presentazione. Segnali di sopravvivenza tonica essenziali.',
    clinical: 'L\'intensitÃ  sIg Ã¨ criterio Matutes: CLL = debole, altre B-LPD = forte. La restrizione di catena leggera Îº/Î» dimostra la clonalitÃ  B.',
    clones: 'Anticorpi policlonali anti-IgM, IgD, IgG, Îº, Î»'
  },
  'IgM': {
    aliases: 'Immunoglobulina M, catena pesante Î¼',
    gene: 'IGHM â€” 14q32.33',
    mw: '970 kDa (pentamero), 190 kDa (monomero)',
    structure: 'Catena pesante Î¼. Pentameri nel siero, monomeri di superficie. Prima Ig espressa nello sviluppo B.',
    distribution: 'Cellule B naive e della memoria IgM+. Espressione predominante in CLL, LPL/WM, SMZL.',
    fn: 'Prima linea di difesa umorale. Alta aviditÃ  per struttura pentamerica. Fissa il complemento efficacemente.',
    clinical: 'Espressione dim nella CLL. IgM monoclonale sierica = criterio diagnostico per WaldenstrÃ¶m (LPL/WM).',
    clones: 'Policlonali anti-human IgM'
  },
  'IgD': {
    aliases: 'Immunoglobulina D, catena pesante Î´',
    gene: 'IGHD â€” 14q32.33',
    mw: '175 kDa',
    structure: 'Catena pesante Î´. Coespressata con IgM su cellule B naive (splicing alternativo).',
    distribution: 'Cellule B naive mature (sIgM+sIgD+). Persa dopo switch isotipico.',
    fn: 'Funzione non completamente chiarita. Possibile ruolo nel mantenimento della tolleranza B e co-segnalazione con sIgM.',
    clinical: 'Coespressione sIgM+sIgD+ tipica della CLL. Assente nei linfomi post-switch (FL, DLBCL-GCB). La perdita indica maturazione/switch.',
    clones: 'Policlonali anti-human IgD'
  },
  'Kappa/Lambda': {
    aliases: 'Catene leggere Ig, Îº/Î» ratio',
    gene: 'IGK â€” 2p11.2 / IGL â€” 22q11.2',
    mw: '25 kDa ciascuna',
    structure: 'Catene leggere immunoglobuliniche. Ogni cellula B esprime esclusivamente Îº o Î» (esclusione allelica e isotipica).',
    distribution: 'Tutte le cellule B mature con immunoglobuline. Rapporto Îº:Î» normale = 1.5â€“3:1.',
    fn: 'Componenti essenziali della molecola immunoglobulinica. La restrizione di catena leggera dimostra la monoclonalitÃ .',
    clinical: 'Restrizione Îº o Î» Ã¨ il criterio fondamentale di clonalitÃ  nelle neoplasie B. Rapporto sbilanciato (>4:1 o <0.5:1) indica popolazione clonale.',
    clones: 'Policlonali anti-human kappa e lambda'
  },
  'CD10': {
    aliases: 'CALLA, Neprilisina, MME, Endopeptidasi neutra',
    gene: 'MME â€” 3q25.2',
    mw: '100 kDa',
    structure: 'Metallo-endopeptidasi zinco-dipendente tipo II. Grande dominio extracellulare catalitico.',
    distribution: 'Cellule B del centro germinativo, pre-B midollari (<LL), granulociti, epitelio renale e intestinale.',
    fn: 'Endopeptidasi che cliva peptidi biologicamente attivi (endoteline, sostanza P, bradichinina, ANP). Regola risposte infiammatorie.',
    clinical: 'Marker del centro germinativo. Positivo nel FL (>90%) e DLBCL-GCB. Positivo nel BL (>95%). Negativo in CLL, MCL, MZL. Algoritmo di Hans: CD10+ â†’ GCB.',
    clones: 'SS2/36, 56C6, HI10a'
  },
  'BCL6': {
    aliases: 'B-Cell Lymphoma 6, LAZ3, ZNF51',
    gene: 'BCL6 â€” 3q27.3',
    mw: '95 kDa (nucleare)',
    structure: 'Fattore di trascrizione nucleare con dominio BTB/POZ (dimerizzazione) e 6 zinc-finger (legame DNA). Repressore trascrizionale.',
    distribution: 'Cellule B del centro germinativo (intensa espressione nucleare). Cellule T helper follicolari (Tfh). Assente in B naive e plasmacellule.',
    fn: 'Master regolatore del centro germinativo. Reprime geni di differenziamento (PRDM1/BLIMP1) e risposta al danno DNA (TP53, ATR), permettendo ipermutazione somatica e switch isotipico.',
    clinical: 'Marker GCB: positivo in FL, BL e DLBCL-GCB. Algoritmo di Hans: CD10âˆ’/BCL6+ â†’ GCB. Traslocazioni BCL6 nel ~35% dei DLBCL. Target potenziale per inibitori BCL6.',
    clones: 'LN22, PG-B6p, GI191E/A8'
  },
  'MUM1/IRF4': {
    aliases: 'IRF4, Interferon Regulatory Factor 4, LSIRF',
    gene: 'IRF4 â€” 6p25.3',
    mw: '51 kDa (nucleare)',
    structure: 'Fattore di trascrizione della famiglia IRF. Domini di legame al DNA e di interazione con altri fattori trascrizionali.',
    distribution: 'Cellule B post-centro germinativo, plasmacellule, B attivate. T attivati. Melanociti.',
    fn: 'Regola la differenziazione plasmacellulare. Coopera con BLIMP1 e XBP1 nel programma plasmacellulare. Essenziale per lo switch da GCB a post-GCB.',
    clinical: 'Algoritmo di Hans: MUM1+ = non-GCB (se CD10âˆ’ e BCL6âˆ’). Positivo in DLBCL-ABC, mieloma, HCL. t(6;14) nel mieloma. Target di lenalidomide.',
    clones: 'MUM1p, EP190'
  },
  'BCL2': {
    aliases: 'B-Cell Lymphoma 2, Apoptosis Regulator',
    gene: 'BCL2 â€” 18q21.33',
    mw: '26 kDa (mitocondriale)',
    structure: 'Proteina integrale della membrana mitocondriale esterna. Domini BH1-BH4. Solco idrofobico che lega i membri pro-apoptotici.',
    distribution: 'Ampiamente espresso. Nelle B: mantello e zona marginale positivi, ridotto nel centro germinativo (spento da BCL6), riespresso nel post-GCB.',
    fn: 'Proteina anti-apoptotica cardinale. Lega e inibisce BAX/BAK impedendo permeabilizzazione mitocondriale e rilascio di citocromo c.',
    clinical: 'Positivo nel FL (t(14;18) nell\'85-90%), DLBCL-GCB (~40%). BL tipicamente BCL2âˆ’. Double-expressor BCL2+/MYC+ nel DLBCL = alto rischio. Target: venetoclax (BH3-mimetico, CLL, AML).',
    clones: '124 (Dako), E17, SP66'
  },
  'MYC': {
    aliases: 'c-Myc, v-Myc, BHLHE39',
    gene: 'MYC â€” 8q24.21',
    mw: '49 kDa (nucleare)',
    structure: 'Fattore di trascrizione bHLH-LZ. Eterodimera con MAX per legare sequenze E-box (CACGTG).',
    distribution: 'Ubiquitario durante proliferazione cellulare. Alta espressione nei tessuti ad alto turnover e nelle neoplasie.',
    fn: 'Proto-oncogene master regolatore di proliferazione, crescita, metabolismo e apoptosi. Controlla fino al 15% di tutti i geni umani.',
    clinical: 'Traslocazione patognomonica nel BL: t(8;14) ~80%. Double-hit (MYC + BCL2/BCL6) = HGBL con riarrangiamenti multipli, prognosi sfavorevole. MYC protein >40% + Ki-67 >95% suggerisce BL.',
    clones: 'Y69, EP121, 9E10'
  },
  'Ki-67': {
    aliases: 'MKI67, Antigene Ki-67',
    gene: 'MKI67 â€” 10q26.2',
    mw: '345/395 kDa (varianti di splicing)',
    structure: 'Proteina nucleare non istonica di grande dimensione. Localizzata in periferia dei cromosomi nella mitosi.',
    distribution: 'Tutte le cellule in fase attiva del ciclo (G1, S, G2, M). Assente in G0. Rapida degradazione all\'uscita dalla mitosi.',
    fn: 'Organizzatore dell\'eterocromatina pericentrica. Necessario per la corretta distribuzione durante la mitosi. Indice di proliferazione cellulare.',
    clinical: 'Indice proliferativo: BL >95%, DLBCL 40-90%, FL 1-2 5-20%, CLL <30%, MCL blastoide >40%. Valore prognostico consolidato in MCL e grading FL.',
    clones: 'MIB-1 (gold standard), Ki-67, 30-9'
  },
  'CD38': {
    aliases: 'T10, ADP-ribosil ciclasi',
    gene: 'CD38 â€” 4p15.32',
    mw: '46 kDa',
    structure: 'Glicoproteina transmembrana tipo II con attivitÃ  ectoenzimatica. Dominio catalitico extracellulare che metabolizza NAD+.',
    distribution: 'Cellule linfoidi immature, linfociti attivati, plasmacellule. Espressione variabile sulle cellule neoplastiche B.',
    fn: 'Ectoenzima che converte NAD+ in secondi messaggeri del calcio (cADPR, NAADP). Regola la mobilizzazione del calcio intracellulare. Anche molecola di adesione (lega CD31).',
    clinical: 'Marker prognostico nella CLL: CD38 â‰¥30% = stadio avanzato, IgHV non mutato, prognosi peggiore (Damle 1999). Target: daratumumab, isatuximab (mieloma, in studio per CLL).',
    clones: 'HIT2, HB-7, SPC32'
  },
  'ZAP-70': {
    aliases: 'Zeta-Associated Protein 70, SRK',
    gene: 'ZAP70 â€” 2q12.1',
    mw: '70 kDa',
    structure: 'Tirosin-chinasi intracellulare della famiglia Syk. Due domini SH2 N-terminali e dominio chinasico C-terminale.',
    distribution: 'Normalmente su linfociti T e NK. Espressione aberrante sulle cellule B della CLL.',
    fn: 'Chinasi essenziale per la segnalazione TCR. Nella CLL l\'espressione aberrante potenzia la segnalazione BCR e la risposta ai segnali microambientali.',
    clinical: 'Marker prognostico surrogato della CLL: ZAP-70 â‰¥20% correla con IgHV non mutato e prognosi sfavorevole (Crespo 2003). Complementare a CD38.',
    clones: '1E7.2, SBZAP'
  },
  'CD30': {
    aliases: 'TNFRSF8, Ki-1, Ber-H2',
    gene: 'TNFRSF8 â€” 1p36.22',
    mw: '120 kDa',
    structure: 'Membro superfamiglia TNFR. Tipo I con 6 domini CRD extracellulari.',
    distribution: 'T e B attivati. Caratteristico nel linfoma di Hodgkin (Reed-Sternberg), ALCL, subset DLBCL.',
    fn: 'Recettore per CD30L. Attiva NF-ÎºB e MAPK. Ruolo nella regolazione di apoptosi e proliferazione, dipendente dal contesto.',
    clinical: 'Variabilmente espresso nel DLBCL (~25%), mediastinico, DLBCL-EBV+. Target: brentuximab vedotin (ADC, approvato per HL e ALCL, in studio nei DLBCL CD30+).',
    clones: 'Ber-H2, Ki-1, BerH8'
  },
  'CD138': {
    aliases: 'Syndecan-1, SDC1',
    gene: 'SDC1 â€” 2p24.1',
    mw: '92 kDa (core 32 kDa + catene HS/CS)',
    structure: 'Proteoglicano transmembrana tipo I con catene eparansolfato e condroitinsolfato.',
    distribution: 'Plasmacellule (marker cardine), cellule epiteliali. Non espresso su B mature normali.',
    fn: 'Co-recettore per fattori di crescita (FGF, HGF, VEGF) tramite catene HS. Regola migrazione, adesione alla matrice e risposta ai fattori microambientali.',
    clinical: 'Marker di differenziazione plasmacellulare: positivo nel mieloma multiplo, subset LPL/WM, DLBCL plasmablastico. Generalmente negativo nelle B-LPD non differenziate.',
    clones: 'MI15, B-B4, syndecan'
  },
  'CD148': {
    aliases: 'DEP-1, PTPRJ, HPTPeta',
    gene: 'PTPRJ â€” 11p11.2',
    mw: '220 kDa',
    structure: 'Recettore tirosin-fosfatasico tipo III con 8 ripetizioni fibronectina III extracellulari.',
    distribution: 'Cellule ematopoietiche, piastrine, cellule endoteliali. Espressione variabile nelle B-LPD.',
    fn: 'Fosfatasi che regola negativamente vie mediate da tirosin-chinasi (PDGFR, VEGFR, Src). Possibile gene oncosoppressore.',
    clinical: 'Positivo in SMZL e HCL-variante, utile per distinguerli da HCL classico e CLL. Marker emergente di crescente interesse diagnostico.',
    clones: 'MEM-CD148/6B5, 143-41'
  },

  /* â”€â”€â”€ Lineage / gating markers â”€â”€â”€ */
  'CD45': {
    aliases: 'LCA, PTPRC, T200, B220',
    gene: 'PTPRC â€” 1q31.3',
    mw: '180â€“220 kDa (isoforme multiple)',
    structure: 'Glicoproteina transmembrana di tipo I ad attivitÃ  tirosin-fosfatasica. Lo splicing alternativo genera le isoforme RA, RB, RC, RO. Dominio extracellulare altamente glicosilato.',
    distribution: 'Pan-leucocitario: espresso su tutti i leucociti nucleati. Assente su eritrociti e piastrine. Rappresenta fino al 10% della superficie leucocitaria.',
    fn: 'Regolatore essenziale della segnalazione del TCR e BCR tramite defosforilazione delle chinasi Src (Lck, Fyn). Modula la soglia di attivazione linfocitaria.',
    clinical: 'Marker di gating universale in citometria a flusso per identificare i leucociti. L\'espressione bright Ã¨ tipica dell\'HCL. Dim in CLL/SLL.',
    clones: 'HI30, 2B11+PD7/26 (IHC), T29/33'
  },
  'CD3': {
    aliases: 'T3, Leu-4',
    gene: 'CD3D/CD3E/CD3G â€” 11q23.3',
    mw: '16â€“28 kDa (subunitÃ  gamma, delta, epsilon, zeta)',
    structure: 'Complesso multi-subunitÃ  (Î³Îµ, Î´Îµ, Î¶Î¶) associato al TCR. Dominio extracellulare Ig-like, motivi ITAM citoplasmatici su tutte le subunitÃ .',
    distribution: 'Esclusivamente cellule T mature e timociti. Assente su cellule B, NK, monociti e granulociti.',
    fn: 'Trasduzione del segnale dal TCR. I motivi ITAM delle subunitÃ  Î¶ vengono fosforilati da Lck, attivando ZAP-70 e la cascata di attivazione T.',
    clinical: 'Marker pan-T di riferimento. Essenziale per escludere neoplasie T nella diagnostica delle B-LPD. Negativo per definizione nelle neoplasie B.',
    clones: 'UCHT1, OKT3, SP7 (IHC), F7.2.38'
  },
  'CD34': {
    aliases: 'My10, HPCA-1',
    gene: 'CD34 â€” 1q32.2',
    mw: '110â€“115 kDa',
    structure: 'Glicoproteina transmembrana di tipo I altamente glicosilata (sialomucina). Dominio extracellulare ricco in serine e treonine O-glicosilate.',
    distribution: 'Cellule staminali/progenitrici ematopoietiche (1â€“4% delle cellule midollari), cellule endoteliali, fibroblasti embrionali. Perso con la maturazione.',
    fn: 'Adesione cellulare e homing delle cellule staminali. Ligando di L-selectina (CD62L). Ruolo nel mantenimento delle staminali nel microambiente midollare.',
    clinical: 'Marker di immaturitÃ : negativo in tutte le B-LPD mature. Se positivo â†’ riclassificare come B-ALL/LBL. Usato per l\'enumerazione delle staminali nei trapianti.',
    clones: 'QBEnd/10 (IHC), 8G12, 581, My10'
  },
  'TdT': {
    aliases: 'Terminal transferase, DNTT',
    gene: 'DNTT â€” 10q24.1',
    mw: '58 kDa',
    structure: 'DNA polimerasi nucleare template-indipendente. Appartiene alla famiglia X delle polimerasi. Struttura a dito-palmo-pollice con loop unico per l\'attivitÃ  terminale.',
    distribution: 'Timociti corticali e precursori B nel midollo osseo (linfoblasti). Assente nei linfociti maturi e nelle B-LPD mature.',
    fn: 'Inserisce nucleotidi casuali (N-nucleotidi) nelle giunzioni V-D-J durante il riarrangiamento delle immunoglobuline e del TCR, generando diversitÃ  del repertorio.',
    clinical: 'Marker di immaturitÃ  per eccellenza. Negativo in tutte le B-LPD mature. Se positivo â†’ sospettare B-ALL o raramente variante blastoide del MCL.',
    clones: 'SEN28, EP266 (IHC), HT-6'
  },
  'CD56': {
    aliases: 'NCAM, NKH-1, Leu-19',
    gene: 'NCAM1 â€” 11q23.2',
    mw: '175â€“220 kDa (isoforme multiple)',
    structure: 'Membro della superfamiglia delle immunoglobuline. 5 domini Ig-like e 2 domini fibronectina III extracellulari. Isoforme con ancoraggio GPI o transmembrana.',
    distribution: 'Cellule NK, subset di cellule T (NKT, T gamma-delta), neuroni, cellule muscolari. Normalmente assente sulle cellule B.',
    fn: 'Adesione cellula-cellula omotipica. Ruolo nella citotossicitÃ  NK-mediata, migrazione neuronale e plasticitÃ  sinaptica.',
    clinical: 'Negativo nelle B-LPD. Se positivo su cellule B â†’ considerare linfoma plasmablastico, mieloma con espressione aberrante, o neoplasia NK/T. Marker di esclusione.',
    clones: '123C3, NCAM16.2, MOC-1 (IHC)'
  },
  'CD57': {
    aliases: 'HNK-1, NK-1, Leu-7',
    gene: 'B3GAT1 â€” 11q25',
    mw: 'Epitopo carboidratico (acido glucuronico solfatato)',
    structure: 'Non Ã¨ una proteina: Ã¨ un epitopo glicanico (3-solfoglucoronile) presente su diverse glicoproteine e glicolipidi. Riconosciuto da anticorpi monoclonali specifici.',
    distribution: 'Subset T CD8+ senescenti, cellule NK mature CD56dim, neuroni periferici. Raro sulle cellule B normali.',
    fn: 'Marker di senescenza e differenziazione terminale linfocitaria. Le cellule T CD57+ hanno ridotta capacitÃ  proliferativa ma elevata citotossicitÃ .',
    clinical: 'Negativo sulle cellule B. Utile per escludere T-LGL (T CD3+CD57+). Nelle rosette follicolari, le cellule T CD57+ circondano i centrociti nel FL.',
    clones: 'NK-1, TB01, HNK-1'
  },

  /* â”€â”€â”€ Additional CLL markers â”€â”€â”€ */
  'CD49d': {
    aliases: 'VLA-4 alpha chain, ITGA4',
    gene: 'ITGA4 â€” 2q31.3',
    mw: '150 kDa (catena Î±4)',
    structure: 'Integrina Î±4, forma eterodimero con Î²1 (VLA-4, CD49d/CD29) o Î²7. Dominio I-like nella subunitÃ  Î± per il legame con il ligando.',
    distribution: 'Linfociti, monociti, eosinofili, cellule staminali. Espressione variabile sulle B della CLL.',
    fn: 'Media l\'adesione al VCAM-1 (CD106) endoteliale e alla fibronectina. Ruolo nel homing linfocitario, transmigrazione e interazione con il microambiente.',
    clinical: 'Marker prognostico indipendente nella CLL: â‰¥30% = sfavorevole, correla con IgHV non mutato, Rai avanzato e ridotta OS. Integra il CLL-IPI.',
    clones: '9F10, HP2/1, MZ18-24A9'
  },
  'CD305': {
    aliases: 'LAIR1, LAIR-1',
    gene: 'LAIR1 â€” 19q13.42',
    mw: '32 kDa',
    structure: 'Recettore inibitorio transmembrana con singolo dominio Ig-like extracellulare e motivo ITIM citoplasmatico.',
    distribution: 'Maggior parte dei leucociti incluse cellule B, T, NK, monociti. Espressione piÃ¹ intensa sulle cellule B della CLL.',
    fn: 'Recettore inibitorio per il collagene. Recluta SHP-1 e SHP-2 tramite l\'ITIM, inibendo l\'attivazione cellulare. Modula la soglia del BCR.',
    clinical: 'Tipicamente positivo nella CLL, debole/negativo nella maggior parte delle altre B-LPD. Utile nella diagnosi differenziale delle B-LPD CD5+.',
    clones: 'DX26, NKTA255'
  },
  'CD180': {
    aliases: 'RP105, LY64, Bgp95',
    gene: 'CD180 â€” 5q12.3',
    mw: '95â€“105 kDa',
    structure: 'Proteina transmembrana con ripetizioni ricche di leucina (LRR) extracellulari, omologo del TLR4. Forma complesso con MD-1 (LY86).',
    distribution: 'Cellule B mature, monociti, cellule dendritiche. Assente sulle plasmacellule e sui linfociti T.',
    fn: 'Recettore dell\'immunitÃ  innata che attiva le cellule B in modo T-indipendente. Il complesso CD180/MD-1 riconosce lipopolisaccaridi e attiva NF-ÎºB.',
    clinical: 'Negativo/debole nella CLL e HCL, bright nello SMZL. Pattern utile nella DD tra le B-LPD a piccole cellule. La perdita correla con la fase avanzata.',
    clones: 'MHR73-11, G28-8'
  },

  /* â”€â”€â”€ Pan-B additional â”€â”€â”€ */
  'CD24': {
    aliases: 'HSA, BA-1, HB6',
    gene: 'CD24 â€” 6q21',
    mw: '35â€“45 kDa (altamente glicosilato)',
    structure: 'Piccola glicoproteina ancorata a GPI. Core proteico di soli 27 aminoacidi, estesamente O- e N-glicosilato. Peso molecolare variabile per glicosilazione.',
    distribution: 'Cellule B (dalle pre-B alle B mature, persa nelle plasmacellule), granulociti, cellule epiteliali. Marker di maturazione B.',
    fn: 'Molecola co-stimolatoria per le cellule B. Regola l\'apoptosi, l\'adesione e la migrazione. Ligando di P-selectina e Siglec-10.',
    clinical: 'Debole/negativo nella CLL e HCL, positivo nella maggior parte delle altre B-LPD. Utile nella DD CLL vs altri linfomi B a piccole cellule.',
    clones: 'ML5, SN3, ALB9'
  },
  'CD27': {
    aliases: 'TNFRSF7, T14, S152',
    gene: 'TNFRSF7 â€” 12p13.31',
    mw: '50â€“55 kDa (omodimero)',
    structure: 'Recettore di tipo I della superfamiglia TNF. 3 domini ricchi di cisteina extracellulari. Forma omodimeri. Ligando: CD70 (CD27L).',
    distribution: 'Cellule B di memoria (post-GC), cellule T, cellule NK. Marker classico delle B di memoria; assente sulle B naive.',
    fn: 'Co-stimolazione della risposta B e T. Promuove la differenziazione plasmacellulare, la sopravvivenza e la produzione di anticorpi. Interazione con CD70.',
    clinical: 'Positivo nei linfomi da B di memoria (MZL, LPL). Negativo/debole nei linfomi del centro germinativo (FL, BL). Livelli solubili elevati nel siero = marker di attivitÃ .',
    clones: 'M-T271, O323, 137B4'
  },

  /* â”€â”€â”€ MZL-specific markers â”€â”€â”€ */
  'MNDA': {
    aliases: 'PYHIN2',
    gene: 'MNDA â€” 1q23.1',
    mw: '52 kDa',
    structure: 'Membro della famiglia PYHIN (HIN-200). Contiene dominio pyrin N-terminale e dominio HIN-200 C-terminale per il legame al DNA.',
    distribution: 'Granulociti, monociti, cellule mieloidi. Normalmente assente nelle cellule B. Espressione anomala nei linfomi della zona marginale.',
    fn: 'Fattore di trascrizione coinvolto nella differenziazione mieloide e nella risposta all\'interferone. Regolatore dell\'apoptosi nelle cellule mieloidi.',
    clinical: 'Positivo nei linfomi della zona marginale (SMZL, NMZL, EMZL). Negativo in FL, MCL, CLL. Marker IHC utile per confermare l\'origine marginale. Elevata specificitÃ .',
    clones: 'Policlonale anti-MNDA'
  },
  'IRTA1': {
    aliases: 'FCRL4, FcRH4',
    gene: 'FCRL4 â€” 1q23.1',
    mw: '100â€“110 kDa',
    structure: 'Membro della famiglia dei recettori Fc-like (FCRL). Dominio extracellulare con 4 domini Ig-like, motivi ITIM e ITAM citoplasmatici.',
    distribution: 'Cellule B della zona marginale, cellule B di memoria tissue-based. Assente sulle cellule B circolanti e GC. Espressione epithelial-associated.',
    fn: 'Recettore inibitorio che modula la segnalazione del BCR. Ruolo nella tolleranza periferica e nella regolazione delle B di memoria tissutali.',
    clinical: 'Marker specifico della zona marginale su biopsia (IHC). Positivo in SMZL, NMZL e EMZL. Negativo in FL, MCL, CLL. Utile per confermare l\'origine MZ su tessuto.',
    clones: 'Policlonale anti-FCRL4'
  },

  /* â”€â”€â”€ GC markers â”€â”€â”€ */
  'HGAL': {
    aliases: 'GCET2',
    gene: 'GCET2 â€” 2p23.3',
    mw: '26 kDa',
    structure: 'Proteina citoplasmatica con struttura coiled-coil. Substrato di Syk e Lyn chinasi. Localizzazione citoplasmatica e associata alla membrana.',
    distribution: 'Cellule B del centro germinativo. Assente nei linfociti B naive, mantle e della zona marginale. Espressione ristretta al GC.',
    fn: 'Modula la migrazione cellulare mediata da RhoA e la segnalazione del BCR. Promuove la ritenzione delle cellule B nel centro germinativo limitandone la motilitÃ .',
    clinical: 'Marker GC specifico. Positivo in FL, BL, DLBCL-GCB. Negativo in DLBCL-ABC, MCL, CLL. Utile nel subtyping del DLBCL e per confermare l\'origine GC.',
    clones: 'Policlonale anti-GCET2'
  },
  'LMO2': {
    aliases: 'Rhombotin-2, RBTN2, TTG2',
    gene: 'LMO2 â€” 11p13',
    mw: '18 kDa',
    structure: 'Proteina nucleare con 2 domini LIM zinc-finger. Componente di complessi trascrizionali multiproteici (con TAL1, GATA, E2A).',
    distribution: 'Progenitori ematopoietici, cellule eritroidi, cellule endoteliali, cellule B del centro germinativo.',
    fn: 'Fattore di trascrizione essenziale per l\'eritropoiesi e l\'angiogenesi. Nelle cellule B-GC partecipa alla regolazione della proliferazione e della differenziazione.',
    clinical: 'Marker GC su IHC. Positivo in FL, DLBCL-GCB, BL. Negativo in DLBCL-ABC. Predittore indipendente di prognosi favorevole nel DLBCL. Valore aggiunto vs BCL6 e CD10 nell\'algoritmo Hans.',
    clones: 'Policlonale, 1A9-1'
  },

  /* â”€â”€â”€ MCL additional â”€â”€â”€ */
  'Stathmin': {
    aliases: 'Oncoprotein 18, Op18, STMN1',
    gene: 'STMN1 â€” 1p36.11',
    mw: '17 kDa',
    structure: 'Fosfoproteina citoplasmatica regolatrice della dinamica dei microtubuli. Subisce fosforilazione in risposta a mitogeni e stress cellulare.',
    distribution: 'Sovraespresso in cellule in attiva proliferazione. Livelli elevati nelle neoplasie aggressive. Nel tessuto linfoide: elevato nei centroblasti e nella variante blastoide del MCL.',
    fn: 'Destabilizza i microtubuli promuovendo il disassemblaggio. Regola il ciclo cellulare alla transizione G2/M. La fosforilazione inattiva la sua attivitÃ  destabilizzante.',
    clinical: 'Sovraespresso nel MCL (specialmente variante blastoide). Utile se Ciclina D1 Ã¨ equivoca o nei rari MCL Ciclina D1-negativi. Correla con il Ki-67 e la prognosi.',
    clones: 'Policlonale anti-Stathmin'
  },

  /* â”€â”€â”€ Miscellaneous markers â”€â”€â”€ */
  'CD15': {
    aliases: 'SSEA-1, Lewis X, FUT4, Leu-M1',
    gene: 'FUT4 â€” 11q21',
    mw: 'Epitopo glicanico (trisaccaride Lewis X)',
    structure: 'Non Ã¨ una proteina: Ã¨ un epitopo carboidratico (galattosio-Î²1,4[fucosio-Î±1,3]-N-acetilglucosamina) sintetizzato dalla fucosiltransferasi 4 (FUT4).',
    distribution: 'Granulociti, monociti, cellule di Reed-Sternberg. Raro sulle cellule B e T normali. Marker classico del linfoma di Hodgkin.',
    fn: 'Ligando di E-selectina. Ruolo nell\'adesione dei granulociti all\'endotelio vascolare e nella diapedesi. Funzione nelle cellule neoplastiche non completamente chiarita.',
    clinical: 'Negativo nelle B-LPD. Se positivo â†’ sospettare Hodgkin classico, AML, o carcinoma. Utile nella DD linfoma a grandi cellule vs Hodgkin.',
    clones: 'MMA, C3D-1 (IHC), HI98'
  },
  'CD71': {
    aliases: 'Transferrin receptor 1, TfR1, TFRC',
    gene: 'TFRC â€” 3q29',
    mw: '180 kDa (omodimero, 90 kDa/monomero)',
    structure: 'Glicoproteina transmembrana di tipo II omodimerica. Dominio extracellulare lega la transferrina carica di ferro. Dominio citoplasmatico con segnale di internalizzazione.',
    distribution: 'Cellule in attiva proliferazione, eritroblasti, epatociti. Espressione proporzionale alla domanda di ferro e al tasso proliferativo.',
    fn: 'Recettore principale per l\'uptake del ferro tramite endocitosi della transferrina. Essenziale per la proliferazione cellulare e l\'eritropoiesi. Espressione regolata dai livelli di ferro.',
    clinical: 'Marker surrogato di proliferazione (come Ki-67). Bright nell\'HCL e nei linfomi aggressivi. La forma solubile (sTfR) correlata con il carico tumorale.',
    clones: 'MEM-75, L01.1, OKT9, DF1513 (IHC)'
  },
  'CD44': {
    aliases: 'Pgp-1, Hermes, ECMRIII, In(Lu)-related',
    gene: 'CD44 â€” 11p13',
    mw: '80â€“200 kDa (isoforme per splicing alternativo)',
    structure: 'Glicoproteina transmembrana con dominio Link extracellulare per il legame con l\'acido ialuronico. Esoni varianti (v1-v10) generano oltre 20 isoforme.',
    distribution: 'Ubiquitario su leucociti, eritrociti, epitelio. Le isoforme varianti hanno distribuzione piÃ¹ ristretta. Le cellule B del mantello sono CD44+, le cellule GC sono CD44âˆ’.',
    fn: 'Recettore dell\'acido ialuronico. Coinvolto nell\'adesione cellulare, homing linfocitario, trasmigrazione e segnalazione. Co-recettore per citochine e fattori di crescita.',
    clinical: 'Negativo nel FL (cellule GC). Positivo nella maggior parte delle B-LPD mantle/post-GC. Utile nella DD FL vs linfomi non-GC. Le isoforme varianti sono studiate come marker prognostici.',
    clones: 'DF1485 (IHC), F10-44-2, BJ18, Hermes-1'
  },
  'IgG': {
    aliases: 'Immunoglobulina G, gamma heavy chain',
    gene: 'IGHG1-4 â€” 14q32.33',
    mw: '150 kDa (monomero, 2 catene pesanti + 2 catene leggere)',
    structure: 'Anticorpo con 2 catene pesanti Î³ (4 sottoclassi IgG1-4) e 2 catene leggere (Îº o Î»). Regione Fc lega il complemento e i recettori FcÎ³.',
    distribution: 'Immunoglobulina piÃ¹ abbondante nel siero (75%). Prodotta da plasmacellule e cellule B post-switch isotipico.',
    fn: 'Opsonizzazione, attivazione del complemento (via classica), ADCC, neutralizzazione. L\'unica Ig che attraversa la placenta. Ciascuna sottoclasse ha funzioni effettrici diverse.',
    clinical: 'La class switch a IgG indica maturazione post-GC. Nella CLL la maggior parte esprime IgM/IgD. IgG+ nella CLL Ã¨ rara. Nel DLBCL e FL Ã¨ piÃ¹ frequente. Esclude per definizione il WM.',
    clones: 'Policlonale anti-IgG, G18-145'
  },
  'IgA': {
    aliases: 'Immunoglobulina A, alpha heavy chain',
    gene: 'IGHA1-2 â€” 14q32.33',
    mw: '160 kDa (monomero), 385 kDa (dimero secretorio)',
    structure: 'Anticorpo con 2 catene pesanti Î± (2 sottoclassi IgA1, IgA2). Forma dimeri con catena J e componente secretoria (sIgA) nelle mucose.',
    distribution: 'Principale Ig delle secrezioni (saliva, latte, lacrime, muco intestinale). IgA sierica Ã¨ monomerica, IgA secretoria Ã¨ dimerica.',
    fn: 'Prima linea di difesa sulle superfici mucosali. Neutralizzazione patogeni, immune exclusion. IgA2 predomina nel tratto GI inferiore, IgA1 nelle vie respiratorie.',
    clinical: 'Raro nelle B-LPD. Un subset di EMZL/MALT gastrico puÃ² essere IgA+. La class switch a IgA suggerisce differenziazione mucosale. Utile nella DD dei MALT con componente plasmocitoide.',
    clones: 'Policlonale anti-IgA, IS11-8E10'
  },
  'CD9': {
    aliases: 'MRP-1, TSPAN29, p24, BA-2',
    gene: 'CD9 â€” 12p13.31',
    mw: '24 kDa',
    structure: 'Membro della superfamiglia delle tetraspanine. 4 domini transmembrana, piccolo e grande loop extracellulare. Presente in microdomini di membrana ricchi in tetraspanine.',
    distribution: 'Cellule B pre-B e mature (non GC), piastrine, monociti, eosinofili, cellule endoteliali. Espressione ridotta nelle cellule del centro germinativo.',
    fn: 'Forma complessi con integrine, molecole HLA e altre tetraspanine. Regola la fusione cellulare, la motilitÃ , l\'adesione e l\'attivazione piastrinica.',
    clinical: 'Negativo nel FL e BL (cellule GC-derivate). Positivo in CLL, MCL, MZL, DLBCL-ABC. Utile nella DD tra linfomi GC e non-GC. Ridotto nei linfomi aggressivi.',
    clones: 'MEM-61, CLB-thromb/8, MM2/57'
  },
  'CD26': {
    aliases: 'DPP4, ADABP, ADCP2',
    gene: 'DPP4 â€” 2q24.2',
    mw: '110 kDa (omodimero)',
    structure: 'Ectoenzima (serina proteasi) transmembrana di tipo II. Forma omodimeri. Dominio catalitico extracellulare con attivitÃ  dipeptidil-peptidasi IV.',
    distribution: 'Cellule T attivate, epitelio renale e intestinale, epatociti, cellule endoteliali. Normalmente negativo o molto debole sulle cellule B.',
    fn: 'Cliva il dipeptide N-terminale Xaa-Pro o Xaa-Ala da chemochine, neuropeptidi e incretine (GLP-1, GIP). Ruolo nella co-stimolazione T e nel metabolismo del glucosio.',
    clinical: 'Negativo nelle B-LPD. Se positivo su cellule "B-like" â†’ sospettare T-PLL (CD26 forte) o neoplasia T. Marker utile per escludere T-PLL vs CLL atipica.',
    clones: 'BA5b, M-A261, 2A6'
  },

  /* â”€â”€â”€ Molecular â”€â”€â”€ */
  'TP53': {
    aliases: 'p53, LFS1, TRP53',
    gene: 'TP53 â€” 17p13.1',
    mw: '53 kDa',
    structure: 'Fattore di trascrizione nucleare con dominio di transattivazione N-terminale, dominio di legame al DNA centrale e dominio di tetramerizzazione C-terminale.',
    distribution: 'Ubiquitaria. Livelli normalmente bassi per rapida degradazione proteasomale (MDM2-mediata). La mutazione stabilizza la proteina â†’ accumulo nucleare rilevabile in IHC.',
    fn: 'Guardiano del genoma: regola il ciclo cellulare (arresto G1), l\'apoptosi, la riparazione del DNA e la senescenza. Attivato da stress genotossico. Soppressore tumorale chiave.',
    clinical: 'La sovraespressione IHC (>20% nuclei) correla con del(17p) o mutazione TP53. Prognostico sfavorevole in CLL, MCL, DLBCL. Nel MCL blastoide: frequente. Nel B-PLL: del(17p) nel 50%.',
    clones: 'DO-7 (IHC), PAb 1801, BP53-12'
  },
  'CD11a': {
    aliases: 'LFA-1 alpha, ITGAL',
    gene: 'ITGAL â€” 16p11.2',
    mw: '180 kDa',
    structure: 'Integrina Î±L, forma eterodimero con Î²2 (CD18) per creare LFA-1. Dominio I (inserted) nella subunitÃ  Î± per interazione con ICAM.',
    distribution: 'Tutti i leucociti. Espressione variabile per tipo cellulare e stato di attivazione.',
    fn: 'Molecola di adesione leucocitaria. LFA-1 lega ICAM-1/2/3 (CD54/CD102/CD50). Essenziale per la diapedesi, la formazione della sinapsi immunologica e la citotossicitÃ  T e NK.',
    clinical: 'Ridotto/assente nell\'HCL classico (contribuisce al fenotipo "hairy cell" con scarsa adesione). Normale in SMZL, MCL. Utile nella DD HCL vs HCL-v vs SMZL.',
    clones: 'HI111, MHM24, 25.3.1'
  }
  };
})(window);
