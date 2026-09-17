# Pikachu VMAX — Vivid Voltage 188/185

## Identity and reference research

English Sword & Shield—Vivid Voltage, 2020, **188/185**, Rare Rainbow / Secret
Rare, illustrated by **aky CG Works**. 310 HP; G-Max Volt Tackle 120+; regulation
mark D. This is a real textured, full-card foil printing, not an invented finish.

References inspected on 2026-09-17:

- [PokémonTCG exact digital front](https://images.pokemontcg.io/swsh4/188_hires.png),
  734 × 1024: clean, straight-on print master used without pixel alteration.
  The source's rainbow artwork and graphic VMAX flourishes are printed design,
  not photographed glare. It contains no photographed etched texture.
- [Limitless exact card](https://limitlesstcg.com/cards/en/VIV/188) and its
  [736 × 1024 digital front](https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/tpci/VIV/VIV_188_R_EN.png):
  independent check of image, set, Rainbow Rare identity, artist and attack text.
  No additional image detail over the selected source.
- [PokémonTCG English set data](https://github.com/PokemonTCG/pokemon-tcg-data/blob/master/cards/en/swsh4.json):
  swsh4-188 is Rare Rainbow. swsh4-44 is the physical Rare Holo VMAX alternate;
  the alternate is not used in the final front or maps.
- [Physical card held in hand](https://www.ebay.co.uk/itm/336001692973),
  [full photograph](https://i.ebayimg.com/images/g/p8wAAeSwVB1oRLyK/s-l1600.jpg):
  low-light color, relatively quiet body and brighter granular background.
- [Physical card, near-front under strong light](https://www.ebay.com/itm/318521727878),
  [full photograph](https://i.ebayimg.com/images/g/x4MAAeSwgFhqQwiw/s-l1600.webp):
  dense fine silver scatter, curving body striae, separately defined cheeks,
  eyes, hands and silhouette. Its second photograph is the BACK, not an angle
  reference, and is not used as one.
- [One physical card at multiple oblique angles](https://www.ebay.com/itm/255311777096),
  [angle A](https://i.ebayimg.com/images/g/m~YAAOSwOrBhyTl0/s-l1600.jpg),
  [angle B](https://i.ebayimg.com/images/g/xDIAAOSwLhthyTlt/s-l1600.jpg):
  diagonal/curving close-set body grooves, granular background and reflected
  silver/color that changes while the underlying artwork remains registered.
  Text stays crisp even as the surrounding foil brightens.

Seller pictures are visual references, not certified measurements. Agreement
across the catalog and three physical specimens is used rather than relying on
one listing's labels. Pokémon's card detail page was blocked by its browser
security check; no claim here relies on reading that page.

## Existing architecture

- `CardDefinition.ts` is the normal built-in catalog. `CardFactory` uses the same
  `CardInstance` and closed `CardGeometry` for the viewer and packs.
- Pokémon uses `DIMENSIONS.standard`: 6.3 × 8.8 cm, 0.032 cm stock,
  0.3 cm corners, 0.007 cm bevel; `/cards/pokemon/back.jpg` supplies its back.
- `AssetManager` loads print in sRGB and material maps in NoColorSpace, with
  mipmaps and anisotropic filtering. `CardMapLoader` packs foil/protection,
  height/roughness/sparkle and pattern/laminate channels in a worker at authored
  resolution. Direction and OpenGL tangent-space normal maps remain separate.
- `HolographicMaterial` is a Three WebGPU physical node material. Diffraction
  evaluates incident/view momentum against an object-attached grating axis and
  wavelength bands; it also integrates rectangular light footprints. Height and
  normal maps affect the physical surface; roughness controls the specular lobe.
- Profiles configure that material. A plain manufacturing field can use authored
  direction and normals without generating a generic procedural foil atlas.
- The importer already accepts all required channels. No separate rendering
  path, new geometry, screen-space rainbow, animated texture or additive sprite
  layer is needed.

## Reconstruction contract

Keep the exact 188/185 print. Author the silhouette, eyes, cheeks, ears, mouth,
hands and lightning boundaries in source-image coordinates. Use closely spaced
flowing body ridges, distinct cheek/ear/hand directions, shallow contour relief,
and fine interrupted background etching. Derive normals and grating axes from
those physical fields. Fine seeded irregularity may break up the machining but
must not replace its registered structure. Protect actual ink and its white
outlines, not rectangular chunks of background around the text.

All photographs stay reference-only. Normal, height, roughness, direction and
coverage data contain no colored light or baked reflection. Groove spacing,
depth and optical coefficients are visual estimates; these photographs do not
provide measured profilometry or a calibrated light rig.
