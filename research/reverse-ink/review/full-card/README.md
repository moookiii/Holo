# Full-card review checkpoint - 2026-09-27

All eleven selected families now have rendered **drafts** in the full 630 x 880
card frame, plus transparent 1890 x 2640 PNG exports. These are not complete or
accepted masters. The asset index deliberately keeps `master: null`.

Open `index.html` for all eleven comparisons. Each comparison contains the
selected normalized photo, actual SVG render, and a boundary overlay. Pink is
candidate geometry; ochre dashes indicate print interpolation; blue dashes
indicate unresolved perimeter seeds. The latter must not be treated as measured
geometry. No generated image, photo texture, foil or card text is embedded in
the assets. The PNG is white ink coverage with antialiased alpha, not an RGB
photograph and not an opaque checkerboard screenshot.

## What changed

- The paused compiler now runs for every family. New Grass and Fire glyph
  traces are separate candidates inside the full-card source specifications;
  previously rejected component files have not been relabeled as accepted.
- Repeated glyph poses were fitted against each family's single selected
  photograph. Translation and scale are bounded; rotation is searched.
  Signed boundary contrast distinguishes the light and dark sides. Known
  printed rows are excluded from this offline measurement, without producing
  per-card foreground protection maps.
- Compound SVG paths preserve glyph holes. Boolean subtraction unions adjacent
  openings instead of creating unintended XOR islands.
- Eleven original source hashes were verified. Local observed color and
  relative contrast from the chosen photograph are saved separately in each
  `color-observation.json`; these are not identifiable physical pigment/alpha.
- Ten tests pass, including transparent PNG dimensions, antialiasing, compound
  glyph serialization, geometry-only exports, and explicit candidate status.

## Visual review findings

Every full-card comparison was inspected. The result is **not approved**.

| Family | Selected photo | Remaining visible limitations |
|---|---|---|
| Grass | Bulbasaur | Leaf branch thickness and surrounding cell junctions need correction; new vein trace is provisional. |
| Fire | Vulpix | Alternate-occurrence flame is a new candidate; large repeats and inner flame still differ from the photograph. |
| Water | Squirtle | Repeated droplet orientation improves, but large lower-left geometry and adjoining negative spaces differ. |
| Lightning | Voltorb | Bolt orientations improve; lower-left scale and the footer continuation remain approximate. |
| Psychic | Drowzee | Eye placements improve; weak contrast limits several cell boundaries and header glare limits color evidence. |
| Fighting | Cubone | Rules obscure most upper-body contours; fitted fists alone do not recover the surrounding network. |
| Darkness | Koffing | Crescent poses improve; white rules and dark perimeter limit edge evidence. |
| Colorless | Lickitung | Existing detailed body retained; footer star continuation and perimeter remain provisional. |
| Dragon | Dratini | Large dragon silhouettes improve; several cells and bottom continuation remain approximate. |
| Trainer | Helix Fossil | Poké Ball placements improve; rule-box cutout is only an unknown-region bound, and narrow side motifs remain unresolved. |
| Metal | Varoom | Existing body retained with fitted glyphs; header/footer and some bracket sizes need correction. |

The paused header/side/footer seeds were reused across families with small
offsets. That was not independent evidence for shared geometry. They are now
explicitly marked unresolved in the specs and overlays. Rendering those seeds
in a full-card frame does **not** complete the requested whole-card recovery.

An illustration-shaped blank marks unknown geometry; it does not establish
absence of ink. Do not tile or copy body shapes into it. Likewise, the opaque
Trainer header and rule box do not reveal the underlying pattern.

## Reproduce

From the repository root, after the existing normalization stage:

```powershell
python scripts/reverse_ink/full_card.py all
node scripts/reverse_ink/render_full_card.mjs
python -m unittest discover -s scripts/reverse_ink -p test_*.py
```

The default browser is Edge; `BROWSER_CHANNEL` overrides it. The optional
`register_full_card_glyphs.py <family>` command edits authored poses and writes
its before/after measurements. It is an explicit refinement operation, not a
required rebuild step. Rerunning it starts from the current poses and can
change them further; normal export is deterministic from the committed specs.

The next geometry work is individual selected-photo perimeter tracing and
body-junction correction. Step 2 protection maps, runtime application, and
Step 3 foil/compositing remain outside this work.

Water correction: the large lower-left droplet was incorrectly rotated by the pose fit. Its pose is now manually corrected and locked against refitting; the overlapping generic footer-left opening was removed. Divider-hidden continuation is still estimated.
