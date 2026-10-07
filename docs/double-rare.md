# Scarlet & Violet Double Rare foil

This pass changes the smooth `SUN_PILLAR` Double Rare material. It does not change any front, foil PNG, protection PNG, cutout, coverage composition or generated surface registration. Etched `SV_ULTRA` Double Rares retain their previous material and authored normals.

## Source inspection

Inspected the preserved TCGL export and raw foil images before editing the material. Charizard ex 006/165 is `sv3-5_6`, variant `Charizardex_sv3-5_6_std_DoubleRare_SunPillar_Holo_CastAndCure_SouthernCross`; Blastoise ex 009/165 is `sv3-5_9`, variant `Blastoiseex_sv3-5_9_std_DoubleRare_SunPillar_Holo_CastAndCure_SouthernCross`. Both report `foil.type: SUN_PILLAR`, `foil.mask: HOLO`.

Their `images.tcgl.png.foil` sources are:

- https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sv3-5/sv3-5_en_006_std.foil.png
- https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sv3-5/sv3-5_en_009_std.foil.png

Both raw foil images are 367×512 RGBA, paired with 733×1024 fronts. The existing 1800×2475 source-derived foil and protection PNGs are retained byte for byte. No new transformation, crop, flip, mask interpretation or asset replacement is performed. Raw sources remain in `research/tcgl/151-set/raw/`. `double-rare-evidence.json` records all twelve 151 Double Rare variants, URLs, raw hashes and unchanged runtime map hashes.

The source foil contains the card-specific star detail, printed boundaries and continuous foil intensities. Those remain the spatial input through the existing coverage pipeline. It does not provide measured optical normals or calibrated angular response. No generated stars or image-brightness normals are added.

## Material

The former 151 profile used the `vertical-line` generator at scale 310, alternating strong/weak cut amplitudes, synthetic facet inclinations, an additional silver-cut lobe, and high unfiltered substrate reflection. Those mechanisms made repeated lines and broad pale reflections dominate.

`profiles/doubleRare.ts` is the authoritative finish. `layers/DoubleRareLayer.ts` is shared by `HolographicMaterial` and `GalleryMaterial`, selected by a dedicated gallery batch key. Other SV and Prismatic smooth SUN_PILLAR Double Rares resolve this same finish. Their etched variants explicitly retain the previous profile path.

The foil image supplies spatial detail; light/view momentum selects wavelengths and reflection angle; material controls set bandwidth, angular aperture, backing reflection and ink absorption. A small continuous optical bow localizes the spectral pillar without repeated UV bands. It redirects only the optical grating, not the surface normal. This bow and the numerical optical settings are an approximation, not measured manufacturing geometry.

Reflection enters direct specular under actual light, with finite-area-light convolution. There is no emissive output, clock-driven animation, random sparkle, added emboss, or per-frame CPU pattern construction. Neutral zero-order flashes are narrow; spectral and neutral light pass through the print filter. Existing CPU preparation, GPU realization and caches remain in use. No extra GPU texture is required.

## Validation

`node scripts/double-rare-review.mjs` saves production-renderer captures under `artifacts/double-rare-review/` for Charizard and Blastoise: neutral, ±12° tilt, reflection, grazing, and 17 consecutive rotation poses. It also switches between production viewer and instanced gallery materials on the same geometry, camera, lighting and transform at three poses. No GPU/page errors occurred. Saved captures show removal of the repeated cut structure, readable neutral artwork, moving localized color and retained source stars.

Gallery/viewer mean absolute RGB error on card pixels is 2.51–3.19 / 255. They use identical optical calculations; existing gallery image/map downsampling still produces fine-detail differences. They are not pixel-identical at enlarged comparison scale.

- Build and TypeScript check passed.
- Four focused tests passed, including byte hashes of all twelve 151 Double Rare foil/protection pairs and distinct gallery dispatch.
- Full existing suite: 275 passed, 29 failed. Running with original versions of this pass's existing modules restored through a test loader produced exactly the same 29 failing test names. Logs are in `artifacts/double-rare-tests.log` and `artifacts/double-rare-baseline-tests.log`.
- No public card asset changed in this pass. Unrelated workspace edits were excluded from the commit.

The supplied YouTube reference could not be fetched (throttled). Physical matching to its motion remains unverified. Strong direct light still produces the existing printed-stock/laminate highlight, especially over protected print; this pass leaves protection and its boundaries authoritative. Captures establish rendered behavior, not measured physical foil accuracy.
