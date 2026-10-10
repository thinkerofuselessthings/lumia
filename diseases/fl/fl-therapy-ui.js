/*! fl-therapy-ui.js â€” FL Therapeutic Assistant UI (v2 â€” mount-based, HugeIcons)
 *  Dipendenze: fl-therapy-core.js (FLTherapyCore), lumia-helpers.css, HugeIcons CDN
 *  Espone: window.FLTherapyHelper  { init(), open(), close(), mount(el), getData(), setData(d) }
 */
(function attachFLTherapyUI(global) {
  'use strict';

  const Core = global.FLTherapyCore;
  if (!Core) { console.error('[fl-therapy-ui] FLTherapyCore non caricato'); return; }

  const flSel = { genetics: [], molecular: [], scores: {}, priorTx: [], indications: new Set() };
  const qs = (s, r = document) => r.querySelector(s);
  function el(tag, attrs, html) { const n = document.createElement(tag); if (attrs) Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); if (html != null) n.innerHTML = html; return n; }
  function labelOf(list, key) { const it = list.find(x => x.key === key); return it ? it.label : key; }
  function populateSelect(sel, options, usedKeys, currentKey) {
    sel.innerHTML = ''; const ph = document.createElement('option'); ph.value = ''; ph.textContent = 'â€” seleziona â€”'; sel.appendChild(ph);
    options.forEach(o => { if (o.key === currentKey || !usedKeys.has(o.key)) { const opt = document.createElement('option'); opt.value = o.key; opt.textContent = o.label; sel.appendChild(opt); } });
    if (currentKey) sel.value = currentKey;
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Sub-dialogs â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  let addDlg, scoreDlg, priorDlg, gelfDlg;
  function buildSmall(id, icon, titleText) { const d = el('dialog', { id: id }); d.innerHTML = '<div class="app-head"><div class="app-title"><i class="hgi-stroke ' + icon + '"></i><span id="' + id + '-title">' + titleText + '</span></div><button class="iconbtn" id="' + id + '-close" aria-label="Chiudi"><i class="hgi-stroke hgi-cancel-01"></i></button></div><div class="app-body" id="' + id + '-body"></div>'; document.body.appendChild(d); return d; }
  function ensureDlgs() {
    if (!addDlg) addDlg = buildSmall('fl-addDlg', 'hgi-test-tube-01', 'Aggiungi');
    if (!scoreDlg) scoreDlg = buildSmall('fl-scoreDlg', 'hgi-list-view', 'Score');
    if (!priorDlg) priorDlg = buildSmall('fl-priorDlg', 'hgi-time-01', 'Linee precedenti');
    if (!gelfDlg) gelfDlg = buildSmall('fl-gelfDlg', 'hgi-checkmark-square-02', 'Criteri GELF');
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Mount â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function mount(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = `
      <div class="app-body" style="padding:var(--space-lg);">
        <div class="actions row">
          <button class="btn btn-primary" id="fl-addGen" title="Genetica"><i class="hgi-stroke hgi-dna"></i></button>
          <button class="btn" id="fl-addMol" title="Molecolare"><i class="hgi-stroke hgi-activity-01"></i></button>
          <button class="btn" id="fl-addScore" title="Score"><i class="hgi-stroke hgi-list-view"></i></button>
          <button class="btn" id="fl-addPrior" title="Linee prec."><i class="hgi-stroke hgi-time-01"></i></button>
          <button class="btn" id="fl-addGelf" title="GELF / Indicazioni"><i class="hgi-stroke hgi-checkmark-square-02"></i></button>
          <button class="btn" id="fl-compute" title="Calcola"><i class="hgi-stroke hgi-calculator"></i></button>
          <button class="btn btn-danger" id="fl-reset" title="Reset"><i class="hgi-stroke hgi-refresh"></i></button>
        </div>
        <div class="grid">
          <section class="card" aria-labelledby="fl-selH"><h2 id="fl-selH">Dati inseriti</h2><div class="content" id="fl-selBox"><div class="muted">Nessun dato.</div></div></section>
          <section class="card" aria-labelledby="fl-resH"><h2 id="fl-resH">Raccomandazioni</h2><div class="content" id="fl-results"><p class="muted">Inserisci i dati e premi <strong>Calcola</strong>.</p></div></section>
        </div>
      </div>`;
    renderSummary();
  }

  function pill(t) { return '<span class="tag">' + t + '</span>'; }
  function renderSummary() {
    const box = qs('#fl-selBox'); if (!box) return; const h = [];
    if (flSel.genetics.length) h.push('<div class="row"><strong>Genetica:</strong> ' + flSel.genetics.map(x => pill(labelOf(Core.genetics(), x.key) + ': ' + (x.value === 'yes' ? '+' : 'âˆ’'))).join(' ') + '</div>');
    if (flSel.molecular.length) h.push('<div class="row"><strong>Molecolare:</strong> ' + flSel.molecular.map(x => pill(labelOf(Core.molecular(), x.key) + ': ' + x.value)).join(' ') + '</div>');
    if (Object.keys(flSel.scores).length) { const s = Object.entries(flSel.scores).map(([k, v]) => k + ': ' + v); h.push('<div class="row"><strong>Score:</strong> ' + s.map(pill).join(' ') + '</div>'); }
    if (flSel.priorTx.length) h.push('<div class="row"><strong>Trattamenti:</strong> ' + flSel.priorTx.map(x => pill(x.regimen + ' [' + x.line + '] â†’ ' + x.response)).join(' ') + '</div>');
    if (flSel.indications.size) h.push('<div class="row"><strong>GELF:</strong> ' + [...flSel.indications].map(pill).join(' ') + '</div>');
    box.innerHTML = h.length ? h.join('<div class="sep"></div>') : '<div class="muted">Nessun dato.</div>';
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Genetics â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddGen() { ensureDlgs(); qs('#fl-addDlg-title').textContent = 'Genetica / Biologia'; const body = qs('#fl-addDlg-body'); body.innerHTML = ''; const used = new Set(flSel.genetics.map(x => x.key)); const row = el('div', { class: 'row' }); row.innerHTML = '<label>Parametro</label><select id="fl-genPick"></select><label>Stato</label><select id="fl-genState"><option value="yes">Positivo</option><option value="no">Negativo</option></select><button class="btn" id="fl-genAdd"><i class="hgi-stroke hgi-add-01"></i></button>'; const list = el('div', { id: 'fl-genList', class: 'stack', style: 'margin-top:8px;' }); const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" id="fl-genSave"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(row, list, save); populateSelect(qs('#fl-genPick'), Core.genetics(), used, null); function render() { list.innerHTML = flSel.genetics.length ? flSel.genetics.map((g, i) => '<div class="row"><span class="tag">' + labelOf(Core.genetics(), g.key) + ': ' + (g.value === 'yes' ? '+' : 'âˆ’') + '</span><button class="btn" data-fl-delg="' + i + '"><i class="hgi-stroke hgi-delete-02"></i></button></div>').join('') : '<div class="muted">Nessun elemento.</div>'; list.querySelectorAll('[data-fl-delg]').forEach(b => { b.onclick = () => { flSel.genetics.splice(parseInt(b.dataset.flDelg, 10), 1); populateSelect(qs('#fl-genPick'), Core.genetics(), new Set(flSel.genetics.map(x => x.key)), null); render(); renderSummary(); }; }); } qs('#fl-genAdd').onclick = () => { const k = qs('#fl-genPick').value; if (!k || flSel.genetics.some(x => x.key === k)) return; flSel.genetics.push({ key: k, value: qs('#fl-genState').value }); populateSelect(qs('#fl-genPick'), Core.genetics(), new Set(flSel.genetics.map(x => x.key)), null); render(); renderSummary(); }; qs('#fl-genSave').onclick = () => addDlg.close(); render(); addDlg.showModal(); }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Molecular â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddMol() { ensureDlgs(); qs('#fl-addDlg-title').textContent = 'Molecolare / Stato mutazionale'; const body = qs('#fl-addDlg-body'); body.innerHTML = ''; const grid = el('div', { class: 'stack' }); Core.molecular().forEach(m => { const curr = flSel.molecular.find(x => x.key === m.key)?.value || 'unk'; const row = el('div', { class: 'row' }); row.innerHTML = '<label style="min-width:300px">' + m.label + '</label><select data-fl-mk="' + m.key + '"><option value="unk"' + (curr === 'unk' ? ' selected' : '') + '>Non testato</option><option value="present"' + (curr === 'present' ? ' selected' : '') + '>Presente</option><option value="absent"' + (curr === 'absent' ? ' selected' : '') + '>Assente</option></select>'; grid.appendChild(row); }); const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" id="fl-molSave"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(grid, save); qs('#fl-molSave').onclick = () => { flSel.molecular = []; body.querySelectorAll('select[data-fl-mk]').forEach(s => { if (s.value !== 'unk') flSel.molecular.push({ key: s.dataset.flMk, value: s.value }); }); renderSummary(); addDlg.close(); }; addDlg.showModal(); }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Scores (FLIPI etc) â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddScore() {
    ensureDlgs(); const body = qs('#fl-scoreDlg-body'); body.innerHTML = '';
    const defs = Core.scoreDefs(); const scoreSel = el('div', { class: 'stack' });
    defs.forEach(sd => {
      const fieldset = el('fieldset', { class: 'card', style: 'margin-bottom:12px;' });
      fieldset.innerHTML = '<legend><strong>' + sd.label + '</strong></legend>';
      sd.items.forEach(it => { const cb = el('label', { class: 'row' }); cb.innerHTML = '<input type="checkbox" data-fl-sc="' + sd.key + '" data-item="' + it.key + '"' + (flSel.scores[sd.key + ':' + it.key] ? ' checked' : '') + '> ' + it.label; fieldset.appendChild(cb); });
      scoreSel.appendChild(fieldset);
    });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' });
    save.innerHTML = '<button class="btn btn-primary" id="fl-scoreSave"><i class="hgi-stroke hgi-tick-02"></i></button>';
    body.append(scoreSel, save);
    qs('#fl-scoreSave').onclick = () => {
      /* Re-compute each score from checked items */
      flSel.scores = {};
      defs.forEach(sd => {
        const checked = {};
        body.querySelectorAll('input[data-fl-sc="' + sd.key + '"]').forEach(ch => { checked[ch.dataset.item] = ch.checked; });
        const total = Core.calcScore(sd.key, checked);
        if (total != null) flSel.scores[sd.key] = total;
      });
      renderSummary(); scoreDlg.close();
    };
    scoreDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Prior Treatments â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddPrior() {
    ensureDlgs(); const body = qs('#fl-priorDlg-body'); body.innerHTML = '';
    const regs = Core.regimenList(); const respList = Core.responses();
    const row = el('div', { class: 'row' }); row.innerHTML = '<label>Schema</label><select id="fl-prReg"><option value="">â€”</option>' + regs.map(r => '<option value="' + r + '">' + r + '</option>').join('') + '</select><label>Linea</label><select id="fl-prLine"><option>1L</option><option>2L</option><option>3L+</option></select>'; const row2 = el('div', { class: 'row' }); row2.innerHTML = '<label>Risposta</label><select id="fl-prResp">' + respList.map(r => '<option>' + r + '</option>').join('') + '</select><button class="btn" id="fl-prAdd"><i class="hgi-stroke hgi-add-01"></i></button>';
    const list = el('div', { id: 'fl-prList', class: 'stack', style: 'margin-top:8px;' }); const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" id="fl-prSave"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(row, row2, list, save);
    function render() { list.innerHTML = flSel.priorTx.length ? flSel.priorTx.map((x, i) => '<div class="row"><span class="tag">' + x.regimen + ' [' + x.line + '] â†’ ' + x.response + '</span><button class="btn" data-fl-delpr="' + i + '"><i class="hgi-stroke hgi-delete-02"></i></button></div>').join('') : '<div class="muted">Nessun trattamento.</div>'; list.querySelectorAll('[data-fl-delpr]').forEach(b => { b.onclick = () => { flSel.priorTx.splice(parseInt(b.dataset.flDelpr, 10), 1); render(); }; }); }
    qs('#fl-prAdd').onclick = () => { const k = qs('#fl-prReg').value; if (!k) return; flSel.priorTx.push({ regimen: k, line: qs('#fl-prLine').value, response: qs('#fl-prResp').value }); render(); };
    qs('#fl-prSave').onclick = () => { renderSummary(); priorDlg.close(); }; render(); priorDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ GELF / Indications â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function openAddGelf() {
    ensureDlgs(); const body = qs('#fl-gelfDlg-body'); body.innerHTML = '';
    const flags = Core.gelfFlags(); const grid = el('div', { class: 'stack' });
    flags.forEach(f => { const lbl = el('label', { class: 'row' }); lbl.innerHTML = '<input type="checkbox" data-fl-gf="' + encodeURIComponent(f) + '"' + (flSel.indications.has(f) ? ' checked' : '') + '> ' + f; grid.appendChild(lbl); });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' }); save.innerHTML = '<button class="btn btn-primary" id="fl-gelfSave"><i class="hgi-stroke hgi-tick-02"></i></button>'; body.append(grid, save);
    qs('#fl-gelfSave').onclick = () => { flSel.indications.clear(); body.querySelectorAll('input[data-fl-gf]:checked').forEach(ch => flSel.indications.add(decodeURIComponent(ch.dataset.flGf))); renderSummary(); gelfDlg.close(); }; gelfDlg.showModal();
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Compute & Results â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function doCompute() { const input = { genetics: flSel.genetics, molecular: flSel.molecular, scores: flSel.scores, priorTx: flSel.priorTx, indications: [...flSel.indications] }; const result = Core.compute(input); renderResults(result.recommendations); _emit('lumia:therapy:computed', { type: 'fl', result }); }
  function renderResults(list) { const box = qs('#fl-results'); if (!box) return; if (!list || !list.length) { box.innerHTML = '<p class="muted">Nessuna proposta con i dati attuali.</p>'; return; } const max = Math.max(...list.map(x => x.score)); box.innerHTML = '<div class="results-list" id="fl-resList"></div>'; const ul = qs('#fl-resList'); list.forEach(item => { const pct = Math.max(1, Math.round((item.score / max) * 100)); const row = el('div', { class: 'result-row' }); row.innerHTML = '<div class="name">' + item.name + '</div><div class="bar"><i style="width:' + pct + '%"></i></div><div class="score">' + pct + '%</div><div class="meta"><span class="tag">' + (item.tags || []).join(' â€¢ ') + '</span></div>'; ul.appendChild(row); }); }
  function _emit(type, detail) { if (global.LumiaEvents && typeof global.LumiaEvents.emit === 'function') global.LumiaEvents.emit(type, detail); try { global.dispatchEvent(new CustomEvent(type, { detail })); } catch (_) {} }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Events â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  let bound = false;
  function bindEvents() { if (bound) return; bound = true; document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.id === 'fl-addDlg-close' || b.id === 'fl-addDlg-close') { if (addDlg) addDlg.close(); } if (b.id === 'fl-scoreDlg-close') { if (scoreDlg) scoreDlg.close(); } if (b.id === 'fl-priorDlg-close') { if (priorDlg) priorDlg.close(); } if (b.id === 'fl-gelfDlg-close') { if (gelfDlg) gelfDlg.close(); } if (b.id === 'fl-addGen') openAddGen(); if (b.id === 'fl-addMol') openAddMol(); if (b.id === 'fl-addScore') openAddScore(); if (b.id === 'fl-addPrior') openAddPrior(); if (b.id === 'fl-addGelf') openAddGelf(); if (b.id === 'fl-compute') doCompute(); if (b.id === 'fl-reset') { if (confirm('Azzerare i dati?')) { flSel.genetics = []; flSel.molecular = []; flSel.scores = {}; flSel.priorTx = []; flSel.indications.clear(); renderSummary(); var box = qs('#fl-results'); if (box) box.innerHTML = '<p class="muted">Reset completato.</p>'; } } }); }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  global.FLTherapyHelper = {
    mount: mount,
    init() { bindEvents(); },
    open() { bindEvents(); var bMount = qs('#bMount'); if (bMount) { mount(bMount); var bTitle = qs('#bTitle'); if (bTitle) bTitle.innerHTML = '<i class="hgi-stroke hgi-leaf-01"></i> <span>Linfoma Follicolare â€” Assistente terapeutico</span>'; var modB = document.getElementById('modB'); if (modB) modB.classList.add('fullpage'); if (typeof global.showLayer === 'function') global.showLayer('B'); } },
    close() { if (typeof global.hideLayer === 'function') global.hideLayer('B'); },
    getData() { return JSON.parse(JSON.stringify({ genetics: flSel.genetics, molecular: flSel.molecular, scores: flSel.scores, priorTx: flSel.priorTx, indications: [...flSel.indications] })); },
    setData(d) { if (!d) return; flSel.genetics = d.genetics || []; flSel.molecular = d.molecular || []; flSel.scores = d.scores || {}; flSel.priorTx = d.priorTx || []; flSel.indications = new Set(d.indications || []); renderSummary(); }
  };

  document.addEventListener('DOMContentLoaded', function () { bindEvents(); var reg = global.LumiaHelpersRegistry; if (reg && typeof reg.register === 'function') { reg.register({ id: 'fl', title: 'Linfoma Follicolare Â· Assistente terapeutico', version: 'v2', tags: ['FL', 'terapia'], mount: mount }); } });
})(window);
