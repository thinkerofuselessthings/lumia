// ===== Config & Data =====
const STATES = [
  {key:'pos', label:'Positivo'},
  {key:'neg', label:'Negativo'},
  {key:'dim', label:'Dim'},
  {key:'br',  label:'Bright'},
  {key:'nt',  label:'Non testato'}
];
const ALL_MARKERS = [
  'CD5','CD23','CD200','LEF1','FMC7','CD79b','CD20','CD22','sIg','CD10','BCL6','MUM1/IRF4',
  'CyclinD1','SOX11','CD43','CD11c','CD25','CD103','CD123','AnnexinA1','IgM','CD81',
  'MYC','BCL2','IgD'
];

// RULES aggiornate con MCL varianti (incl. rare), DLBCL Hans + DE flag, SMZL migliorato, SDRPL
const RULES = {
  /* --- CLL / SLL --- */
  'CLL/SLL': {
    CD5:{pos:2}, CD23:{pos:2},
    CD200:{br:3,pos:3},
    LEF1:{pos:2}, CD43:{pos:1},
    CD81:{dim:1,pos:-1,br:-1},
    FMC7:{neg:2,dim:1}, CD79b:{neg:2,dim:1},
    CD20:{dim:1}, sIg:{dim:1, br:-1},
    CD10:{neg:1}, CyclinD1:{pos:-3}, SOX11:{pos:-3}
  },

  /* --- MCL (WHO 2022): varianti principali --- */
  'MCL (classical/nodal)': {
    CyclinD1:{pos:3}, SOX11:{pos:2}, CD5:{pos:2},
    CD23:{neg:2, dim:1, pos:-1},
    CD200:{neg:2, pos:-2, br:-2},
    FMC7:{pos:2}, CD79b:{pos:2}, sIg:{br:2}, CD20:{br:1}, LEF1:{neg:1}
  },
  'MCL (leukemic non-nodal/indolent)': {
    CyclinD1:{pos:3},
    SOX11:{neg:2},
    CD23:{dim:1, pos:1},
    CD5:{neg:1, pos:1},
    CD200:{pos:1},
    FMC7:{pos:1}, CD79b:{pos:1},
    sIg:{br:1}, CD20:{br:1}
  },
  'MCL (CD5-negative variant)': {
    CyclinD1:{pos:3}, SOX11:{pos:2},
    CD5:{neg:2},
    CD23:{neg:2, dim:1}, CD200:{neg:1},
    FMC7:{pos:2}, CD79b:{pos:2}, sIg:{br:2}, CD20:{br:1}
  },
  'MCL (CyclinD1− / SOX11+)': {
    CyclinD1:{neg:2},
    SOX11:{pos:3},
    CD5:{pos:2},
    CD23:{neg:2, dim:1},
    CD200:{neg:2, pos:-2},
    FMC7:{pos:2}, CD79b:{pos:2},
    sIg:{br:2}, CD20:{br:1}
  },
  'MCL (CyclinD1− / SOX11−, non-nodal-like)': {
    CyclinD1:{neg:2},
    SOX11:{neg:2},
    CD23:{dim:1, pos:1},
    CD5:{neg:1, pos:1},
    CD200:{pos:1},
    FMC7:{pos:1}, CD79b:{pos:1},
    sIg:{br:1}, CD20:{br:1}
  },

  /* --- HCL --- */
  'HCL classica': {
    AnnexinA1:{pos:2}, CD103:{pos:2}, CD25:{pos:2}, CD11c:{pos:2},
    CD123:{br:2,pos:1}, CD200:{pos:1, br:1},
    CD5:{neg:1}, CD23:{neg:1}
  },
  'HCL-variant': {
    AnnexinA1:{neg:2}, CD103:{pos:2}, CD11c:{pos:2},
    CD25:{neg:1}, CD123:{neg:1, dim:0},
    CD5:{neg:1}, CD23:{neg:1}
  },

  /* --- SMZL aggiornato --- */
  'SMZL': {
    CD10:{neg:2},
    CD5:{neg:2, pos:-1},
    CD23:{neg:1, dim:0, pos:-1},
    FMC7:{pos:2},
    CD79b:{pos:2},
    sIg:{br:2, pos:2},
    IgM:{br:2, pos:2},
    IgD:{pos:1},
    CD20:{br:1, pos:1},
    CD22:{pos:1},
    CD103:{neg:2}, CD123:{neg:2}, AnnexinA1:{neg:2},
    CD11c:{pos:1},
    CD25:{neg:1, pos:0},
    CD43:{neg:1, pos:0},
    CD200:{pos:0, br:0, neg:0},
    CyclinD1:{br:-2, pos:-2, dim:-1},
    SOX11:{pos:-2},
    LEF1:{pos:-1}
  },

  /* --- LPL/WM --- */
  'LPL/WM': {
    IgM:{br:2,pos:2}, 'MUM1/IRF4':{pos:1}, CD5:{neg:1}, CD23:{neg:1}, CD10:{neg:1}
  },

  /* --- SDRPL (rara) --- */
  'SDRPL': {
    CD5:{neg:2}, CD10:{neg:2}, CD23:{neg:2},
    CD11c:{pos:1},
    CD103:{neg:1}, CD25:{neg:1}, AnnexinA1:{neg:1},
    CD200:{neg:1},
    IgM:{pos:1}
  },

  /* --- Follicolare --- */
  'FL (GC-type)': {
    CD10:{pos:2}, BCL6:{pos:2}, CD5:{neg:1}, CD23:{neg:1}
  },

  /* --- DLBCL: Hans + Double-Expressor flag --- */
  'DLBCL (Hans GCB)': {
    CD10:{pos:3},
    BCL6:{pos:2},
    'MUM1/IRF4':{neg:2, pos:-1}   // PATCH: unificato (niente doppia chiave)
  },
  'DLBCL (Hans non-GCB)': {
    'MUM1/IRF4':{pos:2},
    CD10:{neg:2},
    BCL6:{neg:1, pos:1}           // PATCH: unificato (niente doppia chiave)
  },
  'DLBCL (double-expressor: evaluate DH/TH)': {
    MYC:{pos:2, br:2},
    BCL2:{pos:2, br:2},
    BCL6:{pos:1}, CD10:{neg:1}
  },

  // pan-B (compatibilità)
  'DLBCL (pan-B)': {
    CD79b:{pos:1}, CD20:{br:1}, CD10:{pos:1}, BCL6:{pos:1}, 'MUM1/IRF4':{pos:1}
  },

  /* --- BL --- */
  'BL': {
    CD10:{pos:2}, BCL6:{pos:2}, CD23:{neg:1}, CD5:{neg:1}
  }
};

// ===== State =====
let selections = []; // [{marker, state, note}]
let editingIndex = null;

// ===== Utilities =====
// evita redeclare se $ esiste già (es. altri script)
window.$ = window.$ || ((sel, r = document) => r.querySelector(sel));

function refreshIcons(){ if(window.lucide && lucide.createIcons) lucide.createIcons(); }
function escapeHtml(str){ return str.replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[s])); }
function getSelectedMarkerSet(exceptIdx = null){
  return new Set(selections.map((x,i)=> (i===exceptIdx ? null : x.marker)).filter(Boolean));
}
function populateMarkerSelect(current = null, exceptIdx = null){
  const saveBtn = document.getElementById('save');
  const markerSel = document.getElementById('marker');
  markerSel.innerHTML = '';
  const used = getSelectedMarkerSet(exceptIdx);
  let added = 0;

  ALL_MARKERS.forEach(m=>{
    if (m === current || !used.has(m)) {
      const opt = document.createElement('option');
      opt.value = m; opt.textContent = m;
      markerSel.appendChild(opt);
      added++;
    }
  });

  if (current) markerSel.value = current;

  if (added === 0){
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = '— nessun marker disponibile —';
    markerSel.appendChild(opt);
    markerSel.value = '';
    if (saveBtn) saveBtn.disabled = true;
  } else {
    if (saveBtn) saveBtn.disabled = false;
  }
}
function isPosState(s){ return s==='pos' || s==='br' || s==='dim'; }

// --- Fallback per il differenziale basato su positività ---
const POS_FALLBACK = 0.5;
const NEG_WEAK_PEN = -1;
const NEG_STRONG_PEN = -1.5;
function fallbackDifferential(expect = {}, seen){
  if (isPosState(seen)){
    if ('neg' in expect){
      if (expect.neg >= 2) return -1; // forte attesa di negatività → lieve conflitto
      if (expect.neg >= 1) return 0;  // debole attesa → neutro
    }
    return POS_FALLBACK;              // positività non mappata → entra nel differenziale
  }
  if (seen === 'neg'){
    if (expect.pos || expect.br) return NEG_STRONG_PEN; // atteso positivo → conflitto moderato
    return 0;
  }
  return 0;
}

// ===== Dynamic modal builders =====
function buildAppDialog(){
  const dlg = document.createElement('dialog');
  dlg.id = 'appDlg';
  dlg.setAttribute('aria-labelledby','appTitle');
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="flask-conical"></i><span id="appTitle">CD-Based B-LPD Diagnostic Helper</span></div>
      <button class="iconbtn" id="closeApp" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body">
      <div class="actions row">
        <button id="openAdd" class="btn btn-primary" title="Aggiungi"><i data-lucide="plus"></i><span>Aggiungi marker</span></button>
        <button id="compute" class="btn" title="Elabora"><i data-lucide="calculator"></i><span>Elabora</span></button>
        <button id="reset" class="btn btn-danger" title="Reset"><i data-lucide="rotate-ccw"></i><span>Reset</span></button>
      </div>
      <div class="grid">
        <section class="card" aria-labelledby="selTitle">
          <h2 id="selTitle">Marker selezionati</h2>
          <div class="content">
            <table>
              <thead>
                <tr>
                  <th style="width:28%">Marker</th>
                  <th style="width:24%">Stato</th>
                  <th>Note</th>
                  <th style="width:70px"></th>
                </tr>
              </thead>
              <tbody id="tbody">
                <tr class="ghost"><td colspan="4">Nessun marker inserito.</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section class="card" aria-labelledby="resTitle">
          <h2 id="resTitle">Risultati (diagnosi probabili)</h2>
          <div class="content" id="results">
            <p class="muted">Nessun risultato ancora. Aggiungi marker e premi <strong>Elabora</strong>.</p>
          </div>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(dlg);
  refreshIcons();
  return dlg;
}

function buildAddDialog(){
  const dlg = document.createElement('dialog');
  dlg.id = 'addDlg';
  dlg.innerHTML = `
    <div class="app-head">
      <div class="app-title"><i data-lucide="beaker"></i><span>Aggiungi / modifica marker</span></div>
      <button class="iconbtn" id="closeAdd" aria-label="Chiudi"><i data-lucide="x"></i></button>
    </div>
    <div class="app-body">
      <div class="field">
        <label for="marker">Marker</label>
        <select id="marker"></select>
      </div>
      <div class="field">
        <label>Stato</label>
        <div class="state-grid" id="states"></div>
      </div>
      <div class="field">
        <label for="note">Note (opzionale)</label>
        <input id="note" type="text" placeholder="es. intensità intermedia, dubbio tecnico, ecc." />
      </div>
      <div class="row" style="justify-content:flex-end">
        <button id="save" class="btn btn-primary" title="OK"><i data-lucide="check"></i><span>OK</span></button>
      </div>
    </div>
  `;
  document.body.appendChild(dlg);
  refreshIcons();
  return dlg;
}

// ===== Refs dinamici (inizializzati dopo build) =====
let appDlg, addDlg;          // PATCH: erano const; ora lazy
let tbody, resultsBox, noteInput;

// ---- init sicuro rispetto al DOM (body potrebbe non esserci) ----
function __initDialogsAndRefs(){                    // PATCH: init unico
  if(!appDlg) appDlg = buildAppDialog();
  if(!addDlg) addDlg = buildAddDialog();
  tbody = document.getElementById('tbody');
  resultsBox = document.getElementById('results');
  noteInput = document.getElementById('note');
  initialFill();                                    // PATCH: spostato qui
  // bind safe al bottone #launch se presente
  const launchBtn = document.getElementById('launch');
  if(launchBtn) launchBtn.onclick = ()=>{ appDlg.showModal(); refreshIcons(); };
}
// build subito se il body è già pronto, altrimenti al DOMContentLoaded
if (document.body) __initDialogsAndRefs();          // PATCH
else document.addEventListener('DOMContentLoaded', __initDialogsAndRefs); // PATCH

// ===== UI Helpers =====
function renderStates(activeKey='pos'){
  const grid = document.getElementById('states');
  grid.innerHTML = '';
  STATES.forEach(s=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'state' + (s.key===activeKey ? ' active' : '');
    b.dataset.key = s.key;
    b.textContent = s.label;
    b.onclick = () => { [...grid.children].forEach(c=>c.classList.remove('active')); b.classList.add('active'); };
    grid.appendChild(b);
  });
}

function openAdd(editIdx=null){
  editingIndex = editIdx;
  if(editIdx!=null){
    const it = selections[editIdx];
    populateMarkerSelect(it.marker, editIdx);  // include corrente, esclude già usati
    renderStates(it.state);
    document.getElementById('note').value = it.note || '';
  } else {
    populateMarkerSelect(null, null);          // esclude già usati
    renderStates('pos');
    document.getElementById('note').value = '';
  }
  addDlg.showModal();
  refreshIcons();
}

function chip(state){
  const map={pos:'Positivo',neg:'Negativo',dim:'Dim',br:'Bright',nt:'Non testato'};
  const cls=state==='pos'?'pos':state==='neg'?'neg':state==='dim'?'dim':state==='br'?'br':'';
  return `<span class="chip ${cls}">${map[state]||state}</span>`;
}

function renderTable(){
  tbody.innerHTML='';
  if(selections.length===0){
    const tr=document.createElement('tr'); tr.className='ghost';
    tr.innerHTML='<td colspan="4">Nessun marker inserito.</td>'; tbody.appendChild(tr); refreshIcons(); return;
  }
  selections.forEach((it,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td><strong>${it.marker}</strong></td>
      <td>${chip(it.state)}</td>
      <td>${it.note?escapeHtml(it.note):'<span class="muted">—</span>'}</td>
      <td class="row" style="justify-content:flex-end">
        <button class="iconbtn" data-edit="${i}" title="Modifica" aria-label="Modifica"><i data-lucide="pencil"></i></button>
        <button class="iconbtn" data-del="${i}" title="Rimuovi" aria-label="Rimuovi"><i data-lucide="trash-2"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
  refreshIcons();
}

function getActiveState(){
  const active = document.querySelector('#states .state.active');
  return active ? active.dataset.key : 'pos';
}

function upsertSelection(obj){
  const idx = selections.findIndex(x=>x.marker===obj.marker);
  if(idx>-1) selections[idx]=obj; else selections.push(obj);
  renderTable();
}

// ===== Scoring Engine =====
function compute(){
  if(selections.length===0){
    resultsBox.innerHTML = '<p class="muted">Nessun risultato: aggiungi marker e riprova.</p>';
    return;
  }
  const diagScores = {};
  const detail = {};
  const provided = Object.fromEntries(selections.map(s=>[s.marker,s.state]));

  for(const diag of Object.keys(RULES)){
    let score = 0; let matches=[]; let conflicts=[];
    const rules = RULES[diag];
    for(const [marker,expect] of Object.entries(rules)){
      const seen = provided[marker];
      if(!seen || seen==='nt') continue;

      if(expect[seen]!=null){
        score += expect[seen];
        if(expect[seen]>0) matches.push(`${marker}=${seen}`);
        if(expect[seen]<0) conflicts.push(`${marker}=${seen}`);
        continue;
      }
      if(seen==='dim' && expect.pos){ score += Math.max(1, Math.min(1, expect.pos)); matches.push(`${marker}=dim≈pos`); continue; }
      if(seen==='pos' && expect.br){ score += 1; matches.push(`${marker}=pos≈br`); continue; }
      if(seen==='br'  && expect.pos){ score += expect.pos; matches.push(`${marker}=br≥pos`); continue; }
      if(seen==='pos' && expect.neg){ score -= 1; conflicts.push(`${marker}=pos vs neg atteso`); continue; }
      if(seen==='neg' && (expect.pos||expect.br)){ score -= 2; conflicts.push(`${marker}=neg vs pos/br atteso`); continue; }

      const fb = fallbackDifferential(expect, seen);
      if(fb !== 0){
        score += fb;
        if(fb > 0) matches.push(`${marker}=${seen} (fallback)`);
        else conflicts.push(`${marker}=${seen} (fallback)`);
      }
    }
    diagScores[diag]=score; detail[diag]={matches,conflicts};
  }

  const entriesAll = Object.entries(diagScores).sort((a,b)=>b[1]-a[1]);
  const entries = entriesAll.filter(([,s])=> s>0);

  resultsBox.innerHTML='';
  if(entries.length===0){
    resultsBox.innerHTML = '<p class="muted">Nessuna diagnosi con score &gt; 0 in base ai marker inseriti.</p>';
    return;
  }

  const max = Math.max(...entries.map(e=>e[1]));
  resultsBox.innerHTML = '<div class="results-list" id="resultsList"></div>';
  const list = document.getElementById('resultsList');

  entries.forEach(([diag,score])=>{
    const pct = Math.max(1, Math.round((score / max) * 100));
    const d = detail[diag];
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `
      <div class="name">${diag}</div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="score">${pct}%</div>
      <div class="meta">
        <span class="tag">✔︎ ${d.matches.length ? escapeHtml(d.matches.join(', ')) : '—'}</span>
        <span class="tag">⚠︎ ${d.conflicts.length ? escapeHtml(d.conflicts.join(', ')) : '—'}</span>
      </div>
    `;
    list.appendChild(row);
  });
}

// ===== Events =====
// PATCH: bind “safe” — apri modale se chiamato da bottone o via API
document.addEventListener('click', (e)=>{
  const t = e.target.closest('button');
  if(!t) return;

  if(t.id==='closeApp'){ appDlg.close(); }
  else if(t.id==='openAdd'){ openAdd(); }
  else if(t.id==='closeAdd'){ addDlg.close(); }
  else if(t.id==='save'){
    const markerSel = document.getElementById('marker');
    const marker = markerSel.value;
    if(!marker){ addDlg.close(); return; }

    const state = getActiveState();
    const note  = document.getElementById('note').value.trim();

    // evita duplicati quando si crea o si edita cambiando marker
    const dupIndex = selections.findIndex((x,i)=> x.marker === marker && i !== editingIndex);
    if (dupIndex > -1){
      alert('Questo marker è già stato inserito.');
      return;
    }

    const obj = { marker, state, note };
    if (editingIndex != null){ selections[editingIndex] = obj; }
    else { selections.push(obj); }

    editingIndex = null;
    renderTable();
    addDlg.close();
  }
  else if(t.id==='compute'){ compute(); }
  else if(t.id==='reset'){
    if(confirm('Sicuro di voler azzerare la selezione?')){
      selections=[]; renderTable(); resultsBox.innerHTML='<p class="muted">Azzera completato.</p>';
    }
  }
  else if(t.dataset && t.dataset.edit!=null){ openAdd(parseInt(t.dataset.edit,10)); }
  else if(t.dataset && t.dataset.del!=null){
    const i=parseInt(t.dataset.del,10);
    selections.splice(i,1);
    renderTable();
  }
});

// Initial render
function initialFill(){
  populateMarkerSelect(null, null);
  renderStates('pos');
  renderTable();
}

// API esterna minimale
window.CDDiagnosticHelper = {
  open(){ 
    if(!appDlg) __initDialogsAndRefs();    // PATCH: garantisce costruzione prima dell’apertura
    appDlg.showModal(); 
    refreshIcons(); 
  },
  close(){ if(appDlg) appDlg.close(); },
  getSelection(){ return JSON.parse(JSON.stringify(selections)); },
  setSelection(arr){
    if(Array.isArray(arr)){
      selections = arr.filter(x=>x && ALL_MARKERS.includes(x.marker) && ['pos','neg','dim','br','nt'].includes(x.state));
      renderTable();
    }
  }
};

// Primo render icone
document.addEventListener('DOMContentLoaded', refreshIcons);
