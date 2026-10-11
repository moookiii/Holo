# Gallery Pokémon sprite selector

The upper-left Pokémon button opens a National Pokédex selector using Pokémon Showdown's animated battle GIFs. Selection replaces the Gallery search input and dispatches its existing input event, preserving all active facets. Outside pointer presses and Escape dismiss it; arrows, Home/End and Tab support keyboard navigation. Gallery hide/disposal also releases its DOM and listeners.

The committed catalog is generated offline by `node scripts/generate-showdown-sprites.mjs` from:

- https://play.pokemonshowdown.com/data/pokedex.json
- https://play.pokemonshowdown.com/sprites/ani/

It covers all 1,025 National Pokédex numbers and 1,621 species/forms/visual variants. Filenames are matched against actual directory entries rather than guessed at runtime. Cosmetic aliases are deduplicated. Currently 51 entries lack animated GIFs, including Venusaur-Gmax, Blastoise-Gmax and Pikachu-World; they remain selectable with “No animation”. Network failures use the same fallback and are remembered for the selector's lifetime.

Rows are 76px with a two-row overscan buffer. Only visible/nearby rows exist; native lazy loading and the browser HTTP cache handle GIFs, without retaining an unbounded decoded-image cache. Closing removes all GIF elements. Images retain their intrinsic aspect ratio, transparent background and native animation. Search normalization handles composed/decomposed accents, apostrophes, gender symbols, punctuation and regional form terminology in the shared Gallery search index.

Validation: TypeScript, the production build and five focused catalog/search tests pass. `node scripts/gallery-sprite-selector-check.mjs` verifies live selection, preserved facets, special names/forms, absent GIFs, intrinsic image proportions, dismissal, keyboard scrolling, repeated full-range scrolling, mobile bounds and network failure. Initial measured opens took 86–291ms, with at most 12 mounted sprite rows and no page errors. Captures/report are saved to `artifacts/gallery-sprite-selector/`. The unrelated existing `gallery.test.ts` cannot run under the current Node test command because `megaRarity.ts` imports extensionless `profiles/prismatic`.

Card assets, materials, the viewer and pack opener are unchanged by this feature.
