# Black & White authentic wrapper backs

Twelve BW products cover the 49 existing front selections (BW1–BW11 plus Dragon Vault, BW6-5). There is no BW12 ID in this catalog.

The follow-up sourcing pass found unobstructed English foil-wrapper reverses for all twelve products. Each has a preserved original under `research/pack-backs/bw/`, a reproducible source configuration in `scripts/pack-backs/bw-sources.json`, and hashes/dimensions in `public/packs/pokemon/bw-back-sources.json`. The earlier `bw-research.json` remains the historical rejected/candidate shortlist.

| Product | Native prepared PNG | Source |
| --- | --- | --- |
| Black & White | 671 × 1175 | [photograph](https://i.ebayimg.com/images/g/lB8AAOSwPW5kwdX-/s-l1600.jpg) · [listing](https://www.ebay.com/itm/195906892117) |
| Emerging Powers | 835 × 1464 | [photograph](https://i.ebayimg.com/images/g/SAcAAeSwWUhqYU0c/s-l2400.jpg) · [listing](https://www.ebay.com/itm/178341933573) |
| Noble Victories | 768 × 1380 | [photograph](https://i.ebayimg.com/images/g/zZcAAeSwO6Vp5MO-/s-l2400.jpg) · [listing](https://www.ebay.com/itm/127818307950) |
| Next Destinies | 678 × 1228 | [photograph](https://i.ebayimg.com/images/g/LMEAAeSwcXdqcCuq/s-l1600.jpg) · [listing](https://www.ebay.com/itm/128008034630) |
| Dark Explorers | 694 × 1201 | [photograph](https://i.ebayimg.com/images/g/VrIAAeSw5B5qk2-e/s-l2400.jpg) · [listing](https://www.ebay.com/itm/227501437991) |
| Dragons Exalted | 811 × 1479 | [photograph](https://i.ebayimg.com/images/g/PF0AAeSwxxdqga48/s-l2400.jpg) · [listing](https://www.ebay.com/itm/398292175008) |
| Dragon Vault | 729 × 1387 | [photograph](https://i.ebayimg.com/images/g/GO0AAeSwYdBqsHd4/s-l2400.jpg) · [listing](https://www.ebay.co.uk/itm/117422967447) |
| Boundaries Crossed | 763 × 1394 | [photograph](https://i.ebayimg.com/images/g/k~4AAeSwx-Bp6jxk/s-l2400.jpg) · [listing](https://www.ebay.com/itm/127826158121) |
| Plasma Storm | 639 × 1153 | [photograph](https://i.ebayimg.com/images/g/nJAAAeSw52lqqkzP/s-l2400.jpg) · [listing](https://www.ebay.co.uk/itm/267786903154) |
| Plasma Freeze | 659 × 1218 | [photograph](https://i.ebayimg.com/images/g/ivsAAeSw459qXV27/s-l2400.jpg) · [listing](https://www.ebay.com/itm/158100282271) |
| Plasma Blast | 795 × 1399 | [photograph](https://i.ebayimg.com/images/g/K~MAAeSwFH9qSm-9/s-l1600.jpg) · [listing](https://www.ebay.com/itm/800292709244) |
| Legendary Treasures | 748 × 1368 | [photograph](https://i.ebayimg.com/images/g/FNgAAeSwgfNo8QUI/s-l2400.jpg) · [listing](https://www.ebay.com/itm/298127314527) |

These are representative expansion-specific reverses, not 49 independently verified artwork/region pairs. Reverse color, legal address and barcode variation across front artworks remain uncertified. Photographed creases and foil highlights remain; no printing was reconstructed or AI-generated. Dragon Vault retains its distinct five-card reverse without an ordinary booster barcode.

Processing uses a measured full-wrapper quadrilateral and traced antialiased PNG alpha at native resolution, without upscaling or sharpening. Dark Explorers was rotated through corner ordering. Prepared images were inspected at full resolution and against contrasting alpha backgrounds. The user subsequently revised the final crops; those edits are preserved and output metadata was synchronized without regeneration. These new assets and registrations were prepared before the user clarified that their other reverse crops were already completed; no other set's backs or existing front crops were regenerated.

Validation: Initial BW-specific tests pass (49 local reverse assignments, 12 matching PNG evidence records); TypeScript `--noEmit` passes. All twelve reverse assets decode and pass `prepareWrapper` in the browser. Live picker and flipped-pack captures were reviewed for Black & White, Dragons Exalted, Dragon Vault, Dark Explorers, Plasma Storm and Boundaries Crossed, saved under `artifacts/pack-back-research/`; browser report passed with no page errors. Existing general pack tests retain unrelated failures for missing XY reverses and Sun & Moon source dimension metadata.
