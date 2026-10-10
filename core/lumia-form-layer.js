/**
 * lumia-form-layer.js â€” Generic form content provider + helpers
 *
 * Registers "generic-form" content provider for the LayerSystem.
 * Provides buildForm() / collectForm() / openFormLayer() utilities.
 *
 * Usage:
 *   openFormLayer(parentNodeId, 'Nuovo utente', fields, data, onSave);
 */

(function() {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m;
    });
  }

  /**
   * Build form HTML from field definitions.
   *
   * @param {Array} fields - [{ key, label, type?, options?, required?, readonly?, placeholder? }]
   * @param {Object} data  - Current values keyed by field.key
   * @returns {string} HTML string
   */
  function buildForm(fields, data) {
    data = data || {};
    var html = '<div class="form-layer-grid">';
    fields.forEach(function(f) {
      if (f.type === 'hidden') return;
      var val = data[f.key] != null ? data[f.key] : (f.defaultValue != null ? f.defaultValue : '');
      var req = f.required ? ' *' : '';
      var ro = f.readonly ? ' readonly' : '';

      html += '<div class="form-layer-field">';
      html += '<label class="form-layer-label">' + esc(f.label) + req + '</label>';

      if (f.type === 'select' && f.options) {
        html += '<select name="' + esc(f.key) + '" class="form-layer-input"' + (f.readonly ? ' disabled' : '') + '>';
        f.options.forEach(function(o) {
          var optVal = Array.isArray(o) ? o[0] : o;
          var optLabel = Array.isArray(o) ? o[1] : o;
          html += '<option value="' + esc(String(optVal)) + '"' +
            (String(optVal) === String(val) ? ' selected' : '') + '>' +
            esc(optLabel) + '</option>';
        });
        html += '</select>';
      } else if (f.type === 'textarea') {
        html += '<textarea name="' + esc(f.key) + '" class="form-layer-input form-layer-textarea"' +
          ro + ' placeholder="' + esc(f.placeholder || '') + '">' + esc(val) + '</textarea>';
      } else {
        html += '<input name="' + esc(f.key) + '" type="' + esc(f.type || 'text') + '"' +
          ' value="' + esc(val) + '"' +
          ' class="form-layer-input"' +
          ro +
          (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') +
          '>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  /**
   * Collect form values from a container.
   *
   * @param {Array} fields       - Same field definitions
   * @param {HTMLElement} container
   * @returns {Object} keyâ†’value
   */
  function collectForm(fields, container) {
    var data = {};
    fields.forEach(function(f) {
      var el = container.querySelector('[name="' + f.key + '"]');
      if (!el) return;
      var v = el.value;
      if (f.type === 'number') v = v === '' ? null : Number(v);
      data[f.key] = v;
    });
    return data;
  }

  /* â”€â”€ Register "generic-form" content provider â”€â”€ */
  window.LayerSystem.registerContent('generic-form', {
    label: 'Form',
    render: function(container, context) {
      var cd = context.contentData || {};
      var bodyHtml = cd.bodyHtml || '';
      var onSave = cd.onSave;
      var saveLabel = cd.saveLabel || 'Salva';
      var cancelLabel = cd.cancelLabel || 'Annulla';

      container.innerHTML =
        '<div class="form-layer-body">' + bodyHtml + '</div>' +
        '<div class="form-layer-footer">' +
          '<button type="button" class="form-layer-btn form-layer-btn--cancel">' + esc(cancelLabel) + '</button>' +
          '<button type="button" class="form-layer-btn form-layer-btn--save">' + esc(saveLabel) + '</button>' +
        '</div>';

      /* Error area */
      var errEl = document.createElement('p');
      errEl.className = 'form-layer-error';
      errEl.style.display = 'none';
      container.querySelector('.form-layer-footer').insertAdjacentElement('beforebegin', errEl);

      /* Cancel â†’ close modal */
      container.querySelector('.form-layer-btn--cancel').addEventListener('click', function() {
        if (context.manager) context.manager.closeNode(context.nodeId);
      });

      /* Save */
      container.querySelector('.form-layer-btn--save').addEventListener('click', function() {
        errEl.style.display = 'none';
        if (typeof onSave === 'function') {
          onSave(container, context.nodeId, function showErr(msg) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
          });
        }
      });
    },
    destroy: function() {}
  });

  /**
   * Open a modal form layer.
   *
   * @param {string|null} parentId - Parent node ID (typically the admin fullscreen node)
   * @param {string} title         - Modal title
   * @param {string} bodyHtml      - Form HTML (from buildForm or custom)
   * @param {Function} onSave      - fn(container, nodeId, showError)
   * @param {Object} [opts]        - { wide: bool, saveLabel, cancelLabel }
   * @returns {string|null} nodeId
   */
  function openFormLayer(parentId, title, bodyHtml, onSave, opts) {
    opts = opts || {};
    if (!state || !state.layerManager) return null;
    return state.layerManager.openNode(parentId, {
      kind: 'modal',
      title: title,
      contentKey: 'generic-form',
      contentData: {
        bodyHtml: bodyHtml,
        onSave: onSave,
        saveLabel: opts.saveLabel,
        cancelLabel: opts.cancelLabel
      }
    });
  }

  /* â”€â”€ Expose â”€â”€ */
  window.LumiaFormLayer = {
    buildForm: buildForm,
    collectForm: collectForm,
    openFormLayer: openFormLayer
  };

})();
