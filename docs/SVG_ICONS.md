# SVG Icons Registry

> Tracciamento di tutte le icone SVG usate nei componenti v2 (tab strip, launcher).
> Migrazione progressiva da Hugeicons → SVG inline.

---

## Icone Modulo (module identity)

| Nome | Size | viewBox | Uso | Descrizione |
|------|------|---------|-----|-------------|
| module-user | 20×20 | 0 0 24 24 | Tab strip badge, launcher preview | Profilo utente (cerchio + silhouette) |
| module-user-lg | 40×40 | 0 0 24 24 | Launcher preview large | Come sopra, stroke-width 1.5 |

## Icone Sezione (section icons)

| Nome | Size | viewBox | Uso | Descrizione |
|------|------|---------|-----|-------------|
| user | 14×14 | 0 0 24 24 | Tab icon, launcher card | Profilo utente (circle + path) |
| history | 14×14 | 0 0 24 24 | Tab icon, launcher card | Orologio con lancette |
| lab | 14×14 | 0 0 24 24 | Tab icon, launcher card | Beuta/provetta laboratorio |
| steth | 14×14 | 0 0 24 24 | Tab icon, launcher card | Stetoscopio |
| pill | 14×14 | 0 0 24 24 | Tab icon, launcher card | Pillola/capsula |
| bed | 14×14 | 0 0 24 24 | Tab icon, launcher card | Letto ospedaliero |
| alert | 14×14 | 0 0 24 24 | Tab icon, launcher card | Triangolo warning |
| file | 14×14 | 0 0 24 24 | Tab icon, launcher card | Documento/file |

## Icone Azione (action icons)

| Nome | Size | viewBox | Uso | Descrizione |
|------|------|---------|-----|-------------|
| close | 14×14 | 0 0 24 24 | Tab ✕, launcher action "Close Layer" | X dentro quadrato arrotondato |
| lib | 14×14 | 0 0 24 24 | Launcher action "Library" | Scaffale libri |
| chevron | 12×12 | 0 0 24 24 | Launcher card expand indicator | Freccia destra > |

---

## Note

- Tutte le icone usano `stroke="currentColor"` (colorabili via CSS `color`)
- `stroke-width`: 1.5 per icone standard, 2 per module identity e chevron
- `fill="none"` su tutte — sono outline icons
- `stroke-linecap="round"` e `stroke-linejoin="round"` per coerenza visiva
- Le icone sono embedded inline nei config dei moduli (non file separati)
- Per nuovi moduli: aggiungere qui l'icona prima dell'uso nel config
