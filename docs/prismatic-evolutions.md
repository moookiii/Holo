# Prismatic Evolutions — implementation status

This is an **incomplete surface implementation**, with a complete local retail
catalog and registered pack recipe. The pack browser lists the set and explicitly
keeps opening unavailable until the in-scope foil surfaces are finished. There
are currently **10 of 268 authored foil printings** registered: Leafeon 005,
Flareon 013, Vaporeon 022 and Umbreon 059 regular holos, and all six ACE SPEC cards.
The etched/ball/premium surface pass is still outstanding.

## Catalog and pack integration

The 180 numbered English cards and their unmodified print fronts come from
[TCGdex](https://api.tcgdex.net/v2/en/sets/sv08.5). The source snapshot and per-file
SHA-256 records are in `public/cards/pokemon/prismatic-evolutions/`. Rebuild with
`node scripts/prismatic/fetch-catalog.mjs`; `--refresh` refreshes source metadata.

| Retail group | Base cards | Extra printings | Surface status |
| --- | ---: | ---: | --- |
| Common | 46 | — | Nonfoil front ready; pack only |
| Uncommon | 33 | — | Nonfoil front ready; pack only |
| Rare | 21 | — | 005, 013, 022 and 059 authored; 17 picture/border masks pending |
| Double Rare ex | 25 | — | Exact ex/Tera foil regions pending |
| ACE SPEC | 6 | — | Individual object, internal foil-window and text masks authored |
| Ultra Rare full-art Trainers | 12 | — | Photo evidence and authored relief pending |
| Special Illustration Rare | 32 | — | Photo evidence and authored relief pending |
| Hyper Rare gold | 5 | — | Photo evidence and authored relief pending |
| Poké Ball reverse | — | 100 | Distinct printing; exact surfaces pending |
| Master Ball reverse | — | 67 | Pokémon only; exact surfaces pending |

The in-scope total is 347 printings: 79 nonfoil and 268 foil. The latter include
216 textured printings. No Illustration Rare, Rainbow Rare, Master Ball Trainer,
ball-pattern ex, ball-pattern ACE SPEC, stamped promo or Cosmos reprint is added.

`PrismaticRecipe.ts` models 4 commons, 3 uncommons, the first reverse/replacement
slot, the second reverse/replacement slot, the rare slot and 1 Basic Energy.
The pool includes all 180 set cards plus the eight matching Basic Energy cards.
The [TCGplayer sample](https://www.tcgplayer.com/content/article/Pok%C3%A9mon-TCG-Prismatic-Evolutions-Pull-Rates/d94889ea-f76a-4a13-b74d-5b0b071220a7/?source=syndication)
supplies empirical marginal rates, not official factory odds. Uniform cards
within each pool and independent replacement slots are explicit assumptions.
Undocumented God/Demigod event rates are not invented. Incomplete checklists fail
before collation; missing material assets must never change the selected pulls.

All four real wrapper fronts and the set logo are local; asset provenance is
in `public/packs/pokemon/sv08.5-sources.json`. Fronts retain full source dimensions
and transparency through lossless WebP conversion.

The full catalog is not inserted in the picker. Prismatic nonfoil pulls and
deferred standard reverses are hidden there while remaining inspectable by pack
identity. Only exact authored foil entries enter the picker through
`prismaticPickerCards()`; currently those are the four authored regular holos and
the six ACE SPEC cards.

## Standard reverse remains deferred

100 ordinary set-card reverses plus eight Basic Energy reverses retain their real
identities and slot probabilities. Their material is deliberately print-only
with `treatmentStatus: 'deferred'` and an explicit `foil pending` description.
No standard-SV-reverse mask or effect has been implemented. This dormant route
does not authorize previewing other incomplete foil printings: those throw
`PrismaticSurfaceUnavailable`, and the full pack remains unavailable.

## Exact surface contract

`prismatic_regular_holo` is implemented using the existing horizontal optical
sheet, restrained diffraction, zero glints and zero relief. Umbreon 059 has an
individual subject/background/rim mask plus opaque footer protection. The
evolution portrait, framing and rules are excluded. Still-photo reconstruction
does not claim measured optical constants; moving-reference calibration remains
pending. Its source/region manifest is `maps/059-holo-evidence.json`.
Leafeon 005, Flareon 013 and Vaporeon 022 each have separate subject contours;
Leafeon's printed flower petals are protected, Flareon's foreground flames have
their own foil openings, and Vaporeon's overlapping bubbles transmit the sheet.
Their source/region manifests accompany the maps. Rebuild these three with
`python scripts/prismatic/create-regular-maps.py`; the photographed stage-one
frame is shared, while each silhouette is authored in `regular-regions.json`.

`prismatic_ace_spec` uses the existing horizontal diamond optical sheet with
zero raised relief and zero sparkle glints. Separate maps for Max Rod 116,
Maximum Belt 117, Prime Catcher 119, Scoop Up Cyclone 128, Sparkling Crystal 129
and Treasure Tracker 131 preserve each opaque device/crystal silhouette. Exact
internal windows restore photographed foil in the displays, liquid vials,
transparent energy chambers and indicator lights. Vial straps, opaque hardware,
white rules/name lettering, carbon framing and the bottom rule panel are protected.
Sparkling Crystal has no added internal foil window: complementary flash and
diffuse photographs separate laminate glare from the surrounding diamond sheet.
Rebuild the 1200×1650 coverage/protection PNGs and hashed evidence manifests with
`python scripts/prismatic/create-ace-maps.py`. Paths are in
`scripts/prismatic/ace-regions.json`; they describe ink coverage, never relief.

`prismatic_fullart_texture` is now implemented as a Lab-only candidate, with
restrained foil under colored ink and no procedural texture/glints. Authored
normals supply all relief; authored directions follow that surface without
generic facet replacement. Optical constants remain calibration values, not
measurements. Atticus 133 has its own raster foil PNG, print-protection PNG and
eight-photo evidence manifest, including the user-provided directional photograph.
Skin, eye interior, fingertips, typography and the printed Supporter interior
are protected; the eyebrow and upper lashes have separate foil islands within
the face. Its etched clothing stays on the foil sheet. Full-art masks export
as antialiased 1200x1650 grayscale PNGs, without SVG assets.
These are **coverage-only assets**, not a completed textured printing: registration
still requires the exact height, normal, direction and roughness maps and visual
acceptance. Rebuild with `python scripts/prismatic/create-fullart-coverage.py`.
The local authoring view is `research/prismatic-evolutions/atticus-133-review.html`.
It compares the same print coordinates across seven registered photographs,
including the user's directional image. Move over the card to position the
detail view, then change the photograph. Rebuild those comparison assets with
`python scripts/prismatic/register-references.py 133`. The feature registration
uses printed landmarks, reports its residual error, and rejects weak fits.
These resampled photographs stay in `research/registered`; they never become
renderer maps or proof of complete etching. Original source files stay unchanged.

`PrismaticCatalog.ts` also names these **pending renderer profiles**:

- `prismatic_ex_holo`
- `prismatic_pokeball_reverse`, `prismatic_masterball_reverse`
- `prismatic_sir_texture`, `prismatic_gold`

`PrismaticSurfaces.ts` resolves by card ID and printing. Generic era/rarity
fallbacks cannot silently substitute Mirage or Rainbow Rare. Each ready entry
must carry its exact coverage, print protection, layout and evidence manifest;
textured entries also require height, normal, direction and roughness maps.
The normal existing card renderer/CPU map pipeline will consume those assets.
No random relief or generic etching is added.

`scripts/prismatic/etched_maps.py` now compiles explicit, individually traced
ridges into registered height, normal, direction and roughness maps alongside
foil/print masks. Export requires complete exact-printing evidence, complementary
photo hashes per region and corroborating photos per line. The compiler never
extracts height from art pixels, repeats a synthetic line pattern, or fills gaps.
Its synthetic geometry tests cover physical scale, signs, finite trace extents,
print/relief separation and evidence gating. See
`scripts/prismatic/ETCHING.md` for the authoring contract. No incomplete etched
printing is enabled by this tooling; exact-card tracing and visual review remain.

## Physical photo review

`research/prismatic-evolutions/references.json` records the inspected eBay
images, exact print identities, assessments and outstanding coverage. Generate
the hashed inventory and all 216 textured-printing work items with:

```
python scripts/prismatic/audit-references.py
```

Observed physical evidence, not a claim of complete reconstruction:

- Umbreon 059 Master Ball: [specimen A](https://www.ebay.com/itm/168712769565)
  provides two strong directional fronts;
  [specimen B](https://www.ebay.com/itm/178517146349) adds a full front and four
  corner close-ups. Curved fine engraving crosses the art and Pokémon; the
  lower face has a large Master Ball and directional facets. Printed framing
  and glyphs need separate protection. It is not an inverse-art-window mask.
- Umbreon 059 Poké Ball: [two useful angles](https://www.ebay.com/itm/128093282037)
  show a large ball and faceted lower field; another
  [physical front](https://www.ebay.com/itm/267128231876) exposes upper lines.
  The smooth-looking photo from [this listing](https://www.ebay.com/itm/158322937311)
  does not confirm the motif and cannot establish a smooth surface.
- Amarys 132: [detailed front](https://www.ebay.com/itm/206564829195) and
  [physical specimen](https://www.ebay.com/itm/177305439260) reveal some flowing
  lines, but the second image has insufficient card pixels for reconstruction.
  Two stronger raking-light fronts from [this specimen](https://www.ebay.com/itm/257583806646)
  and [this complementary view](https://www.ebay.com/itm/257590740464) resolve
  much more of the sky, cliffs, uniform and hair. Fine skin/hand response and
  shadowed lower regions still require confirmation before complete tracing.
- Amarys 170: [full front](https://www.ebay.com/itm/198494110771) gives partial
  SIR evidence; it cannot supply missing structure for Amarys 132 or other SIRs.
- Umbreon 161: [full front and corner photographs](https://www.ebay.com/itm/407237468690)
  resolve some edge engraving but leave the center inadequately lit. Grading-app
  screenshots and card-back photographs are explicitly rejected as relief evidence.
- Pikachu 179: the [slab photograph](https://www.ebay.com/p/7074376153) reveals
  gold-border lines but needs complementary illumination without slab glare.

No image here establishes physical authenticity by itself. Listing titles,
automated gallery descriptions and app grading claims are not treated as proof.
Each photo was visually inspected. No uploaded photo pixels, glare or printed
illustration contours have been converted into guessed height maps.

Remaining work: finish exact-card multi-angle evidence, author the remaining 258 foil
surfaces (including 216 textured printings), calibrate the distinct profiles,
compare rendered tilts against references, and then enable pack opening.
