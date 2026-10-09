# 30th Celebration: TCGL source acquisition

Status: **source acquisition complete; expansion implementation incomplete**.
No anniversary cards, pack recipes, wrappers or material registrations have been
added to the running site. No authored normals have been generated or activated.
This document must not be interpreted as physical-finish approval.

## Original sources

`30th-tcgl-sources.json` records 199 distinct English TCGL variants and all 443
original PNG assets: 199 paired fronts, 199 foil maps and 45 etch maps. All 443
downloaded, decoded and passed SHA-256 and dimension checks; none is unavailable.
The complete source entry, exact URL, TCGL card ID, long-form variant ID,
dimensions, image mode and SHA-256 are retained per printing.

Original bytes and per-printing `source.json` files are preserved locally under
`research/tcgl/<tcgl-card-id-with-hyphens>/`. These research directories follow
the repository's existing ignored-source convention; they are **not in Git**.
The committed manifest and acquisition script allow downloading them again.
Index/export/database snapshots are in `research/tcgl/30th-celebration/`.

The live [TCGL export index](https://cdn.malie.io/file/malie-io/tcgl/export/index.json)
resolved these English exports in revision `v0.1.9.13`:

| Source group | Selected variants | Assets | Etches |
| --- | ---: | ---: | ---: |
| `me5-5` main expansion | 158 | 328 | 12 |
| `me5-5c` Classic Collection raw database | 30 | 90 | 30 |
| `me5-5m` RGB Mew | 3 | 9 | 3 |
| `mee` standard printings 009–016 only | 8 | 16 | 0 |
| Total | 199 | 443 | 45 |

Front/etch PNGs are 733×1024; foil PNGs are 367×512. The source files were not
cropped, rescaled, flipped, recolored, denoised or converted on acquisition.
The importer selects only the exact `std` foil variants, excluding ordinary MEE
001–008 and their reverse printings. No generic relief or another card's maps
have been substituted.

## Identity issues requiring review

The [main TCGdex catalog](https://api.tcgdex.net/v2/en/sets/30th) supplies 158
entries. All main TCGL numbers and names match it. Its generated variant flags
are unsuitable as proof of physical foil: the Mewtwo ex 157 response marks
`normal: true`, whereas its exact TCGL entry has an etched foil response.

The [Classic TCGdex catalog](https://api.tcgdex.net/v2/en/sets/30th-c) supplies
30 entries without image URLs. Its local IDs differ from TCGL's database order:
TCGdex `30th-c-001` is Charizard, while TCGL `me5-5c_1` is Pikachu. These are
source identities, not interchangeable collector numbers. Historical printed
numbers also differ: the TCGL Pikachu front visibly prints `58/102`.

The processed `me5-5c` export is empty. The exact raw database
`card-database-me5-5c_1_en_0.0` has 30 rows and supplies long-form IDs and
foil/etch declarations. All their paired front/foil/etch PNGs exist. The
manifest retains these raw rows, marks name matches as **candidates**, and keeps
database indices separate from the printed collector numerator. Denominators
and full printed identities need individual front review. In particular, the
two Darkrai & Cresselia LEGEND halves cannot be resolved by name alone.

The RGB export labels source numbers `001/RGB`, `002/RGB`, `003/RGB`. Visual
inspection of all three original fronts reads **R/RGB, G/RGB, B/RGB** respectively.
Preserve the numeric TCGL source identity as provenance and use the printed
color identity when the final Holo catalog is authored. This inspection does
not approve the etch polarity, protection boundaries or optical finish.

The current [TCGdex MEE catalog](https://api.tcgdex.net/v2/en/sets/mee) lists only
001–008; `mee-009` returns 404. TCGL supplies all eight anniversary printings
009–016, each explicitly `Rainbow_Holo`. They must retain their own identities
instead of replacing the existing Basic Energy cards.

## Offline conversion and outstanding authored maps

`scripts/tcgl/convert_30th_sources.py` implements the mandated final Sylveon
operations: mean RGB, inverted luminance, full-domain bilinear resize to
1800×2475, Scharr CV_32F derivatives at 1/32, slope gain 1.03, protection after
differentiation, XYZ normalization, source-alpha flattening, and opaque RGB
OpenGL +Y encoding. Roughness uses the card-specific body/secondary formula.
There is no height output or runtime generation.

The converter requires a review JSON bound to the exact variant, original
source hashes, clean-front hash, PNG region-map hashes, captures and explicit
registration observations. It rejects missing etches and unreviewed sources.
It accepts only verified inverted polarity, no vertical flip, no crop, zero
offset and full-card UVs. A different source convention requires investigation,
not silently applying Sylveon's assumptions.

Each reviewed card needs 1800×2475 grayscale PNGs at:

```
public/cards/pokemon/30th-celebration/maps/<tcgl-card-id-with-hyphens>-protection.png
public/cards/pokemon/30th-celebration/maps/<tcgl-card-id-with-hyphens>-body.png
public/cards/pokemon/30th-celebration/maps/<tcgl-card-id-with-hyphens>-secondary.png
```

These authored PNGs **are not available yet**. Their boundaries must be reviewed
at full resolution, including text glyphs and deliberately smooth areas. An
empty secondary map is appropriate only after confirming no secondary region.
No masks are synthesized from front brightness or borrowed from another card.

After review, run:

```
python scripts/tcgl/convert_30th_sources.py --card me5-5_147 --review <review.json>
```

The converter records output hashes, parameters, source dimensions, review and
any replaced outputs in per-card evidence. Generated assets remain inactive
until registered and reviewed in Holo. Reuse
`src/materials/profiles/tcglEtchedFinish.ts`, which already contains the required
Espeon/Sylveon response, with the same map settings at both registration and
profile override levels. Do not activate an additional emboss response.

## Physical-reference and integration gaps

The first inspected Classic front (Pikachu) has visible gold/noisy texture and
the RGB fronts have visible stippling. It is not established which components
are intentional printing and which are baked foil representation. Do not
remove this texture or declare these sources clean print masters without
exact-print physical references. The sources are preserved untouched.

The per-card TCGL foil maps encode coverage/intensity. A foil type label such as
`PIKACHU`, `RGB` or `CLASSIC_FOIL` does not by itself establish Holo's required
angular optics or supply a validated shader pattern. Angled English-card
photos/moving-light video, clean-front audits, authored protection/region PNGs,
individual etch registration and polarity review, dedicated finish work and
renderer comparisons with Espeon 155/Sylveon 156 remain outstanding.

The original expansion brief also remains outstanding: combined canonical
catalog/booster pool, observed slot-specific collation and uncertain RGB rate,
independent UPC Classic product, authentic cropped wrappers, set-picker and
vending integration, gallery/viewer/binder handling, mobile/base-path review,
pack simulations and saved live-render captures. The
[4,063-pack discussion](https://billsarchive.com/articles/30th-celebration-pull-rates.html)
is an initial collation lead, not a registered recipe or a physical-finish
reference. No probability has been invented or made active.

## Verification

- Re-read and decoded all 443 original PNGs; verified dimensions and hashes.
- Confirmed 199 distinct TCGL long-form variant IDs and no active registrations.
- Four numerical converter tests pass: no relief from protection boundaries,
  flat RGB under full protection/source transparency, correct X/Y convention,
  and rejection of absent etches/unreviewed printings.
- No source geometry, existing card registration, existing optics or wrapper
  asset was changed. Pre-existing e-card pack artwork changes were left alone.
- Numerical tests establish converter behavior, not physical depth or appearance.
- Production build passes (`tsc --noEmit` and Vite). Vite reports its existing
  large-chunk warning; this work adds no application imports or bundle modules.
- Full application suite: **309 passed, 26 failed, 335 total** on both runs.
  Failures concern existing gallery resolution, Pikachu VMAX dimensions,
  Aquapolis/Neo Destiny asset hashes, adapter rejection messages, Prismatic
  registrations/checklists, Umbreon GX and First Movie stamp coverage. No
  application source or test fixture was modified by this work. The full suite
  is not green, and no claim of regression-free integration is made.
  Captured second-run output: `artifacts/30th-tcgl-validation/application-tests.log`.

Run the converter checks with:

```
python -m unittest discover -s scripts/tcgl -p test_30th_conversion.py
```
