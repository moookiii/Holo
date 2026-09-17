# Bulk holo card sources

Added 2026-09-16. Every title is new to the project. The batch uses existing optical profiles; it adds only one reusable card-layout mask, for Expedition Trainer reverse holos.

## Pokémon — Expedition Base Set reverse holo (6)

Dual Ball 139, Energy Removal 2 140, Energy Restore 141, Master Ball 143, Pokémon Reversal 146, and Power Charge 147 use clean exact-printing fronts from `images.pokemontcg.io`. Each corresponding `api.tcgdex.net/v2/en/cards/ecard1-{number}` record reports both `normal: true` and `reverse: true`. They share `pokemon-ereader-trainer/reverse.svg` and the existing `pokemon-e-reader` profile.

## Yu-Gi-Oh! — Super Rare (1)

Dark Ruler No More uses the clean SDCH-EN027 Common scan as the no-glare source for the same artwork and standard Spell layout. The YGOPRODeck `card_sets` record verifies RA01-EN060 in 25th Anniversary Rarity Collection as Super Rare. It uses the existing `ygo-super` profile and shared standard artwork mask.

## Magic: The Gathering — Magic 2011 traditional foil (17)

Baneslayer Angel 7, Cultivate 168, Day of Judgment 12, Doom Blade 95, Duress 96, Elvish Archdruid 171, Fauna Shaman 172, Frost Titan 55, Grave Titan 97, Inferno Titan 146, Mana Leak 62, Nantuko Shade 106, Negate 68, Obstinate Baloth 188, Preordain 70, Primeval Titan 192, and Reassembling Skeleton 112 use their exact Magic 2011 Scryfall PNGs. Each linked Scryfall card record has `layout: normal`, `frame: 2003`, and both `nonfoil` and `foil` finishes. They share the existing standard-frame maps and `mtg-traditional` profile.

## Skipped candidates

- Four initially considered MTG cards were removed because their names already existed in the project.
- Six Sword & Shield Pokémon holos were removed because their subjects would require card-specific masks.
- Six early Yu-Gi-Oh! candidates were removed because generic replica renders could not establish an exact compatible source printing.
- Additional Yu-Gi-Oh! Super Rare candidates were held back where a clean, identified, no-glare source was not readily available.
- Pokémon Full Art, VMAX, Gold and illustration-specific treatments, plus MTG etched, textured, showcase and specialty foils, were excluded as unsupported or bespoke.
