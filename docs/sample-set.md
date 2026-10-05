# Pokémon e-Card Sample Set

Scope: the ten English Media Factory demonstration prints used at Pokémon Center New York in **August 2002**. Not the Japanese Application Pack, 2001 prototypes, May 2002 E3 pack, retail e-Reader five-card bundle, or Expedition printings.

| Printed number | Pokémon | Rarity | Type | Finish |
| --- | --- | --- | --- | --- |
| 002/093 | Hoppip | Common | Grass | Non-holo |
| 004/093 | Koffing | Common | Grass | Non-holo |
| 016/093 | Pikachu | Common | Lightning | Non-holo |
| 019/093 | Gastly | Common | Psychic | Non-holo |
| 021/093 | Machop | Common | Fighting | Non-holo |
| 042/093 | Machoke | Uncommon | Fighting | Non-holo |
| 048/093 | Chansey | Uncommon | Colorless | Non-holo |
| 074/093 | Rapidash | Rare | Fire | Non-holo |
| 083/093 | Pichu | Rare | Lightning | Non-holo |
| 088/093 | Machamp | Rare | Fighting | Non-holo |

All are Pokémon: no Trainers or Energy. `/093` is the printed denominator, **not** a 93-card checklist. Sources agree on ten cards. Rarity and numbering are checked against the actual scans; rarity does not imply foil.

## Evidence and assets

- [Bulbapedia Sample Set history and checklist](https://bulbapedia.bulbagarden.net/wiki/Sample_Set_(TCG)): New York event, distinct sample groups, English Media Factory translations, Japanese backs.
- [Poképédia checklist](https://www.pokepedia.fr/Sample_Set): independently agrees on all ten names and printed numbers. Original file pages supply alternative photographs, compared with the selected scans.
- [Pokumon event catalog](https://pokumon.com/release_event/new-york-pokemon-center-press-event/): all ten exact print pages independently classify them as non-holo and show their full fronts. Individual source URLs are in `public/cards/pokemon/sample-set/sources.json`.
- [PSA physical-card image gallery](https://www.psacard.com/psasetregistry/tcg/pokemon-sets/2002-pokemon-e-card-sample/imagegallery/340471): graded physical specimens corroborate identifiers (that gallery omits Pikachu).
- [TCGdex set metadata](https://api.tcgdex.net/v2/en/sets/sp): `sp`, E-Card, ten cards, sorting date August 1, 2002, **empty card list**. Snapshot retained; no TCGdex fronts are available. The exact event day is unverified.
- [Japanese back design reference](https://sleevenocardbehind.com/when-did-japanese-pokemon-card-backs-change/): selected new-design reverse exemplar and original image URL in `evidence.json`.

Selected fronts are untouched Pokumon JPEGs, 377–457 pixels wide and 527–635 tall. All ten were inspected for their Sample mark, three-digit `/093` number, `M-` identifier, English text and complete edge strips. Poképédia photographs are larger (roughly 550 pixels wide) but softer and less square. A ShinyBinder image labeled Sample Hoppip was rejected: its visible `112/165` and `B-02` identify Expedition. No artwork-similar substitution, artificial upscale, sharpening, retouching, front crop or repainting is used.

These assets are usable exact-print scans, **not high-resolution production-quality clean fronts**. All ten lack a higher-quality verified clean scan in the reviewed sources. Native scan softness, print texture and some baked lighting remain. The Japanese back uses a photographed example of the correct shared design, not a verified reverse of an individual Sample card; lossless PNG encoding and a registered `backCrop` remove only its external photographic background. This limitation remains explicit in the evidence.

Full front UVs retain the broad left and bottom e-Reader borders, dot codes, e logo, Sample mark, copyright and illustrator text. The rounded artwork window and alternate English attacks distinguish these from modern cards and retail Expedition. Pichu reads **Power Patch**, Machamp **Flatten / Super Iron Fist**, and Rapidash **Fire Tail**. Koffing retains the period's Grass type.

## Integration and historical opening

The existing local catalog adapter, card registry, gallery query, fixed-collection resolver, asset cache and viewer are extended. The set sits between Legendary Collection and Expedition in gallery chronology, and first in E-Card browsing. Every definition uses the existing `print-only` and Pokémon cardstock system. No diffraction, foil maps, procedural foil, emboss, etched geometry, or shader changes are introduced. Physical stock parameters are inherited rendering estimates, not measured sample manufacturing data.

The existing collection-opening screen displays all ten fixed cards in checklist order. It is labeled **demonstration collection**, not a folder sold at retail. There is no booster recipe, random seed, wrapper, pull odds, reverse variant or invented chase card. The list represents the documented demo checklist; it does **not** claim every attendee received a sealed ten-card package. Original packaging, allocation to participants and exact production/survival counts are not established. The E3 four-card pack belongs to a different group and is not used here.

To reproduce assets: run `node scripts/sample-set/fetch-sources.mjs`, then `python scripts/sample-set/prepare-assets.py` with Pillow available. Sources, native dimensions, SHA-256 hashes and transformations ship with the assets. Review captures are saved under `artifacts/sample-set/`; automated integration coverage is `tests/pokemon-sample-set.test.ts` and `scripts/sample-set/review.mjs`.
