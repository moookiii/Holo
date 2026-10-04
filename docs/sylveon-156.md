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

The body, foil and protection boundaries retain the earlier photo-guided maps.
The extent of the right-side microdiamond region remains an estimate from that
view. The earlier synthesized incision fields are replaced completely by the
exact TCGL etch below. Print brightness never becomes height.

If regenerating region maps with `python scripts/prismatic/sylveon_maps.py`,
always run `python scripts/prismatic/tcgl_etch_normal.py` afterward: the first
script also emits legacy relief maps, and the second replaces them with the
active TCGL relief and Espeon-matched roughness. Review overlays and lighting
captures are in `artifacts/sylveon-156/`. Asset hashes are in
`156-holo-evidence.json`.

The height and normal assets come from the preserved exact TCGL etch at
`research/tcgl/sv08.5-156/sv8-5_en_156_std.etch.png`. Regenerate these maps
and roughness with `python scripts/prismatic/tcgl_etch_normal.py`. Live relief
uses the precomputed protected normal at strength 1, with height embossing off,
matching Espeon 155's material path. TCGL groove geometry is unchanged; slope
gain is calibrated to Espeon's primary etched-background RMS slope (~0.183).
Sylveon uses Espeon's background/body/secondary roughness values and surface
metalness, laminate, reflectance and etched ink sheen. Existing Sylveon region
and protection masks supply all boundaries. The normal PNG is opaque RGB;
protected areas contain flat normals. The TCGL height remains available for
inspection and contributes no additional relief. Physical depth remains an
estimate; no mesh displacement or invented linework is introduced.

## Exact source and conversion

- Source: https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sv8-5/sv8-5_en_156_std.etch.png
- TCGL card entry: `sv8-5_156`.
- Variant: `Sylveonex_sv8-5_156_std_SpecialIllustrationRare_SvUltra_Etched`.
- Raw source: 733x1024 RGBA, preserved with its paired TCGL front.
- Output: 1800x2475 opaque RGB tangent normal, replacing
  `public/cards/pokemon/prismatic-evolutions/maps/156-holo-normal.png`.
- Invert luminance for recessed white strokes; no vertical flip, crop, or UV
  offset. Resize the full image domain to the existing Holo map dimensions.
- Unblurred Scharr derivatives, slope gain 1.03, normalize and encode
  `(-dH/dx, +dH/drow, +Z)`. Apply protection to slopes after differentiation.

## Live finish review

Reviewed in Holo Lab on 2026-10-03. Compared Espeon 155 and Sylveon 156 at the
same neutral studio and dark inspection lighting, with the Etch pose
(-15 degrees yaw and pitch). Also inspected Sylveon with near-front reflection,
narrow grazing light, diagonal tilt, strong side light, and moving strip sweep.
The TCGL directional lines remain visible; protected print and smooth panels
do not acquire raised outlines. No visible inversion or UV drift was found in
the full-card views. The source/front alignment overlay remains available for
closer inspection; screenshot review cannot establish physical groove depth.

Only Sylveon 156's normal, roughness and per-card finish settings changed in
the Espeon matching pass. Espeon and the other cards were not modified. The
existing card front, foil coverage and protection PNGs retain their hashes.
Capture: `artifacts/sylveon-156/espeon-finish-review.jpg`.
