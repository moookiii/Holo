# Exact-card etching authoring

`etched_maps.py` compiles **individually traced ridges**, in registered print
coordinates, into the existing renderer's six map channels. It does not yet
ship a finished Prismatic etched card. The current photographs still leave
unresolved regions; those cards remain unavailable to the renderer.

The inputs are a JSON trace document plus separate authored grayscale PNGs for
foil coverage, print protection, and surface-region labels. Photographs and card
fronts are evidence, never numeric height inputs. A label of zero means outside
the reviewed surface and may not contain foil. Every other label must have a
named `smooth` or `etched` region, with its own roughness and photo observations.
Smooth regions must contain no lines. Foil coverage and relief placement are
independent: changing opaque ink cannot emboss the ink's silhouette.

Before export, `references.json` must mark the exact printing evidence-complete,
and the trace document must mark its individual linework reviewed. Each region
needs at least two complementary exact-printing photographs, including their
SHA-256 hashes and observations. Each traced line cites at least two of those
photos. Duplicate image bytes, a different printing, identity-only pictures,
changed references and unresolved regions fail validation. These checks do not
replace visual review: verify all edges, character, background, framing, text
surroundings, transitions and deliberately smooth areas before marking complete.

Trace document fields:

- `version: 1`, `cardId`, `variant`, `lineworkReviewed`.
- `coordinates: [600, 825]` for the unmodified TCGdex print-master coordinate grid.
- `mapSize: [width, height]` and `dimensionsCm: [6.3, 8.8]`.
- `heightRangeMicrons` and `depthCalibration`: calibrated rendering depth and its
  uncertainty. A photo does not establish a measured physical depth or optical pitch.
- `inputs`: relative paths for `foil`, `protection`, `regions`; all three must be
  registered, 8-bit grayscale PNGs at `mapSize`.
- `regions`: unique byte `label`, `name`, `kind`, `roughness`, `evidence`, and
  `lines` for etched regions. An evidence item contains `photo`, `sha256`, `observed`.
- Each line has explicit `points: [[x, y], ...]`, `halfWidthMicrons`,
  `ridgeMicrons`, `valleyMicrons`, `relativeGratingPeriod`, and `photos`.
  Relative optical pitch 1 encodes as blue 85. This optical pitch is independent
  of the much larger visible ridge spacing; never confuse the two.

There is no procedural continuation, line repetition, uniform noise, crackle or
automatic texture inference. Each finite polyline has a compact rounded ridge
and recessed flanks. Untraced space stays flat. Trace real region transitions;
do not extend lines through obscured portions merely to make an export possible.

Run `python scripts/prismatic/etched_maps.py path/to/traces.json path/to/output`.
The output includes foil, protection, height, normal, direction and roughness
PNGs plus an evidence/hash manifest. Export alone does not register the card.

Normals use centimetre-scaled surface derivatives with OpenGL +Y up. Direction
RG uses the existing double-angle, unoriented grating convention; the grating
momentum axis is perpendicular to the traced ridge. Direction alpha marks only
authored line footprints, leaving untraced areas without invented diffraction.
Height is encoded as `0.5 + heightMicrons / (2 * heightRangeMicrons)`.

For a future reviewed profile, use the existing `plain` field with no procedural
engraving, pattern relief, facet override, or glints. Set `normalScale: 1`,
`embossStrength: 0`, and `roughnessMode: 'absolute'`: the supplied normal already
contains the full relief, so also differentiating the height in the shader would
count it twice. Silver highlights and foil diffraction then follow the same
authored normal through `HolographicMaterial`'s existing tangent-plane projection.
Visually compare multiple rendered tilts with the photographs before registering
the exact printing in `PrismaticSurfaces.ts` or exposing it in packs/the picker.

Run the synthetic geometry checks with
`python -m unittest discover -s scripts/prismatic -p test_etched_maps.py`.
These fixtures validate physical scale, ridge/valley normals, coordinate signs,
finite trace extents and evidence gating. They are not Pokémon maps or evidence.
