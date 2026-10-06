# English Aquapolis

Aquapolis uses the existing Pokémon catalog, gallery, single-card viewer, e-reader reverse material, pack browser and deterministic collation. Release: 15 January 2003. It appears between Expedition and Skyridge.

## Checklist and variants

The printed main denominator is 147. Four numbers have separate a/b e-reader prints: Golduck 50, Drowzee 74, Mr. Mime 95 and Porygon 103. This produces 151 ordinary entries, each with normal and reverse variants. Kingdra 148, Lugia 149 and Nidoking 150 are Crystal Secret Rares with holo-only variants. H1–H32 are separate holo-only entries. Total: 186 entries and 337 selectable prints (151 normal, 151 reverse, 35 holo). No H-card or Crystal reverse variants are invented.

Metadata was checked against [TCGdex](https://api.tcgdex.net/v2/en/sets/ecard2), the [Pokémon TCG data checklist](https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/ecard2.json), and [Bulbapedia's Aquapolis print notes](https://bulbapedia.bulbagarden.net/wiki/Aquapolis_(TCG)). The Pokémon TCG checklist combines the four a/b pairs. TCGdex incorrectly labels the three Crystals Rare; the local catalog records Secret Rare.

## Assets and masks

182 untouched English masters use the Pokémon TCG image CDN, normally 600×825. The four a prints use the unsuffixed CDN image after inspecting its printed letter. The four b prints use exact TCGplayer product scans: 85814, 84972, 87591 and 88307, respectively. These are only 200 pixels wide and remain at source resolution; lossless PNG decoding does not restore missing detail. A larger source offering identical a artwork for both letters was rejected. Full borders, printed e-reader regions, collector labels and copyright are retained. Variant finishes share their full-card master through existing caches.

`public/cards/pokemon/aquapolis/sources.json` records source URLs, dimensions and SHA-256 hashes. `catalog.json` preserves detailed metadata. `scripts/aquapolis/fetch-catalog.mjs` reproduces the catalog and verifies the independent checklist.

All 32 supplied SAM PNGs were copied unchanged as 600×825 protection maps, including negative spaces and small components. H16 was present in the supplied local folder, and H331 is the supplied H31 cutout. No SAM inference was rerun; these are imported user segmentations, not newly generated segmentation claims. Protection geometry remains separate from the physical foil window.

32 card-specific artwork-window PNGs register the existing e-reader frame topology against each actual English H master. Measured straight-edge corrections remove false exclusions where yellow artwork resembled the printed frame. Native-resolution colored overlays and enlarged window crops are saved for manual review. Hard boundaries are used without feathering. Scan antialiasing makes the exact subpixel physical ink boundary uncertain; these maps need the final lit boundary check when their material is activated.

151 reverse coverage PNGs use Holo's existing e-reader geometry for evolved Pokémon, basic Pokémon, Trainer and Energy frames. Reverse rendering reuses the current `pokemon-e-reader` material. No Expedition assets or material settings were authored by this change. These finishes currently share the nonfoil master, including its printed scanning codes. Physical reverse prints omit scanning codes; exact finish-specific reverse fronts are still needed to reproduce that printed difference. Barcode regions were preserved rather than reconstructing a fabricated printing.

32 empty 1200×1650 motif PNGs mark Cosmos placement pending. Regeneration preserves a future authored motif rather than overwriting it. H cards and Crystals currently use `print-only`: their scanned foil is visible in the master, but no animated Cosmos pattern, new dots, relief or shader tuning is implemented. H1–H32 are prepared for the next physical-reference pass. Crystal foil also remains pending.

## Packs and historical limits

The four authentic English wrapper designs are Arcanine, Entei, Scizor and Tyranitar, sourced from [Loose Packs](https://loosepacks.com/products/aquapolis-unlimited-short-crimp). Front PNGs remove the studio background and tapered side gaps using the filled wrapper silhouette, retain both seals, and use a tight crop without stretching. Back art comes from [Pokémon Booster Pack](https://pokemonboosterpack.com/images/packart/aquapolisback.jpg). Original source and output hashes and crop coordinates are in `scripts/aquapolis/wrapper-sources.json`.

The recipe has nine cards: five commons, two uncommons, one guaranteed normal rare, and one reverse. A regular Holo Rare replaces one common at approximately 1:3; the normal rare remains. There is no dedicated Basic Energy slot. Special Energy participates at its printed rarity. [Contemporary Wizards chat](https://www.pojo.com/chrisbo/11-10-02-WotcChat.html) explicitly says Aquapolis uses Expedition's booster scheme; the [PSA collector article](https://www.psacard.com/articles/articleview/9721/psa-set-registry-collecting-2003-poke-mon-aquapolis-its-appeal-crystal-clear) supplies the slot and regular-holo description.

No reliable official Crystal insertion odds were established. PSA reports collector estimates of one to three per box, which is not an exact probability. Crystals remain selectable in the gallery and are omitted from random packs until their insertion odds are verified. Uniform eligible-print selection and independent slots are disclosed simulation assumptions, not reconstructed factory sheets.

## Verification

`tests/pokemon-aquapolis.test.ts` checks checklist and print counts, collector numbers, source images, local catalog integration, variant eligibility, untouched SAM hashes and mask dimensions. It opens 3,000 deterministic packs to check nine-card slot behavior, regular-holo common replacement, reverse coverage and Special Energy participation. `scripts/aquapolis-check.mjs` exercises the live gallery, normal/reverse/H/Crystal viewers and several wrapper designs, records gallery residency and captures errors. Review outputs live under `artifacts/aquapolis/`.

The build, asset decoder/hash audit and all six Aquapolis/Expedition tests pass. Live WebGL checks loaded all eight visible gallery cards with 16 resident slots within the existing 48-slot cache, opened nine representative viewers, and prepared all four wrapper designs through nine-card pack summaries with no Aquapolis HTTP errors or page exceptions. The full suite reports 274 passes and 28 failures; every failing test name also fails in an isolated baseline with the six Aquapolis integration edits removed. The baseline has additional path-dependent failures because it runs in a copied directory.

Known limits: the four b masters are lower resolution; reverse fronts retain nonfoil scanning codes; Crystal insertion is deliberately unresolved; imported SAM provenance depends on the supplied files; physical Cosmos appearance and activated mask/material boundaries require the next reference-driven task. The catalog and opener work, but these limits prevent claiming every physical printing is fully reproduced.
