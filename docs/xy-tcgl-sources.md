# English XY original TCGL acquisition

| Collection | Card definitions | Finish variants | Front | Foil | Etch | Additional maps |
|---|---:|---:|---:|---:|---:|---:|
| Kalos Starter Set (`xy0`) | 39 | 39 | 39/39 | 0/0 | 0/0 | 0 |
| XY Base Set (`xy1`) | 146 | 269 | 269/269 | 153/153 | 6/6 | 0 |
| Flashfire (`xy2`) | 109 | 200 | 200/200 | 117/117 | 7/7 | 0 |
| Furious Fists (`xy3`) | 113 | 210 | 210/210 | 122/122 | 7/7 | 0 |
| Phantom Forces (`xy4`) | 122 | 224 | 224/224 | 134/134 | 8/8 | 0 |
| Primal Clash (`xy5`) | 164 | 296 | 296/296 | 182/182 | 20/20 | 0 |
| Double Crisis (`xy5-5`) | 34 | 66 | 66/66 | 40/40 | 0/0 | 0 |
| Roaring Skies (`xy6`) | 110 | 196 | 196/196 | 120/120 | 13/13 | 0 |
| Ancient Origins (`xy7`) | 100 | 172 | 172/172 | 108/108 | 17/17 | 0 |
| BREAKthrough (`xy8`) | 164 | 302 | 302/302 | 180/180 | 12/12 | 0 |
| BREAKpoint (`xy9`) | 123 | 220 | 220/220 | 130/130 | 10/10 | 0 |
| Generations (`xy9-5`) | 83 | 152 | 152/152 | 88/88 | 2/2 | 0 |
| Generations Radiant Collection (`xy9-5r`) | 32 | 32 | 32/32 | 19/19 | 0/0 | 0 |
| Fates Collide (`xy10`) | 125 | 222 | 222/222 | 130/130 | 10/10 | 0 |
| Steam Siege (`xy11`) | 116 | 209 | 209/209 | 125/125 | 10/10 | 0 |
| Evolutions (`xy12`) | 113 | 196 | 196/196 | 121/121 | 9/9 | 0 |
| XY Black Star Promos (`xybsp`) | 211 | 211 | 211/211 | 201/201 | 0/0 | 0 |
| XY alternate and special printings (`xyalt`) | 183 | 200 | 200/200 | 149/149 | 17/17 | 0 |

Validation: **validated**; 0 unresolved asset references; 0 integrity/association errors. 39 archived English tables checked.

Counts are exact printing/finish associations; shared original textures are not collapsed into fewer variants. Card definition counts group printed set, collector number and name within each source collection.

All 15 expansions are included; Generations Radiant Collection, Black Star Promos and alternate/special printings are separate source tables. McDonald’s collections were not found in the accessible English TCGL export index, raw database index, installed XY rows or official bundle names. Exact negative lookups and source hashes are in `evidence/series-lookup-audit.json`. This limitation is explicit; no external artwork or synthetic replacement is used.

Official bundles without a table identity: 0. They remain separately preserved in `supplementary/orphan-bundles.json` with actual texture references and unresolved identities; they are not counted as identified finish variants.

All 4432 native decoded textures validated, including 61 supplementary originals outside finish material references (including small card-art sprites). They are retained with their original bundle identity; they are not misclassified as foil or etching. No additional unindexed finish material manifests were found.

The processed export has no XY inventory. Extraction instead uses raw TCGL binary card tables, archived decoded tables, official bundle manifests and exact per-variant MaterialManifest references.

Resume: `python scripts/tcgl/fetch_xy_sources.py --workers 8`. Independent full checksum audit: `python scripts/tcgl/fetch_xy_sources.py --validate-only`; then `python scripts/tcgl/audit_xy_sources.py` for the expanded acquisition report.

Raw source collection: `research/tcgl/xy-series/sources.json`. Per-set manifests: `research/tcgl/xy-series/dataset/cards/<set>/sources.json`. Exact printing evidence: `research/tcgl/<TCGL-cardID>/source.json`. The complete committed report and printing index are `docs/xy-tcgl-sources.json`. Large raw assets follow Holo’s ignored research convention.

Original Unity bundles retain compressed pixels and all mip levels. Serialized texture objects, native lossless decoded PNGs, dimensions, channel modes, SHA-256 file/pixel hashes and source asset IDs are preserved. Each finish is assigned through its own exact bundle/material reference. Duplicate byte/pixel groups are audited; shared originals are retained with their actual associations.

Automated registration validation checks matching native decoder orientation, the untouched full-card UV domain and exact front/map references in the same material manifest. Native dimensions are recorded without imposing a rescale. No extra flip, crop, offset or pixel edit is applied. This does not establish physical groove depth, polarity or visual correctness of the source; those require later rendering/physical review.

Original white-plate foil (_w), etch (_e), cold-foil (_cf) and cast-and-cure (_cc) are tracked separately. Empty exact material references establish absence. Missing manifests, failed downloads and decode failures remain errors. All bundle textures, including textures used by other finishes, remain preserved.

Dedicated later material review: Rainbow, AngledPillars, Cosmos, Squares, Thatch, CrackedIce, FlatSilver, Galaxy, Tinsel, Stamped and SolidColor. Exact TCGL shader IDs are listed per set in the JSON report; no physical foil response is inferred from scan brightness.

Acquisition only. No gallery, material, shader, normal, derived mask or pack changes. Existing assets and unrelated sets are unchanged.
