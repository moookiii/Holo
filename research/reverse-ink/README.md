# Scarlet & Violet printed reverse ink — Step 1

This research library is isolated from the renderer. It contains no foil,
shaders, runtime card application, pack logic, TCGdex integration, or protection
masks. All 11 families are tracked independently: Grass, Fire, Water, Lightning,
Psychic, Fighting, Darkness, Colorless, Dragon, Trainer / Poké Ball, and Metal.

## Sources and normalization

`references/manifest.json` records all **34 supplied originals**: three reverse
references per family and one plain Lickitung comparison. Every image has been
visually inspected. Notes record glare, occlusion, resolution, and source role.
Originals remain in the user's Pictures folder, untouched; SHA-256 hashes detect
substitution. The original filenames are preserved in the manifest.

```powershell
python -m pip install -r scripts/reverse_ink/requirements.txt
python scripts/reverse_ink/normalize.py --source-root C:/Users/jpall/Pictures
```

The canonical frame is the full 63:88 card rectangle, represented as 630 × 880
vector units. Default analysis rasters are 1512 × 2112, avoiding loss of useful
source detail; upsampling is not additional evidence. Each raster is warped
once from its EXIF-oriented original, using the recorded full-card homography.
No intermediate JPEG or iterative resampling is used. Rounded corners use the
virtual intersection of straight outer card edges. Sleeve corners and picture
frames are not registration anchors. Manual corner precision remains an error
source, especially on low-resolution and partly occluded photographs.

`normalized/` contains lossless PNG originals, source corner annotations, contact
sheets and `homographies.json`. These large reproducible analysis files are
ignored by Git; compact review outputs will be committed separately. The source
catalog builder is an explicit maintenance operation, not part of normal runs:
it deliberately refreshes source hashes only after reviewing changed originals.

## Reconstruction status

Normalization and full-source inspection are established. The shared ten-spoke
radial construction is measured across all eleven families. Source-derived SVG
glyph components now exist for all eleven families, with three-reference
comparison sheets and explicit uncertainty. Grass vein widths and Fire's small
interior contour remain provisional and require refinement.
These components are not full family masters. Surrounding pattern geometry,
glyph refinement, conservative single-color estimates, and complete master validation
are in progress. The plain Lickitung is evidence for the absence of
the reverse pattern in a regular card, not a calibrated before/after exposure.
Its photography and image processing differ from the reverse photograph.

Unobserved geometry, physical pigment color, and pigment opacity must not be
reported as measured where the supplied photographs do not determine them.
Later passes will handle protection masks and final compositing.

The component library is at `assets/reverse-ink/sv/components/`; its README
records reproduction commands and source limitations. To verify topology and
render the actual SVG exports independently from the photo overlay code:

```powershell
python -m unittest discover -s scripts/reverse_ink -p test_*.py
$env:BROWSER_CHANNEL = 'msedge' # Or an installed Playwright Chromium with this omitted
node scripts/reverse_ink/render_components.mjs
```

`review/symbols/components.png` is the browser-rendered monochrome contact sheet.
Black shows the positive glyph shape; it does not assert printed-ink polarity.
