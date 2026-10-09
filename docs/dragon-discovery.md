# McDonald's Dragon Discovery

English M24EN / TCGdex `2024sv`, displayed within Scarlet & Violet. The U.S. launch
date is January 21, 2025, placing the set after Prismatic Evolutions and before
Journey Together. TCGdex's December 4, 2024 date describes the earlier French launch.

All 15 exact English fronts are local PNGs. Seven cards are confetti holos:
002 Pikachu, 003 Miraidon, 008 Koraidon, 010 Hydreigon, 011 Roaring Moon,
012 Dragonite and 015 Drampa. The remaining eight have only non-holo printings.
No reverse, Energy, expansion-print substitute or extra variant is registered.

`scripts/prepare-dragon-discovery.py` downloads metadata from TCGdex and exact
M24EN scans from the corresponding TCGplayer product IDs. Each public source JSON
records the original URL, product ID, collector number, variant, dimensions,
original SHA-256 and delivered PNG SHA-256. JPEGs are decoded to PNG without
cropping, rescaling or retouching; original source files are preserved locally in
`research/dragon-discovery/` (ignored by Git). The scans vary in resolution and
contain photographed confetti on holo prints. **Animated foil is deferred** until
clean exact-print fronts and subject/print protections are available. All current
definitions use print-only, and holo definitions carry `treatmentStatus: deferred`.
The English TCGL index has no McDonald's export; no etch or relief is fabricated.

The Pikachu/Dragonite booster uses an unobstructed English wrapper image from
Cardtreasure, preserved alongside the original sources. The former PokeBeach
photograph had a sticker covering part of the left edge. Four registered corners
align the wrapper upright into a tight 514x956 RGB PNG, removing the white source
background and tapered side gaps. Output proportions come from the mean measured
wrapper edge lengths. The printed artwork, text, top crimp and bottom silver seal
are retained; no missing artwork is synthesized. `pack-source.json` records the
source hash, corners, perspective transform and output hash. Regenerate only this
asset with `python scripts/prepare-dragon-discovery.py --pack-only`.

Opening uses four cards, one holo plus three non-holos. Uniform selection within
each pool and non-holo uniqueness are estimates, not measured factory collation.
The recipe requires the complete 15-card pool and rejects incomplete metadata.

Validation: the catalog/hash, 200 seeded pack collations, incomplete-pool rejection,
variant rejection, offline adapter and chronological picker tests pass. Browser
review verifies all 15 filtered cards, all eight visible cards ready with no pending
loads, four exact pack cards, wrapper picker, pack preparation and reveal summary,
with no browser errors. Captures and report are saved under
`artifacts/dragon-discovery/browser/`. The Vite production bundle passes. The full
`npm run build` remains blocked by unrelated existing `tcglVariantId` typing errors
in `src/pokemon/data/mep-tcgl.generated.ts`. No existing card assets or optics were
changed. Physical confetti calibration remains unverified and deferred.

Sources:

- [McDonald's official U.S. launch](https://corporate.mcdonalds.com/corpmcd/our-stories/article/pokemon-themed-happy-meal.html)
- [Checklist, confetti description and pack photograph](https://www.pokebeach.com/2025/01/mcdonalds-dragon-discovery-now-available-in-the-u-s-full-set-list-earn-pocket-rewards)
- [TCGdex metadata](https://api.tcgdex.net/v2/en/sets/2024sv)
- [Unobstructed English wrapper source](https://cardtreasure.ch/products/mcdonalds-dragon-discovery-booster-pokemon)
