# ASTRA WORKING BEHAVIOR

Always commit after each change and say the commit name in the message.

Author site masks as PNG files. If vector paths are useful during generation, rasterize them to PNG before delivery and reference only the PNG masks in the site.

# ETCHED CARD METHODS

## Required method for every etched card

All etched cards must use the final Sylveon ex SIR 156/131 method in both respects: exact TCGL etch geometry converted offline to a tangent normal, and the Espeon ex SIR 155/131 material response used by Sylveon. This is mandatory for every newly added etched card and whenever an existing etched card is authored or revised. Do not introduce an alternative procedural relief or height-emboss workflow. The reference implementation is `scripts/prismatic/tcgl_etch_normal.py`, the `sv08.5-156:holo` registration in `src/pokemon/PrismaticSurfaces.ts`, and `docs/sylveon-156.md`. Apply this method to each card's own assets; never reuse Sylveon's or Espeon's line geometry for another card.

### Exact TCGL source

Find the exact TCGL export entry matching the name, set, collector number, rarity and variant, and use its `images.tcgl.png.etch` asset. Download and preserve the untouched source and paired TCGL front under `research/tcgl/<card-id>/`. Record the export entry, source URL, TCGL card ID and long-form variant ID, source dimensions and SHA-256 hashes in source/evidence JSON. Pokebox images, screenshots, another printing or rarity, generic etches, AI linework and synthesized replacement grooves are forbidden. If the exact TCGL etch cannot be found, report the missing source instead of fabricating relief.

Sylveon's source is `https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sv8-5/sv8-5_en_156_std.etch.png`, entry `sv8-5_156`, variant `Sylveonex_sv8-5_156_std_SpecialIllustrationRare_SvUltra_Etched`, 733x1024 RGBA. Preserve the analogous exact source for each other card.

Inspect the raw etch against its paired front, the clean Holo front and the full-card UV layout before conversion. Validate polarity, vertical orientation, full-card registration, border and crop. Sylveon uses inverted luminance (white strokes become recesses), no vertical flip, no crop and no offset. Do not blindly assume those properties for a new source: verify and record them. Use angled photos of the exact card to review physical appearance; a flat scan cannot establish groove depth. Do not turn printed brightness or random noise into a height map. TCGL supplies geometry, not measured physical depth.

### Offline normal conversion

Follow the reference converter's operations exactly, with card-specific source and protection paths:

1. Decode raw RGBA to floats in [0,1]; take the mean RGB channel value as etch luminance. For the verified Sylveon polarity, height is `1 - luminance`.
2. Resize the entire continuous height field and source alpha to 1800x2475 using bilinear interpolation. Preserve the source's full UV domain. Do not blur, denoise, threshold away fine lines, add noise, redraw grooves or blend an old fabricated normal into the result.
3. Compute `dx` and `drow` with OpenCV Scharr derivatives, `CV_32F`, scale `1/32`, on the continuous height field BEFORE applying protection or region masks.
4. Use slope gain `1.03`: `nx = -dx * 1.03`, `ny = drow * 1.03`, `nz = 1`. Multiply only the X/Y slopes by `1 - protection` AFTER differentiation. This avoids false raised outlines at protected boundaries.
5. Normalize XYZ; blend pixels outside the source alpha to `(0,0,1)`. Encode `round(clamp(normal * 0.5 + 0.5, 0, 1) * 255)` as an opaque RGB PNG. Holo's convention is OpenGL +Y, `(-dH/dx, +dH/drow, +Z)`, with top-down raster rows. Protected areas must contain flat RGB normals, never transparent or black invalid normals.
6. The reference gain matches Espeon's primary etched-background RMS tangent slope of approximately 0.183, measured outside body, secondary foil and protected print. Keep this restrained reference response; do not exaggerate relief to make lines more obvious. Any retained inspection height PNG uses `0.5 + (height - 0.5) * 0.25` and contributes no active height emboss.

Run conversion offline and register the completed PNG. No runtime normal generation. If a legacy region-map generator also emits synthesized height/normal assets, run the TCGL converter afterward so the legacy relief cannot become active again. Record final dimensions, conversion parameters and output hashes in evidence JSON.

### Required Espeon/Sylveon finish

Use the same single authored-normal material response as the final Sylveon, based on `prismatic_sir_texture` in `src/materials/profiles/prismatic.ts`, with these resolved settings:

- `normalScale: 1`, `embossStrength: 0`, `roughnessMode: 'absolute'`, `embossMaskFromNormalAlpha: false`. Set card map settings and profile overrides consistently so neither path re-enables emboss. Old generated height or normals must contribute nothing.
- Primary surface overrides: `metalness: 0.50`, `laminate: 0.045`, `foilReflectance: 0.025`, `etchedInkSheen: 0.85`.
- Author roughness from the card's own body and secondary masks as `(0.30 + 0.105 * body) * (1 - secondary) + 0.27 * secondary`: background 0.30, body 0.405, secondary foil 0.27. Never derive roughness from front brightness.
- Primary diffraction: `period: 1.16`, `bandwidth: 0.048`, `strength: 0.48`, `secondaryOrder: 0.065`, `direction: -0.48`, `crossWidth: 0.42`, `facetCoupling: 0`, `followsAuthoredNormals: true`.
- Primary structure is `plain`; `engraving`, `relief`, `patternRelief`, `facetTilt`, `reflectionCoupling` and `normalVariance` are all zero. Primary glint density/strength are zero. Do not add a second emboss response, procedural engraving, random sparkle or facet noise.
- Keep secondary foil coverage separate and card-specific. Where that card has the corresponding microdiamond region, use the reference secondary response: diffraction strength 0.46; glint density 0.94, scale 620, sharpness 125, strength 10, with the remaining secondary settings inherited from the reference profile. This is a separately masked foil effect, not a replacement for etched line geometry. Do not add secondary regions where the exact card does not have them.

Preserve the card's clean front and exact foil/protection boundaries. Matching this finish does not authorize copying another card's masks or changing unrelated cards.

### Boundaries and visual review

Keep foil coverage, opaque print protection, and etched relief as separate maps. Trace contours in the source card's coordinate system, rasterize to PNG, and compare a colored boundary overlay against the clean front at high zoom. Check narrow gaps, fingertips, fabric edges, text, and deliberately smooth areas. Coarse polygons spill across printed edges. When regions overlap, inspect raster draw order. Compute relief normals from the continuous height field before clipping to material regions; differentiating a clipped mask creates false raised outlines.

Protect outlined text by its individual letter shapes, including ascenders, counters, and antialiased edges. A brightness threshold over a rectangular text row also selects pale artwork and produces visible box-shaped patches. Inspect the protection PNG and the lit render around every text/background transition.

Visible etched ridges and the foil grating are distinct. Use exact-card photos to review foil behavior; do not copy relief-line direction into a diffraction map automatically. The reference uniform grating follows authored surface normals (`diffraction.followsAuthoredNormals`) so its color response reveals the ridges. Use one authored normal response with the required finish settings above: disable extra shader emboss, procedural engraving, random sparkle, and unrelated facet noise. Verify normal response, roughness, highlight width and foil intensity in the live renderer at several light and card angles. A broad bright foil wash can hide otherwise correct etching; a build or unit test cannot verify that appearance.

Compare the completed card with Espeon 155 and final Sylveon 156 under identical light and pose controls. Inspect front light, grazing light, moving light, card tilt, dark lighting and strong specular angles. Review UV registration at the center, corners, border, text glyphs, subject silhouette, attack areas and decorative background. Check for scaling drift, stretching, offset, inversion and false relief in protected or smooth areas. Save review captures and state any remaining uncertainty; screenshots do not establish physical groove depth. Report the exact source/variant, dimensions, transformations, conversion method, replaced asset and files changed, and confirm unrelated cards were not modified.

# DEFINITION OF PREMIUM

"Premium" means:

precision;
restraint;
depth;
sharpness;
responsiveness;
controlled highlights;
strong materials;
excellent motion;
no obvious shortcuts;
no visual noise without purpose.

It does NOT simply mean:

more bloom;
more glow;
more saturation;
more effects;
more UI;
more particles.

# COSMOS DOT PLACEMENT

Reuse the existing Base Set 2 Cosmos implementation (`pokemon-base-set-2-cosmos` and `src/materials/patterns/BaseSet2Cosmos.ts`). Preserve its material, lighting response and scale conventions. Author per-card placement data; do not redesign the shader, add random dots, use modern rainbow foil or infer relief from scan brightness.

1. Use the exact clean card front as the printed master. Register every feature in that front's full-card coordinates, normally 600x825, with no artwork-only crop or UV offset. Preserve the master image unchanged. Use photos/video of the exact print to distinguish physical foil features from printed artwork and to review their angular response; another physical copy can have different spot positions.
2. Keep foil coverage, opaque protection and Cosmos motifs separate. Use supplied SAM protection PNGs unchanged; do not re-segment subjects or text. Reuse the existing basic/evolved foil-window PNGs when applicable. Apply protection during material composition, so a feature behind print can remain one complete feature in the motif map.
3. Inspect the whole foil region at high zoom, including edges, narrow gaps and areas around text. Establish each physical feature's outer boundary before counting highlights. One large dot stays ONE large filled dot; internal gradients, rings, bright patches or reflections must not become a cluster of smaller dots. Measure its overall center and radius, retaining the large/medium/small hierarchy. Record a swirl or noncircular feature as its observed shape rather than substituting random dots.
4. Existing registration scripts may propose candidates using local contrast and multiscale blob detection. These are proposals, not finished placement. Reject print edges, text, rays, scan grain and false circles. Suppress satellites inside a larger feature. Manually review and correct missing, faint, clipped and partially occluded features. Never claim every dot is matched solely because automated detection produced many candidates.
5. Save stable card-ID-based registration data with coordinate dimensions, centers, radii and any reviewed shape/brightness information. Keep explicit additions/removals in correction data. Rasterize completed motifs offline as antialiased grayscale PNGs, normally 1200x1650. A circle has a continuous filled interior without holes or noisy fragments. Seeded optical orientation may use the existing renderer; feature positions must come from the reviewed registration, not RNG.
6. Overlay motif boundaries on the master at full resolution and inspect every foil region. Check centers, diameters, isolated large spots, clustering, empty regions, swirls and print occlusion. Compare motif-only PNGs as well as overlays; contact sheets are navigation aids, not sufficient final review.
7. Test the live card under moving light and several rotations, including front, grazing and strong specular angles. Compare the same controls with the established Base Set 2/Entei treatment. Confirm dots respond individually in their registered positions, large dots stay intact and protected print stays opaque. Preserve CPU preparation/GPU realization separation and caching; no runtime image detection or whole-set GPU preload.

Document remaining uncertainty and save review captures. If placement is explicitly deferred, keep an empty motif PNG and mark placement pending; visible dots baked into the clean scan are not completed animated placement. Mask regeneration must preserve already authored motif maps. Do not change unrelated sets or existing Cosmos optics while authoring a new card.

# Gallery

Always place new sets in chronological order in the sets picker.

# Pack artwork

All newly added pack fronts must have a perfect, tight crop to the printed wrapper: remove source backgrounds, outer padding, and tapered empty side gaps while preserving the artwork, text, and top/bottom seals. Rotate older sourced packs when needed so the wrapper is upright before cropping. Inspect the finished crop at full resolution and in the pack picker; do not stretch the artwork or leave stray border pixels.
