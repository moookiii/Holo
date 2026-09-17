# Yu-Gi-Oh top-50 holo handoff

Prepared 2026-09-16 for Astra's optical-design pass.

## Selection

The batch uses the `last_month` window from YGO TCG Meta Stats, captured on 2026-09-16. Main+Side and Extra Deck tables were merged by usage percentage, existing project titles were removed, and only cards with a documented physical holo printing were retained. `Light and Darkness Ritual` and `Elfnotes: Rhapsodia of Madness` were skipped because their database records list only Common printings. The next holo-eligible cards advanced into the list, leaving exactly 50.

`public/cards/yugioh-top-holos/sources.json` is the machine-readable record. It preserves rank, usage, passcode, exact set code, exact rarity, clean-front URL, metadata URL, selected profile, and ranking source. `scripts/fetch-yugioh-top-holos.mjs` revalidates every passcode and exact set/rarity pairing before downloading.

## Asset state

- 50 clean 813 × 1185 YGOPRODeck fronts are downloaded.
- 50 title masks and 50 conservative title relief maps are registered to their exact fronts.
- Artwork, laminate, and full-print-area coverage share the standard 813 × 1185 geometry.
- All cards are registered, selectable, and included in the random holo pool.
- Current automated tests verify uniqueness, dimensions, maps, treatment diversity, and pool inclusion.

## Astra design boundary

The data chooses only rarities the selected cards demonstrably have in print: Quarter Century Secret, Starlight, Ultimate, Collector's, Prismatic Secret, Ultra, and Super. Existing profile IDs are routing labels, not acceptance of the current optical result.

Astra should compare each family against moving physical references and refine the profile plus coverage where needed. In particular, full-card Starlight, Quarter Century, and Collector's coverage currently uses a conservative shared print-area mask; it must not be mistaken for final card-specific protection. Ultimate Rare relief is limited to a safe title registration map until artwork-specific emboss is authored. No baked-rainbow asset, random sparkle, screen-space motion, or new shader shortcut was added in this preparation pass.
