# Source-derived monochrome components

These are reusable **glyph geometry components**, not complete family masters
and not an indication of which side of the geometry is printed pigment. They
have a single `currentColor` fill and no photograph, gradient, filter or foil
effect. Interior cutouts use SVG's even-odd fill rule.

The component coordinate systems match the documented reference patches; do
not assume a centered unit square. The associated source specification records
the patch origin in the 630 × 880 canonical card frame. The independently fitted
radial center and radius supply registration to other photographs.

## Water

`water-symbol.svg` uses six cubic segments for the outer silhouette and four
for its oblique interior cutout. The initial curves were manually placed on
the fully exposed central Psyduck glyph. Bounded edge refinement cannot move
controls more than 2.5 canonical units and penalizes tangent discontinuities.
No glyph pixels come from the foreground text above it.

The same path was visually compared with Squirtle and Poliwag using ring-based
registration, not another glyph fit. Squirtle supports the silhouette and hole;
its attack text crosses the upper glyph. Poliwag supports overall geometry but
is too low-resolution to validate sub-unit edge placement. Some small residual
boundary differences remain; the component is a first-pass reconstruction,
not a claim of exact production artwork recovery.

Reproduce from the repository root after the normalization and radial stages:

```powershell
python scripts/reverse_ink/fit_symbol.py research/reverse-ink/references/water-symbol.json
python scripts/reverse_ink/compare_symbol.py water
```

The fitted controls, photo-edge residuals and per-family comparison sheets are
in `research/reverse-ink/review/symbols/`. Fit residuals describe the selected
photographic edge targets and must not be presented as held-out accuracy.

## Colorless and Lightning

The six-point Colorless star uses twelve measured vertices from Meowth, checked
against Lickitung and Pidgey. Its top tip intersects text in the donor, so that
tip is less certain than the exposed lower edges. The Lightning bolt uses six
vertices from Magneton's exposed central glyph, checked against Voltorb and
Pikachu. The latter makes the inner bend particularly clear. Both components
use straight edges with independent sharp corners; curve smoothing is disabled.

Their `references/<family>-symbol.json` specifications use explicit vertices.
Run the same fit and compare commands with `colorless` or `lightning` in place
of `water`. All three comparison images per family have been visually reviewed;
text-crossed edges and photo registration differences remain visible rather
than being removed from the comparison.
