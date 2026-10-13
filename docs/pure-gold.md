# Legendary Treasures Pure Gold

Reshiram 114/113 and Zekrom 115/113 now use the named `pure-gold` material. The supplied Japanese EX Battle Boost 094/093 and 095/093 photograph guides the warm satin metal and directional highlights. English print and line geometry remain their exact own TCGL sources. No other card is assigned this material.

The user requested pure gold and corrected the initial overly uniform satin response. This finish replaces colored diffraction with directional, non-spectral reflection: diffraction strength and secondary order are zero, thin-film interference is zero, and glint strength/density remain zero. The `pure-gold` optical branch reflects a pale-gold anisotropic GGX lobe from the card's own die orientation. Smith masking and finite-emitter angular broadening keep it dependent on illumination and pose. The broad/narrow angular widths are 0.40/0.075, with reflection weight 0.18 and linear gold reflectance `[0.95, 0.76, 0.30]`. The substrate retains 0.30 of its reflection budget. This produces the reference's moving fan-shaped bands instead of relying on a bright outline around every groove.

`gold-direction.png` is an offline optical map, separate from geometry and protection. `scripts/tcgl/prepare_pure_gold.py` computes Scharr gradients from each own exact TCGL etch and averages their second moments at sigma 4 native pixels. It encodes the principal axis as double-angle RG, neutral spacing in B, and directional confidence/source alpha in A, then resizes bilinearly to 1800×2475. Only orientation statistics are averaged; height and normal images are never blurred or rewritten. The direction is used for reflection, with diffraction disabled. Each map has source/output hashes in `gold-direction-evidence.json`.

The existing normal response, roughness maps, metalness 0.50, laminate 0.045 and foil reflectance 0.025 remain. The pure-gold branch replaces the generic etched-ink highlight lobe; it introduces no new normal, second emboss, random grain or secondary region. Other optical models retain their previous shader path.

Exact source identities:

| Card | TCGL entry | Long-form variant |
| --- | --- | --- |
| Reshiram | `bw11_114` | `Reshiram_bw11_114_std_RareSecret_SolidColor_Etched` |
| Zekrom | `bw11_115` | `Zekrom_bw11_115_std_RareSecret_SolidColor_Etched` |

The original 1024×1024 RGBA Unity export fronts and etches are retained under `research/tcgl/bw11_114/` and `research/tcgl/bw11_115/`; existing `source.json` files record their exact TCGL bundles, texture references and hashes. Paired originals and output hashes also remain in each `public/cards/pokemon/tcgl-bw/<entry>/evidence.json` and `normal-evidence.json`. Sources are the official TCGL `bw11_en_114` and `bw11_en_115` bundles at `https://cdn.studio-prod.pokemon.com/rainier/Content/StandaloneWindows64/1.43.0/10101_0000/`.

Existing normal PNGs remain byte-identical. Their established full-card Unity UV box is `[145/1024, 0, 878/1024, 1]`, shared by front, etch and whiteplate; the native atlas bleed is removed, with no added offset, vertical flip or artwork-only crop. Own etch, print, normals and individual-glyph protection were inspected together. The preserved converter uses mean RGB inverted luminance; bilinear full-card height/alpha resize to 1800×2475; Scharr CV_32F at 1/32 before protection; slopes `(-dx, +drow, 1)` at gain 1.03; protection on XY afterward; normalized XYZ, source-alpha flat blending and rounded opaque RGB PNG. No blur, synthesized grooves or runtime generation. Normal scale remains 1 and emboss remains 0 in both profile and card settings. Roughness remains `0.30 + 0.105 * own body`; there is no separately verified secondary region.

Validation: TypeScript checking, production Vite build with public-asset copying disabled, `node --experimental-strip-types --test tests/bw-integration.test.ts`, and `node scripts/pure-gold-live-check.mjs`. The live check asserts the resolved profile, selected gold optical branch, normal, emboss, diffraction, glint and reflection controls, and saves front, grazing, tilt, dark, strip/specular and moving-light captures plus three fixed moving-light azimuths. Espeon 155, Sylveon 156 and Base Set 2 are captured with identical controls for comparison. Captures and source inspection sheets are under `artifacts/pure-gold/`; `GOLD_BACKEND=webgl` exercises the WebGL fallback.

Remaining uncertainty: the reference is Japanese stock photographed through a slab under uncontrolled lighting. It cannot establish exact English intensity or physical groove depth. The English TCGL die is finer than the photographed Japanese appearance; its geometry is preserved. Highlights vary with renderer lighting and angle.

Changed implementation: the Pure Gold profile/registration, its isolated `PureGoldLayer` reflection branch and shader feature flag, two reflection-direction PNGs with reproducible authoring and evidence, the two card evidence JSON files, the BW integration assertions, and the dedicated live review script. No front, foil, protection, roughness, normal or unrelated card assets were modified.
