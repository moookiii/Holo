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

Normalization and full-source inspection are established. Structural analysis,
clean geometry recovery, conservative single-color estimates, and per-reference
validation are in progress. The plain Lickitung is evidence for the absence of
the reverse pattern in a regular card, not a calibrated before/after exposure.
Its photography and image processing differ from the reverse photograph.

Unobserved geometry, physical pigment color, and pigment opacity must not be
reported as measured where the supplied photographs do not determine them.
Later passes will handle protection masks and final compositing.
