# Sun & Moon Prism Star implementation

Implemented 2026-10-11 from [Sol's physical-reference research](prism-star-finish-research.md). All 27 audited English printings resolve to `pokemon-sm-prism-star`. This is a reference-informed optical reconstruction, not a measured manufacturing specification.

## Material and coverage

- One continuous primary optical sheet spans exposed artwork, artwork frame, Prism Star rule strip, name diamond, large lower diamond, and outer border. There is no separate diamond material, phase reset, secondary foil layer, or star glitter.
- The exact card's original TCGL foil PNG and foil-controls remain unchanged. TCGL protection preserves subject silhouettes, central eight-point stars and ordinary body print. Printed pastel diamond gradients remain in the untouched front.
- The only additional coverage is the reflective dark outer border omitted by TCGL. `scripts/tcgl/prepare_prism_star.py` traces each clean front's edge-connected flat dark ink, confined to the outer 36 pixels. This retains the actual tabs/corners instead of imposing a rectangular frame. It writes 733×1024 `border.png` and a protection copy altered **only** where that border is present, under `public/cards/pokemon/prism-star/<tcgl-id>/`.
- Registration uses source crop `(145, 0, 878, 1024)` from the 1024² TCGL front, no flip or offset. Each evidence JSON records source identity/hash, transformations, border color and output hashes. All 27 outputs were checked for perimeter confinement and byte-identical interior protection; Giratina/Cyrus/Energy boundary overlays were visually inspected at full resolution.
- All 27 exact exports report no applicable etch. No normal, height, emboss, or replacement etched geometry was invented. Existing roughness PNGs are preserved but the finish uses profile roughness; their brightness-derived values do not establish physical roughness. Default procedural cardstock grain is disabled for these printings through `stockSurface`, avoiding unsupported relief in strong reflections.

## Architecture and resolved settings

`src/materials/profiles/prismStar.ts` defines the dedicated profile. `PrismStarSurfaces.ts` selects exact printing IDs; the narrow override in `SvTcglSurfaces.ts` survives TCGL reimports and removes the pending-finish label. Other cards retain their existing definitions.

The `sm-prism-star` CPU manufacturing-field branch reuses Water Web's continuous contour/gradient approach, encoding grating axis, spacing and optical inclination in the existing texture channels. It uses broad oblique bends, rather than Sheen's straight bands or Water Web's stronger branching bends. The renderer's UV orientation is accounted for: visible bands rise from lower left toward upper right in front view. Optical inclinations redirect light; they do not imply embossed ridges.

| Control | Final value |
|---|---|
| Macro field | 4.5 cycles per normalized card-height unit along the oblique coordinate; bend amplitude .025; slope amplitude .20 |
| Diffraction | period 1.24, bandwidth .075, strength .58, secondary order .08, cross width .47, facet coupling 1 |
| Smooth reflection | metalness .78, roughness .30, foil reflectance .09 |
| Laminate | strength .18, roughness .33 |
| Ink transmission | 1; reflections filtered by original ink color |
| Inclination response | facet tilt .9, reflection coupling .14 |
| Disabled | engraving, relief, pattern relief, variance, glints, varnish relief, normal scale, emboss |

The macro scale and grating period are fitting parameters, not measured factory dimensions. Shared wavelength diffraction, neutral reflections, ink filtering, lazy worker preparation and caches are reused. Border coverage is packed into the existing extended-coverage channel and shares the primary field: no additional GPU sampler, material pass or runtime image analysis. Existing Sheen, Water Web and other shader branches are unchanged.

## Validation and captures

`node scripts/review-prism-star.mjs` opens the actual WebGPU 3D viewer and checks Giratina `sm5-58`, Cyrus `sm5-120`, and Super Boost Energy `sm5-136`. Each receives front, ±18° yaw, combined tilt, 65° grazing, Studio/Strip/Soft/Low key lighting, and five moving-light samples. The run also records a continuous video under `artifacts/prism-star/viewer/review.webm` (local, not committed).

Final review: smooth changes between dark metal, neutral specular and broad spectral bands; protected central stars and subjects remain printed; light crosses the foil regions without separate diamond geometry. Strong specular angles can wash out text through ordinary laminate glare, but no rectangular text-protection patches or added glitter occur. The outer border stays ink-dark away from reflection angles. Final [viewer report](references/prism-star/implementation/viewer-report.json) records all three correct card/profile IDs, WebGPU and zero errors. Frame intervals were about 5.55 ms on this machine; this is not an isolated GPU benchmark.

| Card | Front | Tilt | Moving light |
|---|---|---|---|
| Giratina | [capture](references/prism-star/implementation/sm5-58-front.jpg) | [capture](references/prism-star/implementation/sm5-58-left.jpg) | [capture](references/prism-star/implementation/sm5-58-moving-2.jpg) |
| Cyrus | [capture](references/prism-star/implementation/sm5-120-front.jpg) | [capture](references/prism-star/implementation/sm5-120-left.jpg) | [capture](references/prism-star/implementation/sm5-120-moving-2.jpg) |
| Super Boost Energy | [capture](references/prism-star/implementation/sm5-136-front.jpg) | [capture](references/prism-star/implementation/sm5-136-left.jpg) | [capture](references/prism-star/implementation/sm5-136-moving-2.jpg) |

Validation passed: `npm run build`; final `npx tsc --noEmit`; final Vite bundle build with already-copied public assets retained; 11 tests via `node --experimental-strip-types --loader ./scripts/test-ts-loader.mjs --test tests/sm-integration.test.ts tests/prism-star.test.ts tests/pokemon-patterns.test.ts`. The existing loader is needed for pre-existing extensionless imports. Tests cover all 27 registrations, absent etch, continuous field slopes, unchanged older pattern behavior, and all 5,010 SM printing definitions. Vite retains its existing large-chunk warning.

## Remaining physical-reference uncertainty

References do not establish microscopic grating pitch/axis, absolute reflectance or roughness, coating differences, or a copy-exact spatial phase. No evidence requires a distinct optical grating in the diamond. Sharing this family across all 27 is supported by the audited SunLava records and reviewed Pokémon/Trainer/Energy samples; later Stadiums and Beast Energy lack equivalent moving-reference confirmation. Their own exact masks are used, but they were not each visually validated in the viewer. The clean TCGL front contains fixed printed gradients/highlights that cannot be separated further without changing the source artwork.

No original fronts, TCGL source assets, pack-opening code, or unrelated holo profiles were changed.
