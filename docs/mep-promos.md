# MEP Black Star Promos

The Mega Evolution series now includes a local, individually browsable MEP promo catalog in both the gallery and set picker. Its release date is September 26, 2025, alongside Mega Evolution and before Phantasmal Flames. There is no invented promo booster or pack wrapper.

## Exact sources

100 numbered English standard printings come from TCGL export `mebsp`, version `v0.1.9.13`, including numbers 001–092 and 094–101. The export does **not** supply 093; it is not fabricated or replaced. This is the complete available export, not a claim that every physical promotional distribution or stamp variant is present. TCGdex currently lists 89 entries; the local catalog retains all 100 exact TCGL entries.

- [TCGL export](https://cdn.malie.io/file/malie-io/tcgl/export/v0.1.9.13/mebsp.en-US.json)
- [TCGdex set metadata](https://api.tcgdex.net/v2/en/sets/mep)

Each printing's untouched original sources and complete export entry are preserved under `research/tcgl/mep-<number>/`; the batch export and metadata are under `research/tcgl/mep-set/`. These research paths are ignored by Git, following repository convention. Committed per-print evidence JSON under `public/cards/pokemon/tcgl-me/mep/tcgl/` records source URLs, source dimensions, SHA-256, card ID, long-form variant ID, export entry, output dimensions and output hashes. Clean fronts are unchanged copies, normally 733×1024. Original foil maps are 367×512.

## Etched response

20 exact etched printings: 011, 012, 013, 023, 024, 025, 029, 030, 032, 033, 034, 035, 036, 071, 072, 073, 081, 089, 090, 091. For example, 011 is `mebsp_11`, `MegaLatiasex_mebsp_11_std_DoubleRareM_SvUltra_Etched`; all other identities are recorded individually in evidence.

Each paired front, raw 733×1024 RGBA etch and registration overlay was inspected before conversion. Text, subject silhouettes, attack areas, border and corners align in the full-card UV domain. No vertical flip, crop, offset, blur, denoise, extra noise or replacement linework. White lines use the reference recessed interpretation; actual physical groove depth remains unmeasured.

`scripts/tcgl/mep_promos.py` uses the existing converter's reference operations: inverted mean RGB, continuous bilinear full-domain resize to 1800×2475, Scharr CV_32F with scale 1/32 before protection, slope gain 1.03, protection applied only to X/Y slopes, normalization and alpha flattening, opaque RGB PNG with OpenGL +Y. No active height map. `prismatic_sir_texture` and `tcglEtchedFinish` provide the required final Sylveon/Espeon response, including normalScale 1, embossStrength 0, absolute roughness, plain structure and zero primary glints. Existing generated maps for other sets are untouched.

Protection uses each printing's own TCGL foil glyph/coverage boundaries. Body classifications use the existing source_regions estimates, not front brightness. Roughness is `(0.30 + 0.105 * body) * (1 - secondary) + 0.27 * secondary`. No unverified secondary microdiamond region is invented. Fine contour/body classification refinements and exact-print physical calibration remain pending; these source estimates are not certified final hand-authored masks.

## Other finishes and remaining limits

20 SV_HOLO printings and 39 SUN_PILLAR printings use existing smooth source-masked finishes. 19 Cosmos printings and two stamped printings retain their original front with `treatmentStatus: deferred` and a print-only material. Cosmos motif PNGs are empty 1200×1650 grayscale files, explicitly pending placement. No random dots, reused placements, synthetic relief or replacement stamp optics are introduced.

The SUN_PILLAR export declarations for 099 and 100 include CastAndCure/SouthernCross long-form tags; the existing smooth response does not reproduce that specialized optical pattern. Exact-print angled photographs and individual physical finish calibration remain pending for the set; render screenshots cannot establish depth. An exact 011 physical photo was located at [the seller listing](https://www.ebay.com/itm/205776109033), but this is not full-set angular calibration.

Paired source review captures are saved under `artifacts/mep/source-review/`; live browser captures and report are under `artifacts/mep/live-review/`. Reproduction: acquire sources with `python scripts/tcgl/mep_promos.py acquire`, visually inspect the sources and supply the review records, then run `python scripts/tcgl/mep_promos.py convert`. Conversion is gated on those explicit review records.

## Validation

Production build passed. All three MEP tests passed, checking source identity/front hashes, output hashes, catalog routing, chronological gallery placement, all 20 resolved etched materials and explicit deferred finishes. The four existing Mega-series tests also passed. Existing tests require an extension-resolution shim with the installed Node 22 runtime; plain Node fails on the pre-existing extensionless `megaRarity` import. The broader gallery run has one existing Base Set master-ID mismatch (`pokemon:base1-1:holo` versus `alakazam-base-set`), and pokemon-assets has an existing missing `2024sv` wrapper. Neither is caused by MEP.

Live WebGPU browser checks exercised 100 promo buttons, individual-card selection, gallery filtering, all 20 etched cards plus six representative smooth/deferred cards and the Espeon 155/Sylveon 156 references. Captures cover front, grazing, specular and tilted poses, with Low key, Moving light and Skim for the two references and three MEP etched examples. No MEP asset or renderer errors. Additional pixel validation checks all 20 normals are 1800×2475 opaque RGB, all fully protected pixels are `(128,128,255)`, and Z stays positive.

Visual review finds aligned source line geometry and legible protected text, with a broad white wash at strong specular poses that can obscure fine lines, especially on bright art. Reference settings are retained rather than increasing relief or changing unrelated optics. Exact physical finish fidelity is unverified, including groove depth, fine coating boundaries, secondary coverage and the deferred finishes described above. No unrelated card assets or materials were revised.
