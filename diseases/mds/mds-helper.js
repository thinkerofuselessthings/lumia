
/*! lumia.app.utils â€“ Generic Helper Registry */
/* Drop-in file. Auto-registers itself to window.LumiaHelpersRegistry */
(function(global){
  const REGISTRY_KEY = 'LumiaHelpersRegistry';
  const REG = global[REGISTRY_KEY];
  if(!REG){ console.warn('LumiaHelpersRegistry missing'); return; }
  const helper = {
  "id": "mds-helper",
  "title": "Myelodysplastic Syndromes Â· Helper",
  "version": "v2025.1",
  "tags": [
    "MDS",
    "IPSS-R/IPPSS-M",
    "WHO/ICC 2022"
  ],
  "subtitle": "Stratificazione, indicazioni terapeutiche (scheletro)",
  "sections": [
    {
      "id": "dx",
      "title": "Diagnosi",
      "html": "<ul><li>Citopenie persistenti; displasia; blasti &lt;20%.</li><li>Citogenetica e NGS consigliati.</li></ul>"
    },
    {
      "id": "risk",
      "title": "Rischio (IPSS-R/IPPSS-M)",
      "html": "<p>Calcolare punteggio â†’ categorie Very Lowâ€“Very High.</p>"
    },
    {
      "id": "therapy",
      "title": "Terapia per rischio",
      "table": {
        "columns": [
          "Rischio",
          "Opzioni"
        ],
        "rows": [
          [
            "Basso",
            "EPO/Luspatercept, lenalidomide (del5q), supporto"
          ],
          [
            "Alto",
            "Azacitidina, decitabina, considerare HSCT idonei"
          ]
        ]
      }
    }
  ],
  "references": [
    "ELN 2023â€“2025 MDS; IPSS-M; AIFA schede agenti ipometilanti."
  ]
};

  LumiaUIFactory.autoMount(helper);

  REG.register(helper);
})(window);
