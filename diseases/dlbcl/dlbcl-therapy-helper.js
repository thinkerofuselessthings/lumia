/* =====================  DLBCL THERAPY HELPER (ESMO + AIFA)  ===================== *
 * File: ./app/diseases/dlbcl/dlbcl-therapy-helper.js
 * Richiede: CSS base dell’app (btn, iconbtn, grid, card, tag, result-row...) e Lucide.
 * API: DLBCLTherapyHelper.init(); DLBCLTherapyHelper.open(); DLBCLTherapyHelper.getState()
 * ================================================================================ */

/* ---------- Dataset di base ---------- */

/* Genetica / Biologia (stato: yes/no) */
const DX_DLBCL_GENETICS = [
  {key:'HGBL_DH_MYC_BCL2', label:'HGBL double hit: MYC + BCL2 (riarr.)'},
  {key:'HGBL_DH_MYC_BCL6', label:'HGBL double hit: MYC + BCL6 (riarr.)'},
  {key:'HGBL_TH_MYC_BCL2_BCL6', label:'HGBL triple hit (MYC+BCL2+BCL6)'},
  {key:'MYC_rearr', label:'Riarrangiamento MYC (FISH)'},
  {key:'BCL2_rearr', label:'Riarrangiamento BCL2 (FISH)'},
  {key:'BCL6_rearr', label:'Riarrangiamento BCL6 (FISH)'},
  {key:'MYC_overexp', label:'MYC overexpression (IHC)'},
  {key:'BCL2_overexp', label:'BCL2 overexpression (IHC)'},
  {key:'TP53_mut', label:'TP53 mutazione'},
  {key:'CD5_pos', label:'CD5+ DLBCL'},
  {key:'EBV_pos', label:'DLBCL EBV-positivo'},
  {key:'PMBCL', label:'Linfoma B primitivo mediastinico (PMBCL)'},
  {key:'Transformed_FL', label:'DLBCL da trasformazione di FL'}
];

/* Mutazioni/Resistenze clinicamente rilevanti (stato: present/absent/unk) */
const DX_DLBCL_MUTATIONS = [
  {key:'CD19_loss',  label:'Perdita/CD19 negativo al rilievo attuale'},
  {key:'Anthracycline_contra', label:'Controindicazione alle antracicline (cardiopatia)'},
];

/* Score disponibili (con moduli guidati) */
const DX_DLBCL_SCORES = [
  {key:'ipi',     label:'IPI (International Prognostic Index)'},
  {key:'cns_ipi', label:'CNS-IPI (rischio recidiva SNC)'}
];

/* Regimi/tipologie: chiave → metadati e rimborsabilità AIFA */
const DX_DLBCL_REGIMENS = {
  'R_CHOP': {
    name:'R-CHOP',
    type:'Chemi-immunoterapia standard 1L',
    lines:['1L'],
    aifa:true,
    dosing:'Rituximab + CHOP ogni 21 gg × 6 cicli (± RT su bulky)',
    notes:'Standard per DLBCL 1L in assenza di criteri speciali.',
    refs:['ESMO CPG']
  },
  'pola_R_CHP': {
    name:'Polatuzumab-R-CHP',
    type:'Anticorpo-farmaco + chemo 1L',
    lines:['1L'],
    aifa:true,
    aifa_note:'Indicazione AIFA: IPI 3–5 in 1L',
    gating: { ipi_min:3 },
    dosing:'Polatuzumab + R-CHP × 6 cicli',
    notes:'Preferibile vs R-CHOP in 1L se IPI 3–5.',
    refs:['POLARIX; AIFA 12/2023']
  },
  'DA_R_EPOCH': {
    name:'DA-R-EPOCH',
    type:'Chemioterapia intensificata 1L',
    lines:['1L'],
    aifa:true,
    gating:{ for: ['PMBCL','HGBL_DH_MYC_BCL2','HGBL_DH_MYC_BCL6','HGBL_TH_MYC_BCL2_BCL6'] },
    dosing:'Dose-adjusted R-EPOCH × 6 cicli',
    notes:'Scelta preferenziale in PMBCL e HGBL double/triple hit.',
    refs:['ESMO; WHO/ICC']
  },
  'Salvage_ASCT': {
    name:'Salvage chemo + ASCT',
    type:'2L eleggibile a trapianto (late relapse)',
    lines:['2L'],
    aifa:true,
    dosing:'R-ICE/R-DHAP/R-GDP → HDT/ASCT',
    notes:'Se recidiva >12 mesi e candidato a trapianto.',
    refs:['ESMO']
  },
  'CAR_T_axi': {
    name:'CAR-T (axi-cel, 2L/3L)',
    type:'Terapia cellulare anti-CD19',
    lines:['2L','3L+'],
    aifa:true,
    gating:{ early_relapse:true },
    dosing:'Singola infusione dopo linfodeplezione',
    notes:'2L se refrattario/recidiva ≤12 mesi; 3L+ in altri contesti.',
    refs:['AIFA 2023 2L; ESMO']
  },
  'pola_BR': {
    name:'Polatuzumab + Bendamustina + Rituximab (pola-BR)',
    type:'Anticorpo-farmaco + chemo',
    lines:['2L','3L+'],
    aifa:true,
    dosing:'pola + BR (6 cicli)',
    notes:'Per RR ineligible ad ASCT/CAR-T o post-fallimento.',
    refs:['GO29365; AIFA']
  },
  'tafa_len': {
    name:'Tafasitamab + Lenalidomide → tafasitamab',
    type:'Anticorpo anti-CD19 + IMiD',
    lines:['2L','3L+'],
    aifa:true,
    dosing:'Len 12 cicli; tafasit. continuativo',
    notes:'RR non eleggibili ad ASCT; pre-CAR-T possibile.',
    refs:['L-MIND; AIFA 11/2022']
  },
  'loncastuximab': {
    name:'Loncastuximab tesirine (Zynlonta)',
    type:'ADC anti-CD19',
    lines:['3L+'],
    aifa:true,
    dosing:'Q3-W secondo RCP',
    notes:'Monoterapia RR dopo ≥2 linee.',
    refs:['AIFA 03/2024']
  },
  'glofitamab': {
    name:'Glofitamab (bispecifico, step-up + obi lead-in)',
    type:'Bispecifico CD20xCD3',
    lines:['3L+'],
    aifa:true,
    dosing:'Schema step-up dopo obi pre-dose',
    notes:'Monoterapia dopo ≥2 linee.',
    refs:['AIFA 03/2024']
  },
  'epcoritamab': {
    name:'Epcoritamab (bispecifico s.c.)',
    type:'Bispecifico CD20xCD3',
    lines:['3L+'],
    aifa:true,
    dosing:'Iniezioni s.c. con step-up',
    notes:'Monoterapia dopo ≥2 linee.',
    refs:['AIFA 09/2024']
  }
};

/* ---------- Stato ---------- */
const dlState = {
  genetics: [],        // [{key, value:'yes'|'no'}]
  mutations: [],       // [{key, value:'present'|'absent'|'unk'}]
  scores: {},          // { ipi:{...}, cns_ipi:{...} }
  history: [],         // [{regimenKey, line:'1L'|'2L'|'3L+', response:'CR'|'PR'|'SD'|'PD'|'intolerance'}]
  flags: new Set()     // es. 'early_relapse', 'transplant_eligible', 'cardiac_contra', 'PMBCL', ...
};

/* ---------- Utilità DOM (no conflitti) ---------- */
const $dx = (s, r=document)=> r.querySelector(s);
function dxEl(tag, attrs={}, html=''){ const n=document.createElement(tag); Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,v)); if(html!==undefined) n.innerHTML=html; return n; }
function dxIcons(){ if(window.lucide && lucide.createIcons) lucide.createIcons(); }
function dxLabelOf(list, key){ const it=list.find(x=>x.key===key); return it?it.label:key; }
function dxPopulateSelect(selectEl, options, usedKeys=new Set(), current=null){
  selectEl.innerHTML=''; const ph=document.createElement('option'); ph.value=''; ph.textContent='— seleziona —'; selectEl.appendChild(ph);
  options.forEach(o=>{ if(o.key===current || !usedKeys.has(o.key)){ const opt=document.createElement('option'); opt.value=o.key; opt.textContent=o.label; selectEl.appendChild(opt);} });
  if(current) selectEl.value=current;
}

/* ---------- Builder modali ---------- */
function dxBuildDialog(){
  const dlg = dxEl('dialog',{id:'dxDlg','aria-labelledby':'dxTitle'});
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="stethoscope"></i><span id="dxTitle">DLBCL — Assistente terapeutico</span></div>
      <button class="iconbtn" id="dxClose" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body">
      <div class="actions row">
        <button class="btn btn-primary" id="dxAddGen" title="Genetica"><i data-lucide="dna"></i></button>
        <button class="btn" id="dxAddMut" title="Resistenze"><i data-lucide="activity"></i></button>
        <button class="btn" id="dxAddScore" title="Score (IPI/CNS-IPI)"><i data-lucide="list-plus"></i></button>
        <button class="btn" id="dxAddHist" title="Storia linee"><i data-lucide="history"></i></button>
        <button class="btn" id="dxContext" title="Indicazioni/contesto"><i data-lucide="check-square"></i></button>
        <button class="btn" id="dxCompute" title="Calcola"><i data-lucide="calculator"></i></button>
        <button class="btn btn-danger" id="dxReset" title="Reset"><i data-lucide="rotate-ccw"></i></button>
      </div>
      <div class="grid">
        <section class="card" aria-labelledby="dxSel"><h2 id="dxSel">Dati inseriti</h2><div class="content" id="dxSummary"><div class="muted">Nessun dato.</div></div></section>
        <section class="card" aria-labelledby="dxRes"><h2 id="dxRes">Raccomandazioni</h2><div class="content" id="dxResults"><p class="muted">Inserisci i dati e premi <strong>Calcola</strong>.</p></div></section>
      </div>
    </div>`;
  document.body.appendChild(dlg); dxIcons(); return dlg;
}
function dxBuildAddDialog(){
  const dlg = dxEl('dialog',{id:'dxAddDlg'});
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="beaker"></i><span id="dxAddTitle">Aggiungi</span></div>
      <button class="iconbtn" id="dxAddClose" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body" id="dxAddBody"></div>`;
  document.body.appendChild(dlg); dxIcons(); return dlg;
}
function dxBuildRegDialog(){
  const dlg = dxEl('dialog',{id:'dxRegDlg'});
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="file-text"></i><span id="dxRegTitle">Dettaglio schema</span></div>
      <button class="iconbtn" id="dxRegClose" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body" id="dxRegBody"></div>`;
  document.body.appendChild(dlg); dxIcons(); return dlg;
}

/* ---------- Rendering riepilogo ---------- */
function dxRenderSummary(){
  const box = $dx('#dxSummary'); const pill = (t)=>`<span class="tag">${t}</span>`; const parts=[];
  if(dlState.genetics.length) parts.push('<div class="row"><strong>Genetica:</strong> '+dlState.genetics.map(x=>pill(`${dxLabelOf(DX_DLBCL_GENETICS,x.key)}: ${x.value==='yes'?'Presente':'Assente'}`)).join(' ')+'</div>');
  if(dlState.mutations.length) parts.push('<div class="row"><strong>Resistenze:</strong> '+dlState.mutations.map(x=>pill(`${dxLabelOf(DX_DLBCL_MUTATIONS,x.key)}: ${x.value}`)).join(' ')+'</div>');
  if(Object.keys(dlState.scores).length){
    const s=[]; if(dlState.scores.ipi) s.push(`IPI: ${dlState.scores.ipi.score} (${dlState.scores.ipi.risk})`);
    if(dlState.scores.cns_ipi) s.push(`CNS-IPI: ${dlState.scores.cns_ipi.risk}`);
    parts.push('<div class="row"><strong>Score:</strong> '+s.map(pill).join(' ')+'</div>');
  }
  if(dlState.history.length) parts.push('<div class="row"><strong>Storia:</strong> '+dlState.history.map(x=>pill(`${DX_DLBCL_REGIMENS[x.regimenKey].name} [${x.line}] → ${x.response}`)).join(' ')+'</div>');
  if(dlState.flags.size) parts.push('<div class="row"><strong>Contesto:</strong> '+[...dlState.flags].map(pill).join(' ')+'</div>');
  box.innerHTML = parts.length? parts.join('<div class="sep"></div>') : '<div class="muted">Nessun dato.</div>';
}

/* ---------- Add flows ---------- */
/* Genetica “tipo CD” (select + stato; no duplicati) */
function dxOpenAddGen(){
  $dx('#dxAddTitle').textContent='Genetica / Biologia (inserimento tipo CD)'; const body=$dx('#dxAddBody'); body.innerHTML='';
  const used=new Set(dlState.genetics.map(x=>x.key));
  const row=dxEl('div',{class:'row'});
  row.innerHTML=`<label>Parametro</label>
    <select id="dxGenPick"></select>
    <label>Stato</label>
    <select id="dxGenState"><option value="yes">Presente</option><option value="no">Assente</option></select>
    <button class="btn" id="dxGenAdd" title="Aggiungi"><i data-lucide="plus"></i></button>`;
  const list=dxEl('div',{id:'dxGenList',class:'stack',style:'margin-top:8px;'});
  const save=dxEl('div',{class:'row',style:'justify-content:flex-end;'});
  save.innerHTML=`<button class="btn btn-primary" id="dxGenClose"><i data-lucide="check"></i></button>`;
  body.append(row,list,save); dxIcons();
  dxPopulateSelect($dx('#dxGenPick'), DX_DLBCL_GENETICS, used, null);
  function renderList(){
    list.innerHTML = dlState.genetics.length
      ? dlState.genetics.map((g,i)=>`<div class="row"><span class="tag">${dxLabelOf(DX_DLBCL_GENETICS,g.key)}: ${g.value==='yes'?'Presente':'Assente'}</span><button class="btn" data-delg="${i}" title="Rimuovi"><i data-lucide="trash-2"></i></button></div>`).join('')
      : '<div class="muted">Nessun elemento.</div>';
    list.querySelectorAll('[data-delg]').forEach(b=> b.onclick = ()=>{ dlState.genetics.splice(parseInt(b.dataset.delg,10),1); dxPopulateSelect($dx('#dxGenPick'), DX_DLBCL_GENETICS, new Set(dlState.genetics.map(x=>x.key)), null); renderList(); dxIcons(); dxRenderSummary(); });
  }
  $dx('#dxGenAdd').onclick=()=>{ const k=$dx('#dxGenPick').value; const v=$dx('#dxGenState').value; if(!k) return; if(dlState.genetics.some(x=>x.key===k)) return; dlState.genetics.push({key:k,value:v}); dxPopulateSelect($dx('#dxGenPick'), DX_DLBCL_GENETICS, new Set(dlState.genetics.map(x=>x.key)), null); renderList(); dxIcons(); dxRenderSummary(); };
  $dx('#dxGenClose').onclick=()=>{ $dx('#dxAddDlg').close(); };
  renderList(); $dx('#dxAddDlg').showModal();
}

/* Mutazioni/resistenze (lista completa con stato) */
function dxOpenAddMut(){
  $dx('#dxAddTitle').textContent='Resistenze / Fattori clinici'; const body=$dx('#dxAddBody'); body.innerHTML='';
  const grid=dxEl('div',{class:'stack'});
  DX_DLBCL_MUTATIONS.forEach(m=>{
    const curr=dlState.mutations.find(x=>x.key===m.key)?.value || 'unk';
    const row=dxEl('div',{class:'row'});
    row.innerHTML=`<label style="min-width:300px">${m.label}</label>
      <select data-k="${m.key}">
        <option value="unk" ${curr==='unk'?'selected':''}>Non testato / n.d.</option>
        <option value="present" ${curr==='present'?'selected':''}>Presente</option>
        <option value="absent" ${curr==='absent'?'selected':''}>Assente</option>
      </select>`;
    grid.appendChild(row);
  });
  const save=dxEl('div',{class:'row',style:'justify-content:flex-end;'}); save.innerHTML=`<button class="btn btn-primary" id="dxMutSave"><i data-lucide="check"></i></button>`;
  body.append(grid,save); dxIcons();
  $dx('#dxMutSave').onclick=()=>{ dlState.mutations=[]; body.querySelectorAll('select[data-k]').forEach(s=>{ const v=s.value; if(v!=='unk') dlState.mutations.push({key:s.dataset.k,value:v}); }); dxRenderSummary(); $dx('#dxAddDlg').close(); };
  $dx('#dxAddDlg').showModal();
}

/* Score guidati: IPI e CNS-IPI */
function dxTplIPI(){
  return `
    <div data-score="ipi" class="stack">
      <div class="row"><label>Età &gt; 60 anni</label>
        <select id="ipi_age"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>LDH elevata</label>
        <select id="ipi_ldh"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>PS ECOG ≥ 2</label>
        <select id="ipi_ps"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>Stadio Ann Arbor III–IV</label>
        <select id="ipi_stage"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>Sedi extranodali &gt; 1</label>
        <select id="ipi_extranodal"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <p class="muted">Punteggio 0–5 → Rischio: 0-1 basso; 2 intermedio-basso; 3 intermedio-alto; 4-5 alto.</p>
    </div>`;
}
function dxComputeIPI(){
  const v = (id)=> $dx('#'+id)?.value==='yes';
  let s=0; if(v('ipi_age')) s++; if(v('ipi_ldh')) s++; if(v('ipi_ps')) s++; if(v('ipi_stage')) s++; if(v('ipi_extranodal')) s++;
  const risk = (s<=1)?'Basso':(s===2)?'Intermedio-basso':(s===3)?'Intermedio-alto':'Alto';
  return { score:s, risk };
}
function dxTplCNSIPI(){
  return `
    <div data-score="cns_ipi" class="stack">
      <div class="row"><label>Età &gt; 60</label><select id="cns_age"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>LDH elevata</label><select id="cns_ldh"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>Stadio III–IV</label><select id="cns_stage"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>PS ECOG ≥ 2</label><select id="cns_ps"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>Sedi extranodali &gt; 1</label><select id="cns_extranodal"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <div class="row"><label>Coinvolgimento renale/surrene</label><select id="cns_renal"><option value="no">No</option><option value="yes">Sì</option></select></div>
      <p class="muted">Rischio CNS-IPI: 0-1 basso; 2-3 intermedio; 4-6 alto (profilassi intratecale/HD-MTX da considerare).</p>
    </div>`;
}
function dxComputeCNSIPI(){
  const v=(id)=> $dx('#'+id)?.value==='yes';
  let s=0; ['cns_age','cns_ldh','cns_stage','cns_ps','cns_extranodal','cns_renal'].forEach(id=>{ if(v(id)) s++; });
  const risk = (s<=1)?'Basso':(s<=3)?'Intermedio':'Alto';
  return { score:s, risk };
}
function dxOpenAddScores(){
  $dx('#dxAddTitle').textContent='Score prognostici'; const body=$dx('#dxAddBody'); body.innerHTML='';
  const row=dxEl('div',{class:'row'}); row.innerHTML=`
    <label>Seleziona score</label>
    <select id="dxScorePick"><option value="">—</option>${DX_DLBCL_SCORES.map(s=>`<option value="${s.key}">${s.label}</option>`).join('')}</select>
    <button class="btn" id="dxScoreGo" title="Apri"><i data-lucide="chevron-right"></i></button>`;
  const area=dxEl('div',{id:'dxScoreArea',class:'stack'});
  const save=dxEl('div',{class:'row',style:'justify-content:flex-end;'}); save.innerHTML=`<button class="btn btn-primary" id="dxScoreSave"><i data-lucide="check"></i></button>`;
  body.append(row,area,save); dxIcons();
  $dx('#dxScoreGo').onclick=()=>{ const v=$dx('#dxScorePick').value; area.innerHTML=(v==='ipi')?dxTplIPI():(v==='cns_ipi')?dxTplCNSIPI():''; dxIcons(); };
  $dx('#dxScoreSave').onclick=()=>{
    if($dx('#dxScoreArea [data-score="ipi"]'))  dlState.scores.ipi = dxComputeIPI();
    if($dx('#dxScoreArea [data-score="cns_ipi"]')) dlState.scores.cns_ipi = dxComputeCNSIPI();
    dxRenderSummary(); $dx('#dxAddDlg').close();
  };
  $dx('#dxAddDlg').showModal();
}

/* Storia trattamenti */
function dxOpenAddHistory(){
  $dx('#dxAddTitle').textContent='Storia dei trattamenti'; const body=$dx('#dxAddBody'); body.innerHTML='';
  const row=dxEl('div',{class:'row'});
  row.innerHTML=`<label>Schema</label>
    <select id="dxHistReg"><option value="">—</option>${Object.entries(DX_DLBCL_REGIMENS).map(([k,v])=>`<option value="${k}">${v.name}</option>`).join('')}</select>
    <label>Linea</label><select id="dxHistLine"><option>1L</option><option>2L</option><option>3L+</option></select>`;
  const row2=dxEl('div',{class:'row'});
  row2.innerHTML=`<label>Risposta</label>
    <select id="dxHistResp"><option value="CR">CR</option><option value="PR">PR</option><option value="SD">SD</option><option value="PD">PD</option><option value="intolerance">Intolleranza</option></select>
    <button class="btn" id="dxHistAdd" title="Aggiungi"><i data-lucide="plus"></i></button>`;
  const list=dxEl('div',{id:'dxHistList',class:'stack',style:'margin-top:8px;'});
  const save=dxEl('div',{class:'row',style:'justify-content:flex-end;'}); save.innerHTML=`<button class="btn btn-primary" id="dxHistSave"><i data-lucide="check"></i></button>`;
  body.append(row,row2,list,save); dxIcons();
  $dx('#dxHistAdd').onclick=()=>{ const k=$dx('#dxHistReg').value; if(!k) return; const line=$dx('#dxHistLine').value; const response=$dx('#dxHistResp').value; dlState.history.push({regimenKey:k,line,response}); dxRenderHist(list); dxIcons(); };
  $dx('#dxHistSave').onclick=()=>{ dxRenderSummary(); $dx('#dxAddDlg').close(); };
  dxRenderHist(list); $dx('#dxAddDlg').showModal();
}
function dxRenderHist(container){
  container.innerHTML = dlState.history.length
    ? dlState.history.map((x,i)=>`<div class="row"><span class="tag">${DX_DLBCL_REGIMENS[x.regimenKey].name} [${x.line}] → ${x.response}</span><button class="btn" data-delh="${i}" title="Rimuovi"><i data-lucide="trash-2"></i></button></div>`).join('')
    : '<div class="muted">Nessuno schema aggiunto.</div>';
  container.querySelectorAll('[data-delh]').forEach(b=> b.onclick=()=>{ dlState.history.splice(parseInt(b.dataset.delh,10),1); dxRenderHist(container); });
}

/* Indicazioni/Contesto tipo CD (select + aggiungi; no duplicati) */
const DX_FLAGS = [
  'early_relapse (recidiva ≤ 12 mesi dalla 1L o refrattario)',
  'late_relapse (recidiva > 12 mesi)',
  'transplant_eligible',
  'transplant_ineligible',
  'cardiac_contra (antracicline controindicate)',
  'CNS_involvement'
];
function dxOpenContext(){
  $dx('#dxAddTitle').textContent='Indicazioni/Contesto clinico (aggiunta tipo CD)'; const body=$dx('#dxAddBody'); body.innerHTML='';
  const all = DX_FLAGS.map(f=>({key:f,label:f}));
  const used = new Set(dlState.flags);
  const row=dxEl('div',{class:'row'});
  row.innerHTML=`<label>Contesto</label><select id="dxCtxPick"></select><button class="btn" id="dxCtxAdd"><i data-lucide="plus"></i></button>`;
  const list=dxEl('div',{id:'dxCtxList',class:'stack',style:'margin-top:8px;'});
  const save=dxEl('div',{class:'row',style:'justify-content:flex-end;'}); save.innerHTML=`<button class="btn btn-primary" id="dxCtxClose"><i data-lucide="check"></i></button>`;
  body.append(row,list,save); dxIcons();
  dxPopulateSelect($dx('#dxCtxPick'), all, used, null);
  function render(){ list.innerHTML = dlState.flags.size? [...dlState.flags].map(f=>`<div class="row"><span class="tag">${f}</span><button class="btn" data-dc="${encodeURIComponent(f)}"><i data-lucide="trash-2"></i></button></div>`).join('') : '<div class="muted">Nessun elemento.</div>';
    list.querySelectorAll('[data-dc]').forEach(b=> b.onclick=()=>{ const k=decodeURIComponent(b.dataset.dc); dlState.flags.delete(k); dxPopulateSelect($dx('#dxCtxPick'), all, new Set(dlState.flags), null); render(); dxIcons(); dxRenderSummary(); }); }
  $dx('#dxCtxAdd').onclick=()=>{ const k=$dx('#dxCtxPick').value; if(!k) return; dlState.flags.add(all.find(x=>x.key===k).label); dxPopulateSelect($dx('#dxCtxPick'), all, new Set(dlState.flags), null); render(); dxIcons(); dxRenderSummary(); };
  $dx('#dxCtxClose').onclick=()=> $dx('#dxAddDlg').close();
  render(); $dx('#dxAddDlg').showModal();
}

/* ---------- Motore raccomandazioni ---------- */
function dxCompute(){
  const out=[]; const g=Object.fromEntries(dlState.genetics.map(x=>[x.key,x.value])); const m=Object.fromEntries(dlState.mutations.map(x=>[x.key,x.value]));
  const flags = dlState.flags; const prior = dlState.history;
  const ipi = dlState.scores.ipi?.score ?? null;

  const isFrontline = !prior.some(p=>p.line==='1L');
  const earlyRel = [...flags].some(f=>f.startsWith('early_relapse'));
  const lateRel  = [...flags].some(f=>f.startsWith('late_relapse'));
  const txEligible = flags.has('transplant_eligible');
  const txIneligible = flags.has('transplant_ineligible');
  const cardiac = flags.has('cardiac_contra');

  const hasDoubleHit = (g.HGBL_DH_MYC_BCL2==='yes' || g.HGBL_DH_MYC_BCL6==='yes' || g.HGBL_TH_MYC_BCL2_BCL6==='yes');
  const PMBCL = (g.PMBCL==='yes');
  const CNS = flags.has('CNS_involvement');

  const S = { hi:6, mid:3, low:1, avoid:-5 };

  function push(key, base, tags=[], why=[]){
    const r=DX_DLBCL_REGIMENS[key]; if(!r) return;
    out.push({key, name:r.name, score:base, tags:[...tags, ...(r.aifa?['AIFA']:['off-label?'])], why:[...why, r.type, r.aifa_note||''].filter(Boolean)});
  }
  function penalize(keys, delta, reason){ out.forEach(o=>{ if(keys.includes(o.key)){ o.score+=delta; o.why.push(reason);} }); }

  // 1) Frontline
  if(isFrontline){
    if(PMBCL || hasDoubleHit){ push('DA_R_EPOCH', S.hi, ['1L'], [PMBCL?'PMBCL':'HGBL double/triple hit']); }
    if(!cardiac){
      push('R_CHOP', S.hi - (ipi>=3?1:0), ['1L'], []);
      if(ipi!==null && ipi>=3) push('pola_R_CHP', S.hi+1, ['1L','IPI≥3'], ['AIFA: IPI 3–5']);
    } else {
      // Antracicline controindicate: R-CEOP etc. (non dettagliamo singolo schema)
      push('R_CHOP', S.low, ['1L'], ['Nota: se antracicline controindicate, considerare sostituzioni (es. R-CEOP)']);
    }
  } else {
    // 2) R/R
    if(earlyRel && txEligible){
      push('CAR_T_axi', S.hi, ['2L','early'], ['Raccomandato in 2L se ≤12 mesi']);
    }
    if(lateRel && txEligible){
      push('Salvage_ASCT', S.hi, ['2L','late'], ['Candidabile ad ASCT']);
    }
    // ineligible / post-trapianto / dopo CAR-T fallito
    if(txIneligible || !txEligible){
      push('pola_BR', S.hi, ['RR'], []);
      push('tafa_len', S.mid, ['RR'], []);
    }
    // 3L+ opzioni addizionali
    push('loncastuximab', S.mid, ['3L+'], []);
    push('glofitamab', S.mid, ['3L+'], []);
    push('epcoritamab', S.mid, ['3L+'], []);
  }

  // Penalità per perdite di target CD19 (riduce CAR-T/anti-CD19)
  if(m.CD19_loss==='present'){
    penalize(['CAR_T_axi','tafa_len','loncastuximab'], S.avoid, 'CD19 negativo/instabile');
  }

  // CNS involvement → nota di aggiunta HD-MTX/IT (non schema separato qui)
  if(CNS){ out.forEach(o=> o.why.push('Considerare profilassi/HD-MTX per rischio/coinvolgimento SNC')); }

  out.sort((a,b)=> b.score - a.score);
  dxRenderResults(out);
}

/* Render risultati con righe allineate e barre percentuali */
function dxRenderResults(list){
  const box=$dx('#dxResults'); if(!list.length){ box.innerHTML='<p class="muted">Nessuna proposta con i dati attuali.</p>'; return; }
  const max = Math.max(...list.map(x=>x.score));
  box.innerHTML = '<div class="results-list" id="dxResList"></div>';
  const ul = $dx('#dxResList');
  list.forEach(item=>{
    const pct = Math.max(1, Math.round((item.score/max)*100));
    const row = dxEl('div',{class:'result-row'});
    row.innerHTML = `
      <div class="name"><button class="iconbtn" data-openreg="${item.key}" title="Dettagli"><i data-lucide="external-link"></i></button> ${item.name}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="score">${pct}%</div>
      <div class="meta"><span class="tag">${item.tags.join(' • ')}</span><span class="tag">${item.why.join(' | ')}</span></div>`;
    ul.appendChild(row);
  });
  dxIcons();
  ul.querySelectorAll('[data-openreg]').forEach(b=> b.onclick=()=> dxOpenRegimen(b.dataset.openreg));
}

/* Modale dettaglio regime: testo sintetico */
function dxOpenRegimen(key){
  const r=DX_DLBCL_REGIMENS[key]; if(!r) return;
  const det = {
    'R_CHOP': { dosing:r.dosing, tox:'Mielosoppressione, cardiotossicità (doxo), neuropatia (vincr.).', studies:'Standard consolidato', src:'LG ESMO' },
    'pola_R_CHP': { dosing:r.dosing, tox:'Neutropenia, neuropatia periferica, epatotossicità; premedicazioni.', studies:'POLARIX (PFS> vs R-CHOP)', src:'AIFA/EMA' },
    'DA_R_EPOCH': { dosing:r.dosing, tox:'Mielotossicità, mucositi; richiede gestione intensiva.', studies:'PMBCL e HGBL', src:'LG ESMO' },
    'Salvage_ASCT': { dosing:r.dosing, tox:'Tossicità da HDT; candidabilità da valutare.', studies:'Standard 2L late relapse', src:'LG' },
    'CAR_T_axi': { dosing:r.dosing, tox:'CRS/ICANS; necessaria idoneità centro CAR-T.', studies:'ZUMA-7 2L', src:'AIFA/ESMO' },
    'pola_BR': { dosing:r.dosing, tox:'Mielosoppressione, neuropatia.', studies:'GO29365', src:'RCP' },
    'tafa_len': { dosing:r.dosing, tox:'Neutropenia, rash, diarrea; monitoraggi len.', studies:'L-MIND', src:'AIFA' },
    'loncastuximab': { dosing:r.dosing, tox:'Mielotossicità, epatotossicità, fotosensibilità.', studies:'LOTIS-2', src:'AIFA' },
    'glofitamab': { dosing:r.dosing, tox:'CRS; ospedalizzazione allo start.', studies:'NP30179', src:'AIFA' },
    'epcoritamab': { dosing:r.dosing, tox:'CRS (generalmente lieve-mod), iniezione s.c.', studies:'EPCORE-NHL-1', src:'AIFA' }
  };
  $dx('#dxRegTitle').textContent=r.name;
  const d=det[key]||{};
  $dx('#dxRegBody').innerHTML = `
    <div class="stack">
      <div><strong>Tipo: </strong>${r.type}</div>
      <div><strong>Posologia (indicativa): </strong>${d.dosing||'-'}</div>
      <div><strong>Linea: </strong>${r.lines.join(', ')}</div>
      <div><strong>Rimborsabilità AIFA: </strong>${r.aifa?'Sì':'—'}</div>
      <div><strong>Tossicità chiave: </strong>${d.tox||'-'}</div>
      <div><strong>Evidenze: </strong>${d.studies||'-'}</div>
      <div class="muted">Fonte: ${d.src||'—'}; verificare sempre RCP locale/registro AIFA.</div>
    </div>`;
  $dx('#dxRegDlg').showModal();
}

/* ---------- Inizializzazione & eventi ---------- */
let dxDlg, dxAddDlg, dxRegDlg;
const DLBCLTherapyHelper = {
  init(){
    if(!dxDlg) dxDlg = dxBuildDialog();
    if(!dxAddDlg) dxAddDlg = dxBuildAddDialog();
    if(!dxRegDlg) dxRegDlg = dxBuildRegDialog();

    document.addEventListener('click', (e)=>{
      const b=e.target.closest('button'); if(!b) return;
      if(b.id==='dxClose') dxDlg.close();
      if(b.id==='dxAddClose') $dx('#dxAddDlg').close();
      if(b.id==='dxRegClose') $dx('#dxRegDlg').close();

      if(b.id==='dxAddGen') dxOpenAddGen();
      if(b.id==='dxAddMut') dxOpenAddMut();
      if(b.id==='dxAddScore') dxOpenAddScores();
      if(b.id==='dxAddHist') dxOpenAddHistory();
      if(b.id==='dxContext') dxOpenContext();
      if(b.id==='dxCompute') dxCompute();
      if(b.id==='dxReset'){
        if(confirm('Azzerare i dati?')){
          dlState.genetics=[]; dlState.mutations=[]; dlState.history=[]; dlState.scores={}; dlState.flags.clear();
          dxRenderSummary(); $dx('#dxResults').innerHTML='<p class="muted">Reset completato.</p>';
        }
      }
    });

    dxRenderSummary(); dxIcons();
  },
  open(){ if(!dxDlg) this.init(); dxDlg.showModal(); dxIcons(); },
  getState(){ return JSON.parse(JSON.stringify(dlState)); }
};

window.DLBCLTherapyHelper = DLBCLTherapyHelper;
