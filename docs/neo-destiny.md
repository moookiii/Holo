# Neo Destiny

Complete English Neo Destiny (`neo4`, Neo series), released February 28, 2002: 105 numbered main-set cards and eight secret Shining cards, 106–113. This pass registers the TCGdex 1st Edition master printing for all 113 cards: 89 non-holos, 16 regular holos and eight Shining holos. Alternate unlimited images are not substituted or synthesized.

## Structured source and clean fronts

`https://api.tcgdex.net/v2/en/sets/neo4` and its individual card endpoints supply the checklist and rarity/variant metadata. `public/cards/pokemon/neo-destiny/catalog.json` preserves the snapshot. `sources.json` records each original image URL, 600×825 dimensions and SHA-256. The local fronts are unchanged TCGdex high PNGs, never artwork-derived relief. The generated TypeScript records are plain application data, not SDK models.

Reproduce with `node scripts/neo-destiny/fetch-catalog.mjs`. The set's existing numbered holo-only rares receive Holo Rare eligibility; secrets 106–113 receive Shining Rare eligibility; all other numbered prints remain normal. Name matching cannot select another finish.

## English booster model

Four real 1st Edition front designs: Noctowl, Togetic, Celebi and Tyranitar. Each 11-card pack uses seven distinct commons, three distinct uncommons and one rare slot. There is no guaranteed Basic Energy, reverse foil, modern insert or extra Shining slot. In-set Special Energy cards retain their own rarity eligibility, including Miracle Energy as regular holo 16.

The rare slot weights are 11/18 non-holo rare, 1/3 regular holo and 1/18 Shining. These are empirical estimates, not manufacturer-published odds or exact factory sheet collation. The 1/18 Shining estimate comes from https://pokemonboosterpack.com/archive/pages/about, whose author reports examining booster opening videos. Other public estimates disagree (some use 1/12); uncertainty remains. Uniform selection within each rarity and independent pack draws are model assumptions. All four cosmetic designs share the same eligibility and seeded pulls. Incomplete metadata fails before collation rather than redistributing odds.

The original wrapper front photos come from https://loosepacks.com/products/neo-destiny-1st-edition. The photographed English back is from https://www.ebay.com/itm/317779771275 and retains visible used-wrapper creases. `scripts/neo-destiny/wrapper-sources.json` records the URLs, front alpha crops, back rectification corners and hashes. Logo and symbol are TCGdex assets. Reproduce with `fetch-wrappers.mjs` followed by `prepare-wrappers.py` in that directory.

## Separate regular and Shining routes

Supplied masks are preserved byte-for-byte under `scripts/neo-destiny/masks`; original names, dimensions, roles and hashes are in `mask-sources.json`. Noctowl's mask was found as `110.png` in the same user folder; all others use their supplied leading-zero filenames. No image segmentation, brightness thresholds, dilation, relief generation or AI replacement geometry was introduced.

Regular white-on-black silhouettes protect opaque subjects inside the existing basic/evolved artwork-window PNGs. Miracle Energy uses its own larger (20,119)–(578,606) window in the 600×825 source coordinate system. Protection and foil coverage are separate PNGs. Regular holos use the existing Cosmos profile, with black motif PNGs that preserve the explicitly deferred dot-placement work. Regeneration preserves any motif maps subsequently authored.

Shining black-on-white silhouettes are inverted into subject-only foil coverage, with the original polarity supplying print protection. `NeoDestinySurfaces.ts` provides their own material/map path, completely separate from artwork-window Cosmos. It temporarily reuses the existing plain `pokemon-team-rocket-trainer` material response; this is plumbing for the deferred Shining shader pass, not a physically calibrated Shining finish. No material profile or shader was edited. No normals or height maps are registered and emboss is zero. No new reflective regions outside the supplied masks are guessed.

Masks resample the entire UV domain to 1200×1650 using Lanczos, without flip, crop or offset. `create-holo-maps.py` is the offline map composer. `map-evidence.json` records output dimensions and hashes. Colored overlays are in `artifacts/neo-destiny/mask-review`. Noctowl's user-authored silhouette has coarse straight boundaries; that uncertainty remains visible and was preserved rather than silently retraced. Printed highlights are not evidence of physical groove depth. Shader response, dot placement, exact physical foil calibration and any mask refinements belong to the next requested pass.

## Architecture and verification

The standard TCGdex adapter, exact WotC printing registry, gallery release ordering, pack browser, collation and card material resolver handle Neo Destiny. CPU preparation, worker preparation, caches and GPU realization were not changed. Static catalog registration does not upload the set to the GPU; only selected viewer cards and opened pack cards realize textures.

`tests/pokemon-neo-destiny.test.ts` checks front and mask hashes, all 113 reachable cards, 7/3/1 composition, rarity rates over seeded draws, all four wrappers, normal-only print handling, secret maps and chronological placement. The existing Neo tests check adjacent sets. A temporary test resolver under ignored artifacts is used for the repository's existing extensionless TypeScript imports.

`node scripts/neo-destiny-browser-check.mjs` exercises the actual browser selection, four wrapper designs, regular/Shining/normal pulls, tear/open/reveal and repeated CPU preparation. `node scripts/neo-destiny-render-check.mjs` captures all 24 holo cards under Studio front, Studio tilt and Strip light, plus twelve non-holos. Reports and captures are under `artifacts/neo-destiny-browser` and `artifacts/neo-destiny-review`. These validate integration and masks; the explicitly deferred physical finish is not claimed complete.

Unrelated sets and pre-existing wrapper edits are excluded from the Neo Destiny commits.

## Final verification results

- Production TypeScript/Vite build passed after final asset registration.
- Sixteen targeted Neo tests passed, including five Neo Destiny tests and the adjacent Neo set checks.
- All four wrapper designs passed live opening; five seeded cases covered regular holos, two Shining cards and normal rare. Every prepared pack contained exactly eleven cards, CPU generation on click was zero, repeat preparation added eleven cache hits without misses, and CPU GPU-call counters stayed zero.
- All 24 holos loaded under three poses/lights; twelve non-holos rendered as print-only. No page errors or missing local assets were reported. The review includes colored Shining overlays and the larger Miracle Energy window.
- The broader suite initially ran 234 tests: 221 passed, 13 failed. The added fifth Neo Destiny test subsequently passed separately. All thirteen failure titles reproduced using pre-integration source registrations in an isolated artifact copy. They concern existing Base Set gallery identity, Pikachu map dimensions, Prismatic expectations, Umbreon GX and Wizards promos. No new failure appeared; see `artifacts/neo-destiny/regression-comparison.json`.
- Cold shader compilation varies substantially in headless rendering; the captures are not a hardware performance benchmark. Existing worker/cache architecture and eleven-card on-demand realization are verified, with no set-wide GPU preload added.
