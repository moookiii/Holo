# Sword & Shield material proofs

This is a material workbench, not set integration. Proof cards use exact downloaded
TCGL printings; originals remain in `research/tcgl/<id>/`, with source URLs,
variant IDs, dimensions and SHA-256 evidence also shipped beside each proof.

| Finish | Profile | Extracted proof | State |
| --- | --- | --- | --- |
| Standard reverse | `swsh-reverse-energy` | Grookey 010/202, `swsh1_10_ph` | Implemented; live reviewed; physical calibration provisional |

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
