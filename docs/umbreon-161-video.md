# Umbreon ex 161/131

The picker entry `pokemon:sv08.5-161:holo` uses `prismatic_sir_texture`
(Prismatic · SIR etched holo). Five registered 1800 × 2475 PNGs provide foil
coverage, ink protection, height, normals and absolute roughness. Normal-driven
reflection and diffraction respond to the existing card tilt and studio lights.
There are no independent sparkle particles or animated texture coordinates.

The sole surface reference is the user-supplied
`2026-09-24 17-52-17-00.00.09.028-00.00.33.805.mp4` (24.823 seconds).
Seven lossless portrait crops, with timestamps and hashes, are retained under
`research/prismatic-evolutions/umbreon-video/`. The public evidence manifest
records the video hash and every delivered map hash. Earlier research photos
were not used. The existing clean card front remains unchanged and supplies
registration and printed-text protection only.

The reconstruction separates the subdued crystal body, finer moon incisions,
curved background ornament, lower concentric fans, reflective perimeter and
opaque rules panels. Curve spacing, relief depth and material parameters are
visual approximations; the recording cannot resolve every original incision.

Regenerate with:

```powershell
python scripts/prismatic/umbreon_video_maps.py 'C:/Users/jpall/Videos/Captures/2026-09-24 17-52-17-00.00.09.028-00.00.33.805.mp4'
```

Validation: TypeScript and production build (`npm run build -- --configLoader
runner`), all 12 Prismatic tests, and eight WebGPU tilt captures. Local review
artifacts are in `artifacts/umbreon-video-review/`. The broad test run had 118
passing tests and two failures in the untouched remote Pokémon asset fallback
tests (`tests/pokemon-assets.test.ts`).
