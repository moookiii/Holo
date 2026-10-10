# Sword & Shield material proofs

This is a material workbench, not set integration. Proof cards use exact downloaded
TCGL printings; originals remain in `research/tcgl/<id>/`, with source URLs,
variant IDs, dimensions and SHA-256 evidence also shipped beside each proof.

| Finish | Profile | Extracted proof | State |
| --- | --- | --- | --- |
| Standard reverse | `swsh-reverse-energy` | Grookey 010/202, `swsh1_10_ph` | Implemented; live reviewed; physical calibration provisional |
| Radiant Rare | `swsh-radiant` | Radiant Greninja 046/189, `swsh10_46` | Implemented; live reviewed; provisional angular calibration |
| Amazing Rare | `swsh-amazing` | Raikou 050/185, `swsh4_50` | Implemented; live reviewed; provisional micrograin calibration |
| Shiny Vault | `swsh-shiny-silver` | Suicune SV022/SV122, `swsh4-5_95` | Implemented; live reviewed; provisional grain intensity |
| Textured V | `swsh-textured` | Beedrill V 161/189, `swsh10_161` | Live proof; provisional line contrast |
| Textured VMAX | `swsh-textured` | Pikachu VMAX 044/185, `swsh4_44` | Live proof; stronger references needed |
| Textured VSTAR | `swsh-textured` | Arceus VSTAR 123/172, `swsh9_123` | Live proof; provisional intensity |
| Celebrations regular | `swsh-celebrations-silver` | Mew 011/025, `swsh7-5_11` | Live proof; stronger moving-light reference needed |
| Celebrations Classic | `swsh-celebrations-classic` | Charizard 4/102, `swsh7-5r_2` | Incomplete full-card protection and confetti balance |
| Black-and-gold TG | Existing `gold-etched` | Mew VMAX TG30/TG30, `swsh11a_30` | Live proof; provisional grain/line balance |

Find these cards in the gallery under their actual set names, sorted chronologically.
Only these representative printings are included, not the full SWSH catalogs.
All profiles remain development/provisional. Asset availability and a successful
render do not establish final physical fidelity.

## Reverse

Reuses the existing neutral metallic substrate. The exact TCGL grayscale foil
plate contains the Energy symbols and chevrons, including their varying silver
coverage. No generated symbol field, spectral sheen, sparkle or relief is used.
Coverage-dependent roughness keeps the pattern visible as the reflection moves.

Physical reference inspected: [FusionPokemon1, Sword and Shield — Holo and Reverse](https://www.youtube.com/shorts/_lUzLOVjXsQ),
reverse reveal near 43 seconds. This supports restrained, ink-filtered silver,
but is a dark-type card and does not establish an exact reflectance for Grookey.
Calibration remains provisional until a sharp moving-light grass reverse is
compared. The implementation is ready for additional exact reverse plates.

Live proof: `swsh-proof:reverse`. Reviewed Studio left/right, Strip specular and
grazing, Low key, two Moving light phases and a 13-frame pose sweep.
Captures and reports: `artifacts/swsh-materials/live/reverse-*`.
Energy cells remain registered; artwork/border remain outside foil; no runtime
errors in this proof. The strong Studio reflection can reduce text contrast,
which needs checking against a closer physical reference before curated status.

## Source registration and relief

Unity source textures contain extended side bleed. The normalized crop is
`[145/1024, 0, 878/1024, 1]`, independently corroborated for each front against
its 733×1024 rectangular TCGL export (mean decoded RGB difference below 0.31/255).
The same domain is used for foil and etch. There is no extra vertical flip.
The extraction's raw PNGs remain untouched.

`scripts/tcgl/prepare_swsh_proofs.py` prepares the small explicit proof list.
Etched proofs use the reference offline mean-RGB inversion, bilinear resize to
1800×2475, Scharr derivatives before protection, gain 1.03, normalized OpenGL +Y,
opaque RGB normals. No active height emboss or synthesized grooves.
Physical groove depth is not measured. Detailed per-finish review follows as
each proof is activated; prepared files alone are not completed materials.

Run a proof: `REVIEW_FINISHES=reverse node scripts/swsh-material-review.mjs`
(set the environment variable using the syntax of your shell).

## Amazing Rare

Physical moving-card references inspected: [Card Spinner Raikou](https://www.youtube.com/shorts/278RVuesjwQ) and [Single Pack Hunter close-up](https://www.youtube.com/shorts/QvnLRaHzbw8). The close-up resolves dense silver grain inside the rainbow splash and energy icons, with a quieter printed subject. These are distinct physical samples; capture files are under `research/swsh-materials/physical/raikou-*`.

Uses the exact Raikou front, foil plate and etch. Reuses authored-normal diffraction and the existing filtered metallic-grain response, with grain confined to the exact foil plate. No painted spectral overlay, new splash geometry or procedural relief. The normal conversion/gain remains the required reference method. The micrograin is a statistical optical approximation, not an extracted layout of individual physical grains.

Proof `swsh-proof:amazing`: the same eight light/pose states and 13-frame motion sweep, with no runtime errors. Reviewed the splash extension below the art window, subject silhouette, energy icons and text. Physical videos show a more granular finish than the TCGL die alone; the separate restrained grain response addresses this. Exact grain intensity and groove depth remain provisional.

## Radiant Rare

Physical footage inspected: [TrainerDesignFly](https://www.youtube.com/shorts/1oKZNXT2X1A), [InfernosGames miscut sample](https://www.youtube.com/shorts/-vYSKhDbFG8), and [PokeMart92](https://www.youtube.com/shorts/SE8p0HA1e9M). The first clearly shows a broad silver/blue diamond response across the lower card changing under tilt; the miscut sample is useful for character texture but not alignment. The subject flashes independently of the printed scene.

New work: `RadiantFoilLayer.ts`, a filtered two-axis neutral/spectral response driven by original TCGL `_CrossTexture` RG stock. The offline optical-stock rotation follows the visible diagonal pattern; it does not rotate or change the etched character. Viewer and gallery share this kernel. The exact TCGL plate separates lower foil from the character at the unfoiled rule strip; energy symbols stay excluded. Existing offline normal converter and etched material response are reused for the character.

Proof `swsh-proof:radiant` reviewed in all eight states and the motion sweep. No runtime errors. Initial square-aligned highlights were rejected in favor of diagonal stock registration. The coarse reference video cannot establish the exact inclination distribution or grating period: the observed crossed behavior is reproduced, while quantitative angular calibration remains provisional. No relief is generated from the crossed stock.

## Shiny Vault

Inspected moving Suicune copies from [PhenomenalByChoice](https://www.youtube.com/shorts/3haH5nJoxic) and [warrior3456](https://www.youtube.com/shorts/XPMTFVvos3Y). Silver picture background changes from dark to bright under tilt; fine etched zigzags and restrained spectral flashes remain separate from the opaque blue rules area. The second unsleeved sample confirms that silver response is not sleeve glare.

Reuses the exact authored-normal system with a silver-biased variant and filtered metallic grain. No new geometry generator. Proof `swsh-proof:shiny` uses Suicune's own front/foil/etch and passed eight light states plus 13 motion frames without runtime errors. Front and oblique renders preserve zigzag registration and the unfoiled lower area. Grain intensity and physical groove depth remain provisional. Captures: `artifacts/swsh-materials/live/shiny-*` and `research/swsh-materials/physical/suicune-*`.

## Textured V

`swsh-textured` is an explicit reusable SWSH authored-normal profile. Beedrill V 161/189 (`swsh-proof:v`) binds its exact TCGL front, whiteplate and converted etch. It uses the required Espeon/Sylveon response, without their geometry, secondary regions or modern star effects. No separate optical model was justified.

Inspected [Pokemon Holo](https://www.youtube.com/watch?v=TaEwujwyLNg) and [tande_rips](https://www.youtube.com/shorts/l9cdkRhyKxQ) physical Beedrill footage. Silver border and restrained rainbow over the flowers support this family, but diffuse footage does not resolve groove depth. Live eight-state/13-frame review has no runtime errors; the exact sky, wing and flower etches align. Strip lighting shows stronger line contrast than the diffuse physical video. Keep calibration provisional rather than changing the mandated normal gain based on unmatched lighting.

## Textured VMAX

Pikachu VMAX 044/185 (`swsh-proof:vmax`) reuses `swsh-textured` with its own curved body/background etch. Eight light states and 13 motion frames passed with no runtime errors; body rings, top clouds and printed rules remain registered. No new shader is warranted from current evidence.

References inspected: [Pokemon Holo](https://www.youtube.com/watch?v=aMD7TXd3CTM) shows diagonal spectral bands but does not resolve texture; [Poke Scope seller review](https://www.youtube.com/watch?v=EZ-mWAQkSBY) shows angular blue/gold flashes in a close-up, but focus is weak. Do not treat the first clip's smooth appearance as proof that etching should be removed. Exact line contrast and grating direction remain reference-pending; the live asset proof is implemented, not a claim of final physical fidelity.

## Textured VSTAR

Arceus VSTAR 123/172 (`swsh-proof:vstar`) uses the same `swsh-textured` response with its own etch and opaque exclusions. [MonstersUpClose](https://www.youtube.com/shorts/uIBv-j0UhOc) shows rotating spectral flashes; [SmokeysPokemonCards](https://www.youtube.com/shorts/8HcYsoozo5c) resolves a quieter body and reflective etched background. Sleeves/display lighting limit quantitative comparison.

Live eight-state/13-frame proof passed without runtime errors. Reviewed background arcs, quiet subject, name plate and VSTAR Power rules. The exact assets supply the visibly different VSTAR treatment without another redundant shader. Angular intensity remains provisional; normal conversion and the mandated finish response are unchanged.

## Celebrations regular

Mew 011/025 (`swsh-proof:celebrations`) uses `swsh-celebrations-silver`, a restrained smooth-metal variant of the existing substrate. Its exact whiteplate protects Mew, rules and the anniversary logo; printed stars remain printed. No etch exists for this printing and none is synthesized.

Inspected [bitofeverything-7039](https://www.youtube.com/shorts/v3R0Sk-ff10) and [PokemonBloopers](https://www.youtube.com/shorts/hutg6XvmXqY). Both show the picture-window treatment, but their limited light movement is insufficient for final angular calibration. Therefore this is a provisional silver profile, not a measured claim that spectral response is absent from all regular Celebrations cards. Eight live light states and 13 motion frames passed without errors; subject/tail gaps and logo boundaries were reviewed. A stronger moving-light reference is still needed before curated status.

## Celebrations Classic Collection

Charizard 4/102 (`swsh-proof:classic`) now binds exact front/foil/etch plus the original TCGL `MAT_Cards3D_Celebrations._TexDots` stock (`FX_T_Celeb_Confetti`). The offline adapter retains motif shapes and maps color labels to optical axes for the existing `celebration-classic` kernel. No random dots, new optical kernel or synthetic relief. Stock evidence records source/bundle/output hashes and the aspect crop. The hue-to-axis interpretation and stock scale are provisional.

Physical footage inspected: [craigioontheradio](https://www.youtube.com/shorts/1zm3cl8HIAo) and [trainerdesignfly](https://www.youtube.com/shorts/WuxlPW_rfg4) show strong granular/confetti reflection in the picture background and quieter print. Eight light states plus 13 motion frames now render without errors after fixing an omitted secondary laminate-roughness value.

**Incomplete:** the current whiteplate-based normal protection removes authentic full-card etch outside the foil window. Exact etch contains those regions, but an independently reviewed print-protection PNG is still required to restore them safely. The current render also emphasizes background ridges more than the physical confetti. This is an operational exact-asset proof, not a finished Classic calibration. Do not promote it to curated or use it as proof of full-card frosting.

## Black-and-gold Trainer Gallery

Mew VMAX TG30/TG30 (`swsh-proof:black-gold`, Lost Origin) reuses `gold-etched`. [PokeTiny](https://www.youtube.com/shorts/l53KixZtP_M) and [kar_break1980](https://www.youtube.com/shorts/xXtlvVT37Hs) show dense gold scintillation with a quiet black field. This does not yet justify a separate optical model: the existing gold material already has authored-normal diffraction and filtered metal grain. The exact Mew masks and die provide its silhouette and line geometry.

Eight light states and 13 motion frames passed without errors. The black field stays quiet; the gold character and border reflect. Existing grain appears weaker and etched lines stronger than the slabbed references, so grain/line balance remains provisional. No unrelated gold profiles were changed to compensate for uncertain slab lighting.

### Amazing Rare correction from user comparison

The user's supplied Raikou photo (`research/swsh-materials/physical/raikou-user-reference.png`) exposes an error in the initial calibration: continuous bright die ridges overwhelmed the fine silver texture. The Amazing-only profile now reduces conventional substrate reflection to .16, etched-ink sheen to .10 and diffraction strength to .18, while using denser filtered silver grain (density .98, scale 800, strength 4.5). This changes the optical budget, not the exact front, etch, normal gain or foil boundaries. Other finishes are unchanged. The photo's overall exposure is darker than Studio; global scene lighting has not been altered to imitate its exposure. Final motion review remains required for quantitative matching.

The second supplied image is Japanese Raikou 015/076. It confirms strong discrete flashes can coexist with fine etched lines; it is supplementary optical evidence, not a replacement for the English printing's masks or etch. The revised English proof passed eight light states and 13 motion frames with no runtime errors, and TypeScript passed. Studio front now shows fine silver grain with less continuous white ridge reflection. Strip light still reveals the die. Matching the Japanese stock's exact grain placement or the photos' exposure is not claimed.
