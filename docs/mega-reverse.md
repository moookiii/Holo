# Mega Evolution reverse foil

Ordinary unetched reverses in the Mega Evolution series now resolve to
`mega-standard-reverse`, rather than the inherited smooth
`sv_tcgl_standard_reverse`. This includes Perfect Order Snorlax 063/088, the
printing in the supplied physical reference. Special reverses retain their
existing assigned materials and source limitations.

The photograph and detail crop show a dense, fine, irregular silver texture.
`MegaReverseLayer.ts` models continuous optical microfacet distributions in
full-card UVs: 380 grain cells per card height, a smaller overlapping grain
field, restrained optical slope, and continuously varying highlight width and
reflectance. Grain stays fixed to the card. A uniform sheet grating supplies
directional color within the same reflection. Unresolved grain is filtered into
the lobe width rather than becoming pixel glitter. Finite area lights broaden
the response. There are no isolated glints, particles, generated height maps,
generated normal assets, or etched grooves.

The original printing's TCGL front, foil, and protection PNGs are unchanged.
No mask was added or regenerated. Existing composition applies the new response
only where that printing allows foil; artwork and printed glyphs stay protected.
The profile disables normal/height emboss. It has its own shader feature key so
switching between smooth and textured finishes rebuilds the appropriate graph.
The runtime series/variant routing survives source-catalog regeneration without
rewriting the generated catalogs or historical source evidence.

The supplied images are preserved under `research/mega-reverse/`; their original
paths, dimensions and SHA-256 hashes are recorded in
`docs/mega-reverse-evidence.json`. The close-up is an appearance reference, not a
height measurement. The photograph includes a sleeve and uncontrolled lighting;
microfacet topography, physical roughness and absolute reflection intensity are
estimated. Individual copies and other ME reverses have not been physically
measured. This remains a development finish.

`scripts/mega-reverse-check.mjs` captures Snorlax and Mega Evolution Bulbasaur in
WebGPU and WebGL, with front, grazing, specular, tilted, dark and two moving-light
states. It also captures the old smooth finish on the same front and coverage,
and Snorlax with a smaller offset area light. Captures and the browser report are
saved in `artifacts/mega-reverse/`. `tests/mega-reverse.test.ts` checks every
ordinary Mega reverse registration, original-map preservation and isolation from
normal, holo, special reverse and 151 materials. Run it with the repository's
`scripts/test-ts-loader.mjs` loader.

Changes are confined to the new profile/layer, shared optical model registration,
ME ordinary-reverse routing, targeted checks and this evidence. Other sets' foil
responses and all existing etched materials are unchanged. A pre-existing
Windows-encoded BREAK source was transcoded to UTF-8 to unblock the build;
its existing in-progress material edits were preserved and excluded from this
change's commit.
