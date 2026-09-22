# Pokémon packs

TCGdex stays behind `src/pokemon/TcgdexAdapter.ts`. One English SDK client lazily loads series, a selected series' sets, selected-set details, then card metadata with six concurrent requests. Only normalized metadata is cached. Transport requests carry independent abort signals, a 20-second timeout, and up to three attempts for network/429/5xx failures. Failed card metadata blocks opening with Retry/Back; it never silently shrinks the pool.

## Supported recipes and evidence

English Scarlet & Violet (`sv01`) and Paldea Evolved (`sv02`) share the early-SV physical slot structure, but use separate measured rarity probabilities. No other set inherits these recipes. Pocket, promos and other eras can be browsed but cannot open until audited recipes are added.

Sources:

- [Pokémon Support: booster contents](https://support.pokemon.com/hc/en-us/articles/360000981613-What-can-I-expect-in-a-Pok%C3%A9mon-Trading-Card-Game-booster-pack): ten expansion cards, four commons, three uncommons, three foils; additional basic Energy and code inserts.
- [TCGplayer: Scarlet & Violet, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Scarlet-Violet-Pull-Rates/a7702fce-dd64-4a58-beb1-0f871c853215/): measured rarity rates and observed replacement slots.
- [TCGplayer: Paldea Evolved, 8,000+ packs](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Paldea-Evolved-Pull-Rates/1b7d3e70-9542-4a50-8692-1661e2316521/): independent measured rates and replacement slots.

Recipes simulate the ten expansion cards, excluding the unnumbered basic Energy and redeemable code inserts. Slot 8 is reverse; slot 9 is reverse or Illustration/Special Illustration/Hyper Rare; slot 10 is Rare/Double Rare/Ultra Rare holo. Hyper Rare placement follows the later TCGplayer opening reports; earlier prerelease reporting placed it in the rare slot. This explicit choice can be revised by changing the recipe version.

Probabilities are sample estimates, **not official manufacturer odds**. Cards within each eligible outcome pool are sampled uniformly. Common/uncommon groups avoid duplicate IDs; reverse slots are independent and can repeat. Slot independence, within-pool uniformity and duplicate behavior are modelling assumptions: factory sheet ordering, box-level correlations and error packs are not simulated. Rarity rates are never calculated from pool cardinality. Missing nonzero-probability outcomes fail validation rather than redistributing odds.

## Determinism and preparation

A booster selection creates a cryptographic uint32 seed, resolves all slots, freezes the result, then CPU-prepares precisely those prints. Open passes the same prepared contents/map to the existing controller. Retry of the same Pokémon preparation retains its seed. A different art variant alone does not change the eligible pool or RNG stream. Actual booster membership filters the pool and becomes part of the deterministic stream.

Prepared identity contains pack type, set, booster, recipe/version, seed, exact card IDs/variants/slots, wrapper and prepared definitions. Selection changes abort previous work and require ownership checks before any result is promoted. Archive preparation uses the same generic helper; only the initial default selection names Archive / 01.

## Materials and images

Pulled definitions retain TCGdex identity, series/set/era, rarity, variant, booster membership, remote front, shared Pokémon back and resolved material profile. Session collection definitions remain available after leaving the opening scene.

Exact authored print mappings take priority (including Tyranitar sv02-135 holo). A reverse print never borrows the ordinary holo's authored masks. API fallbacks use existing era/foil profiles; normal prints use `print-only`. Higher rarities reuse existing etched optics with restrained overrides. Generic coverage is a shader-only approximation using shared rectangular layout bounds; it does not segment subjects, claim accurate text protection, or create per-card material maps. Detailed authored mappings can replace it later without changes to collation.

Only pulled cards request high PNG images. Metadata and browsing use no full-set high-resolution downloads. Set/series logos use WebP and catalog thumbnails expose low WebP. The wrapper preparer caches up to 16 artwork sides, fits images without stretching and applies them to the existing deformed foil mesh. Missing sides independently use a named set fallback. At validation time neither supported English set published booster artwork in TCGdex; these therefore use the clearly identified set fallback. No fictional art variants are added.

## Developer simulation

```powershell
node --experimental-strip-types scripts/simulate-pokemon.ts sv01 10000
node --experimental-strip-types scripts/simulate-pokemon.ts sv02 10000
```

Optional fourth argument selects the actual booster ID. The utility loads metadata only and reports per-slot rarity/variant frequencies. It is never imported into the production UI. Simulation frequencies test the implementation, not the correctness of source odds.

## Validation

`npm test` covers deterministic collation, set/count/slot/variant validity, booster restrictions, unsupported sets, prepared identity, Archive compatibility, stale work, bounded concurrency, transport abort isolation/retries and exact authored treatment reuse. `npm run build` uses the existing `/Holo/` production base. Local assets continue through the existing base-aware asset loaders; API URLs and data/blob URLs are unchanged.
