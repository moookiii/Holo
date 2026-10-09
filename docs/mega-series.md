# Mega Evolution series integration

The six published English TCGL checklists are integrated into the existing set
browser, gallery, single-card viewer and exact-next-pack opener. The shared SV
TCGL catalog/surface code now also accepts series metadata; no separate viewer,
collator or GPU loading system was introduced.

| Expansion | Holo ID / TCGL key | Release | Cards | Printings | Etched normals |
| --- | --- | --- | ---: | ---: | ---: |
| Mega Evolution | me01 / me1 | 2025-09-26 | 188 | 310 | 44 |
| Phantasmal Flames | me02 / me2 | 2025-11-14 | 130 | 214 | 29 |
| Ascended Heroes | me02.5 / me2-5 | 2026-01-30 | 295 | 613 | 64 |
| Perfect Order | me03 / me3 | 2026-03-27 | 124 | 203 | 29 |
| Chaos Rising | me04 / me4 | 2026-05-22 | 122 | 198 | 30 |
| Pitch Black | me05 / me5 | 2026-07-17 | 120 | 194 | 31 |
| **Expansion total** | | | **979** | **1,732** | **227** |

The eight exact Mega Basic Energy cards add 16 catalog printings, with their
nonfoil versions used in packs. Anniversary Energy IDs 9–16 remain owned by the
existing anniversary catalog. New expansion sets appear chronologically before
the anniversary products.

## Sources and conversion

The immutable source index is
`https://cdn.malie.io/file/malie-io/tcgl/export/index.json`; all six English export
payloads resolve through `v0.1.9.13/<TCGL-key>.en-US.json`. Untouched export bytes,
URLs and SHA-256 hashes are in `research/tcgl/mega-series/<key>/`. Every card has
its own untouched front, foil and available etch under `research/tcgl/<card-id>/`
and `source.json` with exact export entry, TCGL card ID, long-form variant ID,
dimensions and hashes. Original fronts are copied unchanged to
`public/cards/pokemon/tcgl-me/<set>/`.

Fronts and etches are 733×1024 RGBA; foil maps are normally 367×512. All authored
masks are PNGs. Each of the 227 own-card etches uses the established offline
Sylveon conversion in `convert_151_set.py`: inverted mean RGB, full UV domain,
bilinear resize to 1800×2475, no flip/crop/offset, continuous-field Scharr
derivatives (`CV_32F`, scale 1/32), gain 1.03, protection applied to X/Y slopes
after differentiation, normalized OpenGL +Y and opaque RGB PNG encoding. No
noise, groove redraw, height emboss or runtime normal generation is active.

Every etched registration uses `prismatic_sir_texture` and `tcglEtchedFinish`:
normalScale 1, embossStrength 0, absolute roughness, no alpha emboss, prescribed
Espeon/Sylveon primary response, zero procedural relief/facets/glints, and
diffraction following the authored normal. Roughness uses each card's TCGL-derived
body mask: background 0.30 and body 0.405. No secondary microdiamond region was
invented where the export does not identify a separate region. Body evidence is
saved separately. Existing smooth rarity profiles handle regular/reverse holo,
Double Rare and Illustration Rare printings.

The completed PNGs replace missing Mega-series material registrations; no
previous card's geometry or masks were reused. Per-print evidence records final
dimensions, hashes, source pairing, conversion parameters and map paths. Source
family review covers front/foil/etch alignment, polarity, border and full-card UVs.
Deterministic batch audits cover every printing without manually tuning every
card. Narrow printed glyphs use the established source-driven protection method.

## Genuine source blocker

All 140 Ascended Heroes `ph2` foil PNGs are byte-identical to their own ordinary
`ph` foil PNGs. Their separate long-form identities and URLs are preserved as
`special-reverse`; the missing assigned special patterns are not synthesized or
given invented Ball identities. The original 512×512 packed TCGL texture for
Bulbasaur `ph2` was also inspected and contains the ordinary Grass motif.
`special-reverse-source-issue.json` and the complete pair/hash list in
`me2-5/batch-validation.json` document this blocker. The pack picker and printing
source notes disclose it. Correct motif geometry requires corrected TCGL assets.

## Packs and evidence limits

There are 21 sourced English wrapper designs, all cropped as upright PNGs to the
printed body and seals, with no scaling. Exact originals, crop coordinates,
dimensions and hashes are preserved in `research/tcgl/mega-series/wrappers/`.
Native-resolution reviews and all six live picker captures are saved.

`MegaRecipes.ts` contains separate recipes for these products; it does not call
the Scarlet & Violet recipe helper. Each opening contains four Commons, three
Uncommons, two reverse/replacement slots, the guaranteed rare/hit slot, and one
exact Mega Basic Energy: 11 game cards. The physical code insert is excluded from
Holo's existing game-card simulation; no redeemable code is fabricated.

The product count/foil guarantee comes from [Pokémon Support](https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack).
Per-set [TCGplayer pull-rate articles](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Mega-Evolution-Pull-Rates/40cbeedc-21ce-473b-aef1-74e3969d9f91/)
are linked individually in each recipe. Their measured marginals are estimates,
not official factory odds. Uniform cards within pools, unique Common/Uncommon
groups and independent replacement rolls are explicit modeling assumptions;
factory print-sheet correlations and per-card weights are unknown. Gold's
second-reverse placement has secondary support from
[Folio](https://folio.fyi/blog/are-gold-pokemon-cards-real); the primary rate
articles do not establish that slot independently.

Ascended Heroes preserves exact special-print eligibility in the second reverse
slot, with plain Trainer/Energy fallback. Its three-Mega-Attack-Rare plus
seven-SIR [God configuration](https://www.pokebeach.com/2026/01/ascended-heroes-set-guide-full-set-list-god-packs-reverse-holos-product-lineup-and-more)
is separately selectable and adds Basic Energy under the product's usual energy
rule. Occurrence frequency and factory combinations are unknown, so it is
excluded from random pack odds. Configuration order and within-pool selections
are modeled, rather than a claimed fixed physical replay.

## Astra High work reserved

Seven Mega Attack Rares (Ascended Heroes 265–271) and eight Mega Hyper Rares
(Mega Evolution 187–188; Phantasmal Flames 130; Ascended Heroes 294–295;
Perfect Order 124; Chaos Rising 122; Pitch Black 120) retain all exact TCGL
assets and explicitly deferred optical status. Their current smooth/etched
reference material is a technical preview. Astra High still needs to establish
the physical MAR attack-letter foil response and MHR gold/colored metallic
response, highlight behavior and diffraction against exact-card angled media.
These 15 finishes have not been marked physically final.

## Verification and remaining uncertainty

The successful ten-viewer vertical slice and working booster report gated bulk
acquisition. Bounded, retrying downloads and signature/hash-based conversion
caches were reused; every completed batch passed decode, dimensions, pairing,
source/output hash and normal registration checks. The focused Mega, adapter,
Energy and special-pack run passed all 15 tests. All 21 wrappers collate exact
eligible printings in deterministic tests. Live integration passed five extra
viewers, gallery navigation, all six 11-card pack openings, and a separate God
configuration, without browser errors or missing local assets. The production
build passed; Vite retains its large-main-chunk warning.

The broader optional regression run found two existing stale expectations:
`gallery.test.ts` expects the old authored Base Set Alakazam ID, and
`pokemon.test.ts` expects the old Paldea Tyranitar SVG maps rather than its
existing TCGL registration. Those unrelated behaviors and tests were not changed.

`artifacts/mega-series/finish-review/` compares Mega Venusaur ex 177/132 with
Espeon 155 and final Sylveon 156 under identical Studio poses, Low key, Moving
light and Skim controls. The [exact-print angled photograph](https://cardcollectorsuk.com/products/pokemon-mega-venusaur-ex-177-132-special-illustration-rare-meg-evolution-new)
confirms groove layout and smooth protected text. No obvious registration drift,
inversion or rectangular text patches appeared in the reviewed render samples.
TCGL encodes geometry, not measured depth; photographs, sleeves and uncontrolled
lighting do not establish calibrated groove depth or foil intensity. Automated
body/protection masks and unseparated secondary regions remain source-derived
estimates, not individual hand-traced physical reconstructions.

Task changes are limited to the shared catalog/adapter variant integration,
generated Mega catalog/surfaces, Mega recipes/wrappers, acquisition/conversion
evidence, targeted tests and review scripts. Existing card fronts, masks and
material response settings for unrelated cards were not modified; pre-existing
workspace changes were left intact.
