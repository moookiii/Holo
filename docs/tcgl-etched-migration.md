# Exact TCGL etched-card migration

All 11 other authored Pokemon etched cards now use the final Sylveon 156 method. Sylveon remains unchanged. Exact line geometry comes from each card's own TCGL etch; material response uses the Espeon finish copied to Sylveon. No normal blending, generated noise, extra height emboss or runtime normal generation is used.

## Sources and registration

All source etches and paired TCGL fronts are 733x1024 RGBA. They were inspected against the unchanged Holo fronts with colored overlays. All are upright and register to the full-card UV domain; no vertical flip, crop, border correction or offset was needed. White etched strokes are interpreted as recessed (inverted mean RGB luminance).

The Prismatic entries expose `images.tcgl.png.etch` directly. The processed Malie export does not include SM/SWSH sets; Umbreon GX and Pikachu VMAX identities are verified in the raw TCGL database and their exact standard-variant TCGL PNG assets are preserved. The raw rows and CDN URL basis are recorded in their source JSON.

| Card | Exact source and identity record | Active map evidence |
| --- | --- | --- |
| Atticus 133 | [source](../research/tcgl/sv08.5-133/source.json) / [entry](../research/tcgl/sv08.5-133/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/133-holo-evidence.json) |
| Leafeon ex 144 | [source](../research/tcgl/sv08.5-144/source.json) / [entry](../research/tcgl/sv08.5-144/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/144-holo-evidence.json) |
| Flareon ex 146 | [source](../research/tcgl/sv08.5-146/source.json) / [entry](../research/tcgl/sv08.5-146/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/146-holo-evidence.json) |
| Vaporeon ex 149 | [source](../research/tcgl/sv08.5-149/source.json) / [entry](../research/tcgl/sv08.5-149/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/149-holo-evidence.json) |
| Glaceon ex 150 | [source](../research/tcgl/sv08.5-150/source.json) / [entry](../research/tcgl/sv08.5-150/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/150-holo-evidence.json) |
| Jolteon ex 153 | [source](../research/tcgl/sv08.5-153/source.json) / [entry](../research/tcgl/sv08.5-153/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/153-holo-evidence.json) |
| Espeon ex 155 | [source](../research/tcgl/sv08.5-155/source.json) / [entry](../research/tcgl/sv08.5-155/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/155-holo-evidence.json) |
| Umbreon ex 161 | [source](../research/tcgl/sv08.5-161/source.json) / [entry](../research/tcgl/sv08.5-161/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/161-holo-evidence.json) |
| Eevee ex 167 | [source](../research/tcgl/sv08.5-167/source.json) / [entry](../research/tcgl/sv08.5-167/entry.json) | [evidence](../public/cards/pokemon/prismatic-evolutions/maps/167-holo-evidence.json) |
| Pikachu VMAX 188 | [source](../research/tcgl/swsh4-188/source.json) / [entry](../research/tcgl/swsh4-188/entry.json) | [evidence](../public/cards/pikachu-vmax-vivid-voltage/tcgl-evidence.json) |
| Umbreon-GX 154 | [source](../research/tcgl/sm1-154/source.json) / [entry](../research/tcgl/sm1-154/entry.json) | [evidence](../public/cards/umbreon-gx-sm1-154/tcgl-evidence.json) |

## Conversion and finish

`scripts/tcgl/convert_etched_cards.py` uses the same operations as `scripts/prismatic/tcgl_etch_normal.py`: full-domain bilinear resize to 1800x2475; unblurred Scharr derivatives at 1/32; fixed slope gain 1.03; protection applied to X/Y slopes after differentiation; normalized OpenGL +Y tangent normals `(-dH/dx,+dH/drow,+Z)`; flatten outside source alpha; opaque RGB PNG output. The replaced normal path/hash is recorded per card. Height is retained only for inspection, encoded as `0.5 + (height - 0.5) * 0.25`.

`src/materials/profiles/tcglEtchedFinish.ts` supplies the shared finish. Normal scale 1, emboss 0, absolute roughness; primary metalness 0.50, laminate 0.045, reflectance 0.025, etched ink sheen 0.85; uniform primary grating following the authored normal. Primary procedural relief, facets and glints are zero. Secondary microdiamond response applies only through existing secondary coverage. Atticus keeps its full-art profile identity but receives the same resolved finish; the two older Rainbow Rare cards use the shared SIR profile with no secondary coverage.

Roughness uses `(0.30 + 0.105 * body) * (1-secondary) + 0.27 * secondary`. Missing body/secondary maps mean zero coverage. Atticus has neither, so its foil roughness is 0.30. Pikachu's existing hand-traced BODY contour was rasterized as `body.png` for this formula; no print-brightness segmentation was added. Its old direction, pattern, sparkle and laminate textures remain archived on disk but are no longer registered.

Existing clean fronts, foil masks, protection PNGs and secondary coverage remain byte-for-byte unchanged; their hashes are recorded under `preservedAssets`. Normal, inspection height, roughness and evidence were replaced. Sylveon, regular holos, ACE SPEC cards, print-only cards and unrelated franchises were not modified visually.

## Regeneration

1. `python scripts/tcgl/fetch_etched_sources.py` collects exact sources and entries.
2. `python scripts/tcgl/review_sources.py` creates front/etch/overlay sheets. Inspect them before conversion.
3. `python scripts/tcgl/convert_etched_cards.py --card <id>` rebuilds the reviewed card offline. The recorded source/front hashes must still match.

After a new source has actually been inspected, `--record-source-review` records that review for the selected card. This flag is an evidence record, not a substitute for visual inspection. The existing region-map generators now call TCGL conversion as their final step. They may still reconstruct historical intermediate relief while authoring masks, but those intermediate normals never remain as the delivered asset.

## Review

Source/front alignment sheets and full-resolution overlays are in `artifacts/tcgl-etched-migration/`. Fully protected normal pixels are `(128,128,255)` for all 11 outputs. Physical groove depth is an estimate represented by the fixed Sylveon gain, not a measurement from photos. Live lighting review is recorded per card after inspection.

## Source-unavailable exceptions

TCGL is a Pokemon card source. The repo's original Signal Arbor/Recursive Gate intaglio designs, Gengar Phantom Corridor, cast-metal collectible relief, and Yu-Gi-Oh! Ultimate/Collector foil studies have no matching TCGL Pokemon printing. Their assets are retained rather than substituted with unrelated Pokemon etches. Dynamically fetched catalog cards without authored relief are outside this registered-asset migration; no fabricated relief was added to them.
