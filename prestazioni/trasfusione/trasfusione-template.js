/**
 * trasfusione-template.js — HTML template for the transfusion request form
 * Returns the form body to be injected into the shared prest-container.
 */
(function(global) {
  'use strict';

  function getHTML() {
    return '<div class="prest-print-area" id="trasfPrintArea">' +
      /* ── Intestazione ── */
      '<div class="prest-title-block">' +
        '<div class="prest-title">RICHIESTA DI EMOCOMPONENTI</div>' +
        '<div class="prest-subtitle">ai sensi del DM 2 novembre 2015</div>' +
      '</div>' +
      /* ── Struttura Richiedente ── */
      '<fieldset class="prest-fieldset">' +
        '<legend>Struttura Richiedente</legend>' +
        '<div class="prest-row cols-2">' +
          '<div class="prest-field"><label>Reparto / U.O.</label><input id="trReparto" /></div>' +
          '<div class="prest-field"><label>N. Nosologico</label><input id="trNosologico" /></div>' +
        '</div>' +
      '</fieldset>' +
      /* ── Dati Paziente ── */
      '<fieldset class="prest-fieldset">' +
        '<legend>Dati Paziente</legend>' +
        '<div class="prest-row cols-2">' +
          '<div class="prest-field"><label>Cognome e Nome</label><input id="trPaziente" /></div>' +
          '<div class="prest-field"><label>Data di nascita</label><input id="trNascita" type="date" /></div>' +
        '</div>' +
        '<div class="prest-row cols-3">' +
          '<div class="prest-field"><label>Sesso</label><select id="trSesso"><option value="">\u2014</option><option value="M">M</option><option value="F">F</option></select></div>' +
          '<div class="prest-field"><label>Codice Fiscale</label><input id="trCF" /></div>' +
          '<div class="prest-field"><label>Peso corporeo (kg)</label><input id="trPeso" type="number" step="0.1" /></div>' +
        '</div>' +
        '<div class="prest-row cols-2">' +
          '<div class="prest-field"><label>Gruppo sanguigno</label><select id="trGruppo"><option value="">Non noto</option><option>0</option><option>A</option><option>B</option><option>AB</option></select></div>' +
          '<div class="prest-field"><label>Rh</label><select id="trRh"><option value="">Non noto</option><option>Positivo</option><option>Negativo</option></select></div>' +
        '</div>' +
      '</fieldset>' +
      /* ── Dati Clinici ── */
      '<fieldset class="prest-fieldset">' +
        '<legend>Dati Clinici</legend>' +
        '<div class="prest-row cols-2">' +
          '<div class="prest-field"><label>Diagnosi</label><input id="trDiagnosi" /></div>' +
          '<div class="prest-field"><label>Indicazione alla trasfusione</label><input id="trIndicazione" /></div>' +
        '</div>' +
        '<div class="prest-row cols-3">' +
          '<div class="prest-field"><label>Hb (g/dL)</label><input id="trHb" type="number" step="0.1" /></div>' +
          '<div class="prest-field"><label>Hct (%)</label><input id="trHct" type="number" step="0.1" /></div>' +
          '<div class="prest-field"><label>PLT (x10\u00B3/\u00B5L)</label><input id="trPlt" type="number" /></div>' +
        '</div>' +
        '<div class="prest-row cols-3">' +
          '<div class="prest-field"><label>PT / INR</label><input id="trInr" type="number" step="0.01" /></div>' +
          '<div class="prest-field"><label>aPTT (sec)</label><input id="trAptt" type="number" step="0.1" /></div>' +
          '<div class="prest-field"><label>Fibrinogeno (mg/dL)</label><input id="trFibr" type="number" /></div>' +
        '</div>' +
      '</fieldset>' +
      /* ── Richiesta ── */
      '<fieldset class="prest-fieldset">' +
        '<legend>Richiesta</legend>' +
        '<div class="prest-row cols-2">' +
          '<div class="prest-field"><label>Urgenza</label><select id="trUrgenza"><option>Ordinaria</option><option>Urgente</option><option>Urgentissima</option></select></div>' +
          '<div class="prest-field" style="justify-content:flex-end"><button class="btn btn-sm" type="button" onclick="trasfOpenEmoPicker()"><i class="hgi-stroke hgi-add-circle-half-dot" style="font-size:13px"></i> Aggiungi emocomponente</button></div>' +
        '</div>' +
        '<div id="trEmoList" class="trasf-emo-list"></div>' +
        '<div id="trEmoEmpty" class="trasf-emo-empty">Nessun emocomponente aggiunto. Clicca \u201CAggiungi\u201D per inserire.</div>' +
      '</fieldset>' +
      /* ── Picker emocomponente (sub-modal) ── */
      '<div class="prest-picker-backdrop" id="emoPickerBackdrop" onclick="if(event.target===this)trasfCloseEmoPicker()">' +
        '<div class="prest-picker">' +
          '<div class="prest-picker-header"><h3>Seleziona emocomponente</h3><button class="node-close" onclick="trasfCloseEmoPicker()"><i class="hgi-stroke hgi-cancel-01"></i></button></div>' +
          '<div class="prest-picker-body" id="emoPickerBody"></div>' +
        '</div>' +
      '</div>' +
      /* ── Anamnesi Trasfusionale ── */
      '<fieldset class="prest-fieldset">' +
        '<legend>Anamnesi Trasfusionale</legend>' +
        '<div class="prest-row cols-2">' +
          '<div class="prest-field"><label>Trasfusioni precedenti</label><select id="trPrev"><option>No</option><option>S\u00EC</option></select></div>' +
          '<div class="prest-field"><label>Reazioni trasfusionali</label><select id="trReaz"><option>No</option><option>S\u00EC (specificare sotto)</option></select></div>' +
        '</div>' +
        '<div class="prest-row cols-1">' +
          '<div class="prest-field"><label>Note / Dettagli reazioni</label><textarea id="trNote" rows="2"></textarea></div>' +
        '</div>' +
      '</fieldset>' +
      /* ── Medico Richiedente ── */
      '<fieldset class="prest-fieldset">' +
        '<legend>Medico Richiedente</legend>' +
        '<div class="prest-row cols-3">' +
          '<div class="prest-field"><label>Medico</label><input id="trMedico" /></div>' +
          '<div class="prest-field"><label>Data e ora richiesta</label><input id="trDataOra" type="datetime-local" /></div>' +
          '<div class="prest-field"><label>Firma</label><div class="prest-firma-box"></div></div>' +
        '</div>' +
      '</fieldset>' +
    '</div>';
  }

  global.TrasfusioneTemplate = { getHTML: getHTML };
})(window);
