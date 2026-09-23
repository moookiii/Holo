# Structure findings — measured evidence, not final asset approval

## Corpus

All 34 supplied images are catalogued and inspected: three reverse references
for each of 11 families, plus the non-reverse Lickitung comparison. The extra
Trainer and Metal references supplied during the task are part of the same
manifest. Trainer / Poké Ball is family key `trainer`; Metal is `metal`.

## Radial landmark

After full-card normalization, the large lower-right landmark has a circular
inner ring edge of approximately 105 card-space units. Reviewed fits on 31
references span 103.029–106.207 units; median 104.851. The median center is
(447.975, 598.377). The observed center range is x=442.190–454.027 and
y=588.007–606.351. These are sample ranges, not confidence intervals.

The shared angular contrast profile has its strongest spatial harmonic at **10**
(amplitude 0.31739 versus 0.04912 or less for the other tested orders 6–16).
Visual inspection of the spokes in the clear Colorless, Water, Dragon and
Trainer images agrees with ten spokes. This is direct evidence for a common
radial construction across the family set. The ring, ten spokes and center
symbol retain the same arrangement in the supplied Trainer and Metal images.

Two automatic ring fits are rejected after visual review: Oddish and Abra.
Glare suppresses the target edge and the optimizer selects a larger contour.
Their images remain in the corpus for other observations. No pixels from them
are silently substituted or averaged into an approved contour.

The full per-image measurements, rejection reasons and overlays are in
`review/radial/`. Pink circles mark only the fitted **inner edge of the outer
light ring**, not the outer tips of the surrounding decorative teeth. The
cross marks are fitted centers. These measurements do not recover symbols.

## Current model selection

The evidence supports a **shared radial construction with family-specific
symbols**, with card-relative placement that is similar but not pixel-identical
after outer-edge normalization. Recurrent lower-left symbol placements and
pebble clusters also appear shared, but require separate contour measurements
before they can be represented as common authored geometry.

This is not yet evidence that the *entire* artwork is a single swapped-symbol
master. Nor does it establish a repeating tile: the supplied images show only
one large radial landmark at this scale. A second complete matching period is
not exposed. A tiled extension into unseen areas would be invented geometry.
Use a finite card-space master for this pass unless further evidence establishes
a tile boundary and repeat vector.

The observed offsets can include printing registration, slight differences in
manual corner selection, imperfect perspective correction, and optical image
distortion. They must not be attributed solely to a genuinely different master
or averaged blindly. The Energy Sticker photo has substantial perspective and
partial bottom-edge occlusion; it is an especially weak absolute registration
anchor despite providing useful Trainer geometry between text lines.

## Contrast and ink polarity

`analyze.py` creates illumination-reduced contrast diagnostics and exploratory
median thresholds. They retain text fragments, noise and photo-dependent
boundaries, so **none is a master asset or an approved auto-trace**. The sign of
photographic contrast alone also cannot prove which regions contain pigment:
reflection, underprint and camera response are not controlled exposures.

Physical pigment color and opacity are not independently identifiable from
these uncalibrated photographs. Under a simplified alpha model, observed color
depends on both pigment and unknown substrate illumination. Multiple color/
opacity pairs can produce the same photograph. Any later nominal single-color
asset values must be clearly labeled conservative estimates, accompanied by
the observed patches and uncertainty. The plain Lickitung helps distinguish
reverse geometry from card printing but is not a matched lighting calibration.

## Reproduce the measurements

From the repository root after normalization:

```powershell
python scripts/reverse_ink/analyze.py
python scripts/reverse_ink/measure_radial.py
python scripts/reverse_ink/radial_structure.py
```

The last command applies the recorded visual rejection decisions and generates
the aggregate angular profile. `measure_radial.py` alone emits candidates.
Optimization uses a fixed random seed and a single worker. Reproducibility also
depends on the pinned numerical library versions in `requirements.txt`.

## Remaining Step 1 work

Clean family symbols, surrounding contour geometry, source-grounded color
estimates, the reusable SVG master library, and full reconstruction overlays
are still required. Current ring overlays are structural diagnostics, not a
claim that the complete ink reconstruction is finished. Hidden regions must be
reported as unknown rather than filled with invented shapes. No subsequent
pipeline stage is implemented by this work.
