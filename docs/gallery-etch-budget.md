# Gallery authored etching within the existing atlas budget

The gallery now samples eligible authored normals at 256x360 instead of
128x180. Plain authored finishes reuse the otherwise unused primary detail
slot (image 6). The lower-resolution normal slot retains roughness in alpha.
The source is decoded once at the larger size; no new asset request, normal
generation, texture array, per-card material or full-resolution GPU map is added.

Eligibility requires an existing normal, authored-normal diffraction, no special
optical model, normal scale 1, zero emboss, and plain layers without engraving,
facet tilt, relief, pattern relief, normal variance or iridescence. Other finishes
retain their detail maps. The per-instance selector reuses the existing preview
parameter row; it does not change shader batch keys. Existing source PNGs, card
registrations, material settings and protection/foil boundaries are untouched.

Validation against baseline `7156bb4797f6046756d93e7a1704482040ab5643`:

- Espeon 155 and Sylveon 156 select the sharper slot. Only preview images 2 and 6
  change; front, coverage, fields, other detail maps and upload dimensions match.
- Each preview remains 2,765,504 bytes, with the same batch key.
- The live renderer retains nine arrays, 48 slots and 132,744,192 allocated bytes.
- Prismatic 001 normal is an unchanged-pixel control.
- TypeScript passes. Gallery/cache tests pass 20 checks; `gallery.test.ts` cannot
  load because `megaRarity.ts` imports extensionless `profiles/prismatic` under
  Node's native TypeScript runner. This unrelated import was not changed.
- Headless Chromium renders both reference cards with no page errors. Matched
  Studio, Skim, Low key and fixed-phase Moving light captures and a JSON report
  are saved locally in `artifacts/gallery-etch/`.

Run `node scripts/gallery-etch-check.mjs` against the development server.
`GALLERY_URL`, `ETCH_BROWSER` and `ETCH_BASELINE` optionally select the server,
installed Chromium executable and baseline revision.

This preserves network source bytes and GPU residency/upload budgets; it is not
a claim of literally identical loading time. Larger decoded normals consume more
of the existing bounded CPU pixel cache and may change decode time. The recorded
sequential timings have different cache states and are not a cold-load A/B test.
256x360 is still a gallery approximation of the offline authored normal, not
full-resolution viewer detail or a measurement of physical groove depth. Studio
highlights can still hide fine etching. Source geometry, normal polarity, UVs and
all exact-card evidence remain those of the existing registrations.
