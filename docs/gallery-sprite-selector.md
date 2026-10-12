# Gallery Pokémon sprite selector

The upper-left gold Poké Ball button opens a National Pokédex selector using Pokémon Showdown's animated battle GIFs. Its accessible name is “Choose Pokémon”. Selection replaces the Gallery search input and dispatches its existing input event, preserving all active facets. Outside pointer presses and Escape dismiss it; arrows, Home/End and Tab support keyboard navigation. Gallery hide/disposal also releases its DOM and listeners.

The committed catalog is generated offline by `node scripts/generate-showdown-sprites.mjs` from:

- https://play.pokemonshowdown.com/data/pokedex.json
- https://play.pokemonshowdown.com/sprites/ani/

It covers all 1,025 National Pokédex numbers and 1,621 species/forms/visual variants. Filenames are matched against actual directory entries rather than guessed at runtime. Cosmetic aliases are deduplicated. Currently 51 entries lack animated GIFs, including Venusaur-Gmax, Blastoise-Gmax and Pikachu-World; they display PokéAPI official artwork. Failed GIFs also switch to official artwork. `node scripts/generate-pokemon-artwork.mjs` builds the offline artwork-ID mapping from PokéAPI, verifying absent-animation artwork and using base-species art when matching form art is unavailable. Pikachu-World maps to PokéAPI's `pikachu-world-cap` (10160); Venusaur-Gmax and Blastoise-Gmax use 10195 and 10197. Images remain lazy-loaded and browser-cached, with no runtime PokéAPI metadata requests.

The selector starts directly below the Gallery toolbar and extends to the screen bottom. Its heading stays fixed while the list fills the remaining height. Toolbar wrapping and viewport resizing update its position automatically.

Rows are 76px with a two-row overscan buffer. Only visible/nearby rows exist; native lazy loading and the browser HTTP cache handle GIFs, without retaining an unbounded decoded-image cache. Closing removes all GIF elements. Images retain their intrinsic aspect ratio, transparent background and native animation. Search normalization handles composed/decomposed accents, apostrophes, gender symbols, punctuation and regional form terminology in the shared Gallery search index.

Validation: TypeScript, the production build and five focused catalog/search tests pass. `node scripts/gallery-sprite-selector-check.mjs` verifies live selection, preserved facets, special names/forms, absent GIFs, intrinsic image proportions, dismissal, keyboard scrolling, repeated full-range scrolling, mobile bounds and network failure. Initial measured opens took 86–291ms, with at most 12 mounted sprite rows and no page errors. Captures/report are saved to `artifacts/gallery-sprite-selector/`. The unrelated existing `gallery.test.ts` cannot run under the current Node test command because `megaRarity.ts` imports extensionless `profiles/prismatic`.

Card assets, materials, the viewer and pack opener are unchanged by this feature.

## Gold button asset

`public/icons/pokeball-gold.png` was made with the built-in ImageGen tool from the user's attached Poké Ball reference. Final prompt:

> Edit this exact Poké Ball icon into a gold copy for a small premium dark-UI button. Preserve its circular silhouette, horizontal band, centered circular button, exact proportions and simple crisp flat graphic style, with the existing restrained right-side shading. Recolor red top to warm muted gold #c8ad73; recolor white bottom and center to pale champagne gold #e9d7a7; darker right-side shapes to corresponding restrained darker gold tones. Keep the band and center ring near-black. Remove ONLY the outside black background to transparent alpha; keep the black internal band and ring. No text, no glow, no extra detail, no realistic metal texture. Tight square framing with a very small transparent margin. Deliver a transparent PNG icon.
