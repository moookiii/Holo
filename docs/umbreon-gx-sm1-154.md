# Umbreon GX 154/149 — Sun & Moon Base Rainbow Secret Rare

The front is the unmodified TCGdex high.png for sm1-154. Its metadata response
and the user photographs are retained in research/umbreon-gx-sm1-154.
The photographs verify the physical rainbow finish; TCGdex's generated variant
flags alone are not used to identify that finish.

The main photograph is projectively registered to the 600x825 front with SIFT
and RANSAC (257 inliers in the first photo, 151 in the complementary angle). Registration
is retained as a research transform, not baked into the front artwork.

The background uses a congruent equilateral lattice with alternating upright
and inverted triangles. Nested triangular grooves follow the minimum distance
to each triangle edge; the resulting height field is continuous at shared
edges. This replaces the irregular photo-segmented mesh, which mistook lighting
boundaries for changes in the die pattern. The triangle side is 36 print pixels
and groove spacing is 1.65 print pixels, estimated from the complementary close-up
in rich-color-reference.png. Lattice phase, depth and hidden continuation remain
estimates. Geometry is saved in traced-groove-regions.json for inspection.
Photo brightness and highlights are never copied into height or color maps.

A local inner-leg opening is traced against the clean front so background
triangles stop at the leg while the foreground grooves continue through the
paw. The GX bar still covers the hidden part of this contour.

Smooth authored contours separate the head, long ear, ear ring, rear ear,
tail, tail ring, torso and feet. Periodic curved relief follows the observed
body flow. Silver bars and border use wavy cuts. Attack energies use concentric
rings with protected center symbols. The Dark Call GX backdrop and lower rule
backdrop are smooth; their energy circles retain independently authored relief.

All runtime masks are 1800x2475 PNGs. Normals are derived before region clipping.
Foil coverage, glyph protection, height, normals and roughness remain separate.
The dedicated pokemon-sm-rainbow-triangles material projects a uniform foil
grating onto the authored normals; ink-colored direct-light highlights reveal
the grooves. Printed-ink optical density and restrained neutral substrate reflection preserve
color contrast; the stronger spectral response remains driven by light and
authored normals. Extra emboss, procedural engraving, random sparkle and unrelated
facet noise are disabled.

Reproduce with python scripts/register-umbreon-gx.py followed by
python scripts/create-umbreon-gx-maps.py. Overlays and light/tilt captures are in
artifacts/umbreon-gx-sm1-154. source.json records front and map hashes.
