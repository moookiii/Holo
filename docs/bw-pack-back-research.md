# Black & White authentic wrapper-back source audit

Research date: 2026-10-11. The 49 existing fronts cover 12 products. This audit finds an English foil-wrapper reverse reference for each product, with six candidates suitable for crop preparation and six compromised references. **It does not establish 12 high-quality production textures.**

Original photographs are preserved locally under ignored `research/pack-backs/bw/`. `scripts/pack-backs/bw-research.json` records direct image URLs, listing URLs, native image dimensions, SHA-256 hashes and individual quality limits. Dimensions below are the entire photograph; slab/background pixels do not count as usable wrapper resolution.

## Stronger crop candidates

These preserve the complete wrapper in the photograph. They still contain photographed foil wrinkles/highlights and need tight perspective correction, background removal and live review before registration. No AI reconstruction or invented printing is appropriate.

| Product | Source photo | Review |
| --- | --- | --- |
| Black & White | [1200 × 1600 original](https://i.ebayimg.com/images/g/lB8AAOSwPW5kwdX-/s-l1600.jpg) · [listing](https://www.ebay.com/itm/195906892117) | Complete empty Reshiram wrapper; readable printing; wrinkles and photographed highlights remain. |
| Noble Victories | [1600 × 1600 original](https://i.ebayimg.com/images/g/zZcAAeSwO6Vp5MO-/s-l2400.jpg) · [listing](https://www.ebay.com/itm/127818307950) | Complete empty wrapper on dark background; readable expansion text; creases and bright foil reflections remain. Prefer this over the tightly clipped Hydreigon photograph. |
| Next Destinies | [1200 × 1600 original](https://i.ebayimg.com/images/g/LMEAAeSwcXdqcCuq/s-l1600.jpg) · [listing](https://www.ebay.com/itm/128008034630) | Complete Mewtwo wrapper on gray surface; readable printing and intact seals; creases remain. |
| Plasma Freeze | [1200 × 1600 original](https://i.ebayimg.com/images/g/ivsAAeSw459qXV27/s-l2400.jpg) · [listing](https://www.ebay.com/itm/158100282271) | Complete reverse on gray surface; readable printing; pronounced foil creases and diagonal glare require live review after cropping. |
| Plasma Blast | [1000 × 1567 original](https://i.ebayimg.com/images/g/K~MAAeSwFH9qSm-9/s-l1600.jpg) · [listing](https://www.ebay.com/itm/800292709244) | Complete close Porygon-Z reverse on red background; readable expansion copy; strong candidate for measured perspective crop. |
| Legendary Treasures | [1600 × 1600 original](https://i.ebayimg.com/images/g/FNgAAeSwgfNo8QUI/s-l2400.jpg) · [listing](https://www.ebay.com/itm/298127314527) | Complete readable Mewtwo reverse; folded top corner and foil reflections remain; seller watermark is outside wrapper. |

## References requiring better photography

Holder rails, glare and stand occlusion cannot be removed by a truthful crop. These references establish reverse design and copy, but should not be silently promoted into finished textures.

| Product | Source photo | Limitation |
| --- | --- | --- |
| Emerging Powers | [932 × 1600 original](https://i.ebayimg.com/images/g/cigAAOSwAsRlxUCY/s-l1600.jpg) · [listing](https://www.ebay.com/itm/186302976320) | Readable Cobalion reverse in PSA slab; horizontal holder rails cross seal transitions. Needs unobstructed source. |
| Dark Explorers | [944 × 1600 original](https://i.ebayimg.com/images/g/8bIAAeSwWeJolteE/s-l1600.jpg) · [listing](https://www.ebay.com/itm/177352453052) | Readable Darkrai reverse in PSA slab; holder rails cross the pack near both seals. Needs unobstructed source. |
| Dragons Exalted | [1200 × 1600 original](https://i.ebayimg.com/images/g/rwMAAOSw-Epl37ht/s-l1600.jpg) · [listing](https://www.ebay.com/itm/394665197659) | Readable Gyarados reverse in sleeve; display stand tabs obscure bottom seal and sleeve adds reflections. Needs unobstructed source. |
| Dragon Vault | [760 × 1302 original](https://i.ebayimg.com/images/g/mtgAAeSwuVhqkwA4/s-l1600.jpg) · [listing](https://www.ebay.com/itm/156671447426) | Salamence five-card reverse, correctly without ordinary booster barcode; dark foil photographed through PSA holder. Rails and glare prevent clean texture use. |
| Boundaries Crossed | [1200 × 1600 original](https://i.ebayimg.com/images/g/jwUAAeSw9V9o1QGk/s-l1600.jpg) · [listing](https://www.ebay.com/itm/187596076118) | Readable White Kyurem reverse; PSA holder rails cross printing near both seals and glare is baked in. Needs unobstructed source. |
| Plasma Storm | [930 × 1600 original](https://i.ebayimg.com/images/g/y6kAAeSw0QJn79Fn/s-l2400.jpg) · [listing](https://www.ebay.com/itm/297179664501) | Complete readable Lugia reverse; PSA holder rails cross print and there are strong specular streaks. Infernape alternative also has rails. Earlier loose wrapper had a missing torn corner. |

## Decisions and verification

- Identified expansion-specific English copy and ordinary foil-wrapper format; rejected cardboard blister/sleeve reverses, front-only photographs, price-sticker coverage and torn printing. Dragon Vault is the distinct five-card product.
- Reviewed selected photographs at native resolution; decoded all 12 files and recorded hashes. Six clean crop candidates represent 24 fronts; the remaining six products represent 25 fronts.
- One reference per product is a sourcing shortlist, not proof that barcode, regional legal print and reverse color are identical for all 49 front variants. Plasma Storm examples visibly vary in reverse color. Match individual artwork/region before assigning a single reverse across variants.
- No images were upscaled, reconstructed, retouched, cropped or installed. No application code, pack registrations, fronts, materials or unrelated sets changed. All existing BW fallback behavior remains pending finished asset preparation.
- Application tests were not run for this research-only change. Source inventory was checked against all 12 generated BW product IDs and all 49 front entries.
