# Single-card opening performance

Implementation and review: October 4, 2026. Baseline source: `6d0242d8` (before the optimization). Tests use the existing local assets, including the user's uncommitted mask edits, identically for both versions.

## Cold-load follow-up

The user prioritized fresh-page cold opens. Two changes are retained:

- `309ff219`: evaluate the four MaterialX stock-noise hash corners in independent uint vector lanes. Every seed, wrapping integer operation, rotation and final division matches the original. A GPU comparison against Three's scalar reference matched 262,144 sampled values on both Firefox WebGL and Chromium WebGPU. Alakazam and Blastoise captures were pixel-identical. This reduced the observed cold Alakazam run from 9,420 to 7,328 ms.
- `319e8d76` plus `c0f8c3a7`, `1be32741`, and `a9af1bd5`: overlap foreground shader compilation with actual foil-worker generation, with an explicit worker-start acknowledgement. Each future generated texture has its own placeholder sampler before compilation to prevent Three's texture-UUID aliasing. Full-resolution fields are rebound, uploaded and compiled/checked before presentation. The acknowledgement is opt-in to preserve the CPU pack-worker protocol. Authored/plain cards without manufacturing work keep the serial path. No speculative GPU work was added to Gallery.

One internal cold Alakazam run reached 5,977 ms. Matching-type subsequent cards measured 1.7–2.2 seconds across runs. These do **not** establish instant loading. The stronger final actual-Gallery-click test (`scripts/profile-cold-click.mjs`) ran three separate fresh Firefox browser contexts and measured **5,380 / 6,659 / 8,325 ms**, median **6,659 ms**, mean **6,788 ms**. Shader preparation accounted for 4.7–6.9 seconds. Each run waited for the loading overlay to be hidden and the viewer to be active; click-wall timing includes Playwright dispatch/polling overhead. Browser errors: none. Reports are in `artifacts/cold-click/report.json`.

The serial/overlapped Sylveon comparison (`scripts/check-cold-parity.mjs`) was pixel-identical at front, tilt and dark poses. It did not establish a cold speed gain from overlap for Sylveon; its plain/authored fields have no manufacturing work to overlap, hence the serial-path guard. The Firefox lifecycle check passed all eleven interaction/cancellation/eviction checks without page errors. Early post-opening frame intervals still included 141–171 ms spikes; smooth immediate interaction is not yet proven. The production build passed; the suite reports 247 passes and the same 27 existing failures. Final TypeScript validation passed after the guard and protocol fixes.

Experiments with a stock-relief loop, vector spectrum evaluation, batched synchronous links, identity UV matrices, and a specialized CPU field loop did not establish consistent additional gains and are not active. Authored maps, finish settings and resolution were preserved. The remaining cold shader bottleneck and the user's instant-opening objective are unresolved.

## Firefox correction and cross-card reuse

The earlier Chromium numbers below did not establish an improvement for the user's Firefox workflow. Before cross-card shader sharing, the Firefox matrix still measured Alakazam at 12,779 ms (9,360 ms compilation), Sylveon at 15,906 ms, and Blastoise at 11,090 ms. Exact-card cache hits were fast, but new cards were not materially faster. The task was not solved by the resident-card pool.

A captured GLSL comparison isolated redundant shader variants: Base Set cards differed only in substrate colors, stock-grain offsets, and glint seeds. Those values were embedded as literals, defeating Three's source-keyed program cache. They now use per-material uniforms. Seed offsets are still calculated on the CPU before conversion to GPU floats, preserving the original rounding and deterministic patterns. Card crop/layout coordinates, border colors, and crossed-facet seeds also use uniforms. Material instances and textures remain independent.

Sequential Firefox/WebGL measurements on the same local hardware:

| First visit to each card, in order | Before uniforms | After uniforms | New GPU pipelines after change |
| --- | ---: | ---: | ---: |
| Alakazam | 9,758 ms | 9,475 ms | 3 |
| Blastoise | 7,701 ms | 2,218 ms | 0 |
| Chansey | 7,348 ms | 2,166 ms | 0 |

These are single samples, not latency guarantees. A later run during other repository activity measured 11,218 / 3,915 / 2,858 ms respectively and again zero new pipelines for the second and third cards. This establishes actual different-card program reuse; it does not establish fast first-ever compilation, or universal sharing across structurally different materials. Source captures and reports are in `artifacts/cross-card-before`, `artifacts/cross-card-uniforms`, and `artifacts/cross-card-final`. `scripts/profile-cross-card.mjs` asserts no new pipelines for subsequent Base Set cards.

The matching Alakazam screenshots were pixel-identical after the uniform conversion. The original Blastoise capture still had a loading overlay and is unsuitable for pixel comparison; Chansey differed by at most four channel levels. These captures do not prove appearance equivalence at all light angles. No authored card maps or optical profile values were changed by this work.

First-ever Firefox compilation remains slow (roughly 9–11 seconds total in these runs). Its WebGL backend did not expose parallel shader compilation on the tested driver. Moving this compilation into Gallery without addressing the synchronous stall could merely move the freeze earlier. The full opening-speed goal remains incomplete. Program reuse lasts while a compatible program has a live renderer reference; the three-domain resource budget can evict the last compatible reference.

Final checks: TypeScript and the production build passed. The suite reports 246 passes and the same 27 baseline failures. Firefox passed all eleven lifecycle/interaction checks with no page errors, using a test page with HMR disconnected because unrelated asset edits repeatedly reloaded the page. Early frame intervals included 91–182 ms spikes; this run does not establish hitch-free opening.

Full-resolution deterministic pattern fields are now revisioned and persisted, unlike the earlier implementation described below. Firefox validation must take precedence over the historical Chromium-only conclusions.

## Earlier Chromium investigation (historical)

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

Run `scripts/profile-card-opening.mjs` with `BROWSER_EXECUTABLE` pointing to an installed Chromium; `PROFILE_URL` selects the comparison server. It uses a fresh browser context, WebGPU, a 1440 Ã— 1100 viewport, the same assets, and sequential scenarios. `scripts/check-viewer-lifecycle.mjs` verifies interactions and lifetime behavior.

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

Before/after captures were reviewed for Sylveon, conventional holo, and non-holo rendering. At that stage, no card material code or authored assets had changed. Subsequent shader specialization and uniform conversion are described above; authored assets remain outside this performance change. Screenshot review found no visible regression; it does not prove identical output on every GPU, light angle, or supported printing.

The unit suite reports 246 passes and 27 failures; the pre-change checkout reports the same 27 failure names. These concern existing catalog/asset/registration expectations, with no new failing test. New resource ownership, pending-job sharing, failure retry, invalidation, LRU eviction, superseded-entry teardown, and telemetry lifetime tests pass.

First-ever full-quality compilation and procedural manufacturing generation remain the dominant cost. A Gallery-only card is faster but **not near-immediate** until its full-quality resources are resident. Persistent reload now retains downloaded assets and full-quality manufacturing arrays, but not GPU programs. The implementation deliberately avoids compiling/uploading every visible Gallery card, which would compete with Gallery rendering. The new domain budget does not bound pre-existing pack/authoring caches, and comprehensive real-device Gallery frame-time and backend coverage remain outside these local WebGPU measurements.

Development diagnostics: `window.__holo.opening()` exposes bounded event/stage histories, resource-pool statistics, decoded texture and packed-map hit/miss counters, downloaded-asset counters, and persistent-cache metrics. Events cover metadata, transition start, CPU readiness, upload readiness, residency hit, resource readiness, first full-quality submission, and interaction scheduling. Stage timers cover image decode, map packing, procedural fields, total CPU/material preparation, upload/readiness, and shader compilation. No new production console logging is emitted.
