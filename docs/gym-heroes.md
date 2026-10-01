# Gym Heroes — English 1st Edition

The Gym series now offers all 132 numbered TCGdex `gym1` cards, four original
1st Edition wrapper designs, and all 19 authored Cosmos holos. Exact set/number/
variant/edition lookup is shared by the viewer and pack preparation. Non-holos
remain print-only; no reverse or unlimited printings are offered.

## Catalog and packs

- [TCGdex checklist](https://api.tcgdex.net/v2/en/sets/gym1): released August 14,
  2000; 19 Holo Rare, 23 Rare, 42 Uncommon, 48 Common. The Common count includes
  the six Basic Energies numbered 127–132.
- The 132 unmodified local fronts have individually recorded source URLs and
  SHA-256 hashes in `public/cards/pokemon/gym-heroes/sources.json`. Their printed
  1st Edition stamps were visually checked, including Trainer and Energy cards.
- Each pack contains six non-Energy commons, one in-set Basic Energy, three
  uncommons, and one rare. The rare slot uses an **estimated** 1-in-3 holo rate
  and uniform selection within each pool. It does not simulate factory sheets.
  [The opening archive](https://pokemonboosterpack.com/archive/pages/about)
  separates the Energy slot; [PSA's set overview](https://www.psacard.com/articles/articleview/9353/psa-set-registry-collecting-2000-poke-mon-gym-heroes-1st-edition-card)
  describes seven commons, three uncommons, and one rare.
- Brock, Misty, Erika, and Lt. Surge wrapper fronts come from
  [Loose Packs](https://loosepacks.com/products/gym-heroes-1st-edition).
  The shared reverse comes from an actual
  [Gym Heroes wrapper photograph](https://www.mercari.com/us/item/m17025025831/),
  rectified to its printed boundaries. It is a separate opened wrapper, not a
  matched photograph of each front; photographed creases and wear remain.
  `wrapper-sources.json` records original/output hashes and crops.

## Coverage and Cosmos

Each holo uses separate 1200 × 1650 PNGs for the artwork window, opaque print
protection, and registered Cosmos motifs. Source coordinates are 600 × 825.
The prepared user traces are preserved in `scripts/gym-heroes/traces`, with
source hashes in `trace-sources.json`. Green/red marker color never reaches the
rendered front.

The existing Base Set 2 Cosmos material and worker/cache path are reused.
Gym Heroes supplies its own per-card dot centers, radii, density, and placement
in `cosmos-registration.json`; there is no random distribution added to a scan.
Every registered motif is a filled, antialiased disk, not a brightness cutout or
a hole in foil coverage. Local contrast proposes positions only. A disk has
one continuous optical response. Subject-edge glows are rejected, with reviewed
corrections for the dim large orbs on Rhydon and Gengar. Dim orb boundaries are
visual radius estimates from the front, not measurements of physical relief.

There are 169–596 registered motifs per card. No new shader branch, texture
sampler, runtime detector, emboss pass, or procedural sparkle was added. Scan
lighting and its small printed star-like flecks remain part of the unchanged
front; flat scans do not establish the exact card's angular optical response.

Special handling:

- **Lt. Surge's Electabuzz and Magneton:** solid green marks protect the
  lightning itself. Only explicitly identified character interiors are filled.
  Background enclosed by lightning loops stays foil-active, including spaces
  between Magneton's magnets.
- **Erika's Dragonair:** foil stays active inside the body loop; the wing and
  tail orbs remain protected.
- **Misty's Tentacruel:** each narrow tentacle is protected, with foil between
  tentacles. Moltres and Fearow preserve the gaps around their feet and wings.
- **Rocket's Scyther:** the red contour is interpreted as protection.
- **Brock, Erika, Lt. Surge, and Misty:** the people and emblem strokes are
  protected while hollow emblem centers remain foil-active.
- **The Rocket's Trap:** all three figures are protected, including the small
  background openings around Jessie and the two grunts.
- Evolved Pokémon exclude the overlapping evolution badge. Trainers use the
  lower, wider artwork window; all text and borders remain outside foil.

## Validation and reproduction

Passed `npm run build`, 27 targeted Pokémon/Gym Heroes/Team Rocket/Base Set 2
tests, and `python scripts/gym-heroes/check-maps.py`. The latter checks literal
lightning, open loops, narrow gaps, non-artwork protection, and filled dot cores.
3,000 deterministic Gym Heroes packs cover all 132 cards and reject incomplete
pools or missing edition fronts.

`scripts/gym-heroes-browser-check.mjs` exercises all four wrappers, 11-card
preparation, tear/open/reveal, both rare outcomes, and holo pulls 6, 8, 15, 19.
`scripts/gym-heroes-holo-review.mjs` captures every holo under front, tilted,
and strip lighting and checks active card identities and browser asset errors.
All 19 cards passed on both WebGL and the default WebGPU backend.
Review captures and reports are under ignored `artifacts/gym-heroes-*` folders.

Local sequential WebGL comparison against Base Set 2, at 1440 × 900:

| Measurement | Base Set 2 | Gym Heroes |
|---|---:|---:|
| Viewer median / p95 frame | 5.6 / 6.2 ms | 5.5 / 5.8 ms |
| Tear median frame | 5.3 ms | 5.6 ms |
| Open median frame | 5.5 ms | 5.5 ms |
| Reveal median frame | 5.3 ms | 5.6 ms |
| Pack preparation | 8.61 s | 7.80 s |

No material regression appeared in this local run. Timings depend on hardware,
cache state, and load; this is a representative comparison, not a universal FPS
guarantee. Both packs use ten print-only materials and one holo material.
Run `node scripts/gym-heroes-performance.mjs` to reproduce the comparison.

Asset regeneration, from the repository root:

```text
node scripts/gym-heroes/fetch-catalog.mjs
node scripts/gym-heroes/fetch-wrappers.mjs
python scripts/gym-heroes/prepare-wrappers.py
python scripts/gym-heroes/create-holo-maps.py
python scripts/gym-heroes/register-cosmos.py
python scripts/gym-heroes/check-maps.py
```

Python dependencies: Pillow, NumPy, OpenCV, SciPy, and scikit-image. Normal
Cosmos regeneration reuses checked-in coordinates. `--remeasure` reruns optical
candidate detection and must be followed by visual review; it never measures
height or etching. Fetching is only needed to refresh source assets.
