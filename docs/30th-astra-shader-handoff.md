# 30th Celebration — Astra High shader handoff

**Implementation decision:** See [the shader audit](30th-shader-audit.md) for
the current concrete work list and code evidence. It supersedes the provisional
new-shader assessments below. Plan three specialty treatments (Pikachu, Classic,
RGB), plus distinct profiles/routing for existing foil and etch mechanisms.

This pass integrates 199 exact English TCGL printings and prepares their assets.
**No shader or shared material profile was changed. No anniversary finish is
physically approved.** Existing profiles are temporary, with per-card overrides
that disable invented procedural motifs, sparkle, engraving and extra emboss.

Use `30th-shader-printings.json` for the exhaustive card-to-treatment list,
including canonical IDs, printed numbers, rarity, exact TCGL ID/long-form variant,
original source URLs and hashes, prepared maps and temporary profile. The
acquisition manifest retains full export entries and Classic raw database rows.
Do not infer a physical finish from rarity alone or treat seven TCGL labels as
seven requirements for entirely new shaders.

## Source inventory and retained information

| TCGL declaration | Printings | Physical group to investigate | Etches |
| --- | ---: | --- | ---: |
| `RAINBOW / HOLO` | 76 | 68 main-set Commons; 8 anniversary Energy | 0 |
| `SV_HOLO / HOLO` | 18 | Main-set Rares | 0 |
| `PIKACHU / HOLO` | 30 | Pikachu Rares 023–052/128 | 0 |
| `SUN_PILLAR / HOLO` | 30 | 12 Double Rares; 18 Illustration Rares 129–146/128 | 0 |
| `SV_ULTRA / ETCHED` | 12 | 10 SIRs 147–156/128; FURs 157–158/128 | 12 |
| `CLASSIC_FOIL / ETCHED` | 30 | Every 2026 Classic Collection printing | 30 |
| `RGB / ETCHED` | 3 | Mew R/RGB, G/RGB, B/RGB | 3 |
| Total | 199 | | 45 |

All 443 originals are committed byte-for-byte in
`public/cards/pokemon/30th-celebration/`: front/etch 733×1024, foil 367×512.
They also remain untouched in `research/tcgl/<tcgl-id>/`. Foil images retain all
RGBA channels and their original intensity values: no threshold, recoloring,
normalization, crop, flip or substitution was applied to these originals.

TCGL foil images provide registered spatial values and material regions; the
declaration selects TCGL's optical treatment. A grayscale-looking foil image
does not supply the complete angular BRDF, foil-stock motif, diffraction period,
groove depth, or measured sparkle. Small channel differences also occur in the
decoded non-RGB sources; do not assume every foil/etch is literally grayscale.
RGB Mew's strongly colored foil and etch textures require special interpretation.

**Current renderer limitation:** `src/assets/MapPacking.ts` packs `foil`'s red
channel into scalar primary coverage, multiplied by protection. G/B/A optical
information remains available in the original PNG but is not fully represented
by that scalar path. In particular, RGB Mew is not faithfully rendered by the
temporary registration. Preserve the untouched texture for the future sampler;
do not flatten or overwrite it to fit the current shader.

## Reuse, extension and new mechanisms

| Group | Existing foundation | What already works | What Astra must establish/change | New shader assessment |
| --- | --- | --- | --- | --- |
| Commons / Energy | `sv_tcgl_regular_holo`, uniform `sv151-illustration` response | Exact front/foil UV domain and scalar coverage; existing PBR/diffraction | Preserve source intensity semantics, distinguish coverage from optical strength, calibrate rainbow sweep, silver border, opacity and highlight width on exact English copies | No new whole shader demonstrated; extend/tune existing response first |
| Rares | Same existing SV coverage/PBR foundation | Registered image-window and print coverage | Confirm actual grating, border response and interference relative to Common/Energy; use map regions rather than procedural frames | No new mechanism demonstrated |
| Double Rares | `sv-double-rare` / `pokemon151_ex_holo` for a later calibrated extension | Existing SUN_PILLAR and cast-and-cure optical machinery | Verify whether anniversary ex stock has the existing star optical response; obtain authentic shared stock texture if required; preserve each card's foil values | Extend existing SUN_PILLAR path unless references show a genuinely different mechanism |
| Illustration Rares | `sv_tcgl_illustration_holo`, `pokemon151_illustration_holo` | Continuous full-card foil/PBR foundation | Match anniversary period, rotation, interference width, border and ink transmission | Existing mechanism is a plausible reuse; not yet physically approved |
| SIRs | `prismatic_sir_texture` + `tcglEtchedFinish` | Required offline authored normal response and restrained Espeon/Sylveon finish | Finish exact contour/glyph regions and secondary masks where actually present; calibrate optics without extra emboss or fabricated lines | No new etch shader needed |
| FURs | Same required authored-normal foundation | Their own distinct exact etches and full-card foil maps | Separate reflective subject, etched background, iridescent printing/anniversary stamp and any optically distinct areas using physical evidence | Shared `SV_ULTRA` label is evidence against automatically inventing a new family; region/optical extension remains possible |
| Pikachu fireworks | Existing `fireworks` and `legendary-fireworks` pattern machinery as implementation references | PBR/diffraction building blocks only | Obtain authentic anniversary foil-stock motif/TCGL shared treatment asset; preserve its scale, registration, directions and angular burst response. Card foil PNGs alone do not reconstruct fireworks geometry | A texture-driven anniversary fireworks evaluator may be needed. Do not reuse the old Legendary pattern or random bursts as the 2026 finish |
| Classic Collection | Authored normals + existing separately masked microdiamond/glint/PBR mechanisms | Exact 2026 etches, foil images, gold printed borders and stamps | Match new gold-border sparkle, art-window sparkle, opacity, and individually etched regions across historical frame styles. Do not inherit old Base/Cosmos/Crystal/BREAK/GX effects | Prefer extending masked existing mechanisms; dedicated Classic optical mode only if controlled comparisons establish a difference |
| RGB Mew | Existing PBR, colored metallic ink, diffraction and authored normals | Original colored maps preserved; three separate source identities | Determine channel meaning from TCGL/physical evidence; retain chromatic control through CPU preparation/GPU sampling; match colored foil, stipple, frame and etch polarity without adding printed-color relief | Channel-aware map transport/optical evaluation is a confirmed gap. Whether it warrants a separate complete shader is not yet established |

The temporary Double Rare registration explicitly clears the inherited
`/materials/sv-double-rare-stars.png` and uses the existing continuous response.
It must not borrow that texture as proof of anniversary geometry. All temporary
non-etched definitions use `plain`, zero engraving/relief/facet noise and zero
glints. All etched definitions use `tcglEtchedFinish` without changing its shared
settings. Unrelated cards and their optics are untouched.

There are **zero evidence-confirmed requirements for an entirely new full
material shader** at this checkpoint. There are concrete missing mechanisms to
investigate: chromatic RGB transport and authentic texture-driven fireworks.
Classic sparkle and FUR region optics are extension candidates. Label these
decisions provisional until exact-print moving-light references resolve them.

## Etch preparation and region readiness

All 45 opaque RGB normals exist at 1800×2475 and are registered for temporary
rendering. Conversion is mean source RGB → inverted continuous height →
full-domain bilinear resize → Scharr CV_32F scale 1/32 → gain 1.03 → X/Y protection
after differentiation → normalization → alpha flattening → OpenGL +Y encoding.
No active height map, runtime generation, blur, noise, replacement geometry,
crop, UV offset or vertical flip is used. Every output hash and parameter is in
`30th-asset-preparation.json` and per-card evidence JSON. Numerical validation
recomputed all 45 outputs and matched them exactly.

The 1800×2475 protection/body PNGs are card-specific source-derived candidates
from the existing TCGL `source_regions` workflow, **not final traced contours**.
Roughness is `(0.30 + 0.105 * body) * (1 - secondary) + 0.27 * secondary`.
Secondary foil PNGs are empty placeholders because no exact-print microdiamond
boundary has been approved. They are explicitly registered, so the existing
secondary sparkle response cannot leak onto the full card.

For RGB Mew, protection/body are empty instead of interpreting chromatic control
colors as opaque glyphs. Its mean-RGB normal is a reproducible reference
conversion candidate; that does not verify TCGL's colored-etch semantics.
Review RGB channel interpretation before declaring those three normals final.

Source-pair inspections found the expected common full-card registration, with
no corrective crop/flip indicated. Repeating every original paired export is
unnecessary; focus remaining review on **derived masks/normals and renderer UVs**.
Do not promote the pending evidence fields simply because the source pair is
aligned. Physical polarity/depth, exact text counters/antialiasing, narrow gaps,
silhouette edges, smooth areas and secondary regions remain unapproved.

## Physical evidence Astra needs

Acquire exact **English 2026** printings, showing collector number and stamp in
the same session. Historical originals and Japanese anniversary variants are
not interchangeable physical-finish references. For each finish record fixed
exposure/white balance, neutral diffuse light, a single moving white point/strip
light, front, grazing, strong specular and card-tilt views. Macro views should
cover text outlines/counters, stamp, silver/gold border, subject and background.

Minimum representative targets: Common 001, Rare 063, Double Rare 053, IR 129,
SIR 147 and 153, FUR **both** 157 and 158, Pikachu 023 plus multiple other Pikachu
prints, Energy 009 and another type; Classic Pikachu 58/102, Lugia 149/147,
Greninja BREAK 41/122, both LEGEND halves 99/102 and 100/102, and modern ex/GX/V
frames; **all three** RGB Mew colors. Extend to every distinct observed stock or
region layout; a representative sample cannot approve every mask.

[Official expansion page](https://www.pokemon.com/us/pokemon-tcg/30th-celebration)
is an identity/product reference, not measured optics. The
[RGB source investigation](https://www.pokemonaaah.net/news/2026/07/rgb-mew-super-deep-dive-into-just-the-facts/)
links owner/close-up footage; follow its original Peak Hobby/Whatnot references
and verify printing/color before using them. These are research leads, not
captures reviewed and approved in this pass. No complete angled-reference set
has been obtained. TCGL fronts, including apparent Classic grain and RGB
stippling, remain unchanged; resolve baked printing versus baked foil before any
clean-front edit.

Compare every final authored card with Espeon 155 and Sylveon 156 at identical
light/pose controls. Retain the reference primary response: normalScale 1,
emboss 0, absolute roughness; metalness .50, laminate .045, reflectance .025,
etchedInkSheen .85; diffraction period 1.16/bandwidth .048/strength .48/order
.065/direction -.48/crossWidth .42/facetCoupling 0/followsAuthoredNormals true.
Primary procedural structure/glints remain zero. Apply the existing separately
masked secondary finish only where exact-card evidence warrants it.

## Non-shader evidence gaps

1. Authentic English wrapper backs are missing for both products; current backs
   are the existing visibly branded Holo fallback. Authentic sourced fronts are
   tightly cropped with seals retained and no resampling.
2. Exact 23/23/22 common slot membership and the observed shifting rule are not
   recovered. Current common slots draw distinct cards from all 68 Commons;
   this is explicitly estimated, not fully authentic slot-specific collation.
3. RGB probability is a one-hit 1/4063 estimate. UPC uniform-without-duplicates
   is an estimate for the November product, not verified factory collation.
4. The accessible first infographic contains a one-hit-per-pack statement that
   conflicts with secondary accounts and the requested independent IR/Classic
   and rare replacement slots. The implementation follows the requested
   independent slots; obtain the full original study/raw observations to settle
   that discrepancy instead of silently changing probabilities.
5. Final per-card contour/protection/secondary authoring and physical review are
   incomplete. These are explicit asset-review blockers, not shader approval.

Original study: [4,063-pack author post](https://www.reddit.com/r/PokemonTCG/comments/1whk28a/i_recorded_30th_pull_rate_on_over_4000_pack/).
The remaining infographic gallery is blocked by a CAPTCHA in the browser. No
slot memberships or shared foil-stock maps were invented to replace it.
