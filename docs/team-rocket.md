# English Team Rocket

Team Rocket (`base5`) follows Base Set 2 in the Base-series selector. The
audited checklist contains all 83 identities: 82 numbered cards plus Dark
Raichu **83/82**. It includes 17 standard holo rares, 17 separately numbered
non-holo rares, 24 uncommons, 24 commons and one secret holo rare. The holo
Trainers (#15–16) and Rainbow Energy (#17) remain distinct from #71–72 and
#80. Dark Dragonite #5 remains the holo identity; the accidental non-holo
error, prerelease and W-stamp promotions are not retail outcomes here.

## Editions and assets

Both Unlimited and 1st Edition have all 83 exact fronts and distinct viewer
IDs. `TeamRocketCatalog.ts` holds card identity and edition fronts;
`TeamRocketCards.ts` resolves exact number, finish and edition. The four
Gyarados, Giovanni, Jessie & James, and combined Team Rocket wrappers appear
in both editions, with eight selectable photographed fronts. Edition labels
are present in the wrapper selector, card number labels and print metadata.
The collator validates edition-front completeness before producing a pack.

TCGdex supplies the unmodified stamped 1st Edition scans. Face to Face Games'
edition-specific catalog supplies the original Unlimited scans. These are
separate source images; no stamps were painted, removed or synthesized.
Scan resolution, wear, color balance and captured foil highlights vary.
Holo fronts retain their photographed highlights while dynamic foil is deferred.

The four wrapper designs in each edition come from Loose Packs' product
photographs. Their empty transparent margins are trimmed offline and large
photographs are reduced to at most 1000 × 1400 for efficient decoding. Both
silver crimps are retained. A genuine English Team Rocket back photograph is
shared across designs/editions with an explicit crop. It is a separate pack,
so its folds and crimp registration do not physically match each front.

Local source URLs and SHA-256 hashes:

- `public/cards/pokemon/team-rocket/catalog.json` and `sources.json`
- `scripts/team-rocket/unlimited-sources.json`
- `scripts/team-rocket/wrapper-sources.json`

Use `fetch-catalog.mjs`, `fetch-unlimited.mjs`, and `fetch-wrappers.mjs` in
`scripts/team-rocket/` to restore the assets. The latter two reject changed
remote source bytes for review. No network card metadata or preprocessing is
needed during pack opening. The set symbol is preserved on every source
front and also available locally as `base5-symbol.png`.

## Pack recipe

`TeamRocketProduct.ts` defines `base5-english-retail`, version 1:

- Seven distinct commons.
- Three distinct uncommons (including the two uncommon Special Energy).
- One rare slot: 2/3 non-holo rare, 29/90 standard holo rare, 1/90 Dark Raichu.

There is no guaranteed Basic Energy slot, reverse slot or bonus card.
`teamRocketSecretChance` is the requested **1/90 project rule**, not a claim
about factory pull rates. It consumes part of the estimated 1/3 total holo
rate. Changing it adjusts the standard-holo weight automatically. All pools
are uniform; common and uncommon repeats within a pack are excluded.
Factory sheets, box-level correlation and error prints are not simulated.

Edition is a reusable product property, independent of foil finish. Set,
product/recipe version, eligible checklist and seed deterministically fix
the card numbers. Wrapper designs and editions use the same rarity stream;
edition selects the correct fronts and participates in the resolved identity.
Other sets' seed streams and print rules are unchanged.

## Holo work intentionally deferred

All 18 holo identities (17 standard plus Dark Raichu), in both editions, use
`print-only` with `treatmentStatus: 'deferred'`. They remain genuine holo pulls
in pack data; they are never rerolled or replaced with non-holo counterparts.
The selector and card labels state that holo visuals are pending.

No Team Rocket shader profile, foil-window mask, subject cutout, protection
map, Cosmos dots, procedural motif or relief was created. There is no Team
Rocket `maps` directory, and no generic foil fallback is attached.

For the later pass, use the stable `pokemon:base5-N:FINISH:EDITION` definitions
in `TeamRocketCards.ts`. Each exact print can receive the existing
`CardDefinition.maps` fields (`foil`, `protection`, `motif`, etc.), a supplied
material profile and card-specific settings. Remove its deferred status when
its authored treatment is ready. Edition scans have different registrations,
so shared assets must be checked against both fronts before reuse.

## Validation

- `pokemon-team-rocket.test.ts`: all identities and counterpart pairs, both
  edition-front manifests, 166 distinct definitions, no invented holo assets,
  local catalog, eight wrappers, 9,000 deterministic packs, all 83 outcomes,
  configured 1/90 secret weight, observed distribution and incomplete-pool rejection.
- `team-rocket-browser-check.mjs`: set order and selection, all eight wrapper
  choices, 11-card preparation, tear/open/reveal, correct edition fronts,
  standard holo/non-holo outcomes, and Dark Raichu in both editions. All pass.
- Production build and 36 targeted Team Rocket / early-set / collation / CPU
  preparation tests pass.
- `team-rocket-performance.mjs` compares Base Set 2 with both Team Rocket
  editions in the same browser. Reports are saved under
  `artifacts/team-rocket-performance/`; this is a local device comparison,
  not a guarantee for every device.

Checklist/print references:
[TCGdex](https://api.tcgdex.net/v2/en/sets/base5),
[Team Rocket set reference](https://bulbapedia.bulbagarden.net/wiki/Team_Rocket_(TCG)),
[PSA's pack composition reference](https://www.psacard.com/articles/articleview/9247/public/locales).
