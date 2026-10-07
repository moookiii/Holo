# Scarlet & Violet Double Rare foil

The smooth `SUN_PILLAR` Double Rare finish now has diagonal spectral reflection and visible four/eight-ray cast-and-cure stars. Viewer and gallery use one authoritative profile and reflection kernel. Existing fronts, TCGL foil images, protection, cutouts and coverage composition remain unchanged. Etched `SV_ULTRA` variants retain their existing treatment.

## Source and reference

Inspected `images.tcgl.png.foil`, `foil.type` and `foil.mask` for Charizard ex 006/165 and Blastoise ex 009/165. Both are `SUN_PILLAR` / `HOLO`:

- Charizard: `sv3-5_6`, `Charizardex_sv3-5_6_std_DoubleRare_SunPillar_Holo_CastAndCure_SouthernCross`.
- Blastoise: `sv3-5_9`, `Blastoiseex_sv3-5_9_std_DoubleRare_SunPillar_Holo_CastAndCure_SouthernCross`.

The exact foil sources are `https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sv3-5/sv3-5_en_006_std.foil.png` and the analogous `009` URL. Raw sources preserved under `research/tcgl/151-set/raw/` are 367x512 RGBA, with paired 733x1024 fronts. Existing 1800x2475 foil/protection maps are retained byte for byte. `double-rare-evidence.json` records source/variant IDs and hashes for all twelve 151 Double Rares.

Reviewed the [supplied video](https://www.youtube.com/watch?v=yMT7XDgcfFQ) in-browser at 10, 15 and 20 seconds. The 15-second close-up shows large pointed stars; the 20-second pose shows receding stars and broad diagonal spectral bands. The TCGL image supplies the original card-specific foil intensity and fine spatial detail, but does not fully express the large star layer visible in the video.

`scripts/tcgl/double-rare-stars.json` records 66 fixed four/eight-ray motifs reconstructed from that close-up in full-card 600x825 coordinates. Placement is approximate, not a claim of identical physical-copy registration. `author_double_rare_optics.py` rasterizes a separate 1200x1650 PNG: RG stores fixed optical inclinations, B star reflectivity, A 255. It never reads or writes cutouts. This optical texture is clipped only by the existing authoritative coverage.

## Material

The previous correction lacked a diagonal grating axis and omitted the large stars. The original treatment also used repeated vertical cuts and synthetic facets that dominated the surface.

`profiles/doubleRare.ts` and `layers/DoubleRareLayer.ts` now combine a -pi/4 diagonal axis, broad unequal optical domains and fixed star facets. The source foil drives spatial intensity; view/light direction drives wavelength selection and reflective flashes; material parameters control bandwidth, angular selectivity and ink absorption. Optical inclinations are estimated, not measured manufacturing geometry.

Reflection enters direct specular with actual light color and finite-area-light convolution. Both terms pass through the existing print filter and original coverage. No emissive output, random sparkle, extra relief or per-frame CPU texture construction is used.

Gallery and viewer sample the same full-resolution star texture and evaluate the same kernel. Gallery loads one shared texture lazily, retains mipmaps/anisotropy and includes its mip chain in memory accounting. Existing gallery front/coverage downsampling still produces small pixel differences.

## Validation

`node scripts/double-rare-review.mjs` tests Charizard 006 and Blastoise 009 at neutral, shallow tilt, strong reflection, grazing angles and 17 consecutive rotation poses. It also compares viewer/gallery materials on identical geometry, camera, lighting and transform at three poses and checks actual gallery loading. Captures are under `artifacts/double-rare-diagonal-stars-final/`, including rotation WebPs. The diagonal response and recognizable stars are visible through the sequence; printed artwork remains readable.

- Production build passed.
- Nine focused affected tests passed, including byte hashes of all twelve 151 Double Rare foil/protection pairs.
- Renderer review completed with no page/shader errors; actual Double Rare gallery loaded without failed cards.
- Gallery/viewer mean absolute RGB difference is approximately 2.49-3.26 / 255 on card pixels; the remaining difference includes existing print/coverage atlas resolution.
- The prior full-suite run had 275 passes and 29 failures, identical by name to the original-module baseline. This correction reran affected checks and the build.

Existing stock/laminate highlights over protected print remain governed by the original material boundaries. Captures demonstrate rendered behavior, not measured physical foil accuracy. The user reviewed the result and accepted this correction as complete. Unrelated workspace edits are excluded from the commit.
