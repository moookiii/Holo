# BW Worlds stamped promos

Tropical Beach BW28 and BW50 and Champions Festival BW95 now use `bw-stamped` instead of deferred print-only material. Each card retains its original clean front and its own exact English TCGL whiteplate. No unrelated printing or optical family is changed.

Exact variants:

- `TropicalBeach_bwbsp_28_op_Rare_Stamped_Stamped`
- `TropicalBeach_bwbsp_50_op_Rare_Stamped_Stamped`
- `ChampionsFestival_bwbsp_95_op_Rare_Stamped_Stamped`

The preserved source bundles, URLs, material manifests, decoded texture hashes and paired fronts are recorded in each card's `public/cards/pokemon/tcgl-bw/bwbsp_<number>/evidence.json`. Source textures are 1024×1024 RGBA. The original `Cards/Foil/HoloFoil_Rainbow_Amplify_J` materials supply their own `_w` stamp plates and no `_e` etch. This is smooth stamped foil, so no normal conversion or fabricated relief is appropriate.

Run `python scripts/tcgl/prepare_bw_stamps.py` to regenerate the 733×1024 PNG plates. Front and foil use the same established Unity UV box `[145/1024, 0, 878/1024, 1]`, bilinear interpolation and no vertical flip. Continuous coverage and antialiased glyph edges are preserved without thresholding or morphology. The plates protect the remaining artwork and rules by zero coverage. BW95's outlined lettering is retained in its own plate.

The flat grating provides localized spectral lettering with metalness 0.78, roughness 0.30, restrained reflection and no procedural sparkle, engraving, normal variance or emboss. Original assets remain unchanged. No etched card or Cosmos response is affected.

Boundary overlays, masks and front images are in `artifacts/bw-stamps/`. `node scripts/bw-stamps-live-check.mjs` captures all three under front, grazing, tilted, low-key, strip and moving-light presets plus three light positions in `artifacts/bw-stamps/live/`. The focused integration test checks active registration, source identities, output hashes and disabled relief.

Remaining uncertainty: exact glyph geometry is source-backed; physical angular intensity is not calibrated against angled photographs or video of these exact printings. The material remains marked development. Renderer captures verify registration and angular behavior, not physical foil measurement.
