/* =======================================================================
 * MCLTherapyHelper — Mantle Cell Lymphoma (MCL) Therapeutic Advisor (IT)
 * Struttura e UX come gli altri helper (CLL/DLBCL/FL):
 *  - Modale principale + modali secondari (Genetica, Molecolare/Resistenza, Score, Pretrattamenti, Contesto)
 *  - Selezioni “one-shot” via tendina (nessun duplicato)
 *  - Motore a regole con gate ESMO/AIFA (Italia) e fattori clinico-biologici
 * ======================================================================= */

(function(){
  // --- util locale, isolato ---
  const $m = (sel, r=document)=> r.querySelector(sel);
  function mclIcons(){ if(window.lucide && lucide.createIcons) lucide.createIcons(); }
  const esc = s => String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));

  /* ===================== DATASETS ===================== */

  // Genetica rilevante per scelte terapeutiche o risk
  const MCL_GENETICS = [
    't(11;14)/IGH::CCND1',
    'SOX11 negativo (nota: fenotipo indolente/non-nodale)',
    'TP53 mutato/deleto (17p-)',
    'ATM alterato',
    'NOTCH1/NOTCH2 mutati',
    'KMT2D/CREBBP mutati',
    'CDKN2A perdita',
    'MYC riarrangiato (blastoid/pleomorphic?)'
  ];

  // Molecolare / resistenza / biologia clinica
  const MCL_MOLECULAR = [
    'Ki-67 ≥ 30%',
    'Variante blastoid/pleomorphic',
    'Fenotipo indolente non-nodale',
    'BTK C481 mutazione (resistenza BTKi covalenti)',
    'PLCG2 attivante (resistenza BTKi)',
    'Intolleranza BTKi',
    'CNS coinvolgimento/rischio elevato'
  ];

  // Score (versione guidata, come richiesto)
  const SCORE_DEFS = {
    'S-MIPI': {
      desc: 'Semplificato: Età, ECOG, LDH (ULN), WBC.',
      items: [
        {key:'age',   label:'Età',        type:'select', opts:['≤60','61–70','>70'], val:[0,1,2]},
        {key:'ecog',  label:'ECOG PS',    type:'select', opts:['0–1','2–4'],         val:[0,1]},
        {key:'ldh',   label:'LDH',        type:'select', opts:['≤ ULN','> ULN'],     val:[0,1]},
        {key:'wbc',   label:'WBC (x10^9/L)', type:'select', opts:['< 6.7','6.7–9.9','≥ 10'], val:[0,1,2]}
      ],
      calc: v => v.age + v.ecog + v.ldh + v.wbc, // 0–6: Low 0-3, Int 4-5, High 6
      risk: s => (s<=3?'Basso':(s<=5?'Intermedio':'Alto'))
    },
    'MIPI-b (Ki-67)': {
      desc: 'S-MIPI + Ki-67 ≥30% “penalizza” di 1 classe.',
      items: [
        {key:'smipi_val', label:'S-MIPI (riporta il punteggio calcolato)', type:'number', min:0, max:6, placeholder:'0–6'},
        {key:'ki67', label:'Ki-67 ≥ 30%', type:'bool'}
      ],
      calc: v => {
        let base = Number(v.smipi_val||0);
        let cls = (base<=3?0:(base<=5?1:2)); // 0=L,1=I,2=H
        if(v.ki67) cls = Math.min(2, cls+1);
        return cls; // 0,1,2
      },
      riskFromVal: c => (c===0?'Basso':c===1?'Intermedio':'Alto')
    }
  };

  // Pretrattamenti & risposte
  const REGIMENS = [
    // 1a linea tipici
    'R-CHOP/R-DHAP (alternati) ± ASCT',
    'Nordic (Maxi-CHOP + HD-AraC) ± ASCT',
    'BR (bendamustina+rituximab)',
    'R-BAC (rituximab+bendamustina+citarabina)',
    'R-CHOP',
    'R-CVP',
    // r/r
    'Ibrutinib',
    'Acalabrutinib',
    'Zanubrutinib',
    'Pirtobrutinib',
    'Lenalidomide+Rituximab (R2)',
    'Bortezomib-based',
    'Brexucabtagene autoleucel (Tecartus)',
    // altro
    'Rituximab mantenimento',
    'ASCT (consolidamento)',
    'Allo-SCT (selezionati)'
  ];
  const RESPONSES = ['CR','PR','SD','PD','Intolleranza/AE','Sconosciuta'];

  // Contesto clinico (indicazioni/condizionanti)
  const CONTEXT_FLAGS = [
    'Candidato a trapianto autologo (ASCT-eligible)',
    'Non candidato a trapianto (unfit/fragile)',
    'Sintomatico/indicazione a trattamento',
    'Asintomatico (considera watch & wait se indolente)',
    'Fallimento BTKi precedente',
    'Precedente BTKi ma sospeso per intolleranza',
    'Sospetto/accertato coinvolgimento SNC'
  ];

  // Stato
  let mcl = {
    genetics: [],     // [{key, note}]
    molecular: [],    // [{key, note}]
    scores: [],       // [{name, value, detail, risk?}]
    priorTx: [],      // [{regimen, line, response}]
    context: []       // array di flag
  };

  /* ===================== UI (DIALOGS) ===================== */

  let dlg, addDlg, scoreDlg, priorDlg, ctxDlg;

  function buildMainDialog(){
    const d = document.createElement('dialog');
    d.id = 'mclDlg';
    d.innerHTML = `
      <div class="app-head">
        <div class="app-title"><i data-lucide="stethoscope"></i><span>Terapia — Linfoma Mantellare</span></div>
        <button class="iconbtn" data-mcl="close"><i data-lucide="x"></i></button>
      </div>
      <div class="app-body">
        <div class="actions row">
          <button class="btn btn-primary" data-mcl="addGen"  title="Genetica"><i data-lucide="dna"></i></button>
          <button class="btn"              data-mcl="addMol"  title="Molecolare/Resistenza"><i data-lucide="activity"></i></button>
          <button class="btn"              data-mcl="addScore" title="Score (S-MIPI / MIPI-b)"><i data-lucide="list-checks"></i></button>
          <button class="btn"              data-mcl="addPrior" title="Pretrattamenti"><i data-lucide="clock-9"></i></button>
          <button class="btn"              data-mcl="addCtx"   title="Contesto clinico"><i data-lucide="alert-triangle"></i></button>
          <button class="btn"              data-mcl="compute"  title="Calcola suggerimenti"><i data-lucide="calculator"></i></button>
          <button class="btn btn-danger"   data-mcl="reset"    title="Reset"><i data-lucide="rotate-ccw"></i></button>
        </div>
        <div class="grid">
          <section class="card" aria-labelledby="mclSel">
            <h2 id="mclSel">Selezioni</h2>
            <div class="content" id="mclSelBox" style="display:grid; gap:10px;"></div>
          </section>
          <section class="card" aria-labelledby="mclRes">
            <h2 id="mclRes">Proposte terapeutiche</h2>
            <div class="content" id="mclResults">
              <p class="muted">Aggiungi dati e premi <strong>Calcola</strong>.</p>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(d); mclIcons(); return d;
  }

  function buildSmallDialog(id, title, bodyHtml){
    const d = document.createElement('dialog');
    d.id = id;
    d.innerHTML = `
      <div class="app-head">
        <div class="app-title"><i data-lucide="beaker"></i><span>${title}</span></div>
        <button class="iconbtn" data-mcl="closeSub"><i data-lucide="x"></i></button>
      </div>
      <div class="app-body" style="max-height:70vh; overflow:auto;">
        ${bodyHtml}
      </div>`;
    document.body.appendChild(d); mclIcons(); return d;
  }

  function ensureDialogs(){
    if(!dlg) dlg = buildMainDialog();
    if(!addDlg) addDlg = buildSmallDialog('mclAddDlg','Aggiungi/Modifica voce',
      `<div class="field">
         <label>Categoria</label>
         <select id="mclAddCat">
           <option value="genetics">Genetica</option>
           <option value="molecular">Molecolare/Resistenza</option>
         </select>
       </div>
       <div class="field">
         <label>Seleziona voce</label>
         <select id="mclAddKey"></select>
       </div>
       <div class="field">
         <label>Note (opzionale)</label>
         <input id="mclAddNote" type="text" placeholder="es. metodo, VAF, data test">
       </div>
       <div class="row" style="justify-content:flex-end">
         <button class="btn btn-primary" data-mcl="saveAdd"><i data-lucide="check"></i><span>OK</span></button>
       </div>`
    );
    if(!scoreDlg) scoreDlg = buildSmallDialog('mclScoreDlg','Aggiungi score',
      `<div class="field">
         <label>Score</label>
         <select id="mclScoreName">
           ${Object.keys(SCORE_DEFS).map(n=>`<option value="${n}">${n}</option>`).join('')}
         </select>
       </div>
       <div id="mclScoreItems" class="stack" style="display:flex; flex-direction:column; gap:8px;"></div>
       <div class="row" style="justify-content:flex-end">
         <button class="btn btn-primary" data-mcl="saveScore"><i data-lucide="check"></i><span>Calcola & aggiungi</span></button>
       </div>`
    );
    if(!priorDlg) priorDlg = buildSmallDialog('mclPriorDlg','Aggiungi pretrattamento',
      `<div class="row" style="gap:8px; align-items:end; flex-wrap:wrap">
         <div class="field" style="min-width:260px">
           <label>Schema</label>
           <select id="mclPriorReg">${REGIMENS.map(r=>`<option>${r}</option>`).join('')}</select>
         </div>
         <div class="field" style="width:120px">
           <label>Linea</label>
           <input id="mclPriorLine" type="number" min="1" max="10" value="1">
         </div>
         <div class="field" style="min-width:170px">
           <label>Risposta</label>
           <select id="mclPriorResp">${RESPONSES.map(r=>`<option>${r}</option>`).join('')}</select>
         </div>
         <button class="btn btn-primary" data-mcl="savePrior"><i data-lucide="plus"></i></button>
       </div>
       <div id="mclPriorList" class="stack" style="margin-top:10px"></div>`
    );
    if(!ctxDlg) ctxDlg = buildSmallDialog('mclCtxDlg','Contesto clinico',
      `<div class="stack" id="mclCtxList" style="display:flex; flex-direction:column; gap:8px;">
        ${CONTEXT_FLAGS.map(k=>`
          <label class="row" style="gap:10px; align-items:center">
            <input type="checkbox" data-mcl="ctxChk" value="${esc(k)}">
            <span>${esc(k)}</span>
          </label>
        `).join('')}
       </div>
       <div class="row" style="justify-content:flex-end; margin-top:8px">
         <button class="btn btn-primary" data-mcl="saveCtx"><i data-lucide="check"></i><span>OK</span></button>
       </div>`
    );
  }

  /* ===================== RENDER SELEZIONI ===================== */

  const pill = (label, sub) => `<span class="tag">${esc(label)}${sub?` — <i>${esc(sub)}</i>`:''}</span>`;

  function renderSelections(){
    const box = $m('#mclSelBox'); if(!box) return;
    box.innerHTML = `
      <div><strong>Genetica:</strong> ${mcl.genetics.length ? mcl.genetics.map(x=>pill(x.key, x.note)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Molecolare/Resistenza:</strong> ${mcl.molecular.length ? mcl.molecular.map(x=>pill(x.key, x.note)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Score:</strong> ${mcl.scores.length ? mcl.scores.map(s=>pill(`${s.name}: ${s.display}`, s.detail)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Pretrattamenti:</strong> ${mcl.priorTx.length ? mcl.priorTx.map(p=>pill(`${p.regimen} (L${p.line})`, p.response)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Contesto:</strong> ${mcl.context.length ? mcl.context.map(k=>pill(k)).join(' ') : '<span class="muted">—</span>'}</div>
    `;
  }

  /* ===================== LISTE DINAMICHE (no duplicati) ===================== */

  function availableOptions(list, already){
    const used = new Set(already.map(x=>x.key));
    return list.filter(k=> !used.has(k));
  }

  function populateAddSelects(){
    const cat = $m('#mclAddCat').value;
    const sel = $m('#mclAddKey');
    const opts = (cat==='genetics')
      ? availableOptions(MCL_GENETICS, mcl.genetics)
      : availableOptions(MCL_MOLECULAR, mcl.molecular);
    sel.innerHTML = opts.map(k=>`<option>${esc(k)}</option>`).join('') || `<option value="">— nessuna voce disponibile —</option>`;
  }

  /* ===================== SCORE UI ===================== */

  function renderScoreItems(){
    const name = $m('#mclScoreName').value;
    const def = SCORE_DEFS[name];
    const host = $m('#mclScoreItems');
    host.innerHTML =
      `<p class="muted" style="margin:0 0 6px 0">${esc(def.desc)}</p>` +
      def.items.map(it=>{
        if(it.type==='bool'){
          return `<label class="row" style="gap:8px; align-items:center">
                    <input type="checkbox" data-mcl="scoreItem" value="${it.key}">
                    <span>${esc(it.label)}</span>
                  </label>`;
        }
        if(it.type==='select'){
          return `<div class="field">
                    <label>${esc(it.label)}</label>
                    <select data-mcl="scoreSel" data-key="${it.key}">
                      ${it.opts.map((o,i)=>`<option value="${it.val[i]}">${esc(o)}</option>`).join('')}
                    </select>
                  </div>`;
        }
        if(it.type==='number'){
          return `<div class="field">
                    <label>${esc(it.label)}</label>
                    <input type="number" data-mcl="scoreNum" data-key="${it.key}" min="${it.min||0}" max="${it.max||999}" placeholder="${it.placeholder||''}">
                  </div>`;
        }
        return '';
      }).join('');
  }

  function collectScoreValues(def){
    const vals = {};
    def.items.forEach(it=>{
      if(it.type==='bool'){
        vals[it.key] = !![...document.querySelectorAll('[data-mcl="scoreItem"]')]
                        .find(ch=>ch.value===it.key && ch.checked);
      } else if(it.type==='select'){
        const el = document.querySelector(`[data-mcl="scoreSel"][data-key="${it.key}"]`);
        vals[it.key] = Number(el?.value||0);
      } else if(it.type==='number'){
        const el = document.querySelector(`[data-mcl="scoreNum"][data-key="${it.key}"]`);
        vals[it.key] = Number(el?.value||0);
      }
    });
    return vals;
  }

  function calcCurrentScore(){
    const name = $m('#mclScoreName').value;
    const def = SCORE_DEFS[name];
    const vals = collectScoreValues(def);
    const value = def.calc(vals);
    let display='', detail='';

    if(name==='S-MIPI'){
      const risk = def.risk(value);
      display = `${value} (${risk})`;
      detail  = Object.entries(vals).map(([k,v])=>`${k}=${v}`).join(', ');
      return { name, value, display, detail, risk };
    }
    if(name==='MIPI-b (Ki-67)'){
      const cls = value; // 0/1/2
      const risk = def.riskFromVal(cls);
      display = risk;
      detail  = `classe=${cls}, Ki-67=${vals.ki67?'≥30%':'<30%'}, S-MIPI=${vals.smipi_val||0}`;
      return { name, value: cls, display, detail, risk };
    }
    return { name, value, display:String(value), detail:'', risk:undefined };
  }

  /* ===================== ENGINE ===================== */

  // Gate AIFA (Italia)
  const GATE = {
    IBRUT: { aifa:true,  note:'rimb. MCL R/R' },                        // ibrutinib
    ACALA: { aifa:false, note:'verifica AIFA locale (MCL)' },           // acalabrutinib
    ZANU:  { aifa:false, note:'verifica AIFA locale (MCL)' },           // zanubrutinib
    PIRTO: { aifa:true,  afterBTKi:true, note:'rimb. dopo BTKi' },      // pirtobrutinib
    BREXU: { aifa:true,  minLine:3, needBTKi:true, note:'CAR-T ≥2 linee incl. BTKi' } // pratica: dopo ≥2 linee incl. BTKi
  };

  // Helpers condizionali
  const has = (key, arr) => arr.some(x=>x.key===key);
  const ctxHas = key => mcl.context.includes(key);
  const maxLine = () => mcl.priorTx.reduce((m,p)=>Math.max(m, p.line||1), 0) || 0;
  const btkiUsed = () => mcl.priorTx.some(p=>/ibrutinib|acalabrutinib|zanubrutinib/i.test(p.regimen));
  const btkiFailed = () => ctxHas('Fallimento BTKi precedente') || mcl.priorTx.some(p=>/ibrutinib|acalabrutinib|zanubrutinib/i.test(p.regimen) && /PD|SD/i.test(p.response||''));
  const btkiIntolerant = () => ctxHas('Precedente BTKi ma sospeso per intolleranza') || mcl.priorTx.some(p=>/ibrutinib|acalabrutinib|zanubrutinib/i.test(p.regimen) && /Intolleranza/i.test(p.response||''));
  const indolent = () => has('Fenotipo indolente non-nodale', mcl.molecular) || has('SOX11 negativo (nota: fenotipo indolente/non-nodale)', mcl.genetics);
  const highRisk = () => has('TP53 mutato/deleto (17p-)', mcl.genetics) || has('Variante blastoid/pleomorphic', mcl.molecular) || has('Ki-67 ≥ 30%', mcl.molecular);
  const cnsRisk = () => has('CNS coinvolgimento/rischio elevato', mcl.molecular) || ctxHas('Sospetto/accertato coinvolgimento SNC');

  function scoreRegimens(){
    const out = [];
    const lineNow = maxLine()+1;
    const needTx  = ctxHas('Sintomatico/indicazione a trattamento');
    const fitASCT = ctxHas('Candidato a trapianto autologo (ASCT-eligible)');
    const unfit   = ctxHas('Non candidato a trapianto (unfit/fragile)');

    // 0) Watch & Wait (subset indolente, asintomatico)
    if(lineNow===1 && !needTx && indolent()){
      out.push({name:'Watch & Wait', class:'osservazione', aifa:true, score:9,
        notes:['Forma indolente/non-nodale SOX11-neg; monitoraggio attivo']});
    }

    // 1) Prima linea
    if(lineNow===1 && needTx){
      // Fit/ASCT
      if(fitASCT && !indolent()){
        let base = 8;
        if(highRisk()) base -= 1;
        out.push({name:'R-CHOP/R-DHAP (alternati) + ASCT + mantenimento R', class:'citarabina+ASCT', aifa:true, score: base+2,
          notes:['Standard intensivo nei pazienti eleggibili; consolidamento con ASCT; mantenimento rituximab raccomandato']});
        out.push({name:'Nordic (Maxi-CHOP + HD-AraC) ± ASCT', class:'citarabina±ASCT', aifa:true, score: base+1,
          notes:['Schema alternativo citarabina-intensivo nei fit']});
      }
      // Unfit / anziani
      if(unfit || indolent()){
        let base = 7;
        if(highRisk()) base -= 1;
        out.push({name:'BR (bendamustina+rituximab)', class:'chemoimmuno', aifa:true, score: base+1,
          notes:['1ª linea negli unfit; valutare mantenimento R']});
        out.push({name:'R-BAC (rituximab+bendamustina+citarabina)', class:'chemoimmuno', aifa:true, score: base,
          notes:['Opzione intensiva per anziani/fit selezionati; attenzione a mielotossicità']});
        out.push({name:'R-CHOP / R-CVP', class:'chemoimmuno', aifa:true, score: base-1,
          notes:['Alternative meno intensiva; risposta più rapida vs BR in alcune situazioni']});
      }

      // Situazioni ad altissimo rischio (TP53/blastoid) → considerare precoce target/Trial
      if(highRisk()){
        out.push({name:'BTKi-based (off-label 1L in Italia) / arruolamento in studio', class:'target', aifa:false, score: 6,
          notes:['TP53/blastoid: chemo-resistenza; preferire trial o strategie BTKi-based dove consentito']});
      }
    }

    // 2) Linee successive (≥2L)
    if(lineNow>=2){
      const afterBTKi = btkiUsed();
      const failedBTKi = btkiFailed();
      const intolerBTKi = btkiIntolerant();

      // BTK inibitori (se naive)
      if(!afterBTKi){
        out.push({name:'Ibrutinib', class:'BTKi', aifa:GATE.IBRUT.aifa, score: 9,
          notes:[GATE.IBRUT.note]});
        out.push({name:'Acalabrutinib', class:'BTKi', aifa:GATE.ACALA.aifa, score: 7,
          notes:[GATE.ACALA.note]});
        out.push({name:'Zanubrutinib', class:'BTKi', aifa:GATE.ZANU.aifa, score: 7,
          notes:[GATE.ZANU.note]});
      } else {
        // Post-BTKi
        if(failedBTKi || has('BTK C481 mutazione (resistenza BTKi covalenti)', mcl.molecular) || has('PLCG2 attivante (resistenza BTKi)', mcl.molecular)){
          out.push({name:'Pirtobrutinib (post-BTKi)', class:'BTKi-noncovalent', aifa:GATE.PIRTO.aifa, score: 9,
            notes:[GATE.PIRTO.note]});
        } else if(intolerBTKi){
          out.push({name:'Switch BTKi alternativo (acalabrutinib/zanubrutinib)', class:'BTKi', aifa:false, score: 7,
            notes:['Intolleranza a un BTKi: valutare switch (verifica AIFA)']});
        }
        // CAR-T dopo ≥2 linee incl. BTKi
        if(lineNow >= (GATE.BREXU.minLine||3) && (failedBTKi || afterBTKi)){
          out.push({name:'Brexucabtagene autoleucel (Tecartus)', class:'CAR-T', aifa:GATE.BREXU.aifa, score: 9,
            notes:[GATE.BREXU.note, 'Invio a centro accreditato; valutare bridging']});
        }
        // Altre opzioni
        out.push({name:'Lenalidomide+Rituximab (R2)', class:'chemo-free', aifa:true, score: 6,
          notes:['Chemo-sparing; attenzione a citopenie/TEV']});
        out.push({name:'Bortezomib-based', class:'targeted', aifa:true, score: 6,
          notes:['Opzione in recidiva; neuropatia cumulativa']});
        out.push({name:'Re-challenge BR / R-BAC (se non già impiegati e risposta duratura)', class:'chemoimmuno', aifa:true, score: 5,
          notes:['Valutare durata risposta precedente e fitness']});
      }
    }

    // CNS risk
    if(cnsRisk()){
      out.push({name:'Profilassi/gestione SNC (HD-MTX; valutare schema dedicato)', class:'CNS', aifa:true, score: 6,
        notes:['Coinvolgimento o rischio SNC: percorso dedicato con team; imaging/LCR']});
    }

    return out.sort((a,b)=> b.score - a.score);
  }

  function renderResults(){
    const box = $m('#mclResults');
    const recs = scoreRegimens();
    if(recs.length===0){
      box.innerHTML = '<p class="muted">Nessuna proposta calcolabile con i dati inseriti.</p>';
      return;
    }
    const max = Math.max(...recs.map(r=>r.score));
    box.innerHTML = `<div class="results-list">${recs.map(r=>{
      const pct = Math.max(5, Math.round((r.score/max)*100));
      const gate = r.aifa ? '' : ' <span class="tag" style="border-color:#f59e0b;color:#92400e;background:#fffbeb">verifica AIFA</span>';
      return `
        <div class="result-row">
          <div class="name">${esc(r.name)} ${gate}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="score">${pct}%</div>
          <div class="meta">${r.notes.map(n=>`<span class="tag">${esc(n)}</span>`).join(' ')}</div>
        </div>`;
    }).join('')}</div>
    <p class="muted">Nota: ranking qualitativo; integrare con età/fitness, preferenze, accesso a centri ASCT/CAR-T e trial.</p>`;
  }

  /* ===================== EVENTS ===================== */

  function open(){ ensureDialogs(); dlg.showModal(); mclIcons(); renderSelections(); }
  function close(){ if(dlg) dlg.close(); }

  document.addEventListener('click', (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const act = b.getAttribute('data-mcl');

    if(act==='close'){ close(); }
    if(act==='compute'){ renderResults(); }
    if(act==='reset'){
      if(confirm('Sicuro di voler azzerare i dati?')){
        mcl = {genetics:[], molecular:[], scores:[], priorTx:[], context:[]};
        renderSelections(); $m('#mclResults').innerHTML='<p class="muted">Azzera completato.</p>';
      }
    }

    // open sub
    if(act==='addGen' || act==='addMol'){ ensureDialogs(); addDlg.showModal();
      $m('#mclAddCat').value = (act==='addGen') ? 'genetics' : 'molecular';
      populateAddSelects(); mclIcons();
    }
    if(act==='addScore'){ ensureDialogs(); scoreDlg.showModal(); renderScoreItems(); mclIcons(); }
    if(act==='addPrior'){ ensureDialogs(); priorDlg.showModal(); renderPriorList(); mclIcons(); }
    if(act==='addCtx'){ ensureDialogs(); ctxDlg.showModal();
      [...ctxDlg.querySelectorAll('[data-mcl="ctxChk"]')].forEach(ch=> ch.checked = mcl.context.includes(ch.value));
      mclIcons();
    }

    // save sub
    if(act==='saveAdd'){
      const cat = $m('#mclAddCat').value;
      const key = $m('#mclAddKey').value;
      const note = $m('#mclAddNote').value.trim();
      if(!key){ addDlg.close(); return; }
      const arr = (cat==='genetics') ? mcl.genetics : mcl.molecular;
      if(arr.some(x=>x.key===key)){ alert('Voce già inserita.'); return; }
      arr.push({key, note});
      $m('#mclAddNote').value=''; populateAddSelects(); renderSelections();
    }
    if(act==='saveScore'){
      const s = calcCurrentScore();
      const idx = mcl.scores.findIndex(x=>x.name===s.name);
      if(idx>-1) mcl.scores[idx]=s; else mcl.scores.push(s);
      scoreDlg.close(); renderSelections();
    }
    if(act==='savePrior'){
      const reg = $m('#mclPriorReg').value;
      const line = parseInt($m('#mclPriorLine').value||'1',10);
      const resp = $m('#mclPriorResp').value;
      mcl.priorTx.push({regimen:reg, line, response:resp});
      renderPriorList(); renderSelections();
    }
    if(act==='saveCtx'){
      const chosen = [...ctxDlg.querySelectorAll('[data-mcl="ctxChk"]:checked')].map(ch=>ch.value);
      mcl.context = chosen;
      ctxDlg.close(); renderSelections();
    }

    if(b.id==='launchMCL'){ open(); }
    if(act==='closeSub'){ [addDlg, scoreDlg, priorDlg, ctxDlg].forEach(d=> d && d.close()); }
  });

  // Dinamiche
  document.addEventListener('change', (e)=>{
    if(e.target && e.target.id==='mclAddCat'){ populateAddSelects(); }
    if(e.target && e.target.id==='mclScoreName'){ renderScoreItems(); }
  });

  // Lista pretrattamenti
  function renderPriorList(){
    const host = $m('#mclPriorList'); if(!host) return;
    if(mcl.priorTx.length===0){ host.innerHTML='<p class="muted">Nessuno.</p>'; return; }
    host.innerHTML = mcl.priorTx.map((p,i)=>`
      <div class="row" style="justify-content:space-between; gap:8px; align-items:center; border:1px solid var(--line); padding:8px; border-radius:10px">
        <div>${esc(p.regimen)} — L${p.line} — ${esc(p.response)}</div>
        <button class="iconbtn" data-mcl-del-prior="${i}" title="Rimuovi"><i data-lucide="trash-2"></i></button>
      </div>`).join('');
    mclIcons();
  }
  document.addEventListener('click', (e)=>{
    const del = e.target.closest('button[data-mcl-del-prior]');
    if(del){
      const i = parseInt(del.getAttribute('data-mcl-del-prior'),10);
      mcl.priorTx.splice(i,1); renderPriorList(); renderSelections();
    }
  });

  /* ===================== API ===================== */
  window.MCLTherapyHelper = {
    open, close,
    init(){ ensureDialogs(); mclIcons(); },
    getData(){ return JSON.parse(JSON.stringify(mcl)); },
    setData(d){
      if(!d) return;
      mcl.genetics  = Array.isArray(d.genetics)? d.genetics: [];
      mcl.molecular = Array.isArray(d.molecular)? d.molecular: [];
      mcl.scores    = Array.isArray(d.scores)? d.scores: [];
      mcl.priorTx   = Array.isArray(d.priorTx)? d.priorTx: [];
      mcl.context   = Array.isArray(d.context)? d.context: [];
      renderSelections();
    }
  };

  document.addEventListener('DOMContentLoaded', mclIcons);
})();
