# Jungle

Jungle (`base2`) follows Base Set in the Base-series selector. The complete
64-card English checklist and unchanged 600 × 825 TCGdex fronts are local, so
opening a selected Jungle booster does not fetch 64 remote card records/images.
`catalog.json` records the provider metadata; `sources.json` records source URLs
and SHA-256 checksums. Regenerate with `node scripts/jungle/fetch-catalog.mjs`.

Prints 1–16 are holo rares; 17–32 are their separately numbered non-holo rare
counterparts, with their own fronts. Prints 33–48 are uncommons and 49–64 are
commons (including Poké Ball). Original printed Jungle symbols are retained.
No-symbol errors, prerelease stamps and W promos are excluded.

`WotcProducts.ts` contains explicit Base Set and Jungle product definitions.
Jungle has seven unique commons, three unique uncommons and one rare slot:
2/3 non-holo rare or 1/3 holo rare. The 1/3 rate and uniform selection within
rarity pools are simulation estimates, not factory sheet/box reproduction.
There is no Energy or reverse slot. Missing checklist entries stop collation;
they never redistribute odds. Set, recipe version, seed and eligible pool
determine the contents. Wrapper artwork choices share those contents.

`WotcCards.ts` resolves exact numbered prints for both the viewer and pack flow,
replacing the Base Set-only lookup while preserving Base Set's authored maps.

## Deferred surface work

The user explicitly deferred all Jungle holo cutouts to the next prompt.
The 16 holo identities still collate correctly, display their original holo
scans and carry `treatmentStatus: deferred`. They currently render print-only
and are labelled as cutouts pending. No Jungle masks were created, no existing
masks were edited, and no new shader was introduced. The next pass should author
per-card PNG coverage/protection and activate the existing
`pokemon-base-set-star` profile named by `jungleHoloProfile`.

## Wrappers

The three user-supplied Flareon, Scyther and Wigglytuff front scans and supplied
`jungleback.png` are stored unchanged in `public/packs/pokemon/base2-*`.
The user identified the fronts as obtained from TCGdex; exact download URLs were
not supplied. TCGdex's current API/source set definition omits booster entries.
Wigglytuff's source has an outer margin, recorded as normalized `frontBounds`
and cropped by the existing cached wrapper preparation path. All three use the
same supplied back. The local Jungle logo is from TCGdex.

## Verification

`tests/pokemon-jungle.test.ts` checks all 64 identities, hashes, rarity counts,
separate rare fronts, complete eligibility, deferred surfaces, wrappers, local
catalog loading, missing-data rejection and 3,000 deterministic pack seeds.
`scripts/jungle-browser-check.mjs` exercises selection and opening with both
rare outcomes and checks the actual prepared card definitions and wrapper crops.

Sources: [TCGdex Jungle](https://api.tcgdex.net/v2/en/sets/base2),
[TCGdex set source](https://github.com/tcgdex/cards-database/blob/master/data/Base/Jungle.ts),
[Jungle print/product reference](https://bulbapedia.bulbagarden.net/wiki/Jungle_(TCG)).
