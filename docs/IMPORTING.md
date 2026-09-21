# Local card imports

Open **Card → Import card**. Imports remain in the current browser session. Images are read through local object URLs; no upload or modification of the selected files occurs. Use the × on an imported card to remove it from the session. Reloading also clears imports.

**Images** accepts a front, a back, metadata, a foil treatment and optional material maps. Print only is the default. A foil treatment covers the whole front when no coverage, secondary-foil, metallic or stamp mask is supplied. Supplying any of those masks switches to explicitly authored regions. A print-protection mask can exclude areas from otherwise whole-front foil.

**Card bundle** accepts one JSON manifest and its image files, either as a multiple-file selection or a folder. Folder selection preserves subfolders. All paths in the manifest are relative to its folder. Absolute paths, parent traversal and remote URLs are rejected. The original selected files can be kept as a reusable bundle.

## Manifest example

Smooth diffractive films may set `profileOverrides.structure.reflectionCoupling` between 0 and 1. It controls how much of the foil facet inclination also affects the aggregate metal reflection; the default is 1. Lower values preserve a smooth physical surface while the microstructure redirects spectrum. `facetTilt` remains the common slope control. Manufacturing scales up to 1200 support fine-grained sheets such as Mirage.

```json
{
  "version": 1,
  "title": "My card",
  "franchise": "Original",
  "set": "Studio study",
  "number": "01",
  "front": "front.png",
  "back": "back.png",
  "profile": "master-prism",
  "seed": 2026,
  "maps": {
    "foil": "maps/foil.png",
    "secondaryFoil": "maps/lettering.png",
    "stamp": "maps/stamp.png",
    "protection": "maps/printed-details.png",
    "roughness": "maps/roughness.png",
    "normal": "maps/normal.png"
  },
  "mapSettings": {
    "roughnessMode": "absolute",
    "normalScale": 0.6
  },
  "profileOverrides": {
    "diffraction": { "strength": 0.8 },
    "secondaryProfile": "aurora-silk",
    "secondary": { "surface": { "roughness": 0.25 } },
    "stampProfile": "crystal-shard",
    "stamp": { "diffraction": { "strength": 0.7 } }
  }
}
```

Franchise is `Original`, `Pokémon` or `Yu-Gi-Oh!`. The primary profile must match that franchise; `print-only` works with all three. A chosen profile's presence in the library does not establish reference accuracy or curation. See FOIL-INVENTORY.md for acceptance status.

Optional `dimensions` values are centimetres: `width`, `height`, `thickness`, `cornerRadius`, `bevel`. Omitted values use 6.3 × 8.8 cm for Original/Pokémon and 5.9 × 8.6 cm for Yu-Gi-Oh!, with the corresponding physical thickness, rounded corners and bevel. Invalid or impossible bevel dimensions are rejected.

Optional `backCrop: [left, top, right, bottom]` registers a photographed reverse using normalized 0–1 image coordinates. Omission uses the full image. The rectangle must have positive width and height; registration changes UV sampling without modifying the source asset.

`profileOverrides` accepts partial `diffraction`, `structure`, `glints` and `surface` settings. It may additionally choose and tune a `secondaryProfile`/`secondary` and `stampProfile`/`stamp`. These overrides apply only when the card's assigned primary profile is selected; they never mutate the shared library. Numeric ranges and supported fields are validated by `src/assets/CardImportManifest.ts`.

`diffraction.facetCoupling` (0–1) attaches the optical grating to the manufactured local facet plane. Tinsel uses 1 so its inclined horizontal bands have independent spectral and silver reflection. Existing profiles default to 0 to preserve their calibrated response. `surface.sheen` (0–2) adds a broad neutral reflection from the optical surface, independently of spectral color.

Optional `metallicInk` inside `profileOverrides` contains `roughness`, `metalness`, and optional linear RGB `color: [r, g, b]`. Optional top-level `substrate` contains linear RGB `color` and `printRetention` from 0 to 1, for deliberate reconstruction of foil areas in scans with baked lighting. It affects the primary foil mask only.

## Maps

### Solid metal collectibles

Bundles can declare `construction: { "kind": "metal", "frontReliefCm": 0.09, "backReliefCm": 0.04 }` and a separate `backMaps` object with the same map keys as `maps`. Use a non-diffractive metallic profile such as `minted-gold` (Pokémon). Both faces require `height` and `metallic`; authored `roughness` and `normal` are recommended. These maps register to the full physical die face. `backCrop` is not supported with metal construction.

`dimensions.thickness` is the base slab, excluding relief. Heights are additional centimetres: black is the slab face, white is the corresponding relief scale. Metal bundles accept thickness up to 0.8 cm and bevel up to 0.15 cm, still smaller than half the thickness and corner radius. Ordinary card limits stay unchanged. A dense closed mesh supplies real displacement on both sides; a supplied normal map replaces derivative emboss to avoid applying the relief slope twice.

Optional `profileOverrides.metallicInk.environmentIntensity` (0–3), `recess` (0–1) and `normalFiltering` (0–1) control reflected studio brightness, ambient cavity attenuation and specular anti-aliasing. Existing profiles retain their response when omitted. See [the Burger King Charizard reconstruction](burger-king-charizard.md) for reference provenance and measurement limits.

### Registered surface data

All maps register to the complete front image: same top, bottom and UV layout. Different resolutions are resampled into that layout. Map channels are data, without sRGB-to-linear conversion. Prefer PNG or another lossless source for material maps. Grayscale maps use their red channel; alpha is not a substitute for grayscale coverage.

Optional `layout` supplies `artwork` and `innerFrame` rectangles as normalized `[left, top, right, bottom]` arrays measured from the front's top left. Both rectangles must have positive area and artwork must fit inside the frame. Collector manufacturing fields use this registration to separate artwork engraving from the colored frame and outer border. `profileOverrides.surface.frameVarnish` (0–1) adds clear varnish to covered foil within the colored frame, excluding artwork and protected rules. The `satin` manufacturing field describes a continuous sheet with fine fixed surface grain, used by the SDK-inspired Blue-Eyes treatment.

| Map | Meaning |
| --- | --- |
| `coverage` | Packed RGBA: primary foil, secondary foil, metallic ink, laminate. |
| `surface` | Packed RGB: height, roughness, sparkle coverage. Source alpha is ignored. |
| `foil`, `secondaryFoil`, `metallic`, `laminate` | Individual grayscale maps override their respective packed coverage channels. White is full coverage. |
| `reverseFoil` | Explicit body/border mask selected by `coverageMode: "reverse"`. It replaces primary `foil` before packing. It is never generated by inverting the artwork rectangle. |
| `extendedFoil` | Additional coverage for profiles that enable full-card/parallel foil. It is combined with primary coverage only for those profiles. Author text/subject exclusions into this mask; `protection` also applies. |
| `height`, `roughness`, `sparkle` | Individual grayscale maps override their respective packed surface channels. |
| `stamp` | Independent grayscale stamp coverage. Uses its own optical profile when assigned; otherwise metallic ink. |
| `protection` | White removes primary, secondary, metallic, stamp and image-hologram window coverage. It preserves laminate, surface maps, virtual depth and angular offset. |
| `pattern`, `secondaryPattern`, `stampPattern` | Independent visibility of the corresponding diffraction, sparkle and patterned silver response. Black suppresses the pattern while retaining the material underneath. |
| `normal` | OpenGL tangent-space normal map, +Y up. Flat is approximately RGB 128, 128, 255. |
| `hologram` | Packed RGB image-hologram data: R is virtual depth (128 is the reference plane), G is the image window, B is local angular offset (128 is neutral). This is separate from physical emboss. Black G protects borders/text; `protection` also masks G. |
| `direction`, `secondaryDirection`, `stampDirection` | Region-specific grating-axis, spacing and pattern-amplitude maps described below. |

Stamp foil takes priority over secondary foil, which takes priority over primary foil. Use masks with clean, intentional boundaries; a selected region without an assigned secondary or stamp profile does not automatically create another optical material.

`coverageMode` accepts `artwork` (the default) or `reverse`. Reverse requires `maps.reverseFoil`; a missing mask is an error. Secondary artwork, extended borders, body pattern visibility/direction, stamps, roughness and protection remain independently authored. The importer exposes this choice as Foil placement. Coverage is resolved before channel packing, so reverse printings do not add GPU texture samplers. Optical profiles remain available across every card.

For a nonfoil scan used as the print source, optional `substrate.backgroundColor: [r, g, b]` specifies the original paper's linear reflectance. The material removes its transmitted contribution and inserts `substrate.color` through the primary coverage mask. This avoids pale antialiased text fringes produced by a simple gray mix. It requires a corresponding ink-transmission mask; do not supply arbitrary paper values for an already reflective scan. Existing substrate behavior is unchanged when this field is absent.

The `e-reader` field is a shallow continuous sheet with fine grain and broad reflection. `legendary-fireworks` uses denser fine broken rays inside large radial fields. Both are development reconstructions; their card-specific masks determine reverse coverage.

Grating direction is an **axis**, encoded using twice the angle: `R = 0.5 + 0.5 cos(2θ)`, `G = 0.5 + 0.5 sin(2θ)`. This lets opposite but physically equivalent axes filter correctly. The material adds its configured direction angle. `B` encodes a spacing multiplier, `0.5 + 1.5 B`, applied to the profile's period in micrometres. `A` controls manufactured-pattern amplitude. Directions remain attached to card UVs.

Starlight's optional `structure.gridStrength` (0–1), `gridScale` (1–40), `gridTravel` (−40–40) and `gridWidth` (0.1–2) control a light/view-dependent reflection envelope over fixed cuts. Positive travel selects bands opposite the tilt on both axes. These settings never shift the manufacturing texture or artwork.

By default roughness follows the selected profile. Supplying an individual roughness map switches to absolute map values. `mapSettings.roughnessMode` can explicitly choose `profile`, `absolute` or `offset`; offset treats 128/255 as neutral and adds `(G − 128/255) × 0.35` to the material roughness. Final roughness is clamped to 0.045–1. Packed surface roughness requires an explicit mode.

Supplying an individual height map enables emboss at strength 0.25, including outside foil. `mapSettings.embossStrength` overrides that strength, from 0 to 2. Without a global override, packed height uses each foil region's relief. `mapSettings.normalScale` controls the imported normal map, from 0 to 2 (default 1). Laminate remains independently lit above the perturbed print/foil surface.

`profileOverrides.surface.varnishRelief` (0–2) raises the independent clearcoat response using the same authored height map. The nominal full-height scale is 0.008 cm, weighted by the selected optical region. It changes reflected lighting without changing image opacity. Classic foil emboss and raised varnish can be tuned independently.

`profileOverrides.surface.imageHologram` enables opaque reflected-image reconstruction (0–1). `imageDepth` sets the total virtual depth range in centimetres (0–0.5), `imageContrast` controls reflected detail (0.1–4), and `imageWidth` controls angular selectivity (0.04–1). The image window replaces primary foil coverage for this treatment. Supply a registered `hologram` map; its green channel defines the window independently of embossed borders and symbols. RGB 128, 0, 128 leaves a pixel outside the hologram. Use low-frequency authored depth layers rather than noise. This is an approximation for development, not measured multi-view holographic data.

## Limits and loading

`profileOverrides.surface.substrateDarkening` controls an absorbing dark finish inside the assigned foil region (0–1). It defaults to zero. Each optical region can set it independently; unfoiled print retains its original color.

PNG, JPEG, WebP, SVG and AVIF are supported when the browser can decode them. Front/back images are limited to 8192 pixels on either axis, material maps to 4096, each image to 64 MB, and the selected unique images to 64 megapixels in total. The manifest limit is 1 MB. Bundles with missing images or invalid data report an error within the import dialog while the current card remains visible.

Individual masks are packed in a worker into three GPU textures, plus an optional image-hologram texture when supplied. Imported normals and three optional direction maps stay separate. Card selection compiles the complete candidate material before replacing the visible card. Removal defers texture disposal until the card is no longer displayed or being prepared.

`scripts/import-browser-check.mjs` creates a deliberately segmented calibration bundle and verifies actual image/folder/file imports, mask registration, three independent foil regions, normal/roughness lighting, invalid manifests, modal shortcuts, narrow-screen layout, and URL cleanup on WebGPU and WebGL 2. Calibration art is a diagnostic fixture, not a showcase card.

Quarter Century uses the selected card's independent metallic-name mask and extended foil coverage. Its anniversary geometry is registered at normalized x=.38–.62, y=.765–.925 in the rules area. The map worker reserves image-hologram alpha for this internal optical mask; imported RGB depth/window/angular channels retain their meaning. Existing print protection also suppresses the mark. The publisher logo source is cached locally and shared through AssetManager. Platinum Secret and Quarter Century manufacturing fields are available as platinum-secret and quarter-century.

