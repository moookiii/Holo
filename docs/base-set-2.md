# Base Set 2

Base Set 2 is `base4` (TCGdex's `base2` is Jungle). All 130 original English
fronts and metadata are local. The checklist contains 20 holo rares, 20 non-holo
rares, 42 uncommons, 42 non-Energy commons and six Basic Energy. Rare Trainers
remain in the rare pool; Double Colorless Energy remains uncommon. There is no
Machamp, first-edition print, reverse foil, W-stamp or promotional variant.
The original fronts retain the printed Base Set 2 symbol and copyright line.

Regenerate the provider snapshot and SHA-256 front manifest with
`node scripts/base-set-2/fetch-catalog.mjs`. The source is the actual Base Set 2
checklist, not a union of Base and Jungle. `BaseSet2Catalog.ts` provides exact
identities; `BaseSet2Cards.ts` and `WotcCards.ts` share those identities between
the card picker and pack preparation. The Base-series selector inserts audited
local sets in release order through a shared loop.

## Product and wrappers

`base4-english-retail`, version 1, contains five non-Energy commons, two in-set
Basic Energy, three uncommons and one rare. The rare slot is 2/3 non-holo or
1/3 holo. These are estimated marginal odds with uniform selection within
rarity pools, not a recovered factory sheet sequence or box simulation.
Common and uncommon slots avoid duplicates; the two Energy can repeat.
Missing checklist entries fail preparation instead of redistributing odds.
Product, recipe version, eligible cards and seed fix the contents. Wrapper
design does not alter the random stream.

All four genuine Mewtwo, Pidgeot, Raichu and Gyarados fronts and matching-color
back photographs are local. `scripts/base-set-2/wrapper-sources.json` records
sources and hashes. The complete Raichu front, including both silver crimps, was
supplied by the user and is retained by `fetch-wrappers.mjs` when remote assets
are refreshed. Per-design `back` and
`backBounds` extend the existing shared product definition. Back photographs
are cropped by the existing cached wrapper path; Gyarados's long upper crimp
is cropped to the short-crimp front. These are photographs of different packs,
so folds, crimp lengths and print registration are not a matching physical pair.

## Reused protection

Fifteen Base Set and five Jungle subject masks are reused, not retraced.
`mask-sources.json` names each exact source print. Source-to-reprint affine
registrations are in `registration.json`: Base subjects generally shrink about
4%, whereas Jungle artwork needs small translations. `create-maps.py` transforms
existing coverage/protection into 1200 × 1650 PNGs, keeping reprint picture rails
separate from subject scaling. Charizard's partially transmissive flame coverage
survives. There are no new height or normal maps.

`check-mask-registration.py` measures matching artwork landmarks. The retained
median registration residuals are subpixel at the 600 × 825 front resolution.
Full-size boundary overlays are generated under
`artifacts/base-set-2/registered/`. Scan antialiasing and very fine printed edges
limit precision; source cutout quirks remain inherited.

## Registered early Cosmos

All 20 holos use `pokemon-base-set-2-cosmos` / `base-set-2-cosmos`, independently
of Base/Jungle/Fossil starlight and the generic later Cosmos profiles.
`register-cosmos.py` measures 9,003 visible dot/orb candidates in the exact
TCGdex artwork using multiscale blob positions and local colored boundaries,
restricted by existing foil/protection. The delivered `*-cosmos.png` files are
**filled motifs**, not cutouts. Pink outlines exist only in diagnostic overlays.
The dot maps never subtract from foil coverage or subject protection.

Each motif keeps its measured location, footprint, irregular edge and internal
gaps. `cosmos-registration.json` records source-space centers and radii.
The runtime samples these PNGs in full-card coordinates, with the image-to-UV
vertical flip handled once. Seed changes optical orientation, not placement or
size; the scale control cannot redistribute the dots. No procedural dots are
added when a motif image is absent. Both viewer and pack preparation preserve
the full-resolution motif input.

The material gives each connected dot a stable optical orientation and subtle
fixed internal granularity. It has no procedural star rays, imposed spiral,
random sparkle, emboss, etched relief or reverse treatment. Clean fronts remain
byte-identical; foil optics, motifs and protection are separate assets.

Position and scale follow visible scan marks. Very faint marks, overlapping
marks and subpixel specks remain limited by the source scan and the automated
measurement. The unmodified fronts also retain their photographed highlights.
Optical strength, inclination and roughness are visual estimates rather than
physical measurements; the profile retains `reference-pending` status.

## Validation

- `tests/pokemon-base-set-2.test.ts`: exact identities, hashes, rarity counts,
  local catalog, all 20 exact treatments, no reverse variants, 3,000 seeded
  packs, full eligibility, incomplete-data rejection, and motif support/UV
  invariance across seed and scale changes.
- `scripts/base-set-2-browser-check.mjs`: all four wrapper choices, both rare
  outcomes, 11-card preparation, reveal, and uploaded pack motif registration.
- `scripts/base-set-2-holo-check.mjs`: all 20 cards at front/left/right angles,
  optical contribution, stability at rest, and pixelwise comparison of uploaded
  field support to its PNG. `BASE_REVIEW=1` adds Strip, Soft and Low key lighting.
- `scripts/base-set-2-performance.mjs`: compares Fossil and Base Set 2 in the
  same browser, including field generation, viewer, preparation, tear/open and
  reveal. Final local WebGL measurements: ~5.5–5.6 ms median frames for both;
  opening p95 6.8 ms for both; registered Cosmos generation ~65–75 ms versus
  ~1.27–1.32 s for Fossil. Cosmos field buffers total 6.0 MB versus 24.0 MB.
  These are local measurements, not a guarantee for every device. Worker
  generation, bounded caches, CPU preparation and GPU realization stay intact.

The production build and targeted early-set tests pass. The full suite also
exposes unrelated existing failures: four profile-codec boolean validation
failures, two image-fallback expectation failures, and four Prismatic asset
hash mismatches in the pre-existing working-tree edits. Those files were not
changed for this integration.

Sources: [TCGdex checklist](https://api.tcgdex.net/v2/en/sets/base4),
[Base Set 2 print and wrapper reference](https://bulbapedia.bulbagarden.net/wiki/Base_Set_2_(TCG)),
[retail pack contents reference](https://www.whatnot.com/listing/TGlzdGluZ05vZGU6MTc3OTQxOTI2NQ%3D%3D).
Exact wrapper source URLs are recorded in the asset manifest above.
