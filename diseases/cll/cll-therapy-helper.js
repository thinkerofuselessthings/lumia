/* =====================  CLL THERAPY HELPER (ESMO + AIFA)  ===================== *
 * File: ./app/diseases/cll/cll-therapy-helper.js
 * Requisiti: icone lucide già caricate; CSS base (btn, iconbtn, grid, card, tag, result-row...).
 * Non aggiunge bottoni da solo. Usa CLLTherapyHelper.open() per aprire il modulo.
 * ============================================================================ */

/* ---------- Dataset di base ---------- */

// GENETICA/FISH & biologia (stati: yes/no)
const TX_GENETICS = [
  {key:'TP53_aberration', label:'Aberrazione TP53 (del17p e/o mut TP53)'},
  {key:'IGHV_unmut',      label:'IGHV non mutato'},
  {key:'IGHV_mut',        label:'IGHV mutato'},
  {key:'del11q',          label:'del(11q)/ATM'},
  {key:'del13q',          label:'del(13q)'},
  {key:'trisomy12',       label:'Trisomia 12'},
  {key:'complex_karyotype', label:'Cariotipo complesso (≥3)'},
  {key:'NOTCH1',          label:'NOTCH1 mut'},
  {key:'SF3B1',           label:'SF3B1 mut'},
  {key:'BIRC3',           label:'BIRC3 mut'},
  {key:'ATM_mut',         label:'ATM mut'},
  {key:'MYD88',           label:'MYD88 L265P (raro)'},
];

// MUTAZIONI di resistenza (stati: present/absent/unk)
const TX_MUTATIONS = [
  {key:'BTK_C481',   label:'BTK C481S/C481X (resistenza ai cBTKi)'},
  {key:'PLCG2_act',  label:'PLCG2 attivanti (R665W/L845F/… )'},
  {key:'BTK_T474',   label:'BTK T474X (gatekeeper, resistenza n-cBTKi)'},
  {key:'BTK_L528W',  label:'BTK L528W (kinase-impaired)'},
  {key:'BTK_other',  label:'BTK varianti non-C481 (V416L/A428D/D539H/…)'},
  {key:'BCL2_G101V', label:'BCL2 G101V (resistenza a venetoclax)'},
  {key:'BCL2_D103',  label:'BCL2 D103N/Y (resistenza a venetoclax)'},
];

// SCORE disponibili
const TX_SCORES = [
  {key:'rai',     label:'Rai'},
  {key:'binet',   label:'Binet'},
  {key:'cll_ipi', label:'CLL-IPI'}
];

// Regimi (nome breve, tipo, linea, AIFA flag)
const TX_REGIMENS = {
  'acalabrutinib': {
    name:'Acalabrutinib',
    type:'BTKi (covalente, 2ª gen)',
    aifa:true, lines:['1L','RR'],
    dosing:'100 mg BID (continuo)',
    notes:'Preferibile vs ibrutinib per safety in molte LG.',
    refs:['Calquence RCP EMA/AIFA'],
  },
  'zanubrutinib': {
    name:'Zanubrutinib',
    type:'BTKi (covalente, 2ª gen)',
    aifa:true, lines:['1L','RR'],
    dosing:'160 mg BID o 320 mg QD (continuo)',
    notes:'Opzione 1L/RR; 2ª gen.',
    refs:['Brukinsa label'],
  },
  'ibrutinib': {
    name:'Ibrutinib',
    type:'BTKi (covalente, 1ª gen)',
    aifa:true, lines:['1L','RR'],
    dosing:'420 mg QD (continuo)',
    notes:'Valuta 2ª gen se possibile.',
    refs:['Imbruvica label'],
  },
  'ibrutinib_venetoclax': {
    name:'Ibrutinib + Venetoclax (15 mesi)',
    type:'BTKi + BCL2i (durata fissa)',
    aifa:true, lines:['1L'],
    dosing:'Ibrutinib continuo + Venetoclax ramp-up → 12 mesi (tot ~15 mesi)',
    notes:'Schema time-limited rimborsato (1L).',
    refs:['AIFA 2024'],
  },
  'venetoclax_obinutuzumab': {
    name:'Venetoclax + Obinutuzumab (VO)',
    type:'BCL2i + anti-CD20 (durata fissa)',
    aifa:true, lines:['1L'],
    dosing:'VEN ramp-up → 12 mesi; OBI 6 cicli',
    notes:'Opzione time-limited.',
    refs:['CLL14 / RCP'],
  },
  'venetoclax_rituximab': {
    name:'Venetoclax + Rituximab (VR)',
    type:'BCL2i + anti-CD20 (durata fissa)',
    aifa:true, lines:['RR'],
    dosing:'VEN 24 mesi; RTX 6 cicli (MURANO)',
    notes:'Standard in recidiva post-cIT o post-BTKi.',
    refs:['MURANO'],
  },
  'obinutuzumab_chlorambucil': {
    name:'Obinutuzumab + Chlorambucil',
    type:'CIT',
    aifa:true, lines:['1L'],
    dosing:'Schema CLL11 (6 cicli)',
    notes:'Per molto fragili; meno usato.',
    refs:['CLL11'],
  },
  'FCR': {
    name:'FCR (fit, IGHV mut, no TP53)',
    type:'CIT',
    aifa:true, lines:['1L'],
    dosing:'FCR standard × 6 cicli',
    notes:'Coorte selezionata giovane IGHV mut.',
    refs:['ESMO'],
  },
};

/* ---------- Stato ---------- */
const txState = {
  genetics: [],        // [{key, value:'yes'|'no'}]
  mutations: [],       // [{key, value:'present'|'absent'|'unk'}]
  scores: {},          // { rai:{stage}, binet:{stage}, cll_ipi:{score, risk} }
  history: [],         // [{regimenKey, line:'1L'|'RR', response:'CR'|'PR'|'SD'|'PD'|'intolerance'}]
  indications: new Set() // Set<string>
};

/* ---------- Utilità DOM ---------- */
const $tx = (s, r=document)=> r.querySelector(s);
function txEl(tag, attrs={}, html=''){
  const n = document.createElement(tag);
  Object.entries(attrs||{}).forEach(([k,v])=> n.setAttribute(k,v));
  if(html!==undefined) n.innerHTML = html;
  return n;
}
function txIcons(){ if(window.lucide && lucide.createIcons) lucide.createIcons(); }
function txLabelOf(list, key){ const it=list.find(x=>x.key===key); return it?it.label:key; }

/* Select dinamica stile “CD” */
function txPopulateSelect(selectEl, options, usedKeys = new Set(), currentKey = null){
  selectEl.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— seleziona —';
  selectEl.appendChild(placeholder);

  options.forEach(o=>{
    if (o.key === currentKey || !usedKeys.has(o.key)){
      const opt = document.createElement('option');
      opt.value = o.key; opt.textContent = o.label;
      selectEl.appendChild(opt);
    }
  });
  if(currentKey){ selectEl.value = currentKey; }
}

/* ---------- Builder modali ---------- */
function txBuildDialog(){
  const dlg = txEl('dialog', {id:'txDlg', 'aria-labelledby':'txTitle'});
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="stethoscope"></i><span id="txTitle">CLL — Assistente terapeutico</span></div>
      <button class="iconbtn" id="txClose" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body">
      <div class="actions row">
        <button class="btn btn-primary" id="txAddGen" title="Genetica"><i data-lucide="dna"></i></button>
        <button class="btn" id="txAddMut" title="Mutazioni resistenza"><i data-lucide="activity"></i></button>
        <button class="btn" id="txAddScore" title="Score di rischio"><i data-lucide="list-plus"></i></button>
        <button class="btn" id="txAddHist" title="Storia trattamenti"><i data-lucide="history"></i></button>
        <button class="btn" id="txIndications" title="Indicazioni iwCLL"><i data-lucide="check-square"></i></button>
        <button class="btn" id="txCompute" title="Calcola raccomandazioni"><i data-lucide="calculator"></i></button>
        <button class="btn btn-danger" id="txReset" title="Reset"><i data-lucide="rotate-ccw"></i></button>
      </div>
      <div class="grid">
        <section class="card" aria-labelledby="txSel">
          <h2 id="txSel">Dati inseriti</h2>
          <div class="content" id="txSummary">
            <div class="muted">Nessun dato. Aggiungi elementi con i pulsanti sopra.</div>
          </div>
        </section>
        <section class="card" aria-labelledby="txRes">
          <h2 id="txRes">Raccomandazioni</h2>
          <div class="content" id="txResults">
            <p class="muted">Inserisci i dati e premi <strong>calcola</strong>.</p>
          </div>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(dlg);
  txIcons();
  return dlg;
}
function txBuildAddDialog(){
  const dlg = txEl('dialog', {id:'txAddDlg'});
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="beaker"></i><span id="txAddTitle">Aggiungi</span></div>
      <button class="iconbtn" id="txAddClose" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body" id="txAddBody"><!-- dinamico --></div>
  `;
  document.body.appendChild(dlg);
  txIcons();
  return dlg;
}
function txBuildRegDialog(){
  const dlg = txEl('dialog', {id:'txRegimenDlg'});
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="file-text"></i><span id="txRegTitle">Dettaglio schema</span></div>
      <button class="iconbtn" id="txRegClose" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body" id="txRegBody"></div>
  `;
  document.body.appendChild(dlg);
  txIcons();
  return dlg;
}

/* ---------- Rendering ---------- */
function txRenderSummary(){
  const box = $tx('#txSummary');
  const pill = (t)=> `<span class="tag">${t}</span>`;
  let h = [];

  if(txState.genetics.length){
    h.push('<div class="row"><strong>Genetica:</strong> ' +
      txState.genetics.map(x=>pill(`${txLabelOf(TX_GENETICS,x.key)}: ${x.value==='yes'?'Presente':'Assente'}`)).join(' ') + '</div>');
  }
  if(txState.mutations.length){
    h.push('<div class="row"><strong>Mutazioni resistenza:</strong> ' +
      txState.mutations.map(x=>pill(`${txLabelOf(TX_MUTATIONS,x.key)}: ${x.value}`)).join(' ') + '</div>');
  }
  if(Object.keys(txState.scores).length){
    const parts = [];
    if(txState.scores.rai)     parts.push(`Rai: ${txState.scores.rai.stage}`);
    if(txState.scores.binet)   parts.push(`Binet: ${txState.scores.binet.stage}`);
    if(txState.scores.cll_ipi) parts.push(`CLL-IPI: ${txState.scores.cll_ipi.risk} (${txState.scores.cll_ipi.score})`);
    h.push('<div class="row"><strong>Score:</strong> ' + parts.map(pill).join(' ') + '</div>');
  }
  if(txState.history.length){
    h.push('<div class="row"><strong>Storia tratt.:</strong> ' +
      txState.history.map(x=>pill(`${TX_REGIMENS[x.regimenKey].name} [${x.line}] → ${x.response}`)).join(' ') + '</div>');
  }
  if(txState.indications.size){
    h.push('<div class="row"><strong>Indicazioni iwCLL:</strong> ' +
      [...txState.indications].map(pill).join(' ') + '</div>');
  }

  box.innerHTML = h.length ? h.join('<div class="sep"></div>') : '<div class="muted">Nessun dato.</div>';
}

/* ---------- Add flows ---------- */
/* Genetica — inserimento “tipo CD” (select + stato; niente duplicati) */
function txOpenAddGen(){
  $tx('#txAddTitle').textContent = 'Genetica / Biologia (aggiungi come per i CD)';
  const body = $tx('#txAddBody'); body.innerHTML = '';

  const used = new Set(txState.genetics.map(x=>x.key));

  const row = txEl('div', {class:'row'});
  row.innerHTML = `
    <label>Parametro</label>
    <select id="genPick"></select>
    <label>Stato</label>
    <select id="genState">
      <option value="yes">Presente</option>
      <option value="no">Assente</option>
    </select>
    <button class="btn" id="genAdd" title="Aggiungi"><i data-lucide="plus"></i></button>
  `;

  const list = txEl('div', {id:'genList', class:'stack', style:'margin-top:8px;'});
  const save = txEl('div', {class:'row', style:'justify-content:flex-end;'});
  save.innerHTML = `<button class="btn btn-primary" id="txAddGenClose"><i data-lucide="check"></i></button>`;

  body.append(row, list, save);
  txIcons();

  // popola select dinamica (esclude già inseriti)
  txPopulateSelect($tx('#genPick'), TX_GENETICS, used, null);

  function renderGenList(){
    list.innerHTML = txState.genetics.length
      ? txState.genetics.map((g,i)=> `<div class="row">
            <span class="tag">${txLabelOf(TX_GENETICS,g.key)}: ${g.value==='yes'?'Presente':'Assente'}</span>
            <button class="btn" data-delgen="${i}" title="Rimuovi"><i data-lucide="trash-2"></i></button>
          </div>`).join('')
      : '<div class="muted">Nessun elemento inserito.</div>';
    list.querySelectorAll('[data-delgen]').forEach(b=>{
      b.onclick = ()=>{
        const idx = parseInt(b.dataset.delgen,10);
        txState.genetics.splice(idx,1);
        txPopulateSelect($tx('#genPick'), TX_GENETICS, new Set(txState.genetics.map(x=>x.key)), null);
        renderGenList(); txIcons(); txRenderSummary();
      };
    });
  }

  $tx('#genAdd').onclick = ()=>{
    const k = $tx('#genPick').value;
    const v = $tx('#genState').value;
    if(!k) return;
    if(txState.genetics.some(x=>x.key===k)) return;
    txState.genetics.push({key:k, value:v});
    txPopulateSelect($tx('#genPick'), TX_GENETICS, new Set(txState.genetics.map(x=>x.key)), null);
    renderGenList(); txIcons(); txRenderSummary();
  };

  $tx('#txAddGenClose').onclick = ()=>{ $tx('#txAddDlg').close(); };

  renderGenList();
  $tx('#txAddDlg').showModal();
}

/* Mutazioni di resistenza — selettori a lista */
function txOpenAddMut(){
  $tx('#txAddTitle').textContent = 'Mutazioni di resistenza';
  const body = $tx('#txAddBody'); body.innerHTML='';
  const grid = txEl('div', {class:'stack'});

  TX_MUTATIONS.forEach(m=>{
    const row = txEl('div', {class:'row'});
    // stato corrente (se già salvato)
    const curr = txState.mutations.find(x=>x.key===m.key)?.value || 'unk';
    row.innerHTML = `
      <label style="min-width:300px">${m.label}</label>
      <select data-k="${m.key}">
        <option value="unk" ${curr==='unk'?'selected':''}>Non testato / n.d.</option>
        <option value="present" ${curr==='present'?'selected':''}>Presente</option>
        <option value="absent" ${curr==='absent'?'selected':''}>Assente</option>
      </select>`;
    grid.appendChild(row);
  });

  const save = txEl('div', {class:'row', style:'justify-content:flex-end;'});
  save.innerHTML = `<button class="btn btn-primary" id="txAddMutSave"><i data-lucide="check"></i></button>`;
  body.appendChild(grid); body.appendChild(save); txIcons();

  $tx('#txAddMutSave').onclick = ()=>{
    txState.mutations = [];
    body.querySelectorAll('select[data-k]').forEach(s=>{
      const v = s.value; if(v!=='unk') txState.mutations.push({key:s.dataset.k, value:v});
    });
    txRenderSummary(); $tx('#txAddDlg').close();
  };

  $tx('#txAddDlg').showModal();
}

/* Score: selezione con descrizioni complete (Rai/Binet) + CLL-IPI calcolato */
function txTplRai(){
  return `
    <div data-score="rai" class="stack">
      <div class="row"><label>Stadio Rai (scegli in base alla descrizione)</label>
        <select id="raiStage">
          <option value="">—</option>
          <option value="0">0 — Solo linfocitosi; nessuna linfoadenopatia/organomegalia; Hb ≥ 11 g/dL; PLT ≥ 100×10⁹/L</option>
          <option value="I">I — Linfocitosi con linfoadenopatia</option>
          <option value="II">II — Linfocitosi con spleno/epatomegalia (± linfoadenopatia)</option>
          <option value="III">III — Linfocitosi con anemia (Hb &lt; 11 g/dL)</option>
          <option value="IV">IV — Linfocitosi con piastrinopenia (PLT &lt; 100×10⁹/L)</option>
        </select>
      </div>
      <p class="muted">Le citopenie definiscono III (anemia) e IV (piastrinopenia) indipendentemente dai linfonodi.</p>
    </div>`;
}
function txTplBinet(){
  return `
    <div data-score="binet" class="stack">
      <div class="row"><label>Stadio Binet (scegli in base alla descrizione)</label>
        <select id="binetStage">
          <option value="">—</option>
          <option value="A">A — &lt; 3 aree linfoidi (cervicali, ascellari, inguinali dx/sx, milza, fegato) e Hb ≥ 10 g/dL, PLT ≥ 100×10⁹/L</option>
          <option value="B">B — ≥ 3 aree linfoidi e Hb ≥ 10 g/dL, PLT ≥ 100×10⁹/L</option>
          <option value="C">C — Hb &lt; 10 g/dL e/o PLT &lt; 100×10⁹/L (indipendentemente dalle aree)</option>
        </select>
      </div>
      <p class="muted">Aree: laterocervicali, ascellari, inguinali (dx/sx), splenomegalia, epatomegalia.</p>
    </div>`;
}
function txTplCLLIPI(){
  return `
    <div data-score="cll_ipi" class="stack">
      <div class="row"><label>Età &gt; 65 anni</label>
        <select id="ipi_age"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>β2-microglobulina &gt; 3.5 mg/L</label>
        <select id="ipi_b2m"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>Stadio avanzato (Rai I-IV o Binet B/C)</label>
        <select id="ipi_stage"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>IGHV non mutato</label>
        <select id="ipi_ighv"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>Aberrazione TP53 (del17p/mut)</label>
        <select id="ipi_tp53"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <p class="muted">Classi CLL-IPI: 0-1 basso; 2-3 intermedio; 4 alto; 5-10 molto alto.</p>
    </div>`;
}
function txReadCLLIPI(){
  return {
    age:   $tx('#ipi_age').value==='yes',
    b2m:   $tx('#ipi_b2m').value==='yes',
    stage: $tx('#ipi_stage').value==='yes',
    ighv:  $tx('#ipi_ighv').value==='yes',
    tp53:  $tx('#ipi_tp53').value==='yes'
  };
}
function txComputeCLLIPI({age,b2m,stage,ighv,tp53}){
  let s = 0;
  if(age)   s += 1;
  if(b2m)   s += 2;
  if(stage) s += 1;
  if(ighv)  s += 2;
  if(tp53)  s += 4;
  const risk = (s<=1)?'Basso':(s<=3)?'Intermedio':(s<=4)?'Alto':'Molto alto';
  return { score:s, risk };
}
function txOpenAddScores(){
  $tx('#txAddTitle').textContent = 'Score di rischio';
  const body = $tx('#txAddBody'); body.innerHTML='';

  const row = txEl('div', {class:'row'});
  row.innerHTML = `
    <label>Seleziona score</label>
    <select id="scorePick">
      <option value="">—</option>
      ${TX_SCORES.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}
    </select>
    <button class="btn" id="scoreGo" title="Apri"><i data-lucide="chevron-right"></i></button>
  `;
  const area = txEl('div', {id:'scoreArea', class:'stack'});
  const save = txEl('div', {class:'row', style:'justify-content:flex-end;'});
  save.innerHTML = `<button class="btn btn-primary" id="txAddScoreSave"><i data-lucide="check"></i></button>`;

  body.append(row,area,save); txIcons();

  $tx('#scoreGo').onclick = ()=>{
    const v = $tx('#scorePick').value;
    area.innerHTML = (v==='rai')     ? txTplRai() :
                     (v==='binet')   ? txTplBinet() :
                     (v==='cll_ipi') ? txTplCLLIPI() : '';
    txIcons();
  };

  $tx('#txAddScoreSave').onclick = ()=>{
    if($tx('#scoreArea [data-score="rai"]')){
      const st = $tx('#raiStage')?.value || '';
      if(st) txState.scores.rai = { stage: st };
    }
    if($tx('#scoreArea [data-score="binet"]')){
      const st = $tx('#binetStage')?.value || '';
      if(st) txState.scores.binet = { stage: st };
    }
    if($tx('#scoreArea [data-score="cll_ipi"]')){
      const data = txReadCLLIPI();
      if(data){ txState.scores.cll_ipi = txComputeCLLIPI(data); }
    }
    txRenderSummary(); $tx('#txAddDlg').close();
  };

  $tx('#txAddDlg').showModal();
}

/* Storia trattamenti */
function txOpenAddHistory(){
  $tx('#txAddTitle').textContent = 'Storia dei trattamenti';
  const body = $tx('#txAddBody'); body.innerHTML='';
  const row = txEl('div', {class:'row'});
  row.innerHTML = `
    <label>Schema</label>
    <select id="histReg"><option value="">—</option>
      ${Object.entries(TX_REGIMENS).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')}
    </select>
    <label>Linea</label>
    <select id="histLine"><option>1L</option><option>RR</option></select>
  `;
  const row2 = txEl('div', {class:'row'});
  row2.innerHTML = `
    <label>Risposta</label>
    <select id="histResp">
      <option value="CR">CR</option><option value="PR">PR</option>
      <option value="SD">SD</option><option value="PD">PD</option>
      <option value="intolerance">Intolleranza</option>
    </select>
    <button class="btn" id="histAdd" title="Aggiungi"><i data-lucide="plus"></i></button>
  `;
  const list = txEl('div', {id:'histList', class:'stack', style:'margin-top:8px;'});
  const save = txEl('div', {class:'row', style:'justify-content:flex-end;'});
  save.innerHTML = `<button class="btn btn-primary" id="txAddHistSave"><i data-lucide="check"></i></button>`;

  body.append(row,row2,list,save); txIcons();

  $tx('#histAdd').onclick = ()=>{
    const k = $tx('#histReg').value; if(!k) return;
    const line = $tx('#histLine').value; const response = $tx('#histResp').value;
    txState.history.push({regimenKey:k,line,response});
    txRenderHist(list); txIcons();
  };
  $tx('#txAddHistSave').onclick = ()=>{ txRenderSummary(); $tx('#txAddDlg').close(); };
  txRenderHist(list);

  $tx('#txAddDlg').showModal();
}
function txRenderHist(container){
  container.innerHTML = txState.history.length
    ? txState.history.map((x,i)=> `<div class="row"><span class="tag">${TX_REGIMENS[x.regimenKey].name} [${x.line}] → ${x.response}</span>
         <button class="btn" data-delhist="${i}" title="Rimuovi"><i data-lucide="trash-2"></i></button></div>`).join('')
    : '<div class="muted">Nessuno schema aggiunto.</div>';
  container.querySelectorAll('[data-delhist]').forEach(b=>{
    b.onclick = ()=>{ txState.history.splice(parseInt(b.dataset.delhist,10),1); txRenderHist(container); };
  });
}

/* Indicazioni iwCLL — inserimento “tipo CD” (select + aggiungi; niente duplicati) */
const IWCLL_FLAGS = [
  'Sintomi B (febbre, sudorazioni, calo ponderale)',
  'Progressione rapida linfocitosi (raddoppio < 6 mesi)',
  'Anemia progressiva o Hb < 10 g/dL dovuta a CLL',
  'Piastrinopenia < 100 ×10⁹/L dovuta a CLL',
  'Linfoadenopatia/splenomegalia massiva o progressiva',
  'Autoimmunità refrattaria (AIHA/ITP) non controllata',
  'Coinvolgimento extranodale sintomatico'
];
function txOpenIndications(){
  $tx('#txAddTitle').textContent = 'Indicazioni al trattamento (iwCLL) — inserimento tipo CD';
  const body = $tx('#txAddBody'); body.innerHTML = '';

  const allFlags = IWCLL_FLAGS.map(f=>({key:f, label:f}));
  const used = new Set(txState.indications);

  const row = txEl('div', {class:'row'});
  row.innerHTML = `
    <label>Indicazione</label>
    <select id="iwPick"></select>
    <button class="btn" id="iwAdd" title="Aggiungi"><i data-lucide="plus"></i></button>
  `;

  const list = txEl('div', {id:'iwList', class:'stack', style:'margin-top:8px;'});
  const save = txEl('div', {class:'row', style:'justify-content:flex-end;'});
  save.innerHTML = `<button class="btn btn-primary" id="txIndClose"><i data-lucide="check"></i></button>`;

  body.append(row, list, save);
  txIcons();

  txPopulateSelect($tx('#iwPick'), allFlags, used, null);

  function renderIwList(){
    list.innerHTML = (txState.indications.size>0)
      ? [...txState.indications].map((f)=> `<div class="row">
            <span class="tag">${f}</span>
            <button class="btn" data-deliw="${encodeURIComponent(f)}" title="Rimuovi"><i data-lucide="trash-2"></i></button>
         </div>`).join('')
      : '<div class="muted">Nessuna indicazione selezionata.</div>';

    list.querySelectorAll('[data-deliw]').forEach(b=>{
      b.onclick = ()=>{
        const key = decodeURIComponent(b.dataset.deliw);
        txState.indications.delete(key);
        txPopulateSelect($tx('#iwPick'), allFlags, new Set(txState.indications), null);
        renderIwList(); txIcons(); txRenderSummary();
      };
    });
  }

  $tx('#iwAdd').onclick = ()=>{
    const k = $tx('#iwPick').value;
    if(!k) return;
    txState.indications.add(allFlags.find(x=>x.key===k).label);
    txPopulateSelect($tx('#iwPick'), allFlags, new Set(txState.indications), null);
    renderIwList(); txIcons(); txRenderSummary();
  };

  $tx('#txIndClose').onclick = ()=>{ $tx('#txAddDlg').close(); };

  renderIwList();
  $tx('#txAddDlg').showModal();
}

/* ---------- Motore raccomandazioni ---------- */
function txCompute(){
  const out = []; // {key,name,score,tags:[],why:[],aifa:true}
  const g = Object.fromEntries(txState.genetics.map(x=>[x.key, x.value]));
  const m = Object.fromEntries(txState.mutations.map(x=>[x.key, x.value]));
  const prior = txState.history;
  const treatIndicated = txState.indications.size > 0;

  const hasTP53   = g.TP53_aberration==='yes' || $tx('#ipi_tp53')?.value==='yes';
  const unmutIGHV = (g.IGHV_unmut==='yes') || ($tx('#ipi_ighv')?.value==='yes');
  const mutIGHV   = (g.IGHV_mut==='yes');

  const S = { high: 6, mid: 3, low: 1, avoid: -5 };

  const failedBTKi    = prior.some(p=> ['acalabrutinib','zanubrutinib','ibrutinib'].includes(p.regimenKey) && (p.response==='PD'));
  const intolerantBTKi= prior.some(p=> ['acalabrutinib','zanubrutinib','ibrutinib'].includes(p.regimenKey) && (p.response==='intolerance'));
  const failedBCL2    = prior.some(p=> ['venetoclax_obinutuzumab','venetoclax_rituximab','ibrutinib_venetoclax'].includes(p.regimenKey) && (p.response==='PD'));

  if(!treatIndicated){
    $tx('#txResults').innerHTML = '<p class="muted">Nessuna indicazione iwCLL selezionata → <strong>Watch &amp; Wait</strong>.</p>';
    return;
  }

  const isFrontline = !prior.some(p=>p.line==='1L');
  if(isFrontline){
    if(hasTP53){
      push('acalabrutinib', S.high, ['1L','TP53+'], ['Preferenza in TP53/del17p']);
      push('zanubrutinib',  S.high, ['1L','TP53+'], ['Preferenza in TP53/del17p']);
      push('ibrutinib',     S.mid,  ['1L','TP53+'], ['Alternativa ove appropriato']);
      push('venetoclax_obinutuzumab', S.mid, ['1L','time-limited'], ['Time-limited; valutare profilo']);
    } else {
      push('venetoclax_obinutuzumab', S.high, ['1L','time-limited'], ['Time-limited']);
      push('acalabrutinib', S.high, ['1L'], ['BTKi 2ª gen']);
      push('zanubrutinib',  S.high, ['1L'], ['BTKi 2ª gen']);
      push('ibrutinib_venetoclax', S.high, ['1L','15 mesi'], ['Combinazione rimborsata']);
      if(mutIGHV) push('FCR', S.low, ['1L','selezionato'], ['Giovane, IGHV mut, no TP53']);
    }
  } else {
    if(failedBTKi || intolerantBTKi) push('venetoclax_rituximab', S.high, ['RR','post-BTKi'], ['MURANO-like']);
    if(failedBCL2){ push('acalabrutinib', S.high, ['RR','post-BCL2i'], []); push('zanubrutinib', S.high, ['RR','post-BCL2i'], []); }
    if(!(failedBTKi||failedBCL2)){
      if(!prior.some(p=> ['venetoclax_obinutuzumab','venetoclax_rituximab','ibrutinib_venetoclax'].includes(p.regimenKey))){
        push('venetoclax_rituximab', S.mid, ['RR'], []);
      }
      if(!prior.some(p=> ['acalabrutinib','zanubrutinib','ibrutinib'].includes(p.regimenKey))){
        push('acalabrutinib', S.mid, ['RR'], []);
        push('zanubrutinib',  S.mid, ['RR'], []);
      }
    }
  }

  // Penalità per resistenze note
  if(m.BTK_C481==='present' || m.PLCG2_act==='present'){
    lower(['ibrutinib','acalabrutinib','zanubrutinib'], S.avoid, 'Resistenza cBTKi (BTK C481/PLCG2)');
  }
  if(m.BCL2_G101V==='present' || m.BCL2_D103==='present'){
    lower(['venetoclax_obinutuzumab','venetoclax_rituximab','ibrutinib_venetoclax'], S.avoid, 'Resistenza BCL2 (BCL2 mut)');
  }

  out.sort((a,b)=> b.score - a.score);
  txRenderResults(out);

  function push(key, base, tags=[], why=[]){
    const r = TX_REGIMENS[key]; if(!r) return;
    out.push({key, name:r.name, score:base, tags:[...tags, ...(r.aifa?['AIFA']:['off-label?'])], why:[...why, r.type], aifa:r.aifa});
  }
  function lower(keys, delta, reason){ out.forEach(o=>{ if(keys.includes(o.key)) { o.score += delta; o.why.push(reason); } }); }
}

/* Render risultati con barre allineate */
function txRenderResults(list){
  const box = $tx('#txResults');
  if(!list.length){ box.innerHTML = '<p class="muted">Nessuna proposta con i dati attuali.</p>'; return; }
  const max = Math.max(...list.map(x=>x.score));
  box.innerHTML = '<div class="results-list" id="txResList"></div>';
  const ul = $tx('#txResList');
  list.forEach(item=>{
    const pct = Math.max(1, Math.round((item.score / max)*100));
    const row = txEl('div', {class:'result-row'});
    row.innerHTML = `
      <div class="name"><button class="iconbtn" data-openreg="${item.key}" title="Dettagli"><i data-lucide="external-link"></i></button> ${item.name}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="score">${pct}%</div>
      <div class="meta"><span class="tag">${item.tags.join(' • ')}</span><span class="tag">${item.why.join(' | ')}</span></div>`;
    ul.appendChild(row);
  });
  txIcons();
  ul.querySelectorAll('[data-openreg]').forEach(b=> b.onclick = ()=> txOpenRegimen(b.dataset.openreg));
}

/* Modale dettaglio regime */
function txOpenRegimen(key){
  const reg = TX_REGIMENS[key]; if(!reg) return;
  const det = {
    'acalabrutinib': {
      dosing:'100 mg BID continuo; ± obinutuzumab.',
      tox:'Cefalea, sanguinamenti, IP, FA/Flutter; interazioni CYP3A.',
      studies:'ELEVATE-TN / ELEVATE-RR.',
      src:'RCP/Label'
    },
    'zanubrutinib':  {
      dosing:'160 mg BID (o 320 mg QD) continuo.',
      tox:'Neutropenia, infezioni, sanguinamenti; FA inferiore a ibrutinib.',
      studies:'ALPINE.',
      src:'RCP/Label'
    },
    'ibrutinib':     {
      dosing:'420 mg QD continuo.',
      tox:'FA/Flutter, ipertensione, sanguinamenti, diarrea.',
      studies:'RESONATE(±2).',
      src:'PI'
    },
    'ibrutinib_venetoclax': {
      dosing:'Ibrutinib continuo + VEN ramp-up → 12 mesi (tot ~15).',
      tox:'Somma tossicità BTKi + BCL2i; rischio TLS.',
      studies:'GLOW, CAPTIVATE.',
      src:'AIFA/ESMO'
    },
    'venetoclax_obinutuzumab': {
      dosing:'VEN ramp-up a 400 mg QD, 12 mesi; OBI 6 cicli.',
      tox:'TLS, neutropenia, IRRs.',
      studies:'CLL14.',
      src:'RCP'
    },
    'venetoclax_rituximab': {
      dosing:'VEN 24 mesi; RTX 6 cicli.',
      tox:'TLS, neutropenia.',
      studies:'MURANO.',
      src:'RCP'
    },
    'obinutuzumab_chlorambucil': {
      dosing:'6 cicli.',
      tox:'Mielosoppressione, IRR, infezioni.',
      studies:'CLL11.',
      src:'RCP'
    },
    'FCR': {
      dosing:'× 6 cicli.',
      tox:'Mielotossicità, infezioni, MDS/AML secondarie.',
      studies:'Storici/long-term.',
      src:'LG'
    }
  };
  $tx('#txRegTitle').textContent = reg.name;
  const d = det[key] || {};
  $tx('#txRegBody').innerHTML = `
    <div class="stack">
      <div><strong>Tipo: </strong>${reg.type}</div>
      <div><strong>Posologia (indicativa): </strong>${d.dosing||'-'}</div>
      <div><strong>Durata: </strong>${/venetoclax/.test(key)?'Time-limited':(/FCR|chlorambucil/.test(key)?'6 cicli':'Continuo')}</div>
      <div><strong>Tossicità chiave: </strong>${d.tox||'-'}</div>
      <div><strong>Studi/Note: </strong>${d.studies||'-'}</div>
      <div class="muted">Fonte: ${d.src||'—'}; verificare sempre RCP locale.</div>
    </div>`;
  $tx('#txRegimenDlg').showModal();
}

/* ---------- Inizializzazione ---------- */
let txDlg, txAddDlg, txRegDlg;
const CLLTherapyHelper = {
  init(){
    if(!txDlg)     txDlg = txBuildDialog();
    if(!txAddDlg)  txAddDlg = txBuildAddDialog();
    if(!txRegDlg)  txRegDlg = txBuildRegDialog();

    document.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if(!b) return;
      if(b.id==='txClose')      txDlg.close();
      if(b.id==='txAddClose')   txAddDlg.close();
      if(b.id==='txRegClose')   txRegDlg.close();

      if(b.id==='txAddGen')     txOpenAddGen();
      if(b.id==='txAddMut')     txOpenAddMut();
      if(b.id==='txAddScore')   txOpenAddScores();
      if(b.id==='txAddHist')    txOpenAddHistory();
      if(b.id==='txIndications')txOpenIndications();
      if(b.id==='txCompute')    txCompute();
      if(b.id==='txReset'){
        if(confirm('Azzerare i dati terapeutici?')){
          txState.genetics=[]; txState.mutations=[]; txState.history=[];
          txState.scores={}; txState.indications.clear();
          txRenderSummary(); $tx('#txResults').innerHTML='<p class="muted">Reset completato.</p>';
        }
      }
    });

    txRenderSummary();
  },
  open(){
    if(!txDlg) this.init();
    txDlg.showModal(); txIcons();
  },
  getState(){ return JSON.parse(JSON.stringify(txState)); }
};

// export globale
window.CLLTherapyHelper = CLLTherapyHelper;
