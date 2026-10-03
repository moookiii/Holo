# English Neo Discovery

Neo Discovery (`neo2`) contains 75 numbered English cards and was released June 1, 2001 in the Neo series. Structured data and unmodified first-edition fronts come from [TCGdex](https://api.tcgdex.net/v2/en/sets/neo2). `catalog.json` snapshots the responses; `sources.json` records front URLs and SHA-256 hashes. The original images show first-edition stamps, so the browser offers that edition rather than relabeling those images as unlimited.

## Product research

[PSA's Neo Discovery article](https://www.psacard.com/articles/articleview/9436/psa-set-registry-collecting-2001-poke-mon-neo-discovery-1st-edition) documents the English 11-card booster: seven commons, three uncommons, and one rare. Four designs feature Scizor, Smeargle, Xatu, and Umbreon. No basic Energy or reverse-holo slot is added.

The original Wizards packaging photographed in [this listing](https://www.ebay.com/itm/267603527376) states “Premium card odds approx. 1:33 cards.” Eleven cards per pack gives approximately one premium/holo per three packs. The recipe implements that approximate rate, replacing the rare slot. Uniform selection within each rarity pool and independent packs are simulation assumptions: exact factory sheets, box runs, and guarantees have not been reconstructed.

The four front photos are from [Loose Packs](https://loosepacks.com/products/neo-discovery-1st-edition); the reverse is the original green-leaf Neo Discovery wrapper in the packaging listing above, rectified to a rectangle. The reverse photograph is an unlimited wrapper; it is shared as cosmetic reverse art for the first-edition product, not evidence of edition-specific reverse differences. `wrapper-sources.json` records source URLs, hashes, and crops. Logo and symbol are original TCGdex assets.

## Treatment and master registration

Exactly `neo2-1` through `neo2-17` receive the holo treatment: Espeon, Forretress, Hitmontop, Houndoom, Houndour, Kabutops, Magnemite, Politoed, Poliwrath, Scizor, Smeargle, Tyranitar, Umbreon, Unown A, Ursaring, Wobbuffet, and Yanma. All other IDs are print-only. In particular, the counterparts at 20–36 are separate prints. Names never select a treatment.

The user's 17 SAM 3.1 masks are authoritative, retained byte-for-byte in `scripts/neo-discovery/masks`. White protects opaque subjects; holes remain holes. Their hashes and original filenames are in `mask-sources.json`. The maps resize those masks and combine them with a separate bounded artwork window. Basic and evolved layouts use the existing WotC print-window shapes, including the evolution-medallion occlusion. No segmentation, morphological subject repair, or text reconstruction was performed. All shipped maps are PNG.

The WotC Cosmos field accepts a full-front registered motif map. It gives each authored island a continuous optical response without random extra spots, sparkle, or embossed relief. Each of the 17 master scans was measured separately: local contrast proposes centers and radii, printed-edge clearance rejects glow along protected subjects, and filled antialiased disks preserve continuous interiors. `cosmos-registration.json` records 600×825 master coordinates, radius, and measured core brightness. Brightness becomes one optical gain per disk; the unchanged front retains the original colors and starburst detail. Clusters and empty areas come from those coordinates, not a random galaxy seed. Optical orientation is seeded; it does not move spots.

These disk radii and angular optical response are estimates from flat masters. The implementation does not claim to recover physical relief or exact foil-sheet diffraction axes from a scan. Printed starburst rays remain in the master front; the registered optical islands use smooth disks. Complementary angled photographs would be needed to validate exact directional behavior. No unrelated set or shared shader was retuned.

## Architecture and verification

The adapter serves the local structured catalog through the existing set/card interface. Pack browser metadata, availability, stable IDs, recipe collation, import resolution, CPU preparation, GPU realization, and resource caches use the shared systems. Analysis and mask generation run offline; runtime never runs blob detection or SAM.

Regenerate the catalog with `node scripts/neo-discovery/fetch-catalog.mjs`, protection maps with `python scripts/neo-discovery/create-holo-maps.py`, and registered motif maps with `python scripts/neo-discovery/register-cosmos.py`. `--remeasure` rebuilds detected coordinates; ordinary runs reuse the checked registration. `cosmos-corrections.json` allows explicit reviewed additions/removals in master coordinates.

`tests/pokemon-neo-discovery.test.ts` verifies all 75 front hashes, every holo PNG, original mask hashes, stable treatment identity, all four wrappers, local adapter behavior, complete checklist coverage in 3,000 seeded packs, 7/3/1 slots, and separate normal rares. Browser checks open all four wrappers and both rare outcomes; the render review captures all 17 holos under front, tilted studio, and strip-light poses. Review captures and timing reports are local artifacts under `artifacts/neo-discovery*`.
