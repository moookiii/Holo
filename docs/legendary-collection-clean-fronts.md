# Legendary Collection clean reverse fronts #1–19

Each `N-reverse.png` preserves the decoded pixels of `N.png` outside its artwork-only PNG coverage mask. Regular fronts, other sets, runtime foil maps and shaders are not part of this asset preparation. Only the reverse definition front path is changed.

## Sources

PSA CardFacts supplied the original-resolution scans for every card except #18, which uses the supplied PSA Set Registry gallery scan. Exact LC non-holo theme-deck prints are used for #3, #4 and #7. PokeBeach’s theme-deck listing confirms these variants, but its linked scans returned 404, so the corresponding PSA scans were used.

| # | Card | Artwork source |
| --- | --- | --- |
| 1 | Alakazam | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-1-alalazam-reverse-foil-gem-mt-10-73443.jpg) |
| 2 | Articuno | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-2-articuno-reverse-foil-gem-mt-10-73462.jpg) |
| 3 | Charizard | [LC theme-deck non-holo](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-3-charizard-gem-mt-10-69905.jpg) |
| 4 | Dark Blastoise | [LC theme-deck non-holo](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-4-dark-blastoise-gem-mt-10-69912.jpg) |
| 5 | Dark Dragonite | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-5-dark-dragonite-reverse-foil-gem-mt-10-73465.jpg) |
| 6 | Dark Persian | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-6-dark-pesian-reverse-foil-gem-mt-10-73466.jpg) |
| 7 | Dark Raichu | [LC theme-deck non-holo](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-7-dark-raichu-gem-mt-10-69914.jpg) |
| 8 | Dark Slowbro | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-8-dark-slowbro-reverse-foil-gem-mt-10-73468.jpg) |
| 9 | Dark Vaporeon | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-9-dark-vaporeon-reverse-foil-gem-mt-10-73472.jpg) |
| 10 | Flareon | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-10-flareon-reverse-foil-gem-mt-73444.jpg) |
| 11 | Gengar | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-11-gengar-reverse-foil-gem-mt-10-73455.jpg) |
| 12 | Gyarados | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-12-gyarados-reverse-foil-gem-mt-10-73457.jpg) |
| 13 | Hitmonlee | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-13-hitmonlee-reverse-foil-gem-mt-10-73458.jpg) |
| 14 | Jolteon | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-14-jolteon-reverse-foil-gem-mt-10-80847.jpg) |
| 15 | Machamp | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-15-machamp-reverse-foil-gem-mt-10-73460.jpg) |
| 16 | Muk | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-16-muk-reverse-foil-gem-mt-10-73461.jpg) |
| 17 | Ninetales | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-17-ninetales-reverse-foil-gem-mt-10-73373.jpg) |
| 18 | Venusaur | [LC reverse foil](https://d1htnxwo4o0jhw.cloudfront.net/cert/126913455/356493258.jpg) |
| 19 | Zapdos | [LC reverse foil](https://i.psacard.com/cardfacts/2002-pokemon-legendary-collection-19-zapdos-reverse-foil-gem-mt-10-73375.jpg) |

## Preparation and verification

The committed manifest records original source URLs, SHA-256 hashes, four source and destination artwork corners, and the traced evolution-badge exclusion. The printed inner window edges determine the projective registration. Unconstrained feature homographies were rejected where the holo/non-holo backgrounds made matching unreliable. The scan is resampled once with Lanczos interpolation. No artwork is regenerated, extended, inpainted, sharpened, or reconstructed. No older-set image is substituted.

The native scan color and printed texture are retained. No global exposure transform was applied: the non-holo backgrounds intentionally differ from the regular holo backgrounds, so matching their histograms would be incorrect. Fine halftone/JPEG texture remains visible at high zoom; these are scan-derived assets, not pristine digital masters.

All 19 were visually compared against their exact source windows for crop, perspective, residual holo stars, glare, foil contamination, and frame/badge seams. Articuno’s printed white glints, Flareon’s printed specks, and the illustrated lightning/light streaks are present in the non-holo sources and are intentionally retained. None was withheld for inadequate reference quality. Charizard’s source right boundary was corrected after close-up review to exclude its gold frame.

Run `python scripts/legendary-collection/create-reverse-fronts.py` from the repo root with Pillow, numpy, opencv-python and requests installed. References are cached under `artifacts/lc-clean/`; their hashes and the unchanged base-front hashes are checked before writing. The script saves 19 PNG compositing masks under `scripts/legendary-collection/reverse-front-masks/`, source/base/result comparisons and colored boundary overlays under `artifacts/lc-clean/`, and a validation report asserting zero changed pixels outside each mask. The masks are asset-authoring coverage only and are not runtime foil masks.

Reference pages: [PSA CardFacts](https://www.psacard.com/cardfacts/non-sports-cards/2002-nintendo-pokemon-legendary-collection/images/32746), [PSA Set Registry](https://www.psacard.com/psasetregistry/tcg/company-sets/2002-pokemon-legendary-collection-reverse-foils/imagegallery/283383), [PokeBeach theme decks](https://www.pokebeach.com/tcg/legendary-collection/theme-decks).

Validation: all 19 pixel-preservation checks passed, all 5 LC tests passed, and `npm run build` passed.
