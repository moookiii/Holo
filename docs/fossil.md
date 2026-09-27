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

At the user's request, all holo rendering, cutouts and star placements are
deferred. The exact holo fronts remain eligible pulls and distinct catalog
entries, marked with deferred treatment status and rendered print-only. No
shader fallback, procedural foil or mask is assigned to them.

Lapras, Aerodactyl and Zapdos wrapper choices currently use the existing generic
packaging fallback, visibly labelled artwork pending. TCGdex's set response
does not supply wrapper paths; no alternative wrapper scans or back were
supplied for this pass. The Fossil logo is the original TCGdex logo.

Validation: `tests/pokemon-fossil.test.ts` checks the complete checklist, asset
hashes, separate prints, deferred rendering, local catalog loading and 3,000
deterministic pack seeds. `scripts/fossil-browser-check.mjs` checks set order,
all three pack choices, both rare outcomes, and placeholder wrapper preparation.

Sources: https://api.tcgdex.net/v2/en/sets/base3 and
https://www.pojo.com/pokemon-fossil-expansion-set-price-guide/
