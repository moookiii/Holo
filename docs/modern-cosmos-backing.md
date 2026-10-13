# Dark backing for modern Cosmos

Black & White and later Cosmos prints use clean master images, without the dark foil field already photographed into vintage scans. Native Cosmos profiles now resolve to separate `modern-*` variants in `resolveCardProfile`; all CPU preparation, viewer and gallery preview paths use that resolver.

`src/materials/profiles/modernCosmos.ts` clones the existing registered, classic, HD, promo and Evolutions Cosmos profiles. It preserves their manufacturing fields, dot placement, scale, diffraction and glints. Modern foil uses substrate absorption 0.82, substrate reflection 0.42, foil reflectance 0.055, sheen 0.08 and laminate 0.12. The existing shader's `substrateDarkening` control remains adjustable in the material Lab. Absorption applies to covered foil, including the field between dots, while diffraction stays independently lit. Existing protection, secondary coverage and print masks remain authoritative. Neither master images nor PNG masks changed.

Routing is limited to native Pokémon Cosmos treatments from `bw`, `xy`, `sm`, `swsh`, `sv` and `me`. Vintage scans, unrelated finishes, explicit alternate selections and deferred print-only cards retain their previous response. Evolutions keeps its separately masked stars.

## Verification

- Nine focused tests passed: modern routing and preview packing, BW source preservation, Cosmos placement, gallery coverage and etched preview response.
- Live inventory audited 718 modern cards (31 BW, 86 XY, 133 SM, 148 SWSH, 201 SV, 19 Mega), with no routing or preview-parameter mismatches. The 223 vintage Cosmos definitions retain their original profiles.
- `scripts/cosmos/modern-backing-review.mjs` captured before/after renders of SWSH095 Eevee, BW Tepig, XY Skiddo, SM Rockruff, SV promos, Mega Drifloon and Base Set 2 Alakazam under Studio/front, tilt, strip/specular, grazing, low-key and two moving-light phases. Captures and JSON reports are in `artifacts/cosmos-modern-backing/{before,after}/` (ignored review outputs). No browser errors were recorded. Base Set 2's front capture was byte-identical before and after.
- `npm run build` is blocked by the existing `SourceCosmosSurfaces.ts` `maps: Record<string, string>` incompatibility with `CardMapPaths` and its cascading type errors. This change does not modify those unrelated in-progress files.

The supplied physical Eevee photograph guides the darker field and brighter dot contrast. Its exposure and lighting differ from the renderer; this is an optical tuning comparison, not a measured physical calibration. Strong direct specular can still brighten foil, as expected. Existing dot maps and their documented placement uncertainties are unchanged.
