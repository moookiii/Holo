# Pokémon packs

TCGdex stays behind `src/pokemon/TcgdexAdapter.ts`. One English SDK client lazily loads series, a selected series' sets, selected-set details, then card metadata with six concurrent requests. Only normalized metadata is cached. Transport requests carry independent abort signals, a 20-second timeout, and up to three attempts for network/429/5xx failures. Failed card metadata blocks opening with Retry/Back; it never silently shrinks the pool.

## Supported recipes and evidence

Six English sets have explicit recipes: Scarlet & Violet (`sv01`), Paldea Evolved (`sv02`), Obsidian Flames (`sv03`), 151 (`sv03.5`), Paradox Rift (`sv04`) and Temporal Forces (`sv05`). They share a reusable SV slot structure with separate measured rarity probabilities; Temporal Forces adds an ACE SPEC replacement in the first reverse slot. No other set inherits these recipes. Pocket, promos and other eras can be browsed but cannot open until audited recipes are added.

Sources:

- [Pokémon Support: booster contents](https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack): ten expansion cards, four commons, three uncommons, three foils; additional basic Energy and code inserts.
- [TCGplayer: Scarlet & Violet, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Scarlet-Violet-Pull-Rates/a7702fce-dd64-4a58-beb1-0f871c853215/): measured rarity rates and observed replacement slots.
- [TCGplayer: Paldea Evolved, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paldea-Evolved-Pull-Rates/1b7d3e70-9542-4a50-8692-1661e2316521/): independent measured rates and replacement slots.
- [TCGplayer: Obsidian Flames, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%83%C2%A9mon-TCG-Obsidian-Flames-Pull-Rates/e2a66999-a7b5-4621-9765-c9a132e04bd2/): set-specific rates for the same replacement slots.
- [TCGplayer: 151, 1,500+ packs](https://www.tcgplayer.com/content/article/Pok%EF%BF%BDmon-TCG-Scarlet-Violet%EF%BF%BD151-Pull-Rates/b237df74-fbb0-40d0-9e13-d69ee6e804d9/): a smaller sample, with wider uncertainty. This recipe models ordinary ten-expansion-card packs; the additional foil Energy insert and rare evolution-line God Packs are excluded. No reliable God Pack probability is assumed.
- [TCGplayer: Paradox Rift, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paradox-Rift-Pull-Rates/0b5fb648-38fc-4f61-a6af-57c2737b4a48/): independently measured rates, including lower Special Illustration/Hyper Rare frequencies.
- [TCGplayer: Temporal Forces, 8,000+ packs](https://www.tcgplayer.com/content/article/robot/28c0ad22-00a4-428f-b22d-e7fee9ec50bc/): ACE SPEC has a measured 5% probability in the first reverse slot; the other two foil slots retain independent outcomes.

Recipes simulate the ten expansion cards, excluding the unnumbered basic Energy and redeemable code inserts. Slot 8 is reverse (or ACE SPEC holo in Temporal Forces); slot 9 is reverse or Illustration/Special Illustration/Hyper Rare; slot 10 is Rare/Double Rare/Ultra Rare holo. Hyper Rare placement follows the later TCGplayer opening reports; earlier prerelease reporting placed it in the rare slot. This explicit choice can be revised by changing the recipe version.

Probabilities are sample estimates, **not official manufacturer odds**. Cards within each eligible outcome pool are sampled uniformly. Common/uncommon groups avoid duplicate IDs; reverse slots are independent and can repeat. Slot independence, within-pool uniformity and duplicate behavior are modelling assumptions: factory sheet ordering, box-level correlations and error packs are not simulated. Rarity rates are never calculated from pool cardinality. Missing nonzero-probability outcomes fail validation rather than redistributing odds.

## Determinism and preparation

A booster selection creates a cryptographic uint32 seed, resolves all slots, freezes the result, then CPU-prepares precisely those prints. Open passes the same prepared contents/map to the existing controller. Retry of the same Pokémon preparation retains its seed. A different art variant alone does not change the eligible pool or RNG stream. Actual booster membership filters the pool and becomes part of the deterministic stream.

Prepared identity contains pack type, set, booster, recipe/version, seed, exact card IDs/variants/slots, wrapper and prepared definitions. Selection changes abort previous work and require ownership checks before any result is promoted. Archive preparation uses the same generic helper; only the initial default selection names Archive / 01.

## Materials and images

Pulled definitions retain TCGdex identity, series/set/era, rarity, variant, booster membership, remote front, shared Pokémon back and resolved material profile. Session collection definitions remain available after leaving the opening scene.

Exact authored print mappings take priority (including Tyranitar sv02-135 holo). A reverse print never borrows the ordinary holo's authored masks. API fallbacks use existing era/foil profiles; normal prints use `print-only`. Higher rarities reuse existing etched optics with restrained overrides. Generic coverage is a shader-only approximation using shared rectangular layout bounds; it does not segment subjects, claim accurate text protection, or create per-card material maps. Detailed authored mappings can replace it later without changes to collation.

Only pulled cards request high PNG images. Metadata and browsing use no full-set high-resolution downloads. Set/series logos use WebP and catalog thumbnails expose low WebP. The wrapper preparer caches up to 16 artwork sides, fits images without stretching and applies them to the existing deformed foil mesh. Missing sides independently use a named set fallback. At validation time none of the six supported English sets published booster artwork in TCGdex; these therefore use the clearly identified set fallback. No fictional art variants are added.

## Developer simulation

Browser validation found some TCGdex `high.png` responses with duplicate `Access-Control-Allow-Origin` values (`*, *`). Only the exact pulled images are checked; a rejected PNG uses the same card's full-resolution `high.webp`. Both failures leave the exact seed intact and show Retry/Back. The original API front URL remains in Pokémon metadata, while the render definition retains the usable image URL for later inspection.

```powershell
node --experimental-strip-types scripts/simulate-pokemon.ts sv01 10000
node --experimental-strip-types scripts/simulate-pokemon.ts sv02 10000
```

Optional fourth argument selects the actual booster ID. The utility loads metadata only and reports per-slot rarity/variant frequencies. It is never imported into the production UI. Simulation frequencies test the implementation, not the correctness of source odds.

## Validation

`npm test` covers deterministic collation, set/count/slot/variant validity, booster restrictions, unsupported sets, prepared identity, Archive compatibility, stale work, bounded concurrency, transport abort isolation/retries and exact authored treatment reuse. `npm run build` uses the existing `/Holo/` production base. Local assets continue through the existing base-aware asset loaders; API URLs and data/blob URLs are unchanged.

Validated on 2026-09-22: 96 automated tests pass; production build succeeds. Ran 10,000 metadata-only packs for each of the six supported sets against live TCGdex metadata. Temporal Forces yielded 512 ACE SPEC cards in 10,000 packs, all in the first reverse slot; automated coverage also checks coexistence with other hits. Browser checks for Scarlet & Violet and Paldea Evolved used the live API, localhost development and the production preview at `/Holo/`: visual booster selection, exact preparation, selected physical wrapper, pointer tear, extraction, all ten reveals, collection fan, keyboard selection, inspect handoff, normal-profile retention, and reloading a reverse print from the normal card picker. Archive / 02 also prepares and opens through the generalized path. A real CDN failure exercised Retry/Back and led to the full-resolution fallback above. The four additional sets share this flow and were verified through live metadata simulations and automated collation tests, rather than repeated manual openings.
