# Sylveon ex 156/131

The picker entry uses ten dedicated 1800x2475 PNG maps. The user-attached
724671-L.jpg guided the etched flow and material distribution. Its temporary
file path was no longer available, so the attachment was reviewed directly;
the clean local front supplied contour coordinates. The supplied silver mask
is retained unchanged in research and registered to Sylveon's shorter ex title.

Body contours cover the ears, face, bow, legs, tail and four ribbon paths.
The user's corrected green outline is registered directly to the clean front
in `scripts/prismatic/sylveon-body-trace.png`, with antialiased boundaries.
Three ribbon openings retain background material. Crown crystals and individual
gem tips have separate microdiamond coverage, leaving the forehead textured.
The upper and middle right microdiamond field is softly bounded and retains
the underlying relief. Text protection follows glyphs and smooth rule panels.

Curving ribbon and flower incision fields are differentiated before clipping.
Fine body relief, perimeter etching and direct-light metallic ink highlights
use the established Prismatic material. Print brightness never becomes height.

Groove spacing, depth, hidden continuation and the extent of the right-side
microdiamond region are estimates from the single supplied view. Regenerate
with `python scripts/prismatic/sylveon_maps.py`; review overlays and lighting
captures are in `artifacts/sylveon-156/`. Asset hashes are in
`156-holo-evidence.json`.

The active height and normal assets now come from the preserved exact TCGL
etch at `research/tcgl/sv08.5-156/sv8-5_en_156_std.etch.png`. Regenerate these
two maps with `python scripts/prismatic/tcgl_etch_normal.py`. Height embossing
uses strength 0.25 over a height-map span of 0.25 (estimated 5 micrometres).
Normal RGB strength is zero during height embossing to avoid duplicate relief.
Normal alpha carries existing protection and clips height gradients after
differentiation, leaving text flat without false boundary bevels. Embossing
changes lighting normals; it does not displace the card mesh. The old procedural
height and normal no longer contribute.
