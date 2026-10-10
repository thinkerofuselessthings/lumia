
/*! lumia.app.utils â€“ Generic Helper Registry */
/* Drop-in file. Auto-registers itself to window.LumiaHelpersRegistry */
(function(global){
  const REGISTRY_KEY = 'LumiaHelpersRegistry';
  const REG = global[REGISTRY_KEY];
  if(!REG){ console.warn('LumiaHelpersRegistry missing'); return; }
  const helper = {
  "id": "cmml-helper",
  "title": "Chronic Myelomonocytic Leukemia Â· Helper",
  "version": "v2025.1",
  "tags": [
    "CMML",
    "MD/MPN"
  ],
  "subtitle": "Diagnosi, classificazione, trattamento (scheletro)",
  "sections": [
    {
      "id": "dx",
      "title": "Diagnosi",
      "html": "<ul><li>Monocitosi &gt;=0.5Ã—10^9/L e &gt;=10% del WBC per &gt;3 mesi; escludere cause reattive.</li><li>mutazioni comuni: TET2, SRSF2, ASXL1, RAS-pathway.</li></ul>"
    },
    {
      "id": "class",
      "title": "Classificazione",
      "html": "<p>CMML-0/1/2 per blasti; MD-like vs MPN-like.</p>"
    },
    {
      "id": "tx",
      "title": "Terapia",
      "table": {
        "columns": [
          "Scenario",
          "Opzioni"
        ],
        "rows": [
          [
            "Sintomatico/basso rischio",
            "Supporto, idrossiurea per proliferazione"
          ],
          [
            "Alto rischio/Progressivo",
            "Azacitidina; considerare HSCT se idoneo"
          ]
        ]
      }
    }
  ],
  "references": [
    "ELN/EBMT raccomandazioni CMML 2023â€“2025."
  ]
};

  LumiaUIFactory.autoMount(helper);

  REG.register(helper);
})(window);
