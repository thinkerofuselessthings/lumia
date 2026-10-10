/**
 * shell-change-password.js — UI per cambio password
 *
 * Espone:
 *   window.LumiaChangePassword.open(opts)         → apre il form modale
 *   window.LumiaChangePassword.attachRequiredFlow() → installa il banner globale
 *                                                    quando la sessione ha
 *                                                    must_change_password=true
 *
 * Backend: POST /api/auth/change-password { old_password, new_password }
 * Richiede: cookie session + header X-CSRF-Token (esposto come `csrfToken` globale).
 */
(function () {
  'use strict';

  var BANNER_ID = 'lumia-change-pwd-banner';
  var bannerInstalled = false;

  /* ── Build form fields ───────────────────────────────────── */
  function buildFields(opts) {
    return [
      { key: 'old_password', label: 'Password attuale',           type: 'password', required: true },
      { key: 'new_password', label: 'Nuova password (min 8)',     type: 'password', required: true },
      { key: 'confirm',      label: 'Conferma nuova password',    type: 'password', required: true }
    ];
  }

  /* ── Validation ──────────────────────────────────────────── */
  function validate(data) {
    if (!data.old_password) return 'Inserisci la password attuale.';
    if (!data.new_password || data.new_password.length < 8) return 'La nuova password deve avere almeno 8 caratteri.';
    if (data.new_password !== data.confirm) return 'Le due nuove password non coincidono.';
    if (data.new_password === data.old_password) return 'La nuova password non può coincidere con quella attuale.';
    return null;
  }

  /* ── Open modal ──────────────────────────────────────────── */
  function open(opts) {
    opts = opts || {};
    if (!window.LumiaFormLayer) {
      alert('Form layer non disponibile, ricarica la pagina.');
      return null;
    }
    var fields = buildFields(opts);
    var html = window.LumiaFormLayer.buildForm(fields, {});
    var title = opts.required ? 'Cambio password obbligatorio' : 'Cambio password';

    return window.LumiaFormLayer.openFormLayer(
      opts.parentId || null,
      title,
      html,
      function (formContainer, nodeId, showErr) {
        var data = window.LumiaFormLayer.collectForm(fields, formContainer);
        var err = validate(data);
        if (err) { showErr(err); return; }

        fetch('/api/auth/change-password', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': (typeof csrfToken !== 'undefined' && csrfToken) || ''
          },
          body: JSON.stringify({
            old_password: data.old_password,
            new_password: data.new_password
          })
        })
          .then(function (r) { return r.json().then(function (j) { return { status: r.status, json: j }; }); })
          .then(function (res) {
            if (!res.json.ok) {
              showErr((res.json.error && res.json.error.message) || 'Cambio password fallito.');
              return;
            }
            try { state.layerManager.closeNode(nodeId); } catch (_) {}
            removeRequiredBanner();
            if (window.LumiaToast) {
              window.LumiaToast.success('Password aggiornata. Le altre sessioni sono state invalidate.');
            }
            // Refresh sessione: il flag must_change_password ora è false.
            fetch('/api/auth/check', { credentials: 'same-origin' })
              .then(function (r) { return r.ok ? r.json() : null; })
              .then(function (d) {
                if (d && d.csrf_token) csrfToken = d.csrf_token;
                if (typeof opts.onSuccess === 'function') opts.onSuccess(d);
              });
          })
          .catch(function () { showErr('Errore di rete.'); });
      },
      { saveLabel: opts.required ? 'Cambia password ora' : 'Salva' }
    );
  }

  /* ── Banner forzato (must_change_password) ──────────────── */
  function ensureBannerStyles() {
    if (document.getElementById('lumia-change-pwd-style')) return;
    var s = document.createElement('style');
    s.id = 'lumia-change-pwd-style';
    s.textContent =
      '#' + BANNER_ID + '{position:fixed;top:0;left:0;right:0;z-index:9999;' +
        'background:linear-gradient(90deg,#c0392b,#e67e22);color:#fff;' +
        'padding:10px 16px;display:flex;align-items:center;justify-content:space-between;' +
        'gap:16px;font-size:13px;font-family:inherit;box-shadow:0 2px 6px rgba(0,0,0,.25);}' +
      '#' + BANNER_ID + ' .lcp-msg{display:flex;align-items:center;gap:10px;}' +
      '#' + BANNER_ID + ' .lcp-btn{background:#fff;color:#c0392b;border:0;border-radius:4px;' +
        'padding:6px 14px;font-weight:600;cursor:pointer;font-size:13px;}' +
      '#' + BANNER_ID + ' .lcp-btn:hover{background:#fdf3f1;}';
    document.head.appendChild(s);
  }

  function showRequiredBanner() {
    if (document.getElementById(BANNER_ID)) return;
    ensureBannerStyles();
    var bar = document.createElement('div');
    bar.id = BANNER_ID;
    bar.innerHTML =
      '<span class="lcp-msg">' +
        '<i class="hgi-stroke hgi-alert-02" style="font-size:18px;"></i>' +
        '<span><strong>Cambio password richiesto.</strong> ' +
          'Per motivi di sicurezza devi impostare una nuova password prima di proseguire.</span>' +
      '</span>' +
      '<button type="button" class="lcp-btn">Cambia password</button>';
    document.body.appendChild(bar);
    bar.querySelector('button').addEventListener('click', function () {
      open({ required: true });
    });
    // Apertura automatica del modale al primo arrivo.
    setTimeout(function () { open({ required: true }); }, 200);
  }

  function removeRequiredBanner() {
    var b = document.getElementById(BANNER_ID);
    if (b) b.parentNode.removeChild(b);
  }

  /**
   * Installa il watcher: dopo ogni heartbeat verifica `must_change_password`
   * e mostra il banner forzato. Si attiva al primo `/api/auth/check`.
   */
  function attachRequiredFlow() {
    if (bannerInstalled) return;
    bannerInstalled = true;

    function checkOnce() {
      fetch('/api/auth/check', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d) return;
          if (d.must_change_password) showRequiredBanner();
          else removeRequiredBanner();
        })
        .catch(function () {});
    }
    // primo check al boot e ad ogni heartbeat
    checkOnce();
    window.addEventListener('session-heartbeat-ok', checkOnce);
  }

  window.LumiaChangePassword = {
    open: open,
    attachRequiredFlow: attachRequiredFlow,
    _hideBanner: removeRequiredBanner
  };
})();
