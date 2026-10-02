# Legendary Collection reverse protection

Run `python scripts/legendary-collection/create-maps.py` to generate separate,
per-card PNG artwork coverage and print protection. It measures frame edges,
extracts dark and red glyphs, preserves gold caption and evolution badge ink,
and registers complete energy discs. These are scan-derived optical estimates,
not relief or etching. Eevee retains its existing authored protection.

The generator writes colored overlays for all 110 fronts and a registration
report to `artifacts/lc-review`. Review the overlays after changing extraction
parameters; automatic circle detection and paper estimation can require further
card-specific corrections. The source artwork remains unchanged.

Gallery reverse coverage uses the 512 x 720 artwork alpha channel so thin ink
is not reduced to the 128 x 180 optical map grid. Primary grating and facet maps
use 256 x 360; other layers retain the reduced tier. Legendary previews apply
facet normals per fragment and use a silver body with restrained diffraction.
The nine-array, 48-slot gallery allocation is approximately 127 MiB.

Validation: production build; 15 LC/gallery/pattern tests; live WebGL viewer
captures for Pidgeotto, Graveler, Omanyte, Full Heal Energy and Pokemon Breeder,
plus gallery captures for Pidgeotto, Graveler and Omanyte. Browser check:
`node scripts/legendary-collection-reverse-check.mjs`.
