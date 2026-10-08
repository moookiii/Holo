# Gold etched Hyper Rare reflection calibration

The single `gold-etched` profile, displayed as **Gold Etched**, uses
`goldEtchedFinish`. Historical `prismatic_gold`, `pokemon151_gold` and
`sv_tcgl_gold` IDs resolve to it for saved-manifest compatibility and are absent
from the public profile library. All 63 registered etched gold printings receive
the response in both the viewer and gallery. This is a material refinement in
the existing renderer, not a new renderer or replacement relief workflow.

## Physical references and grain coverage

Reviewed the supplied `lc.jpg` through `lc6.jpg` photographs, including the
close views of the cape hem, shoulder, blue fabric and gold border. The repeated
clipboard image is the same reference as `lc.jpg`.

Observations from these photographs:

- The gold border has closely packed reflective grain. Individual bright points
  vary with illumination; their positions must not animate.
- Gold shoulder bands, collar, chains, trim and hem have grain as well as etched
  ridges. Grain is not confined to the outside card border or a thin silhouette.
- The blue fabric retains its blue color with finer, lower-energy reflected
  texture. It must not acquire a white specular sheet or gold paint.
- Pink, green, yellow and orange reflections are particularly apparent along
  raised edges. Deep brown/gold background remains between illuminated regions.
- Printed stars are artwork, not new animated glint placements.

Also inspected physical-card listing photographs, not just product scans:

| Exact printing | Photograph | Observed regions |
| --- | --- | --- |
| Koraidon ex 254/198 | [Listing](https://www.ebay.com/itm/364202847160), [photo](https://i.ebayimg.com/images/g/KHAAAOSwJPtkKPQp/s-l1200.jpg) | Grain on gold border/background, weaker through colored body ink; pale crest differs. |
| Mew ex 205/165 | [Listing](https://www.ebay.com/itm/155884762513), [photo](https://i.ebayimg.com/images/g/IVEAAOSwwF1lUTGN/s-l1200.jpg) | Gold border/background and outline catch light; pink body is quieter. This is the expansion card, not the metal promo. |
| Super Rod 276/193 | [Listing](https://www.ebay.com/itm/176037674366), [photo](https://i.ebayimg.com/images/g/mgMAAOSwZGllTbor/s-l1200.jpg) | Dense grain in background/border and gold reel, grip and rod details; dark grip inserts remain dark. |
| Pikachu ex 179/131 | [Listing](https://www.ebay.co.uk/itm/187050572071), [photo](https://i.ebayimg.com/images/g/pW0AAeSwkMtn1peq/s-l1600.jpg) | Gold border/field reflect; colored crown regions differ. Resolution is insufficient to locate individual grains. |
| Basic Psychic Energy 207/165 | [Listing](https://www.ebay.com/itm/335371295376), [photo](https://i.ebayimg.com/images/g/enUAAOSw5ptmL-F2/s-l1200.jpg) | Off-specular photo confirms gold frame and purple printed field; it does not establish glint density. |

Coverage is still each printing's own continuous TCGL foil PNG composed with
its protection PNG. The grain response is attenuated continuously over partial
foil coverage, rather than excluding gray mask values: that would remove grain
from broad gold trim as well as blue fabric. Reflected energy passes through the
existing artwork ink filter. No masks are inferred from scan brightness, no
individual printed stars are promoted to glints, and no normal data is replaced.

The existing fixed-UV metallic-grain mechanism approximates unresolved metal
microfacets. Its seeded optical inclinations are statistical, not claimed to be
measured grain positions on a particular physical copy. The photographs support
material-region placement, not exact per-grain registration. All 63 printings
use their own masks; physical photos were reviewed for the representatives above,
not individually for every one of the 63 printings.

## Diagnosis and implementation

The original gold registrations inherited the general Sylveon/Espeon finish,
including an unattenuated physical substrate reflection, no metallic grain and
the same absolute roughness through partially covered ink. Strong light washed
out the blue fabric and brightened large gold regions together. The exact normal
was not the defect being corrected.

- Keep `normalScale: 1`, `embossStrength: 0`, absolute authored roughness and all
  original geometry/protection data. No runtime or offline normal regeneration.
- Reduce physical substrate reflection to 0.30 and ambient foil reflectance to
  0.015. Keep exposed metalness at 0.65 and a restrained laminate.
- Filter dielectric substrate specular through the printed ink; the independent
  laminate still reflects neutral light. This preserves saturated blue and dark
  ink in strong specular poses.
- Add up to 0.12 roughness as foil coverage decreases, using existing material
  coverage rather than image brightness. Exposed gold retains the authored
  roughness; partially inked fabric has a broader, weaker response.
- Narrow diffraction bandwidth to 0.032 and cross aperture to 0.30, with strength
  1.05 and weaker second order 0.045. The uniform grating still follows the exact
  authored normal, so local surface orientation reveals the spectral response.
- Integrate pixel-scale normal variation into spectral width and BRDF roughness.
  This changes unresolved reflected energy, not normal-map amplitude. Source
  light footprint filtering remains active.
- Reuse dense metallic grain at scale 1050, with finite-source integration and
  a subpixel transition to its aggregate lobe. No time-dependent seed, sparse
  sparkle overlay, new texture reads, bloom or generated relief.
- Carry the same controls through existing packed gallery rows and separate
  shader cache keys. No new full-resolution gallery texture allocation.

These opt-ins default to zero for other rarities. Neo Destiny's existing grain
does not opt into the new filtering, coverage gate or gallery grain mechanism.

## Preserved source evidence

Luxurious Cape: export entry `sv4_265`, variant
`LuxuriousCape_sv4_265_std_HyperRare_SvUltra_Etched` in
`https://cdn.malie.io/file/malie-io/tcgl/export/v0.1.9.13/sv4.en-US.json`.
Exact etch: `https://cdn.malie.io/file/malie-io/tcgl/cards/png/en/sv4/sv4_en_265_std.etch.png`.
Raw front/etch are preserved in `research/tcgl/sv04-set/raw/`.

Existing conversion is full-domain inverted mean luminance, bilinear resize to
1800x2475, Scharr derivatives at 1/32, slope gain 1.03, protection applied after
differentiation, OpenGL +Y tangent normal. No crop, offset or vertical flip is
added by this change. Original source is 733x1024; the authored normal remains
1800x2475. No asset was replaced.

| Asset | SHA-256 |
| --- | --- |
| Raw etch | `10810c4af1a4e991cf76d77889136a7c172a57e18fcba3f319b5bb7f1fe892f6` |
| Front | `84c2ce10acf5f6047ff47de2b3e0afb928b47f581e71c86dd1001c0d05ca4026` |
| Normal | `2c3586747966d9f32446bcd53579f331bab63b0ba4f29b6b013e4e7cd2a83974` |

Each other printing retains its own adjacent `*-holo-evidence.json`, source
variant and source/output hashes. The gold regression test checks every front
and registered map against these records.

## Review procedure

Run the development server, then `node scripts/verify-hyper-rare.mjs`. Captures,
inventory and report are saved under `artifacts/hyper-rare/review/`.
The script checks Cape at eight identical baseline/final poses and light
presets, 13 moving-light/rotation samples, repeat-frame equality, every gold
printing on WebGPU, representative printings on WebGL, gallery compilation and
non-gold Espeon/Sylveon/SIR/Base Set controls. A render pass is not equivalent to
manual physical verification of each card.

The photos have uncontrolled illumination, camera exposure and reflections from
other objects. They cannot establish physical groove depth or measured spectral
parameters. The preserved TCGL etch is lower resolution than the photographed
microstructure, so this is a calibrated real-time approximation, not a measured
reconstruction of one physical card.
