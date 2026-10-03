# Gengar · Phantom Corridor

Original full-art card in the Original / Atelier collection. The supplied 1200 × 2400 JPEG is retained byte-for-byte and displayed at its native 1:2 ratio on both faces, with no added text or frame.

Thirteen registered PNG fields separate primary foil, opaque subject protection, geometric height, tangent normals, roughness, laminate, pattern, sparkle, metallic ink, secondary foil, uniform grating direction, packed coverage and packed surface. Zero sparkle/metallic/secondary maps deliberately disable those mechanisms. `boundary-review.png` is a source-aligned contour review, not a material input.

The original die consists of curved perspective flutes converging near the corridor opening. Height comes exclusively from analytic geometry. Print pigment modulates foil coverage only. Normals are derived before material clipping and fade to flat before the protected silhouette. The uniform grating follows those authored normals. Procedural engraving, extra emboss, facet noise and sparkle are disabled. Spacing and depth are design choices, not measured physical relief.

Regenerate with `python scripts/create-phantom-corridor.py [source-jpg]` (Pillow, numpy, scipy). Omitting the source uses the retained front. Browser review captures are in `artifacts/phantom-corridor-final`.

The main character cutout is the user-supplied `front - Copy.jpg`, retained as lossless grayscale `subject-cutout.png`. Its decoded values and edge feathering are preserved without resizing or thresholding. Regeneration uses this PNG; all optical settings and the original front remain unchanged.
