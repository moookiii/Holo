# XY Champions Festival Worlds logo foil

XY27 (2014), XY91 (2015), and XY176 (2016) use the existing `bw-stamped`
smooth spectral material on their own exact TCGL Worlds logo whiteplates.
These source variants are `ChampionsFestival_xybsp_<number>_op_Rare_Stamped_Stamped`.
The TCGL Stamped enum denotes the reflective Worlds logo here, not a license
to add Staff, Champion, or finalist labels absent from the source front.

The unchanged original fronts and 1024x1024 RGBA plates remain under
`public/cards/pokemon/tcgl-xy/xybsp_<number>/`. The reproducible offline script
`scripts/tcgl/prepare_xy_stamps.py` uses the established full-card horizontal
Unity domain [145/1024, 878/1024], full height, bilinear registration to
733x1024 PNG, and no vertical flip. Continuous glyph edges and counters are
preserved. Only the logo reflects; no artwork-wide foil, normal, emboss,
procedural sparkle, or generated relief is added. Roughness is constant 0.30.
Per-card evidence records source identity and front/plate/output SHA-256 hashes.

`XyStampedSurfaces.ts` clears pending labels only for these three exact holo
identities. Runtime overrides survive regeneration of the acquisition catalog.
Historical generated pending records do not describe the resolved runtime finish.
No material profile or unrelated printing is altered.

Physical angular strength is an estimate inherited from the existing BW Worlds
material, not a measured calibration. The exact source front and whiteplate
establish logo placement. Physical-print context was checked against
https://bulbapedia.bulbagarden.net/wiki/Champions_Festival_(BW_Promo_95)
and the PSA verification https://www.psacard.com/cert/64884916/psa.

Validation: TypeScript and the targeted exact-identity/source/output-hash test
pass. The completed isolated-server live run saved 15 full-card captures across
Studio front, tilt, grazing, dark, and moving light settings, with zero runtime
or local asset errors. Full-size glyph overlays for all three cards, all three
grazing renders, and XY27 tilt were visually inspected. Logo holes remain open,
foil is confined to the logo, and the rules stay legible. The existing laminate
can wash out print at strong specular angles. Saved review: `artifacts/xy-stamps/`.
