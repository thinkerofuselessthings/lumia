
/*! lumia.app.utils â€“ Generic Helper Registry */
/* Drop-in file. Auto-registers itself to window.LumiaHelpersRegistry */
(function(global){
  const REGISTRY_KEY = 'LumiaHelpersRegistry';
  const REG = global[REGISTRY_KEY];
  if(!REG){ console.warn('LumiaHelpersRegistry missing'); return; }
  const helper = {
  "id": "aml-helper",
  "title": "Acute Myeloid Leukemia Â· Helper",
  "version": "v2025.1",
  "tags": [
    "AML",
    "ELN 2022/24",
    "AIFA"
  ],
  "subtitle": "Work-up, rischio ELN, terapia (scheletro)",
  "sections": [
    {
      "id": "dx",
      "title": "Diagnosi",
      "html": "<ul><li>Blasti â‰¥20% (eccezioni); immunofenotipo e genetica.</li><li>Panel molecolare (FLT3, NPM1, IDH1/2, TP53â€¦).</li></ul>"
    },
    {
      "id": "risk",
      "title": "ELN risk",
      "html": "<p>Favorable / Intermediate / Adverse (mutazioni e citogenetica).</p>"
    },
    {
      "id": "induction",
      "title": "Induzione/esempi",
      "table": {
        "columns": [
          "Setting",
          "Schema"
        ],
        "rows": [
          [
            "Fit &lt;60â€“65y",
            "7+3 Â± Midostaurin (FLT3)"
          ],
          [
            "Fit &gt;65y o unfit",
            "Venetoclax + HMA"
          ],
          [
            "IDH1/2",
            "Aggiunta ivosidenib/enasidenib secondo mutazione"
          ]
        ]
      }
    }
  ],
  "references": [
    "ELN 2022/2024 AML; AIFA schede farmaci; NCCN/EHA 2024â€“2025."
  ]
};

  LumiaUIFactory.autoMount(helper);

  REG.register(helper);
})(window);
