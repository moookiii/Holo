# Selectable non-booster card catalogs

SVP Black Star Promos, Scarlet & Violet Alternate Printings, Scarlet & Violet Energy and My First Battle use the same individual-card navigation as Wizards Black Star Promos. Each tile opens numbered card tiles, with a separate choice for every registered finish. A card click resolves its exact definition and opens it in the viewer. Back returns to the chronological sets picker. Retry, cancellation and viewer-load errors retain the catalog context.

SVP, alternate and Energy definitions retain their existing TCGL/local fronts, masks and finishes. No shader or etched surface was revised. The viewer registers previously unknown definitions on demand rather than failing with “Unknown card.” No GPU preparation occurs for unselected catalog cards.

My First Battle has 34 locally sourced card fronts from the published Bulbagarden catalog, matching the 34 concrete records currently supplied by TCGdex (its headline count of 48 exceeds its actual records). The four initial Pokémon source images show their blue starting-card borders. Other border versions are not synthesized or claimed as included. The six trainer/Energy fronts are the shared fronts referenced in the My First Battle deck lists. All use the nonfoil print-only material.

Its unique card back comes from Austin G.'s physical-product photograph published by PokéBeach, registered from the photographed corners to 733×1024 with a bilinear perspective transform. This retains photographic illumination and is not a clean scan. Source URLs, image dimensions, SHA-256 hashes and registration coordinates are recorded in `public/cards/pokemon/mfb/sources.json`; untouched originals are retained. `scripts/tcgl/source_mfb_catalog.py` reproduces the assets.

- [Published deck lists and front references](https://bulbapedia.bulbagarden.net/wiki/My_First_Battle_(TCG))
- [Photographed product and unique back](https://www.pokebeach.com/2023/09/my-first-battle-cards-revealed-feature-blue-borders-and-unique-backs)

The card list is individual browsing, not a randomized booster or a reconstructed sealed mini-deck order.
