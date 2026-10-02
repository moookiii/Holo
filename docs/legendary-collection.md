# English Legendary Collection

110 numbered retail cards and 220 independently resolved print definitions:
19 regular holos, 91 regular nonholos, and 110 reverse holos. Box toppers and
theme-deck-exclusive nonholo versions of the numbered holo rares are excluded.
TCGdex uses `lc`; Pokémon TCG API uses `base6` for this set.

## Artwork protection and regular foil

Existing PNG cutouts are referenced directly, with no modifications to their
source sets:

| LC numbers | Reused artwork protection |
| --- | --- |
| 1, 3, 12, 15, 17, 18 | Base Set Alakazam, Charizard, Gyarados, Machamp, Ninetales, Venusaur |
| 10, 14 | Jungle Flareon, Jolteon |
| 2, 11, 13, 16, 19 | Fossil Articuno, Gengar, Hitmonlee, Muk, Zapdos |
| 4, 5, 7, 8 | Team Rocket Dark Blastoise, Dark Dragonite, Dark Raichu, Dark Slowbro |

Dark Persian (6) and Dark Vaporeon (9) use the user's green subject contours,
stored in `scripts/legendary-collection/traces`. The contour generator makes
separate coverage, protection, and laminate PNGs, excluding the evolution badge.
No additional subject cutouts are pending.

All 19 regular holos have LC-specific registered motif PNGs. Source-set motif
maps are deliberately not inherited along with the artwork cutouts. The
hand-authored placement manifest distinguishes filled eight-ray stars and
hollow four-point stars. Placement is registered to the supplied LC scans;
small faint marks whose foil identity is ambiguous are omitted. This is a
scan-specific reconstruction, not a claim that every physical copy shares
the same foil sheet registration. The existing vintage star rendering and
lazy CPU/GPU preparation infrastructure handle these maps.

Regenerate motifs with `python scripts/legendary-collection/create-holo-stars.py`.
Regenerate the two subject cutouts separately with `create-holo-cutouts.py`.
Review overlays are written to `artifacts/legendary-collection-cutouts`.

## Reverse prints

All 110 use the current `pokemon-legendary-reverse` / `legendary-fireworks`
implementation. Category-specific PNG coverage excludes the illustration
window; per-card protection estimates preserve printed ink. The existing
Eevee front, protection and definition identity are retained. Reverse foil
appearance and refinement of ink protection are deferred to the dedicated
visual pass. No reverse shader tuning is part of this change.

## Products and assets

The four user-supplied pack fronts are stored under `public/packs/pokemon`:
starters, eeveelutions, birds and Mewtwo/Alakazam/Machamp. The existing shared
LC rear and logo are retained. The symbol comes from Pokémon TCG API's base6
image assets. Front and catalog provenance is recorded in the set's
`sources.json`; the fetch script uses TCGdex's English LC endpoint.

`LegendaryCollectionProduct.ts` supplies the ordinary data-driven collator:
six commons, three uncommons, one rare slot and one guaranteed reverse slot.
The one-in-three regular holo probability is an estimate, as documented in
the product definition; reverse selection is uniform over eligible cards.
Product identity, recipe version and seed use the existing deterministic
architecture. There are no LC branches in generic pack-opening code.

## Checks

The LC tests verify all 110 numbers, 220 definitions, cutout reuse, independent
LC motifs, asset resolution, catalog/gallery inclusion and deterministic
11-card packs for every wrapper. The browser check exercises normal pack
selection/opening and renders Dark Vaporeon and Gengar.
