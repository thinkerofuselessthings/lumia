/* =======================================================================
 *  HematoExport — Report export system (text + print)
 *  Espone: window.HematoExport
 *  Dipendenze: hemato-events.js, hemato-toast.js
 *  Pattern: IIFE su window
 *
 *  API:
 *    HematoExport.text(payload)       → string report
 *    HematoExport.clipboard(payload)  → copies to clipboard + toast
 *    HematoExport.print()             → window.print() (CSS handles it)
 *    HematoExport.fromDiagnostic(result, selections) → report payload
 *    HematoExport.fromTherapy(state, recommendations) → report payload
 * ======================================================================= */
(function (global) {
  'use strict';

  var LINE = '─'.repeat(56);
  var THIN = '- '.repeat(28);
  var NL   = '\n';

  /* ─── Date formatter ─── */
  function dateStamp() {
    var d = new Date();
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  /* ─── Clean HTML ─── */
  function strip(s) {
    if (!s) return '';
    return String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").trim();
  }

  /* ═══════════════════════════════════════
   *  fromDiagnostic(result, selections)
   *  Build report payload from CD B-LPD results.
   *  result:      { entries: [{diagnosis, score, pct, matches[], conflicts[]}] }
   *  selections:  [{marker, state, note?}]
   * ═══════════════════════════════════════ */
  function fromDiagnostic(result, selections) {
    return {
      type: 'diagnostic',
      title: 'CD-Based B-LPD Diagnostic Report',
      date: dateStamp(),
      sections: [
        {
          heading: 'Marker inseriti',
          items: (selections || []).map(function (s) {
            return s.marker + ' → ' + s.state + (s.note ? ' (' + s.note + ')' : '');
          })
        },
        {
          heading: 'Diagnosi probabili',
          items: (result && result.entries || []).map(function (e) {
            return e.diagnosis + ' — ' + e.pct + '% (score ' + e.score + ')' +
              (e.matches.length ? NL + '  ✔ ' + e.matches.join(', ') : '') +
              (e.conflicts.length ? NL + '  ⚠ ' + e.conflicts.join(', ') : '');
          })
        }
      ]
    };
  }

  /* ═══════════════════════════════════════
   *  fromTherapy(state, recommendations, title)
   *  Build report payload from any therapy helper.
   *  state:  { genetics:[], mutations:[], scores:{}, history:[], ... }
   *  recommendations: [{ name, details, confidence?, line? }] or HTML string
   * ═══════════════════════════════════════ */
  function fromTherapy(state, recommendations, title) {
    var sections = [];

    // Patient data section
    var patientItems = [];
    if (state.genetics && state.genetics.length) {
      patientItems.push('Genetica: ' + state.genetics.map(function (g) {
        return g.key + '=' + g.value;
      }).join(', '));
    }
    if (state.mutations && state.mutations.length) {
      patientItems.push('Mutazioni: ' + state.mutations.map(function (m) {
        return m.key + '=' + m.value;
      }).join(', '));
    }
    if (state.scores && Object.keys(state.scores).length) {
      var s = state.scores;
      var parts = [];
      if (s.rai)     parts.push('Rai ' + s.rai.stage);
      if (s.binet)   parts.push('Binet ' + s.binet.stage);
      if (s.cll_ipi) parts.push('CLL-IPI ' + s.cll_ipi.risk + ' (' + s.cll_ipi.score + ')');
      if (s.iss)     parts.push('ISS ' + (s.iss.stage || s.iss));
      if (s.riss)    parts.push('R-ISS ' + (s.riss.stage || s.riss));
      if (s.ipss)    parts.push('IPSS-R ' + (s.ipss.risk || s.ipss));
      if (parts.length) patientItems.push('Score: ' + parts.join(' · '));
    }
    if (state.history && state.history.length) {
      patientItems.push('Linee precedenti: ' + state.history.length);
    }
    if (patientItems.length) {
      sections.push({ heading: 'Dati paziente', items: patientItems });
    }

    // Recommendations
    if (typeof recommendations === 'string') {
      sections.push({ heading: 'Raccomandazioni', items: [strip(recommendations)] });
    } else if (Array.isArray(recommendations)) {
      sections.push({
        heading: 'Raccomandazioni',
        items: recommendations.map(function (r) {
          if (typeof r === 'string') return strip(r);
          var line = r.name || r.label || '';
          if (r.line) line = '[' + r.line + '] ' + line;
          if (r.details) line += ' — ' + strip(r.details);
          if (r.confidence) line += ' (confidence: ' + r.confidence + ')';
          return line;
        })
      });
    }

    return {
      type: 'therapy',
      title: title || 'Therapy Report',
      date: dateStamp(),
      sections: sections
    };
  }

  /* ═══════════════════════════════════════
   *  text(payload) → formatted string
   * ═══════════════════════════════════════ */
  function text(payload) {
    if (!payload) return '';
    var out = [];
    out.push(LINE);
    out.push('  ' + (payload.title || 'Report'));
    out.push('  Data: ' + (payload.date || dateStamp()));
    out.push(LINE);

    (payload.sections || []).forEach(function (sec) {
      out.push('');
      out.push('▸ ' + (sec.heading || ''));
      out.push(THIN);
      (sec.items || []).forEach(function (item, i) {
        out.push('  ' + (i + 1) + '. ' + item);
      });
    });

    out.push('');
    out.push(LINE);
    out.push('  Generato da hemato.app');
    out.push(LINE);

    return out.join(NL);
  }

  /* ═══════════════════════════════════════
   *  clipboard(payload) → async copy
   * ═══════════════════════════════════════ */
  function clipboard(payload) {
    var str = text(payload);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(str).then(function () {
        if (global.HematoToast) global.HematoToast.success('Report copiato negli appunti');
      }).catch(function () {
        fallbackCopy(str);
      });
    } else {
      fallbackCopy(str);
    }
  }

  function fallbackCopy(str) {
    var ta = document.createElement('textarea');
    ta.value = str;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      if (global.HematoToast) global.HematoToast.success('Report copiato negli appunti');
    } catch (_) {
      if (global.HematoToast) global.HematoToast.error('Copia fallita — seleziona manualmente');
    }
    ta.remove();
  }

  /* ═══════════════════════════════════════
   *  print() — triggers window.print()
   *  CSS @media print in hemato-helpers.css handles the rest
   * ═══════════════════════════════════════ */
  function printReport() {
    global.print();
  }

  /* ── Wire into events ── */
  if (global.HematoEvents) {
    global.HematoEvents.on('export:clipboard', function (p) { clipboard(p); });
    global.HematoEvents.on('export:print', function () { printReport(); });
  }

  /* ── Public API ── */
  global.HematoExport = Object.freeze({
    text:           text,
    clipboard:      clipboard,
    print:          printReport,
    fromDiagnostic: fromDiagnostic,
    fromTherapy:    fromTherapy
  });

})(window);
