/*! fil-fitness-helper.js â€” Registry wrapper for FIL Fitness module
 *
 *  Auto-registers 'fil-fitness-helper' into LumiaHelpersRegistry.
 *  Delegates mount to FILFitnessUI (IDE-style panel).
 *  Dipendenze: fil-fitness-data.js, fil-fitness-core.js, fil-fitness-ui.js
 */
(function (global) {
  'use strict';

  var REG = global.LumiaHelpersRegistry;
  if (!REG) { console.warn('[fil-fitness-helper] LumiaHelpersRegistry missing'); return; }

  REG.register({
    id: 'fil-fitness-helper',
    title: 'FIL Fitness \u00b7 sGA + EPI',
    version: 'v2026.1',
    tags: ['Fitness', 'FIL', 'sGA', 'EPI', 'Geriatric Assessment', 'Fit/Unfit/Frail'],
    subtitle: 'Simplified Geriatric Assessment e Elderly Prognostic Index (Merli et al., JCO 2021)',
    references: [
      'Merli F. et al. Simplified Geriatric Assessment in Older Patients With DLBCL. JCO 2021;39(11):1214-1222. DOI: 10.1200/JCO.20.02465'
    ],
    mount: function (el) {
      function tryMount(attempts) {
        if (global.FILFitnessUI) {
          global.FILFitnessUI.mount(el);
        } else if (attempts > 0) {
          setTimeout(function () { tryMount(attempts - 1); }, 80);
        } else {
          el.innerHTML = '<p style="color:red;">FILFitnessUI non caricato.</p>';
        }
      }
      tryMount(5);
    }
  });

})(window);
