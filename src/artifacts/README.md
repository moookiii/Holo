# Artifact viewer

Open `/artifacts` locally, or `/Holo/artifacts/` on GitHub Pages. The build emits a static route entry so direct navigation does not depend on an SPA fallback.

- `registry.ts` declares metadata, reference thumbnail, camera, lighting, capabilities, inspection options, exploded groups, and a lazy loader.
- `ArtifactPage.ts` owns the shared renderer, controls, selection lifecycle, cancellation, and resource cleanup. Controls are built from the selected definition.
- `RoboticBird.ts` creates ten named subassemblies. XY follows the supplied side reference and Z supplies invented depth. Opaque components are merged by material within each assembly. Transparent pieces remain separate for inspection.
- New procedural or imported artifacts implement `ArtifactInstance`, including resource disposal and inspection, and register a lazy build/load function. Loaders must release resources if they fail before returning. Late results from aborted selections are disposed by the viewer.

The bird is an artistic mechanical interpretation of `public/artifacts/robotic-bird-reference.png`, not a forensic reconstruction. No photographic brightness is used as geometry.

Validation: `node --experimental-strip-types --test tests/artifacts.test.ts`. For browser capture and interaction assertions, run `node scripts/check-artifacts.mjs` against a root-base preview at port 5174, or set `ARTIFACT_URL` to the desired viewer URL. Screenshots go to ignored `artifacts/bird-review/`.
