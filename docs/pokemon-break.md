# Pokemon BREAK: square fan foil

The dedicated `pokemon-break` profile is registered on all 35 acquired English XY BREAK printings. The fixed manufacturing lattice uses squares aligned with the full card UV axes. Light/view momentum selects opposing triangular sectors of an in-plane fan grating inside each square. The highlights rotate inside the tiles; the tile boundaries stay fixed. The later user requests explicitly call for stronger rainbow coloration inside the squares, superseding the original restrained-color target.

## Physical references and interpretation

The complete supplied Nidoking BREAK 46/108 clip (`firefox_8160_{;10}.mp4`, 782x716, 406 frames at 60 fps, 6.766667 seconds) was reviewed across its duration, including closer frames. SHA-256: `6d7816ca707b61fa0550d2879477b279ff346bbe35de7e0fb5b22c8c3e9ea411`.

The correction clip (`firefox_8161_{;10}.mp4`, 212x236, 432 frames at 60 fps, 7.2 seconds) shows Noivern BREAK and was reviewed across its full duration. SHA-256: `9198b84662da4042764c4bfdcebfd3b16add9174b20597ea936b58b37365ca55`. This makes the distinction between square tile boundaries and rotating triangular reflections particularly clear. The initial diagonal-cell implementation has been replaced.

There are 16.4 squares per card height, approximately 5.4 mm per side. Each tile carries a fan grating with alternating handedness and a radial spacing chirp. The Fourier moments of its optical orientation are prepared on the CPU through the existing worker pipeline, then uploaded through the existing GPU realization/cache system. The chirp separates wavelengths inside the lit sector using the existing diffraction spectrum. The primary shader kernel is shared by the viewer and instanced gallery.

This is an empirical optical model of the footage, not a measured reconstruction of its microscopic die. The laminate stays flat: facet tilt, reflection coupling, normal variance, engraving, relief and emboss are zero. There is no time-driven sparkle or CPU animation. The existing manufactured-field texture pair is reused; its RGB relief channels are flat and alpha holds optical spacing data. Pixel derivatives, mipmaps and finite emitter footprints filter the optical response.

## Exact printing assets

Nidoking uses `xy12_46`, variant `NidokingBREAK_xy12_46_std_BreakRare_Squares_Holo`. Its source bundle is `https://cdn.studio-prod.pokemon.com/rainier/Content/StandaloneWindows64/1.43.0/10101_0000/xy12_en_046`. Untouched extracted originals and source evidence remain in the TCGL research archive and each printing's public asset folder.

- Original front: 1024x1024; SHA-256 `fb301cd1d71c59a2a85de20f48654a0f811922faa5763f109dd4d9b1f9c8ad6a`.
- Original foil: 512x512; SHA-256 `b4c7015d83a4a4aa02d9e88d9f65dadcf6026d753ac81ae9168b6c9da528ec09`.
- The complete registered card UV domain spans source X 145/1024 through 878/1024 and all source Y. Bilinear resampling produces 733x1024 PNG maps, without a vertical flip or artwork-only offset. The existing clean TCGL front stays unchanged.
- All 35 exact BREAK entries declare etch not applicable. No etched relief, normal map or height map has been fabricated.

Each printing uses its own original whiteplate, retained continuously as both coverage and original foil controls. Gold metal coverage selects yellow/gold chroma inside inverse whiteplate coverage and preserves the original front as conductor color. It excludes neutral text and green electricity. This is an approximate metal-ink classification, never a height or normal. Roughness is authored by material region (foil 0.28, gold 0.29, other print 0.48), not image brightness. The BREAK definition disables paper microrelief on its printed laminate. Its underlying whiteplate-covered metal is reflective silver (linear RGB 0.62/0.65/0.68, print retention 0.06), with no substrate darkening. This preserves a shiny silver backing behind the colored sectors, as explicitly corrected by the user; the unlit part of a tile is not painted black. Original electricity, borders and typography remain in the clean front.

`docs/pokemon-break-printings.json` lists the acquired variants: BREAKthrough 6, BREAKpoint 5, Fates Collide 5, Steam Siege 7, Evolutions 4 and XY Black Star Promos 8. Each printing has its own `break-evidence.json` with source identities, registration, dimensions and hashes for all registered maps. `scripts/tcgl/prepare_break.py` reapplies these registrations after import without authoring etches.

## Validation and remaining uncertainty

The completed WebGPU run visited all 35 gallery printings and seven viewer representatives, with 25 tilt frames, 32 fixed-card light-orbit frames, exact static-pose repeatability and no browser errors. Steady texture counts stayed at 55 for BREAK and 57 for the Sheen control. Both median frame intervals were 5.6 ms; p95 was 6.9 ms for BREAK and 8.2 ms for the control in this run. See `docs/pokemon-break-validation.json`. These timings are indicative desktop checks, not a dedicated GPU benchmark.

Run `node --experimental-strip-types --test tests/break.test.ts`, `node node_modules/typescript/bin/tsc --noEmit`, and `node scripts/break-live-check.mjs` with a running local server. `HOLO_URL` can select an isolated review server. The live script writes screenshots, fixed-light card tilt frames, a fixed-card orbiting-light sequence, representative printing captures, gallery captures and its report under ignored `artifacts/break/`. Reference contact sheets remain under ignored `research/break/review/`.

Live review includes Studio, Strip, Low key, Holo skim, custom reference lighting, moving light, card tilt and gallery hover. The orbiting-light sequence keeps card/camera geometry fixed to isolate internal sector rotation. Returning to an identical light/pose must return identical pixels. Repeated tilt frames must change; steady rendering must keep GPU texture counts stable. Viewer representatives include Nidoking, Zoroark, Noivern, Greninja, Delphox, Xerneas and Ho-Oh. Gallery traversal checks the 35 BREAK printings without preloading them as full single-card GPU materials.

The footage does not supply calibrated camera poses, emitter dimensions, exposure or a measured grating period/BRDF. Tile size, grating chirp and fan handedness remain estimates. The final rainbow strength is explicitly user requested and intentionally stronger than the original Nidoking clip. Other printings retain exact TCGL material coverage, but most lack matching physical footage. Gold chroma coverage is approximate; the source whiteplate remains the foil authority. The shared shader/model change applies only to BREAK. Existing Sheen, Cosmos, Evolutions Starlight and Generations Radiant Collection optics were not altered by this work.
