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

## Trainer / Poké Ball and Darkness

The Trainer glyph has concentric circular boundaries and a diagonal dividing
band. The fitted Helix Fossil parameters are retained as editable measurements;
the resulting SVG uses sparse circular Bézier arcs. The small central annulus
is preserved, including its transparent center. Energy Sticker and Old Amber
confirm the structure and line thickness within their photographic limits.

Darkness uses seven hand-authored cubic segments. An initial forced two-circle
model was rejected because it missed visible edges. In the final source fit,
only boundary samples above and below Koffing's rules line influence the fit.
Those are offline measurement intervals, not generated per-card foreground or
protection masks. Grimer and Ekans support the exposed perimeter. All three
references obscure part of the inner boundary, so the connecting curve there
has lower confidence and remains a documented inference.

## Psychic and Dragon

Psychic is traced from Gastly's exposed central glyph. Its enclosure and iris
are connected; the interior aperture is a single U-shaped cutout, with a
separate crescent pupil cutout. Drowzee independently supports these contours.
Abra is shown at the donor's card-space coordinates because its glare-corrupted
ring fit was rejected; that comparison does not validate precise registration.

Dragon uses Dratini's fully exposed central silhouette, including the narrow
interior slit and the long tapered horn. Dragonair and Dragonite support its
shape. The patch is 90 × 105 units so the glyph's full vertical extent is kept.
