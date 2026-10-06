# Favorites first-page optimization

The measured interval starts before `openBinder()` constructs an unloaded binder
and ends after a rendered frame contains every first-page card (12 cards).
No full-resolution card preparation, binder construction or GPU warming happens
before that interval. The fixture has 73 favorites and uses the original
full-quality card resources.

## Work removed

Page surfaces are immutable; deformation is driven by each page's pose texture.
Build the merged backing, sleeve and weld geometry once per side, then share
those buffers. Keep materials, pose textures and raycast geometry independent.
Six pooled pages now retain six surface buffers instead of eighteen: 14,883,840
bytes instead of 44,651,520. Discard the source planes, temporary non-indexed
copies and unused position snapshots after merging. Scene disposal owns the
shared buffers; page disposal owns only page-specific resources.

The cold shell also stays out of ordinary rendering until its asynchronous
preparation finishes. This prevents an early frame from synchronously compiling
the unfinished shell while asset and decode completions wait. This readiness
ordering accompanies the work reduction; displaying an empty shell does not
count as loaded and is not the performance milestone.

## Reproduction and results

Run `node scripts/binder-first-page-check.mjs` with a local dev server, without
concurrent builds or browser tests. Every sample uses a fresh browser context.
The baseline restores per-page surface construction and the original early
presentation order while retaining all other current workspace behavior.
Reports and screenshots are saved under `artifacts/favorites-binder/`.

Two paired WebGPU runs measured complete first-page loading at 10.38 -> 7.29 s
and 9.69 -> 8.38 s. Construction improved from 738 -> 424 ms and 682 -> 414 ms.
A further verification pair measured 10.38 -> 6.49 s and 678 -> 382 ms.
These are local samples with timing variation, not a fixed latency guarantee.
Early exploratory measurements overlapped a public-asset build copy and were
excluded from these results.

The verification pair hashes every surface's position, normal and UV attributes;
all match the per-page baseline byte for byte. Pose textures and mutable raycast
meshes remain unique. Every populated first turn presents 24 cards with no new
texture or pipeline creation. Card image dimensions, texture filtering and card
material responses are unchanged. No card assets or etched-card registrations
were modified.

TypeScript, the production bundle, and the eight binder/favorites unit checks
pass. The broader suite has 261 passes and 28 failures in card/catalog/asset
checks outside the edited binder code; see `artifacts/binder-tests.txt`.

## Shared immutable card edges

Full-quality CPU-prepared cards now reuse the same edge material when the
complete edge finish, metal settings and card thickness match. This eliminates
eleven identical edge node-graph builds on the first twelve-card page. Front
and reverse materials remain independent, including their seed-specific stock
grain. The resource domain owns shared edges; card disposal releases only its
own faces. Domain disposal releases the edges after all its cards.

Set `BINDER_COMPARE=edge` when running the first-page check to compare this
change alone, preserving the earlier geometry and readiness optimization in
both cases. Two paired WebGPU samples measured 7.16 -> 6.66 s and 9.44 -> 8.23 s
for the complete first page. Edge material/node builds fell from twelve to one.
Frame P95 improved in both pairs (99.9 -> 66.6 ms, 110.9 -> 105.6 ms).
Populated page turns still created no new pipelines or textures. The material
ownership tests verify that disposing one card preserves the shared edge for
the others and that ordinary instances keep their original disposal behavior.
The further lifecycle verification pair measured 7.65 -> 8.97 s, despite the
same twelve-to-one reduction. End-to-end timings remain noisy; the first two
pairs should not be interpreted as an improvement guaranteed on every run.

## Shared printed-back graphs

Printed backs with the same texture, crop and complete physical finish now
clone one authored node graph. A material reference supplies each clone's
original `(seed % 97) / 7, (seed % 71) / 11` grain offset, with separate material
instances and per-object GPU uniform bindings. This uses the original stock
shader, including parallax, roughness and micro-normals. Holographic reverses
also avoid constructing and immediately discarding an unused printed material.
The graph-template cache is limited to sixteen recent entries so imported
backs and crop edits cannot accumulate an unbounded set of templates. Live
clones retain their nodes independently when an unused template is evicted.

Set `BINDER_COMPARE=back` to compare this optimization alone while keeping shared
edges enabled in both samples. Printed-back node builds fall from twelve to
one; together with shared edges, this removes twenty-two redundant graph builds
from the first page. Pairs measured 8.98 -> 6.83 s, 6.74 -> 7.31 s, and
7.39 -> 7.24 s. The shader work reduction is verified, while asset/CPU and
machine-load variation still prevents a reliable fixed end-to-end saving.

Set `BINDER_VISUAL=1` for a pixel comparison of Alakazam and Blastoise backs in
Studio and grazing Skim light. All four comparisons have zero changed RGB
channels and zero mean channel difference. Populated first turns still create
no new pipelines or textures. No preload, reduced image resolution, reduced
surface detail or deferred compilation on first presentation is involved.

## Reuse invariant stroke calculations

The registered Base Set star generator now evaluates each horizontal stroke
shape once per lattice row instead of once per raster row. Phase, grating axis
and spacing are also reused within that row; the vertical envelope still updates
at every raster row. Float64 intermediates preserve the original arithmetic.
Only about 18 KB of temporary row storage is added at production resolution,
released with the worker job. Worker count, priority and card-load concurrency
are unchanged. This is local reuse within a requested card's calculation,
without preparing cards ahead of demand.

`node --experimental-strip-types scripts/registered-star-row-check.mjs` compares
against the generator at `dcdd1350`, alternating execution order across six
production-size fields. All direction and relief bytes match exactly. Mean CPU
generation time fell from 328.5 to 271.7 ms (17.3%); individual savings range
from about 5% to 34%. Existing golden hashes also pass at three resolutions.

`BINDER_COMPARE=stars` selects this isolated baseline in the first-page check;
the reference module is supplied to the actual browser worker. Initial cold
pairs measured 7.00 -> 6.87 s and 7.92 -> 6.15 s. The first pair briefly overlapped
a focused test run, so it should not establish an end-to-end saving. Page-turn
checks still show zero new pipelines/textures and all 24 cards presented.
End-to-end timing and cold-load frame P95 remain variable; CPU byte equivalence
and eliminated calculations are the repeatable evidence. No card assets,
etched geometry, material finish or image resolution changed.

The final isolated pair, with an assertion verifying that the baseline worker
module was intercepted, measured 7.88 -> 6.07 s for all twelve cards rendered.
Cold-load frame P95 was 94.5 -> 99.9 ms, so this is a load-time improvement,
not evidence of improved loading-animation smoothness. The populated turn
again created no pipelines or textures. TypeScript, the production bundle and
eight focused binder/material/pattern tests pass.

## Firefox and the recorded eight-card page

The earlier Chrome/WebGPU Base Set benchmark did not describe the supplied
Firefox recording. Firefox defaults to WebGL here, and this machine's Firefox
does not expose `KHR_parallel_shader_compile`. Its synchronous shader links
block image decode callbacks as well as presentation. The recording ends with
eight cards, including Ancient Mew, Jolteon ex 153 and Sylveon ex 156.

`scripts/binder-recorded-load-check.mjs` now uses Firefox/WebGL at 2560 × 1392
and those eight cards, including the 40 HP Base Set Pikachu. Readiness requires
every expected card and another rendered frame, not the blank shell. It records
CPU stages, actual pipeline sources and compilation durations. Set
`BINDER_BASELINE=full` to supply the unchanged stock and holo implementations
from `05536377`, and disable the new alias pass in that independent context.
The test asserts that the baseline modules were actually intercepted.

The code changes retain the same surface response:

- Stock relief stores its cell, interpolation weights, derivatives and final
  grain/fine samples explicitly, avoiding repeated expression expansion.
- Registered optical fields select their authored endpoint directly. The
  radial pattern generator is absent when its blend weight is exactly zero.
  Fractional blending keeps the original interpolation.
- Exactly zero engraving, sheen, metallic-ink sheen and ink-transmission
  contributions omit their unused computations. Cache keys include every new
  specialization, with browser checks for distinct enabled/disabled variants.
- WebGL removes copies between identically typed immutable generated shader
  temporaries. Expressions and their evaluation order remain unchanged. The
  pass retains copies involving mutation, early reads, type conversion or
  `out`/`inout` helpers or runtime loops, and never rewrites helper-function
  bodies or bindings. Comments cannot participate in declaration/write analysis.

An initial eight-card Firefox sample measured 49.0 s. Later unmodified-baseline
samples fell to 26.90 and 23.95 s, so that whole improvement cannot be attributed
to these edits. The final pair with the recorded Pikachu measured
**23.95 -> 20.62 s (13.9%)**. Browser profiles are fresh, but machine load and
driver caches outside the profile still vary. This remains much slower than
the earlier WebGPU result; no fixed six-second Firefox claim is justified.

With `BINDER_VISUAL=1`, the test compares all eight card bounds in Studio, Skim
and Low key. The final comparisons cover 1,398,891 RGB channels: 392, 330 and
288 channels differ, respectively, by at most one 8-bit level. The comparison
excludes unrelated binder-shell geometry edits made by another task during
testing. No card assets, masks, authored normals, optical settings, texture
resolution, worker count or preparation concurrency were changed. No preload
or warm-up was added. Fourteen focused tests, TypeScript and the production
bundle pass. A final repetition with all safeguards and shader-error/variant
assertions measured 23.42 s. Its three comparisons differ in 425, 395 and 303
channels, respectively, still by at most one 8-bit level. This variation is why
20.62 s should not be treated as a promised load time. The recorded-card page
also completes on Chrome/WebGPU (11.16 s), without shader errors.

## Apply the simplifier to asynchronous shader builds

The WebGL simplifier was attached to `NodeBuilder.build()`, but Three r186's
`compileAsync()` uses the separate `buildAsync()` implementation. Both paths
finish in `buildCode()`. The hook now wraps that shared method, after shader
source generation. A regression test exercises both entry points and verifies
that vertex and fragment copies are eliminated without changing the result or
building twice. All existing conservative alias-analysis safeguards remain.

The recorded-page benchmark now records blocking WebGL calls, the longest
opening frame, steady-state median/P95 frame intervals, and page errors.
`BINDER_BASELINE=async` routes the prior renderer and unchanged stock shader
from `2aa774c8`, retaining the current binder geometry and catalog. Baseline
interception is asserted. The metric remains opening an unloaded binder through
all eight cards presented; no work starts before the Favorites request.

The retained-code comparison measured **34.311 -> 29.061 seconds (15.3%)**.
The longest opening frame measured **4.328 -> 2.817 seconds**; steady-state
frame median remained 16.66 ms and P95 measured 22.22 -> 16.68 ms. These are
samples on a shared machine, not a guaranteed improvement on the user's device.
They do **not** establish the requested twofold speedup. Shader linking still
dominates. Reports are `recorded-retained-before.json` and
`recorded-async-pass-only.json` under `artifacts/favorites-binder/`.

All eight card bounds match within one RGB level in Studio, Skim and Low key
(372, 327 and 287 changed channels out of 1,401,558). Fifteen focused tests,
TypeScript and the production bundle pass. No assets, shader equations,
material settings, preload behavior or binder presentation timing were changed.

Discarded experiments included deferred page-wide shader completion, GPU-fence
polling, cooperative graph scheduling, shader-local temporary declarations and
a looped stock-noise implementation. Some combinations measured 17.9 seconds,
but batching produced a 7.6-second opening pause and the isolated stock loop
regressed total loading. None of those experiments remain in production code;
their best timings must not be presented as the delivered performance.
