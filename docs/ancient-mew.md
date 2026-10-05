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

The reverse now uses its own `pokemon-ancient-mew-back` profile and registered
PNG coverage/direction maps. Foil covers the gold print and all eight gem faces;
the navy artwork stays matte. A uniform grating supplies coherent color travel;
its axis and pitch are estimates from the supplied reverse rotation. Random
grating grains are removed: the unchanged source scan already contains grain.
Gold and gems receive full foil coverage and a polished reflection. The standard viewer
and CPU-prepared card paths both honor this independent reverse material.
Regenerate with `python scripts/ancient-mew/author-back.py`; inspect with
`node scripts/ancient-mew-back-review.mjs`.

Gallery loading now keeps the same artwork, masks, resolutions and optical
settings while avoiding redundant preparation. The field generator calculates
each island's fixed optics and source-column coordinates once, retaining double
precision until the original byte quantization. The full 1466 × 2048 direction
and optical-inclination fields match the original SHA-256 hashes exactly:
`5cbd7f36f199740fe632634c3a8d2c3135b5b1eb2b096e29a62e58d94561e923`
and `e615ca946408f87d04331b223934268d3204fd38252a3b6106a36a9cf0722adb`.

Only the two Ancient Mew profiles use the compact shader path. It emits the
existing seven-band spectral calculation as a shared shader function and omits
inactive thin-film, anisotropy, normal-map and emboss branches. Profile/map edits
that enable those mechanisms invalidate the specialization. Active diffraction,
registered flakes, independent gold foil, stock grain and coating remain intact.
The front WebGL shader decreases from 150,995 to 117,320 characters; the reverse
decreases from 113,843 to 92,098.

Three r186 normally waits for each material's driver compilation before starting
the next. For `card:ancient-mew`, front, reverse and edge driver compilation now
overlap. Node graphs still build sequentially with the renderer's usual yields;
the card remains hidden until every pipeline finishes. Rejections are observed
immediately, all outstanding pipelines settle, and the backend hook is restored
even on failure. Other cards retain their existing compilation path.

`node scripts/ancient-mew-loading-check.mjs` exercises real gallery selection,
records generation hashes, stage timings and emitted shaders, and captures front,
tilt, grazing light and reverse poses under `artifacts/ancient-mew-loading/`.
Set `MEW_BASELINE=1` and `REVIEW_SUFFIX=baseline` to compare the original shader
and serial driver path; use `HOLO_BROWSER_URL` for another backend. In the local
headless Chromium WebGL review, opening fell from 14.3 seconds to 8.6 seconds
(about 40%); the WebGPU check opened in 6.5 seconds. Timings depend on the GPU,
driver and system load. Both backend checks reported no page errors. Matching
WebGL captures differ by at most one 8-bit channel level on the front and two on
the reverse, consistent with floating-point changes in equivalent shader math.

The production bundle, TypeScript check and ten targeted Ancient Mew/loading/
gallery-batch tests pass, including golden-byte checks for soft flake edges and
multiple seeds, pipeline-failure readiness, and live specialization changes.
The full test suite encounters an unrelated extensionless `tcglEtchedFinish`
import-resolution failure in `CardDefinition.ts`. No image or mask assets were
replaced, and no other card definitions or profiles were changed by this work.
