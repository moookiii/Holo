# Magic: The Gathering — Limited Edition Alpha

Magic uses the existing pack browser, CPU preparation, GPU factory, opening
controller, interaction, lighting, gallery and full viewer. No separate renderer
or Pokémon catalog adapter is involved.

## Catalog and assets

`src/magic/data/alpha-cards.json` is a normalized 295-printing Scryfall snapshot.
`node scripts/magic/fetch-alpha.mjs` refreshes it and downloads unmodified large
JPEG scans into `public/cards/magic/alpha`. The importer identifies itself to
Scryfall, spaces requests by at least 110 ms, requests unique printings, handles
pagination, and validates the set size, frame, border and nonfoil finishes.
Existing local images are reused; remove a specific image to refresh that scan.
Runtime requires no Scryfall requests. The shared CPU image cache handles decoding,
retries, aborted selections and later GPU texture reuse. Scryfall collector
numbers identify scans; Alpha did not print collector numbers on its cards.

Set source: https://api.scryfall.com/sets/lea

## Products and collation

Set/series metadata, product slots, sheet cells and catalog rarity are separate.
`magicSets` and `magicProducts` register future sets/products. Slots specify sheet
and count; repeated sheet cells encode multiplicity. Generated pulls retain their
sheet and physical cell position. `presentationOrder` is a validated permutation
applied by the shared opening controller after exact CPU preparation. Changing
the reveal order changes pack identity without changing generated contents.

Alpha uses 11 common-sheet, 3 uncommon-sheet and 1 rare-sheet pulls. The checked-in
121-cell sheets come from the Collation Project's published reconstructions.
Common cell IDs preserve the published Alpha layout. The rare layout is explicitly
tentative; the uncommon layout follows the Beta-based hypothesis. Neither is
presented as a fully observed Alpha sheet. All these uncertain inputs and their
notes live in `AlphaCollationData.ts` and `data/alpha-sheets.json`.

Sources:
- https://www.lethe.xyz/mtg/collation/lea.html
- https://www.lethe.xyz/mtg/collation/leb.html
- https://www.lethe.xyz/mtg/collation/striped-collation.html

Common lands occupy 47 positions: 9 Plains, 10 Islands, 9 Swamps, 9 Mountains and
10 Forests. The uncommon hypothesis has 26 land positions: 6 Plains, 2 Islands,
6 Swamps, 6 Mountains and 6 Forests. The tentative rare sheet has five Islands.
Each nonland appears once on its sheet. Black Lotus has one rare-sheet position;
there is no separate jackpot chance.

The seeded simulation samples synchronized columns bottom-to-top, in right-to-left
stripes. Each pack begins at an arbitrary seeded point. Widths 2–5 receive equal
simulation weights because historical width frequency is unknown. It does not
simulate a continuous factory hopper or guarantee box runs. Uncommon land art
positions are unresolved: each land cell samples the two Alpha scans equally,
an art-selection estimate, preserving the sourced land-type multiplicity. The
product selection screen discloses the reconstructed/estimated status.

## Physical material and geometry

Every Alpha card selects `print-only`; no foil fields, security stamp, metallic
maps or holographic graph are assigned. Rarity does not enable a foil reveal.
The shared `StockSurfaceLayer` supplied by the stock work is enabled through
`CardDefinition.stockSurface`. Its existing coating response is reused rather
than introducing a second material. Measured Alpha stock tuning remains pending.
The full viewer restricts ordinary print-only cards to their print-only treatment.

MTG has an independent 63 × 88 mm geometry definition. Alpha's 4 mm rounded
corners, 0.32 mm thickness and bevel are adjustable visual estimates, not asserted
measurements. Original scans remain unmodified. The shared physical backside is
`public/cards/magic/back.png`. The 15-card product uses a wrapper depth sufficient
for its stack and a shared summary grid at desktop and portrait sizes.

## Wrapper

The front is a cropped original-design reference listed as an Alpha booster by
Trinity Games, with its printed seals retained. Alpha and Beta shared packaging;
this is a product reference rather than an authentication claim. The image is
294 × 526 after removing white margins, so a higher-resolution replacement is
still desirable. No verified reverse was found; neutral film is disclosed in the
browser. `public/packs/magic/alpha/source.json` records provenance, processing,
copyright, missing reverse and geometry estimates. `prepare-wrapper.py` creates
the front, neutral reverse and zero metallic-ink PNG mask reproducibly. Artwork
can be replaced independently of products and collation.

## Validation

`tests/magic-alpha.test.ts` validates all 295 assets, sheet membership and land
multiplicity, 5,000 deterministic packs, cell provenance, presentation identity,
cancellation, duplicate CPU preparation, gallery filters and portrait camera
framing. The pack camera extends its far plane for distant summaries and restores
the viewer's original plane on exit.
`node scripts/magic/verify-alpha.mjs` exercises browser navigation, preparation,
15 print materials / zero holo materials, desktop/portrait summary, card viewer,
lighting and gallery. Captures and telemetry go to `artifacts/magic-alpha`.

Verified: 17 focused tests passed and the live browser check passed with 15 print
materials, zero holo materials, all 15 cards prepared, 295 gallery entries and
no browser errors. The next exact pack reused preparation with zero additional
CPU generation. The full suite has two unrelated Pokémon failures: Base Set
gallery-master selection (also reproduced against the original GalleryQuery)
and a First Movie gold-mask hash mismatch in pre-existing modified PNGs.
