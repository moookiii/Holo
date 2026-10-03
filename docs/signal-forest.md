# Signal Forest — Atelier 02 / 03

**Signal Arbor** uses the first supplied artwork; **Recursive Gate** uses the second.
The Nocturne reference in this checkout is `public/cards/nocturne/` and its authoring
script is `scripts/create-original.mjs`; `assets/loot/nocturne/` does not exist here.
Nocturne registers its line geometry into coverage and packed height/roughness.
These cards use that principle with separate, higher-resolution PNG fields.

## Print preservation and construction

Each `source.jpg` is a byte-for-byte copy of the supplied JPEG. `front.png` contains
every decoded RGB source pixel at native resolution, unchanged and without resampling.
Arbor adds 24 px horizontally and 48 px vertically on each side; Gate adds 16 / 32 px.
The resulting 1072 × 2144 and 768 × 1536 canvases retain the sources' 1:2 proportions.
The 4.8 × 9.6 cm card has a 0.075 cm corner radius, entirely inside the added margin.
No title, frame, stats panel, or graphic is placed over either image.

The two sides reference **the same print, maps, and native profile**. The existing
back-foil architecture handles the reverse. A 0.042 cm stock and small bevel provide
a physical edge without changing the art. The cards appear beside Nocturne in the
normal catalog; search their titles or “Signal Forest”.

## Authored fields

All material fields are 1536 × 3072 PNGs in the padded print coordinate system.

| Field | Purpose |
| --- | --- |
| foil | Selective coverage along source contour cuts, dots, and foliage boundaries |
| protection | Opaque dark ink and individual side glyphs, including soft edges |
| height | Constant-section recessed lines, rounded shoulders, shallow dot bosses |
| normal | OpenGL normals computed from the continuous die before foil clipping |
| roughness | Satin ground, polished cut centres, softer foliage cuts |
| laminate | Restrained coating with registered line variation |
| pattern | Registered detail visibility, independent of foil coverage |
| sparkle | Explicitly zero; no unrelated glitter population |
| coverage / surface | Packed RGBA / RGB equivalents for existing authoring conventions |

The generator locates thin colored source marks, skeletonizes their topology, and
simplifies them into vector polylines before rasterizing constant-section die cuts.
Small existing dot components become registered shallow bosses. Smoothed tree and
fern boundaries become longer, lower-amplitude contour cuts; short JPEG texture
contours are rejected. Depth is assigned by feature class, never by print brightness.
There are no new random/rainbow paths, and the generator does not recolor the print.
Spacing and relief depth are designed artistic choices, not inferred physical facts.

The foil uses a uniform grating axis independently of the line directions and follows
the authored normals. No extra shader emboss, procedural engraving, random sparkle,
or unrelated facet noise is enabled. No secondary foil, metallic lettering, security
stamp, reverse mask, or virtual image hologram is needed for these art objects.
The source images already contain rainbow colors; those remain visible as original
printed art when the additional reflected foil light recedes.

## Rebuild and review

`python scripts/create-signal-forest.py` rebuilds from the preserved sources.
Dependencies: Pillow, numpy, scipy, opencv-python, scikit-image. For the initial import,
pass `--source-dir` pointing to the directory containing the supplied filenames.
Each source manifest records its SHA-256, source rectangle, dimensions, and trace counts.
Generation asserts exact source-pixel preservation.

`node scripts/verify-signal-forest.mjs` tests both render backends, native catalog
selection, identical material state on both faces, loaded map resolution, and normal /
emboss / sparkle settings. It captures front, back, oblique, sweep, and close detail
views under Studio, Strip, and Low key lighting in `artifacts/signal-forest/live/`.
Colored registration overlays and map contact sheets are in `artifacts/signal-forest/maps/`.
These visual artifacts are intentionally ignored by Git.
