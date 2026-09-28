# Gallery architecture

Open **Gallery** beside **Open a pack**. Search and game/set/rarity/finish/category facets intersect. Missing rarity/category metadata is omitted, not inferred from names. Arrow keys move between cards; Home/End reach the collection ends. Escape opens the last focused card. Reduced-motion preference disables proximity tilt. Filter and scroll state survive inspection.

## Residency and ownership

| Tier | Resources | Lifetime |
| --- | --- | --- |
| Inactive | CardDefinition and source URLs; optional reduced preview in the CPU LRU | 24 MiB CPU preview budget |
| Gallery | One instanced mesh, one physical material, one 256 × 360 × 48 artwork array, eight 128 × 180 × 48 map arrays and a 32 × 48 optical parameter texture | Fixed 53,108,736 bytes (50.648 MiB) of GPU texels, plus matrices/geometry/material; matching CPU upload buffers |
| Focused | Existing CardFactory full-quality material, manufacturing fields, maps and physical geometry | One focused factory, disposed when returning to Gallery |

Gallery reuses the existing renderer, scene, camera, environment and StudioLighting. There is no renderer, scene, lighting rig or material per gallery card. The texture-array layer index is an integer varying to prevent interpolation rounding from sampling a neighboring card.

`GalleryLayout` calculates only viewport rows plus one row of overscan on each side. Row size adapts on extreme viewport sizes so at most 48 cards are needed. `GalleryResidency` assigns fixed slots and evicts the least recently needed inactive slot. Retained idle slots consume the same fixed allocation; total collection size cannot grow it. Slots have generation tokens, so canceled work cannot upload into a reassigned slot.

At most two CPU preview requests run concurrently. Fetches are abortable with timeouts, decoded images are closed, and only one completed card uploads per animation frame. Three.js r186 supports per-layer updates in both WebGPU and WebGL fallback. New sources do not create new materials or shader graphs. While focused or opening a pack, Gallery starts no preview work. Its bounded atlas stays available for return navigation.

`CardCpuPreparation.preparePreview` is the reduced CPU tier. It uses the existing profile resolver, coverage resolver and channel packer. It generates reduced manufacturing fields with the existing worker and seeds, without filling the full-resolution CPU cache or invoking GPU APIs. Reduced arrays live in a 24 MiB LRU. Active/in-flight preview objects are also bounded by the 48 slots and two-request limit. Source blobs and large decoded images are temporary; browser HTTP caching may reuse their URLs independently.

Focus checks `CardCpuPreparation.cached` for a complete compatible prepared card (e.g. from a pack), then calls the normal `realizeCardGpu`. Otherwise it calls the normal `CardFactory.create`. Constructed metal cards retain the original geometry path. No single-card shader, quality setting or resolution is reduced. Focus owns a separate factory resource domain on the **same renderer and scene**, so disposal also removes full-resolution textures and manufacturing caches. Existing viewer/pack caches keep their existing policy.

## Preview appearance

Previews retain the source aspect ratio, authored coverage/protection, roughness, and authored normals or continuous height-derived normals. Normal derivatives are computed before coverage clipping. Primary, secondary and stamp regions retain separate coverage, seeded manufacturing fields and optical parameters. The shared material uses the viewer wavelength response with actual direct/area lights and environment illumination, including moving light and blacklight. Gallery still approximates relief and omits image holograms, microglitter and displaced metal geometry; those return in focus. This is a gallery approximation, not the reference optical renderer.

`GalleryMotion` exposes radius, strength, falloff and damping. Defaults use a 360-pixel influence radius and 0.60-radian strength, giving a noticeable tilt across nearby cards while ending at the shorter boundary. Frame-rate-independent damping and capped elapsed time prevent a tab resume from snapping cards. `GalleryLighting` exposes only controls relevant to the selected existing preset.

## Verification

Run `npm run build`, `npm test`, and (with the dev server on port 5173) `node scripts/gallery-check.mjs`. Set `GALLERY_QUERY=?backend=webgl` and `GALLERY_OUTPUT=gallery-webgl` to test fallback separately. The browser check records screenshots, actual renderer resource counters and frame averages in `artifacts/gallery/report.json`.

Run `node scripts/gallery-holo-check.mjs` for Jungle holo screenshots and actual artwork visibility assertions under Studio, Moving light and Blacklight on either backend. The browser regression covers the repository collection; three repeated collection traversals; multi-card tilt and neutral return; intersecting filters; moving/blacklight presets; three full-quality focus/demotion cycles including metal; restoring a nonzero scroll position; opening a pack after Gallery; a synthetic 10,563-card collection; and mobile layout. Unit tests traverse 10,000 entries across phone, desktop, 4K and unusually tall viewports, and test stale-load tokens.

Measured allocation is renderer telemetry, not operating-system VRAM usage. Texture-array texel storage stays fixed; the main render target still scales with screen size/DPR. Existing viewer and pack resources are separate from the gallery budget. Timing results are machine/browser-dependent and should not be treated as a universal frame-rate guarantee.

The full test suite currently has ten unrelated failures: four `lab-state` boolean validation failures for `diffraction.followsAuthoredNormals`, two `pokemon-assets` fallback expectation failures, and four `prismatic` map/source-identity checks. Their source/test files were unchanged by Gallery; user-edited card PNGs were preserved.
