# English Team Rocket

Team Rocket (`base5`) follows Base Set 2 in the Base-series selector. The
audited checklist contains all 83 identities: 82 numbered cards plus Dark
Raichu **83/82**. It includes 17 standard holo rares, 17 separately numbered
non-holo rares, 24 uncommons, 24 commons and one secret holo rare. The holo
Trainers (#15–16) and Rainbow Energy (#17) remain distinct from #71–72 and
#80. Dark Dragonite #5 remains the holo identity; the accidental non-holo
error, prerelease and W-stamp promotions are not retail outcomes here.

## Editions and assets

The gallery and pack opener expose all 83 exact 1st Edition fronts and distinct viewer
IDs. `TeamRocketCatalog.ts` holds card identity and edition fronts;
`TeamRocketCards.ts` resolves exact number, finish and edition. The four
Gyarados, Giovanni, Jessie & James, and combined Team Rocket wrappers appear
as four selectable 1st Edition photographed fronts. Edition labels
are present in the wrapper selector, card number labels and print metadata.
The collator validates edition-front completeness before producing a pack.

TCGdex supplies the unmodified stamped 1st Edition scans. Face to Face Games'
edition-specific catalog supplies the original Unlimited scans. These are
separate source images; no stamps were painted, removed or synthesized.
Scan resolution, wear, color balance and captured foil highlights vary.
Holo fronts retain their photographed highlights beneath the registered dynamic optics.

The four exposed 1st Edition wrapper designs come from Loose Packs' product
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

## Registered holo treatment

All 18 exposed 1st Edition holos have separate PNG foil-window and print
protection maps. The user's annotated fronts are retained in
`scripts/team-rocket/traces/`. `create-holo-maps.py` fills those supplied
contours, closes Charizard's wing at the artwork frame, preserves enclosed
background gaps, and registers printed subject features to each Unlimited
scan. Registration uses RANSAC on printed subject features, not foil dots;
median inlier errors are below 0.9 pixels at the 600 x 825 working size.
These residuals describe image registration, not contour precision.

Seventeen holo identities reuse the corrected **Base Set 2 Cosmos** profile.
`register-cosmos.py` measures blob centers and radii in each edition's own
front, confirms round local features, and rasterizes filled antialiased
circles at 1200 x 1650. `cosmos-registration.json` stores every center/radius;
`cosmos-corrections.json` records visually reviewed large orbs and rejected
printed features. Scan noise cannot become a ragged perimeter or punch holes
inside a dot. The motif PNG is independent of both artwork and protection.
No additional runtime detector, GPU sampler, random dot layer or relief is
introduced. The existing worker/cache/preparation paths are reused.

**Here Comes Team Rocket! #15** uses a dedicated profile with optical-only
direction PNGs. The user's angled photo establishes reflective fine rays,
the granular counter inside the R, and narrow exposed gaps below the R and
beside Jessie. Directions and contrast come from those details on each clean
scan; no Cosmos dots or synthetic embossed height are assigned. This is an
optical estimate from a single angled photograph, not measured physical
microstructure or a complete angular calibration.

Run `create-holo-maps.py`, `register-cosmos.py`, and
`register-trainer-foil.py` to reproduce PNG assets and review overlays.
`register-cosmos.py --remeasure` repeats detection plus recorded corrections;
the default renders saved coordinates. Python requires Pillow, NumPy,
OpenCV, SciPy and scikit-image. This preprocessing is offline only.

Limitations: scans contain baked lighting, and Unlimited image quality varies.
Only visibly resolved dots can be registered; faint or obscured motifs are
not invented. In particular, Unlimited Dark Weezing has very few resolvable
dots and Rainbow Energy has a soft low-resolution scan. The direction and
brightness response of #15 remains an estimate pending moving references.

## Validation

- `pokemon-team-rocket.test.ts`: all identities and counterpart pairs, the
  1st Edition front manifest, 83 distinct definitions, edition-specific PNG maps and profile dispatch,
  local catalog, four wrappers, 9,000 deterministic packs, all 83 outcomes,
  configured 1/90 secret weight, observed distribution and incomplete-pool rejection.
- `team-rocket-browser-check.mjs`: set order and selection, all four wrapper
  choices, 11-card preparation, tear/open/reveal, correct edition fronts,
  standard holo/non-holo outcomes, and 1st Edition Dark Raichu. All pass.
- Production build and targeted Team Rocket / early-set / collation / CPU
  preparation tests cover the integration.
- `team-rocket-holo-review.mjs` captures all 36 holo prints at three poses
  under Studio and Strip lights for visual inspection.
- `team-rocket-performance.mjs` compares Base Set 2 with Team Rocket 1st Edition
  in the same browser. Reports are saved under
  `artifacts/team-rocket-performance/`; this is a local device comparison,
  not a guarantee for every device.

Checklist/print references:
[TCGdex](https://api.tcgdex.net/v2/en/sets/base5),
[Team Rocket set reference](https://bulbapedia.bulbagarden.net/wiki/Team_Rocket_(TCG)),
[PSA's pack composition reference](https://www.psacard.com/articles/articleview/9247/public/locales).

Local post-holo measurement: viewer median 5.6 ms for Base Set 2 and both
Team Rocket editions; opening medians 5.6–5.7 ms. Team Rocket preparation
was 5.7–6.0 s versus 9.1 s for the baseline in this run. One Unlimited tear
p95 was 13.9 ms versus baseline 10.3 ms; remaining Rocket stage p95 values
were 6.9–7.6 ms. No sustained frame-time regression was observed. These
short device-specific samples include scheduling variability.
