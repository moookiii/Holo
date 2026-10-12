# English BW original TCGL acquisition

| Collection | Card definitions | Finish variants | Front | Foil | Etch | Additional maps |
|---|---:|---:|---:|---:|---:|---:|
| Black & White (`bw1`) | 115 | 219 | 219/219 | 119/119 | 3/3 | 0 |
| Emerging Powers (`bw2`) | 98 | 194 | 194/194 | 108/108 | 2/2 | 0 |
| Noble Victories (`bw3`) | 102 | 198 | 198/198 | 115/115 | 6/6 | 0 |
| Next Destinies (`bw4`) | 103 | 190 | 190/190 | 113/113 | 10/10 | 0 |
| Dark Explorers (`bw5`) | 111 | 207 | 207/207 | 120/120 | 9/9 | 0 |
| Dragons Exalted (`bw6`) | 128 | 240 | 240/240 | 141/141 | 10/10 | 0 |
| Dragon Vault (`bw6-5`) | 21 | 21 | 21/21 | 21/21 | 0/0 | 0 |
| Boundaries Crossed (`bw7`) | 153 | 283 | 283/283 | 173/173 | 13/13 | 0 |
| Plasma Storm (`bw8`) | 138 | 257 | 257/257 | 148/148 | 8/8 | 0 |
| Plasma Freeze (`bw9`) | 122 | 222 | 222/222 | 136/136 | 14/14 | 0 |
| Plasma Blast (`bw10`) | 105 | 190 | 190/190 | 116/116 | 10/10 | 0 |
| Legendary Treasures (`bw11`) | 115 | 216 | 216/216 | 145/145 | 2/2 | 0 |
| Legendary Treasures Radiant Collection (`bw11r`) | 25 | 25 | 25/25 | 15/15 | 0/0 | 0 |
| Black & White Black Star Promos (`bwbsp`) | 96 | 96 | 96/96 | 85/85 | 0/0 | 0 |
| BW alternate and special printings (`bwalt`) | 116 | 126 | 126/126 | 86/86 | 0/0 | 0 |

Validation: **validated**; 0 unresolved asset references; 0 integrity/association errors. 30 archived English tables checked.

Counts are exact printing/finish associations; shared original textures are not collapsed into fewer variants. Card definition counts group printed set, collector number and name within each source collection.

All 11 main expansions and Dragon Vault are included; Legendary Treasures Radiant Collection, Black Star Promos and alternate/special printings are separate source tables. McDonald collections were not found in the accessible English TCGL export index, raw database index, installed BW rows or official bundle names. Exact negative lookups and source hashes are in `evidence/series-lookup-audit.json`. This limitation is explicit; no external artwork or synthetic replacement is used.

Official bundles without a table identity: 5. They remain separately preserved in `supplementary/orphan-bundles.json` with actual texture references and unresolved identities; they are not counted as identified finish variants.

All 3316 native decoded textures validated, including 22 supplementary originals outside finish material references (including small card-art sprites). They are retained with their original bundle identity; they are not misclassified as foil or etching. No additional unindexed finish material manifests were found.

The processed export has no BW inventory. Extraction instead uses raw TCGL binary card tables, archived decoded tables, official bundle manifests and exact per-variant MaterialManifest references.

Resume: `python scripts/tcgl/fetch_bw_sources.py --workers 8`. Independent full checksum audit: `python scripts/tcgl/fetch_bw_sources.py --validate-only`; then `python scripts/tcgl/audit_bw_sources.py` for the expanded acquisition report.

Raw source collection: `research/tcgl/bw-series/sources.json`. Per-set manifests: `research/tcgl/bw-series/dataset/cards/<set>/sources.json`. Exact printing evidence: `research/tcgl/<TCGL-cardID>/source.json`. The complete committed report and printing index are `docs/bw-tcgl-sources.json`. Large raw assets follow the established Holo ignored research convention.

Original Unity bundles retain compressed pixels and all mip levels. Serialized texture objects, native lossless decoded PNGs, dimensions, channel modes, SHA-256 file/pixel hashes and source asset IDs are preserved. Each finish is assigned through its own exact bundle/material reference. Duplicate byte/pixel groups are audited; shared originals are retained with their actual associations.

Automated registration validation checks matching native decoder orientation, the untouched full-card UV domain and exact front/map references in the same material manifest. Native dimensions are recorded without imposing a rescale. No extra flip, crop, offset or pixel edit is applied. This does not establish physical groove depth, polarity or visual correctness of the source; those require later rendering/physical review.

Original white-plate foil (_w), etch (_e), cold-foil (_cf) and cast-and-cure (_cc) are tracked separately. Empty exact material references establish absence. Missing manifests, failed downloads and decode failures remain errors. All bundle textures, including textures used by other finishes, remain preserved.

Dedicated later material review: Rainbow, AngledPillars, Cosmos, Thatch, CrackedIce, Tinsel, Stamped and SolidColor. Exact TCGL shader IDs are listed per set in the JSON report; no physical foil response is inferred from scan brightness.

Acquisition only. No gallery, material, shader, normal, derived mask or pack changes. Existing assets and unrelated sets are unchanged.

Additional preserved promo sources: BW29, BW30 and BW31 each contain an original front and foil map with an exact material manifest. BW77 and BW78 each contain an original front but no material manifest; their foil/etch availability remains unknown. All five lack a long-form printing ID in the accessible installed and archived tables. The five fronts and three foil maps are validated separately and excluded from identified-printing counts.

The complete committed asset index is `docs/bw-tcgl-assets.json`: exact variant metadata, asset URLs, native dimensions, file/pixel/serialized hashes, references, absent-map reasons and preserved supplementary textures. No downloads or decode failures remain.

Alignment validation covers all identified map associations through original material references and the unchanged native coordinate convention. Original Unity texture padding and native dimensions are retained. No artwork crop or UV correction was applied. A representative original front/foil/etch review is saved in `evidence/native-review.png`; this sample is not a claim of visual inspection of every pixel.
