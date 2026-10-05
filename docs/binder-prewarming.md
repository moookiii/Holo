# Binder opening-spread preparation

Once the visible gallery is ready, a 300 ms deferred task prepares the saved
favorites' current opening spread. It builds the binder shell and compiles a
detached clone so the hidden binder never flashes over the gallery. It then uses
the existing full-quality card preparation, upload and shader paths for only the
visible spread. Neighboring spreads start after the binder is opened.

Opening reuses those card instances. Opening during preparation cancels and
continues through the normal queue; a changed collection waits for cancellation
before replacing page slots. Leaving the gallery releases warmup resources.
The existing artwork-first path still fills slots during a cold open.

This shifts work before the click; it does not make cold GPU preparation instant.
An immediate click after startup, changed favorites or uncached images can still
require loading. Warmup also retains full-resolution GPU resources for the
opening spread (about 602 MB in the 24-card sample).

## Verification

Run `scripts/binder-latency-check.mjs` with `BINDER_WARM=1` and
`BINDER_MAX_VISIBLE_MS=1000` against the local Vite server. Omit `BINDER_WARM`
for a cold-click measurement. `BINDER_URL` overrides the server URL.
The script uses installed Chrome, crosses two animation frames after opening,
checks full-quality readiness, captures the spread, and verifies cancellation
with changed favorites. It writes reports to `artifacts/favorites-binder/`.

The prepared 73-favorite sample rendered its 24-card opening spread in 391 ms;
a separate run measured 284 ms. These are prepared-open measurements, not cold
loads or guarantees. Neighboring pages are not counted as visible readiness.
The interruption/changed-collection test had correct card slots and no browser
errors. TypeScript checking and all eight binder-layout/favorites tests passed.
