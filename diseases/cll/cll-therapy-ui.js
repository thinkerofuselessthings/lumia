/*! cll-therapy-ui.js â€” CLL Therapeutic Assistant UI (v2 â€” mount-based, HugeIcons)
 *  Dipendenze: cll-therapy-core.js (CLLTherapyCore), lumia-helpers.css, HugeIcons CDN
 *  Espone: window.CLLTherapyHelper  { init(), open(), close(), mount(el), getState(), setState(s) }
 *  Pattern: IIFE su window
 */
(function attachCLLTherapyUI(global) {
  'use strict';

  const Core = global.CLLTherapyCore;
  if (!Core) { console.error('[cll-therapy-ui] CLLTherapyCore non caricato'); return; }

  /* â”€â”€ State â”€â”€ */
  const txState = {
    genetics: [],
    mutations: [],
    scores: {},
    history: [],
    indications: new Set()
  };

  /* â”€â”€ DOM helpers â”€â”€ */
  const qs = (s, r = document) => r.querySelector(s);
  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (html != null) n.innerHTML = html;
    return n;
  }
  function labelOf(list, key) { const it = list.find(x => x.key === key); return it ? it.label : key; }

  function populateSelect(sel, options, usedKeys, currentKey) {
    sel.innerHTML = '';
    const ph = document.createElement('option');
    ph.value = ''; ph.textContent = 'â€” seleziona â€”';
    sel.appendChild(ph);
    options.forEach(o => {
      if (o.key === currentKey || !usedKeys.has(o.key)) {
        const opt = document.createElement('option');
        opt.value = o.key; opt.textContent = o.label;
        sel.appendChild(opt);
      }
    });
    if (currentKey) sel.value = currentKey;
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Sub-dialogs â€” stay as <dialog>
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  let addDlg, regDlg;

  function buildAddDialog() {
    const dlg = el('dialog', { id: 'tx-addDlg' });
    dlg.innerHTML = `
      <div class="app-head">
        <div class="app-title"><i class="hgi-stroke hgi-test-tube-01"></i><span id="tx-addTitle">Aggiungi</span></div>
        <button class="iconbtn" id="tx-addClose" aria-label="Chiudi"><i class="hgi-stroke hgi-cancel-01"></i></button>
      </div>
      <div class="app-body" id="tx-addBody"></div>`;
    document.body.appendChild(dlg);
    return dlg;
  }

  function buildRegDialog() {
    const dlg = el('dialog', { id: 'tx-regDlg' });
    dlg.innerHTML = `
      <div class="app-head">
        <div class="app-title"><i class="hgi-stroke hgi-file-01"></i><span id="tx-regTitle">Dettaglio schema</span></div>
        <button class="iconbtn" id="tx-regClose" aria-label="Chiudi"><i class="hgi-stroke hgi-cancel-01"></i></button>
      </div>
      <div class="app-body" id="tx-regBody"></div>`;
    document.body.appendChild(dlg);
    return dlg;
  }

  function ensureSubDlgs() {
    if (!addDlg) addDlg = buildAddDialog();
    if (!regDlg) regDlg = buildRegDialog();
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  mount(el) â€” render main content into element
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function mount(containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = `
      <div class="app-body" style="padding:var(--space-lg);">
        <div class="actions row">
          <button class="btn btn-primary" id="tx-addGen" title="Genetica"><i class="hgi-stroke hgi-dna"></i></button>
          <button class="btn" id="tx-addMut" title="Mutazioni resistenza"><i class="hgi-stroke hgi-activity-01"></i></button>
          <button class="btn" id="tx-addScore" title="Score di rischio"><i class="hgi-stroke hgi-list-view"></i></button>
          <button class="btn" id="tx-addHist" title="Storia trattamenti"><i class="hgi-stroke hgi-time-01"></i></button>
          <button class="btn" id="tx-addInd" title="Indicazioni iwCLL"><i class="hgi-stroke hgi-checkmark-square-02"></i></button>
          <button class="btn" id="tx-compute" title="Calcola raccomandazioni"><i class="hgi-stroke hgi-calculator"></i></button>
          <button class="btn btn-danger" id="tx-reset" title="Reset"><i class="hgi-stroke hgi-refresh"></i></button>
        </div>
        <div class="grid">
          <section class="card" aria-labelledby="tx-selH">
            <h2 id="tx-selH">Dati inseriti</h2>
            <div class="content" id="tx-summary"><div class="muted">Nessun dato. Aggiungi elementi con i pulsanti sopra.</div></div>
          </section>
          <section class="card" aria-labelledby="tx-resH">
            <h2 id="tx-resH">Raccomandazioni</h2>
            <div class="content" id="tx-results"><p class="muted">Inserisci i dati e premi <strong>calcola</strong>.</p></div>
          </section>
        </div>
      </div>`;
    renderSummary();
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Summary renderer
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function pill(t) { return `<span class="tag">${t}</span>`; }

  function renderSummary() {
    const box = qs('#tx-summary');
    if (!box) return;
    const h = [];

    if (txState.genetics.length) {
      h.push('<div class="row"><strong>Genetica:</strong> ' +
        txState.genetics.map(x => pill(`${labelOf(Core.genetics(), x.key)}: ${x.value === 'yes' ? 'Presente' : 'Assente'}`)).join(' ') + '</div>');
    }
    if (txState.mutations.length) {
      h.push('<div class="row"><strong>Mutazioni resistenza:</strong> ' +
        txState.mutations.map(x => pill(`${labelOf(Core.mutations(), x.key)}: ${x.value}`)).join(' ') + '</div>');
    }
    if (Object.keys(txState.scores).length) {
      const parts = [];
      if (txState.scores.rai)     parts.push(`Rai: ${txState.scores.rai.stage}`);
      if (txState.scores.binet)   parts.push(`Binet: ${txState.scores.binet.stage}`);
      if (txState.scores.cll_ipi) parts.push(`CLL-IPI: ${txState.scores.cll_ipi.risk} (${txState.scores.cll_ipi.score})`);
      h.push('<div class="row"><strong>Score:</strong> ' + parts.map(pill).join(' ') + '</div>');
    }
    if (txState.history.length) {
      const regs = Core.regimens();
      h.push('<div class="row"><strong>Storia tratt.:</strong> ' +
        txState.history.map(x => pill(`${regs[x.regimenKey]?.name || x.regimenKey} [${x.line}] â†’ ${x.response}`)).join(' ') + '</div>');
    }
    if (txState.indications.size) {
      h.push('<div class="row"><strong>Indicazioni iwCLL:</strong> ' +
        [...txState.indications].map(pill).join(' ') + '</div>');
    }

    box.innerHTML = h.length ? h.join('<div class="sep"></div>') : '<div class="muted">Nessun dato.</div>';
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Add flows
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

  /* â”€â”€ Genetics â”€â”€ */
  function openAddGen() {
    ensureSubDlgs();
    qs('#tx-addTitle').textContent = 'Genetica / Biologia';
    const body = qs('#tx-addBody'); body.innerHTML = '';
    const used = new Set(txState.genetics.map(x => x.key));

    const row = el('div', { class: 'row' });
    row.innerHTML = `
      <label>Parametro</label>
      <select id="tx-genPick"></select>
      <label>Stato</label>
      <select id="tx-genState"><option value="yes">Presente</option><option value="no">Assente</option></select>
      <button class="btn" id="tx-genAdd" title="Aggiungi"><i class="hgi-stroke hgi-add-01"></i></button>`;

    const list = el('div', { id: 'tx-genList', class: 'stack', style: 'margin-top:8px;' });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' });
    save.innerHTML = `<button class="btn btn-primary" id="tx-genSave"><i class="hgi-stroke hgi-tick-02"></i></button>`;

    body.append(row, list, save);
    populateSelect(qs('#tx-genPick'), Core.genetics(), used, null);

    function render() {
      list.innerHTML = txState.genetics.length
        ? txState.genetics.map((g, i) => `<div class="row">
            <span class="tag">${labelOf(Core.genetics(), g.key)}: ${g.value === 'yes' ? 'Presente' : 'Assente'}</span>
            <button class="btn" data-tx-delgen="${i}" title="Rimuovi"><i class="hgi-stroke hgi-delete-02"></i></button>
          </div>`).join('')
        : '<div class="muted">Nessun elemento inserito.</div>';
      list.querySelectorAll('[data-tx-delgen]').forEach(b => {
        b.onclick = () => {
          txState.genetics.splice(parseInt(b.dataset.txDelgen, 10), 1);
          populateSelect(qs('#tx-genPick'), Core.genetics(), new Set(txState.genetics.map(x => x.key)), null);
          render(); renderSummary();
        };
      });
    }

    qs('#tx-genAdd').onclick = () => {
      const k = qs('#tx-genPick').value;
      const v = qs('#tx-genState').value;
      if (!k || txState.genetics.some(x => x.key === k)) return;
      txState.genetics.push({ key: k, value: v });
      populateSelect(qs('#tx-genPick'), Core.genetics(), new Set(txState.genetics.map(x => x.key)), null);
      render(); renderSummary();
    };
    qs('#tx-genSave').onclick = () => addDlg.close();

    render();
    addDlg.showModal();
  }

  /* â”€â”€ Mutations â”€â”€ */
  function openAddMut() {
    ensureSubDlgs();
    qs('#tx-addTitle').textContent = 'Mutazioni di resistenza';
    const body = qs('#tx-addBody'); body.innerHTML = '';
    const grid = el('div', { class: 'stack' });

    Core.mutations().forEach(m => {
      const curr = txState.mutations.find(x => x.key === m.key)?.value || 'unk';
      const row = el('div', { class: 'row' });
      row.innerHTML = `
        <label style="min-width:300px">${m.label}</label>
        <select data-tx-mk="${m.key}">
          <option value="unk" ${curr === 'unk' ? 'selected' : ''}>Non testato / n.d.</option>
          <option value="present" ${curr === 'present' ? 'selected' : ''}>Presente</option>
          <option value="absent" ${curr === 'absent' ? 'selected' : ''}>Assente</option>
        </select>`;
      grid.appendChild(row);
    });

    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' });
    save.innerHTML = `<button class="btn btn-primary" id="tx-mutSave"><i class="hgi-stroke hgi-tick-02"></i></button>`;
    body.append(grid, save);

    qs('#tx-mutSave').onclick = () => {
      txState.mutations = [];
      body.querySelectorAll('select[data-tx-mk]').forEach(s => {
        if (s.value !== 'unk') txState.mutations.push({ key: s.dataset.txMk, value: s.value });
      });
      renderSummary(); addDlg.close();
    };

    addDlg.showModal();
  }

  /* â”€â”€ Scores â”€â”€ */
  function tplRai() {
    return `<div data-score="rai" class="stack">
      <div class="row"><label>Stadio Rai</label>
        <select id="tx-raiStage">
          <option value="">â€”</option>
          <option value="0">0 â€” Solo linfocitosi</option>
          <option value="I">I â€” Linfocitosi con linfoadenopatia</option>
          <option value="II">II â€” Spleno/epatomegalia (Â± LAP)</option>
          <option value="III">III â€” Anemia (Hb &lt; 11 g/dL)</option>
          <option value="IV">IV â€” Piastrinopenia (PLT &lt; 100Ã—10â¹/L)</option>
        </select></div>
      <p class="muted">Citopenie â†’ III (anemia) e IV (piastrinopenia).</p></div>`;
  }
  function tplBinet() {
    return `<div data-score="binet" class="stack">
      <div class="row"><label>Stadio Binet</label>
        <select id="tx-binetStage">
          <option value="">â€”</option>
          <option value="A">A â€” &lt; 3 aree, Hb â‰¥ 10, PLT â‰¥ 100</option>
          <option value="B">B â€” â‰¥ 3 aree, Hb â‰¥ 10, PLT â‰¥ 100</option>
          <option value="C">C â€” Hb &lt; 10 e/o PLT &lt; 100</option>
        </select></div></div>`;
  }
  function tplCLLIPI() {
    return `<div data-score="cll_ipi" class="stack">
      <div class="row"><label>EtÃ  &gt; 65 anni</label>
        <select id="tx-ipiAge"><option value="no">No</option><option value="yes">SÃ¬</option></select></div>
      <div class="row"><label>Î²2-microglobulina &gt; 3.5 mg/L</label>
        <select id="tx-ipiB2m"><option value="no">No</option><option value="yes">SÃ¬</option></select></div>
      <div class="row"><label>Stadio avanzato (Rai I-IV / Binet B-C)</label>
        <select id="tx-ipiStage"><option value="no">No</option><option value="yes">SÃ¬</option></select></div>
      <div class="row"><label>IGHV non mutato</label>
        <select id="tx-ipiIghv"><option value="no">No</option><option value="yes">SÃ¬</option></select></div>
      <div class="row"><label>Aberrazione TP53 (del17p/mut)</label>
        <select id="tx-ipiTp53"><option value="no">No</option><option value="yes">SÃ¬</option></select></div>
      <p class="muted">CLL-IPI: 0-1 basso; 2-3 intermedio; 4 alto; 5-10 molto alto.</p></div>`;
  }

  function openAddScores() {
    ensureSubDlgs();
    qs('#tx-addTitle').textContent = 'Score di rischio';
    const body = qs('#tx-addBody'); body.innerHTML = '';

    const row = el('div', { class: 'row' });
    row.innerHTML = `<label>Score</label>
      <select id="tx-scorePick"><option value="">â€”</option>
        ${Core.scores().map(s => `<option value="${s.key}">${s.label}</option>`).join('')}
      </select>
      <button class="btn" id="tx-scoreGo" title="Apri"><i class="hgi-stroke hgi-arrow-right-01"></i></button>`;
    const area = el('div', { id: 'tx-scoreArea', class: 'stack' });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' });
    save.innerHTML = `<button class="btn btn-primary" id="tx-scoreSave"><i class="hgi-stroke hgi-tick-02"></i></button>`;
    body.append(row, area, save);

    qs('#tx-scoreGo').onclick = () => {
      const v = qs('#tx-scorePick').value;
      area.innerHTML = v === 'rai' ? tplRai() : v === 'binet' ? tplBinet() : v === 'cll_ipi' ? tplCLLIPI() : '';
    };

    qs('#tx-scoreSave').onclick = () => {
      if (qs('#tx-scoreArea [data-score="rai"]')) {
        const st = qs('#tx-raiStage')?.value;
        if (st) txState.scores.rai = { stage: st };
      }
      if (qs('#tx-scoreArea [data-score="binet"]')) {
        const st = qs('#tx-binetStage')?.value;
        if (st) txState.scores.binet = { stage: st };
      }
      if (qs('#tx-scoreArea [data-score="cll_ipi"]')) {
        const data = {
          age:   qs('#tx-ipiAge').value === 'yes',
          b2m:   qs('#tx-ipiB2m').value === 'yes',
          stage: qs('#tx-ipiStage').value === 'yes',
          ighv:  qs('#tx-ipiIghv').value === 'yes',
          tp53:  qs('#tx-ipiTp53').value === 'yes'
        };
        txState.scores.cll_ipi = Core.computeCLLIPI(data);
      }
      renderSummary(); addDlg.close();
    };

    addDlg.showModal();
  }

  /* â”€â”€ Treatment history â”€â”€ */
  function openAddHistory() {
    ensureSubDlgs();
    qs('#tx-addTitle').textContent = 'Storia dei trattamenti';
    const body = qs('#tx-addBody'); body.innerHTML = '';
    const regs = Core.regimens();

    const row = el('div', { class: 'row' });
    row.innerHTML = `<label>Schema</label>
      <select id="tx-histReg"><option value="">â€”</option>
        ${Object.entries(regs).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}
      </select>
      <label>Linea</label>
      <select id="tx-histLine"><option>1L</option><option>RR</option></select>`;
    const row2 = el('div', { class: 'row' });
    row2.innerHTML = `<label>Risposta</label>
      <select id="tx-histResp">
        <option value="CR">CR</option><option value="PR">PR</option>
        <option value="SD">SD</option><option value="PD">PD</option>
        <option value="intolerance">Intolleranza</option>
      </select>
      <button class="btn" id="tx-histAdd" title="Aggiungi"><i class="hgi-stroke hgi-add-01"></i></button>`;
    const list = el('div', { id: 'tx-histList', class: 'stack', style: 'margin-top:8px;' });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' });
    save.innerHTML = `<button class="btn btn-primary" id="tx-histSave"><i class="hgi-stroke hgi-tick-02"></i></button>`;
    body.append(row, row2, list, save);

    function renderHist() {
      list.innerHTML = txState.history.length
        ? txState.history.map((x, i) => `<div class="row"><span class="tag">${regs[x.regimenKey]?.name || x.regimenKey} [${x.line}] â†’ ${x.response}</span>
            <button class="btn" data-tx-delhist="${i}" title="Rimuovi"><i class="hgi-stroke hgi-delete-02"></i></button></div>`).join('')
        : '<div class="muted">Nessuno schema aggiunto.</div>';
      list.querySelectorAll('[data-tx-delhist]').forEach(b => {
        b.onclick = () => { txState.history.splice(parseInt(b.dataset.txDelhist, 10), 1); renderHist(); };
      });
    }

    qs('#tx-histAdd').onclick = () => {
      const k = qs('#tx-histReg').value; if (!k) return;
      txState.history.push({ regimenKey: k, line: qs('#tx-histLine').value, response: qs('#tx-histResp').value });
      renderHist();
    };
    qs('#tx-histSave').onclick = () => { renderSummary(); addDlg.close(); };
    renderHist();
    addDlg.showModal();
  }

  /* â”€â”€ iwCLL Indications â”€â”€ */
  function openIndications() {
    ensureSubDlgs();
    qs('#tx-addTitle').textContent = 'Indicazioni al trattamento (iwCLL)';
    const body = qs('#tx-addBody'); body.innerHTML = '';

    const allFlags = Core.iwcllFlags().map(f => ({ key: f, label: f }));
    const used = new Set(txState.indications);

    const row = el('div', { class: 'row' });
    row.innerHTML = `<label>Indicazione</label>
      <select id="tx-iwPick"></select>
      <button class="btn" id="tx-iwAdd" title="Aggiungi"><i class="hgi-stroke hgi-add-01"></i></button>`;
    const list = el('div', { id: 'tx-iwList', class: 'stack', style: 'margin-top:8px;' });
    const save = el('div', { class: 'row', style: 'justify-content:flex-end;' });
    save.innerHTML = `<button class="btn btn-primary" id="tx-iwSave"><i class="hgi-stroke hgi-tick-02"></i></button>`;
    body.append(row, list, save);
    populateSelect(qs('#tx-iwPick'), allFlags, used, null);

    function renderIw() {
      list.innerHTML = txState.indications.size
        ? [...txState.indications].map(f => `<div class="row"><span class="tag">${f}</span>
            <button class="btn" data-tx-deliw="${encodeURIComponent(f)}" title="Rimuovi"><i class="hgi-stroke hgi-delete-02"></i></button></div>`).join('')
        : '<div class="muted">Nessuna indicazione selezionata.</div>';
      list.querySelectorAll('[data-tx-deliw]').forEach(b => {
        b.onclick = () => {
          txState.indications.delete(decodeURIComponent(b.dataset.txDeliw));
          populateSelect(qs('#tx-iwPick'), allFlags, new Set(txState.indications), null);
          renderIw(); renderSummary();
        };
      });
    }

    qs('#tx-iwAdd').onclick = () => {
      const k = qs('#tx-iwPick').value; if (!k) return;
      txState.indications.add(k);
      populateSelect(qs('#tx-iwPick'), allFlags, new Set(txState.indications), null);
      renderIw(); renderSummary();
    };
    qs('#tx-iwSave').onclick = () => addDlg.close();
    renderIw();
    addDlg.showModal();
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Compute & Results
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  function doCompute() {
    const stateForCore = {
      genetics:    txState.genetics,
      mutations:   txState.mutations,
      scores:      txState.scores,
      history:     txState.history,
      indications: [...txState.indications]
    };
    const result = Core.compute(stateForCore);

    if (result.watchAndWait) {
      qs('#tx-results').innerHTML = '<p class="muted">Nessuna indicazione iwCLL selezionata â†’ <strong>Watch &amp; Wait</strong>.</p>';
      _emit('lumia:therapy:computed', { type: 'cll', result });
      return;
    }

    renderResults(result.recommendations);
    _emit('lumia:therapy:computed', { type: 'cll', result });
  }

  function renderResults(list) {
    const box = qs('#tx-results');
    if (!box) return;
    if (!list || !list.length) {
      box.innerHTML = '<p class="muted">Nessuna proposta con i dati attuali.</p>';
      return;
    }
    const max = Math.max(...list.map(x => x.score));
    box.innerHTML = '<div class="results-list" id="tx-resList"></div>';
    const ul = qs('#tx-resList');
    list.forEach(item => {
      const pct = Math.max(1, Math.round((item.score / max) * 100));
      const row = el('div', { class: 'result-row' });
      row.innerHTML = `
        <div class="name"><button class="iconbtn" data-tx-openreg="${item.key}" title="Dettagli"><i class="hgi-stroke hgi-link-square-01"></i></button> ${item.name}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="score">${pct}%</div>
        <div class="meta"><span class="tag">${item.tags.join(' â€¢ ')}</span><span class="tag">${item.why.join(' | ')}</span></div>`;
      ul.appendChild(row);
    });
    ul.querySelectorAll('[data-tx-openreg]').forEach(b => {
      b.onclick = () => openRegimen(b.dataset.txOpenreg);
    });
  }

  /* â”€â”€ Regimen detail modal â”€â”€ */
  function openRegimen(key) {
    ensureSubDlgs();
    const regs = Core.regimens();
    const reg = regs[key]; if (!reg) return;
    const det = Core.regimenDetail(key) || {};
    qs('#tx-regTitle').textContent = reg.name;
    qs('#tx-regBody').innerHTML = `
      <div class="stack">
        <div><strong>Tipo: </strong>${reg.type}</div>
        <div><strong>Posologia: </strong>${reg.dosing || 'â€”'}</div>
        <div><strong>Durata: </strong>${/venetoclax/.test(key) ? 'Time-limited' : (/FCR|chlorambucil/.test(key) ? '6 cicli' : 'Continuo')}</div>
        <div><strong>TossicitÃ  chiave: </strong>${det.tox || 'â€”'}</div>
        <div><strong>Studi/Note: </strong>${det.studies || 'â€”'}</div>
        <div class="muted">Fonte: ${det.src || 'â€”'}; verificare sempre RCP locale.</div>
      </div>`;
    regDlg.showModal();
  }

  function _emit(type, detail) {
    if (global.LumiaEvents && typeof global.LumiaEvents.emit === 'function') {
      global.LumiaEvents.emit(type, detail);
    }
    try { global.dispatchEvent(new CustomEvent(type, { detail })); } catch (_) {}
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Event delegation
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  let bound = false;
  function bindEvents() {
    if (bound) return;
    bound = true;
    document.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'tx-addClose')  { if (addDlg) addDlg.close(); }
      if (b.id === 'tx-regClose')  { if (regDlg) regDlg.close(); }
      if (b.id === 'tx-addGen')    openAddGen();
      if (b.id === 'tx-addMut')    openAddMut();
      if (b.id === 'tx-addScore')  openAddScores();
      if (b.id === 'tx-addHist')   openAddHistory();
      if (b.id === 'tx-addInd')    openIndications();
      if (b.id === 'tx-compute')   doCompute();
      if (b.id === 'tx-reset') {
        if (confirm('Azzerare i dati terapeutici?')) {
          txState.genetics = []; txState.mutations = []; txState.history = [];
          txState.scores = {}; txState.indications.clear();
          renderSummary();
          var box = qs('#tx-results');
          if (box) box.innerHTML = '<p class="muted">Reset completato.</p>';
        }
      }
    });
  }

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   *  Public API (backward-compatible)
   * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  global.CLLTherapyHelper = {
    mount: mount,
    init() { bindEvents(); },
    open() {
      bindEvents();
      var bMount = qs('#bMount');
      if (bMount) {
        mount(bMount);
        var bTitle = qs('#bTitle');
        if (bTitle) bTitle.innerHTML = '<i class="hgi-stroke hgi-stethoscope"></i> <span>CLL â€” Assistente terapeutico</span>';
        var modB = document.getElementById('modB');
        if (modB) modB.classList.add('fullpage');
        if (typeof global.showLayer === 'function') global.showLayer('B');
      }
    },
    close() { if (typeof global.hideLayer === 'function') global.hideLayer('B'); },
    getState() {
      return JSON.parse(JSON.stringify({
        genetics: txState.genetics,
        mutations: txState.mutations,
        scores: txState.scores,
        history: txState.history,
        indications: [...txState.indications]
      }));
    },
    setState(s) {
      if (!s) return;
      txState.genetics    = s.genetics || [];
      txState.mutations   = s.mutations || [];
      txState.scores      = s.scores || {};
      txState.history     = s.history || [];
      txState.indications = new Set(s.indications || []);
      renderSummary();
    }
  };

  /* â”€â”€ Register in helpers registry â”€â”€ */
  document.addEventListener('DOMContentLoaded', function () {
    bindEvents();
    var reg = global.LumiaHelpersRegistry;
    if (reg && typeof reg.register === 'function') {
      reg.register({
        id: 'cll',
        title: 'CLL Â· Assistente terapeutico',
        version: 'v2',
        tags: ['CLL', 'terapia'],
        mount: mount
      });
    }
  });

})(window);
