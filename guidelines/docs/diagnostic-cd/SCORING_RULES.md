# CD B-LPD — Architettura dati e scoring

> Fonte: `app/diagnostics/cd-b-lpd-data.js` + `cd-b-lpd-core.js` v2  
> Aggiornamento: marker-centric table (v3 UI, stepper)

## Architettura

```
cd-b-lpd-data.js   →  MARKER_TABLE (marker-centric, expression arrays)
        ↓
cd-b-lpd-core.js   →  buildRules() → RULES (disease-centric, auto-generated)
        ↓                  compute(selections) → {entries, all}
cd-b-lpd-ui.js     →  Stepper 3 step (Marker → Riepilogo → Diagnosi)
```

## Struttura MARKER_TABLE

```js
MARKER_TABLE[marker] = {
  category: 'pan-B' | 'CLL' | 'MCL' | 'HCL' | 'sIg' | 'GC' | 'misc',
  fullName: string,
  diseases: {
    'DISEASE_KEY': {
      expr: string[],    // es. ['pos','dim','neg']
      typical: string,   // espressione più frequente
      weight: number,    // -3 a +3
      note?: string
    }
  }
}
```

## Marker (30 totali, per categoria)

### Pan-B (5)
CD19, CD20, CD22, CD79a, CD79b

### CLL/SLL (7)
CD5, CD23, CD200, LEF1, FMC7, CD43, CD81

### Mantle Cell (2)
CyclinD1, SOX11

### Hairy Cell (5)
AnnexinA1, CD103, CD25, CD11c, CD123, TRAP

### Immunoglobuline di superficie (4)
sIg, IgM, IgD, Kappa/Lambda

### Centro Germinativo / FL / DLBCL (5)
CD10, BCL6, MUM1/IRF4, BCL2, MYC

### Proliferazione / Accessori (5)
Ki-67, CD38, ZAP-70, CD30, CD138, CD148

## Diagnosi (17)

1. CLL/SLL
2. MCL (classical)
3. MCL (leukemic non-nodal)
4. MCL (blastoid/pleomorphic)
5. HCL
6. HCL-variant
7. SMZL
8. NMZL
9. EMZL/MALT
10. LPL/WM
11. FL
12. DLBCL-GCB
13. DLBCL-ABC
14. DLBCL-DE
15. BL
16. SDRPL
17. B-PLL

## Weight scale

| Peso | Significato |
|------|-------------|
| +3 | Patognomonico / molto forte (es. CyclinD1+ per MCL) |
| +2 | Forte (es. CD200 bright per CLL) |
| +1 | Supportivo / moderato |
| 0 | Non rilevante per la diagnosi |
| -1 | Lievemente contro |
| -2 | Forte contro |
| -3 | Virtualmente esclude (es. CyclinD1+ esclude CLL) |

## Scoring engine (compute)

1. Per ogni diagnosi, itera i marker con weight ≠ 0
2. Match diretto: `expect[seen]` → aggiunge peso
3. Match approssimato: dim≈pos, br≥pos, pos≈br
4. Conflitti: pos vs neg atteso (-1), neg vs pos/br atteso (-2)
5. Fallback differenziale per stati non previsti
6. Score > 0 → diagnosi candidata, ordinata desc
7. pct = round(score / max_score × 100)

## Fonti cliniche

- WHO Classification of Haematolymphoid Tumours, 5th ed. (2022)
- ICC 2022 (International Consensus Classification)
- Matutes scoring system (Matutes et al., Leukemia 1994)
- EuroFlow consensus panels
- Swerdlow SH et al., WHO Classification rev 4th ed. (2017)
- NCCN Guidelines (B-cell lymphomas, CLL/SLL)
| FMC7 | +2 | | | |
| CD79b | +2 | | | |
| sIg | | | | +2 |
| CD20 | | | | +1 |
| LEF1 | | +1 | | |

### MCL (leukemic non-nodal/indolent)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CyclinD1 | +3 | | | |
| SOX11 | | +2 | | |
| CD23 | +1 | | +1 | |
| CD5 | +1 | +1 | | |
| CD200 | +1 | | | |
| FMC7 | +1 | | | |
| CD79b | +1 | | | |
| sIg | | | | +1 |
| CD20 | | | | +1 |

### MCL (CD5-negative variant)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CyclinD1 | +3 | | | |
| SOX11 | +2 | | | |
| CD5 | | +2 | | |
| CD23 | | +2 | +1 | |
| CD200 | | +1 | | |
| FMC7 | +2 | | | |
| CD79b | +2 | | | |
| sIg | | | | +2 |
| CD20 | | | | +1 |

### MCL (CyclinD1− / SOX11+)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CyclinD1 | | +2 | | |
| SOX11 | +3 | | | |
| CD5 | +2 | | | |
| CD23 | | +2 | +1 | |
| CD200 | -2 | +2 | | |
| FMC7 | +2 | | | |
| CD79b | +2 | | | |
| sIg | | | | +2 |
| CD20 | | | | +1 |

### MCL (CyclinD1− / SOX11−, non-nodal-like)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CyclinD1 | | +2 | | |
| SOX11 | | +2 | | |
| CD23 | +1 | | +1 | |
| CD5 | +1 | +1 | | |
| CD200 | +1 | | | |
| FMC7 | +1 | | | |
| CD79b | +1 | | | |
| sIg | | | | +1 |
| CD20 | | | | +1 |

### HCL classica
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| AnnexinA1 | +2 | | | |
| CD103 | +2 | | | |
| CD25 | +2 | | | |
| CD11c | +2 | | | |
| CD123 | +1 | | | +2 |
| CD200 | +1 | | | +1 |
| CD5 | | +1 | | |
| CD23 | | +1 | | |

### HCL-variant
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| AnnexinA1 | | +2 | | |
| CD103 | +2 | | | |
| CD11c | +2 | | | |
| CD25 | | +1 | | |
| CD123 | | +1 | 0 | |
| CD5 | | +1 | | |
| CD23 | | +1 | | |

### SMZL
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CD10 | | +2 | | |
| CD5 | -1 | +2 | | |
| CD23 | -1 | +1 | 0 | |
| FMC7 | +2 | | | |
| CD79b | +2 | | | |
| sIg | +2 | | | +2 |
| IgM | +2 | | | +2 |
| IgD | +1 | | | |
| CD20 | +1 | | | +1 |
| CD22 | +1 | | | |
| CD103 | | +2 | | |
| CD123 | | +2 | | |
| AnnexinA1 | | +2 | | |
| CD11c | +1 | | | |
| CD25 | 0 | +1 | | |
| CD43 | 0 | +1 | | |
| CD200 | 0 | 0 | | 0 |
| CyclinD1 | -2 | | -1 | -2 |
| SOX11 | -2 | | | |
| LEF1 | -1 | | | |

### LPL/WM
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| IgM | +2 | | | +2 |
| MUM1/IRF4 | +1 | | | |
| CD5 | | +1 | | |
| CD23 | | +1 | | |
| CD10 | | +1 | | |

### SDRPL
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CD5 | | +2 | | |
| CD10 | | +2 | | |
| CD23 | | +2 | | |
| CD11c | +1 | | | |
| CD103 | | +1 | | |
| CD25 | | +1 | | |
| AnnexinA1 | | +1 | | |
| CD200 | | +1 | | |
| IgM | +1 | | | |

### FL (GC-type)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CD10 | +2 | | | |
| BCL6 | +2 | | | |
| CD5 | | +1 | | |
| CD23 | | +1 | | |

### DLBCL (Hans GCB)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CD10 | +3 | | | |
| BCL6 | +2 | | | |
| MUM1/IRF4 | -1 | +2 | | |

### DLBCL (Hans non-GCB)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| MUM1/IRF4 | +2 | | | |
| CD10 | | +2 | | |
| BCL6 | +1 | +1 | | |

### DLBCL (double-expressor)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| MYC | +2 | | | +2 |
| BCL2 | +2 | | | +2 |
| BCL6 | +1 | | | |
| CD10 | | +1 | | |

### DLBCL (pan-B)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CD79b | +1 | | | |
| CD20 | | | | +1 |
| CD10 | +1 | | | |
| BCL6 | +1 | | | |
| MUM1/IRF4 | +1 | | | |

### BL (Burkitt Lymphoma)
| Marcatore | pos | neg | dim | br |
|-----------|-----|-----|-----|-----|
| CD10 | +2 | | | |
| BCL6 | +2 | | | |
| CD23 | | +1 | | |
| CD5 | | +1 | | |

---

## Parametri fallback

| Costante | Valore | Uso |
|----------|--------|-----|
| `POS_FALLBACK` | +0.5 | Marcatore positivo non previsto nelle regole |
| `NEG_WEAK_PEN` | -1 | Penalità debole per negatività |
| `NEG_STRONG_PEN` | -1.5 | Marcatore negativo ma diagnosi attende positivo/bright |

## Approssimazioni di stato

| Stato osservato | Stato atteso | Azione |
|-----------------|-------------|--------|
| dim | pos | Usa peso di pos (con clamp) |
| pos | br | +1 |
| br | pos | Usa peso di pos |
| pos | neg atteso | -1 (conflitto) |
| neg | pos/br attesi | -2 (conflitto forte) |
