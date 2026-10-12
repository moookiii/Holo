# Black & White Legendary Treasures Radiant Collection

All 25 exact English RC1–RC25 catalog records now resolve to glitter/overcoat
materials through `BwRadiantSurfaces.ts`. Original IDs, variants, clean fronts,
pack eligibility and chronological set order are preserved. The TCGL import
remains a record of the original acquisition; the finish resolver supersedes
its historical deferred flag only for this subset.

## Sources and boundaries

The 15 foil-backed cards are RC3, RC4, RC6, RC7, RC10–RC14, RC19 and RC21–RC25.
Each uses its own untouched TCGL whiteplate, including decorative flowers,
hearts, lightning, music and stars, subject silhouettes, antialiased lettering
and smooth areas. No artwork-brightness threshold or replacement decoration is
used. Original Unity sources are retained in `research/tcgl/bw-series` and
`public/cards/pokemon/tcgl-bw/bw11r_N/original-*.png`. Every new evidence JSON
includes the exact long-form variant, original bundle URL and hashes.

The original 1024×1024 front/plate share the established Unity UV box
`[145/1024, 0, 878/1024, 1]`. Plates are bilinearly registered to 733×1024,
with no vertical flip, rotation or offset. The artwork is not independently
cropped. `foil-controls.png` preserves all registered source channels;
`foil.png` is its grayscale coverage. All delivered masks are PNGs.

TCGL labels RC1, RC2, RC5, RC8, RC9, RC15–RC18 and RC20 `NonFoil` and supplies
no whiteplate, etch or coating map. The physical cards have a subtle coating;
these ten records receive an explicitly approximate repeating five-point star
sheet above the print. Whole-card dielectric coverage stays uniform; the PNG
star pattern modulates reflection only, avoiding dark star decals in unlit print.
Sheet phase varies by card number. This is **not** exact
TCGL geometry or an exact-copy physical placement claim. The original TCGL
variant labels remain unchanged. No subject/text segmentation is fabricated
for these common overcoats.

## Material response

`bw-radiant-glitter` uses a dedicated optical flake branch calibrated against the
user's angled Pikachu RC7 photo (`IMG_6664.jpg`). Unlike the fine rounded grain
response used by gold cards, this branch produces sparse, filled, irregular
convex chips with fixed positions, size variation and facet inclinations. The
primary population spans the own whiteplate at scale 58; the separately masked
lower population uses scale 49. The lower coating population ramps through
`smoothstep(.545, .610, full-card row UV)`. The coating flakes span the full
card above the print, with dark ink absorbing reflections per fragment.
Decorative substrate coverage still uses the exact original PNG plate.

Neighboring chips share a grating direction with small pitch variation, so the
local light/view geometry sweeps violet, cyan, green and gold across the card.
The chip response is optical only: no normal or height generation. Pixel
footprint filtering integrates unresolved chips to a weak neutral lobe. Sheet
diffraction, substrate metal and clearcoat intensity are reduced to retain the
printed artwork between flashes. The viewer and gallery use the same flake
function and separate shader specialization; gold grain and common overcoat
responses remain unchanged. All source fronts and PNG boundaries are unchanged.

The common `bw-radiant-overcoat` has subtle angular stars and no granular glints.
Both treatments have a smooth clear coat, with a dedicated physical stock
profile that disables paper grain normals. Roughness comes from the material,
independent of front brightness. Normal scale, height emboss, engraving,
pattern relief, facet tilt and normal variance are zero. No normal/height PNG
is generated or registered. Only the explicitly enabled BW foil-flake branch uses the new response.

Maps use the existing on-demand CPU preparation, GPU realization and cache
pipeline. Adding this subset does not preload its textures or detect image
features at runtime. Other sets and existing optics are unchanged by this pass.

## Physical review and reproducibility

References used to distinguish the common coating, decorative plate and fine/
coarse particles:

- [Snivy RC1 physical photo](https://www.mercari.com/us/item/m96116919642/).
- [Pikachu RC7 physical photo](https://www.mercari.com/us/item/m10585848937/).
- [Mew EX RC24 physical angles](https://www.mercari.com/us/item/m61096852228/),
  particularly image 3, with fine shimmer above and larger lower-card particles.

`python scripts/tcgl/author_bw_radiant.py` deterministically regenerates only
this subset's maps, evidence and full-card colored coverage overlays. Output
hashes and dimensions are in each evidence JSON; the 25-card inventory is in
`docs/bw-radiant.json`. The authoring assertions verify every preserved source
hash. Full-card overlays are saved under `artifacts/bw-radiant/RCNN-coverage.png`.

`node scripts/bw-radiant-review.mjs` saves all 25 cards at front, tilt and strong
specular angles, plus grazing, dark and moving-light views for RC1/7/11/24.
An RC24 glitter-on/off pair isolates particle contribution. Captures and live
state are saved in `artifacts/bw-radiant/live`.

Final validation: five targeted BW/RC tests passed; TypeScript passed; the
production bundle passed (existing large-chunk warning; public assets decoded
separately without copying the entire asset library). All 25 PNG sets decoded,
all 15 registered plates matched their sources pixel for pixel, and all coarse
regions stayed inside those plates. The 25-card live pass and common/glitter
gallery previews completed without errors. Common stars disappear outside the
angular highlight; fine and coarse particles remain distinct in the foil-backed
cards. The final review inventory is `docs/bw-radiant-review.json`.

The common coating layout and glitter population remain optical approximations.
Photographs do not establish measured surface depth, factory particle density
or identical angular calibration for every physical copy.

## Pikachu photo adjustment

The supplied photo establishes visible chip size, sparse coverage through the
artwork, a denser lower field and neighboring spectral hues. It does not supply
an exact-copy particle registration or measured optical constants. The existing
per-card TCGL plates still control the decorative substrate and its print
protection; coating flakes use dark-ink absorption separately. No maps or
fronts were regenerated for this shader change. Flake diameters were increased
by approximately 35% after the initial preview, as requested.

`node scripts/bw-glitter-review.mjs` captures Pikachu, Mew EX and the common
Snivy coating, plus the Pikachu gallery preview. Repeatable captures are saved under `artifacts/bw-glitter/after`, including
front, tilted, grazing, low-key, strong specular and three moving-light positions.
The flakes are fixed in card space; their reflections change with the light.

Validation for the photo adjustment: TypeScript and seven targeted tests passed.
The Vite production bundle passed with the existing large-chunk warning (asset
copying skipped for the isolated review build). The current shader was realized
in the renderer with primary/secondary scales 58/49, zero normal scale and zero
emboss. Pikachu's eight lighting/pose captures, Mew EX and Snivy comparison
captures, and the Pikachu gallery preview completed with zero page errors.
Unrelated profiles, source fronts and authored PNG masks were not modified by
this change. Exact physical-copy particle positions and angular calibration
remain approximate.
