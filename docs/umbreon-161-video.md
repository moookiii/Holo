# Umbreon ex 161/131

The picker entry `pokemon:sv08.5-161:holo` uses `prismatic_sir_texture`
(Prismatic · SIR etched holo). Six registered 1800 × 2475 PNGs provide foil
coverage, ink protection, height, normals, absolute roughness and a separate
crown/gem microdiamond mask. Normal-driven
reflection and diffraction respond to the existing card tilt and studio lights.
The gem finish uses short square microcuts with staggered rows, varied facet
inclinations and pixel-area filtering. Individual flashes are selected by light
and viewing angle over a restrained spectral base. It does not use the repeating
pyramidal normal atlas, which read as grain and a regular grid in the studio.
The curved background and character keep their original optical layer.

The original surface reference is the user-supplied
`2026-09-24 17-52-17-00.00.09.028-00.00.33.805.mp4` (24.823 seconds).
Seven lossless portrait crops, with timestamps and hashes, are retained under
`research/prismatic-evolutions/umbreon-video/`. The public evidence manifest
records the video hash and every delivered map hash. Earlier research photos
were not used. Two subsequently supplied detail images, explicitly authorized
by the user, guide the microdiamond crown/gem finish and shallow curved rim
engraving. They are retained as `microdiamond-reference.png` and
`edge-reference.png` beside the video frames and hashed separately in the
evidence manifest. The continuous edge grooves wrap all four border strips.
The later `microdiamond-closeup-reference.png` guides the short square flashes;
the user's 3.6-second `firefox_7532_{;10}.mp4` was reviewed to diagnose the previous
studio appearance. Facet size, inclination distribution and brightness remain
visual calibrations rather than measured manufacturing parameters.
The existing clean card front remains unchanged and supplies
registration and printed-text protection only.

The reconstruction separates the subdued crystal body, finer moon incisions,
curved background ornament, lower concentric fans, reflective perimeter and
opaque rules panels. Curve spacing, relief depth and material parameters are
visual approximations; the recording cannot resolve every original incision.

The annotated review corrections extend the character mask along the right
chest and both toe tips, preserving the open gap and pink gem below the ear.
All six engraved medallions have individual centers, semiaxes and rotations
registered to the printed ornaments. Ring roughness shares the same alignment.
Onyx protection includes the full upper curve of the O; normal calculation
precedes ink masking so lettering does not acquire artificial embossed edges.

Regenerate with:

```powershell
python scripts/prismatic/umbreon_video_maps.py 'C:/Users/jpall/Videos/Captures/2026-09-24 17-52-17-00.00.09.028-00.00.33.805.mp4'
```

Validation: TypeScript and production build (`npm run build -- --configLoader
runner`), all 12 Prismatic tests, and eight WebGPU tilt captures. Local review
artifacts are in `artifacts/umbreon-video-review/`. The broad test run had 118
passing tests and two failures in the untouched remote Pokémon asset fallback
tests (`tests/pokemon-assets.test.ts`).
