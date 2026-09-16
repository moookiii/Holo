# Holo studio — implementation record

The Effect Veiler front was replaced with the exact user-supplied SDWD-EN018 PNG on 2026-09-15. The prior RA01 scan remains only as an unused legacy asset.

The complete source brief is preserved in BRIEF.md. Its section 201 supersedes the earlier suggestion of permanent control hints. No completion is implied by having a named profile.

## Active work

Latest user sequencing: after the current patterned reverse-holo pass, add more Magic: The Gathering foil treatments. Finish/check EX energy and Poké Ball/stars plus Squirtle, then prioritize materially distinct MTG families. Do not extend the Pokémon sequence before that switch. Preserve all existing treatments and exact user-supplied Magic fronts/backs.

Latest user correction: Eevee reverse showed pale cutouts around Energy medallions, the set symbol and the Pokémon description ribbon. Removed oversized integer-circle masks and the rectangular set-symbol patch. Energy edges are now registered at subpixel precision; the symbol's narrow outline is derived from its printed shape, and the ribbon uses gold/black ink coverage rather than its rectangle. Artifacts 125 and 127 preserve the visual comparison. This supersedes the earlier reverse mask pass.

The first reverse-holo pass adds an explicit coverage mode plus Legendary Collection Eevee and Expedition Charizard. It routes authored body masks through the existing packed primary channel, preserving separate artwork, border, motif, stamp and ink controls without more GPU samplers. The first Eevee render had regular white bursts and pale text outlines; a separate denser Legendary field and paper-contribution removal corrected those. Source front images remain unchanged. Artifact 124 reviews Charizard under four rigs; 125 reviews Eevee before the user's symbol-edge correction. Artifact 126 passed coverage, spectral isolation, stationary/motion return, cached switching and narrow framing on WebGPU/WebGL before that final edge correction. Historical and modern reverse motif families and moving-reference matching remain outstanding.

Latest user correction: Tyranitar's primary mask spilled over the teal left rail and omitted the raised upper-right strip of the picture. Fixed the shared artwork path for foil, extended foil and laminate; authored source bounds now start at x59 rather than x31 and follow the step from y116 to y102 at the right. The reverse-holo pass follows this correction.

Latest full-goal continuation: the directional Pokémon pass adds Sheen, Water-Web, Line and Mirage, plus PAL Tyranitar as Mirage's matched showcase. The next material pass is Cracked Ice, Sequin, Pixel/Confetti and Speckle. The full collection remains in development; earlier priority and sequencing notes below record prior work rather than completion of the overall goal. Preserve the Magic family and all accepted treatments.

Prior Magic priority: the user superseded the additional Yu-Gi-Oh! and original-card plans with Magic: The Gathering. Angel of Serenity and Black Lotus use the exact supplied fronts, with Traditional, Halo, Surge and Fracture now available. These are treatment studies, not claims of actual specialty printings. Preserve all accepted Pokémon, original and Yu-Gi-Oh! work, especially Blue-Eyes and Tinsel. Later sequencing notes below are historical.

Angel of Serenity and the Magic family are registered. Artifact 91 contains the initial eight-angle Traditional study, with no renderer errors. Specialty development and visual acceptance are still in progress. Current sources are the a4a0f53f front and c6a1b756 back; their unmodified copies and authored optical maps are separate.

Artifacts 78–80 record the new Blue-Eyes refinement: initial over-coverage was corrected to protect cyan body ink; separate masks expose selected eye/teeth/claws; smooth grain replaces the earlier plain sheet only for this card's Ultra default. Artifact 80 covers eight poses under four light rigs. The new exact front is 1854 × 2700; the normal live browser tab was switched to it and visually verified. Nineteen unit tests and build passed during this pass.

Collector candidates now have separate engraved artwork, dazzle border and (Prismatic) clustered frame pixels/varnish. All four additions are now available in presentation after the final review. A rendered isolation check exposed a shared TSL bug: tangent initialization first occurred within the optional imported-normal branch, leaving slopes ineffective when that map was absent. Geometric tangent/bitangent construction is now eager before that branch. Artifact 82 preserves the diagnostic shader and captures; artifact 81 checks corrected physical reflection, frame-varnish isolation and stationary/returned poses. The existing YGO mechanisms and the Starlight/Tinsel motion regressions passed on both backends; visual captures were inspected. Keep these calibrated values stable.

Latest sequencing correction: finish Cathedral Prism, Spectral Lattice and Black Chrome Prism before switching focus. Then prioritize Yu-Gi-Oh! foils over remaining original and Pokémon work. Keep giving concise progress updates. Do not count leaving these three lab-only as finishing them.

Latest user steering during the Ghost pass: once this works, return to Pokémon holos and add another card. Finish/check the current Ghost mechanism, then work on Pokémon Galaxy-Star/Starlight with Base Set Charizard as the next card. Remaining Yu-Gi-Oh! families follow that Pokémon pass.

Foundation and physical card now run on WebGPU. Flagship optical development and screenshot iteration are active. The user explicitly prefers the original flat vector art; retain it rather than the imagegen illustration explored in version 2.

Latest user correction: removing existing treatments was a regression. Restore Starfield and Microdiamond to presentation and allow Cosmos/the existing library on any card. Preserve available features during refinement. The earlier curation/filtering decisions below are historical and superseded. Prioritize visible improvements and concise verification; avoid expanding peripheral work at the expense of the holograms.

## Yu-Gi-Oh! emboss and full-card foil pass

Ultimate, Prismatic Ultimate and Starlight now appear in presentation. Ultimate uses pressed curved contours plus authored artwork height. Prismatic Ultimate separates the raised clear varnish normal from the foil beneath it. Starlight uses fixed, fine horizontal/vertical cuts and a dedicated extended coverage map, preserving rules text. The name has independent gold or rainbow treatment; security foil keeps its own material when switching Yu-Gi-Oh! profiles. Super leaves the name as print.

Effect Veiler now uses the user-selected SDWD-EN018 front with the TCG reverse. The high-resolution source is unchanged; authored wing/figure relief remains an approximation. Trying Ultimate, Prismatic Ultimate or Starlight on this card is a treatment experiment, not a claim those printings exist. See CARD-SOURCES.md.

Rendered A/B checks exposed that the previous native bump-node use did not change lighting in this split texture-channel graph. A TSL surface-gradient normal now derives slopes from authored height and view-space position derivatives, in centimetres. Removing raised varnish changes over 6,200 pixels by more than one code value, and disabling artwork emboss changes over 15,000, on both WebGPU and WebGL 2. Extended coverage changes more than 295,000 pixels, with zero changes inside the protected rules area. Stationary frames are identical and both renderers report zero errors. These are mechanism checks, not historical optical validation.

Artifacts 35–37 contain the A/B checks and visual comparisons. The three finished originals were re-captured after the shared relief fix and compared with the previous pass; their flat artwork, characteristic spectral response and overall appearance are preserved. The first name-mask threshold wrongly selected the entire dark name panel; local contrast extraction now registers the lettering instead. Scan grain still limits its precision.

## Ghost mechanism pass

The independent image hologram uses an opaque silver substrate, a bounded UV-space virtual image, and a light-and-view-dependent reconstruction lobe. A separate RGB data map supplies virtual depth, the fixed artwork window and local angular offset. It does not reuse physical emboss coverage or make the card transparent. The worker applies print protection to the image window while preserving its depth data. Ghost is now in presentation after the first mechanism pass; historical accuracy remains pending.

`artifacts/39-ghost-first` revealed an incorrect use of the Ultimate mask on borders/symbols. The independent window and lower reconstructed-image intensity corrected this in `40-ghost-window`. `scripts/ygo-browser-check.mjs` now verifies actual Ghost image-depth changes (>56,000 pixels by more than one code value) and angular visibility changes (>201,000), with no rule-text changes and stable stationary frames on both WebGPU and WebGL 2. The card remains fully opaque. `41-ygo-ghost-check` preserves the evidence and also rechecks Ultimate, raised varnish and Starlight. Eighteen unit tests and the production build pass at this point.

This is a rendering approximation built from the unchanged front and authored shallow depth, not recovered multi-view Ghost artwork. Effect Veiler's Ghost selection is a cross-treatment experiment; RA01 does not have this printing. Three actual TAEV-JP006 Rainbow Dragon photographs from the seller are cached and inspected: pale silver image, spectral contour accents and local color/contrast differences. They establish appearance at the photographed angles only. A matching Ghost front and moving empirical comparison remain outstanding. Per the user's latest request, Pokémon/Charizard work now resumes.

## Accepted interaction change

Tilt and Rotate are now one interaction: pointer position supplies restrained yaw/pitch with a little diagonal roll, while dragging applies quaternion arcball rotation with analytic angular inertia. The redundant mode picker has been removed. The tilt range remains 13.75° yaw, 11.46° pitch and 3.72° roll, directed **away** from the pointer: moving right recedes the right edge and moving down recedes the bottom edge. Geometry-based tests cover all four directions, and interrupting reset continues from the visible orientation.

Both Tilt and Rotate now start and reset face-on. Reset preserves smooth quaternion interpolation from arbitrary rotated/flipped poses. The test compares orientation correctly: opposite quaternion signs represent the same physical pose.

## User corrections and Pokémon return — 2026-09-14

The user accepted the visible Yu-Gi-Oh! correction pass and asked to continue Pokémon. Starlight now covers the title panel, set code and bottom print strip while excluding rules text; its fine cuts include larger crossed groups of facets. Yu-Gi-Oh! clearcoat was reduced and roughened, with a separate laminate mask reducing gloss over the rules. Artifacts 43 and 46 preserve the comparisons. The back was initially registered using a UV crop; the current worktree subsequently supplies the user's `back-en.png` directly. Preserve that newer asset selection.

Master Prism's radial fan had an angular discontinuity: hashed sectors did not join across atan's branch cut, and differentiating the discontinuous angle falsely removed engraving on that row. Smooth periodic modulation and an analytical polar phase gradient remove the seam while retaining radial engraving. Artifacts 44/45 compare eight orientations without browser errors.

Base Set first-edition Charizard is now in the card picker with a separate Pokémon Starlight / Galaxy-Star profile. The unchanged scan has a hand-authored coverage map for the body, wings, mouth, tail and tail flame. The first mask cut the tail and removed the blue-edged breath; both were corrected against the original image. The breath remains partly transmissive to foil. The user briefly requested removing its boundary, then explicitly retracted that change: retain the earlier flame treatment. Do not apply the rejected softened/no-outline variant.

Galaxy-Star has unequal four/eight-point motifs, small pinpoints, angular local facets and a quieter fine-grained sheet. It is independent of Original Starfield and both Cosmos variants. Artifacts 48–51 track the changes; the final grid refinement replaces overly regular dots with unequal sparse horizontal strokes. The current default is an optical approximation, not a matched moving-reference reproduction. The original scan's baked illumination and trace accuracy remain limitations.

The expanded browser check passes both WebGPU and WebGL 2. It confirms the actual loaded mask excludes the sampled body, tail, tail flame and rules, while preserving foil in the breath/background. Turning off optical contributions changes over 86,000 background pixels by more than one code value with zero changes in the rules crop. Galaxy-Star is stationary (WebGPU exact; WebGL three pixels differ by one code value), all previous treatments remain offered, Rotate reset is physically face-on, and both renderers report no errors. The 18 unit tests and production build also pass. Import checks subsequently pass both backends, including the new image-hologram data map, three regional materials, registration, session cleanup and no external requests. A final amplitude/row-phase adjustment makes Galaxy-Star's background grain less regular; artifact 53 captures it. Tinsel is the next Pokémon mechanism.

## Tinsel and next user priorities — 2026-09-14

Tinsel now has unequal horizontal foil bands, finer lateral streaks and a distinct neutral reflection. The field contains geometry only. Its local grating axis is constructed from the geometric tangent basis and the authored facet slope, then projected onto that facet's plane. This replaces the flat spectral wash seen in artifacts 54–56. A first coupled pass (57) produced thin neon stripes; broader, flatter bands and restrained spectral energy (58–59) improve the resemblance to the inspected static Reshiram reference. The Reshiram image remains research only; Charizard's card, default Galaxy-Star and corrected mask are unchanged.

Tinsel is now in the normal picker. Artifact 59 covers eight poses under four light rigs. `scripts/tinsel-browser-check.mjs` passes both WebGPU and WebGL 2: stationary images and the return after a smooth tilt sweep are exact, the manufacturing atlas remains unchanged, disabling local-axis coupling changes over 105,000 pixels by more than one code value, neutral reflection changes over 109,000, and neither affects the rules crop. Both report zero browser errors. The 18 unit tests and production build pass. This completes the current implementation pass; the profile remains `reference-pending` because a static slab image cannot validate a full physical angular response.

The final YGO correction check in artifact 47 also passed both renderers, including extended coverage, unchanged rules, actual emboss/varnish and Ghost depth/angular response.

Latest user instructions: after Tinsel return to Yu-Gi-Oh!, add BOTH Blue-Eyes White Dragon matching `C:/Users/jpall/Pictures/s-l1200.jpg` (visible LCKC-EN001 first edition, gold title and smooth art foil) AND I:P Masquerena, finish the remaining Yu-Gi-Oh! holo families, and correct Starlight's bright grid movement. The temporary request to replace Blue-Eyes with I:P was immediately revised to both. Explicit direction: tilting upward makes the bright bands move downward. The manufactured foil stays attached to the card; the moving feature is the angular reflection envelope. Sheen research is deferred behind this priority.

The user then explicitly stopped the transition to Yu-Gi-Oh! and supplied a clearer Tranquill reference (`C:/Users/jpall/AppData/Local/Temp/codex-clipboard-49873c72-4ef1-4421-bf5b-38851aa2e8dc.png`). Tinsel is NOT accepted as finished. Its visible thin uneven silver streaks and broken colored segments replace the previous broad-band interpretation. Current work remains Tinsel until that visual target is met; both requested YGO cards and the Starlight motion correction stay queued. Earlier passing tests establish rendering behavior only, not acceptance against this new reference.

The subsequent thin-strand pass (artifact 61, 174 unequal rows per card height, broken segment response and stronger silver) was accepted by the user: “looks good move to yugioh.” This is now the accepted Tinsel appearance. Preserve it and proceed with Starlight grid motion, Blue-Eyes AND I:P Masquerena, then remaining Yu-Gi-Oh! families. The follow-up renderer check passes both backends against these accepted values: returned pose is exact, no changes in rules text, and the atlas stays fixed. Artifact 60 contains the latest report.

## Starlight motion and user-selected Yu-Gi-Oh! cards

Starlight's bright bands now move opposite tilt on both axes, including diagonals. A light/view-dependent envelope selects the fixed cuts in the card's tangent basis. The manufactured atlas is never translated. Artifact 65 verifies actual rendered displacement in card coordinates: right tilt shifts the reflection left, left shifts right, up shifts down, down shifts up, and diagonal components combine. Both WebGPU and WebGL pass, with exact return to the original pose and no errors. The vertical sign was corrected from measured output. An initial optional shader branch produced black output (62); continuous derivative evaluation fixed it (63 onward). Artifact 68 also rechecks the full Starlight material, protected rules, Ultimate emboss, raised varnish and Ghost on both backends.

I:P Masquerena now uses the user's exact 500 × 733 PNG, with independent authored coverage, height, name and stamp data. The source file's SHA-256 matches the copied front. The image shows LAVD-EN033, so the card is honestly labeled as a user-supplied image with a Starlight treatment rather than claiming it is the earlier CHIM scan. Artifacts 67 and 69 show eight angles on WebGPU and WebGL respectively, with no browser errors. The original researched CHIM scan remains research only.

The user supplied a second Blue-Eyes image and explicitly selected the flat `s-l960.jpg` as artwork, with the larger `s-l1200.jpg` used as the foil reference. The flat source shows LDK2-ENK01; the reference shows LCKC-EN001. Keep those identifiers accurate. Blue-Eyes uses the exact 345 × 500 front, a separate gold name mask and print-opacity coverage for the smooth picture foil. The initial render (70) was too washed out. Artifact 71 compares controlled optical settings; subsequent work removes the extra manufactured-cut silver lobe from plain sheets, whose physical material already supplies neutral reflection. This is an optical approximation; the source resolution and static reference remain limitations. Remaining Yu-Gi-Oh! families are still outstanding.

Artifact 72 captures the selected restrained Blue-Eyes settings at eight poses. Artifact 73 passes the existing Yu-Gi-Oh! checks on both backends after removing the duplicate plain-sheet silver contribution, retaining Ultimate, varnish, Starlight and Ghost behavior. Artifact 74 selects both new cards through the actual picker and verifies their default treatments, stationary rendering, visible computed diffraction and zero spectral changes in protected rules text, on both WebGPU and WebGL. Blue-Eyes' source SHA-256 is `4495A32959EAF2CA3841846FE48699346C854FDE61E21BC7E32E1A811B832F2B`, identical to the installed front. All 18 unit tests and production build pass. The existing live browser tab has Blue-Eyes selected and was visually verified. The rejected CHIM front and photographic Blue-Eyes trial were archived outside public assets. No reference-based image registration code remains, because the user selected the flat image instead.

Next: finish the remaining Yu-Gi-Oh! families, beginning with the materially distinct Collector/Prismatic Collector engraved treatments and Platinum variants, then Quarter Century and patterned parallel/gold families. Their named profiles are not yet implemented. Continue visible refinement and moving-reference comparison; do not declare the full brief complete from the current subset.

## First visual pass

- Solid rounded geometry, independent back and paper edge render correctly including a grazing view.
- Reflected-light spectral extension compiles on r186 and renders without browser errors on WebGPU.
- Captures `artifacts/01-physical` and `artifacts/02-diffraction` provide the baseline.
- The first diffraction pass is too broad and colorful; a rectangular mask is conspicuous. Narrow spectral response and follow the circular engraving with coverage before expanding profiles.
- The original vector art is preferred by the user and remains selected.
- Refined pass `04-balanced`: circular selective coverage, narrow spectral fans and normal-driven silver engraving. Brighter than pass 03, without returning to the rectangular full-rainbow field of pass 02. User retracted a brief strength-change request; continue the current direction.
- Ten mathematical tests pass: watertight physical geometry, 100 flips, mid-flip motion/queuing, 60/240 Hz inertia parity, 20,000 tiny rotations, portrait/landscape bounds, two input modes, hover bounds, the four away-tilt directions, and reset interruption.
- `scripts/browser-check.mjs` passes on WebGPU and forced WebGL 2: zero browser errors, actual pointer rotation, wheel zoom, two keyboard flips, identical stationary screenshots, portrait, roll and landscape captures.
- Production build passes (912 kB JS / 251 kB gzip before material lab). Initial measured headless frame intervals settle near 5.6 ms; this is a development measurement, not a cross-device performance guarantee.
- Developer material lab now available at `?lab=1`; no developer controls in normal presentation.

## Independent optical regions and reference development

- Coverage R and G now drive separate optical uniforms, manufacturing atlases, diffraction, deterministic glints, facet slopes, roughness, metalness and anisotropy. Secondary regions take priority on overlapping masks. Physical substrate/clearcoat lighting runs once; the shader skips a disabled optical layer.
- Coverage B supports independently colored metallic ink. Coverage A controls laminate. Surface B controls sparkle coverage; missing surface maps use a neutral height with full sparkle coverage. Surface G, imported normal/direction maps and stamps are now implemented and verified in the local-import phase below.
- Card selection now prepares both optical fields and compiles the candidate material before committing the visible card. Stale asynchronous selections are discarded and their geometry/materials disposed.
- Classic Cosmos now uses small independently oriented square elements within larger circles/rosettes/swirl. A separate Cosmos HD structure uses smooth circles and an unbroken swirl. Only classic Cosmos is associated with Lugia; HD is a development option awaiting a matched showcase card.
- Super, Ultra, Secret and Prismatic Secret are structural reconstructions, all `reference-pending`. They can be inspected on the original calibration art. They are not accepted reproductions of specific Yu-Gi-Oh! printings. Secret's diagonal cuts were refined after inspecting two physical Jinzo photos; the stock render has different effect wording and was not added as a historical showcase card.
- Capture `10-cosmos-pixel` checks the revised classic sheet. `11-ygo-structure` is the first four-profile comparison; `12-secret-chips` replaces uniform Secret dashes with irregular clustered cuts and correlated sheet phases. The latter is an improvement in structure, not final optical validation.
- Expanded `scripts/browser-check.mjs` passes both backends with zero browser errors. It checks rapid card selection, classic/HD switching, stationary Cosmos, and visible separation of primary foil, secondary foil and gold ink. Disabling primary diffraction affected ~140,455 pixels in its own band; disabling secondary affected ~141,496 pixels in the adjacent band, with no overlap. The final run had identical stationary frames on both backends. The check permits at most 50 pixels differing by one 8-bit level to accommodate occasional GPU readback rounding; anything larger fails.
- Material lab now selects either optical region and refreshes displayed values after profile/card changes. Development fixtures are not imported by the normal application build.

## Current acceptance gaps

The broader goal remains active. No optical profile is yet marked curated or reference-validated. Most requested historical families, print-specific masks/assets, moving-reference comparisons, global cache/memory limits, post-process finishing, device performance and final original-profile curation remain outstanding. A named development preset does not satisfy those requirements. See FOIL-INVENTORY.md and CARD-SOURCES.md.

## Original foil review — 2026-09-14

- Reviewed all six current original candidates at three angles (`13-original-review`) and four light rigs (`16-light-review`). Master Prism, Aurora Silk, Crystal Shard and Topography have distinct visible structures; none is yet asserted to meet the full final curation gate. Microdiamond's coarse grid and Starfield's weak angular identity failed this review and are now lab-only.
- Direction atlases now encode an **axis** as `(cos(2θ), sin(2θ))`, rather than a signed vector. Filtering opposite but physically identical grating directions no longer cancels them. An eleventh unit test covers this invariant across a full turn.
- Added a second orthogonal diffraction lobe at the same surface point, separate from the existing region-composition system. Its energy is divided with the first lobe rather than simply doubling the light.
- Added ordered diamond-lattice glints, normal-variation roughness filtering, and a separate bump contribution from the manufactured pattern's height channel. Topography now uses that height response beneath the independent laminate.
- Microdiamond was refined from 135 to 275 cells, with a 2048-high manufacturing atlas, aligned crossing gratings and less alternating spacing variation. `14-original-filtered` exposed a filtering artifact; `15-microdiamond` fixes it by storing the crossed pair consistently. It remains lab-only pending close-up and motion acceptance.
- The normal treatment picker now filters by card: Original shows the current stronger candidates; the Neo Genesis Lugia offers classic Cosmos only. `?lab=1` retains the full development library, including cross-family experiments. Hidden debug selections remain correctly labeled without becoming normal menu options.
- The expanded browser check passes WebGPU and WebGL 2 with zero browser errors, including active crossed-grating/ordered-glint and pattern-emboss paths. Nocturne is identical between stationary captures; the WebGL Cosmos comparison differed in six pixels by one channel level, within the documented readback tolerance.
- Latest production build: 931.47 kB main JS / 257.17 kB gzip, plus the separate worker and lab chunks. This is a functional result, not final performance acceptance.

## Local imports and authored material maps — 2026-09-14

- Card → Import card now accepts front/back images with metadata and optional maps, or a JSON manifest plus files/folder. Files remain local to this session; imported cards can be removed from the picker. See IMPORTING.md for the schema and map encodings.
- Independent grayscale masks pack in a worker into coverage, surface and pattern textures. Fixed a vertical registration error by matching the canvas row orientation to loaded print images. Protection removes foil/metal/stamp coverage without removing laminate. Pattern suppression preserves the substrate underneath.
- A third independent optical region supports security/rarity stamps. Imported OpenGL normals, absolute/offset roughness, independent height, and three regional direction maps all reach the material. Per-card overrides clone the library profile and never mutate another card's settings.
- The import lifecycle compiles the candidate before replacement, reports invalid files inline, and defers disposal until removed textures are no longer active or in flight. Imported images default to print only; selecting a foil treatment uses whole-front coverage unless the author supplies region masks.
- Fifteen unit tests pass, including packing/protection, manifest validation and the existing physical/motion invariants. The full baseline browser check passes WebGPU and WebGL 2, with zero browser errors and identical stationary images in that run.
- `18-import-check` verifies actual image imports, folder bundles on WebGPU, flat multi-file bundles on WebGL, three active optical layers, local-only requests, invalid-manifest recovery, modal shortcut isolation, visible mobile actions, and removal/URL cleanup. Stamp deactivation changes about 80,287 pixels entirely inside its upper-right printed region; normal and roughness maps also cause substantial measured lighting changes. Top/bottom mask registration is checked from rendered pixels on both backends. No browser errors or external requests were recorded.
- Production build passes: 940.26 kB main JS / 259.62 kB gzip, plus separate import dialog (15.77 kB), lab and worker chunks. Global cache limits and a broader physical-device performance audit remain open.

Next substantial work (superseded by the later priority correction): original optical development and established-material references. The current order is to finish Cathedral/Lattice/Black Chrome and then prioritize Yu-Gi-Oh!. Do not substitute the original calibration art for real-card showcase completion.

## Pearl, fixed rings, fluid direction fields and lighting — 2026-09-14

- Added Opal, Solar Fresnel and Liquid Spectrum to the normal treatment library, retaining every previous option. Opal uses native spectral thin-film interference with UV-fixed thickness domains and a restrained pale substrate. Solar uses 2048-high fixed elliptical grating rings. Liquid uses a distinct warped direction field; it no longer shares Silk's flow formula.
- Captures `19-opal-first` through `21-new-foils` show the material iterations. Initial Opal was nearly invisible; a higher film IOR and restrained pearl body make it distinguishable under studio reflections. Liquid's initially excessive head-on spectral intensity was reduced. These are initial visible improvements, not full curation acceptance.
- A reflection-angle comparison exposed an oversized near-white highlight over the moth's face. Native rectangular-area lighting replaces the directional key for physical print/laminate reflections. Diffraction and glints integrate the emitter's angular footprint using a moment-matched Gaussian approximation with normalized lobe energy. This avoids four copies of the optical shader and the slow WebGL compilation/runtime of the experimental quadrature implementation.
- `24-softbox-live` proves the native area-light implementation was actually served; `23-softbox` is an invalid lighting comparison because Vite served an older module. Enabled polling and excluded generated artifacts/docs/tests from the source watcher to keep live edits reliable. The browser check now asserts the actual light type and initial face-on Tilt quaternion.
- `26-softbox-analytic` renders on WebGL without console errors, measured at about 5.6 ms mean frame intervals after settling in that capture. This is a local headless measurement, not the required cross-device acceptance. `27-softbox-size` compares four physical emitter sizes; the compact source restores narrow color separation and retains more face detail than the former directional highlight. The Soft preset keeps the larger emitter for deliberately broader reflections.
- Final checks for this pass: 16 unit tests pass; typecheck and production build pass (1190.80 kB main JS / 365.47 kB gzip, including native LTC area-light tables). The expanded browser check passes both backends, covers the restored and three new menu choices, verifies stationary new profiles and independent optical regions, and confirms Tilt starts face-on. Import checks also pass both backends with all three foil regions, authored maps and cleanup; no browser errors or external requests. Existing per-card import behavior survives the material/lighting changes.

## Sequence

### Engraved originals finished before the Yu-Gi-Oh! priority pass

- Cathedral Prism, Spectral Lattice and Black Chrome Prism now appear in the normal treatment picker. Existing treatments remain available. Each has its own 2048-high manufacturing field: eight engraved radial sectors and pointed arch tracery; a fine crossed lattice with sparse raised junctions; or narrow curved lines over an absorbing chrome substrate.
- `28-engraved-originals` exposed Black Chrome's weak response. Its long grating period placed the strongest first-order reflection outside the visible bands at the narrow angular aperture. `29-engraved-refinement` corrects the period/direction field and adds region-specific substrate darkening; `30-chrome-tuning` selects the more restrained of two responsive settings. Cathedral's arch relief and Lattice's density/contrast were refined in the same pass.
- `31-engraved-light-review` captures all three at eight poses under four light rigs (96 comparison views). All three show distinct structure through the normal tilt range; Soft intentionally broadens their spectral response. `32-engraved-close-webgl` verifies maximum-close inspection on the fallback renderer. No browser errors or warnings occurred in either capture set.
- Final validation: 16 unit tests pass, typecheck/build pass, and the expanded browser check passes WebGPU and WebGL 2 with zero errors. It covers all three visible menu choices and their stationary rendering, the restored older profiles, physical flips, away-tilt, face-on startup, resize/framing and optical-region isolation. Main production JS is 1192.73 kB / 365.92 kB gzip. This completes this three-treatment implementation/review pass; broader physical-device and final collection-wide curation remain part of the ongoing goal.
- Next implementation priority: Yu-Gi-Oh! Ultimate embossing, Starlight structure and Ghost image response, with matched card masks/assets and references. No further original-family expansion precedes that work.

1. Foundation: WebGPU renderer, modern pipeline, solid rounded card, independent front/back, quaternion input, smooth zoom and composed flip.
2. Physical material: print color, laminate, studio reflection, paper edge, sharpness.
3. Flagship optical core: directional multi-band diffraction, fixed engraving, deterministic angular glints; inspect and iterate before expansion.
4. Typed profile modules and separate development lab.
5. Finish Cathedral Prism, Spectral Lattice and Black Chrome Prism.
6. Prioritize reference-backed Yu-Gi-Oh! materials and matched card assets/masks: Ultimate, Starlight and Ghost first.
7. Resume remaining Pokémon and original-family work after the Yu-Gi-Oh! priority pass.
8. Polish and QA across angles, light rigs, dimensions, devices, backends and frame pacing.

## Acceptance policy

- Compilation is only a functional gate. Rendered views and temporal inspection determine visual acceptance.
- Uncertain established foil variants remain explicitly unverified and outside the curated presentation set.
- Preserve screenshots and notes on improvements; do not ship weak original presets.
- The goal remains active until the full brief is satisfied.

## Collector, Platinum Secret and Quarter Century additions

The shared tangent fix passed the existing Yu-Gi-Oh! rendered mechanism checks on WebGPU and WebGL 2 (artifact 83): physical varnish, emboss, extended foil, protected rules, Ghost depth and angular response. Artifact 81 also verifies accepted Blue-Eyes grain and protection plus physical Collector slopes with diffraction disabled. The four new finishes were inspected in eight poses (artifact 87); there were no rendering errors or warnings.

An initial separate Quarter Century logo sampler exceeded the baseline 16-texture limit (artifact 84, failed). The final implementation packs neutral logo coverage into image-hologram alpha, preserving the existing texture budget. All source card rasters remain unchanged. Artifact 88 tests the new spectral regions, independent rules watermark and deterministic return poses on both backends; Starlight/Tinsel regressions follow in 85/86. All three checks passed on WebGPU and WebGL 2 with no rendering errors: stable stationary/returned poses, unchanged rules outside the watermark, and opposite-direction Starlight grid motion. Import/registration/resource-cleanup checks also passed after the shared packing change (89). Nineteen unit tests and production build passed. The live in-app tab shows I:P with Quarter Century; all four additions and the prior library were verified in its picker. Historical/moving physical-reference matching remains pending; this is not completion of the overall goal.


Artifact 90 confirms Blue-Eyes preservation after the packing change: the face-on WebGPU render is pixel-identical to artifact 81 (zero changed pixels; maximum channel difference 0), with no renderer errors or warnings. All processes for this batch have completed; Vite and the user's existing I:P/Quarter Century tab remain running.

## Pokémon Fireworks, Crosshatch and ACE SPEC — 2026-09-15

- Added all three to the normal Pokémon treatment picker, with dedicated 2048-high manufacturing fields in `PokemonPatterns.ts`. They use the existing TSL optical model, texture cache and independent card masks. No shared lighting/shader behavior or source card images changed.
- Fireworks uses overlapping, irregular broken radial cuts; Crosshatch uses fine crossed diagonal cuts and larger coherent band inclinations; modern ACE SPEC uses continuous large diamond bands above horizontal microcuts. The foil has no time/screen inputs or stored rainbow colors. ACE SPEC does not impose magenta ink on unrelated cards.
- Three visual refinement rounds removed uniform radial spokes, rounded ACE SPEC pools, and false square/triangular repeat seams. Artifact 101 contains the final three-profile comparison, front/left/right/diagonal/edge/strip-light captures and 390 × 844 mobile views on both backends.
- `scripts/pokemon-patterns-check.mjs` passes for all three on WebGPU and WebGL 2 with zero browser/request errors. Stationary and returned poses have zero pixels differing by more than one channel level; diffraction leaves protected rules pixels unchanged. The sheet hashes survive motion and cached profile switching; pairwise rendered differences confirm distinct profiles. Cached-switch timings measure the return to an already prepared new profile, excluding preparation of the intervening Cosmos HD sheet.
- Production typecheck/build pass using bundled Node 24.19.0. All 21 unit tests pass, including new regression checks for ACE SPEC normal continuity and physical pattern scale across card aspect ratios. The shell's default Node 20 is below the project's documented minimum, so validation uses `C:/Users/jpall/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`.
- Physical-photo sources and coverage limitations are recorded in REFERENCES.md. These are available material studies; matched historical reverse masks, modern ACE SPEC card assets, and measured moving-reference acceptance remain separate work. This completes the requested three-profile addition, not the collection-wide acceptance checklist. Local Vite remains available at `http://127.0.0.1:5173`.


## Directional Pokémon films and Tyranitar — 2026-09-15

- Added Sheen, Water-Web, Line and Mirage to the existing library. Their manufacturing fields contain direction, pitch, coverage and inclination; colors still come from light/view-dependent spectral evaluation. All four remain reference-pending.
- Added the unchanged 734 × 1021 PAL 135/193 Tyranitar front with separately authored background/subject, silver-border, laminate and copyright-ink maps. The standard pack Mirage printing is the matched default; other treatments on it remain experiments. The original Nocturne startup and previous cards remain available.
- Initial captures (103–105) showed overly corrugated smooth films and excessive band repetition. Reduced repetition/intensity and introduced optional reflectionCoupling to distinguish aggregate metal reflection from diffractive inclination. Its default of 1 preserves every older treatment. Physical Collector engraving remains fully coupled.
- Close source inspection corrected foil spill on the hand/spikes, protected the evolution strip, and replaced a visible rectangular footer exclusion with a lettering mask. Artifact 109 records the final mask under eight poses and four light rigs, with zero renderer errors/warnings. No bloom contributes to these results.
- Artifact 111 passes all four final profiles on WebGPU and WebGL 2: no browser/request errors, stationary and returned-pose stability, protected rules ink, fixed atlas hashes, cached switching and 390 × 844 framing. Artifact 110 passes the existing Blue-Eyes/Collector physical-reflection and varnish-isolation checks on both backends.
- At the directional checkpoint, all 23 tests and production typecheck/build passed. Physical moving-reference matching, matched cards for the other three films, and collection-wide/device acceptance remain open.

- Artifact 112 compares the existing Tinsel, ACE SPEC and Magic Halo against their artifact-102 baseline at eight poses each: all 24 views are pixel-identical, maximum channel difference 0.

## Cracked Ice, Sequin, Pixel/Confetti and Speckle — 2026-09-15

- Added four dedicated manufacturing fields and profiles after inspecting physical reference photographs. Cracked Ice uses a continuous irregular triangular mesh; Sequin uses faceted annular/square motifs and tiny rosettes; Pixel/Confetti uses connected block flakes; Speckle uses much finer isolated points. Pixel and Confetti are documented names for one family, not separate hue variants. All retain reference-pending status.
- Artifact 113 exposed regularly placed Sequin motifs and a checkerboard appearance in Confetti. The refined version (114) scatters and varies Sequin centers, joins Confetti subcells into flakes with more coherent inclination, and lowers Cracked Ice spectral strength. No time-dependent randomness, screen coordinates, stored rainbow color or bloom was introduced.
- Inspected four-light/eight-pose comparisons in artifact 115 and the live Sequin view. Broad facets, discrete motifs, larger flakes and fine grain remain visibly distinct, including quieter tilted views. No renderer errors/warnings occurred.
- Artifact 116 passes all four on WebGPU and WebGL 2: stable stationary/returned poses, unchanged protected rules, light response, deterministic manufacturing hashes, cached switching and mobile framing. These checks establish behavior, not empirical matching to a moving physical specimen.
- All 24 unit tests pass, including complete Cracked Ice sheet coverage without raised seams. Production typecheck/build pass (1224.24 kB main JS / 373.92 kB gzip; 23.57 kB separate pattern worker). This is a local development measurement, not device-wide performance acceptance.
- Remaining work includes matched cards for these finishes, first-class historical/modern reverse coverage, the additional Yu-Gi-Oh! and premium families, moving-reference matching, bounded caches and final collection-wide quality/device acceptance. The overall goal remains active.
- Artifact 117 captures all eight new Pokémon materials at maximum close zoom on WebGL 2, including grazing views, with no errors/warnings. The local foil structures stay registered; the 734 × 1021 Tyranitar source naturally limits printed-art detail at this magnification. This does not substitute for moving-reference or physical-device acceptance.

## Tyranitar boundary correction — user-reported, 2026-09-15

- The prior artwork path incorrectly began at x31 instead of x59, covering the teal rail outside the image frame. Its flat y116 top also omitted the raised upper-right image strip. The foil, extended-foil and laminate now share a corrected stepped path, and the card's artwork rectangle matches the inner picture bounds.
- Artifact 118 records Water-Web, Mirage and Pixel/Confetti at eight poses on WebGPU, with zero renderer errors/warnings. Artifact 119 contains a source/coverage overlay and direct before/after comparison. The registration check reads the generated SVGs: both foil maps have zero coverage throughout the left rail and full authored coverage in the previously missing upper-right strip/background. Evolution text and the subject torso remain excluded.
- Typecheck and production build pass. This fixes the two user-identified boundary defects; previous whole-card acceptance claims did not establish accurate local registration and must not be treated as proof of it.
- Artifact 120 verifies the corrected Water-Web and Mirage masks at eight poses on WebGL 2, with zero errors/warnings; the fallback front view was visually inspected. Both rendering backends retain the corrected boundaries.
