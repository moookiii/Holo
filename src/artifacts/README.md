# Artifact viewer

Open `/artifacts` locally, or `/Holo/artifacts/` on GitHub Pages. The build emits a static route entry so direct navigation does not depend on an SPA fallback.

- `registry.ts` declares metadata, reference thumbnail, camera, lighting, capabilities, inspection options, exploded groups, and a lazy loader.
- `ArtifactPage.ts` owns the shared renderer, controls, selection lifecycle, cancellation, and resource cleanup. Controls are built from the selected definition.
- `RoboticBird.ts` creates ten named subassemblies. XY follows the supplied side reference and Z supplies invented depth. Opaque components are merged by material within each assembly. Transparent pieces remain separate for inspection.
- New procedural or imported artifacts implement `ArtifactInstance`, including resource disposal and inspection, and register a lazy build/load function. Loaders must release resources if they fail before returning. Late results from aborted selections are disposed by the viewer.

The bird is an artistic mechanical interpretation of `public/artifacts/robotic-bird-reference.png`, not a forensic reconstruction. No photographic brightness is used as geometry.

Validation: `node --experimental-strip-types --test tests/artifacts.test.ts`. For browser capture and interaction assertions, run `node scripts/check-artifacts.mjs` against a root-base preview at port 5174, or set `ARTIFACT_URL` to the desired viewer URL. Screenshots go to ignored `artifacts/bird-review/`.

## Refinement validation

The current model has sixteen independently explodable assemblies, with cross-body circuit shelves, an asymmetric reverse-side layout, routed socket-to-socket wiring, articulated feet, and thickened acrylic panels. `bird/` separates geometry/material helpers, shell lofts, electronics, mechanisms, and harness routing. The newer `robotic-bird-reference-02.png` is the primary visual reference. Hidden-side construction and depth remain estimates.

Shell fixes: dorsal and ventral loft strips span the full torso, both loft ends are capped, and a lower-head/throat panel overlaps the chest. Acrylic edges have a separate transmission response to remain legible away from specular highlights. The broad shell retains the softer earlier finish. Chest boards are reduced and recessed. Exploded framing scales the displayed assembly to preserve screen clearance.

`node scripts/review-bird.mjs` captures eight azimuths plus above/below, all shell modes and lighting presets. These renders support visual review; they do not establish photographic or manufacturing accuracy. `scripts/check-artifacts.mjs` exercises the controls and main-viewer navigation. Resource tests check assembly coverage, bounded batching, shell restoration, and disposal.
