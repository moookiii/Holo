# One-second gallery loading plan

## Target and constraints

Every visible card, including clipped rows, must be rendered within 1,000 ms
after the first Gallery click, scrolling to uncached cards, or changing a query.
Measure cold navigation separately; it also includes application bootstrap.
Keep current preview resolutions, spectral bands, materials, authored normals,
coverage, protection, lighting, antialiasing and motion. No static substitutes,
quality reductions, prewarming before interaction, or startup blocking.

Three subagents audited shader compilation, preview preparation, and startup.
The coordinator owns sequential browser measurements and visual promotion gates.

## Verified baseline

Installed Firefox 158, a separate profile, headless, GTX 1080, production bundle
at the correct `/Holo/` base, 1440 × 1100 viewport. These are individual samples,
not percentile guarantees. Screenshot-verified durations include capture overhead.

| Scenario | Ready/presentation boundary | Screenshot-verified |
| --- | ---: | ---: |
| Fresh navigation | 10,205 ms | 10,422 ms |
| First Gallery click; no Gallery created beforehand | 5,807 ms | 6,001 ms |
| New scroll viewport | 492 ms | 895 ms |
| Lugia search | 564 ms | 644 ms |
| Warm reopening | 356 ms | 526 ms |

Evidence: `artifacts/gallery-firefox/installed-firefox-cold/report.json` and
`installed-firefox-first-open-clean/report.json`. The existing Lab route supplies
a viewer without gallery preloading; dispose its overlay before this measurement.

The explicit WebGPU trial fell back to WebGL; it does not prove a faster backend.
The latest strengthened run checked all 18 visible cards, including clipped cards,
and confirmed WebGL with four samples. Do not change browser feature/blocklist
preferences to manufacture a better benchmark.

Firefox exposes a sanitized GTX 980 string; Windows identifies the physical GTX
1080. Report physical and browser-reported adapters separately.

## Work order

### 1. Establish the regression and measurement gate

All experiments belong in an isolated preview, not the live development server.
Promote only after actual artwork checks, shader/GPU diagnostics, CPU output hashes,
fixed-light/pose image comparisons, and manual capture review pass. No success
based only on `.is-ready`, compile completion, or image comparisons where both
images could be black.

Record worker-local fetch, decode, field generation, packing and transfer times;
main-thread receipt; GPU upload; compiler/link time; and final presentation.
Existing preparation wall time includes main-thread shader stalls. Existing
`firstCardVisible`/`firstCardInteractive` startup marks fire when Gallery is merely
active, and stop startup shader telemetry too soon; correct these milestones.
Record screenshot overhead separately, without subtracting an assumed amount.

Files: benchmark scripts, `main.ts`, `LoadTiming.ts`, `CardPreviewPreparation.ts`,
`card-preview.worker.ts`, `GalleryRenderer.ts`.

### 2. Solve the shader compilation critical path first

Recorded WebGL links take approximately 0.7–0.9 seconds for edges and 2.2–2.6
seconds for the basic foil program in quieter runs. Firefox exposes no parallel
compile extension. Even zero-cost previews cannot currently make a cold click
finish within one second. Moving compilation to a worker improves responsiveness
but does not remove this elapsed-time cost.

First isolated prototype: share the non-area direct-light kernel through a
uniform-bounded, ordered loop, keeping the existing area-light LTC calculation
separate. Reuse the existing PBR, clearcoat, diffraction, and energy compensation
calculations. Hoist derivative-dependent values outside nonuniform control flow.
Start with the basic foil batch and require a real compiler-time improvement and
image parity before expanding to glints and secret rares. A seven-band spectrum
loop was already tried in the sandbox without a meaningful measured improvement.

Next, use supported attribute instancing (`Mesh`, `InstancedBufferGeometry`, named
matrix attributes, public TSL position/normal transforms) to stabilize vertex
programs and avoid unnecessary repeated compilation. Preserve exact transforms
and slot indexing. Do not rename private uniform bindings or inflate capacity to
force a fallback. This helps reuse; it does not by itself remove the first link.

If default-supported WebGPU becomes available, require the actual backend, equal
antialiasing/HDR/color behavior, no validation/device-loss errors, and full visual
parity before considering it. No default backend change is currently justified.

Files: `GalleryMaterial.ts`, `GalleryRenderer.ts`, gallery-local optical helpers.

### 3. Replace cold preview generation with exact prepared artifacts

Build the existing `CardPreview` output offline: all nine Uint8Arrays, raw Float32
parameter bytes, and dimensions. Store it in a compressed binary format. Ordinary
RGBA PNG serialization can lose RGB under transparent alpha; artwork alpha also
contains optical metadata. Source PNG masks and TCGL normals remain unchanged.

Content-address artifacts by complete card definition, resolved profile, every
consumed source SHA-256, preparation/schema version, and dimensions. The build
must invalidate stale artifacts after source/profile changes. Load only requested
visible cards, then restrained overscan. Missing or stale artifacts use the current
lazy worker path; no upfront whole-gallery fetch or remote HEAD checks. Generate
incrementally for the complete catalog, not just benchmark fixtures.

Potential saving: roughly 1.5–2 seconds of current cold preparation waves, subject
to measured fetch/decompression replacement costs. Persistent IndexedDB caching
helps revisits and reloads, and must not count as an empty-cache solution.

Files: a preview artifact codec/generator/manifest, `CardCpuPreparation.ts`, worker.

### 4. Remove upload scheduling and fallback overhead

One upload per animation frame imposes about 300 ms for 18 cards at 60 Hz. Use a
measured small byte/time budget to upload several ready visible cards per frame.
Keep generation-token checks, cancellation, and visible-before-overscan priority.
Check initial texture allocation does not upload 132.7 MB of empty arrays before
populated layers. Preserve the current fixed memory/residency limits.

Bound and measure shared source/decode caching. Clone cached artwork before alpha
mutation. A shared fetch cannot depend only on the first consumer's abort signal.
Four workers currently allow up to 24 native reads; tune from stage evidence.
Protect recently visible cache entries from speculative overscan eviction.

Files: `Gallery.ts`, `GalleryRenderer.ts`, CPU cache/preparation/worker modules.

### 5. Reduce cold navigation bootstrap

Once first-click work is understood, defer hidden picker DOM construction and
pack-only imports. Separate compact searchable catalog metadata from full render
definitions while preserving complete search, variants, masters, and chronological
sets. Store LTC tables as exact binary values. Investigate baking the existing
five-panel environment into its exact half-float CubeUV PMREM atlas, preserving
mapping, color space, filtering, and metadata; do not substitute/refilter another
environment. Compare both viewer and gallery lighting after any such change.

Files: `PresentationUI.ts`, `main.ts`, catalog boundaries, `AreaLightTables.ts`,
`StudioLighting.ts` and a build-time environment generator.

## Budget and acceptance

The following is a target budget, not a demonstrated prediction:

| Work | Budget |
| --- | ---: |
| Query/layout/request dispatch | 50 ms |
| Exact preview fetch/decompress | 250 ms |
| GPU preparation/shader availability | 450 ms |
| Upload and presentation | 150 ms |
| Margin | 100 ms |

The shader experiment must prove its 450 ms budget before claiming that this plan
can achieve a genuinely cold one-second click. Cold navigation additionally needs
major bootstrap savings; its current startup alone exceeds one second.

Use sequential repeated installed-Firefox runs, fresh profile/cache and warm
scenarios separately. Target p95 ≤1,000 ms for all visible cards; record worst and
median as well. Cover scrolling/search bursts, stale completion, close/reopen,
resize/mobile, viewer/pack behavior, Base Set, Sylveon 156, Espeon 155, reverse foil,
metallic print, glints, secret rares, grazing angles and every lighting preset.
No change is promoted before its correctness gate passes. Commit each promoted
change separately and report its title.
