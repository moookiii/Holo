# Ascended Heroes reverse-holo source audit

**October 12, 2026 update:** all 140 authentic special reverse whiteplates have
now been recovered directly from TCGL's original Unity bundles. See
[the original-client investigation](ascended-original-resources.md) and
[verified source evidence](ascended-original-evidence.json). The audit below
records the earlier processed-export discrepancy; it is not a finding that
TCGL lacks these resources. Active rendering remains unchanged.

The requested rendering correction is **not complete**. The current TCGL export
and all 636 reverse foil files were fetched again on October 10, 2026 (Pacific
time). All 140 special-reverse PNGs **and** their original packed textures still
duplicate the corresponding ordinary reverse. Separate URLs and long-form
variant IDs do not supply separate symbol geometry. No substitute motifs, fronts,
normals, shader changes or temporary rendering patches were introduced.

`ascended-reverse-audit.json` records every one of the 318 reverse printings:
exact identity, intended physical finish, individual product reference, current
PNG/texture URLs, dimensions, byte and decoded-pixel hashes, and unchanged
renderer/front hashes. The audit distinguishes 178 ordinary reverses (140
Pokemon Energy-symbol designs plus 38 plain Trainer/Energy reverses) from 140
special reverses. Ordinary Pokemon designs follow the card's own type, including
Colorless and Dragon; the renderer does not globally assign Fighting symbols.

The physical checklist uses [individual TCGplayer product listings linked by
MasterThis](https://masterthis.app/sets/ascended-heroes), cross-checked against
[the physical set guide](https://www.pokebeach.com/2026/01/ascended-heroes-to-feature-multiple-reverse-holo-styles).
Assignments are explicit per card, not extrapolated from evolution lines:

| Special design | Cards | Inspected representative |
| --- | ---: | --- |
| Poke Ball | 34 | Erika's Oddish 001 |
| Friend Ball | 23 | Chikorita 008 |
| Love Ball | 25 | Wurmple 011 |
| Quick Ball | 22 | Grubbin 017 |
| Team Rocket | 10 | Team Rocket's Tarountula 018 |
| Dusk Ball | 26 | Groudon 108 |

The six exact-print product images visibly show their assigned special symbols,
while both paired TCGL foil maps show Energy symbols. Original product reference
images and fresh source files are preserved under
`research/tcgl/ascended-reverses/`; comparison capture:
`artifacts/ascended-reverses/source-comparison.jpg`. Product photographs establish
the source discrepancy and intended shape, but are not isolated, registered foil
textures or calibrated moving-light measurements. They were not thresholded into
invented foil masks. Special metallic/diffraction behavior has not been visually
validated in the renderer because its authentic geometry is missing.

The existing material uses the supplied grayscale foil asset directly; there is
no procedural Fighting-symbol shader to repair. Assigning a differently named
material cannot change the duplicated Energy geometry. The previous import
also forced `special-reverse` to `standard_reverse`. That unconditional override
has been removed, and `mega_series.convert` now checks paired special sources
**before any conversion writes or cache returns**, rejecting known duplicate
assets instead of publishing them as a completed import. Existing rendering,
pack collation, normal holos and gallery behavior remain unchanged.

Reproduce with `python scripts/tcgl/audit_ascended_reverses.py --refresh`.
`--require-ready` deliberately exits unsuccessfully while sources or physical
visual validation remain unresolved. Run
`node --experimental-strip-types --loader ./scripts/test-ts-loader.mjs --test tests/ascended-reverse-audit.test.ts`
for exhaustive printing/assignment/immutable-asset checks and conversion-guard
regressions. Passing audit tests proves the findings, **not** completed finishes.
All eight targeted audit and Mega-series regression tests passed, including
pack collation and gallery coverage. The repository's TypeScript test loader is
required because existing modules use extensionless imports.

Completion requires authentic special foil assets (corrected TCGL PNG/texture
exports or independently authored, reviewed exact-card foil maps), followed by
card-specific registration and live angular review. All 140 unavailable source
pairings are individually listed in the JSON, rather than silently substituted.
