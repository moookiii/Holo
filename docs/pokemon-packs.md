# Pokémon packs

TCGdex stays behind `src/pokemon/TcgdexAdapter.ts`. One English SDK client lazily loads series, a selected series' sets, selected-set details, then card metadata with six concurrent requests. Only normalized metadata is cached. Transport requests carry independent abort signals, a 20-second timeout, and up to three attempts for network/429/5xx failures. Failed card metadata blocks opening with Retry/Back; it never silently shrinks the pool.

## Supported recipes and evidence

Eleven English sets have explicit recipes: Scarlet & Violet (`sv01`) through Destined Rivals (`sv10`), excluding special expansions whose extra replacement pools still need separate modelling. They share a reusable SV slot structure with separate measured rarity probabilities; Temporal Forces through Surging Sparks add an ACE SPEC replacement in the first reverse slot. No other set inherits these recipes. Pocket, promos and other eras can be browsed but cannot open until audited recipes are added.

Sources:

- [Pokémon Support: booster contents](https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack): ten expansion cards, four commons, three uncommons, three foils; additional basic Energy and code inserts.
- [TCGplayer: Scarlet & Violet, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Scarlet-Violet-Pull-Rates/a7702fce-dd64-4a58-beb1-0f871c853215/): measured rarity rates and observed replacement slots.
- [TCGplayer: Paldea Evolved, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paldea-Evolved-Pull-Rates/1b7d3e70-9542-4a50-8692-1661e2316521/): independent measured rates and replacement slots.
- [TCGplayer: Obsidian Flames, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%83%C2%A9mon-TCG-Obsidian-Flames-Pull-Rates/e2a66999-a7b5-4621-9765-c9a132e04bd2/): set-specific rates for the same replacement slots.
- [TCGplayer: 151, 1,500+ packs](https://www.tcgplayer.com/content/article/Pok%EF%BF%BDmon-TCG-Scarlet-Violet%EF%BF%BD151-Pull-Rates/b237df74-fbb0-40d0-9e13-d69ee6e804d9/): a smaller sample, with wider uncertainty. Its measured foil Energy rate is included; rare evolution-line God Packs remain excluded because no reliable probability is published.
- [TCGplayer: Paradox Rift, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paradox-Rift-Pull-Rates/0b5fb648-38fc-4f61-a6af-57c2737b4a48/): independently measured rates, including lower Special Illustration/Hyper Rare frequencies.
- [TCGplayer: Temporal Forces, 8,000+ packs](https://www.tcgplayer.com/content/article/robot/28c0ad22-00a4-428f-b22d-e7fee9ec50bc/): ACE SPEC has a measured 5% probability in the first reverse slot; the other two foil slots retain independent outcomes.
- [Pokecompare: Twilight Masquerade, sourced from TCGplayer](https://pokecompare.com/uk/pull-rates/twilight-masquerade), [TCGplayer: Stellar Crown](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Stellar-Crown-Pull-Rates/2c0743dd-dbd0-4504-9ff8-be5a72dd04d1/) and [TCGplayer: Surging Sparks](https://www.tcgplayer.com/content/article/Pok%EF%BF%BDmon-TCG-Surging-Sparks-Pull-Rates/6ccfb6ab-f26a-4ce8-bab5-5f91c85ec70e/): independent 8,000+ pack samples and first-reverse ACE SPEC placement.
- [TCGplayer: Journey Together](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Journey-Together-Pull-Rates/1b9f379f-97cb-45cc-b6f6-a1a070a422cd/) and [TCGplayer: Destined Rivals](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Destined-Rivals-Pull-Rates/43ba832e-44c9-45a4-ae2e-594df2defdda/): independent 8,000+ pack samples without ACE SPEC cards.

Recipes simulate the ten expansion cards plus the Basic Energy insert; only the redeemable code insert is excluded. Slot 8 is reverse (or ACE SPEC holo in supported 2024 sets); slot 9 is reverse or Illustration/Special Illustration/Hyper Rare; slot 10 is Rare/Double Rare/Ultra Rare holo; slot 11 is Basic Energy. The eight shared Energy fronts use TCGdex IDs and metadata with matching [PokemonTCG image assets](https://images.pokemontcg.io/sve/1_hires.png), because TCGdex currently supplies no images for its `sve` catalog. 151 applies its measured 24.83% Cosmos foil rate to that Energy slot. Hyper Rare placement follows the later TCGplayer opening reports; earlier prerelease reporting placed it in the rare slot. This explicit choice can be revised by changing the recipe version.

Probabilities are sample estimates, **not official manufacturer odds**. Cards within each eligible outcome pool are sampled uniformly. Common/uncommon groups avoid duplicate IDs; reverse slots are independent and can repeat. Slot independence, within-pool uniformity and duplicate behavior are modelling assumptions: factory sheet ordering, box-level correlations and error packs are not simulated. Rarity rates are never calculated from pool cardinality. Missing nonzero-probability outcomes fail validation rather than redistributing odds.

## Determinism and preparation

A booster selection creates a cryptographic uint32 seed, resolves all slots, freezes the result, then CPU-prepares precisely those prints. Open passes the same prepared contents/map to the existing controller. Retry of the same Pokémon preparation retains its seed. A different art variant alone does not change the eligible pool or RNG stream. Actual booster membership filters the pool and becomes part of the deterministic stream.

Prepared identity contains pack type, set, booster, recipe/version, seed, exact card IDs/variants/slots, wrapper and prepared definitions. Selection changes abort previous work and require ownership checks before any result is promoted. Archive preparation uses the same generic helper; only the initial default selection names Archive / 01.

## Materials and images

Pulled definitions retain TCGdex identity, series/set/era, rarity, variant, booster membership, remote front, shared Pokémon back and resolved material profile. Session collection definitions remain available after leaving the opening scene.

Exact authored print mappings take priority (including Tyranitar sv02-135 holo). A reverse print never borrows the ordinary holo's authored masks. SV Trainer reverse prints use a dedicated mask derived from the Trainer art window, keeping reverse foil coverage outside the picture. API fallbacks use existing era/foil profiles; normal prints use `print-only`. Higher rarities reuse existing etched optics with restrained overrides. Other generic coverage is a shader-only approximation using shared rectangular layout bounds; it does not segment subjects, claim accurate text protection, or create per-card material maps. Detailed authored mappings can replace it later without changes to collation.

Only pulled cards request high PNG images. Metadata and browsing use no full-set high-resolution downloads. Set/series logos use WebP and catalog thumbnails expose low WebP. The wrapper preparer caches up to 16 artwork sides, fits images without stretching and applies them to the existing deformed foil mesh. TCGdex currently publishes no English booster objects for the eleven supported sets, so `src/pokemon/boosterArt.ts` supplies one locally cached English product shot per set. These shots drive both the visual selector and physical wrapper; an unknown set still receives the named fallback. Source product listings are recorded in `public/packs/pokemon/SOURCES.md`.

## Developer simulation

Browser validation found some TCGdex high-resolution responses with duplicate `Access-Control-Allow-Origin` values (`*, *`). Only the exact pulled images are checked; a rejected PNG uses the same card's full-resolution `high.webp`, then its `low.webp` thumbnail if both high formats fail. This was verified for `sv08-108`, whose two high formats have invalid CORS headers while its low WebP is accessible. If all formats fail, the exact seed remains intact and Retry/Back stay available. The original API front URL remains in Pokémon metadata, while the render definition retains the usable image URL for later inspection.

```powershell
node --experimental-strip-types scripts/simulate-pokemon.ts sv01 10000
node --experimental-strip-types scripts/simulate-pokemon.ts sv02 10000
```

Optional fourth argument selects the actual booster ID. The utility loads metadata only and reports per-slot rarity/variant frequencies. It is never imported into the production UI. Simulation frequencies test the implementation, not the correctness of source odds.

## Validation

`npm test` covers deterministic collation, set/count/slot/variant validity, booster restrictions, unsupported sets, prepared identity, Archive compatibility, stale work, bounded concurrency, transport abort isolation/retries and exact authored treatment reuse. `npm run build` uses the existing `/Holo/` production base. Local assets continue through the existing base-aware asset loaders; API URLs and data/blob URLs are unchanged.

Validated on 2026-09-22: automated tests and the production build pass. Live metadata simulations cover every supported set. Automated coverage checks the eleven-card layout, deterministic Energy selection, 151 foil Energy frequency, ACE SPEC placement and coexistence with other hits. Browser checks for Scarlet & Violet and Paldea Evolved used the live API, localhost development and the production preview at `/Holo/`: visual booster selection, exact preparation, selected physical wrapper, pointer tear, extraction, reveal, collection fan, keyboard selection, inspect handoff, normal-profile retention, and reloading a reverse print from the normal card picker. Archive / 02 also prepares and opens through the generalized path. A real CDN failure exercised Retry/Back and led to the full-resolution fallback above.
