# Physical card surfaces

`CardDefinition.physicalProfile` selects stock independently of `profile` (foil).
`resolvePhysicalCardProfile` supplies catalog defaults in one place. Explicit IDs
override those defaults, so future factory/era profiles need no shader rewrite.
Existing `stockSurface` strength/depth overrides remain supported. Metal
collectibles opt out of paper treatment.

Profiles: `yugioh-current`, `pokemon`, `mtg`, and the compatibility fallback
`generic-print`. Alpha explicitly selects `mtg`. No Alpha or WotC-specific
microscopic recipe is claimed. This does not imply identical manufacturing
across eras or factories.

## Evidence and limits

- [Wizards: Playing Card Board (2018)](https://magic.wizards.com/en/news/feature/playing-card-board)
  describes laminated paper, a dark adhesive center, and smooth matte paper
  coatings. Its cross-section and gloss illustrations explain construction;
  they are not measurements of Alpha's surface.
- [Wizards: Playing Card Coatings (2018)](https://magic.wizards.com/en/news/feature/playing-card-coatings-2018-04-26)
  distinguishes thin print coatings from the underlying paper and describes
  glare control. These modern descriptions guide the restrained MTG default,
  not a claim about the precise 1993 coating formula.
- [CGC: Altered Card Alert (2024)](https://www.cgccards.uk/news/article/12800/altered-card-holo-filler/)
  documents a protective clear coating on Pokémon cards, including comparative
  close-ups and specialized-light observations. Its holo specimens establish
  coating presence, not a non-holo roughness or an era-specific grain pattern.
- [Pokémon: Country of Origin](https://support.pokemon.com/hc/en-us/articles/360001421466-Country-of-Origin)
  confirms multiple manufacturing regions; franchise does not establish one
  exact factory recipe.
- Alpha reference searches included [PSA's Alpha image collection](https://www.psacard.com/cardfacts/non-sports-cards/1993-magic-gathering-alpha/images/28137)
  and [Alpha Rare Authentication](https://www.mtginformation.com/alpha-rare-authentication).
  Scans, encapsulated cards, and printing-dot authentication are insufficient
  evidence for relief depth. No scanner grain, halftone pattern, wear, or sleeve
  reflection was converted into surface geometry.

Reliable matched, unsleeved, angled-light macro references spanning ordinary
Pokémon, modern MTG, and original Alpha were not established. All numeric grain
depths/scales, roughness, and coating values are conservative rendering estimates,
not measured physical constants. Further specimen calibration remains possible
without changing the architecture.

## Implementation

One `StockSurfaceLayer` uses continuous local-centimetre height fields with
analytic slopes and two grain scales. Strength, scales, depth, and roughness
variation are uniforms. Pixel-footprint integration removes unresolved grain
and transfers slope variance into coating roughness, including scale-dependent
variance. There are no added samplers, texture assets, time-dependent noise,
artwork modifications, or condition effects.

Print-only fronts and backs use dielectric print and broad, modest coating
highlights. Holo materials apply the physical coating to exposed nonfoil print;
foil, metallic ink, stamps, and authored relief retain independent controls.
Legacy Yu-Gi-Oh keeps its artwork-window coating and exact existing calibration.
No Secret Rare optical code was changed.

Edges share one parameterized shader: linear base color, roughness, fiber scale,
fiber strength, and layer variation. New profiles integrate unresolved fibers;
legacy stock retains its existing appearance. Geometry dimensions and bevels
remain independent, including Alpha's existing estimated corner radius.

## Verification

Run `npm run build`, `npm test`, and the focused
`node --experimental-strip-types --test tests/physical-card-profile.test.ts tests/magic-alpha.test.ts`.

`scripts/verify-physical-stock.mjs` captures ordinary Pokémon, original Alpha,
Pokémon holo, and ordinary Yu-Gi-Oh fronts, tilts, close views, grazing angles,
and backs under Studio/Skim lights. It defaults to a built preview on port 4174;
`STOCK_REVIEW_URL` can select another server. Images and GPU/browser errors go to
`artifacts/physical-stock`. This visual review complements tests; neither proves
a match to an unmeasured historical finish.

The final patch built successfully against a stable HEAD snapshot with only
these surface changes overlaid. All ten focused tests passed. The 40-view
WebGPU review completed without browser errors or warnings; reviewed normal,
close, back, and grazing images retained readable artwork and restrained grain.
The shared checkout's full suite reported 206 passes and two failures: gallery
master identity and the First Movie promo image hash. Those files/assets were
outside this change. Concurrent gallery edits also temporarily blocked a later
shared-checkout build, which is why the isolated build is recorded separately.
