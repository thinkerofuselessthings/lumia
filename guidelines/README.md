# guidelines/ — Struttura documentazione

```
guidelines/
├── README.md           ← questo file
├── active/             ← documenti in uso corrente
├── archive/            ← documenti superati (versioni precedenti, riferimenti legacy)
├── draft/              ← bozze e lavori in corso
└── docs/               ← documentazione ufficiale per modulo
    └── diagnostic-cd/  ← modulo diagnostico CD (B-LPD)
```

## Cartelle

| Cartella | Scopo | Regola |
|----------|-------|--------|
| **active/** | Documenti che guidano lo sviluppo corrente | Quando viene aggiornato, la versione precedente va in `archive/` |
| **archive/** | Versioni superate, riferimenti da altri progetti | Non modificare — solo consultazione |
| **draft/** | Bozze, analisi esplorative, note temporanee | Promuovere in `active/` o `docs/` quando maturi |
| **docs/** | Documentazione ufficiale di ogni modulo | Una sottocartella per modulo (`docs/diagnostic-cd/`, `docs/scores/`, ecc.) |

## Convenzioni

- Un file per argomento, nomi in UPPER_CASE per documenti di progetto (`ROADMAP.md`, `ANALYSIS_M0.md`), lower_case per documenti tecnici
- Ogni documento ha un header con data e stato
- Quando un documento in `active/` viene riscritto, la versione vecchia va in `archive/` con suffisso data (es. `ROADMAP_2026-03-16.md`)
