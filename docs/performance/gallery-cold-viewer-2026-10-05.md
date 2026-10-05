# Gallery to full viewer cold-load baseline — 2026-10-05

Run `node scripts/gallery-cold-viewer-benchmark.mjs` against `npm run dev`. The raw per-profile measurements and opening milestones are in [gallery-cold-viewer-2026-10-05.json](gallery-cold-viewer-2026-10-05.json).

The benchmark chooses one gallery-visible card for each distinct non-`print-only` material profile. For each profile it creates a fresh Chromium browser context, waits until the target gallery preview has `is-ready`, clicks its gallery button, and stops at the app's `fullQualityFrameSubmitted` opening mark. The elapsed interval starts immediately before the click. `?benchmark-cold-viewer=1` disables gallery-to-viewer resource prefetch for this run. Every sample has `residentHit: false`.

| Measure | Time |
| --- | ---: |
| Profiles sampled | 53 |
| Minimum | 1,589.3 ms |
| Median | 2,395.9 ms |
| Mean | 2,665.6 ms |
| Maximum | 5,017.9 ms |

The fastest sample was `sapphire-blue`; the slowest was `ygo-prismatic-collector`. There were no failed samples. The renderer reported `WebGPUBackend` for the run.

These are single samples per profile on this machine, so they are a baseline rather than a distribution. A fresh browser context clears page caches and viewer resources, while the shared browser process and GPU driver may retain compiled state across profiles. The endpoint is frame submission; it does not prove physical display scanout. Run the script again on the same machine and browser configuration for later comparisons.
