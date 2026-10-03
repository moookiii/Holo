# Artifact viewer

Open `/artifacts` locally, or `/Holo/artifacts/` on GitHub Pages. The build emits a static route entry so direct navigation does not depend on an SPA fallback.

- `registry.ts` declares metadata, reference thumbnail, camera, lighting, capabilities, inspection options, exploded groups, and a lazy loader.
- `ArtifactPage.ts` owns the shared renderer, controls, selection lifecycle, cancellation, and resource cleanup. Controls are built from the selected definition.
- `RoboticBird.ts` creates ten named subassemblies. XY follows the supplied side reference and Z supplies invented depth. Opaque components are merged by material within each assembly. Transparent pieces remain separate for inspection.
- New procedural or imported artifacts implement `ArtifactInstance`, including resource disposal and inspection, and register a lazy build/load function. Loaders must release resources if they fail before returning. Late results from aborted selections are disposed by the viewer.

The bird is an artistic mechanical interpretation of `public/artifacts/robotic-bird-reference.png`, not a forensic reconstruction. No photographic brightness is used as geometry.

## Melee optical disc

`MeleeDisc.ts` loads only when selected. The two PNG scans in `public/artifacts/melee/` are byte-identical copies of the supplied images. Each face has its own pixel-space registration, with an opposing back orientation. The model uses an 80:15:1.2 diameter/aperture/thickness ratio, closed beveled outer and hub profiles, and an actual open center. Molded-ring depth and the front ink's optical composition are estimates from the scans, which do not establish relief or material measurements.

`scripts/create-melee-masks.py` authors a source-resolution PNG ink mask and an ignored colored review overlay. Coverage follows bright non-red, non-black print across the label, including the title, logos, rating and small lettering. The exposed outer lip, clear hub, red background and black print are excluded. The front uses masked thin-film iridescence with an ink-direction response; the reverse uses a separate concentric reflection-grating response, with overlapping visible wavelengths driven by camera and both gallery light directions. The reference's spectral chroma is neutralized only in the data annulus at shading time, retaining luminance detail and untouched inner-ring lettering. No timer, glitter, relief noise or procedural artwork is used.

The existing Studio/Soft/Rim presets remain shared. Soft reduces and broadens the disc's key-light diffraction. For a deliberate back inspection, orbit halfway around and move Light azimuth to about 150°, elevation 25°, then sweep the azimuth. This is an analytical optical approximation, not a measured spectral BRDF. Physical materials continue to receive the full shared lighting/environment.

Validation: `node --experimental-strip-types --test tests/melee-disc.test.ts` covers the aperture, scan registration and complete idempotent disposal. `node scripts/check-melee.mjs` uses a dev server at port 5182 (override `ARTIFACT_URL`) to capture front/back, moving light, tilt, all presets, thin edge, zoom, mobile framing, fullscreen and reset. It switches artifacts six times and checks that GPU geometry/texture counts stabilize. Test-only response instrumentation exposes renderer counters without adding production globals. Review images and logs go to ignored `artifacts/melee-review/`.

Validation: `node --experimental-strip-types --test tests/artifacts.test.ts`. For browser capture and interaction assertions, run `node scripts/check-artifacts.mjs` against a root-base preview at port 5174, or set `ARTIFACT_URL` to the desired viewer URL. Screenshots go to ignored `artifacts/bird-review/`.

## Refinement validation

The current model has sixteen independently explodable assemblies, with cross-body circuit shelves, an asymmetric reverse-side layout, routed socket-to-socket wiring, articulated feet, and thickened acrylic panels. `bird/` separates geometry/material helpers, shell lofts, electronics, mechanisms, and harness routing. The newer `robotic-bird-reference-02.png` is the primary visual reference. Hidden-side construction and depth remain estimates.

Shell fixes: dorsal and ventral loft strips span the full torso, both loft ends are capped, and a lower-head/throat panel overlaps the chest. Acrylic edges have a separate transmission response to remain legible away from specular highlights. The broad shell retains the softer earlier finish. Chest boards are reduced and recessed. Exploded framing scales the displayed assembly to preserve screen clearance.

`node scripts/review-bird.mjs` captures eight azimuths plus above/below, all shell modes and lighting presets. These renders support visual review; they do not establish photographic or manufacturing accuracy. `scripts/check-artifacts.mjs` exercises the controls and main-viewer navigation. Resource tests check assembly coverage, bounded batching, shell restoration, and disposal.
