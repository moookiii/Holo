# English Neo Revelation

TCGdex `neo3` supplies all 66 original English fronts and metadata: 64 numbered prints plus Shining Gyarados `neo3-65` and Shining Magikarp `neo3-66`. Release: September 21, 2001, Neo series. `sources.json` records untouched master front URLs and hashes. The pictured masters and wrappers are 1st Edition; definitions, product eligibility and front selection retain that edition explicitly. All 50 non-holos use print-only materials. API variant flags, not names or card-number ranges, select the 16 holo treatments; the two secret print IDs additionally identify the Shining rarity pool.

## Product and collation

[PSA's Neo Revelation account](https://www.psacard.com/Articles/ArticleView/9458/psa-set-registry-collecting-2001-poke-mon-neo-revelation-1st-edition) reports eleven cards: seven commons, three uncommons and one rare, approximately one regular holo per three packs, and Entei, Suicune, Raikou and Misdreavus wrappers. Real first-edition fronts are sourced from the [Loose Packs product photographs](https://loosepacks.com/products/neo-revelation-1st-edition). The original English reverse is sourced from a [photographed Suicune wrapper](https://www.ebay.com/itm/287074938891), perspective rectified to fill the existing wrapper surface; provenance records the corners. No other expansion's back is substituted.

The user selected the **1-in-12 Shining estimate** from the [opening-based historical pack account](https://pokemonboosterpack.com/archive/pages/about). This is explicitly an estimate, not official odds. Other reports disagree, including PSA's quoted collector estimating about one Shining per box. The simulated rare slot has mutually exclusive probabilities: 7/12 non-holo rare, 1/3 regular holo, 1/12 Shining. Both Shining prints replace the rare; there is no extra card, reverse slot, basic Energy slot or modern pack layout. Uniform selection within each pool and independent packs are modeling assumptions; factory sheet sequencing and guaranteed box contents are not asserted. Existing common/uncommon uniqueness and stable-seed collation remain shared.

## Masks and deferred dot placement

The sixteen supplied SAM 3.1 protections are copied byte-for-byte to `scripts/neo-revelation/masks`. Their original filenames, hashes and dimensions are recorded in `mask-sources.json`. No subject or printed protection is re-segmented, dilated, repaired or normalized. Render-resolution resampling uses the existing pipeline. Foil coverage reuses the existing Neo Discovery/Base Set 2-era basic and evolved window PNGs, selecting evolution from metadata. Coverage and protection remain separate PNGs; protection outside the existing window is composed independently from the untouched supplied silhouette.

All sixteen holos, including the two Neo Revelation Shining prints, reuse `pokemon-base-set-2-cosmos`; no later Neo Destiny material or new shader is introduced. The Shining master fronts show their Cosmos backgrounds and the supplied silhouettes preserve their subjects and, for Gyarados, the foreground boat.

**Per-card Cosmos placement is deferred to the next prompt at the user's explicit request.** Each motif PNG is currently black, so no generated random dots or guessed spot positions are introduced. The clean master's visible printed foil remains unchanged. Rotation and lighting checks in this pass validate loading, supplied protection and existing material plumbing, not completed dot matching. `create-holo-maps.py` preserves an existing motif PNG so later placement work is not overwritten by mask regeneration.

## Integration and checks

The existing local TCGdex adapter, exact WotC printing lookup, gallery, pack browser, collation, preparation workers and caches handle this set. Only selected card/pack surfaces are realized on the GPU. Neo set browsing and gallery release order place Revelation after Southern Islands and before later sets.

- `node scripts/neo-revelation/fetch-catalog.mjs` snapshots API records and unchanged fronts.
- `python scripts/neo-revelation/create-holo-maps.py` composes coverage with authoritative protection.
- `tests/pokemon-neo-revelation.test.ts` verifies every front/mask hash, all cards reachable, 7/3/1 composition, approximate sampled rates, distinct prints, local assets and exact printing lookup.
- `scripts/neo-revelation-browser-check.mjs` opens all four wrapper designs, including regular, Shining and non-holo outcomes, and verifies CPU cache reuse with zero GPU preparation calls.
- `scripts/neo-revelation-render-check.mjs` captures all sixteen holos at three card/light poses and twelve representative non-holos. Reports and captures are under `artifacts/neo-revelation*`.
