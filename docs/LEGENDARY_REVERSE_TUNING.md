# Legendary Collection reverse foil tuning

The supplied Eevee photographs (two light angles), Dark Dragonite, and Gengar
show overlapping fireworks made from small interrupted cuts, with fine texture
between the readable radial groups. The brighter Eevee view guided the silver
baseline; the darker views guided fragment contrast and retained spectral flashes.
Spacing and facet inclinations remain estimates from photographs, not measured
relief or a calibrated moving-light match. The profile remains reference-pending.

## Implementation

- Keep `pokemon-legendary-reverse` and `legendary-fireworks`. No set integration,
  card definitions, coverage masks, or shared shader changes.
- Increase burst-center frequency from 4.7 to 6.8 per card height (about twice as
  many centers per area), and extend the overlapping envelope. Shorter fragments,
  lateral offsets, and per-fragment inclination variation interrupt tidy spokes.
- Fill the gaps with a finer staggered cut layer. All channels remain manufacturing
  data: direction, pitch, amplitude, and optical inclination. Height remains flat;
  no colors or lighting are baked into the maps.
- Raise neutral reflectance from .08 to .20; add restrained .10 sheen. Reduce
  diffraction strength from 2.8 to 1.35 and secondary order from .12 to .07.
  Roughness .31 with a -.055 cut adjustment balances the sheet and fragment lobe.
  Disable procedural engraving and extra random glints. Keep facet coupling and
  reflection coupling so fixed cuts respond to light and card motion.

## Validation

`tests/pokemon-patterns.test.ts` passes, including physical aspect-ratio scale,
deterministic manufacture, dense coverage, and absence of raised relief.

The existing reverse browser checker exercises front, left, right, diagonal,
edge, and mobile views, Studio/Strip lighting, temporal stability, and a return
to the original pose. Eevee passed its optical assertions in WebGPU and WebGL:
artwork coverage is zero, the border remains foil, body foil is retained, and
disabling diffraction changes no artwork pixels. Stationary and returned-pose
renders match. Captures are in ignored `artifacts/lc-verified/`; the original
WebGPU captures are in `artifacts/lc-before/`.

In the matched front screenshot, body RGB mean increased from 86.75 to 97.20
(screen rectangle x=450..989, y=610..944). The protected artwork comparison has
at most one 8-bit code value of renderer variation. Visual inspection shows
denser interrupted fireworks within silver foil, with less prominent standalone
rosettes. Grazing/unlit angles can still appear dark, as in the physical photos.

At 2048 texture height with seed 2002074, the proportion of texels with cut
amplitude above 50/255 increased from 15.90% to 48.85%. Both maps together remain
24,018,944 bytes. Three interleaved local generation runs had median times of
3579 ms before and 2581 ms after; absolute timings depend on concurrent load.
Using a direct squared-distance square root avoids the previous `Math.hypot`
overhead in this bounded coordinate range. No additional GPU texture samples or
passes were introduced, and the extra procedural sparkle path is disabled.

A production build passed during tuning. A final build rerun was blocked by
concurrent, unrelated duplicate Legendary Collection imports on lines 6 and 7 of
`src/pokemon/TcgdexAdapter.ts`; those integration edits were left untouched.
