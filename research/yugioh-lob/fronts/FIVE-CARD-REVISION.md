# Five-card front and title correction

The four dark collection photos were replaced with brighter original LOB 1st Edition PSA scans. Individual matching TCG backs and matching certificates were inspected. Existing originals remain preserved, and user-rejected dark candidates cannot be selected again by the sourcing pipeline.

| Code | Card | Native cropped resolution | Status | Source |
| --- | --- | --- | --- | --- |
| LOB-027 | Aqua Madoor | 693 × 1013 | exact-print-high-quality | [Source](https://www.ebay.com/p/25043770394) |
| LOB-045 | Dragon Capture Jar | 693 × 1008 | exact-print-high-quality | [Source](https://www.ebay.com/p/28043781315) |
| LOB-070 | Red-Eyes Black Dragon | 466 × 677 | unverified-print-fallback | [Source](https://yugioh.fandom.com/wiki/Set_Card_Galleries:Legend_of_Blue_Eyes_White_Dragon_(TCG-NA-1E)) |
| LOB-106 | Armed Ninja | 692 × 1009 | exact-print-high-quality | [Source](https://www.ebay.com/p/9043778585) |
| LOB-110 | Hane-Hane | 701 × 1019 | exact-print-high-quality | [Source](https://www.ebay.com/itm/306902660593) |

Aqua Madoor, Dragon Capture Jar, Armed Ninja and Hane-Hane have individually bounded PNG title masks. The masks follow the complete printed strokes, include the Hane-Hane hyphen, preserve counters and antialiasing, and exclude title-plate edges. Artwork and stamp alignment were rechecked for each replacement. No material/shader or optical settings changed.

Red-Eyes retains its original front as an explicitly unverified low-resolution fallback. Crop `[12,8,478,685]` removes the white scan/sleeve margin. Its original three material maps were preserved under `LOB-070/original-maps/`; identical bounds crop those maps and rebase registration. No sharpening, upscaling, generative editing or brightness adjustment was applied to any front.

Aqua Madoor retains a narrow source scuff at the far-left artwork edge. Natural print dots, wear and small stamp reflections remain on these original scans. High-resolution Asian-English Armed Ninja/Hane-Hane listings were rejected after their paired OCG backs contradicted North American attribution. Generic Face to Face stock images lacked the required 1st Edition printing. An Armed Ninja PSA listing actually showed Australian LOB-A106. Originals of selected sources and all hashes/coordinates are recorded in per-card provenance and the acquisition manifest.

Validation: build passed; 13 Python tests and both LOB asset/provenance tests passed. Live WebGPU checks decode all 126 local fronts and inspect 13 representative cards at three poses with no page errors or remote image requests. Colored glyph overlays and mask comparisons were inspected at high zoom. Catalog identity, rarity, collation, Secret Rare assets and other card fronts are unchanged by this revision.

Latest set audit: 5 verified exact-print high-quality fronts, 95 provisional original fronts with regional review, 26 legacy fallbacks; 121 manual-review cards. This supersedes the earlier audit counts in `REPORT.md`. Full current machine-readable results remain in `public/cards/yugioh/lob-first-edition/sources.json`.
