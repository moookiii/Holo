# Gallery authored etching within the existing atlas budget

The gallery now samples eligible authored normals at 510x718. Plain authored
finishes reuse the primary field and detail slots (images 3 and 6) for tangent
X/Y channels. Four overlapping quadrants occupy their RGBA channels. One shared
edge texel per quadrant makes bilinear interpolation continuous at the center
seams, using two hardware-filtered reads without branches or neighbor gathers.
This replaces the earlier 256x360 gallery normal tier while keeping all atlas
dimensions, network inputs and upload sizes fixed.

The completed authored normal PNG is decoded once into the full UV domain.
Packing is ordinary two-channel positive-hemisphere normal compression; the
shader decodes Z, without differentiating a height field or generating geometry.
The original mean RGB vector is retained at 128x180, without renormalization,
to estimate unresolved normal variation. Roughness retains the same alpha channel.
The viewer's ink-colored ridge reflection and angular/roughness filtering now
remain active for authored normals even when the profile omits normalFiltering.
Plain eligible batches omit mathematically inactive radial, facet, engraving and
manufactured-silver operations. They use the viewer's mapped bitangent frame.

Eligibility requires an existing normal, authored-normal diffraction, no special
optical model, normal scale 1, zero emboss, and plain layers without engraving,
facet tilt, relief, pattern relief, normal variance or iridescence. Other finishes
retain their detail maps. Packing additionally requires no primary direction or
pattern map. Otherwise the prior 256x360 tier remains available. The selector
reuses the existing preview parameter row. Packed cards have an `:etch` batch
suffix so procedural field data cannot accidentally use the packed decoder.
There are no per-card material batches. Existing source PNGs, card registrations,
material settings and protection/foil boundaries are untouched.

Validation against baseline `7156bb4797f6046756d93e7a1704482040ab5643`:

- Espeon 155 and Sylveon 156 select packed normals. Only preview images 2, 3 and 6
  change; front, coverage, secondary/stamp fields, other detail maps and upload
  dimensions match. The shader key changes to preserve the packing contract.
- Each preview remains 2,765,504 bytes.
- The live renderer retains nine arrays, 48 slots and 132,744,192 allocated bytes.
- Prismatic 001 normal is an unchanged-pixel control.
- TypeScript and the production build are checked. Packing, ridge controls,
  shader separation, gallery masks, cache and upload-budget tests pass.
- Chromium WebGPU and Firefox WebGL render both references without page errors.
  Captures and JSON reports are saved locally in `artifacts/gallery-etch-compare/`
  and `artifacts/gallery-etch-firefox/`. Matched Chromium captures compare the
  previous commit `15122ee98` with this change at DPR 2: Studio, Skim, Low key,
  fixed-phase Moving light, front pose and pointer tilt. Fine background/border
  grooves are visible in the new captures, with no center seam observed.
- In the four fresh-context Chromium WebGPU runs with eight visible SIR cards,
  median steady frame intervals were baseline 16.5/16.7 ms and current 16.7/16.6
  ms. The final viewport-ready samples were current 4331 ms and baseline 4710
  ms. Initial samples were much slower and variable (baseline 44126 ms, current
  18433 ms). These measurements do not prove universal loading-time parity.

Run `node scripts/gallery-etch-check.mjs` against the development server for
pixel/budget assertions and visual captures. `GALLERY_URL`, `ETCH_BROWSER`,
`ETCH_ENGINE`, `ETCH_BACKEND`, `ETCH_OUTPUT` and `ETCH_BASELINE` select the server,
installed browser executable, engine, rendering backend, output directory and
comparison revision. `scripts/gallery-etch-compare.mjs` runs alternating fresh
contexts against commit `15122ee98`, capturing matched lighting/tilt and recording
viewport preparation, shader size and steady animation cadence.

This preserves network source bytes and GPU residency/upload budgets; it is not
a claim of literally identical loading time. Larger decoded normals consume more
of the existing bounded CPU pixel cache and may change decode time. The recorded
sequential timings have different cache states and are not a cold-load A/B test.
510x718 is still a compressed gallery approximation of the offline normal, not
full-resolution viewer detail or a measurement of physical groove depth. The
scalar foil/protection/roughness atlas remains 128x180. Studio highlights can
still hide fine etching. Browser/driver caches, display DPI, other local work and
asset/cache initialization influence observed loading time and frame cadence.

No source asset is replaced or regenerated. Both reference cards still use their
own 733x1024 RGBA TCGL etch, converted offline to the existing 1800x2475 opaque RGB
PNG with inverted mean luminance, full-domain bilinear resize, Scharr scale 1/32,
gain 1.03, protection after differentiation and OpenGL +Y. No flip, crop or offset
is added. Source/variant hashes and alignment evidence remain in each registered
`155-holo-evidence.json` and `156-holo-evidence.json`:

- `sv8-5_155`: `Espeonex_sv8-5_155_std_SpecialIllustrationRare_SvUltra_Etched`.
- `sv8-5_156`: `Sylveonex_sv8-5_156_std_SpecialIllustrationRare_SvUltra_Etched`.

Files changed: preview preparation/packing and optical controls, gallery shader
selection/material, focused regression tests, capture/comparison scripts and this
document. Unrelated card definitions, assets, sets and material profiles are not
modified by this change. The repository's pre-existing unrelated working changes
are excluded from the commit.
