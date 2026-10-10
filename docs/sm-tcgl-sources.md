# Sun & Moon original TCGL source collection

| Collection | Printings | Front | Foil | Etch |
|---|---:|---:|---:|---:|
| Sun & Moon (`sm1`) | 289 | 289/289 | 180/180 | 26/26 |
| Guardians Rising (`sm2`) | 287 | 287/287 | 184/184 | 39/39 |
| Burning Shadows (`sm3`) | 285 | 285/285 | 183/183 | 41/41 |
| Shining Legends (`sm3-5`) | 138 | 138/138 | 90/90 | 14/14 |
| Crimson Invasion (`sm4`) | 216 | 216/216 | 136/136 | 24/24 |
| Ultra Prism (`sm5`) | 298 | 298/298 | 186/186 | 35/35 |
| Forbidden Light (`sm6`) | 251 | 251/251 | 158/158 | 28/28 |
| Celestial Storm (`sm7`) | 320 | 320/320 | 201/201 | 32/32 |
| Dragon Majesty (`sm7-5`) | 134 | 134/134 | 88/88 | 14/14 |
| Lost Thunder (`sm8`) | 410 | 410/410 | 257/257 | 42/42 |
| Team Up (`sm9`) | 339 | 339/339 | 215/215 | 38/38 |
| Detective Pikachu (`gum`) | 18 | 18/18 | 18/18 | 0/0 |
| Unbroken Bonds (`sm10`) | 410 | 410/410 | 256/256 | 44/44 |
| Unified Minds (`sm11`) | 454 | 454/454 | 279/279 | 45/45 |
| Hidden Fates (including Shiny Vault) (`sm11-5`) | 219 | 219/219 | 169/169 | 98/98 |
| Cosmic Eclipse (`sm12`) | 464 | 464/464 | 293/293 | 50/50 |
| Sun & Moon Black Star Promos (`smbsp`) | 241 | 241/241 | 234/234 | 29/29 |
| Sun & Moon alternate and special printings (`smalt`) | 194 | 194/194 | 143/143 | 8/8 |

Validation: **validated**. 0 unresolved asset associations; 0 mapping/integrity errors.

Eight additional official source bundles are preserved separately in `supplementary/orphan-bundles.json`: `sm4_en_125` and `smbsp_en_108` through `smbsp_en_114`. Their native assets decode and validate, but neither the installed nor any of the 39 archived English TCGL tables supplies an exact long-form printing ID. This source identity limitation is explicit; no identifier or substitute asset was fabricated.

Counts are exact printing associations, not distinct PNG files. Shared textures remain associated through exact TCGL material references; finishes are never collapsed.

Run `python scripts/tcgl/fetch_sm_sources.py` to resume acquisition and validation; use `--validate-only` for an independent full audit. The first run discovers the entire inventory, acquires and validates Sun & Moon as its pilot, then processes the full series with the same pipeline.

The source collection is `research/tcgl/sun-moon-series/sources.json`; per-set manifests are in `dataset/cards/<set>/sources.json`. Exact card evidence is `research/tcgl/<TCGL-cardID>/source.json`. Paths in Holo source manifests are workspace relative. The original extractor manifest at `dataset/manifest.json` retains its extraction-root-relative format, directly accepted by existing Holo preparation tools.

Original bundles, material manifests, binary/decoded databases, serialized compressed textures, hashes and native decoded PNGs are retained in the source collection. PNGs are lossless exports of native top-level textures; original GPU compression and all mip levels remain in the bundles. Per-printing assets are hard links to the decoded originals, avoiding redundant image storage. Raw data remains in the established ignored research directory.

Etch/foil absence is established only by an empty exact material-manifest reference. Failures remain explicit in validation and source manifests. Duplicate byte/pixel associations and compendium differences are recorded in `dataset/duplicate-assets.json` and `dataset/completeness-audit.json`.

Hidden Fates preserves all SV1–SV94 entries with their original TCGL numeric identities. Black Star Promos and alternate/special printings are separate from expansions. Coverage is relative to the installed English TCGL snapshot; source inventory omissions are recorded rather than replaced with external images.

No rescaling, cropping, recoloring, normal generation, derived masks, shaders, materials, UI, pack mechanics or viewer registrations are included. Individual alignment, polarity and physical finish review belong to the later integration pass. Existing implemented sets and working assets were not modified.
