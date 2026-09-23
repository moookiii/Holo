# Star Holo: Base Set

`pokemon-base-set-star` is the separate treatment assigned to original English
Base Set holos `base1-1` through `base1-16`, in both the card library and pack
resolver. Normal printings and other sets retain their own material selection.
The material consumes each card's existing foil and laminate maps. Mask assets
and their authoring tools are being edited separately and are outside this change.

## Appearance references

- [PokeHEX, 1999 Pokemon Base Set HOLO ONLY PSA Return!!!, 4:44](https://www.youtube.com/watch?v=Ar1r6cquLxo&t=284s): moving foil reflection, star flashes and quiet background.
- User-supplied Blastoise close-up, September 23, 2026: filled, curved four-point
  stars with unequal sizes, occasional faint eight-point bursts and pinpoints,
  and thick soft horizontal reflections behind the stars.

The manufacturing field uses unequal eight-ray stars with compact centers and
occasional thin, irregular long-ray bursts, following the stars on the card fronts.
Unequal, softly broken horizontal strokes sit beneath them, with finer grain.
Star positions stay fixed. Light, viewing angle and the local grating determine
which wavelengths and neutral reflections are visible. No colored star decals,
time-driven sparkle, raised relief or image hologram are used.

The backing and stars share the existing physical lighting model, with reduced
coupling to the aggregate surface normal to avoid embossed-looking star edges.
Each card uses its own measured scan-ground median to correct the flat substrate
color while retaining registered spatial ink variation: Raichu's blue-green
horizontal bars, Mewtwo's broad angled rays, and other illustrated color regions
stay in their original positions. The moving foil reflection is partially filtered
by those local printed colors. No card-front image is projected into the
manufacturing field, so artwork text cannot turn into spurious reflected imagery.
Blastoise's backing tint follows the supplied blue-violet reference. This remains
a visual reconstruction (`reference-pending`), not a measured optical calibration.
The legacy Galaxy-Star and Cosmos treatments retain their own fields and defaults.

## Verification

Run the app on port 5173, then `node scripts/base-set-star-check.mjs`. It checks all
16 assignments, deterministic field generation, flat relief, live optical
contribution, stability at rest and browser errors. It captures front and two
tilted views in `artifacts/base-set-star/webgl/`. Set `HOLO_BACKEND=webgpu` for
the other backend; set `BASE_CARD=blastoise` and `BASE_REVIEW=1` for additional
Strip, Soft and Low key lighting captures. No mask files are written.

The assignment tests are in `tests/base-set-holo.test.ts`; profile import/export
round-trips are covered by `tests/lab-state.test.ts`.
