# English XY Evolutions standard holo rares

Implemented `pokemon-evolutions-holo` for the 13 English booster standard holo
rares identified by the [official English checklist](https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/checklist/xy12_web_cardlist_en.pdf).
BREAK, EX, Full Art, secret, reverse and product-exclusive printings retain their
existing treatments. No Base Set, Base Set 2 or Cosmos profile/generator changed.

| Printing | Dots | Stars | Reference coverage still needing improvement |
|---|---:|---:|---|
| Charizard 11/108 | 13 | 20 | Fire, wings and shadow obscure faint motifs |
| Ninetales 15/108 | 17 | 13 | Upper/left shadow; printed blue flames excluded |
| Poliwrath 25/108 | 13 | 18 | Dim background; printed water loops excluded |
| Gyarados 34/108 | 19 | 18 | Left-edge glare obscures some boundaries |
| Raichu 36/108 | 18 | 37 | Upper-left printed bokeh excluded; better photo acquired |
| Magneton 38/108 | 20 | 22 | Vertical sheet highlights excluded from dot counts |
| Zapdos 42/108 | 11 | 12 | **Priority:** right-side motifs hidden by dark radial printing |
| Nidoking 45/108 | 13 | 18 | Faint upper-left background unresolved |
| Mew 53/108 | 9 | 16 | Pale glare obscures some circle extents |
| Machamp 59/108 | 12 | 17 | Upper glare; printed rings excluded |
| Hitmonchan 62/108 | 19 | 36 | Dim streaks excluded from motif counts |
| Clefairy 63/108 | 20 | 31 | Low-contrast left background unresolved |
| Chansey 70/108 | 18 | 28 | Sleeve/grain and faint points excluded |

All 13 implementations and their registrations are active. The 202 dots and
286 stars represent the resolved subset in the selected physical copies,
not every invisible feature in the foil sheet. All cards would benefit from
moving physical references; the profile remains `development` because these
photos cannot establish measured angular intensity or complete exact-copy
placement. Bright TCGL artwork also retains its printed background rather than
being recolored to match one photographed exposure.

## Reused optics and maps

The primary layer inherits the registered `pokemon-base-set-2-cosmos` response
unchanged. The secondary layer inherits `pokemon-base-set-star` diffraction and
surface response, with random glints and extra normal variance disabled. The
existing layer compositor masks stars out of the underlying primary layer.
Both components occupy the same artwork window and remain locked to card UVs.
There is no new shader, random motif placement, large swirl, height/normal map,
runtime image detection or active emboss.

Each card has separate 1200×1650 PNGs for full-front filled dots, sharp stars,
artwork guard, native registered foil controls, composed primary coverage and
composed star coverage under `public/cards/pokemon/evolutions-holo/xy12-N/`.
The native TCGL plate preserves its subject/opaque print exclusions. The guard
removes only compression residue outside the reviewed inner picture rails.
Motifs stay complete behind print; coverage performs the clipping.

Star rasterization reuses `scripts/wotc/create-star-maps.py`'s narrow-ray method:
four/eight rays recorded individually, arm width 0.12, diagonal reach 0.66,
compact core 0.17, four samples per 600×825 coordinate pixel, Lanczos output.
Only optical orientation uses the existing seeded generators. Centers/radii
come from the hand-authored `scripts/evolutions/placements.json`.

Original clean fronts and TCGL originals are unchanged. Evidence JSON records
each long-form printing ID, original hashes, native full-card UV bleed removal
(145–878 / 1024 horizontally, no vertical flip), coordinate/output dimensions,
physical source URL/hash, photo homography, registration parameters and final
map hashes. Physical photos are preserved in `research/evolutions/`; title/rules
SIFT matches establish a projective coordinate transform, never motif detection.

`EvolutionsSurfaces.ts` resolves only the explicit 13 identities and asserts their
exact `_std_RareHolo_Galaxy_Holo` variant. The original generated source catalog
retains its acquisition-era pending records; the runtime resolver supersedes
those records. Reimporting XY cannot overwrite the dedicated authored maps.

## Validation and local captures

Type checking, production build, asset audit and all 22 targeted tests passed
in the working checkout. Tests cover the 13 eligible printings, all excluded XY
variants, preserved hashes, unique PNGs and inherited optics, plus existing
Base Set/Base Set 2/pattern regressions. Asset checks confirm filled disk cores,
zero foil outside artwork, stars within their own plate and byte-identical
registered TCGL controls. Existing pattern generators/profiles have no diff.

All 13 compiled viewers were captured under Studio front, tilt, Strip specular,
Low key, grazing and three moving-light positions. No runtime/HTTP errors;
measured average frame times were 5.55–6.72 ms on this machine, not a portable
performance guarantee. The Evolutions gallery retained 196 printings, 48-slot
capacity, six visible/six expected cards and zero failures. Full-front boundaries
were inspected individually, with original photo grids and physical overlays.

Captures and reports are saved locally under `artifacts/evolutions/registration/`
and `artifacts/evolutions/viewer/`. Existing Base Set Alakazam, Base Set 2
Charizard and Entei use the same review controls under
`artifacts/evolutions/viewer-existing-references/`.

Reproduce: `python scripts/evolutions/fetch-references.py`,
`python scripts/evolutions/register-photos.py`,
`python scripts/evolutions/prepare.py`, `python scripts/evolutions/audit.py`,
`node --experimental-strip-types scripts/evolutions/check.mjs`.
Use `node scripts/evolutions/build.mjs` and
`python scripts/evolutions/serve-review.py` for a compiled review without hot
reload, then run `scripts/evolutions/review.mjs` with `HOLO_BROWSER_URL` set to
`http://127.0.0.1:5182/Holo/`.
