# Bulk holo card sources

Added 2026-09-16. Every title is new to the project. The batch uses existing optical profiles and only shared layout masks.

## Pokémon — Expedition Base Set reverse holo (6)

Dual Ball 139, Energy Removal 2 140, Energy Restore 141, Master Ball 143, Pokémon Reversal 146, and Power Charge 147 use clean exact-printing fronts from `images.pokemontcg.io`. Each corresponding `api.tcgdex.net/v2/en/cards/ecard1-{number}` record reports both `normal: true` and `reverse: true`. They share `pokemon-ereader-trainer/reverse.svg` and the existing `pokemon-e-reader` profile.

## Yu-Gi-Oh! — Ultra Rare (21)

Twenty new cards were added: Ash Blossom & Joyous Spring, Nibiru the Primal Being, Forbidden Droplet, Triple Tactics Talent, Pot of Prosperity, Evenly Matched, Called by the Grave, Lightning Storm, Baronne de Fleur, Droll & Lock Bird, Ghost Belle & Haunted Mansion, Ghost Ogre & Snow Rabbit, Dimension Shifter, Borreload Savage Dragon, Apollousa Bow of the Goddess, Accesscode Talker, Knightmare Unicorn, Underworld Goddess of the Closed World, Mudragon of the Swamp, and Garura Wings of Resonant Life.

Each registered set code is listed as Ultra Rare in its YGOPRODeck `card_sets` record. All fronts are complete 813 × 1185 clean standard-layout images. They share `ygo-ultra` and a deliberately inset 617 × 617 artwork mask, preventing foil from crossing the printed picture boundary. Each card also has title-shaped metallic and recessed-height maps extracted from its exact front, giving the real Ultra Rare gold name treatment without turning the whole name bar metallic.

Dark Ruler No More was also replaced with the complete 813 × 1185 clean front. Its prior low-resolution cropped scan was removed.

## Magic: The Gathering — Magic 2011 traditional foil (17)

Baneslayer Angel 7, Cultivate 168, Day of Judgment 12, Doom Blade 95, Duress 96, Elvish Archdruid 171, Fauna Shaman 172, Frost Titan 55, Grave Titan 97, Inferno Titan 146, Mana Leak 62, Nantuko Shade 106, Negate 68, Obstinate Baloth 188, Preordain 70, Primeval Titan 192, and Reassembling Skeleton 112 use their exact Magic 2011 Scryfall PNGs. Each linked Scryfall card record has `layout: normal`, `frame: 2003`, and both `nonfoil` and `foil` finishes. They share the existing standard-frame maps and `mtg-traditional` profile. The foil mask is one continuous full-height sheet aligned to the scanned card edge with four rounded corners; the earlier second artwork rectangle was removed because it produced short, inverted and square-looking cutouts.

## Skipped candidates

- Four initially considered MTG cards were removed because their names already existed in the project.
- Six Sword & Shield Pokémon holos were removed because their subjects would require card-specific masks.
- Yu-Gi-Oh! candidates without a documented exact foil set code or standard-layout clean front were held back.
- Pokémon Full Art, VMAX, Gold and illustration-specific treatments, plus MTG etched, textured, showcase and specialty foils, were excluded as unsupported or bespoke.
