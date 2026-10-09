# 30th shader implementation audit — 2026-10-08

## Implementation progress

- Double Rares now route through `sv-sun-pillar` in viewer and instanced gallery.
  It shares the existing SUN_PILLAR evaluator and omits the legacy star die.
  IRs retain `sv151-illustration`; the 45 etched registrations retain the exact
  mandated finish. No normal or region PNG was regenerated in this pass.
- RGB source RGBA is now loaded as `maps.foilControls`, in NoColorSpace at its
  original resolution, separately from scalar coverage. The material exposes
  and rebinds that texture. The optical evaluator does **not yet consume it**:
  assigning tint or region meanings without a source specification would guess.
- Viewer WebGPU checks exercised Double Rare 053, IR 129 and RGB R/RGB at front
  and grazing poses without errors. Captures and report are in
  `artifacts/30th-celebration/shader-routing/`. The RGB capture confirms the
  temporary rendering is still unacceptable; loading raw controls alone is not
  a finished RGB treatment.

Pikachu fireworks, Classic reflective motifs and final RGB optics remain
unfinished. No authentic specialty stock map or RGB channel specification was
found in the source export or further searches. Malie's
[source-format specification](https://malie.io/static/draft/html/pkproto_sv.html)
documents foil type/mask distinctions but not the anniversary RGB channels or
specialty stock geometry. The [MyCurio mod author's description](https://www.nexusmods.com/tcgcardshopsimulator/mods/1735)
identifies its anniversary maps as its own authored replacements; they are not
the exact TCGL assets needed here. They were not imported.

This work is partial implementation, not completion of the request for all
remaining shaders. The missing specialty inputs must be recovered before their
authentic finish can be completed. Existing secondary masks are still pending;
no additional Classic regions were invented.

Develop three anniversary specialty treatments: Pikachu fireworks, Classic foil,
and RGB Mew. Wire the other groups to distinct profiles using existing smooth
foil, SUN_PILLAR and authored-etch mechanisms. This is the implementation plan;
physical matching is still to be verified during shader development.

| Group | Count | Work to implement |
| --- | ---: | --- |
| RAINBOW: Commons + Energy | 76 | Separate anniversary rainbow profile; calibrate continuous sweep, ink transmission and border using existing spectral/PBR machinery. |
| SV_HOLO: Rares | 18 | Separate regular-holo profile for its art-window/border response. The current IR override is temporary. |
| SUN_PILLAR: Double Rares + IR | 30 | Restore treatment-specific routing; keep 12 ex and 18 IR profiles separately adjustable. Existing DoubleRareLayer and IllustrationRareLayer supply the mechanisms. Anniversary star-stock equivalence remains unverified. |
| SV_ULTRA: SIR + FUR | 12 | Use required tcglEtchedFinish with each exact offline normal. Separate region authoring for ten SIRs and two FURs; no replacement etch algorithm. |
| PIKACHU | 30 | Develop anniversary fireworks optical treatment using authentic spatial motif/direction data. Existing random fireworks cannot substitute for its stock. |
| CLASSIC_FOIL | 30 | Develop anniversary Classic treatment with required etched base, separately masked reflective motifs and gold response. Existing secondary/PBR code is reusable; microdiamond must not automatically substitute for star foil. |
| RGB | 3 | Add channel-preserving foil transport and channel-aware optical evaluation. Establish colored foil/etch semantics before finalizing the three RGB normals. |

## Confirmed code gaps

- `src/pokemon/CelebrationSurfaces.ts` forces every non-etched printing through
  `sv151-illustration`, plain structure and zero glints. Distinct source treatment
  labels do not currently produce their distinct optical responses.
- `src/materials/layers/IllustrationRareLayer.ts` already evaluates smooth
  directional spectral foil. `DoubleRareLayer.ts` implements SUN_PILLAR plus a
  separate texture-driven reflective star term. Reuse is an engineering decision,
  not evidence that anniversary optics have already been matched.
- `src/materials/patterns/PokemonPatterns.ts` places fireworks centers and rays
  using seeded random values. Its existing fireworks profiles are not authentic
  anniversary stock assets ready to activate.
- `src/assets/MapPacking.ts` copies only foil red into primary coverage. The RGB
  Mew source has distinct cyan, green, yellow and blue regions. A global tint
  cannot preserve these spatial controls. Add a separate channel-preserving
  texture path through asset preparation, binding and sampling; do not overwrite
  the packed secondary/metallic channels or guess source-channel meanings.
- Classic secondary PNGs are currently empty, so the intended additional
  reflective effect is suppressed. Authored normal geometry alone does not
  supply the complete Classic finish.

Keep viewer and gallery on the same optical implementation, with existing lazy
CPU preparation/GPU realization and caching. Keep all etched primary settings
mandated by AGENTS.md. Three specialty treatments do not require three independent
whole material classes; shared layers and targeted extensions are appropriate.

## Sources checked and bounded uncertainty

The local exact TCGL declarations establish the seven groups and counts above;
`30th-shader-printings.json` maps every printing to its task and source evidence.

The [official product page](https://www.30th.pokemon-card.com/product/m6a)
confirms separate Pikachu, historical-card and FUR groups. This is Japanese
product evidence, not English optical calibration. A [Classic Gengar owner's
report](https://www.reddit.com/r/PokemonTCG/comments/1wl2yqu/cool_little_detail_i_noticed_on_my_prime_gengar/)
describes star foil visible over the Pokemon. It is an exact-card reference lead,
not a measured stock map; the embedded moving footage was not reviewed here.
The previous RGB investigation article timed out on retrieval.

No exact shared Pikachu/Classic stock texture, RGB channel specification or
complete English moving-light reference set was recovered in this audit. These
are explicit shader-development inputs. Existing code can implement the ordinary
groups, but their calibrated parameters and physical match remain unverified.
Do not describe that as proof that parameter tuning alone will suffice.

This audit read declarations and shader code and inspected three representative
original PNGs: RGB Mew foil, Classic Pikachu front and Pikachu 023 foil. No
per-card mask audit, shader change or appearance approval was performed.
