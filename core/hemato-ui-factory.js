/*! hemato-ui-factory.js — Shared UI factory for registry-based helpers
 *  Espone: window.HematoUIFactory
 *  Dipendenze: hemato-registry.js (per compatibilità), CSS hemato-helpers.css
 *  Pattern: IIFE su window
 *
 *  Elimina la duplicazione di buildUI() presente in 5+ skeleton helpers.
 *  Ogni helper registrato via HematoHelpersRegistry con .sections / .table / .html
 *  può usare:  helper.mount = (mount) => HematoUIFactory.render(mount, helper);
 */
(function attachHematoUIFactory(global) {
  'use strict';

  /* ── Helpers DOM ── */
  function el(tag, attrs, html) {
    const n = document.createElement(tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ── Icon map per sezioni standard ── */
  const SEC_ICONS = {
    dx:        'hgi-stethoscope',
    stage:     'hgi-chart-01',
    risk:      'hgi-alert-01',
    firstline: 'hgi-pill',
    rr:        'hgi-repeat',
    tox:       'hgi-shield-01',
    therapy:   'hgi-medicine-01',
    calc:      'hgi-calculator',
    criteria:  'hgi-list-view',
    rules:     'hgi-sliders-horizontal'
  };

  function iconClass(sectionId) {
    return SEC_ICONS[sectionId] || 'hgi-circle';
  }

  /* ══════════════════════════════════════════════
   *  render(mount, helper)
   *  Genera il layout standard: aside icone + main con card sezioni
   * ══════════════════════════════════════════════ */
  function render(mount, helper) {
    if (!mount || !helper) return;
    mount.innerHTML = '';

    const root = el('div', { class: 'he-root' });

    /* ── Aside (icon sidebar) ── */
    const aside = el('aside', { class: 'he-aside' });
    const nav = el('ul', { class: 'he-aside-nav' });
    aside.appendChild(nav);

    /* ── Main ── */
    const main = el('main', { class: 'he-main' });

    // Header
    const hTitle = el('h1', { class: 'he-title' },
      helper.title + (helper.version ? ' · ' + helper.version : ''));
    main.appendChild(hTitle);

    if (helper.subtitle || helper.description) {
      main.appendChild(el('div', { class: 'he-subtitle' }, helper.subtitle || helper.description));
    }

    // Tags
    if (Array.isArray(helper.tags) && helper.tags.length) {
      const meta = el('div', { class: 'he-tags' });
      helper.tags.forEach(t => meta.appendChild(el('span', { class: 'he-tag' }, t)));
      main.appendChild(meta);
    }

    // Sections container
    const content = el('div', { class: 'he-sections' });

    (helper.sections || []).forEach(s => {
      /* Nav button */
      const li = el('li');
      const btn = el('button', {
        type: 'button',
        class: 'he-aside-btn',
        title: s.title,
        'aria-label': s.title
      }, `<i class="hgi-stroke ${iconClass(s.id)}"></i>`);
      btn.addEventListener('click', () => {
        const target = mount.querySelector('#he-sec-' + s.id);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      li.appendChild(btn);
      nav.appendChild(li);

      /* Section card */
      const sec = el('section', { id: 'he-sec-' + s.id, class: 'he-card' });
      sec.appendChild(el('h2', { class: 'he-card-title' }, s.title));

      // HTML content
      if (typeof s.html === 'string') {
        sec.appendChild(el('div', { class: 'he-card-body' }, s.html));
      }

      // Sub-blocks
      if (Array.isArray(s.blocks)) {
        s.blocks.forEach(b => {
          sec.appendChild(el('h3', { class: 'he-card-h3' }, b.title));
          sec.appendChild(el('div', { class: 'he-card-body' }, b.html || ''));
        });
      }

      // Table
      if (s.table) {
        const tbl = el('table', { class: 'he-table' });
        const thead = el('thead');
        const trh = el('tr');
        s.table.columns.forEach(c => trh.appendChild(el('th', null, c)));
        thead.appendChild(trh);
        tbl.appendChild(thead);
        const tbody = el('tbody');
        s.table.rows.forEach(row => {
          const tr = el('tr');
          row.forEach(cell => tr.appendChild(el('td', null, String(cell))));
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        sec.appendChild(tbl);
      }

      content.appendChild(sec);
    });

    main.appendChild(content);

    // References
    if (Array.isArray(helper.references) && helper.references.length) {
      const refs = el('section', { class: 'he-refs' });
      refs.appendChild(el('h3', { class: 'he-refs-title' }, 'Riferimenti'));
      const ol = el('ol', { class: 'he-refs-list' });
      helper.references.forEach(ref => ol.appendChild(el('li', null, ref)));
      refs.appendChild(ol);
      main.appendChild(refs);
    }

    root.appendChild(aside);
    root.appendChild(main);
    mount.appendChild(root);
  }

  /* ══════════════════════════════════════════════
   *  autoMount(helper)
   *  Assegna helper.mount = fn che invoca render().
   *  Utile come shortcut durante la registrazione.
   * ══════════════════════════════════════════════ */
  function autoMount(helper) {
    if (!helper) return helper;
    helper.mount = function (mountEl) {
      render(mountEl, helper);
      // Se il helper ha un post-mount hook (es. calcolatrice FIL), invocalo
      if (typeof helper.afterMount === 'function') {
        helper.afterMount(mountEl);
      }
    };
    return helper;
  }

  /* ── Esporta ── */
  global.HematoUIFactory = Object.freeze({ render, autoMount });

})(window);
