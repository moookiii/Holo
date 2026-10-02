# First Movie promos

Promos 2 Electabuzz, 3 Mewtwo, 4 Pikachu and 5 Dragonite are a separate numbered subset in Wizards Black Star Promos. They are available in the gallery and promo browser; the set has no booster recipe or booster IDs. Inverted-stamp variants are not included.

Original TCGdex fronts are cached locally. `movie-sources.json` records image and mask hashes. `scripts/prepare-movie-promo-stamps.py` reproduces the PNG gold coverage from the Dragonite logo and complementary Mewtwo scan, registered separately to all four fronts. It writes enlarged colored overlays under `artifacts/movie-promos` for review. The large Pokemon lettering remains hollow. Missing strokes in Kids, Presents and First are repaired separately; no logo-body flood fill is used.

The existing metallic-ink channel supplies gold. Diffraction, procedural patterns, sparkle and relief are disabled. Ordinary promos retain the print-only fast path. No stamp layer or extra rendering sampler was added. Gold color and roughness are visual estimates; scans do not establish physical relief.

Run `npm test`, `npm run build`, and (with the dev server running) `node scripts/movie-promos-browser-check.mjs`. The browser check views all four cards, captures Pikachu at additional angles, checks all 38 promo tiles, and opens Pikachu through that browser without creating a pack.
