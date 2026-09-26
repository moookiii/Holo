# Umbreon GX 154/149 — Sun & Moon Base Rainbow Secret Rare

The front is the unmodified TCGdex high.png for sm1-154. Its metadata response
and all six user photographs are retained in research/umbreon-gx-sm1-154.
The photographs verify the physical rainbow finish; TCGdex's generated variant
flags alone are not used to identify that finish.

The main photograph is projectively registered to the 600x825 front with SIFT
and RANSAC (257 inliers in the first photo, 151 in the complementary angle). Registration
is retained as a research transform, not baked into the front artwork.

Background ridge orientations are measured from the registered photograph's
local structure tensors, weighted by directional coherence across both views. Three groove families are classified, photographic
fragments are rejected, and measured junctions seed a straight triangle mesh.
The resulting geometry is saved as traced-groove-regions.json. It is a
reconstruction, not an exact recovery of every triangle: obscured and low-
contrast junctions, pitch, ridge depth, and continuation are estimates.
Photo brightness and highlights are never copied into height or color maps.

Smooth authored contours separate the head, long ear, ear ring, rear ear,
tail, tail ring, torso and feet. Periodic curved relief follows the observed
body flow. Silver bars and border use wavy cuts. Attack energies use concentric
rings with protected center symbols. The Dark Call GX backdrop and lower rule
backdrop are smooth; their energy circles retain independently authored relief.

All runtime masks are 1800x2475 PNGs. Normals are derived before region clipping.
Foil coverage, glyph protection, height, normals and roughness remain separate.
The dedicated pokemon-sm-rainbow-triangles material projects a uniform foil
grating onto the authored normals; ink-colored direct-light highlights reveal
the grooves. Extra emboss, procedural engraving, random sparkle and unrelated
facet noise are disabled.

Reproduce with python scripts/register-umbreon-gx.py followed by
python scripts/create-umbreon-gx-maps.py. Overlays and light/tilt captures are in
artifacts/umbreon-gx-sm1-154. source.json records front and map hashes.
