
/*! lumia.app.utils â€“ Generic Helper Registry */
/* Drop-in file. Auto-registers itself to window.LumiaHelpersRegistry */
(function(global){
  const REGISTRY_KEY = 'LumiaHelpersRegistry';
  const REG = global[REGISTRY_KEY];
  if(!REG){ console.warn('LumiaHelpersRegistry missing'); return; }
  const helper = {
  "id": "mm-helper",
  "title": "Multiple Myeloma Â· Helper",
  "version": "v2025.1",
  "tags": [
    "MM",
    "WHO 2022",
    "EHA",
    "EMA/AIFA"
  ],
  "subtitle": "Diagnosi, stadiazione, linee terapeutiche, gestione tossicitÃ  (scheletro)",
  "sections": [
    {
      "id": "dx",
      "title": "Diagnosi (scheletro)",
      "html": "<ul><li>Criteri IMWG: plasmacellule midollari, CRAB/SLiM.</li><li>Work-up: M-protein, FLC, BM, imaging WB (PET/CT o MRI).</li></ul>"
    },
    {
      "id": "stage",
      "title": "Stadiazione e rischio",
      "html": "<p>R-ISS, citogenetica ad alto rischio (del17p, t(4;14), t(14;16)).</p>"
    },
    {
      "id": "firstline",
      "title": "Prima linea (non eligible vs eligible)",
      "table": {
        "columns": [
          "Scenario",
          "Schema",
          "Note"
        ],
        "rows": [
          [
            "Eligible trapianto",
            "VRd / Dara-VRd",
            "Induzione 3-4 cicli â†’ raccolta â†’ ASCT"
          ],
          [
            "Non-eligible",
            "Dara-Rd / Dara-VMP / VRd lite",
            "In base a fragilitÃ /ETÃ "
          ]
        ]
      }
    },
    {
      "id": "rr",
      "title": "Recidiva/Refrattario â€“ esempi",
      "table": {
        "columns": [
          "Classe",
          "Opzioni"
        ],
        "rows": [
          [
            "Anti-CD38 based",
            "Dara-Pd, Isa-Kd"
          ],
          [
            "IMiD / CELMoD",
            "Pomalidomide, Iberdomide"
          ],
          [
            "PI",
            "Carfilzomib, Bortezomib"
          ],
          [
            "Others",
            "Selinexor, Belantamab, CAR-T (ide-cel, cilta-cel)"
          ]
        ]
      }
    },
    {
      "id": "tox",
      "title": "TossicitÃ  e gestione (scheletro)",
      "html": "<p>Neuropatia (Bort) â†’ riduzione/switch; cardiotossicitÃ  (Carf) â†’ ECG/ECO; EMH/oftalmica (Belantamab) â†’ REMS.</p>"
    }
  ],
  "references": [
    "IMWG criteria; EHA MM 2024â€“2025; Schede AIFA â€“ farmaci MM."
  ]
};

  LumiaUIFactory.autoMount(helper);

  REG.register(helper);
})(window);
