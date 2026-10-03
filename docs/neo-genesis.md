# Neo Genesis

The local English `neo1` catalog contains all 111 TCGdex numbered cards, downloaded without image edits. Cards 1–19 are holo rares; the remaining cards are non-holo. `sources.json` records front URLs and SHA-256 hashes. The catalog uses first-edition fronts, matching the previous Wizards sets.

Sources: [TCGdex checklist](https://tcgdex.net/database/neo-neo/neo1-neo-genesis), [TCGdex API](https://api.tcgdex.net/v2/en/sets/neo1), and [PSA's Neo Genesis set article](https://www.psacard.com/articles/articleview/9409/public/locales). PSA documents the December 16, 2000 release, four wrapper designs, and seven common / three uncommon / one rare pack composition. The simulator uses an estimated one-in-three holo rate and uniform selection within rarity pools, not exact factory collation. Basic Energy cards participate in the common pool; Darkness and Recycle Energy participate in the non-holo rare pool.

## Surfaces

The 18 newly authored holos use the existing `pokemon-base-set-2-cosmos` material. Lugia #9 resolves to the existing `lugia-neo-genesis` treatment when opening packs, as requested; it is not regenerated or duplicated in the gallery.

`create-holo-maps.py` rasterizes the supplied red/green subject outlines into independent 1200 × 1650 PNG protection maps. Separate user-supplied basic and evolved foil windows preserve the revised picture frame and evolution badge. Kingdra and Skarmory's enclosed background gaps remain foil. Metal Energy has its larger artwork window and protected central symbol. No mark-up is used as the displayed card front.

`register-cosmos.py` measures local optical flecks on each clean 600 × 825 master. Broad illumination is removed from the detection signal so soft printed rays and glows do not become large circles; detection runs before window clipping to avoid false dots along the frame. Subject protection and window clearance constrain candidates. Each recorded center/radius becomes a filled, antialiased PNG motif; these are optical maps, not relief. `cosmos-registration.json` and `cosmos-corrections.json` preserve reproducibility, including reviewed exclusions for Ampharos/Bellossom light blooms and small explicit Togetic flecks. Regeneration requires Python, Pillow, NumPy, OpenCV, SciPy, and scikit-image.

The four supplied pack front photographs and supplied pack back are copied unchanged and hash-recorded in `wrapper-sources.json`. Photographs retain their original edition markings; pack contents use the first-edition catalog.

## Verification

- `npm run build`
- `node --experimental-strip-types --test tests/pokemon-neo-genesis.test.ts`
- `node scripts/neo-genesis-holo-review.mjs` — all 18 new holos, front/tilt/strip lighting.
- `node scripts/neo-genesis-browser-check.mjs` — all four wrapper choices, pack preparation/open/reveal, existing Lugia, new holos, and a non-holo rare.

Mask overlays and rendered review images are written under `artifacts/neo-genesis*`.
