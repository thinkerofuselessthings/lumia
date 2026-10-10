/* =======================================================================
 *  HematoStepper — Reusable multi-step wizard component
 *  Espone: window.HematoStepper
 *  Dipendenze: hemato-helpers.css (section 22), hemato-events.js
 *  Pattern: IIFE su window
 *
 *  Uso:
 *    const wizard = HematoStepper.create({
 *      mount: containerEl,
 *      steps: [
 *        { title: 'Genetica',  render(body){...}, validate(){return true;} },
 *        { title: 'Score',     render(body){...} },
 *        { title: 'Risultati', render(body){...} }
 *      ],
 *      onFinish(data) { ... },     // called when last step confirmed
 *      onCancel()     { ... },     // called on cancel
 *      linear: true                // disallow jumping ahead (default true)
 *    });
 *    wizard.next();  wizard.prev();  wizard.goTo(1);  wizard.destroy();
 * ======================================================================= */
(function (global) {
  'use strict';

  var COUNTER = 0;

  /* ─── Helpers ─── */
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c;
    });
  }

  /* ═══════════════════════════════════════
   *  create(opts)  →  wizard instance
   * ═══════════════════════════════════════ */
  function create(opts) {
    if (!opts || !opts.mount || !Array.isArray(opts.steps) || opts.steps.length === 0) {
      console.warn('[HematoStepper] mount + steps[] required');
      return null;
    }

    var id       = 'he-stepper-' + (++COUNTER);
    var mount    = opts.mount;
    var steps    = opts.steps;
    var linear   = opts.linear !== false;
    var onFinish = opts.onFinish || function () {};
    var onCancel = opts.onCancel || function () {};
    var current  = 0;
    var highest  = 0;    // furthest step reached (for linear gating)
    var data     = {};   // shared data bag across steps

    /* ── Build DOM ── */
    mount.innerHTML = '';
    var root = el('div', 'he-stepper');
    root.id = id;

    // Progress bar
    var bar = el('div', 'he-stepper-bar');
    bar.setAttribute('role', 'tablist');
    steps.forEach(function (s, i) {
      var dot = el('button', 'he-stepper-dot', '<span class="he-stepper-num">' + (i + 1) + '</span>');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', s.title || 'Step ' + (i + 1));
      dot.dataset.step = i;

      var label = el('span', 'he-stepper-label', esc(s.title || 'Step ' + (i + 1)));
      dot.appendChild(label);

      if (i < steps.length - 1) {
        var line = el('span', 'he-stepper-line');
        bar.appendChild(dot);
        bar.appendChild(line);
      } else {
        bar.appendChild(dot);
      }
    });
    root.appendChild(bar);

    // Body (step content)
    var body = el('div', 'he-stepper-body');
    body.setAttribute('role', 'tabpanel');
    root.appendChild(body);

    // Footer (navigation)
    var footer = el('div', 'he-stepper-footer');
    var btnCancel = el('button', 'btn', '<span>Annulla</span>');
    btnCancel.type = 'button';
    var btnPrev = el('button', 'btn', '<i class="hgi-stroke hgi-arrow-left-01"></i><span>Indietro</span>');
    btnPrev.type = 'button';
    var btnNext = el('button', 'btn btn-primary', '<span>Avanti</span><i class="hgi-stroke hgi-arrow-right-01"></i>');
    btnNext.type = 'button';
    footer.appendChild(btnCancel);
    var spacer = el('div', 'he-stepper-spacer');
    footer.appendChild(spacer);
    footer.appendChild(btnPrev);
    footer.appendChild(btnNext);
    root.appendChild(footer);

    mount.appendChild(root);

    /* ── Render helpers ── */
    function updateBar() {
      var dots = bar.querySelectorAll('.he-stepper-dot');
      var lines = bar.querySelectorAll('.he-stepper-line');
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('active', i === current);
        dots[i].classList.toggle('done', i < current);
        dots[i].setAttribute('aria-selected', i === current ? 'true' : 'false');
        dots[i].disabled = linear && i > highest;
      }
      for (var j = 0; j < lines.length; j++) {
        lines[j].classList.toggle('done', j < current);
      }
    }

    function updateFooter() {
      btnPrev.style.display = current > 0 ? '' : 'none';
      var isLast = current === steps.length - 1;
      btnNext.innerHTML = isLast
        ? '<i class="hgi-stroke hgi-check"></i><span>Completa</span>'
        : '<span>Avanti</span><i class="hgi-stroke hgi-arrow-right-01"></i>';
    }

    function renderStep() {
      body.innerHTML = '';
      updateBar();
      updateFooter();
      var step = steps[current];
      if (typeof step.render === 'function') {
        step.render(body, data, current);
      }
      if (global.HematoEvents) {
        global.HematoEvents.emit('stepper:step', { id: id, step: current, title: step.title });
      }
    }

    /* ── Navigation ── */
    function canAdvance() {
      var step = steps[current];
      if (typeof step.validate === 'function') {
        return step.validate(data, current);
      }
      return true;
    }

    function goTo(idx) {
      if (idx < 0 || idx >= steps.length) return;
      if (linear && idx > highest + 1) return;
      if (idx > current && !canAdvance()) {
        if (global.HematoToast) global.HematoToast.warning('Completa questo step prima di proseguire.');
        return;
      }
      current = idx;
      if (current > highest) highest = current;
      renderStep();
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    /* ── Events ── */
    btnNext.addEventListener('click', function () {
      if (current === steps.length - 1) {
        if (canAdvance()) onFinish(data);
      } else {
        next();
      }
    });
    btnPrev.addEventListener('click', function () { prev(); });
    btnCancel.addEventListener('click', function () { onCancel(); });

    // Click on dot (non-linear or revisit done steps)
    bar.addEventListener('click', function (e) {
      var dot = e.target.closest('.he-stepper-dot');
      if (dot && dot.dataset.step != null) {
        var idx = parseInt(dot.dataset.step, 10);
        if (!linear || idx <= highest) goTo(idx);
      }
    });

    /* ── Keyboard support ── */
    bar.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        var nextDot = bar.querySelector('.he-stepper-dot[data-step="' + (current + 1) + '"]');
        if (nextDot && !nextDot.disabled) { nextDot.focus(); goTo(current + 1); }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (current > 0) {
          bar.querySelector('.he-stepper-dot[data-step="' + (current - 1) + '"]').focus();
          goTo(current - 1);
        }
      }
    });

    /* Initial render */
    renderStep();

    /* ── Instance API ── */
    return {
      next:    next,
      prev:    prev,
      goTo:    goTo,
      current: function () { return current; },
      data:    data,
      destroy: function () { mount.innerHTML = ''; }
    };
  }

  /* ── Public API ── */
  global.HematoStepper = Object.freeze({ create: create });

})(window);
