# Pokémon Line and preserved Luminous Lines

The former Pokémon Line is preserved as **Original → Luminous Lines**
(`luminous-lines`). Its material parameters and the `vertical-line` generator
are unchanged. A golden hash test guards the original manufacturing bytes.

Pokémon **Line** retains `pokemon-vertical-line`, so existing card registrations
continue to select it. Its independent `pokemon-line` field groups fine vertical
rulings into coherent optical columns rather than sweeping along their length.
The horizontal grating axis selects rainbow bands across these columns; colors
remain calculated from light and view, not painted into a texture. Lower neutral
reflectance, zero sheen and zero added glints restrain the former bright wash.
The field is supported by profile export/import and card manifest validation.

Visual references: the user's Diancie 079/185 blister photograph and the
Dondozo/Armarouge photograph. The screenshots show the previous treatment.
This is an optical Line foil adjustment, not an etched-card normal conversion.
No card fronts, coverage/protection PNGs, etched normals, or other foil profiles
were changed. The original Diancie front contains bright printed rays and a
starburst; those remain in the artwork. Photo exposure and sleeves prevent an
exact radiometric match, and moving physical references would improve calibration.

Review captures are saved locally in `artifacts/line-holo-review/` (both profiles,
identical Diancie poses) and `artifacts/line-holo-final/` (final Line, lighting and
angle sweep). These generated artifacts are intentionally git-ignored.

Validation: `tests/line-holo.test.ts`, `tests/lab-state.test.ts` and
`tests/import.test.ts` (22 passing tests); TypeScript checking; live WebGPU review.
