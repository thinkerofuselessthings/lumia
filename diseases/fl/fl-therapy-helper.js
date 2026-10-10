/* =======================================================================
 * FLTherapyHelper — Follicular Lymphoma (FL) Therapeutic Advisor (IT)
 * Struttura e logica allineate a CLL/DLBCL helpers:
 *  - Modale principale + modali secondari (Genetica, Molecolare, Score, Pretrattamenti, Indicazioni GELF)
 *  - Selezioni tramite menu a tendina “one-shot” (come i CD): una volta inserito, non ri-selezionabile
 *  - Motore a regole con gate ESMO/AIFA e fattori clinici (GELF, FLIPI/PRIMA-PI, POD24, Grading)
 *
 * Fonti cardine (da verificare periodicamente):
 *  - ESMO CPG (Follicular Lymphoma): https://www.esmo.org/guidelines/  [aggiornamenti]
 *  - GELF criteria: mdcalc / Haematologica 2024 editoriale
 *  - AIFA: Lunsumio (mosunetuzumab) rimborsato per FL r/r ≥2L (GU n.216/15-09-2023, Registro attivo dal 16/09/2023)
 *  - AIFA: Yescarta (axi-cel) rimborsato per FL r/r ≥3L (Determina n.675/2023, GU 11-11-2023)
 *  - CAR-T & landscape R/R: ZUMA-5 follow-up
 *  - Tazemetostat (EZH2m) — verificare rimborsabilità locale prima dell’uso
 * ======================================================================= */

/* ---- util locale, isolato da altri helper ---- */
(function(){
  const $fl = (sel, r=document)=> r.querySelector(sel);
  function flIcons(){ if(window.lucide && lucide.createIcons) lucide.createIcons(); }
  function esc(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }

  /* ===================== DATASETS ===================== */

  // Voci “selezionabili” (si comportano come i CD: no duplicati)
  const FL_GENETICS = [
    't(14;18)/IGH::BCL2',
    'BCL2 overexpression',
    'EZH2 mutato',
    'TP53 mutato/deleto',
    'TNFRSF14 alterato (1p36)',
    'CREBBP mutato',
    'KMT2D mutato',
    'MYC riarrangiato (raro / trasformazione?)'
  ];

  const FL_MOLECULAR_RESIST = [
    'POD24 (progressione <24 mesi da 1L)',
    'Refrattarietà anti-CD20',
    'Refrattarietà lenalidomide',
    'Refrattarietà alchilanti',
    'Trasformazione istologica sospetta/diagnosticata'
  ];

  // Score supportati e loro item
  const SCORE_DEFS = {
    FLIPI: {
      desc: 'Age >60, Stadio III–IV, Hb <12 g/dL, LDH alto, >4 stazioni linfonodali',
      items: [
        {key:'age_gt60', label:'Età > 60 anni', type:'bool'},
        {key:'stage_3_4', label:'Stadio Ann Arbor III–IV', type:'bool'},
        {key:'hb_lt12', label:'Emoglobina < 12 g/dL', type:'bool'},
        {key:'ldh_high', label:'LDH elevato', type:'bool'},
        {key:'nodes_gt4', label:'> 4 aree linfonodali', type:'bool'}
      ],
      calc: v => (v.age_gt60+v.stage_3_4+v.hb_lt12+v.ldh_high+v.nodes_gt4)
    },
    FLIPI2: {
      desc: 'Age >60, β2M >ULN, midollo positivo, Hb <12, LN >6 cm',
      items: [
        {key:'age_gt60', label:'Età > 60 anni', type:'bool'},
        {key:'b2m_high', label:'β2-microglobulina > ULN', type:'bool'},
        {key:'bm_pos', label:'Infiltrazione midollare presente', type:'bool'},
        {key:'hb_lt12', label:'Emoglobina < 12 g/dL', type:'bool'},
        {key:'ln_gt6', label:'Linfonodo > 6 cm', type:'bool'}
      ],
      calc: v => (v.age_gt60+v.b2m_high+v.bm_pos+v.hb_lt12+v.ln_gt6)
    },
    PRIMA_PI: {
      desc: 'β2-microglobulina e infiltrazione midollare (Low/Intermediate/High)',
      items: [
        {key:'b2m_high', label:'β2-microglobulina > ULN', type:'bool'},
        {key:'bm_pos', label:'Infiltrazione midollare presente', type:'bool'}
      ],
      calc: v => (v.b2m_high && v.bm_pos) ? 2 : (v.b2m_high || v.bm_pos) ? 1 : 0
    }
  };

  // Indicazioni (GELF) — menu a tendina con inserimento one-shot
  const INDICAZIONI_GELF = [
    'Massa > 7 cm',
    '≥3 sedi > 3 cm',
    'Sintomi B',
    'Compressione d’organo / ostruzione',
    'Versamenti (pleurico/pericardico/peritoneale) da malattia',
    'Cito-penie da infiltrazione',
    'Splenomegalia sintomatica',
    'Leucemizzazione significativa'
  ];

  // Pretrattamenti “AIFA-validati” + classici; linee e risposta
  const REGIMENS = [
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
  ];
  const RESPONSES = ['CR','PR','SD','PD','Intolleranza/AE','Sconosciuta'];

  // Stato interno
  let flSelections = {
    genetics: [],     // [{key, note}]
    molecular: [],    // [{key, note}]
    scores: [],       // [{name, value (0..n), detail}]
    priorTx: [],      // [{regimen, line, response}]
    indications: []   // GELF chosen list
  };

  /* ===================== UI (DIALOGS) ===================== */

  let dlg, addDlg, scoreDlg, priorDlg, gelfDlg;

  function buildMainDialog(){
    const d = document.createElement('dialog');
    d.id = 'flDlg';
    d.innerHTML = `
      <div class="app-head">
        <div class="app-title"><i data-lucide="stethoscope"></i><span>Terapia — Linfoma Follicolare</span></div>
        <button class="iconbtn" data-fl="close"><i data-lucide="x"></i></button>
      </div>
      <div class="app-body">
        <div class="actions row">
          <button class="btn btn-primary" data-fl="addGen" title="Aggiungi genetica"><i data-lucide="dna"></i></button>
          <button class="btn" data-fl="addMol" title="Aggiungi fattore molecolare"><i data-lucide="activity"></i></button>
          <button class="btn" data-fl="addScore" title="Calcola/aggiungi score"><i data-lucide="list-checks"></i></button>
          <button class="btn" data-fl="addPrior" title="Aggiungi pretrattamento"><i data-lucide="clock-9"></i></button>
          <button class="btn" data-fl="addGELF" title="Indicazioni al trattamento (GELF)"><i data-lucide="alert-triangle"></i></button>
          <button class="btn" data-fl="compute" title="Calcola suggerimenti"><i data-lucide="calculator"></i></button>
          <button class="btn btn-danger" data-fl="reset" title="Reset"><i data-lucide="rotate-ccw"></i></button>
        </div>
        <div class="grid">
          <section class="card" aria-labelledby="flSel">
            <h2 id="flSel">Selezioni</h2>
            <div class="content" id="flSelBox" style="display:grid; gap:10px;">
              <!-- popolato via JS -->
            </div>
          </section>
          <section class="card" aria-labelledby="flRes">
            <h2 id="flRes">Proposte terapeutiche</h2>
            <div class="content" id="flResults">
              <p class="muted">Aggiungi dati e premi <strong>Calcola</strong>.</p>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(d); flIcons(); return d;
  }

  function buildSmallDialog(id, title, bodyHtml){
    const d = document.createElement('dialog');
    d.id = id;
    d.innerHTML = `
      <div class="app-head">
        <div class="app-title"><i data-lucide="beaker"></i><span>${title}</span></div>
        <button class="iconbtn" data-fl="closeSub"><i data-lucide="x"></i></button>
      </div>
      <div class="app-body" style="max-height:70vh; overflow:auto;">
        ${bodyHtml}
      </div>`;
    document.body.appendChild(d); flIcons(); return d;
  }

  function ensureDialogs(){
    if(!dlg) dlg = buildMainDialog();
    if(!addDlg) addDlg = buildSmallDialog('flAddDlg','Aggiungi/Modifica voce',
      `<div class="field">
         <label>Categoria</label>
         <select id="flAddCat">
           <option value="genetics">Genetica</option>
           <option value="molecular">Molecolare/Resistenza</option>
         </select>
       </div>
       <div class="field">
         <label>Seleziona voce</label>
         <select id="flAddKey"></select>
       </div>
       <div class="field">
         <label>Note (opzionale)</label>
         <input id="flAddNote" type="text" placeholder="es. metodo, VAF, data test">
       </div>
       <div class="row" style="justify-content:flex-end">
         <button class="btn btn-primary" data-fl="saveAdd"><i data-lucide="check"></i><span>OK</span></button>
       </div>`
    );
    if(!scoreDlg) scoreDlg = buildSmallDialog('flScoreDlg','Aggiungi score',
      `<div class="field">
         <label>Score</label>
         <select id="flScoreName">
           ${Object.keys(SCORE_DEFS).map(n=>`<option value="${n}">${n}</option>`).join('')}
         </select>
       </div>
       <div id="flScoreItems" class="stack" style="display:flex; flex-direction:column; gap:8px;"></div>
       <div class="row" style="justify-content:flex-end">
         <button class="btn btn-primary" data-fl="saveScore"><i data-lucide="check"></i><span>Calcola & aggiungi</span></button>
       </div>`
    );
    if(!priorDlg) priorDlg = buildSmallDialog('flPriorDlg','Aggiungi pretrattamento',
      `<div class="row" style="gap:8px; align-items:end; flex-wrap:wrap">
         <div class="field" style="min-width:240px">
           <label>Schema</label>
           <select id="flPriorReg">${REGIMENS.map(r=>`<option>${r}</option>`).join('')}</select>
         </div>
         <div class="field" style="width:120px">
           <label>Linea</label>
           <input id="flPriorLine" type="number" min="1" max="10" value="1">
         </div>
         <div class="field" style="min-width:160px">
           <label>Risposta</label>
           <select id="flPriorResp">${RESPONSES.map(r=>`<option>${r}</option>`).join('')}</select>
         </div>
         <button class="btn btn-primary" data-fl="savePrior"><i data-lucide="plus"></i></button>
       </div>
       <div id="flPriorList" class="stack" style="margin-top:10px"></div>`
    );
    if(!gelfDlg) gelfDlg = buildSmallDialog('flGelfDlg','Indicazioni al trattamento (GELF)',
      `<div class="stack" id="flGelfList" style="display:flex; flex-direction:column; gap:8px;">
        ${INDICAZIONI_GELF.map((k,i)=>`
          <label class="row" style="gap:10px; align-items:center">
            <input type="checkbox" data-fl="gelfChk" value="${esc(k)}">
            <span>${esc(k)}</span>
          </label>
        `).join('')}
       </div>
       <div class="row" style="justify-content:flex-end; margin-top:8px">
         <button class="btn btn-primary" data-fl="saveGELF"><i data-lucide="check"></i><span>OK</span></button>
       </div>`
    );
  }

  /* ===================== RENDER SELEZIONI ===================== */

  function pill(label, sub){
    return `<span class="tag">${esc(label)}${sub?` — <i>${esc(sub)}</i>`:''}</span>`;
  }

  function renderSelections(){
    const box = $fl('#flSelBox'); if(!box) return;
    box.innerHTML = `
      <div><strong>Genetica:</strong> ${flSelections.genetics.length ? flSelections.genetics.map(x=>pill(x.key, x.note)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Molecolare/Resistenza:</strong> ${flSelections.molecular.length ? flSelections.molecular.map(x=>pill(x.key, x.note)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Score:</strong> ${flSelections.scores.length ? flSelections.scores.map(s=>pill(`${s.name}: ${s.value}`, s.detail)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Pretrattamenti:</strong> ${flSelections.priorTx.length ? flSelections.priorTx.map(p=>pill(`${p.regimen} (L${p.line})`, p.response)).join(' ') : '<span class="muted">—</span>'}</div>
      <div><strong>Indicazioni (GELF):</strong> ${flSelections.indications.length ? flSelections.indications.map(k=>pill(k)).join(' ') : '<span class="muted">—</span>'}</div>
    `;
  }

  /* ===================== HELPERS DI LISTA (no duplicati) ===================== */

  function availableOptions(list, already){
    const used = new Set(already.map(x=>x.key));
    return list.filter(k=> !used.has(k));
  }

  function populateAddSelects(){
    const cat = $fl('#flAddCat').value;
    const sel = $fl('#flAddKey');
    const opts = (cat==='genetics')
      ? availableOptions(FL_GENETICS, flSelections.genetics)
      : availableOptions(FL_MOLECULAR_RESIST, flSelections.molecular);
    sel.innerHTML = opts.map(k=>`<option>${esc(k)}</option>`).join('') || `<option value="">— nessuna voce disponibile —</option>`;
  }

  /* ===================== SCORE UI ===================== */

  function renderScoreItems(){
    const name = $fl('#flScoreName').value;
    const def = SCORE_DEFS[name];
    const host = $fl('#flScoreItems');
    host.innerHTML = `<p class="muted" style="margin:0 0 6px 0">${esc(def.desc)}</p>` +
      def.items.map(it=>{
        if(it.type==='bool'){
          return `<label class="row" style="gap:8px; align-items:center">
                    <input type="checkbox" data-fl="scoreItem" value="${it.key}">
                    <span>${esc(it.label)}</span>
                  </label>`;
        }
        return '';
      }).join('');
  }

  function calcCurrentScore(){
    const name = $fl('#flScoreName').value;
    const def = SCORE_DEFS[name];
    const vals = {};
    def.items.forEach(it=>{
      if(it.type==='bool'){
        vals[it.key] = !![...document.querySelectorAll('[data-fl="scoreItem"]')].find(ch=>ch.value===it.key && ch.checked);
      }
    });
    const val = def.calc(vals);
    const detail = Object.keys(vals).filter(k=>vals[k]).join(', ') || '0 criteri';
    return { name, value: val, detail };
  }

  /* ===================== ENGINE DI RACCOMANDAZIONE ===================== */

  // Gating AIFA / contesto
  const GATE = {
    MOSUN: { aifa:true, minLine:2 },               // Lunsumio ≥2L
    AXICEL: { aifa:true, minLine:3 },              // Yescarta ≥3L
    LISO:   { aifa:true, minLine:2, only3B:true }, // Breyanzi FL3B ≥2L (rif. innovativi: verificare centro)
    TAZE:   { aifa:false, minLine:2 }              // tazemetostat: verifica locale
  };

  // Utility
  function has(key, where){ return where.some(x=>x.key===key); }
  function hasInd(k){ return flSelections.indications.includes(k); }
  function anyIndication(){ return flSelections.indications.length>0; }
  function maxLine(){ return flSelections.priorTx.reduce((m,p)=>Math.max(m, p.line||1), 0) || 0; }
  function grade3BSelected(){
    // euristica: user può annotarlo in molecolare (trasformazione) o genetica MYC / nota
    return has('Trasformazione istologica sospetta/diagnosticata', flSelections.molecular) ||
           flSelections.genetics.some(x=>/3B|grade\s*3B/i.test(x.note||''));
  }
  function pod24(){ return has('POD24 (progressione <24 mesi da 1L)', flSelections.molecular); }
  function ezh2m(){ return has('EZH2 mutato', flSelections.genetics); }
  function p53alt(){ return has('TP53 mutato/deleto', flSelections.genetics); }
  function cd20Refr(){ return has('Refrattarietà anti-CD20', flSelections.molecular); }

  // Scoring per regime
  function scoreRegimens(){
    const out = [];

    const lineNow = maxLine()+1;              // linea che stiamo scegliendo
    const needTx = anyIndication();           // se false → candidabile WW
    const is3B = grade3BSelected();

    // 0) Watch & Wait
    if(lineNow===1 && !needTx){
      out.push({name:'Watch & Wait', class:'osservazione', aifa:true, score: 8, notes:['Basso carico di malattia / assenza criteri GELF']});
    }

    // Se 3B → suggerisci passaggio a pathway DLBCL
    if(is3B){
      out.push({name:'Gestione come DLBCL (FL3B)', class:'aggressivo', aifa:true, score: 9,
        notes:['FL grado 3B: strategia tipo DLBCL (CHOP-like ± anti-CD20, valutare consolidamento)']});
      // continuare comunque con opzioni indolenti a punteggio ridotto? Preferiamo fermare qui
    }

    // 1) Prima linea “HTB” (GELF) grade 1–3A
    if(lineNow===1 && needTx && !is3B){
      const base = 7 + (p53alt()? -1:0);
      out.push({name:'BR (bendamustina+rituximab)', class:'chemoimmuno', aifa:true, score: base+2,
        notes:['1ª linea sintomatica: opzione standard; valutare mantenimento con R']});
      out.push({name:'G-benda (obinutuzumab+bendamustina)', class:'chemoimmuno', aifa:true, score: base+1,
        notes:['Alternativa a BR; possibile mantenimento con G']});
      out.push({name:'R-CHOP', class:'chemoimmuno', aifa:true, score: base,
        notes:['Utile se sospetta componente trasformativa o necessità risposta rapida']});
      out.push({name:'R-CVP', class:'chemoimmuno', aifa:true, score: base-1,
        notes:['Opzione meno intensiva']});
      out.push({name:'R2 (rituximab+lenalidomide)', class:'chemo-free', aifa:true, score: base,
        notes:['Chemo-sparing; considerare comorbidità e rischio trombotico']});
    }

    // 2) Linee successive (≥2L)
    if(lineNow>=2){
      const heavy = pod24()? 2:0;
      const anti20pen = cd20Refr()? -2:0;
      // Re-challenge anti-CD20 (se non refrattario)
      if(!cd20Refr()){
        out.push({name:'R2 (rituximab+lenalidomide)', class:'chemo-free', aifa:true, score: 7+heavy,
          notes:['Re-challenge con anti-CD20 possibile non-refrattario','Chemo-sparing']});
        out.push({name:'BR (bendamustina+rituximab)', class:'chemoimmuno', aifa:true, score: 7+heavy,
          notes:['Se non impiegato in 1L o con risposta duratura']});
        out.push({name:'G-based (G-benda/G-CHOP/G-CVP)', class:'chemoimmuno', aifa:true, score: 6+heavy,
          notes:['Switch anti-CD20: valutare G se rituximab-refrattario funzionale']});
      } else {
        out.push({name:'Regimi senza anti-CD20 (es. chemioterapia ± switch a G)', class:'chemoimmuno', aifa:true, score: 5+heavy+anti20pen,
          notes:['Refrattarietà anti-CD20: preferire switch a G o strategie chemo-free / cellulari']});
      }

      // Targeted
      if(ezh2m()){
        out.push({name:'Tazemetostat (EZH2 mutato) — verifica AIFA locale', class:'targeted', aifa:false, score: 7,
          notes:['Indicato in EZH2-mut R/R (regolatorio variabile); considerare arruolamento registro / accesso']});
      }

      // Immunoterapie / bispecifici / CAR-T
      if(lineNow>=GATE.MOSUN.minLine){
        out.push({name:'Mosunetuzumab (Lunsumio)', class:'bispecific', aifa:GATE.MOSUN.aifa, score: 8+heavy,
          notes:[`Rimborsato in Italia ≥${GATE.MOSUN.minLine}L; schema fixed-duration; monitorare CRS/ICANS`]});
      }
      if(lineNow>=GATE.AXICEL.minLine){
        out.push({name:'Axicabtagene ciloleucel (Yescarta)', class:'CAR-T', aifa:GATE.AXICEL.aifa, score: 9+heavy,
          notes:[`Rimborsato in Italia ≥${GATE.AXICEL.minLine}L; valutare idoneità a CAR-T e centro accreditato`]});
      }
      if(is3B && lineNow>=GATE.LISO.minLine){
        out.push({name:'Lisocabtagene maraleucel (Breyanzi) — FL3B', class:'CAR-T', aifa:GATE.LISO.aifa, score: 8+heavy,
          notes:['FL3B: indicazione specifica; verificare criteri centro e disponibilità']});
      }
    }

    // Ordina per score (desc) e filtra per gate AIFA se necessario (mostriamo comunque ma con etichetta)
    return out.sort((a,b)=> b.score - a.score);
  }

  function renderResults(){
    const box = $fl('#flResults');
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
    <p class="muted">Nota: ranking qualitativo; integrare con comorbidità, preferenze del paziente, accessibilità a centri CAR-T/Trial.</p>`;
  }

  /* ===================== EVENTS ===================== */

  function open(){ ensureDialogs(); dlg.showModal(); flIcons(); renderSelections(); }
  function close(){ if(dlg) dlg.close(); }

  document.addEventListener('click', (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const act = b.getAttribute('data-fl');

    if(act==='close'){ close(); }
    if(act==='compute'){ renderResults(); }
    if(act==='reset'){
      if(confirm('Sicuro di voler azzerare i dati?')){
        flSelections = {genetics:[], molecular:[], scores:[], priorTx:[], indications:[]};
        renderSelections(); $fl('#flResults').innerHTML='<p class="muted">Azzera completato.</p>';
      }
    }

    // Apertura modali secondari
    if(act==='addGen' || act==='addMol'){
      ensureDialogs();
      addDlg.showModal();
      $fl('#flAddCat').value = (act==='addGen') ? 'genetics' : 'molecular';
      populateAddSelects(); flIcons();
    }
    if(act==='addScore'){ ensureDialogs(); scoreDlg.showModal(); renderScoreItems(); flIcons(); }
    if(act==='addPrior'){ ensureDialogs(); priorDlg.showModal(); renderPriorList(); flIcons(); }
    if(act==='addGELF'){ ensureDialogs(); gelfDlg.showModal(); // preseleziona già scelti
      [...gelfDlg.querySelectorAll('[data-fl="gelfChk"]')].forEach(ch => ch.checked = flSelections.indications.includes(ch.value));
      flIcons();
    }

    // Salvataggi modali
    if(act==='saveAdd'){
      const cat = $fl('#flAddCat').value;
      const key = $fl('#flAddKey').value;
      const note = $fl('#flAddNote').value.trim();
      if(!key){ addDlg.close(); return; }
      const arr = (cat==='genetics') ? flSelections.genetics : flSelections.molecular;
      if(arr.some(x=>x.key===key)) { alert('Voce già inserita.'); return; }
      arr.push({key, note});
      $fl('#flAddNote').value=''; populateAddSelects(); renderSelections();
    }
    if(act==='saveScore'){
      const s = calcCurrentScore();
      // sostituisci se già presente lo stesso score
      const idx = flSelections.scores.findIndex(x=>x.name===s.name);
      if(idx>-1) flSelections.scores[idx]=s; else flSelections.scores.push(s);
      scoreDlg.close(); renderSelections();
    }
    if(act==='savePrior'){
      const reg = $fl('#flPriorReg').value;
      const line = parseInt($fl('#flPriorLine').value||'1',10);
      const resp = $fl('#flPriorResp').value;
      flSelections.priorTx.push({regimen:reg, line, response:resp});
      renderPriorList(); renderSelections();
    }
    if(act==='saveGELF'){
      const chosen = [...gelfDlg.querySelectorAll('[data-fl="gelfChk"]:checked')].map(ch=>ch.value);
      flSelections.indications = chosen;
      gelfDlg.close(); renderSelections();
    }

    // Close sub dialogs
    if(act==='closeSub'){
      [addDlg, scoreDlg, priorDlg, gelfDlg].forEach(d=> d && d.close());
    }

    if(b.id==='launchFL'){ open(); }
  });

  // Dinamica Add dialog
  document.addEventListener('change', (e)=>{
    if(e.target && e.target.id==='flAddCat'){ populateAddSelects(); }
    if(e.target && e.target.id==='flScoreName'){ renderScoreItems(); }
  });

  // Render lista pretrattamenti
  function renderPriorList(){
    const host = $fl('#flPriorList'); if(!host) return;
    if(flSelections.priorTx.length===0){ host.innerHTML='<p class="muted">Nessuno.</p>'; return; }
    host.innerHTML = flSelections.priorTx.map((p,i)=>`
      <div class="row" style="justify-content:space-between; gap:8px; align-items:center; border:1px solid var(--line); padding:8px; border-radius:10px">
        <div>${esc(p.regimen)} — L${p.line} — ${esc(p.response)}</div>
        <button class="iconbtn" data-fl-del-prior="${i}" title="Rimuovi"><i data-lucide="trash-2"></i></button>
      </div>`).join('');
    flIcons();
  }
  document.addEventListener('click', (e)=>{
    const del = e.target.closest('button[data-fl-del-prior]');
    if(del){
      const i = parseInt(del.getAttribute('data-fl-del-prior'),10);
      flSelections.priorTx.splice(i,1); renderPriorList(); renderSelections();
    }
  });

  /* ===================== API ===================== */
  window.FLTherapyHelper = {
    open, close,
    init(){ ensureDialogs(); flIcons(); },
    getData(){ return JSON.parse(JSON.stringify(flSelections)); },
    setData(d){
      if(!d) return;
      flSelections.genetics = Array.isArray(d.genetics)? d.genetics: [];
      flSelections.molecular = Array.isArray(d.molecular)? d.molecular: [];
      flSelections.scores = Array.isArray(d.scores)? d.scores: [];
      flSelections.priorTx = Array.isArray(d.priorTx)? d.priorTx: [];
      flSelections.indications = Array.isArray(d.indications)? d.indications: [];
      renderSelections();
    }
  };

  // icone asap
  document.addEventListener('DOMContentLoaded', flIcons);
})();
