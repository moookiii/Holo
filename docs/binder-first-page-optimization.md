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
