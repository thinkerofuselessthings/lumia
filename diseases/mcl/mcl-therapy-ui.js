/*! mcl-therapy-ui.js â€” MCL Therapeutic Assistant UI (v2 â€” mount-based, HugeIcons)
 *  Dipendenze: mcl-therapy-core.js (MCLTherapyCore), lumia-helpers.css, HugeIcons CDN
 *  Espone: window.MCLTherapyHelper  { init(), open(), close(), mount(el), getData(), setData(d) }
 */
(function attachMCLTherapyUI(global) {
  'use strict';

  const Core = global.MCLTherapyCore;
  if (!Core) { console.error('[mcl-therapy-ui] MCLTherapyCore non caricato'); return; }

  const mcl = { genetics: [], molecular: [], scores: {}, priorTx: [], context: new Set() };
  const qs = (s, r = document) => r.querySelector(s);
  function el(tag, attrs, html) { const n = document.createElement(tag); if (attrs) Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); if (html != null) n.innerHTML = html; return n; }
  function labelOf(list, key) { const it = list.find(x => x.key === key); return it ? it.label : key; }
  function populateSelect(sel, options, usedKeys, currentKey) {
    sel.innerHTML = ''; const ph = document.createElement('option'); ph.value = ''; ph.textContent = 'â€” seleziona â€”'; sel.appendChild(ph);
    options.forEach(o => { if (o.key === currentKey || !usedKeys.has(o.key)) { const opt = document.createElement('option'); opt.value = o.key; opt.textContent = o.label; sel.appendChild(opt); } });
    if (currentKey) sel.value = currentKey;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Sub-dialogs (data-entry) â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  let addDlg, scoreDlg, priorDlg, ctxDlg;
  function buildSmall(id, icon, titleText) { const d = el('dialog', { id: id }); d.innerHTML = '<div class="app-head"><div class="app-title"><i class="hgi-stroke ' + icon + '"></i><span id="' + id + '-title">' + titleText + '</span></div><button class="iconbtn" data-mcl="closeSub" data-dlg="' + id + '" aria-label="Chiudi"><i class="hgi-stroke hgi-cancel-01"></i></button></div><div class="app-body" id="' + id + '-body"></div>'; document.body.appendChild(d); return d; }
  function ensureDlgs() {
    if (!addDlg) addDlg = buildSmall('mcl-addDlg', 'hgi-test-tube-01', 'Aggiungi');
    if (!scoreDlg) scoreDlg = buildSmall('mcl-scoreDlg', 'hgi-list-view', 'Score');
    if (!priorDlg) priorDlg = buildSmall('mcl-priorDlg', 'hgi-time-01', 'Linee precedenti');
    if (!ctxDlg) ctxDlg = buildSmall('mcl-ctxDlg', 'hgi-checkmark-square-02', 'Contesto');
  }
  function closeSub(id) { const d = document.getElementById(id); if (d) d.close(); }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Mount â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function mount(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = `
      <div class="app-body" style="padding:var(--space-lg);">
        <div class="actions row">
          <button class="btn btn-primary" data-mcl="addGen" title="Genetica"><i class="hgi-stroke hgi-dna"></i></button>
          <button class="btn" data-mcl="addMol" title="Molecolare"><i class="hgi-stroke hgi-activity-01"></i></button>
          <button class="btn" data-mcl="addScore" title="Score"><i class="hgi-stroke hgi-list-view"></i></button>
          <button class="btn" data-mcl="addPrior" title="Linee prec."><i class="hgi-stroke hgi-time-01"></i></button>
          <button class="btn" data-mcl="addCtx" title="Contesto"><i class="hgi-stroke hgi-checkmark-square-02"></i></button>
          <button class="btn" data-mcl="compute" title="Calcola"><i class="hgi-stroke hgi-calculator"></i></button>
          <button class="btn btn-danger" data-mcl="reset" title="Reset"><i class="hgi-stroke hgi-refresh"></i></button>
        </div>
        <div class="grid">
          <section class="card" aria-labelledby="mcl-selH"><h2 id="mcl-selH">Dati inseriti</h2><div class="content" id="mcl-selBox"><div class="muted">Nessun dato.</div></div></section>
          <section class="card" aria-labelledby="mcl-resH"><h2 id="mcl-resH">Raccomandazioni</h2><div class="content" id="mcl-results"><p class="muted">Inserisci i dati e premi <strong>Calcola</strong>.</p></div></section>
        </div>
      </div>`;
    renderSummary();
  }

  function pill(t) { return '<span class="tag">' + t + '</span>'; }
  function renderSummary() {
    const box = qs('#mcl-selBox'); if (!box) return; const h = [];
    const genList = Core.GENETICS || []; const molList = Core.MOLECULAR || [];
    if (mcl.genetics.length) h.push('<div class="row"><strong>Genetica:</strong> ' + mcl.genetics.map(x => pill(labelOf(genList, x.key) + ': ' + (x.value === 'yes' ? '+' : 'âˆ’'))).join(' ') + '</div>');
    if (mcl.molecular.length) h.push('<div class="row"><strong>Molecolare:</strong> ' + mcl.molecular.map(x => pill(labelOf(molList, x.key) + ': ' + x.value)).join(' ') + '</div>');
    if (Object.keys(mcl.scores).length) { const s = Object.entries(mcl.scores).map(([k, v]) => k + ': ' + v); h.push('<div class="row"><strong>Score:</strong> ' + s.map(pill).join(' ') + '</div>'); }
    if (mcl.priorTx.length) h.push('<div class="row"><strong>Trattamenti:</strong> ' + mcl.priorTx.map(x => pill(x.regimen + ' [' + x.line + '] â†’ ' + x.response)).join(' ') + '</div>');
    if (mcl.context.size) h.push('<div class="row"><strong>Contesto:</strong> ' + [...mcl.context].map(pill).join(' ') + '</div>');
    box.innerHTML = h.length ? h.join('<div class="sep"></div>') : '<div class="muted">Nessun dato.</div>';
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Add Genetics â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddGen() {
    ensureDlgs(); qs('#mcl-addDlg-title').textContent = 'Genetica / Biologia';
    const body = qs('#mcl-addDlg-body'); body.innerHTML = '';
    const genList = Core.GENETICS || [];
    const used = new Set(mcl.genetics.map(x => x.key));
    const row = el('div', { class: 'row' }); row.innerHTML = '<label>Parametro</label><select id="mcl-genPick"></select><label>Stato</label><select id="mcl-genState"><option value="yes">Positivo</option><option value="no">Negativo</option></select><button class="btn" data-mcl="saveGenItem"><i class="hgi-stroke hgi-add-01"></i></button>';
    const list = el('div', { id: 'mcl-genList', class: 'stack', style: 'margin-top:8px;' });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" data-mcl="saveAdd"><i class="hgi-stroke hgi-tick-02"></i></button>';
    body.append(row, list, save); populateSelect(qs('#mcl-genPick'), genList, used, null);
    function render() { list.innerHTML = mcl.genetics.length ? mcl.genetics.map((g, i) => '<div class="row"><span class="tag">' + labelOf(genList, g.key) + ': ' + (g.value === 'yes' ? '+' : 'âˆ’') + '</span><button class="btn" data-mcl-delg="' + i + '"><i class="hgi-stroke hgi-delete-02"></i></button></div>').join('') : '<div class="muted">Nessun elemento.</div>'; list.querySelectorAll('[data-mcl-delg]').forEach(b => { b.onclick = () => { mcl.genetics.splice(parseInt(b.dataset.mclDelg, 10), 1); populateSelect(qs('#mcl-genPick'), genList, new Set(mcl.genetics.map(x => x.key)), null); render(); renderSummary(); }; }); }
    body.querySelector('[data-mcl="saveGenItem"]').onclick = () => { const k = qs('#mcl-genPick').value; if (!k || mcl.genetics.some(x => x.key === k)) return; mcl.genetics.push({ key: k, value: qs('#mcl-genState').value }); populateSelect(qs('#mcl-genPick'), genList, new Set(mcl.genetics.map(x => x.key)), null); render(); renderSummary(); };
    body.querySelector('[data-mcl="saveAdd"]').onclick = () => addDlg.close(); render(); addDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Add Molecular â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddMol() {
    ensureDlgs(); qs('#mcl-addDlg-title').textContent = 'Molecolare / Mutazioni';
    const body = qs('#mcl-addDlg-body'); body.innerHTML = '';
    const molList = Core.MOLECULAR || [];
    const grid = el('div', { class: 'stack' });
    molList.forEach(m => { const curr = mcl.molecular.find(x => x.key === m.key)?.value || 'unk'; const row = el('div', { class: 'row' }); row.innerHTML = '<label style="min-width:300px">' + m.label + '</label><select data-mcl-mk="' + m.key + '"><option value="unk"' + (curr === 'unk' ? ' selected' : '') + '>Non testato</option><option value="present"' + (curr === 'present' ? ' selected' : '') + '>Presente</option><option value="absent"' + (curr === 'absent' ? ' selected' : '') + '>Assente</option></select>'; grid.appendChild(row); });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" data-mcl="saveMol"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(grid, save);
    body.querySelector('[data-mcl="saveMol"]').onclick = () => { mcl.molecular = []; body.querySelectorAll('select[data-mcl-mk]').forEach(s => { if (s.value !== 'unk') mcl.molecular.push({ key: s.dataset.mclMk, value: s.value }); }); renderSummary(); addDlg.close(); }; addDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Add Scores (MIPI etc) â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddScore() {
    ensureDlgs(); const body = qs('#mcl-scoreDlg-body'); body.innerHTML = '';
    const defs = Core.SCORE_DEFS || [];
    const stack = el('div', { class: 'stack' });
    defs.forEach(sd => {
      const fs = el('fieldset', { class: 'card', style: 'margin-bottom:12px;' }); fs.innerHTML = '<legend><strong>' + sd.label + '</strong></legend>';
      sd.items.forEach(it => {
        const row = el('div', { class: 'row' });
        if (it.type === 'bool') { row.innerHTML = '<label><input type="checkbox" data-mcl-sc="' + sd.key + '" data-item="' + it.key + '" data-type="bool"' + (mcl.scores[sd.key + ':' + it.key] ? ' checked' : '') + '> ' + it.label + '</label>'; }
        else if (it.type === 'select') { row.innerHTML = '<label>' + it.label + '</label><select data-mcl-sc="' + sd.key + '" data-item="' + it.key + '" data-type="select">' + it.options.map(o => '<option value="' + o.value + '">' + o.label + '</option>').join('') + '</select>'; }
        else if (it.type === 'number') { row.innerHTML = '<label>' + it.label + '</label><input type="number" data-mcl-sc="' + sd.key + '" data-item="' + it.key + '" data-type="number" step="any" value="' + (it.default || 0) + '">'; }
        else { row.innerHTML = '<label><input type="checkbox" data-mcl-sc="' + sd.key + '" data-item="' + it.key + '" data-type="bool"> ' + it.label + '</label>'; }
        fs.appendChild(row);
      });
      stack.appendChild(fs);
    });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" data-mcl="saveScore"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(stack, save);
    body.querySelector('[data-mcl="saveScore"]').onclick = () => {
      mcl.scores = {};
      defs.forEach(sd => {
        const vals = {};
        body.querySelectorAll('[data-mcl-sc="' + sd.key + '"]').forEach(inp => {
          const t = inp.dataset.type;
          if (t === 'bool') vals[inp.dataset.item] = inp.checked;
          else if (t === 'select') vals[inp.dataset.item] = inp.value;
          else if (t === 'number') vals[inp.dataset.item] = parseFloat(inp.value) || 0;
        });
        const total = Core.computeScore(sd.key, vals);
        if (total != null) mcl.scores[sd.key] = total;
      });
      renderSummary(); scoreDlg.close();
    };
    scoreDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Prior Treatments â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddPrior() {
    ensureDlgs(); const body = qs('#mcl-priorDlg-body'); body.innerHTML = '';
    const regs = Core.REGIMENS || []; const respList = Core.RESPONSES || ['CR', 'PR', 'SD', 'PD', 'Intolleranza'];
    const row = el('div', { class: 'row' }); row.innerHTML = '<label>Schema</label><select id="mcl-prReg"><option value="">â€”</option>' + regs.map(r => '<option value="' + (r.key || r) + '">' + (r.label || r.name || r) + '</option>').join('') + '</select><label>Linea</label><select id="mcl-prLine"><option>1L</option><option>2L</option><option>3L+</option></select>';
    const row2 = el('div', { class: 'row' }); row2.innerHTML = '<label>Risposta</label><select id="mcl-prResp">' + respList.map(r => '<option>' + r + '</option>').join('') + '</select><button class="btn" data-mcl="addPrItem"><i class="hgi-stroke hgi-add-01"></i></button>';
    const list = el('div', { id: 'mcl-prList', class: 'stack', style: 'margin-top:8px;' }); const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" data-mcl="savePrior"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(row, row2, list, save);
    function render() { list.innerHTML = mcl.priorTx.length ? mcl.priorTx.map((x, i) => '<div class="row"><span class="tag">' + x.regimen + ' [' + x.line + '] â†’ ' + x.response + '</span><button class="btn" data-mcl-delpr="' + i + '"><i class="hgi-stroke hgi-delete-02"></i></button></div>').join('') : '<div class="muted">Nessun trattamento.</div>'; list.querySelectorAll('[data-mcl-delpr]').forEach(b => { b.onclick = () => { mcl.priorTx.splice(parseInt(b.dataset.mclDelpr, 10), 1); render(); }; }); }
    body.querySelector('[data-mcl="addPrItem"]').onclick = () => { const k = qs('#mcl-prReg').value; if (!k) return; mcl.priorTx.push({ regimen: k, line: qs('#mcl-prLine').value, response: qs('#mcl-prResp').value }); render(); };
    body.querySelector('[data-mcl="savePrior"]').onclick = () => { renderSummary(); priorDlg.close(); }; render(); priorDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Context Flags â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddCtx() {
    ensureDlgs(); const body = qs('#mcl-ctxDlg-body'); body.innerHTML = '';
    const flags = Core.CONTEXT_FLAGS || [];
    const grid = el('div', { class: 'stack' });
    flags.forEach(f => { const lbl = el('label', { class: 'row' }); lbl.innerHTML = '<input type="checkbox" data-mcl-cf="' + encodeURIComponent(f) + '"' + (mcl.context.has(f) ? ' checked' : '') + '> ' + f; grid.appendChild(lbl); });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" data-mcl="saveCtx"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(grid, save);
    body.querySelector('[data-mcl="saveCtx"]').onclick = () => { mcl.context.clear(); body.querySelectorAll('input[data-mcl-cf]:checked').forEach(ch => mcl.context.add(decodeURIComponent(ch.dataset.mclCf))); renderSummary(); ctxDlg.close(); }; ctxDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Compute & Results â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function doCompute() { const input = { genetics: mcl.genetics, molecular: mcl.molecular, scores: mcl.scores, priorTx: mcl.priorTx, context: [...mcl.context] }; const result = Core.compute(input); renderResults(result.recommendations); _emit('lumia:therapy:computed', { type: 'mcl', result }); }
  function renderResults(list) { const box = qs('#mcl-results'); if (!box) return; if (!list || !list.length) { box.innerHTML = '<p class="muted">Nessuna proposta con i dati attuali.</p>'; return; } const max = Math.max(...list.map(x => x.score)); box.innerHTML = '<div class="results-list" id="mcl-resList"></div>'; const ul = qs('#mcl-resList'); list.forEach(item => { const pct = Math.max(1, Math.round((item.score / max) * 100)); const row = el('div', { class: 'result-row' }); row.innerHTML = '<div class="name">' + item.name + '</div><div class="bar"><i style="width:' + pct + '%"></i></div><div class="score">' + pct + '%</div><div class="meta"><span class="tag">' + (item.tags || []).join(' â€¢ ') + '</span></div>'; ul.appendChild(row); }); }
  function _emit(type, detail) { if (global.LumiaEvents && typeof global.LumiaEvents.emit === 'function') global.LumiaEvents.emit(type, detail); try { global.dispatchEvent(new CustomEvent(type, { detail })); } catch (_) {} }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Event delegation â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  let bound = false;
  function bindEvents() {
    if (bound) return; bound = true;
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-mcl]');
      if (!b) return;
      const action = b.dataset.mcl;
      if (action === 'closeSub') { closeSub(b.dataset.dlg); return; }
      if (action === 'addGen') openAddGen();
      if (action === 'addMol') openAddMol();
      if (action === 'addScore') openAddScore();
      if (action === 'addPrior') openAddPrior();
      if (action === 'addCtx') openAddCtx();
      if (action === 'compute') doCompute();
      if (action === 'reset') {
        if (confirm('Azzerare i dati?')) {
          mcl.genetics = []; mcl.molecular = []; mcl.scores = {}; mcl.priorTx = []; mcl.context.clear();
          renderSummary(); var box = qs('#mcl-results'); if (box) box.innerHTML = '<p class="muted">Reset completato.</p>';
        }
      }
    });
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  global.MCLTherapyHelper = {
    mount: mount,
    init() { bindEvents(); },
    open() { bindEvents(); var bMount = qs('#bMount'); if (bMount) { mount(bMount); var bTitle = qs('#bTitle'); if (bTitle) bTitle.innerHTML = '<i class="hgi-stroke hgi-cell-01"></i> <span>Linfoma Mantellare â€” Assistente terapeutico</span>'; var modB = document.getElementById('modB'); if (modB) modB.classList.add('fullpage'); if (typeof global.showLayer === 'function') global.showLayer('B'); } },
    close() { if (typeof global.hideLayer === 'function') global.hideLayer('B'); },
    getData() { return JSON.parse(JSON.stringify({ genetics: mcl.genetics, molecular: mcl.molecular, scores: mcl.scores, priorTx: mcl.priorTx, context: [...mcl.context] })); },
    setData(d) { if (!d) return; mcl.genetics = d.genetics || []; mcl.molecular = d.molecular || []; mcl.scores = d.scores || {}; mcl.priorTx = d.priorTx || []; mcl.context = new Set(d.context || []); renderSummary(); }
  };

  document.addEventListener('DOMContentLoaded', function () { bindEvents(); var reg = global.LumiaHelpersRegistry; if (reg && typeof reg.register === 'function') { reg.register({ id: 'mcl', title: 'Linfoma Mantellare Â· Assistente terapeutico', version: 'v2', tags: ['MCL', 'terapia'], mount: mount }); } });
})(window);
