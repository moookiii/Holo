# Single-card opening performance

Implementation and review: October 4, 2026. Baseline source: `6d0242d8` (before the optimization). Tests use the existing local assets, including the user's uncommitted mask edits, identically for both versions.

## What the profile found

Gallery already keeps the renderer, scene, camera, lighting, render target, and its reduced preview infrastructure alive. Opening a card nevertheless created a new `CardFactory`; returning to Gallery disposed that factory. Every repeat therefore decoded full-resolution images again, packed masks again, regenerated manufacturing fields, allocated textures and materials, uploaded them, and built/compiled the material graphs again. Browser downloads were already shared through the revisioned persistent asset cache.

The baseline stage timings demonstrate the problem:

* Gallery-loaded Alakazam: 2,229 ms manufacturing-field preparation, 179 ms upload/readiness, 3,659 ms compilation; 6,104 ms to the measured frame boundary.
* Cold Sylveon: 166 ms upload/readiness and 3,820 ms compilation; 4,498 ms total.
* Repeated Blastoise: 1,465 ms manufacturing preparation, 49 ms upload/readiness, 180 ms compilation; 1,708 ms total.

Metadata resolution is a local array lookup; there is no separate route navigation or remote metadata request in this path. Existing scene infrastructure is reused. The bottlenecks were full-card resource lifetime, CPU preparation, and driver/program preparation, rather than metadata or scene creation.

## Changes and handoff

`WarmResourcePool` owns full-quality card resource domains separately from selection, motion, controls, and Gallery state. Closing the viewer detaches its mesh and releases the active lease. Recently used domains keep their decoded images, packed CPU arrays, manufacturing fields, geometry, GPU textures, and compiled per-card materials. Opening the same definition takes a lease and attaches the ready mesh. It does not rerun preparation, upload, or compilation.

Gallery and the viewer continue to share downloaded originals through `cachedCardAsset`. A Gallery preview has 512-pixel artwork, 128-pixel masks, and 256-pixel manufacturing fields; these reduced representations cannot substitute for full-quality viewer maps. Exact compatible full-quality pack CPU preparation is reused when available. Otherwise a hovered/focused Gallery card gets one bounded full-quality preparation job after a 220 ms dwell, only after visible Gallery previews are ready. Clicking it acquires that same job. Crossing cards quickly cancels the pending dwell; only one speculative job runs. There is no full-gallery preload and no speculative GPU upload or shader compilation.

Independent front/reverse/edge driver pipelines now compile concurrently while preserving Three's asynchronous node-building yields and the final completion barrier. Independent packed-map inputs start loading alongside normal/direction maps. Viewer texture uploads yield between expensive textures after a 5 ms submission slice; one large texture upload itself is not interruptible. Uploads, mip generation, queue readiness, and compilation all finish before displaying the card. There is no reduced-quality presentation step and no intentionally deferred GPU work after presentation.

Foreground preparation/realization is serialized around Three's shared compilation context. Generation checks prevent obsolete results from publishing; returning to Gallery cancels publication. Completed obsolete work may remain useful in the bounded pool. Materials remain card-specific; editing the active profile invalidates that cached entry before it can be reacquired. Imports and the authoring lab retain their existing editable paths.

## Resource tiers and limits

| Tier | Ownership / reuse |
| --- | --- |
| Downloads | Existing 16 MiB in-memory blob LRU and revisioned IndexedDB cache; browser locks coalesce cross-worker downloads |
| Gallery CPU/decoded previews | Existing independent reduced-resolution worker/pixel/preview caches; unchanged |
| Viewer decoded inputs and prepared CPU maps | Retained in a card domain; a dwell and click share its preparation promise |
| GPU textures and geometry | Retained with the domain on the same renderer; explicitly disposed at eviction |
| Materials/programs | Retained per card, preserving uniform isolation and renderer program reuse |
| Viewer state | Motion, controls, selection, framing and lighting stay outside the pool; cached meshes are detached when idle |

The new pool targets at most three domains and a 512 MiB **combined CPU/GPU storage estimate**, using 10 bytes per texture pixel to account conservatively for decoded storage plus GPU mipmaps. It includes decoded input masks even when they are not uploaded. It is not a hardware VRAM query and does not include the existing Gallery, environment, framebuffer, driver/program, or pack caches. Live leases and unfinished work cannot be evicted, so active/transition allocations may temporarily exceed the budget. Oversized entries are discarded when idle; oldest idle domains are evicted first. The lifecycle test exercised eviction and ended with three idle entries and a 33 MB estimate.

Keys include the complete card definition and resolved profile. Same-URL authored asset and implementation changes continue to invalidate persistent data through the existing source/asset revision system and reset in-memory resources on page reload. Failed preparation is removed and can retry. Teardown disposes live, idle, in-flight-completed, and superseded edited entries. Renderer telemetry uses removable observers rather than nesting wrappers that could retain disposed factories.

## Measurement method and results

Run `scripts/profile-card-opening.mjs` with `BROWSER_EXECUTABLE` pointing to an installed Chromium; `PROFILE_URL` selects the comparison server. It uses a fresh browser context, WebGPU, a 1440 × 1100 viewport, the same assets, and sequential scenarios. `scripts/check-viewer-lifecycle.mjs` verifies interactions and lifetime behavior.

The measured boundary is request/click through completed loading plus two animation-frame callbacks. Development telemetry separately records first full-quality frame **submission** and a following responsive animation frame. These are browser scheduling/readiness measurements, not compositor presentation timestamps or GPU execution timestamps. Hover-click measurements also include Playwright click/wait overhead. Cold means a fresh browser context for this scenario, not a cleared OS filesystem or graphics-driver cache. Single samples are diagnostic comparisons, not statistical latency guarantees.

The matched baseline and optimized measurements, before the final upload-yield refinement, were:

| Scenario | Before | After |
| --- | ---: | ---: |
| Already visible in Gallery, first full-quality open | 6,104 ms | 3,791 ms |
| Cold etched Sylveon | 4,498 ms | 3,127 ms |
| Repeat etched Sylveon through Gallery | 1,008 ms | 9 ms |
| Cold holo Blastoise | 5,369 ms | 4,281 ms |
| Repeat holo Blastoise through Gallery | 1,708 ms | 8 ms |
| First non-holo Bulbasaur | 1,738 ms | 1,246 ms |
| Repeat non-holo | 170 ms | 6 ms |
| Immediate hover/click, new card | 6,962 ms | 4,056 ms |
| Settled hover/click, new card | 7,264 ms | 1,934 ms |
| Warm persistent cache after page reload | 5,603 ms | 2,825 ms |

The prepared hover's click-to-CPU-ready measurement was 0.1 ms. Resident repeat opens had no `create`, upload, or compile calls. Raw stage timings, cache counters, screenshots, and final upload-yield measurements are retained under `artifacts/card-opening-*`.

## Validation and remaining limits

The lifecycle browser test passed zoom, flip, actual pointer drag, profile-edit isolation, return-to-Gallery cancellation, rapid switching with exactly one correct visible card mesh, two-sided Ancient Mew foil, constructed metal geometry, and bounded LRU eviction. No browser page errors occurred. The first 30 frame intervals after a cold etched open ranged from 1.3 to 8.1 ms in that headless run; no delayed post-opening upload/compile hitch was observed. This is not a real-display frame-rate guarantee.

Before/after captures were reviewed for Sylveon, conventional holo, and non-holo rendering. No card definitions, materials, optical profiles, map settings, authored normals, protection/foil masks, roughness, or source assets were changed. The user's eight pre-existing PNG edits remain uncommitted and untouched by this work. Screenshot review found no visible regression; it does not prove identical output on every GPU, light angle, or supported printing.

The unit suite reports 246 passes and 27 failures; the pre-change checkout reports the same 27 failure names. These concern existing catalog/asset/registration expectations, with no new failing test. New resource ownership, pending-job sharing, failure retry, invalidation, LRU eviction, superseded-entry teardown, and telemetry lifetime tests pass.

First-ever full-quality compilation and procedural manufacturing generation remain the dominant cost. A Gallery-only card is faster but **not near-immediate** until its full-quality resources are resident. Persistent reload retains downloaded assets, not GPU programs or full-quality manufacturing arrays. The implementation deliberately avoids compiling/uploading every visible Gallery card, which would compete with Gallery rendering. The new domain budget does not bound pre-existing pack/authoring caches, and comprehensive real-device Gallery frame-time and backend coverage remain outside these local WebGPU measurements.

Development diagnostics: `window.__holo.opening()` exposes bounded event/stage histories, resource-pool statistics, decoded texture and packed-map hit/miss counters, downloaded-asset counters, and persistent-cache metrics. Events cover metadata, transition start, CPU readiness, upload readiness, residency hit, resource readiness, first full-quality submission, and interaction scheduling. Stage timers cover image decode, map packing, procedural fields, total CPU/material preparation, upload/readiness, and shader compilation. No new production console logging is emitted.
