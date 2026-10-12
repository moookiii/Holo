# Legendary Treasures gold Full Arts

Reshiram 114/113 and Zekrom 115/113 now use their own exact English TCGL
`SolidColor_Etched` sources. Their printed fronts remain unchanged. The TCGL
front is predominantly uniform gold; the subject is supplied by its matching
whiteplate and line engraving, not by a replacement illustration.

- `Reshiram_bw11_114_std_RareSecret_SolidColor_Etched`, TCGL `bw11_114`.
- `Zekrom_bw11_115_std_RareSecret_SolidColor_Etched`, TCGL `bw11_115`.

Untouched front/etch sources are 1024×1024 RGBA, whiteplates 512×512 RGBA.
They remain in the acquired research collection and each printing's public
`original-*.png` files. Exact official bundle URLs, material references and
source hashes are retained in each printing's `evidence.json` and
`normal-evidence.json`.

The established Unity full-card UV box is `[145/1024,0,878/1024,1]`, shared by
front, whiteplate and etch. There is no vertical flip or additional offset.
Paired source review is `artifacts/bw-finishes/gold-source-review.png`. Title,
type symbols, wings, body, attack lettering and full-card boundaries align.

`scripts/tcgl/author_bw_finishes.py gold` uses inverted mean RGB, bilinear
continuous height and alpha resizing to 1800×2475, OpenCV Scharr CV_32F with
scale 1/32, slopes `(-dx,+drow)` at gain 1.03, protection after differentiation,
normalized XYZ and source-alpha blending to flat normals. The result is an
opaque RGB PNG. Individual black and colored print glyphs are protected;
front brightness contributes nothing to height. Roughness is
`0.30 + 0.105 * body`, from the card's own whiteplate subject modulation.
No separate secondary microdiamond region is established.

The material retains the final Sylveon/Espeon normal response: normalScale 1,
emboss 0, absolute roughness, primary metalness .50, laminate .045,
foilReflectance .025, etchedInkSheen .85, plain structure and zero glints.
`bwGoldFullArtFinish` applies gold absorption `[1,.68,.18]` to diffracted light.
It adds no procedural engraving, height map, extra normal, sparkle or grain.

The supplied `w3h1lf4r9tg01.jpg` shows Japanese EX Battle Boost #94/#95. It
guides gold appearance only; neither those printed fronts nor their geometry
are transplanted onto the English cards. The exact English angular response
remains approximate, and photographs do not establish measured groove depth.

Both golds and Espeon 155/Sylveon 156 were captured with identical front,
grazing, tilt, dark, specular and moving-light controls, including three light
azimuths, in `artifacts/bw-finishes/live`. Gold source and map PNGs, protection,
roughness, silhouette registration and text transitions were reviewed. Five
targeted BW integration/ball tests pass. Shared reference profiles, other
etched cards and unrelated sets are unchanged by this gold implementation.
