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
