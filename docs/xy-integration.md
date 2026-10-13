# XY integration and finish handoff

All 3,416 acquired English TCGL finish records are registered across 18 chronological collections. All 14 actual booster products resolve exact source variants; 54 original English front designs are available. Kalos Starter Set, promos, alternate printings and standalone RC are browse-only.

| Collection | Cards | Variants | Active foil | Native nonfoil | Pending | Boosters / designs |
|---|---:|---:|---:|---:|---:|---|
| XY Black Star Promos (xybsp) | 211 | 211 | 119 | 10 | 82 | browse only |
| Kalos Starter Set (xy0) | 39 | 39 | 0 | 39 | 0 | browse only |
| XY alternate and special printings (xyalt) | 200 | 200 | 122 | 51 | 27 | browse only |
| XY Base Set (xy1) | 146 | 269 | 153 | 116 | 0 | 10 cards / 4 |
| Flashfire (xy2) | 109 | 200 | 117 | 83 | 0 | 10 cards / 4 |
| Furious Fists (xy3) | 113 | 210 | 122 | 88 | 0 | 10 cards / 4 |
| Phantom Forces (xy4) | 122 | 224 | 134 | 90 | 0 | 10 cards / 4 |
| Primal Clash (xy5) | 164 | 296 | 182 | 114 | 0 | 10 cards / 4 |
| Double Crisis (xy5-5) | 34 | 66 | 40 | 26 | 0 | 7 cards / 2 |
| Roaring Skies (xy6) | 110 | 196 | 120 | 76 | 0 | 10 cards / 4 |
| Ancient Origins (xy7) | 100 | 172 | 108 | 64 | 0 | 10 cards / 4 |
| BREAKthrough (xy8) | 164 | 302 | 174 | 122 | 6 | 10 cards / 4 |
| BREAKpoint (xy9) | 123 | 220 | 125 | 90 | 5 | 10 cards / 4 |
| Generations (xy9-5) | 83 | 152 | 88 | 64 | 0 | 10 cards / 4 |
| Generations Radiant Collection (xy9-5r) | 32 | 32 | 0 | 0 | 32 | browse only |
| Fates Collide (xy10) | 125 | 222 | 125 | 92 | 5 | 10 cards / 4 |
| Steam Siege (xy11) | 116 | 209 | 113 | 84 | 12 | 10 cards / 4 |
| Evolutions (xy12) | 113 | 196 | 104 | 75 | 17 | 10 cards / 4 |

Existing profiles: print-only: 1470, swsh-reverse-energy: 1307, pokemon-sheen: 430, prismatic_sir_texture: 140, prismatic_gold: 8, pokemon-tinsel: 6, pokemon-crosshatch: 31, pokemon-cracked-ice: 24.

## Finish handoff

Pending finishes show their clean source front and remain selectable and pullable. Source assets are present; shader/physical-evidence gaps must not be called missing textures. The full exact-printing list and original-map paths are in [xy-pending-finishes.json](xy-pending-finishes.json).

### Gold Pokemon BREAK — 35 variants

Gold segmented optical cells and raised gold print; the existing cracked-ice/random-facet and generic gold profiles do not establish this response.

Example: **Delphox BREAK**, xy10 #14. Exact variant: `DelphoxBREAK_xy10_14_std_BreakRare_Squares_Holo`.

Original maps: [front](../public/cards/pokemon/tcgl-xy/xy10_14/original-front.png), [foil](../public/cards/pokemon/tcgl-xy/xy10_14/original-foil.png).

### Steam Siege dual-type reverse — 5 variants

Source-data limitation: the five TCGL masks inspected encode the first-type motif rather than the requested split. Preserve those exact masks; do not synthesize a second type. This is not solely missing shader support.

Example: **Shiftry**, xy11 #11. Exact variant: `Shiftry_xy11_11_ph_RareHolo_Rainbow_Reverse`.

Original maps: [front](../public/cards/pokemon/tcgl-xy/xy11_11_ph/original-front.png), [foil](../public/cards/pokemon/tcgl-xy/xy11_11_ph/original-foil.png).

### Evolutions English standard holo hybrid — 13 variants implemented

The 13 standard holo rares now resolve through `EvolutionsSurfaces.ts` to the dedicated `pokemon-evolutions-holo` profile: existing registered Cosmos dots plus separately masked Base Set star optics, with sharper hand-authored stars. Exact fronts/whiteplates are preserved; no generic repeated field or Sheen substitute. See [card-by-card registration, validation and reference gaps](evolutions-holo.md). Acquisition-era generated pending records remain as source history; runtime overrides supply the authored finish.

Example: **Charizard**, xy12 #11. Exact variant: `Charizard_xy12_11_std_RareHolo_Galaxy_Holo`.

Original maps: [front](../public/cards/pokemon/tcgl-xy/xy12_11/original-front.png), [foil](../public/cards/pokemon/tcgl-xy/xy12_11/original-foil.png).

### Generations Radiant Collection — 32 variants

Own decorative foil masks include snowflakes/hearts and distinct coverage; generic Sheen or full-art EX cannot establish the RC presentation. Includes 13 TCGL NonFoil front records, retained as supplied.

Example: **Chikorita**, xy9-5r #RC1. Exact variant: `Chikorita_xy9-5r_1_std_Common_NonFoil_None`.

Original maps: [front](../public/cards/pokemon/tcgl-xy/xy9-5r_1/original-front.png).

### Cosmos registered motif placement — 98 variants

Existing Base Set 2 Cosmos optics are available. Exact-copy centers/radii and moving references are not available for these 98 printings. This is pending physical registration, not a new shader requirement. Clean fronts shown until registration is reviewed; no random dots.

Example: **Politoed**, xyalt #18. Exact variant: `Politoed_xy3_18_alt_Rare_Cosmos_Holo`.

Original maps: [front](../public/cards/pokemon/tcgl-xy/xyalt_63/original-front.png), [foil](../public/cards/pokemon/tcgl-xy/xyalt_63/original-foil.png).

### XY promotional Stamped — 3 variants

The TCGL Stamped enum alone does not establish that the existing First Movie gold-stamp response matches these promotional stamps; exact-print optical evidence is still needed.

Example: **Champions Festival**, xybsp #XY27. Exact variant: `ChampionsFestival_xybsp_27_op_Rare_Stamped_Stamped`.

Original maps: [front](../public/cards/pokemon/tcgl-xy/xybsp_27/original-front.png), [foil](../public/cards/pokemon/tcgl-xy/xybsp_27/original-foil.png).

## Validation and limitations

All original hashes, PNG decoding, dimensions and printing associations passed validation. Existing shaders were unchanged. Runtime fronts and foil use the established full-card TCGL bleed removal (145–878 / 1024 horizontally), without vertical flip. Original pixels remain separately preserved.

Live WebGPU review: ten representative viewers at six lighting/pose settings and all fourteen products loaded with no local HTTP errors or external card-image requests. Startup requested zero XY textures; preparation still uses the shared CPU cache and GPU realization pipeline. Captures and metrics: `artifacts/xy-integration/`.

Published pack model and source hashes: [xy-pack-collation.json](xy-pack-collation.json). The primary observer reports [Double Crisis](https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/127), [Generations and RC](https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/134) and the [Evolutions uncommon sheet](https://www.elitefourum.com/t/the-english-pokemon-card-rarity-guide/39762/139). Crosshatch reuse follows original TCGL `Thatch` entries and [documented league printings](https://www.pokellector.com/ajax/views/card-overlay?cardid=14758).

- McDonald's: zero acquired TCGL printings after raw/archived index and bundle audit; no invented collection.
- Pack rates are published primary-observer estimates, not official probabilities. Uniform within rarity categories except the observed Evolutions uncommon sheet; factory/box correlations are not simulated.
- All 148 exact etches retained byte-exact; offline tangent normals use the Sylveon/Espeon Scharr method. Glyph protection comes from near-black TCGL foil-plate values and may also flatten dark artwork.
- Fourteen wrapper reverses lack verified acquired imagery. Existing pack back fallback remains; original English fronts are available for all 54 designs. Seller page acquisition returned HTTP 403; do not substitute another expansion back.
- Native foil masks establish UV/coverage, not physical grating direction, measured groove depth or exact-copy Cosmos motifs.
- The full suite is not green: 364 passed, 38 failed. Comparison against pre-XY revision identifies 37 shared failures and the new missing-XY-wrapper-reverse assertion. Full logs in artifacts/xy-integration.
