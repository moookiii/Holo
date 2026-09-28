# Fossil

The English Fossil checklist contains 62 distinct retail prints: 15 holo rares
(1-15), 15 non-holo rares (16-30), 16 uncommons and 16 commons. Trainer rarities
come from the checklist rather than a contiguous number range. Original fronts
and metadata are snapshotted from TCGdex in `public/cards/pokemon/fossil`; source
URLs and SHA-256 hashes are recorded in `sources.json`. Regenerate with
`node scripts/fossil/fetch-catalog.mjs`.

Fossil appears immediately after Jungle in the Base series. Its explicit WotC
product definition produces seven unique commons, three unique uncommons and
one rare slot, with no Energy or reverse slot. The rare slot uses an estimated
one-in-three holo rate and uniform selection within each rare pool. Wrapper
choice does not change contents for a given seed.

All 15 holo rares use the existing Base Set star material. Supplied green-outline
annotations are retained in `scripts/fossil/traces` and rasterized by
`create-cutout-maps.py` into separate PNG foil, protection and laminate maps.
Small annotation gaps are explicitly closed; enclosed background gaps stay foil.
The untouched TCGdex originals guide 123 individually registered star placements
in `scripts/wotc/star-placements.json`. No random stars or raised relief are added.
Viewer cards and booster pulls share these maps. Non-holo prints stay print-only.

Lapras, Aerodactyl and Zapdos use the user's supplied original wrapper fronts
and shared photographed back, copied unchanged into `public/packs/pokemon`.
Their native front aspect ratios determine pack width. Printed seals are retained
without adding duplicate procedural seals. The Fossil logo is from TCGdex.

Validation: `tests/pokemon-fossil.test.ts` checks the complete checklist, asset
hashes, separate prints, authored holo maps, local catalog loading and 3,000
deterministic pack seeds. `scripts/fossil-browser-check.mjs` checks set order,
all three pack choices, both rare outcomes, and original wrapper preparation. `scripts/fossil-holo-check.mjs` checks all
15 holos at three angles with stationary optical response.

Sources: https://api.tcgdex.net/v2/en/sets/base3 and
https://www.pojo.com/pokemon-fossil-expansion-set-price-guide/
