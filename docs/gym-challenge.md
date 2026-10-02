# Gym Challenge — English 1st Edition

Gym Challenge (`gym2`) contains all 132 English cards, four 1st Edition wrapper
designs, and 20 authored Cosmos holos. The viewer and packs resolve the same
set, number, variant, and edition. Non-holos use the print-only material.

## Sources and pack model

The [TCGdex catalog](https://api.tcgdex.net/v2/en/sets/gym2) supplies metadata and
132 archived original fronts, with source URLs and SHA-256 hashes in
`public/cards/pokemon/gym-challenge/sources.json`. Printed edition stamps were
visually checked. TCGdex's #107, Lt. Surge's Secret Plan, is an Unlimited scan;
the site instead uses the user's unchanged 1st Edition PNG. Its provenance is
in `scripts/gym-challenge/first-edition-override.json`; its metadata stays TCGdex.

The physical opening order is **6 commons → 1 rare → 3 uncommons → 1 Basic
Energy**, as recorded by the [opening archive](https://pokemonboosterpack.com/archive/pages/about).
[PSA's set overview](https://www.psacard.com/articles/articleview/9378/psa-set-registry-collecting-2000-poke-mon-gym-challenge-1st-edition-card)
describes eleven cards and approximately one holo in three packs. Energy is
included in its seven-common total. The rare slot is seventh, not last.

The simulation uses a 1/3 holo chance, uniform selection within each rarity,
and no duplicates within a common or uncommon group. It does not reproduce
factory print sheets or guarantee a fixed number of holos per box.

| Pool | Cards | Slots | Per-card inclusion probability per pack |
| --- | ---: | ---: | ---: |
| Non-Energy Common | 43 | 6 | 6/43 |
| Uncommon | 42 | 3 | 1/14 |
| Non-holo Rare | 21 | 1 at 2/3 | 2/63 |
| Holo Rare | 20 | 1 at 1/3 | 1/60 |
| Basic Energy | 6 | 1 | 1/6 |

There are no reverse holos, secret cards, or Unlimited products in this release.
Blaine, Giovanni, Koga, and Sabrina fronts come from
[Loose Packs](https://loosepacks.com/products/gym-challenge-1st-edition), with
original and processed hashes in `wrapper-sources.json`. All four use the
user's unchanged `back.png`; `back-source.json` records its hash.

## Holo maps

Each holo has separate 1200 × 1650 PNGs for foil coverage, opaque print
protection, and registered filled Cosmos disks. The marked source fronts are
preserved in `scripts/gym-challenge/traces`; marker colors never enter the
rendered front. Coordinates follow the clean 600 × 825 TCGdex scans.

The Base Set 2 Cosmos profile is reused, with per-card centers and radii in
`cosmos-registration.json`. Disks are solid with antialiased perimeters, not
hollow rings or brightness-shaped cutouts. No random extra dots, etched relief,
or new shader pass is added. Registration is estimated from flat scans;
photographed lighting remains in the original fronts and does not establish
the exact physical card's angular response.

Machamp and Raichu protect the user's painted lightning as well as the body,
without filling the background between bolts. Raichu's open body contour and
thin tail are closed separately. Alakazam protects the spoons and lightning
arc while keeping the large space between the hands active. Persian's pillar,
Golduck's dark spikes, Mewtwo's energy, and Zapdos's attack are protected.
Trainer emblem holes remain active. Mewtwo uses its shorter art window; evolved
cards exclude the overlapping badge. Text and borders remain outside foil.

## Verification and reproduction

- `node --experimental-strip-types --test tests/pokemon-gym-challenge.test.ts`
  checks assets, edition override, exact pools, deterministic order, and all
  132 cards across 3,000 seeds.
- `python scripts/gym-challenge/check-maps.py` checks protected subjects,
  open gaps, artwork bounds, and filled optical disk cores.
- `node scripts/gym-challenge-browser-check.mjs` opens all four wrappers and
  checks authored holo and non-holo pulls at the physical rare position.
- `node scripts/gym-challenge-holo-review.mjs` captures every holo at three
  poses. Set `HOLO_BROWSER_URL=http://127.0.0.1:5173/?backend=webgpu` and
  `REVIEW_SUFFIX=-webgpu` for WebGPU. Both backends were reviewed without
  missing assets or page errors.
- `node scripts/gym-challenge-performance.mjs` compares Base Set 2 and Gym
  Challenge viewer, preparation, tear, opening, and reveal timing locally.
- `npm run build` validates TypeScript and the production bundle.

Source refresh: run `fetch-catalog.mjs`, `fetch-wrappers.mjs`, and
`prepare-wrappers.py` under `scripts/gym-challenge`. Rebuild maps with
`create-holo-maps.py`, then `register-cosmos.py`, then `check-maps.py`. Preserve
the checked-in user-supplied pack back and #107 override. Visual review images,
browser reports, and timing reports are generated under `artifacts/`.
