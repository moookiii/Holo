# English Sun & Moon Prism Star finish

Research date: 2026-10-10. Research only; no shader, registration, front, or material-map changes. **Implementation recommendation: one coherent Sun & Moon wave/diagonal foil family, with exact per-card coverage and an additional outer-border mask. Do not invent etched relief or a separate diamond grating.** The last recommendation is a working hypothesis, not a verified manufacturing specification.

## Physical evidence and references

These are physical English cards, not TCGL animations. Watch the complete short clips; timestamps below exclude advertisements. Saved JPEGs are browser captures of references, not original-resolution media or material assets. Enlarging video does not increase its source detail. Gloves obscure portions of the lower-right card; lighting is uncontrolled.

| Ref | Exact card and direct source | Useful observations |
| --- | --- | --- |
| G1 | [Giratina ◇, Ultra Prism 58/156 — Pokémon Holo, 14-second rotation](https://www.youtube.com/watch?v=wxp0jrR_SyU) | 0–5 s: dark-to-colored artwork/frame, diamond and rule strip. 5–10 s: spectral bands change while subject and central star remain printed. |
| G2 | [Giratina physical seller gallery](https://www.ebay.com/itm/185503684822), [1200-pixel photo](https://i.ebayimg.com/images/g/iFQAAeSwZm9o17Q-/s-l1200.jpg) | Easel/sleeve photo: repeated diagonal dark/gold bands along the outer black border, rainbow diamond, restrained artwork reflection. |
| G3 | [Independent Giratina collector photo](https://www.reddit.com/r/PokemonTCG/comments/1514c9j/), [original image link](https://i.redd.it/6q07qqmnfbcb1.jpg) | Different copy and lighting: conspicuous moving-foil-looking banding in diamond; static photo alone cannot establish motion. |
| G4 | [Card Cavern Giratina photo](https://www.cardcaverntradingcards.com/products/giratina-prism-star-58-156-ultra-prism), [large image](https://www.cardcaverntradingcards.com/cdn/shop/files/IMG9896.jpg?v=1752094806&width=1200) | Flat capture for layout/print comparison; do not use its grain or pastel gradient as measured foil geometry. |
| T1 | [Cyrus ◇, Ultra Prism 120/156 — Pokémon Holo, approximately 17-second rotation](https://www.youtube.com/watch?v=82oejX_LnGY) | 0 vs 5 s: green/cyan rule strip becomes violet/pink; diamond changes with it; central cream star and character retain print. |
| T2 | [Independent Cyrus seller gallery](https://www.ebay.com/itm/394448594959), [1200-pixel photo](https://i.ebayimg.com/images/g/JgEAAOSw5PFj-saP/s-l1200.jpg) | Dark metallic diamond with colored bands; cream star, ordinary rules background and character remain comparatively opaque. |
| E1 | [Super Boost Energy ◇, Ultra Prism 136/156 — Pokémon Holo, approximately 14-second rotation](https://www.youtube.com/watch?v=HHuXf_uSgMQ) | 5 vs 10 s: strong oblique spectral bands in rule strip and diamond; outer border flashes; four energy orbs retain their printed shading. |
| S1 | [Life Forest ◇, Lost Thunder 180/214, collector photograph](https://www.reddit.com/r/PokemonTCG/comments/zlzt9d/), [original image link](https://i.redd.it/yxfijd5hhy5a1.jpg) | Later Stadium: foil visible in landscape, rule strip and diamond. Sleeve/toploader and background lights limit border interpretation. No Stadium tilt sequence verified. |

Representative physical references:

![Giratina seller photo: foil in diamond and diagonal bands on black border](references/prism-star/giratina-easel.jpg)

![Cyrus at 5 seconds: protected subject and star against reflective rule strip and diamond](references/prism-star/cyrus-5s.jpg)

![Super Boost Energy at 10 seconds: oblique bands in rule strip, diamond and border](references/prism-star/energy-10s.jpg)

Additional captured angles: [Giratina 0 s](references/prism-star/giratina-0s.jpg), [5 s](references/prism-star/giratina-5s.jpg), [10 s](references/prism-star/giratina-10s.jpg); [Cyrus 0 s](references/prism-star/cyrus-0s.jpg), [independent photo](references/prism-star/cyrus-photo.jpg); [Energy 5 s](references/prism-star/energy-5s.jpg); [Life Forest photo](references/prism-star/life-forest-photo.jpg).

## Verified appearance versus interpretation

| Region | Observed physical behavior | Implementation consequence |
| --- | --- | --- |
| Artwork background | Selected areas gain colored, directional reflections during tilt. Giratina's dark subject, Cyrus's body and Energy's orbs stay comparatively opaque. Printed lightning/flames/rays are persistent artwork, not relief. | Exact card-specific background/subject boundaries; never use front brightness as a mask or height. |
| Large lower diamond | Strong silver/pastel-to-saturated spectral bands; broad oblique, sometimes bent boundaries move through the shape. Fixed pastel shading also exists in the clean front. | Preserve printed shading. Add angle/light-dependent foil over its coverage. No rainbow decal, faceted crystal model or embossed diamond. |
| Central eight-point star | Remains purple on Giratina and cream on Cyrus/Energy; its edge shading persists across angles. | Protect its entire printed shape, including fine points and antialiasing. It is excluded in the TCGL plate. |
| Artwork frame and Prism Star rule strip | Silver/neutral reflections and strong colored bands, including behind rule text. Printed bevels persist independently. | Include frame and rule strip; preserve ink/text. Do not protect the whole white text rectangle. |
| Black outer border | Giratina G2 and Energy E1 show visible directional foil flashes on dark ink. It can look almost black at another angle. | Add narrow, full-card border coverage; retain black ink absorption. Avoid a permanently silver frame. |
| Name/header, ordinary rules field, footer and type-colored surrounding body | Largely retain ordinary printed appearance outside the diamond; no evidence of a full-face reverse-holo treatment. Small name ◇ changes color. | Preserve opaque body; retain the small foil name symbol. Inspect diamond continuation across bottom strips per card. |

**Optical description:** reflective metal beneath selective ink, with neutral/dark states between colored states. The visible pattern consists of coherent bands rather than isolated sparkles, Cosmos spots, a microdiamond grid or cracked-ice facets. Bright regions change with tilt and light direction; color is not uniformly saturated everywhere. The rule-strip/outer-border bands are often nearly straight and oblique; artwork/diamond reflections can appear curved or broken by print. Apparent direction in G2/E1 is approximately lower-left to upper-right in a top-down photograph, with substantial pose dependence. This is the visible band tangent, **not a measured grating-vector angle**.

**Scale:** millimetre-scale/coarse bands with finer striae visible in favorable photos; molecular groove pitch is unresolved. E1 at 10 s shows several alternating bright/colored bands across the approximately 55 mm rule strip. Use roughly 4–10 mm band spacing as an initial visual fitting range, not a metrology result. Fine grain in scans/compressed footage is not evidence for a sparkle field or height.

**Do categories differ?** G1/T1/E1 exhibit the same broad behavior. Pokémon, Supporter and Energy differences are primarily printed tint, protected subject and diamond/layout coverage; Energy's diamond is smaller. S1 corroborates the regional layout for a later Stadium. No category-specific physical foil technology was established. TCGL independently labels all 27 Prism Star entries `SunLava`, but this is a digital classification, not proof that every physical print run is identical.

**Does the diamond have distinct optics?** It is unquestionably a separate coverage region from the surrounding body, and its central star is opaque. The observed bands and TCGL evidence do not demonstrate a distinct diamond grating. The brighter diamond can be explained by exposed foil and different printed tint. Start with the same spatially continuous foil field across artwork, strip, diamond and border. A diamond region mask can support independent strength/roughness calibration if comparison demands it; do not assign a new pattern merely because the shape is a diamond. Whether the physical regions have different grating orientation, coating or embossing remains unresolved.

## What Holo's original assets actually contain

Source library: `research/tcgl/sun-moon-series/dataset/manifest.json` and `dataset/cards/<set>/<tcgl-id>/`. See [audit JSON](references/prism-star/tcgl-audit.json) for all 27 identities, exact variants, original dimensions, URLs, SHA-256 checks and asset availability. This research verified original front/foil file hashes against their existing manifests; it did not re-extract or replace assets.

Giratina: `sm5_58`, `GiratinaPrismStar_sm5_58_std_Prism_SunLava_Holo`. Original `_c` front is 1024×1024 RGBA; `_w` texture `sm5_wp_std_en_058` is 512×512 RGBA. The bundle URL is [TCGL sm5_en_058](https://cdn.studio-prod.pokemon.com/rainier/Content/StandaloneWindows64/1.43.0/10101_0000/sm5_en_058). Original foil PNG SHA-256: `2934aa4b387c21977b29abbcfbeaa47aa1fcbae61c3aa5f7d1f5658d60d6b6fa`. Front SHA-256: `d3a7a9384d667a895232790074a2c49cfb3b285779fab3cfe3e10f3d70966a16`.

The original square textures include horizontal padding/bleed. Existing `registered()` in `scripts/tcgl/prepare_swsh_proofs.py` uses normalized x = 145/1024…878/1024, full y, bilinear output 733×1024, no extra vertical flip. Reuse this **source registration**, not an artwork crop. Compare against the registered front before authoring any map; physical card/master aspect and source aspect must follow the existing card UV pipeline.

![Registered Giratina TCGL whiteplate; notice black outer border and excluded star/subject](../public/cards/pokemon/tcgl-sm/sm5_58/foil-controls.png)

`_w` is a near-grayscale material/whiteplate image: light values identify foil-accessible background, frame, strip, name ◇ and diamond; black values exclude subject, central star and most body/border. Intermediate values retain artwork modulation. RGB differs slightly from compression (registered R/G maximum difference 7/255 for the three Ultra Prism cases), so do not interpret these small differences as separate optical regions. Alpha is uniformly 255 in the five inspected originals (Giratina, Cyrus, Super Boost Energy, Beast Energy, Black Market). It is not a second region selector.

All 27 exact manifests have **empty `_e` etch references** (`not_applicable`), not failed downloads. The three Ultra Prism cases plus Beast Energy and Black Market also have no `_cf` cold-foil or `_cc` cast-and-cure texture. No Prism Star normal should be generated from `_w`, the front or random relief. The generic conversion block in existing evidence JSON does not mean a normal was authored: these registrations have no normal map.

Current `scripts/tcgl/import_sm.py` derives `foil = mean(RGB)/255`, `protection = 1-clamp(foil*8)`, and heuristic roughness using an inferred body term. These derivatives are digital approximations, not measured print transmission/roughness. `foil-controls.png` preserves registered RGBA. `CardMapLoader.ts` loads it, and `HolographicMaterial.ts` binds/updates its texture node, but no current optical graph samples that node. Current rendering uses the derived packed coverage/surface maps instead.

**Masks needed:** preserve/reuse the exact foil and protection geometry first. Author an additional antialiased grayscale **PNG** for the physical outer border missing from the plate, separately from opaque protection. Optional artwork/strip/diamond selectors enable tuning without changing geometry; they are unnecessary for a one-material first pass. Never copy masks across categories: Cyrus's lower diamond tip is interrupted by the Supporter box, whereas Giratina's diamond continues below its weakness/retreat strip. Existing low-resolution plates do not resolve every text glyph; inspect rule text, attack text inside the diamond, name symbols, subject tips and printed strip occlusion at high zoom. Do not threshold a rectangular white text row.

## Current shaders and proposed reuse

| Component | Existing behavior | Fit/gap |
| --- | --- | --- |
| `pokemon-sheen` in `src/materials/profiles/pokemon.ts` | Diagonal field; period 1.22, bandwidth .060, strength .58; roughness .28, metalness .76. | Current Prism placeholder, forced by `rarity == 'Prism'` before effect dispatch. Mostly straight regular sweep; no Prism regional calibration or border coverage. |
| `pokemon-water-web` | Curved optical field; period 1.24, bandwidth .065, strength .66; roughness .28, metalness .78. | Closest existing Sun & Moon optical starting point. Also `reference-pending`; profile name is not validation. |
| `PokemonDirectionalPatterns.ts` | Sheen: approximately 2.8 diagonal cycles per height-coordinate. Water Web: flow-derived local axes, approximately 3.6 cycles, synthetic incline, spacing variation and fine grain. | Reuse CPU field generation, axis encoding and caching. `scale` 700/650 controls fine grain, **not macro band count**. Fit macro spacing independently; avoid treating synthetic inclinations as physical embossed normals. |
| `HolographicMaterial.ts`, `DiffractionLayer.ts`, `PatternLayer.ts` | Light/view/tangent-dependent spectral response, neutral metal, ink transmission, double-angle grating axes and regional composition. | Reuse these optical components. No time-driven rainbow or screen-space gradients needed. |
| `CardMapLoader.ts`, map packing and pattern cache | Worker preparation, per-card coverage/protection, cached fields and optional secondary region. | Reuse lifecycle and lazy GPU realization. If regional response is needed, existing secondary coverage takes priority, preventing double energy; don't reset field phase at mask boundaries. |

### Proposed initial parameters (fitting values, not physical measurements)

Create a Prism-specific profile derived from Water Web when implementation is authorized; leave the shared Sheen/Water Web profiles unchanged. Use one field and optical model initially.

| Parameter | Starting recommendation |
| --- | --- |
| Diffraction | period 1.24, bandwidth .065, strength .60–.70, secondaryOrder .08–.11, crossWidth .45–.50, facetCoupling 1; retain spectral/neutral balance. These are Holo model units. |
| Direction/structure | Start with Water Web axis/flow; compare oblique strip/border bands to G2/E1. Fit visible band tangent and local curvature in card coordinates; do not equate photographed band tangent to `diffraction.direction`. Keep fixed phase across regions. |
| Surface | metalness .76–.80, roughness approximately .28–.34, foilReflectance .08–.10, laminate .15–.22, laminateRoughness .30–.35. Preserve black border absorption; restrained neutral reflections. |
| Relief/noise | embossStrength 0; relief, patternRelief, engraving, varnishRelief 0; glint density/strength 0. Keep optical facet inclination only as needed for moving bands; start from Water Web's facetTilt .90/reflectionCoupling .14 and reduce if the surface looks corrugated. No authored normal exists. |
| Roughness map | Prefer profile roughness initially; existing absolute roughness PNG otherwise overrides the profile baseline. Retain coverage/protection; do not mistake the import's .30/.405 heuristic for physical measurement. |
| Texture | Fit macro spacing to references before fine grain. Existing scale 650 is a compatibility starting point only; no claim of measured microscopic pitch. Ensure alias-free smooth bands at gallery/card scale. |

Physical verification for Astra: compare the three linked rotations under the same Holo pose/light controls; test front, opposite lateral tilts, grazing and strong specular angles. Require dark resting states, neutral silver between spectral bands, opaque central star/subject, reflective rule strip and black border, and coherent motion across separated foil regions. Review all corners, diamond tips and glyph boundaries. Save captures; do not mark all 27 physically verified from the three-card comparison.

## Remaining uncertainty

No calibrated microscope, fixed-light angular sweep, polarization data or manufacturing specification was found. Groove pitch, physical depth, exact axis, BRDF/roughness and regional coating differences cannot be measured from these references. Diamond-specific optics are unproven. Photo grain may include printing, compression and sleeves; do not synthesize it. Later Stadiums have a physical photo and exact digital sources, but no verified moving comparison here; Beast Energy has an audited exact map but was not physically validated. Pokémon/Trainer/Energy similarity is supported by the reviewed examples, not a guarantee for every copy or language. English conclusions must not be transferred from Japanese Prism Star photos or ordinary Prism Energy cards.
