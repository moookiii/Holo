# Registered Base Set, Jungle and Fossil stars

All sixteen Base Set, sixteen Jungle and fifteen Fossil holo fronts have separate 1200 × 1650
grayscale PNG star maps. `scripts/wotc/star-placements.json` records each center
and horizontal/vertical radius in the clean front's 600 × 825 coordinates.
`python scripts/wotc/create-star-maps.py` rebuilds them and writes review overlays
under `artifacts/star-registration`. Optional card IDs limit regeneration.

The maps use the narrow eight-ray Base Set motif, individually positioned and
sized against the printed stars. Faint and partially obscured edge stars are
included; existing foil and protection masks clip their hidden portions. The
maps contain no color, lighting, relief, or inferred height. Optical inclinations
remain the existing shader's deterministic approximation, not measured relief.

`maps.motif` supplies the PNG to the existing `base-set-star` manufacturing
worker. For this field it is a full-front registration, not a repeated tile.
Each connected star has one seeded optical orientation across all its rays.
These fronts use no additional random star placements. The horizontal grain,
material profile, original fronts, and existing cutout maps are preserved.

Both the viewer and CPU pack preparation load the same map. The existing field
cache keys include the motif identity. Registration is baked into the existing
direction/optical-normal textures; no additional GPU sampler or per-frame work
is introduced. Depth remains flat.

Validation:

- `tests/wotc-stars.test.ts`: 47 unique PNGs, exact-print pack reuse, Electrode's
  eight stars, Jolteon's two faint left-side stars, connected ray identity.
- `scripts/wotc-star-check.mjs`: all authored centers receive optical amplitude,
  no scattered stars outside the maps, flat depth, and live reflections at all
  eight Electrode stars under four lighting presets.
- Base Set, Jungle and Fossil browser checks: all 47 holos, front/left/right poses and
  stationary optical response. Base Set's browser test serves the bundled
  pixel-identical Charizard front to avoid dependence on remote CORS headers.

The source scans still contain photographed highlights. This change registers
live reflections to them; it does not remove baked lighting from the scans.
