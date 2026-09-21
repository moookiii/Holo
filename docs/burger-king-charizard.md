# 1999 Burger King Charizard · gold-plated metal

Viewer ID: `charizard-burger-king-1999`. Find **Charizard · 23K Gold** under **Metal**, or search **Burger King** in the normal card picker. Flip reveals the separate Charizard/Pokédex reverse. The assigned **23K minted gold** profile has no diffraction, sparkle, laminate, or iridescent film. It is deliberately excluded from cardboard booster collation.

## References and physical calibration

The two supplied photographs are stored byte-for-byte as `front.png` and `back.png`. Their hashes and the map registration coordinates are recorded in `public/cards/charizard-burger-king-1999/source.json`. The supplied video `2026-09-20 22-40-47.mp4` was inspected at the opening edge view, the reverse close-up, the turn and front views. It informs the distinction between the substantial bare plaque and its thicker clear protective cover, the rounded belly relief, and the moving metallic response. The protective case is not part of the rendered plaque.

The supplementary [PSA front/back reference](https://www.psacard.com/cert/150531212/psa) confirms both designs. Its high-resolution reverse scan supplies additional contour detail; the local authoring reference and hash are retained for reproducibility. The reverse wording and front name are reconstructed as shallow die lettering, rather than turning photographic glare/noise into relief.

The [Noble Knight card-only listing](https://www.nobleknight.com/P/2148286847/Gold-Plated-Trading-Card-Charizard---Card-Only) reports 1.75 × 2.75 × .25 inches. Whether its thickness includes the clear cover is unspecified, so the .25-inch figure is **not** represented as a bare-metal measurement. The face uses 44.45 × 69.85 mm. The modeled base slab is 3.0 mm, with a 0.45 mm bevel and 2.2 mm corner radius, visually calibrated against the supplied video. These values remain estimates, not caliper measurements.

| Feature | Authored reconstruction |
| --- | --- |
| Front height encoding | Black = die plane; white = 0.90 mm above it |
| Front highest point | Approximately 0.77 mm; rounded abdomen above the torso |
| Back height encoding | Black = die plane; white = 0.40 mm above it |
| Back highest point | Approximately 0.31 mm |
| Rim | Approximately 0.24 mm above the base plane |
| Fine front contours | 0.075 mm additional rise; logo outlines 0.13 mm |
| Reverse lettering | 0.075 mm above its recessed panel |
| Finishes | Roughness approximately 0.145–0.373: polished rim/ridges, satin membranes, intermediate fields |

**Accuracy limit:** photographs and the video do not establish exact per-feature heights. The profile remains `reference-pending`; the reconstruction must not be described as a measured replica. Thickness and both height scales are explicit centimetre values in the card definition so physical measurements can replace estimates without redesigning the material.

## Material and geometry

The shared factory uses a closed, densely tessellated solid only for `construction.kind: 'metal'`. Front and reverse are displaced independently in real centimetres. Their UVs are mirrored correctly on the back. The rounded bevel and vertical side wall use a gold conductor, without paper fibers. Standard cards keep their existing low-polygon geometry and paper/printed reverse path.

The existing profile and packed-map architecture supplies the gold: full metallic coverage, linear gold reflectance `[1, .76, .36]`, authored roughness, and normal maps derived from the continuous physical height before 8-bit quantization. This avoids terrace-like highlights and glittering derivative artifacts. The height map drives the geometry; the normal map supplies its smooth lighting slope once, with derivative emboss disabled to prevent doubling. No photographed lighting is used as the conductor's albedo.

The metallic profile adds optional environment intensity, ambient recess attenuation, and normal-variance roughness filtering. Defaults preserve existing metallic name treatments. The field, membranes, raised ridges and rim have independent surface finishes; fine brushing lives in roughness, never as prismatic glitter. Direct lighting, reflected studio panels, flip, drag and lighting presets are the normal viewer systems.

## Reproduction and verification

Run `python scripts/create-burger-king-maps.py` (Pillow, NumPy, SciPy; Arial on Windows). This authors manufacturing data, does not overwrite either supplied photograph, and updates provenance/physical-scale metadata. Runtime does not require Python or external network access.

Run `npm run build`, `npm test`, and `node scripts/verify-gold.mjs`. The browser verifier exercises WebGPU and WebGL, normal picker selection, both faces and all four lighting presets, grazing/side views, physical bounds, normal/height separation, gold bundle import, existing Pokémon/Yu-Gi-Oh!/Original cards and pack presentation. Captures and the report are written to `artifacts/gold-verification/`. Geometry tests check welded manifold seams, centimetre displacement, back-face sampling, valid normals and the three material groups.

Validation on 2026-09-21: production build passed; all 71 tests passed; both browser backends passed with zero console/page errors. `scripts/compare-gold-regression.mjs` compared Base Set Charizard, Pikachu VMAX and Nocturne against pre-metal commit `c049a05` at a fixed pose. All three images were pixel-identical (mean and maximum channel difference zero). This comparison requires that baseline served separately on port 5176, or `GOLD_BASELINE_URL`; it does not modify the working checkout. The existing pack and four representative existing card material paths were also checked in both backends.
