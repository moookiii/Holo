# Expedition Base Set regular holos

All 32 English Holo Rare prints, `ecard1-1` through `ecard1-32` (1/165–32/165), now use the existing `pokemon-base-set-2-cosmos` material with their own registered PNG motifs. The previous print-only/pending registration is replaced. Reverse holos and non-holos retain their existing treatments.

## Sources and registration

The printed masters are the untouched 600×825 numbered TCGdex fronts under `public/cards/pokemon/expedition/`. Exact URLs and original hashes are in `sources.json`; the registration also records each URL, English holo variant, dimensions and SHA-256. Every front, existing holo window and supplied SAM protection PNG matches the pre-existing `mask-evidence.json` hash. No protection was re-segmented. Artwork in the matching non-holo/reverse masters is used only to reject printed details, never to replace these regular-holo fronts or supply foil positions.

Coordinates cover the complete front: no artwork crop, UV offset, flip or warp. `scripts/expedition/cosmos-registration.json` is the stable placement source; explicit additions and print rejections are in `cosmos-corrections.json`. The separate `cosmos-proposals.json` remains candidate evidence. Automated local-contrast proposals were reviewed against whole-window overlays and original pixel-grid details; candidate count is not a completeness claim.

`register-cosmos.py` rasterizes circles and measured ellipses analytically at 1200×1650 output pixel centers, with an antialiased perimeter and continuous filled interior. Observed star/rosette boundaries use filled, supersampled polygons. Gain reflects reviewed scan brightness; it is not a height map. Max composition preserves neighboring brighter dots. Corrections remove internal highlight candidates inside each measured feature, rather than deleting a broad neighborhood that would erase distinct nearby dots. Foil coverage and print protection compose separately in the established renderer.

Whole foil overlays and motif-only windows were inspected individually for all 32 cards, including borders, narrow print gaps and broken-dot swirls. The large/medium/small hierarchy is preserved; swirl points keep their observed sequence. Charizard and Tyranitar have explicitly traced noncircular features. Prominent corrected examples:

| Card | Corrected feature in 600×825 master coordinates |
| --- | --- |
| Alakazam 1 | Right blue/green disk `(566.5,300.5)`, radius 14.4; printed psychic orbs excluded |
| Ampharos 2 | Three full disks `(499,142)` r12.7, `(527.5,210)` r14.5, `(188.5,299.5)` r14.5 |
| Arbok 3 | Right full disk `(528,301.5)`, radius 14.5 |
| Blastoise 4 | Small right feature `(546.5,301)`, radius 4.5; adjacent spot stays separate |
| Skarmory 27 | Lower-right full dark disk `(494,371)`, radii 22.5×21.8, including the bright upper crescent |
| Vileplume 31 | Right-edge full disk `(567,195.5)`, radii 24×22, including dark upper half and cyan lower highlight |
| Weezing 32 | Right white disk moved down to `(552,295.5)`, radius 14.5; upper-middle disk `(393,204.5)` r14 |

The other cards' explicit measurements, shape observations and review notes are recorded in the corrections and final registration. All site assets are opaque grayscale PNGs (`maps/1-cosmos.png` through `32-cosmos.png`); there are no runtime detections, normal maps or height emboss assets. Base Set 2 Cosmos optics, CPU preparation/GPU realization and cache behavior are unchanged. No new whole-set GPU preload is introduced.

## Review and validation

Local captures are saved under `artifacts/expedition/cosmos/` (full-card overlays, whole-window zooms and motif-only images), `artifacts/expedition/cosmos-redo/` (original/non-holo comparison and pixel-grid measurements) and `artifacts/expedition/live/{webgl,webgpu}/`. Front Studio, left/right rotation, Strip grazing, Low key dark, Soft specular and moving-light captures were generated for every card. Front foil renders were inspected individually; the reported cards and selected grazing/dark/specular poses received additional inspection. The same controls captured Base Set 2 Alakazam (`base4-1`) and Wizards Promo Entei (`basep-34`). Large dots stay complete, individual dots respond at their registered locations, and subject/text printing remains opaque under the existing SAM composition.

`audit-cosmos.py` verifies all 32 original master/SAM/window hashes, output mode/dimensions/hashes, filled interiors, explicit corrections and byte-identical PNG regeneration from saved registration. The live check compares the realized Cosmos field against each authored map: zero missing/extra pixels in the checked field, correct orientation, nonempty coverage and moving-light changes. This checks data realization; visual placement was reviewed separately. The WebGPU run completed cards 1–31 before a page reload interrupted Weezing; a separate successful run completed Weezing and both references. All 32 therefore have successful WebGL and WebGPU checks.

The four Expedition catalog/pack/clean-master tests and `npm run build` passed. `expedition-cosmos-validation.json` records the audit and successful backend results. Capture files are local review artifacts, excluded by the repository's existing ignore rules.

## Remaining uncertainty

Placements follow the visible features of each exact clean master, not another physical copy. Very faint, scan-grain-sized or completely occluded features cannot be established reliably from a 600×825 scan; their hidden geometry is not invented. Partial disks are completed from their visible outer arc and clipped by the supplied masks. The original scans retain their photographed foil colors/highlights, so a rendered dark angle cannot erase a highlight already printed into that master.

Exact-print physical-photo/video references were sought, but a matched moving recording of each scanned specimen was not available. This pass does not claim measured per-card angular brightness or exhaustive recovery of invisible features. The established Base Set 2/Entei material response is deliberately inherited. No unrelated set assets or Cosmos shaders were changed by this work.

## Reproduce

```powershell
python scripts/expedition/register-cosmos.py
python scripts/expedition/audit-cosmos.py
node scripts/expedition-holo-check.mjs
$env:HOLO_BACKEND='webgpu'; node scripts/expedition-holo-check.mjs
node --experimental-strip-types --test tests/pokemon-expedition.test.ts tests/expedition-clean-masters.test.ts
npm run build
```

Use `--finalize` after editing explicit reviewed corrections. `--propose` changes only proposal data/review previews and requires a new manual review before finalization. The mask-preparation script does not write authored Cosmos maps.

## Reverse-holo lower-panel registration

All 159 reverse prints now have lower-panel coverage registered to their own
active printed master. The earlier shared basic/evolved silhouettes drifted at
the copyright curve, bottom e-Reader bars and side rails. Each full-card trace
is saved in `scripts/expedition/reverse-boundaries.json`; the site's maps remain
PNG files. Six legacy Trainer prints now reference their own numbered reverse
PNG instead of sharing `trainer-legacy-reverse.png`.

The offline authoring pass fits bounded RGB/yellow edge transitions, then
reviews and corrects the proposals. Straight printed edges are constrained to
straight traces so copyright lettering cannot scallop the perimeter. The ten
Lightning cards have individually reviewed faint-border corrections, using
smooth interpolated curves instead of tracing letters or barcode strokes.
Trainer coverage follows the gray rules panel, its rounded lower bulge and
copyright contour; the right reader rail and yellow illustration divider remain
opaque. Their lower-left corners receive a separate constrained review.

Coordinates are the complete 600×825 front, without cropping, UV offsets or
flips. Output masks are opaque grayscale PNGs, 600×825 except the legacy
Charizard 40 map, which retains 1200×1650. The supplied upper/name masks and
Charizard's internal moon/divider cutouts are preserved in deduplicated PNG
seeds. The clean fronts, regular-holo windows, SAM protection, Cosmos motifs,
materials and other sets are untouched by this registration.

`prepare-assets.py` reapplies the saved registration after its legacy geometry
generation, so regeneration cannot restore the misaligned shared lower panels.
The normal registration command rasterizes the saved traces rather than
redetecting image content. `reverse-boundary-evidence.json` records the active
front and output hashes, dimensions and transforms for each card.

Native-resolution boundary sheets, individual full-card overlays and 2× bottom
crops are saved in `artifacts/expedition/reverse-boundaries/`. The audit checks
all 159 exact front hashes, original headers, opaque reader rails and
byte-identical regeneration. The live check saves front, Strip grazing and Soft
specular renders and compares realized lower coverage with the authored PNG.
Border contrast on the yellow Lightning scans limits subpixel certainty;
registration follows the visible printed frame and does not claim additional
physical foil geometry hidden in those scans.

Final validation: all 159 WebGL prints and 12 representative WebGPU prints
(1, 2, 4, 31, 40, 124, 137, 139, 140, 154, 158, 159) passed with zero loaded
coverage mismatches, zero bottom-rail coverage and no page errors. Each received
front, grazing and specular captures. Native boundary sheets and individual
problem areas were reviewed separately from these data checks; Alakazam,
Blastoise, Lightning, Trainer and Energy renders received angled visual review.
The five Expedition tests, offline audit and production build passed.

```powershell
python scripts/expedition/register-reverse-boundaries.py
python scripts/expedition/audit-reverse-boundaries.py
node scripts/expedition-reverse-boundary-check.mjs
$env:HOLO_BACKEND='webgpu'; node scripts/expedition-reverse-boundary-check.mjs
```
