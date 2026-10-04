# Southern Islands English collection

The fetch script first queries [TCGdex's English set list](https://api.tcgdex.net/v2/en/sets), resolves the unique `Southern Islands` result (`si1`), and records that discovery. It then snapshots the set and all 18 card responses. Original English high-resolution fronts are retained without image edits; `sources.json` records their URLs and SHA-256 hashes. The generated ID is used by the local adapter and collection registry. TCGdex gives July 31, 2001 as the English release date and places it in the Neo series.

## Fixed product

[Wizards' original Southern Islands FAQ](https://web.archive.org/web/20030823105119id_/http://www.wizards.com/default.asp?x=pokemon/southernislandsfaq) describes a three-ring binder, eighteen Southern Islands cards, six postcards, sleeves, and three randomized boosters from other recent expansions. It confirms that six of the eighteen cards are holographic. Those other-expansion boosters are separate products; they are not a Southern Islands rarity distribution.

Holo represents the Southern Islands cards as a **collection folder**, with the original English binder-cover photograph as its product art. Opening the folder exposes all eighteen fixed card fronts in numbered order. Selecting one uses the existing card viewer, lighting controls, and texture caches. Reopening exposes the identical checklist. No RNG, booster recipe, odds, duplicate pulls, rerolls, or ordinary sealed-pack tear animation is used. Postcards and the unrelated bundled boosters are documented accessories rather than invented card pulls.

`CollectionProducts.ts` defines a reusable fixed-product contract and validates that every fixed printing is present exactly once. `PackBrowser` displays collection-folder products separately from booster choices. All eighteen definitions also enter the normal gallery. The adapter, stable card metadata, exact WotC printing lookup, CPU preparation, GPU realization, and card materials remain shared.

## Actual variants and physical references

Holo status comes from each card's TCGdex `variants` and `variants_detailed` response, not names, rarity, or a card-number formula. The six English reverse holos are `si1-1` Mew, `si1-4` Togepi, `si1-7` Ledyba, `si1-11` Marill, `si1-14` Slowking, and `si1-17` Vileplume. The remaining twelve are non-holo only. TCGdex's set totals report 6 reverse and 12 normal, with 0 ordinary holo prints.

High-resolution photographs of genuine graded English cards were inspected through [PSA's English Southern Islands gallery](https://www.psacard.com/psasetregistry/tcg/company-sets/2001-pokemon-southern-islands-promos/imagegallery/439141) and [Vileplume's English certification](https://www.psacard.com/cert/101119174/psa). Labels and fronts confirm English language and the pictured printing. Reference images and dimensions are recorded in `scripts/southern-islands/reference-sources.json`; the working reference contact sheet is under `artifacts/southern-islands/references`. Photographs guide material coverage and are never substituted for the TCGdex printed master.

All six show exterior WotC Cosmos foil in the header, side strips, rules background, and flavor background. Their complete artwork windows and gold picture frames are opaque, including every subject and background cameo inside the artwork. Energy/type circles, the evolution medallions, gold labels, palm symbols, and individually extracted dark printed letter strokes are protected separately. Foil remains between the letters and inside open counters; no opaque rectangular text bands are introduced. Coverage and protection are distinct 1200×1650 PNGs.

The exact Entei/Pichu exterior-Cosmos mechanism is reused: `pokemon-base-set-2-cosmos`, with the same restrained reverse-card diffraction/reflectance settings and no procedural extra sparkle or emboss. Each card has its own full-front registered motif PNG. The master scan determines spot centers, relative radii, clustering, blank regions, and core brightness. One brightness gain per filled spot avoids fragmented or noisy interiors. Registration is generated offline and cached as explicit master coordinates; there is no runtime detection or segmentation.

Mask fringes, spot radii, and angular orientation remain authored estimates. The references validate exterior coverage and Cosmos material family; slab photographs do not uniquely recover microscopic diffraction axes. Foil already visible over ink in a scan is retained as part of the untouched print, while the authored optical layer protects the detected opaque strokes. No relief is inferred from brightness. The existing promo or other-set masks/shaders are not altered.

## Reproduction and checks

- `node scripts/southern-islands/fetch-catalog.mjs` resolves the current API ID and generates local metadata/front provenance.
- `python scripts/southern-islands/author-maps.py` generates the six independent coverage/protection pairs and review overlays.
- `python scripts/southern-islands/register-cosmos.py` rasterizes stored master registration; `--remeasure` recomputes proposals. `cosmos-corrections.json` accepts reviewed coordinate corrections.
- `tests/pokemon-southern-islands.test.ts` verifies every English front hash, the 6/12 variant split, exact authored profiles, PNG dimensions, full fixed contents independent of metadata order, rejected incomplete collections, absence of a booster recipe, and local adapter behavior.
- `scripts/southern-islands-browser-check.mjs` captures six reverse holos at three poses and all twelve non-holos, opens the folder twice and compares all eighteen stable IDs, checks card navigation and profile identity, and verifies repeated CPU preparation is cached with zero GPU calls.

Local visual captures and reports are saved under `artifacts/southern-islands*`.
