# Ancient Mew

The `ancient-mew` viewer card uses the user's original front and reverse JPEGs
unchanged. Hashes and the supplied `m2-res_854p.mp4` reference provenance are in
`public/cards/ancient-mew/sources.json`.

The video was examined across its full rotation and in closer frames from the
opening three seconds. It guides the strong angular color travel, intermittent
bright flashes, and readable gold foreground. Its resolution does not establish
individual microscopic grating angles; those optical parameters are estimates.
The source scan already contains photographed lighting and bright flecks.

The front's violet substrate and ink-filtered foil now keep the purple body
dominant across tilts, with reduced diffraction strength and second-order color.
The registered flakes still respond to moving light. Gold printing uses its own
PNG coverage and direction maps with a restrained, warm foil response, rather
than broad rainbow bands. Color and transmission are visual estimates from the
reference video, compared against the supplied Firefox recording.

The dedicated `pokemon-ancient-mew` profile uses the `ancient-mew` manufacturing
field, not the Base Set star generator, a Cosmos pass, or a modern etched field.
Its 2,046 registered silhouettes retain irregular rosettes, stepped flecks,
small dots and larger clusters from this front. Each island has a fixed grating
axis, spacing, and optical inclination; light and card movement change the
response. There is no time-based noise or added random sparkle overlay.

Independent 1510 × 2110 PNGs supply purple foil coverage, gold foil coverage,
gold grating direction, outer-edge protection, and flake shapes. The foil reaches
the header, side spaces, rules, and lower symbol region as well as the illustration.
Gold chroma and measured printed band contours separate glyph strokes, Mew's
outline, borders, and symbols from the purple foil. Letter counters and Mew's
dark body remain in the purple region. No height map or etched relief
is generated. The optical inclination data redirects diffraction only; it does
not perturb the physical surface normals.

`python scripts/ancient-mew/author-maps.py` regenerates maps and boundary overlays.
`node --experimental-strip-types --test tests/ancient-mew.test.ts` checks source
hashes, PNG dimensions, full-front layout, and deterministic top-down registration.
`node scripts/ancient-mew-review.mjs` captures five poses under Studio and Strip
lighting; use `HOLO_BROWSER_URL` and `REVIEW_SUFFIX` for the WebGPU comparison.
Review artifacts are saved under `artifacts/ancient-mew*`.

The reverse now uses its own `pokemon-ancient-mew-back` profile and full-face
PNG coverage/direction maps. A uniform grating supplies coherent color travel;
its axis and pitch are estimates from the supplied reverse rotation. Random
grating grains are removed: the unchanged source scan already contains grain.
Gold receives full foil coverage and a polished reflection, while navy ink and
colored energy medallions attenuate the response. The standard viewer
and CPU-prepared card paths both honor this independent reverse material.
Regenerate with `python scripts/ancient-mew/author-back.py`; inspect with
`node scripts/ancient-mew-back-review.mjs`.
