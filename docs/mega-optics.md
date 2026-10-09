# Mega rarity optical finishes

Scope: seven English Mega Attack Rares (Ascended Heroes 265–271) and eight Mega Hyper Rares (MEG 187/188, PFL 130, ASC 294/295, POR 124, CRI 122, PBL 120). Each keeps its own clean front, exact TCGL foil/protection/roughness and 1800×2475 offline tangent normal. No approved map is regenerated. The TCGL normal retains Scharr scale 1/32, gain 1.03, OpenGL +Y, full-card registration, no flip/crop/offset, and zero active height emboss.

## Physical evidence

The archived photographs and their original listing URLs/dimensions/SHA-256 hashes are in `research/mega-optics/physical-sources.json`. These are physical cards photographed at different reflection angles, rather than digital scans:

- [English Gengar 269/217, diffuse hand-held view](https://www.ebay.com/itm/206036564133).
- [English Gengar 269/217, bright close-up](https://www.carousell.sg/p/wts-wtt-mega-gengar-ex-269217-1419953396/).
- [English Dragonite 271/217, reflective lettering and body](https://www.ebay.com/itm/206171521257).
- [English Lucario 188/132, warm reflection](https://x.com/LeonhartYT/status/1981480570908524683).
- [English Lucario 188/132, macro at a different angle](https://www.mercari.com/us/item/m15572369540/).
- [English Gardevoir 187/132, prismatic close-up](https://www.mercari.com/us/item/m41026699668/).
- [English Gardevoir 187/132, quieter gold reflection](https://pokechalet.com/products/mega-gardevoir-megen-187-132-gold-rare).

Gengar and Dragonite show fine, dense attack-letter reflection distinct from the etched Pokémon. Black outlines remain dark, the narrow rim can reflect, and the artwork has directional etched structure. Gardevoir and Lucario show mostly warm gold subject silhouettes and stronger cyan/green/rainbow response in exposed background regions, plus fine metallic reflection on trim. Directional color, source grain scale and reflection intensity are estimates from these uncontrolled photographs; they are not measured BRDF, grating spacing or physical groove depth. An English moving-light reference has not yet been obtained.

## Implementation

`src/materials/profiles/megaRarity.ts` owns two independent profiles. They reuse the existing physical-light reflection graph, its normal-transported grating, source/pixel filtering, UV-anchored microdiamond and metallic grain mechanisms. Primary surfaces have no procedural relief, engraving, facet noise or sparkle. Mega Attack lettering has independently configurable metalness, diffraction, ink transmission and fine microdiamond reflection. Mega Hyper artwork uses restrained gold reflection and dense fine grain; its exposed sheet uses a stronger separately controlled grating with less ink absorption. Established Scarlet & Violet gold and 151 profiles are unchanged.

`scripts/mega-optics-regions.py` writes supplemental **optical coverage only**, from each printing's original TCGL maps. Reviewed source-coordinate seeds select the attack glyph contours; a one-pixel contour gap closure and dark enclosed-region fill complete their optical interiors. Exact foil/protection still bounds the response. Mega Hyper exposed-sheet selection uses smoothstep(0.84, 0.98) on the original foil source, retaining antialiasing. The PNGs preserve the entire 733×1024 source UV domain with no transformation. These masks pack into the existing secondary coverage channel, without adding a GPU texture or per-frame image processing. Source variants, hashes, selection parameters, output hashes and immutable approved-map hashes are in `research/mega-optics/optical-regions.json`.

Pilot cards are Gengar 269 and Lucario 188. `scripts/mega-optics-check.mjs` saves baseline/pilot/final viewer poses, moving-light samples and gallery captures for both backends. Final review and validation results are appended after integration. Existing roughness maps and physical depth estimates are preserved; the photographs cannot resolve their physical accuracy independently.
