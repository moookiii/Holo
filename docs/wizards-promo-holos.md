# Wizards promo holos

Added the requested TCGdex `basep` prints: Mew 9, Meowth 10, Eevee 11,
Venusaur 13, Cool Porygon 15, Dark Persian 17, Birthday Pikachu 24,
Entei 34, and Pichu 35. Clean front PNGs are downloaded unchanged from
TCGdex; `holo-sources.json` records metadata URLs, image URLs, and hashes.
The user-supplied marked cutouts are retained in `scripts/wizards-holos/traces`.

All nine use the existing Base Set 2 registered Cosmos optics with separate
1200 × 1650 PNG coverage, print protection, and filled dot maps. Dots are
registered to each scan, with continuous filled disks rather than hollow or
brightness-shaped masks. No relief is inferred from the photographed light.

The first seven cards have artwork-window coverage. Mew's tail openings,
Meowth's arm opening, Persian's tail gap, and Pikachu's cake gap remain open.
Entei and Pichu instead have exterior coverage across the card body; the art,
printed labels and energy icons are excluded. Dark lettering is protected by
individual connected strokes, not a solid text-row rectangle.

These are individually selectable promos, with no invented booster recipe.
Existing ordinary promos and First Movie gold-stamp cards remain separate.

Reproduce with `node scripts/wizards-holos/fetch.mjs`,
`python scripts/wizards-holos/author-maps.py`, and
`python scripts/wizards-holos/register-cosmos.py`.
Tests: `node --experimental-strip-types --test tests/wizards-promos.test.ts`.
Visual review: `node scripts/wizards-holo-review.mjs` (three light/tilt poses
per card; `HOLO_BROWSER_URL` selects WebGL or WebGPU).
